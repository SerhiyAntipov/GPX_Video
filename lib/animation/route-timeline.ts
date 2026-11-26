import type { Coordinate, TrackData } from "@/lib/gpx/types";
import { haversineDistance } from "../geo/distance";

export type RouteTimelineSegment = {
  points: Coordinate[];
  cumulativeDistances: number[];
  startDistanceMeters: number;
  distanceMeters: number;
};

export type RouteTimeline = {
  segments: RouteTimelineSegment[];
  totalDistanceMeters: number;
  firstTimestampMs?: number;
  durationSeconds?: number;
};

export type RoutePosition = {
  coordinate: Coordinate;
  distanceMeters: number;
  elapsedSeconds?: number;
  segmentIndex: number;
};

export type RouteLineFeature = {
  type: "Feature";
  properties: { segmentIndex: number };
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

export type RouteLineCollection = {
  type: "FeatureCollection";
  features: RouteLineFeature[];
};

export type RoutePointCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, never>;
    geometry: { type: "Point"; coordinates: [number, number] };
  }>;
};

function clampProgress(progress: number) {
  return Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
}

function interpolateCoordinate(a: Coordinate, b: Coordinate, fraction: number): Coordinate {
  const coordinate: Coordinate = {
    latitude: a.latitude + (b.latitude - a.latitude) * fraction,
    longitude: a.longitude + (b.longitude - a.longitude) * fraction,
  };
  if (a.elevation !== undefined && b.elevation !== undefined) {
    coordinate.elevation = a.elevation + (b.elevation - a.elevation) * fraction;
  }
  if (a.timestamp && b.timestamp) {
    const timestampMs = Date.parse(a.timestamp) + (Date.parse(b.timestamp) - Date.parse(a.timestamp)) * fraction;
    coordinate.timestamp = new Date(timestampMs).toISOString();
  }
  return coordinate;
}

export function createRouteTimeline(track: TrackData): RouteTimeline {
  const sourcePoints = track.segments.flatMap((segment) => segment.points);
  const timestampValues = sourcePoints.map((point) => point.timestamp ? Date.parse(point.timestamp) : Number.NaN);
  const hasReliableTimestamps = timestampValues.length >= 2
    && timestampValues.every((timestamp, index) => Number.isFinite(timestamp) && (index === 0 || timestamp > timestampValues[index - 1]));

  let totalDistanceMeters = 0;
  const segments = track.segments
    .filter((segment) => segment.points.length >= 2)
    .map((segment) => {
      const cumulativeDistances = [0];
      for (let index = 1; index < segment.points.length; index += 1) {
        cumulativeDistances.push(cumulativeDistances[index - 1] + haversineDistance(segment.points[index - 1], segment.points[index]));
      }
      const distanceMeters = cumulativeDistances[cumulativeDistances.length - 1];
      const prepared = { points: segment.points, cumulativeDistances, startDistanceMeters: totalDistanceMeters, distanceMeters };
      totalDistanceMeters += distanceMeters;
      return prepared;
    });

  return {
    segments,
    totalDistanceMeters,
    ...(hasReliableTimestamps ? {
      firstTimestampMs: timestampValues[0],
      durationSeconds: (timestampValues[timestampValues.length - 1] - timestampValues[0]) / 1000,
    } : {}),
  };
}

export function getRoutePosition(timeline: RouteTimeline, progress: number): RoutePosition | undefined {
  if (timeline.segments.length === 0) return undefined;
  const normalizedProgress = clampProgress(progress);
  const targetDistance = timeline.totalDistanceMeters * normalizedProgress;
  const boundaryToleranceMeters = 1e-6;
  let segmentIndex = timeline.segments.findIndex((segment, index) =>
    targetDistance < segment.startDistanceMeters + segment.distanceMeters - boundaryToleranceMeters
      || index === timeline.segments.length - 1,
  );
  if (segmentIndex < 0) segmentIndex = timeline.segments.length - 1;

  const segment = timeline.segments[segmentIndex];
  if (timeline.totalDistanceMeters === 0 || segment.distanceMeters === 0) {
    const coordinate = normalizedProgress >= 1
      ? timeline.segments[timeline.segments.length - 1].points.slice(-1)[0]
      : timeline.segments[0].points[0];
    const elapsedSeconds = coordinate.timestamp && timeline.firstTimestampMs !== undefined
      ? (Date.parse(coordinate.timestamp) - timeline.firstTimestampMs) / 1000
      : undefined;
    return { coordinate, distanceMeters: targetDistance, elapsedSeconds, segmentIndex };
  }

  const localDistance = Math.max(0, Math.min(segment.distanceMeters, targetDistance - segment.startDistanceMeters));
  let nextIndex = 1;
  while (nextIndex < segment.cumulativeDistances.length - 1 && segment.cumulativeDistances[nextIndex] < localDistance) nextIndex += 1;
  const startDistance = segment.cumulativeDistances[nextIndex - 1];
  const spanDistance = segment.cumulativeDistances[nextIndex] - startDistance;
  const fraction = spanDistance > 0 ? (localDistance - startDistance) / spanDistance : 0;
  const coordinate = interpolateCoordinate(segment.points[nextIndex - 1], segment.points[nextIndex], fraction);
  const elapsedSeconds = coordinate.timestamp && timeline.firstTimestampMs !== undefined
    ? (Date.parse(coordinate.timestamp) - timeline.firstTimestampMs) / 1000
    : undefined;

  return { coordinate, distanceMeters: targetDistance, elapsedSeconds, segmentIndex };
}

export function getFullRouteGeoJSON(timeline: RouteTimeline): RouteLineCollection {
  return {
    type: "FeatureCollection",
    features: timeline.segments.map((segment, segmentIndex) => ({
      type: "Feature",
      properties: { segmentIndex },
      geometry: {
        type: "LineString",
        coordinates: segment.points.map((point) => [point.longitude, point.latitude]),
      },
    })),
  };
}

export function getProgressRouteGeoJSON(timeline: RouteTimeline, progress: number): RouteLineCollection {
  const normalizedProgress = clampProgress(progress);
  const targetDistance = timeline.totalDistanceMeters * normalizedProgress;
  const features: RouteLineFeature[] = [];

  timeline.segments.forEach((segment, segmentIndex) => {
    if (normalizedProgress === 0 || targetDistance <= segment.startDistanceMeters) return;
    const localDistance = Math.min(segment.distanceMeters, targetDistance - segment.startDistanceMeters);
    const coordinates: [number, number][] = [];

    for (let index = 0; index < segment.points.length; index += 1) {
      if (segment.cumulativeDistances[index] < localDistance || localDistance >= segment.distanceMeters) {
        coordinates.push([segment.points[index].longitude, segment.points[index].latitude]);
        continue;
      }

      if (index > 0 && segment.cumulativeDistances[index - 1] < localDistance) {
        const span = segment.cumulativeDistances[index] - segment.cumulativeDistances[index - 1];
        const fraction = span > 0 ? (localDistance - segment.cumulativeDistances[index - 1]) / span : 0;
        const point = interpolateCoordinate(segment.points[index - 1], segment.points[index], fraction);
        coordinates.push([point.longitude, point.latitude]);
      }
      break;
    }

    if (coordinates.length >= 2) {
      features.push({
        type: "Feature",
        properties: { segmentIndex },
        geometry: { type: "LineString", coordinates },
      });
    }
  });

  return { type: "FeatureCollection", features };
}

export function getRoutePointGeoJSON(timeline: RouteTimeline, progress: number): RoutePointCollection {
  const position = getRoutePosition(timeline, progress);
  return {
    type: "FeatureCollection",
    features: position ? [{
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [position.coordinate.longitude, position.coordinate.latitude] },
    }] : [],
  };
}
