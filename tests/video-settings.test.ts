import { describe, expect, it } from "vitest";
import { DEFAULT_VIDEO_SETTINGS, normalizeVideoSettings } from "../lib/video/settings";

describe("video settings", () => {
  it("uses defaults for missing or invalid values", () => {
    expect(normalizeVideoSettings(null)).toEqual(DEFAULT_VIDEO_SETTINGS);
    expect(normalizeVideoSettings({ aspectRatio: "4:3", durationSeconds: 90 })).toMatchObject({
      aspectRatio: "16:9",
      durationSeconds: 20,
    });
  });

  it("keeps supported settings and fills metric defaults", () => {
    expect(normalizeVideoSettings({
      title: "Вечірня пробіжка",
      aspectRatio: "9:16",
      durationSeconds: 30,
      visibleMetrics: { distance: false },
    })).toEqual({
      title: "Вечірня пробіжка",
      aspectRatio: "9:16",
      durationSeconds: 30,
      visibleMetrics: { distance: false, duration: true, speed: true, elevationGain: true, elevationLoss: true },
    });
  });
});
