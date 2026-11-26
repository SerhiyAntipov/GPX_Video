"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  getFullRouteGeoJSON,
  getProgressRouteGeoJSON,
  getRoutePointGeoJSON,
  type RouteTimeline,
} from "@/lib/animation/route-timeline";

export type RouteMapController = { setProgress: (progress: number) => void };
type RouteMapProps = {
  timeline: RouteTimeline;
  onReady: (controller: RouteMapController | null) => void;
};
type MapTheme = "dark" | "light";

const styles: Record<MapTheme, string> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};

function makeDarkStyleFallback(id: string) {
  if (id === "circle-11") {
    const size = 22;
    const data = new Uint8Array(size * size * 4);
    const center = (size - 1) / 2;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const distance = Math.hypot(x - center, y - center);
        if (distance > 9.5) continue;
        const offset = (y * size + x) * 4;
        const edge = distance > 7.5;
        data[offset] = edge ? 90 : 205;
        data[offset + 1] = edge ? 96 : 207;
        data[offset + 2] = edge ? 103 : 210;
        data[offset + 3] = 255;
      }
    }
    return { image: { width: size, height: size, data }, pixelRatio: 2 };
  }

  if (id === "wood-pattern") {
    const size = 16;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if ((x - y + size) % 6 > 1) continue;
        const offset = (y * size + x) * 4;
        data[offset] = 102;
        data[offset + 1] = 122;
        data[offset + 2] = 104;
        data[offset + 3] = 105;
      }
    }
    return { image: { width: size, height: size, data }, pixelRatio: 1 };
  }

  return undefined;
}

function addRouteLayers(map: MapLibreMap, timeline: RouteTimeline, progress: number) {
  // style.load guarantees the style is ready for sources/layers, even when its tiles
  // are still loading. isStyleLoaded() is intentionally not checked here because
  // it can stay false during that interval and would skip the route permanently.
  if (map.getSource("activity-route-base")) return;

  map.addSource("activity-route-base", {
    type: "geojson",
    data: getFullRouteGeoJSON(timeline),
  });
  map.addLayer({
    id: "activity-route-base-line",
    type: "line",
    source: "activity-route-base",
    paint: {
      "line-color": "#d7ded8",
      "line-width": 3,
      "line-opacity": 0.34,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });

  map.addSource("activity-route-progress", {
    type: "geojson",
    data: getProgressRouteGeoJSON(timeline, progress),
  });
  map.addLayer({
    id: "activity-route-progress-line",
    type: "line",
    source: "activity-route-progress",
    paint: {
      "line-color": "#ff7547",
      "line-width": 4.5,
      "line-opacity": 0.95,
      "line-blur": 0.25,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });

  const routePoints = timeline.segments.flatMap((segment) => segment.points);
  const first = routePoints[0];
  const last = routePoints[routePoints.length - 1];
  const markerFeatures = [
    { type: "Feature" as const, properties: { kind: "start" }, geometry: { type: "Point" as const, coordinates: [first.longitude, first.latitude] } },
    { type: "Feature" as const, properties: { kind: "finish" }, geometry: { type: "Point" as const, coordinates: [last.longitude, last.latitude] } },
  ];
  map.addSource("activity-markers", {
    type: "geojson",
    data: { type: "FeatureCollection", features: markerFeatures },
  });
  map.addLayer({
    id: "activity-markers-layer",
    type: "circle",
    source: "activity-markers",
    paint: {
      "circle-radius": ["match", ["get", "kind"], "start", 7, 6],
      "circle-color": ["match", ["get", "kind"], "start", "#ff7547", "#f7f4eb"],
      "circle-stroke-color": "#18201f",
      "circle-stroke-width": 2,
    },
  });

  map.addSource("activity-current-position", {
    type: "geojson",
    data: getRoutePointGeoJSON(timeline, progress),
  });
  map.addLayer({
    id: "activity-current-position-layer",
    type: "circle",
    source: "activity-current-position",
    paint: {
      "circle-radius": 8,
      "circle-color": "#ff7547",
      "circle-stroke-color": "#fff4ed",
      "circle-stroke-width": 2.5,
      "circle-blur": 0.08,
    },
  });
}

function RouteMapView({ timeline, onReady }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const initialThemeRef = useRef<MapTheme>("dark");
  const progressRef = useRef(0);
  const [showMap, setShowMap] = useState(false);
  const [theme, setTheme] = useState<MapTheme>("dark");
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (!showMap || !containerRef.current || mapRef.current) return;

    let disposed = false;
    let map: MapLibreMap | undefined;
    setIsLoading(true);
    setMapError("");

    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !containerRef.current) return;
      maplibre.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

      map = new maplibre.Map({
        container: containerRef.current,
        style: styles[initialThemeRef.current],
        center: [0, 0],
        zoom: 2,
        cooperativeGestures: true,
        locale: {
          "NavigationControl.ResetBearing": "Повернути карту на північ",
          "NavigationControl.ZoomIn": "Збільшити масштаб",
          "NavigationControl.ZoomOut": "Зменшити масштаб",
        },
      });
      mapRef.current = map;
      const applyProgress = (progress: number) => {
        const normalizedProgress = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
        progressRef.current = normalizedProgress;
        const routeSource = map?.getSource("activity-route-progress") as GeoJSONSource | undefined;
        const positionSource = map?.getSource("activity-current-position") as GeoJSONSource | undefined;
        routeSource?.setData(getProgressRouteGeoJSON(timeline, normalizedProgress));
        positionSource?.setData(getRoutePointGeoJSON(timeline, normalizedProgress));
      };
      map.setMissingStyleImageResolver((id) => {
        if (map?.hasImage(id)) return;
        const fallback = makeDarkStyleFallback(id);
        if (fallback) map?.addImage(id, fallback.image, { pixelRatio: fallback.pixelRatio });
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: true }), "top-right");

      map.on("style.load", () => {
        if (!map) return;
        addRouteLayers(map, timeline, progressRef.current);
        applyProgress(progressRef.current);
        onReady({ setProgress: applyProgress });
        setIsLoading(false);
      });

      map.on("load", () => {
        if (!map) return;
        applyProgress(progressRef.current);
        const routePoints = timeline.segments.flatMap((segment) => segment.points);
        let minLongitude = Number.POSITIVE_INFINITY;
        let maxLongitude = Number.NEGATIVE_INFINITY;
        let minLatitude = Number.POSITIVE_INFINITY;
        let maxLatitude = Number.NEGATIVE_INFINITY;
        for (const point of routePoints) {
          minLongitude = Math.min(minLongitude, point.longitude);
          maxLongitude = Math.max(maxLongitude, point.longitude);
          minLatitude = Math.min(minLatitude, point.latitude);
          maxLatitude = Math.max(maxLatitude, point.latitude);
        }
        map.fitBounds([
          [minLongitude, minLatitude],
          [maxLongitude, maxLatitude],
        ], { padding: { top: 55, right: 55, bottom: 45, left: 55 }, maxZoom: 15, duration: 0 });
        setIsLoading(false);
      });

      map.on("error", (event) => {
        const message = event.error?.message ?? "";
        if (message) {
          setMapError("Карта не завантажилася. Перевірте підключення до інтернету й спробуйте ще раз.");
          setIsLoading(false);
        }
      });
    }).catch(() => {
      if (!disposed) {
        setMapError("Не вдалося запустити мапу в цьому браузері.");
        setIsLoading(false);
      }
    });

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      onReady(null);
    };
  }, [showMap, timeline, onReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!showMap || !map) return;
    setMapError("");
    setIsLoading(true);
    map.setStyle(styles[theme], { diff: false });
  }, [showMap, theme]);

  function selectTheme(nextTheme: MapTheme) {
    initialThemeRef.current = nextTheme;
    setTheme(nextTheme);
  }

  return (
    <div className="route-map-frame">
      {showMap ? (
        <>
          <div className="route-map-canvas" ref={containerRef} aria-label="Карта з маршрутом" />
          {isLoading && <div className="map-status">Завантажую карту…</div>}
          {mapError && <div className="map-status map-error">{mapError}</div>}
          <div className="route-map-badge">МАРШРУТ · 2D</div>
        </>
      ) : (
        <div className="map-consent-panel">
          <div className="map-consent-icon" aria-hidden="true">⌖</div>
          <strong>Переглянути маршрут на карті</strong>
          <p>Карта OpenFreeMap завантажить тайли для ділянки маршруту. Провайдер отримає запити з приблизною областю перегляду; GPX-файл і повний маршрут йому не надсилаються.</p>
          <button type="button" className="map-consent-button" onClick={() => setShowMap(true)}>Показати карту</button>
        </div>
      )}
      <div className="map-theme-toggle" role="group" aria-label="Тема карти">
        <button type="button" aria-pressed={theme === "dark"} onClick={() => selectTheme("dark")}>Темна</button>
        <button type="button" aria-pressed={theme === "light"} onClick={() => selectTheme("light")}>Світла</button>
      </div>
    </div>
  );
}

export const RouteMap = memo(RouteMapView);
