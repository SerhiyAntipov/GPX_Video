"use client";

import type { ActivityMetrics } from "@/lib/gpx/types";

type ElevationProfileProps = {
  profile: NonNullable<ActivityMetrics["elevationProfile"]>;
  totalDistanceMeters: number;
  progress: number;
  onSeek: (progress: number) => void;
};

export function ElevationProfile({ profile, totalDistanceMeters, progress, onSeek }: ElevationProfileProps) {
  const points = profile.flatMap((segment) => segment.points);
  if (points.length < 2 || totalDistanceMeters <= 0) return null;

  const elevations = points.map((point) => point.elevationMeters);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = Math.max(1, maxElevation - minElevation);
  const pointToSvg = (distanceMeters: number, elevationMeters: number) => {
    const x = (distanceMeters / totalDistanceMeters) * 100;
    const y = 30 - ((elevationMeters - minElevation) / elevationRange) * 26;
    return `${x.toFixed(3)},${y.toFixed(3)}`;
  };
  const seekFromPointer = (clientX: number, element: Element) => {
    const bounds = element.getBoundingClientRect();
    if (bounds.width <= 0) return;
    onSeek(Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)));
  };

  return (
    <section className="elevation-profile" aria-label="Профіль висоти">
      <div className="elevation-profile-heading">
        <span>ПРОФІЛЬ ВИСОТИ</span>
        <span>{Math.round(minElevation)}–{Math.round(maxElevation)} м</span>
      </div>
      <div
        className="elevation-chart"
        role="slider"
        tabIndex={0}
        aria-label="Перемотати маршрут за профілем висоти"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onClick={(event) => seekFromPointer(event.clientX, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            onSeek(Math.max(0, progress - 0.02));
          }
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            onSeek(Math.min(1, progress + 0.02));
          }
          if (event.key === "Home") {
            event.preventDefault();
            onSeek(0);
          }
          if (event.key === "End") {
            event.preventDefault();
            onSeek(1);
          }
        }}
      >
        <svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="30" x2="100" y2="30" className="elevation-baseline" />
          {profile.map((segment, index) => (
            <polyline key={index} points={segment.points.map((point) => pointToSvg(point.distanceMeters, point.elevationMeters)).join(" ")} className="elevation-line" />
          ))}
          <line x1={progress * 100} y1="1" x2={progress * 100} y2="31" className="elevation-cursor" />
        </svg>
      </div>
      <div className="elevation-scale"><span>0 км</span><span>{(totalDistanceMeters / 1000).toFixed(2)} км</span></div>
    </section>
  );
}
