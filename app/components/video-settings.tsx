"use client";

import type { ActivityMetrics } from "@/lib/gpx/types";
import { METRIC_KEYS, VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS, type MetricKey, type VideoSettings } from "@/lib/video/settings";

const metricLabels: Record<MetricKey, string> = {
  distance: "Дистанція",
  duration: "Час активності",
  speed: "Середня швидкість",
  elevationGain: "Набір висоти",
  elevationLoss: "Спуск",
};

function isMetricAvailable(key: MetricKey, metrics: ActivityMetrics) {
  if (key === "distance") return true;
  if (key === "duration") return metrics.durationSeconds !== undefined;
  if (key === "speed") return metrics.averageSpeedMps !== undefined;
  return metrics.elevationGainMeters !== undefined && metrics.elevationLossMeters !== undefined;
}

type VideoSettingsProps = {
  settings: VideoSettings;
  metrics: ActivityMetrics;
  onChange: (settings: VideoSettings) => void;
};

export function VideoSettingsPanel({ settings, metrics, onChange }: VideoSettingsProps) {
  function update(patch: Partial<VideoSettings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <aside className="video-settings" aria-label="Налаштування перегляду">
      <div className="video-settings-heading">
        <span>НАЛАШТУВАННЯ ПЕРЕГЛЯДУ</span>
        <small>Зберігаються лише у вашому браузері</small>
      </div>
      <label className="settings-field">
        <span>НАЗВА ВІДЕО</span>
        <input value={settings.title} maxLength={80} onChange={(event) => update({ title: event.currentTarget.value })} placeholder="Назва активності" />
      </label>
      <fieldset className="settings-field">
        <legend>ФОРМАТ КАДРУ</legend>
        <div className="settings-options" role="radiogroup" aria-label="Формат кадру">
          {VIDEO_ASPECT_RATIOS.map((ratio) => (
            <button key={ratio} type="button" role="radio" aria-checked={settings.aspectRatio === ratio} onClick={() => update({ aspectRatio: ratio })}>{ratio}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="settings-field">
        <legend>ТРИВАЛІСТЬ ПЕРЕГЛЯДУ</legend>
        <div className="settings-options" role="radiogroup" aria-label="Тривалість перегляду">
          {VIDEO_DURATIONS.map((seconds) => (
            <button key={seconds} type="button" role="radio" aria-checked={settings.durationSeconds === seconds} onClick={() => update({ durationSeconds: seconds })}>{seconds} с</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="settings-field metric-settings">
        <legend>КАРТКИ МЕТРИК</legend>
        {METRIC_KEYS.map((key) => {
          const available = isMetricAvailable(key, metrics);
          return (
            <label key={key} className={!available ? "is-unavailable" : ""}>
              <input
                type="checkbox"
                checked={settings.visibleMetrics[key] && available}
                disabled={!available}
                onChange={(event) => update({ visibleMetrics: { ...settings.visibleMetrics, [key]: event.currentTarget.checked } })}
              />
              <span>{metricLabels[key]}</span>
              {!available && <small>немає в GPX</small>}
            </label>
          );
        })}
      </fieldset>
    </aside>
  );
}
