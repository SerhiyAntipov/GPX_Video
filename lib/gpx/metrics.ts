import type { ActivityMetrics, Coordinate, TrackData } from "./types";

const EARTH_RADIUS_METERS = 6_371_008.8;

function distanceBetween(a: Coordinate, b: Coordinate) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function calculateMetrics(track: TrackData): ActivityMetrics {
  let totalDistanceMeters = 0;
  let elevationGainMeters = 0;
  let elevationLossMeters = 0;
  let hasElevationPair = false;
  const allPoints = track.segments.flatMap((segment) => segment.points);

  for (const segment of track.segments) {
    for (let index = 1; index < segment.points.length; index += 1) {
      const previous = segment.points[index - 1];
      const current = segment.points[index];
      totalDistanceMeters += distanceBetween(previous, current);

      if (previous.elevation !== undefined && current.elevation !== undefined) {
        hasElevationPair = true;
        const change = current.elevation - previous.elevation;
        if (change > 0) elevationGainMeters += change;
        if (change < 0) elevationLossMeters -= change;
      }
    }
  }

  const timestamps = allPoints.map((point) => point.timestamp);
  const hasCompleteTimestamps = timestamps.length >= 2 && timestamps.every((timestamp) => timestamp !== undefined);
  const timestampValues = hasCompleteTimestamps ? timestamps.map((timestamp) => Date.parse(timestamp!)) : [];
  const hasReliableDuration = hasCompleteTimestamps
    && timestampValues.every((timestamp, index) => index === 0 || timestamp > timestampValues[index - 1]);
  const durationSeconds = hasReliableDuration
    ? (timestampValues[timestampValues.length - 1] - timestampValues[0]) / 1000
    : undefined;

  return {
    totalDistanceMeters,
    ...(durationSeconds !== undefined ? {
      durationSeconds,
      averageSpeedMps: totalDistanceMeters / durationSeconds,
    } : {}),
    ...(hasElevationPair ? { elevationGainMeters, elevationLossMeters } : {}),
  };
}
