import { describe, expect, it } from "vitest";
import { calculateMetrics } from "../lib/gpx/metrics";
import { GpxParseError, parseGpx } from "../lib/gpx/parse";
import type { TrackData } from "../lib/gpx/types";

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="test">
  <metadata><name>Ранкова прогулянка</name></metadata>
  <wpt lat="50.45" lon="30.52"><name>Орієнтир</name></wpt>
  <trk><name>Тестовий маршрут</name><trkseg>
    <trkpt lat="50.45" lon="30.52"><ele>100</ele><time>2024-01-01T10:00:00Z</time></trkpt>
    <trkpt lat="50.45" lon="30.53"><ele>110</ele><time>2024-01-01T10:01:00Z</time></trkpt>
  </trkseg><trkseg>
    <trkpt lat="50.46" lon="30.55"><ele>105</ele><time>2024-01-01T10:02:00Z</time></trkpt>
    <trkpt lat="50.46" lon="30.56"><ele>115</ele><time>2024-01-01T10:03:00Z</time></trkpt>
    <trkpt lat="50.46" lon="30.57"><ele>110</ele><time>2024-01-01T10:04:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

describe("parseGpx", () => {
  it("preserves track segments and waypoints", () => {
    const track = parseGpx(sampleGpx, "walk.gpx");

    expect(track.name).toBe("Тестовий маршрут");
    expect(track.sourceFileName).toBe("walk.gpx");
    expect(track.segments.map((segment) => segment.points.length)).toEqual([2, 3]);
    expect(track.waypoints).toHaveLength(1);
  });

  it("accepts a route when there is no recorded track", () => {
    const route = parseGpx('<gpx><rte><rtept lat="1" lon="2"/><rtept lat="1" lon="3"/></rte></gpx>', "route.gpx");
    expect(route.segments).toHaveLength(1);
    expect(route.segments[0].points).toHaveLength(2);
  });

  it("rejects malformed XML and invalid coordinates", () => {
    expect(() => parseGpx("<gpx><trk>", "broken.gpx")).toThrow(GpxParseError);
    expect(() => parseGpx('<gpx><trk><trkseg><trkpt lat="91" lon="0"/></trkseg></trk></gpx>', "bad.gpx"))
      .toThrow("некоректні координати");
  });

  it("rejects a route without at least two points", () => {
    expect(() => parseGpx('<gpx><trk><trkseg><trkpt lat="0" lon="0"/></trkseg></trk></gpx>', "short.gpx"))
      .toThrow("щонайменше з двох точок");
  });
});

describe("calculateMetrics", () => {
  it("calculates distance without connecting separate segments", () => {
    const track = parseGpx(sampleGpx, "walk.gpx");
    const { totalDistanceMeters } = calculateMetrics(track);

    expect(totalDistanceMeters).toBeGreaterThan(2000);
    expect(totalDistanceMeters).toBeLessThan(2500);
  });

  it("calculates duration, average speed, and raw elevation gain and loss", () => {
    const track = parseGpx(sampleGpx, "walk.gpx");
    const metrics = calculateMetrics(track);

    expect(metrics.durationSeconds).toBe(240);
    expect(metrics.averageSpeedMps).toBeCloseTo(metrics.totalDistanceMeters / 240, 8);
    expect(metrics.elevationGainMeters).toBe(20);
    expect(metrics.elevationLossMeters).toBe(5);
    expect(metrics.elevationProfile).toEqual([
      { points: [
        { distanceMeters: 0, elevationMeters: 100 },
        { distanceMeters: expect.any(Number), elevationMeters: 110 },
      ] },
      { points: [
        { distanceMeters: expect.any(Number), elevationMeters: 105 },
        { distanceMeters: expect.any(Number), elevationMeters: 115 },
        { distanceMeters: expect.any(Number), elevationMeters: 110 },
      ] },
    ]);
    expect(metrics.elevationProfile?.[1].points[0].distanceMeters).toBe(metrics.elevationProfile?.[0].points[1].distanceMeters);
  });

  it("leaves duration and speed unavailable if timestamps are incomplete or inconsistent", () => {
    const track: TrackData = {
      sourceFileName: "partial.gpx",
      waypoints: [],
      segments: [{ points: [
        { latitude: 0, longitude: 0, timestamp: "2024-01-01T10:00:00.000Z" },
        { latitude: 0, longitude: 0.01 },
      ] }],
    };
    const metrics = calculateMetrics(track);
    expect(metrics.durationSeconds).toBeUndefined();
    expect(metrics.averageSpeedMps).toBeUndefined();

    track.segments[0].points[1].timestamp = "2024-01-01T09:59:00.000Z";
    expect(calculateMetrics(track).durationSeconds).toBeUndefined();
  });

  it("leaves elevation metrics unavailable without an adjacent elevation pair", () => {
    const track: TrackData = {
      sourceFileName: "no-elevation.gpx",
      waypoints: [],
      segments: [{ points: [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.01, elevation: 20 }] }],
    };
    const metrics = calculateMetrics(track);
    expect(metrics.elevationGainMeters).toBeUndefined();
    expect(metrics.elevationLossMeters).toBeUndefined();
    expect(metrics.elevationProfile).toBeUndefined();
  });
});
