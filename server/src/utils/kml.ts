import { XMLParser } from "fast-xml-parser";

export interface KmlPoint {
  lat: number;
  lng: number;
}

export interface KmlParseResult {
  points: KmlPoint[];
  error?: string;
}

// Poland bounding box (tightened to reduce false positives from neighboring countries)
const POLAND_LAT_MIN = 49.0;
const POLAND_LAT_MAX = 54.85;
const POLAND_LNG_MIN = 14.12;
const POLAND_LNG_MAX = 24.15;

// Additional check: southwestern corner exclusion
// Below lat 50.5, longitude must be >= 15.8 (excludes Czech/German territory)
// Below lat 51.0, longitude must be >= 14.6
function isInPoland(lat: number, lng: number): boolean {
  // Basic bounding box
  if (lat < POLAND_LAT_MIN || lat > POLAND_LAT_MAX || lng < POLAND_LNG_MIN || lng > POLAND_LNG_MAX) {
    return false;
  }
  // SW corner: Czech Republic exclusion
  if (lat < 50.0 && lng < 16.0) return false;
  if (lat < 50.5 && lng < 15.0) return false;
  if (lat < 51.0 && lng < 14.6) return false;
  // SE corner: Ukraine/Slovakia exclusion
  if (lat < 49.5 && lng > 22.5) return false;
  return true;
}

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

  // Validate all points within Poland borders
  for (const pt of points) {
    if (!isInPoland(pt.lat, pt.lng)) {
      return {
        points: [],
        error: `Punkt trasy (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}) leży poza terytorium Polski.`,
      };
    }
  }

  return { points };
}
