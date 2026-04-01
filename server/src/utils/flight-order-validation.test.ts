import { describe, it, expect } from "vitest";
import {
  validateCrewWeight,
  validateCrewCount,
  validateRouteLength,
  validateCrewTraining,
  validatePilotLicense,
  validateHelicopterInspection,
  validateFlightOrderRules,
} from "./flight-order-validation";
import type { HelicopterData, PilotData, CrewMemberData } from "./flight-order-validation";

const futureDate = new Date("2026-12-01");
const pastDate = new Date("2025-01-01");

describe("Rule 1: validateCrewWeight", () => {
  it("passes when total weight is under limit", () => {
    const crew = [{ id: 1, weight_kg: 70, training_expiry_date: null }];
    expect(validateCrewWeight(80, crew, 500)).toBeNull();
  });

  it("passes when total weight equals limit exactly", () => {
    const crew = [{ id: 1, weight_kg: 120, training_expiry_date: null }];
    expect(validateCrewWeight(80, crew, 200)).toBeNull();
  });

  it("fails when total weight exceeds limit", () => {
    const crew = [
      { id: 1, weight_kg: 90, training_expiry_date: null },
      { id: 2, weight_kg: 85, training_expiry_date: null },
    ];
    const result = validateCrewWeight(80, crew, 200);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("weight_exceeded");
    expect(result!.message).toContain("255 kg");
    expect(result!.message).toContain("200 kg");
  });

  it("passes with empty crew (pilot only)", () => {
    expect(validateCrewWeight(80, [], 100)).toBeNull();
  });

  it("fails with pilot only when pilot exceeds limit", () => {
    const result = validateCrewWeight(150, [], 100);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("weight_exceeded");
  });
});

describe("Rule 2: validateCrewCount", () => {
  it("passes when crew + pilot fits", () => {
    expect(validateCrewCount(2, 5)).toBeNull(); // 2+1=3 <= 5
  });

  it("passes when exactly at limit", () => {
    expect(validateCrewCount(4, 5)).toBeNull(); // 4+1=5 <= 5
  });

  it("fails when crew + pilot exceeds max", () => {
    const result = validateCrewCount(5, 5); // 5+1=6 > 5
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("crew_count_exceeded");
    expect(result!.message).toContain("6");
    expect(result!.message).toContain("5");
  });

  it("passes with zero crew members (pilot only)", () => {
    expect(validateCrewCount(0, 1)).toBeNull(); // 0+1=1 <= 1
  });
});

describe("Rule 3: validateRouteLength", () => {
  it("passes when route is shorter than range", () => {
    expect(validateRouteLength(400, 600)).toBeNull();
  });

  it("passes when route equals range exactly", () => {
    expect(validateRouteLength(600, 600)).toBeNull();
  });

  it("fails when route exceeds range", () => {
    const result = validateRouteLength(750.5, 600);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("range_exceeded");
    expect(result!.message).toContain("750.50");
    expect(result!.message).toContain("600");
  });

  it("passes with zero route length", () => {
    expect(validateRouteLength(0, 600)).toBeNull();
  });
});

describe("Rule 4: validateCrewTraining", () => {
  it("passes when all training dates are in the future", () => {
    const crew: CrewMemberData[] = [
      { id: 1, weight_kg: 80, training_expiry_date: "2027-06-01" },
      { id: 2, weight_kg: 70, training_expiry_date: "2027-12-15" },
    ];
    expect(validateCrewTraining(crew, futureDate)).toHaveLength(0);
  });

  it("fails when a crew member's training has expired", () => {
    const crew: CrewMemberData[] = [
      { id: 1, weight_kg: 80, training_expiry_date: "2026-01-01" },
      { id: 2, weight_kg: 70, training_expiry_date: "2027-12-15" },
    ];
    const warnings = validateCrewTraining(crew, futureDate);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].rule).toBe("crew_training_expired");
    expect(warnings[0].message).toContain("ID: 1");
  });

  it("fails for multiple expired crew members", () => {
    const crew: CrewMemberData[] = [
      { id: 1, weight_kg: 80, training_expiry_date: "2025-06-01" },
      { id: 2, weight_kg: 70, training_expiry_date: "2025-03-01" },
    ];
    const warnings = validateCrewTraining(crew, futureDate);
    expect(warnings).toHaveLength(2);
  });

  it("passes when training_expiry_date is null", () => {
    const crew: CrewMemberData[] = [
      { id: 1, weight_kg: 80, training_expiry_date: null },
    ];
    expect(validateCrewTraining(crew, futureDate)).toHaveLength(0);
  });

  it("passes with empty crew", () => {
    expect(validateCrewTraining([], futureDate)).toHaveLength(0);
  });
});

describe("Rule 5: validatePilotLicense", () => {
  it("passes when license is valid on flight date", () => {
    const pilot: PilotData = { weight_kg: 80, license_expiry_date: "2027-06-01" };
    expect(validatePilotLicense(pilot, futureDate)).toBeNull();
  });

  it("fails when license expired before flight date", () => {
    const pilot: PilotData = { weight_kg: 80, license_expiry_date: "2026-06-01" };
    const result = validatePilotLicense(pilot, futureDate);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("pilot_license_expired");
    expect(result!.message).toContain("2026-06-01");
  });

  it("passes when license_expiry_date is null", () => {
    const pilot: PilotData = { weight_kg: 80, license_expiry_date: null };
    expect(validatePilotLicense(pilot, futureDate)).toBeNull();
  });
});

describe("Rule 6: validateHelicopterInspection", () => {
  it("passes when inspection is valid on flight date", () => {
    const heli: HelicopterData = { max_crew_payload_kg: 500, max_crew_count: 5, range_km: 600, inspection_expiry_date: "2027-01-01" };
    expect(validateHelicopterInspection(heli, futureDate)).toBeNull();
  });

  it("fails when inspection expired before flight date", () => {
    const heli: HelicopterData = { max_crew_payload_kg: 500, max_crew_count: 5, range_km: 600, inspection_expiry_date: "2026-06-01" };
    const result = validateHelicopterInspection(heli, futureDate);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe("helicopter_inspection_expired");
  });

  it("passes when inspection_expiry_date is null", () => {
    const heli: HelicopterData = { max_crew_payload_kg: 500, max_crew_count: 5, range_km: 600, inspection_expiry_date: null };
    expect(validateHelicopterInspection(heli, futureDate)).toBeNull();
  });
});

describe("validateFlightOrderRules — combined", () => {
  const validHeli: HelicopterData = {
    max_crew_payload_kg: 500,
    max_crew_count: 4,
    range_km: 600,
    inspection_expiry_date: "2027-06-01",
  };
  const validPilot: PilotData = { weight_kg: 80, license_expiry_date: "2027-06-01" };
  const validCrew: CrewMemberData[] = [
    { id: 1, weight_kg: 70, training_expiry_date: "2027-06-01" },
  ];

  it("returns no warnings when everything is valid", () => {
    const warnings = validateFlightOrderRules({
      helicopter: validHeli,
      pilot: validPilot,
      crewMembers: validCrew,
      estimatedRouteKm: 400,
      flightDate: futureDate,
    });
    expect(warnings).toHaveLength(0);
  });

  it("returns multiple warnings when multiple rules violated", () => {
    const badHeli: HelicopterData = {
      max_crew_payload_kg: 100, // too low
      max_crew_count: 1,        // too few (pilot only)
      range_km: 200,            // too short
      inspection_expiry_date: "2025-01-01", // expired
    };
    const badPilot: PilotData = { weight_kg: 80, license_expiry_date: "2025-01-01" };
    const badCrew: CrewMemberData[] = [
      { id: 1, weight_kg: 90, training_expiry_date: "2025-01-01" },
    ];

    const warnings = validateFlightOrderRules({
      helicopter: badHeli,
      pilot: badPilot,
      crewMembers: badCrew,
      estimatedRouteKm: 500,
      flightDate: futureDate,
    });

    const rules = warnings.map(w => w.rule);
    expect(rules).toContain("weight_exceeded");
    expect(rules).toContain("crew_count_exceeded");
    expect(rules).toContain("range_exceeded");
    expect(rules).toContain("crew_training_expired");
    expect(rules).toContain("pilot_license_expired");
    expect(rules).toContain("helicopter_inspection_expired");
    expect(warnings.length).toBe(6);
  });

  it("returns only relevant warnings for partial violations", () => {
    const warnings = validateFlightOrderRules({
      helicopter: validHeli,
      pilot: { weight_kg: 80, license_expiry_date: "2025-01-01" }, // expired only
      crewMembers: validCrew,
      estimatedRouteKm: 400,
      flightDate: futureDate,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].rule).toBe("pilot_license_expired");
  });
});
