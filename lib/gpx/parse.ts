import type { Coordinate, TrackData } from "./types";

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GpxParseError";
  }
}

function childrenByName(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName.toLowerCase() === name);
}

function firstChildByName(parent: Element, name: string): Element | undefined {
  return childrenByName(parent, name)[0];
}

function parseCoordinate(element: Element, kind: string): Coordinate {
  const latitudeText = element.getAttribute("lat");
  const longitudeText = element.getAttribute("lon");
  const latitude = latitudeText === null || latitudeText.trim() === "" ? Number.NaN : Number(latitudeText);
  const longitude = longitudeText === null || longitudeText.trim() === "" ? Number.NaN : Number(longitudeText);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new GpxParseError(`GPX містить некоректні координати в точці ${kind}.`);
  }

  const coordinate: Coordinate = { latitude, longitude };
  const elevationText = firstChildByName(element, "ele")?.textContent?.trim();
  if (elevationText) {
    const elevation = Number(elevationText);
    if (Number.isFinite(elevation)) coordinate.elevation = elevation;
  }

  const timestampText = firstChildByName(element, "time")?.textContent?.trim();
  if (timestampText) {
    const timestamp = Date.parse(timestampText);
    if (Number.isFinite(timestamp)) coordinate.timestamp = new Date(timestamp).toISOString();
  }
  return coordinate;
}

function parsePoints(parent: Element, pointName: string, kind: string): Coordinate[] {
  return childrenByName(parent, pointName).map((point, index) => parseCoordinate(point, `${kind} ${index + 1}`));
}

export function parseGpx(xmlText: string, sourceFileName: string): TrackData {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new GpxParseError("Не вдалося прочитати GPX: перевірте, чи файл не пошкоджений.");
  }

  const root = document.documentElement;
  if (root.localName.toLowerCase() !== "gpx") {
    throw new GpxParseError("Файл не має формату GPX.");
  }

  const tracks = childrenByName(root, "trk");
  const segments = tracks.flatMap((track) =>
    childrenByName(track, "trkseg")
      .map((segment) => ({ points: parsePoints(segment, "trkpt", "трек") }))
      .filter((segment) => segment.points.length > 0),
  );

  // GPX routes are supported as a fallback when a file has no recorded tracks.
  if (segments.length === 0) {
    for (const route of childrenByName(root, "rte")) {
      const points = parsePoints(route, "rtept", "маршрут");
      if (points.length > 0) segments.push({ points });
    }
  }

  if (segments.length === 0 || segments.every((segment) => segment.points.length < 2)) {
    throw new GpxParseError("У GPX не знайдено маршруту щонайменше з двох точок.");
  }

  const namedTrack = tracks.find((track) => firstChildByName(track, "name")?.textContent?.trim());
  const name = firstChildByName(namedTrack ?? root, "name")?.textContent?.trim() || undefined;
  const waypoints = parsePoints(root, "wpt", "точка маршруту");

  return { name, segments, waypoints, sourceFileName };
}
