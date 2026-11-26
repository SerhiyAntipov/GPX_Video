export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;
export const VIDEO_DURATIONS = [10, 20, 30] as const;
export const METRIC_KEYS = ["distance", "duration", "speed", "elevationGain", "elevationLoss"] as const;

export type VideoAspectRatio = typeof VIDEO_ASPECT_RATIOS[number];
export type MetricKey = typeof METRIC_KEYS[number];

export type VideoSettings = {
  title: string;
  aspectRatio: VideoAspectRatio;
  durationSeconds: typeof VIDEO_DURATIONS[number];
  visibleMetrics: Record<MetricKey, boolean>;
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  title: "",
  aspectRatio: "16:9",
  durationSeconds: 20,
  visibleMetrics: {
    distance: true,
    duration: true,
    speed: true,
    elevationGain: true,
    elevationLoss: true,
  },
};

export function normalizeVideoSettings(value: unknown): VideoSettings {
  if (!value || typeof value !== "object") return DEFAULT_VIDEO_SETTINGS;
  const candidate = value as Partial<VideoSettings>;
  const aspectRatio = VIDEO_ASPECT_RATIOS.includes(candidate.aspectRatio as VideoAspectRatio)
    ? candidate.aspectRatio as VideoAspectRatio
    : DEFAULT_VIDEO_SETTINGS.aspectRatio;
  const durationSeconds = VIDEO_DURATIONS.includes(candidate.durationSeconds as typeof VIDEO_DURATIONS[number])
    ? candidate.durationSeconds as typeof VIDEO_DURATIONS[number]
    : DEFAULT_VIDEO_SETTINGS.durationSeconds;
  const visibleMetrics = Object.fromEntries(METRIC_KEYS.map((key) => [key, candidate.visibleMetrics?.[key] !== false])) as Record<MetricKey, boolean>;

  return {
    title: typeof candidate.title === "string" ? candidate.title.slice(0, 80) : "",
    aspectRatio,
    durationSeconds,
    visibleMetrics,
  };
}
