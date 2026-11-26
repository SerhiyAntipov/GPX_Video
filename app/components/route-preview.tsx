"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createRouteTimeline, getRoutePosition } from "@/lib/animation/route-timeline";
import { RoutePlayerClock } from "@/lib/animation/route-player-clock";
import type { ActivityMetrics, TrackData } from "@/lib/gpx/types";
import { DEFAULT_VIDEO_SETTINGS, normalizeVideoSettings, type VideoSettings } from "@/lib/video/settings";
import { RouteMap, type RouteMapController } from "./route-map";
import { VideoSettingsPanel } from "./video-settings";
import { ElevationProfile } from "./elevation-profile";

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(2)} км`;
}

function formatDuration(seconds?: number) {
  if (seconds === undefined) return "—";
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <strong>{value}<small>{unit ? ` ${unit}` : ""}</small></strong>
    </div>
  );
}

function PlayIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M6 3.8c0-.6.7-.9 1.2-.6l9.1 5.8a1.2 1.2 0 0 1 0 2L7.2 16.8c-.5.3-1.2 0-1.2-.6V3.8Z" fill="currentColor" /></svg>;
}

function PauseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5.5 4.2c0-.7.5-1.2 1.2-1.2h1.1C8.5 3 9 3.5 9 4.2v11.6c0 .7-.5 1.2-1.2 1.2H6.7c-.7 0-1.2-.5-1.2-1.2V4.2Zm6.5 0c0-.7.5-1.2 1.2-1.2h1.1c.7 0 1.2.5 1.2 1.2v11.6c0 .7-.5 1.2-1.2 1.2h-1.1c-.7 0-1.2-.5-1.2-1.2V4.2Z" fill="currentColor" /></svg>;
}

function RestartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4.1 7.2A6.6 6.6 0 1 1 3.5 11M4 3.8v3.8h3.8M10 6.2v4l2.8 1.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const SETTINGS_STORAGE_KEY = "gpx-video.preview-settings.v1";

function readStoredSettings(): VideoSettings {
  if (typeof window === "undefined") return DEFAULT_VIDEO_SETTINGS;
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? normalizeVideoSettings(JSON.parse(stored)) : DEFAULT_VIDEO_SETTINGS;
  } catch {
    return DEFAULT_VIDEO_SETTINGS;
  }
}

export function RoutePreview({ track, metrics }: { track: TrackData; metrics: ActivityMetrics }) {
  const timeline = useMemo(() => createRouteTimeline(track), [track]);
  const playerRef = useRef<RoutePlayerClock | null>(null);
  const mapControllerRef = useRef<RouteMapController | null>(null);
  const currentProgressRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState<VideoSettings>(readStoredSettings);

  function changeSettings(nextSettings: VideoSettings) {
    if (nextSettings.durationSeconds !== settings.durationSeconds) {
      playerRef.current?.pause();
      setIsPlaying(false);
    }
    setSettings(nextSettings);
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    } catch {
      // Settings are still applied in this browser session.
    }
  }

  const updateProgress = useCallback((nextProgress: number) => {
    currentProgressRef.current = nextProgress;
    mapControllerRef.current?.setProgress(nextProgress);
    const now = performance.now();
    if (now - lastUiUpdateRef.current >= 80 || nextProgress === 0 || nextProgress === 1) {
      lastUiUpdateRef.current = now;
      setProgress(nextProgress);
    }
  }, []);

  const handleMapReady = useCallback((controller: RouteMapController | null) => {
    mapControllerRef.current = controller;
    controller?.setProgress(currentProgressRef.current);
  }, []);

  useEffect(() => {
    const player = new RoutePlayerClock(updateProgress, () => setIsPlaying(false), settings.durationSeconds * 1000);
    player.seek(currentProgressRef.current);
    playerRef.current = player;
    return () => {
      player.destroy();
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [settings.durationSeconds, updateProgress]);

  useEffect(() => () => {
    mapControllerRef.current = null;
  }, []);

  const currentPosition = getRoutePosition(timeline, progress);
  function togglePlayback() {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }

  function restartPlayback() {
    playerRef.current?.restart();
    setIsPlaying(false);
    setProgress(0);
  }

  function seekPlayback(value: string) {
    seekToProgress(Number(value) / 1000);
  }

  function seekToProgress(nextProgress: number) {
    const normalizedProgress = Math.max(0, Math.min(1, nextProgress));
    playerRef.current?.seek(normalizedProgress);
    currentProgressRef.current = normalizedProgress;
    mapControllerRef.current?.setProgress(normalizedProgress);
    setProgress(normalizedProgress);
    lastUiUpdateRef.current = performance.now();
  }

  return (
    <section className="route-result" aria-label="Імпортований маршрут">
      <div className="route-result-heading">
        <div>
          <span className="result-eyebrow">GPX · ФАЙЛ ОБРОБЛЕНО ЛОКАЛЬНО</span>
          <h3>{settings.title.trim() || track.name || track.sourceFileName}</h3>
        </div>
        <span className="segment-count">{track.segments.length} {track.segments.length === 1 ? "сегмент" : "сегменти"}</span>
      </div>
      <div className="preview-and-settings">
        <div className="preview-column">
          <RouteMap timeline={timeline} aspectRatio={settings.aspectRatio} onReady={handleMapReady} />
      <div className="playback-panel" aria-label="Керування анімацією маршруту">
        <button className="playback-main-button" type="button" onClick={togglePlayback} aria-label={isPlaying ? "Пауза" : "Відтворити маршрут"} title={isPlaying ? "Пауза" : "Відтворити маршрут"}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="playback-restart-button" type="button" onClick={restartPlayback} aria-label="На початок" title="На початок">
          <RestartIcon />
        </button>
        <div className="timeline-control">
          <div className="timeline-meta">
            <span>ПОПЕРЕДНІЙ ПЕРЕГЛЯД</span>
            <span>{formatDuration(progress * settings.durationSeconds)} <i>/</i> {formatDuration(settings.durationSeconds)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="1"
            value={Math.round(progress * 1000)}
            onChange={(event) => seekPlayback(event.currentTarget.value)}
            aria-label="Перемотати маршрут"
            style={{ "--timeline-progress": `${progress * 100}%` } as CSSProperties}
          />
        </div>
      </div>
        </div>
        <VideoSettingsPanel settings={settings} metrics={metrics} onChange={changeSettings} />
      </div>
      <div className="metrics-grid">
        {settings.visibleMetrics.distance && <MetricCard label="ПРОЙДЕНО" value={formatDistance(currentPosition?.distanceMeters ?? 0)} unit={`з ${formatDistance(metrics.totalDistanceMeters)}`} />}
        {settings.visibleMetrics.duration && metrics.durationSeconds !== undefined && <MetricCard label="ЧАС АКТИВНОСТІ" value={formatDuration(currentPosition?.elapsedSeconds)} unit={`/ ${formatDuration(metrics.durationSeconds)}`} />}
        {settings.visibleMetrics.speed && metrics.averageSpeedMps !== undefined && <MetricCard label="СЕР. ШВИДКІСТЬ" value={(metrics.averageSpeedMps * 3.6).toFixed(1)} unit="км/год" />}
        {settings.visibleMetrics.elevationGain && metrics.elevationGainMeters !== undefined && <MetricCard label="НАБІР ВИСОТИ" value={`${Math.round(metrics.elevationGainMeters)}`} unit="м" />}
        {settings.visibleMetrics.elevationLoss && metrics.elevationLossMeters !== undefined && <MetricCard label="СПУСК" value={`${Math.round(metrics.elevationLossMeters)}`} unit="м" />}
      </div>
      {metrics.elevationProfile && (
        <ElevationProfile
          profile={metrics.elevationProfile}
          totalDistanceMeters={metrics.totalDistanceMeters}
          progress={progress}
          onSeek={seekToProgress}
        />
      )}
      <p className="metric-note">
        {timeline.durationSeconds === undefined
          ? "Час активності недоступний: у GPX немає повних послідовних часових міток."
          : "Час і дистанція змінюються разом із маршрутом."} Сегменти не з’єднуються; під час переходу між ними маркер перестрибує до наступного сегмента. Набір висоти рахується без згладжування.
      </p>
    </section>
  );
}
