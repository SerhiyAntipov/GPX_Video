import type { ActivityMetrics, TrackData } from "./types";
import { haversineDistance } from "../geo/distance";

export function calculateMetrics(track: TrackData): ActivityMetrics {
  let totalDistanceMeters = 0;
  let elevationGainMeters = 0;
  let elevationLossMeters = 0;
  let hasElevationPair = false;
  const elevationProfile: NonNullable<ActivityMetrics["elevationProfile"]> = [];
  const allPoints = track.segments.flatMap((segment) => segment.points);

  for (const segment of track.segments) {
    const segmentStartDistance = totalDistanceMeters;
    let segmentDistanceMeters = 0;
    let profileRun: Array<{ distanceMeters: number; elevationMeters: number }> = [];
    for (let index = 0; index < segment.points.length; index += 1) {
      const point = segment.points[index];
      if (index > 0) {
        const previous = segment.points[index - 1];
        const distance = haversineDistance(previous, point);
        totalDistanceMeters += distance;
        segmentDistanceMeters += distance;

        if (previous.elevation !== undefined && point.elevation !== undefined) {
          hasElevationPair = true;
          const change = point.elevation - previous.elevation;
          if (change > 0) elevationGainMeters += change;
          if (change < 0) elevationLossMeters -= change;
        }
      }
      if (point.elevation === undefined) {
        if (profileRun.length >= 2) elevationProfile.push({ points: profileRun });
        profileRun = [];
        continue;
      }
      profileRun.push({ distanceMeters: segmentStartDistance + segmentDistanceMeters, elevationMeters: point.elevation });
    }
    if (profileRun.length >= 2) elevationProfile.push({ points: profileRun });
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
    ...(hasElevationPair ? { elevationGainMeters, elevationLossMeters, elevationProfile } : {}),
  };
}
