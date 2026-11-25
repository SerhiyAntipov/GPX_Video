import type { ActivityMetrics, TrackData } from "@/lib/gpx/types";
import { RouteMap } from "./route-map";

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

export function RoutePreview({ track, metrics }: { track: TrackData; metrics: ActivityMetrics }) {
  return (
    <section className="route-result" aria-label="Імпортований маршрут">
      <div className="route-result-heading">
        <div>
          <span className="result-eyebrow">GPX · ФАЙЛ ОБРОБЛЕНО ЛОКАЛЬНО</span>
          <h3>{track.name || track.sourceFileName}</h3>
        </div>
        <span className="segment-count">{track.segments.length} {track.segments.length === 1 ? "сегмент" : "сегменти"}</span>
      </div>
      <RouteMap track={track} />
      <div className="metrics-grid">
        <MetricCard label="ДИСТАНЦІЯ" value={formatDistance(metrics.totalDistanceMeters)} />
        <MetricCard label="ТРИВАЛІСТЬ" value={formatDuration(metrics.durationSeconds)} />
        <MetricCard label="СЕР. ШВИДКІСТЬ" value={metrics.averageSpeedMps !== undefined ? (metrics.averageSpeedMps * 3.6).toFixed(1) : "—"} unit={metrics.averageSpeedMps !== undefined ? "км/год" : undefined} />
        <MetricCard label="НАБІР ВИСОТИ" value={metrics.elevationGainMeters !== undefined ? `${Math.round(metrics.elevationGainMeters)}` : "—"} unit={metrics.elevationGainMeters !== undefined ? "м" : undefined} />
        <MetricCard label="СПУСК" value={metrics.elevationLossMeters !== undefined ? `${Math.round(metrics.elevationLossMeters)}` : "—"} unit={metrics.elevationLossMeters !== undefined ? "м" : undefined} />
      </div>
      <p className="metric-note">
        Дистанція рахується окремо в кожному сегменті. Час показано лише для повних послідовних часових міток; набір висоти — за перепадами між сусідніми точками без згладжування.
      </p>
    </section>
  );
}
