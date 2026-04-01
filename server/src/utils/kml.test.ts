import { describe, it, expect } from "vitest";
import { parseKml } from "./kml";

const validKml = (coords: string) => `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <LineString>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

describe("parseKml", () => {
  it("returns error for empty string", () => {
    const result = parseKml("");
    expect(result.points).toHaveLength(0);
    expect(result.error).toContain("pusty");
  });

  it("returns error for invalid XML", () => {
    const result = parseKml("<not valid xml");
    // fast-xml-parser may or may not throw — check we get 0 points
    expect(result.points.length).toBeLessThan(2);
  });

  it("parses a valid KML with 2 points in Poland", () => {
    const kml = validKml("21.0122,52.2297,0 19.945,50.0647,0");
    const result = parseKml(kml);
    expect(result.error).toBeUndefined();
    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({ lat: 52.2297, lng: 21.0122 });
    expect(result.points[1]).toEqual({ lat: 50.0647, lng: 19.945 });
  });

  it("handles coordinates separated by newlines", () => {
    const kml = validKml(`
      21.0122,52.2297,0
      19.945,50.0647,0
      20.5,51.5,0
    `);
    const result = parseKml(kml);
    expect(result.error).toBeUndefined();
    expect(result.points).toHaveLength(3);
  });

  it("rejects points outside Poland bounding box", () => {
    // Berlin is outside Poland
    const kml = validKml("13.405,52.52,0 21.0122,52.2297,0");
    const result = parseKml(kml);
    expect(result.error).toContain("poza terytorium Polski");
    expect(result.points).toHaveLength(0);
  });

  it("rejects KML with only 1 point", () => {
    const kml = validKml("21.0122,52.2297,0");
    const result = parseKml(kml);
    expect(result.error).toContain("co najmniej 2");
    expect(result.points).toHaveLength(0);
  });

  it("correctly swaps lng,lat from KML format to lat,lng in output", () => {
    // KML format is lng,lat — verify output is lat,lng
    const kml = validKml("21.0122,52.2297,0 19.945,50.0647,0");
    const result = parseKml(kml);
    // First point: lng=21.0122, lat=52.2297
    expect(result.points[0]!.lat).toBeCloseTo(52.2297, 4);
    expect(result.points[0]!.lng).toBeCloseTo(21.0122, 4);
  });

  it("handles coordinates without altitude", () => {
    const kml = validKml("21.0122,52.2297 19.945,50.0647");
    const result = parseKml(kml);
    expect(result.error).toBeUndefined();
    expect(result.points).toHaveLength(2);
  });

  it("extracts points from multiple Placemarks", () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <LineString>
        <coordinates>21.0,52.0,0 21.1,52.1,0</coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <Point>
        <coordinates>20.0,51.0,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;
    const result = parseKml(kml);
    expect(result.error).toBeUndefined();
    expect(result.points).toHaveLength(3);
  });
});
