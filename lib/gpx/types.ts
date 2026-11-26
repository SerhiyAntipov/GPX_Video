export type Coordinate = {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: string;
};

export type TrackData = {
  name?: string;
  segments: Array<{ points: Coordinate[] }>;
  waypoints: Coordinate[];
  sourceFileName: string;
};

export type ActivityMetrics = {
  totalDistanceMeters: number;
  durationSeconds?: number;
  averageSpeedMps?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  elevationProfile?: Array<{
    points: Array<{ distanceMeters: number; elevationMeters: number }>;
  }>;
};

export type ParsedActivity = {
  track: TrackData;
  metrics: ActivityMetrics;
};
