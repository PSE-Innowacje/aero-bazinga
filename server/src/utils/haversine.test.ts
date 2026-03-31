import { describe, it, expect } from "vitest";
import { haversineDistance, totalRouteDistance } from "./haversine";

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance(52.2297, 21.0122, 52.2297, 21.0122)).toBe(0);
  });

  it("calculates Warsaw to Kraków (~252 km)", () => {
    const dist = haversineDistance(52.2297, 21.0122, 50.0647, 19.945);
    expect(dist).toBeGreaterThan(245);
    expect(dist).toBeLessThan(260);
  });

  it("calculates Warsaw to Gdańsk (~284 km)", () => {
    const dist = haversineDistance(52.2297, 21.0122, 54.352, 18.6466);
    expect(dist).toBeGreaterThan(278);
    expect(dist).toBeLessThan(290);
  });

  it("calculates short distance (< 1 km)", () => {
    // ~111m apart (0.001 degree latitude ≈ 111m)
    const dist = haversineDistance(52.0, 21.0, 52.001, 21.0);
    expect(dist).toBeGreaterThan(0.1);
    expect(dist).toBeLessThan(0.12);
  });

  it("is symmetric (A→B == B→A)", () => {
    const ab = haversineDistance(52.2297, 21.0122, 50.0647, 19.945);
    const ba = haversineDistance(50.0647, 19.945, 52.2297, 21.0122);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe("totalRouteDistance", () => {
  it("returns 0 for empty array", () => {
    expect(totalRouteDistance([])).toBe(0);
  });

  it("returns 0 for single point", () => {
    expect(totalRouteDistance([{ lat: 52, lng: 21 }])).toBe(0);
  });

  it("calculates distance for two points", () => {
    const dist = totalRouteDistance([
      { lat: 52.2297, lng: 21.0122 },
      { lat: 50.0647, lng: 19.945 },
    ]);
    expect(dist).toBeGreaterThan(245);
    expect(dist).toBeLessThan(260);
  });

  it("sums segments for multi-point route", () => {
    // Warsaw → Łódź → Kraków should be longer than Warsaw → Kraków direct
    const direct = totalRouteDistance([
      { lat: 52.2297, lng: 21.0122 }, // Warsaw
      { lat: 50.0647, lng: 19.945 },  // Kraków
    ]);
    const viaLodz = totalRouteDistance([
      { lat: 52.2297, lng: 21.0122 }, // Warsaw
      { lat: 51.7592, lng: 19.4560 }, // Łódź
      { lat: 50.0647, lng: 19.945 },  // Kraków
    ]);
    expect(viaLodz).toBeGreaterThan(direct);
  });

  it("rounds to 2 decimal places", () => {
    const dist = totalRouteDistance([
      { lat: 52.0, lng: 21.0 },
      { lat: 52.001, lng: 21.001 },
    ]);
    const decimalPlaces = dist.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});
