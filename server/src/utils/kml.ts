import { XMLParser } from "fast-xml-parser";

export interface KmlPoint {
  lat: number;
  lng: number;
}

export interface KmlParseResult {
  points: KmlPoint[];
  error?: string;
}

// Poland bounding box (approximate)
const POLAND_LAT_MIN = 49.0;
const POLAND_LAT_MAX = 54.9;
const POLAND_LNG_MIN = 14.1;
const POLAND_LNG_MAX = 24.2;

const MAX_POINTS = 5000;
const MIN_POINTS = 2;

/**
 * Parse a KML XML string and extract route points.
 * Returns points array and optional error string.
 */
export function parseKml(xmlString: string): KmlParseResult {
  if (!xmlString || xmlString.trim().length === 0) {
    return { points: [], error: "Plik KML jest pusty." };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (tagName) =>
      ["Placemark", "Point", "LineString", "coordinates"].indexOf(tagName) !== -1,
  });

  let parsed: any;
  try {
    parsed = parser.parse(xmlString);
  } catch {
    return { points: [], error: "Nie udało się sparsować pliku KML — nieprawidłowy XML." };
  }

  const points: KmlPoint[] = [];

  // Walk the KML tree to extract all coordinates strings
  function extractCoordinates(obj: any): string[] {
    const results: string[] = [];
    if (obj == null) return results;

    if (typeof obj === "string") {
      // Coordinates string format: "lng,lat[,alt] lng,lat[,alt] ..."
      const trimmed = obj.trim();
      if (trimmed.length > 0 && trimmed.includes(",")) {
        results.push(trimmed);
      }
      return results;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        results.push(...extractCoordinates(item));
      }
      return results;
    }

    if (typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        if (key === "coordinates" || key === "@_coordinates") {
          results.push(...extractCoordinates(obj[key]));
        } else {
          results.push(...extractCoordinates(obj[key]));
        }
      }
    }

    return results;
  }

  const coordStrings = extractCoordinates(parsed);

  for (const coordStr of coordStrings) {
    // Split by whitespace (newlines, spaces, tabs)
    const tokens = coordStr.trim().split(/\s+/);
    for (const token of tokens) {
      const t = token.trim();
      if (!t) continue;
      const parts = t.split(",");
      if (parts.length < 2) continue;
      const lngRaw = parseFloat(parts[0]!);
      const latRaw = parseFloat(parts[1]!);
      if (isNaN(lngRaw) || isNaN(latRaw)) continue;
      points.push({ lat: latRaw, lng: lngRaw });
    }
  }

  if (points.length < MIN_POINTS) {
    return {
      points: [],
      error: `Plik KML musi zawierać co najmniej ${MIN_POINTS} punkty trasy. Znaleziono: ${points.length}.`,
    };
  }

  if (points.length > MAX_POINTS) {
    return {
      points: [],
      error: `Plik KML może zawierać maksymalnie ${MAX_POINTS} punktów. Znaleziono: ${points.length}.`,
    };
  }

  // Validate all points within Poland bounding box
  for (const pt of points) {
    if (
      pt.lat < POLAND_LAT_MIN ||
      pt.lat > POLAND_LAT_MAX ||
      pt.lng < POLAND_LNG_MIN ||
      pt.lng > POLAND_LNG_MAX
    ) {
      return {
        points: [],
        error: `Punkt trasy (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}) leży poza terytorium Polski.`,
      };
    }
  }

  return { points };
}
