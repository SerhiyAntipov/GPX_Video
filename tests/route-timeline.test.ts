import { describe, expect, it } from "vitest";
import { createRouteTimeline, getFullRouteGeoJSON, getProgressRouteGeoJSON, getRoutePosition } from "../lib/animation/route-timeline";
import type { TrackData } from "../lib/gpx/types";

const twoSegmentTrack: TrackData = {
  sourceFileName: "two-segments.gpx",
  waypoints: [],
  segments: [
    { points: [
      { latitude: 0, longitude: 0, timestamp: "2024-01-01T10:00:00Z" },
      { latitude: 0, longitude: 0.01, timestamp: "2024-01-01T10:01:00Z" },
    ] },
    { points: [
      { latitude: 1, longitude: 10, timestamp: "2024-01-01T10:02:00Z" },
      { latitude: 1, longitude: 10.01, timestamp: "2024-01-01T10:03:00Z" },
    ] },
  ],
};

describe("route animation timeline", () => {
  it("interpolates position and source activity time by distance", () => {
    const timeline = createRouteTimeline(twoSegmentTrack);
    const position = getRoutePosition(timeline, 0.25);

    expect(position?.coordinate.longitude).toBeCloseTo(0.005, 5);
    expect(position?.elapsedSeconds).toBeCloseTo(30, 1);
    expect(position?.distanceMeters).toBeCloseTo(timeline.totalDistanceMeters * 0.25, 5);
  });

  it("moves between segments without drawing a connector", () => {
    const timeline = createRouteTimeline(twoSegmentTrack);
    const boundaryProgress = timeline.segments[0].distanceMeters / timeline.totalDistanceMeters;
    const atBoundary = getRoutePosition(timeline, boundaryProgress);
    const fullRoute = getFullRouteGeoJSON(timeline);
    const drawnRoute = getProgressRouteGeoJSON(timeline, boundaryProgress);

    expect(atBoundary?.segmentIndex).toBe(1);
    expect(atBoundary?.coordinate.latitude).toBe(1);
    expect(fullRoute.features).toHaveLength(2);
    expect(drawnRoute.features).toHaveLength(1);
    expect(drawnRoute.features[0].properties.segmentIndex).toBe(0);
  });

  it("does not invent activity time when timestamps are absent", () => {
    const track: TrackData = {
      sourceFileName: "no-times.gpx",
      waypoints: [],
      segments: [{ points: [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0.01 },
      ] }],
    };
    const position = getRoutePosition(createRouteTimeline(track), 0.5);
    expect(position?.elapsedSeconds).toBeUndefined();
  });

  it("returns the last point at the end and handles a zero-distance track", () => {
    const timeline = createRouteTimeline(twoSegmentTrack);
    expect(getRoutePosition(timeline, 1)?.coordinate.longitude).toBeCloseTo(10.01, 5);

    const stillTrack: TrackData = {
      sourceFileName: "stationary.gpx",
      waypoints: [],
      segments: [{ points: [
        { latitude: 1, longitude: 1 },
        { latitude: 1, longitude: 1 },
      ] }],
    };
    expect(getRoutePosition(createRouteTimeline(stillTrack), 0.7)?.coordinate.latitude).toBe(1);
  });
});
