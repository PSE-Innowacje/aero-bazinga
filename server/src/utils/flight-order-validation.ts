/**
 * Pure validation rules for flight orders (FLT-05).
 * Extracted from route handler for testability.
 * These functions take pre-fetched data — no DB dependency.
 */

export interface ValidationWarning {
  rule: string;
  message: string;
}

export interface HelicopterData {
  max_crew_payload_kg: number;
  max_crew_count: number;
  range_km: number;
  inspection_expiry_date: string | null;
}

export interface CrewMemberData {
  id: number;
  weight_kg: number;
  training_expiry_date: string | null;
}

export interface PilotData {
  weight_kg: number;
  license_expiry_date: string | null;
}

/**
 * Rule 1: Crew total weight must not exceed helicopter max_crew_payload_kg
 */
export function validateCrewWeight(
  pilotWeight: number,
  crewMembers: CrewMemberData[],
  maxPayloadKg: number
): ValidationWarning | null {
  const crewWeight = crewMembers.reduce((sum, cm) => sum + cm.weight_kg, 0);
  const totalWeight = pilotWeight + crewWeight;
  if (totalWeight > maxPayloadKg) {
    return {
      rule: "weight_exceeded",
      message: `Łączna waga załogi (${totalWeight} kg) przekracza maksymalne obciążenie helikoptera (${maxPayloadKg} kg).`,
    };
  }
  return null;
}

/**
 * Rule 2: Crew count (pilot + members) must not exceed helicopter max_crew_count
 */
export function validateCrewCount(
  crewMemberCount: number,
  maxCrewCount: number
): ValidationWarning | null {
  const total = crewMemberCount + 1; // +1 for pilot
  if (total > maxCrewCount) {
    return {
      rule: "crew_count_exceeded",
      message: `Liczba załogi (${total}) przekracza maksymalną liczbę miejsc (${maxCrewCount}).`,
    };
  }
  return null;
}

/**
 * Rule 3: Estimated route length must not exceed helicopter range_km
 */
export function validateRouteLength(
  estimatedRouteKm: number,
  rangeKm: number
): ValidationWarning | null {
  if (estimatedRouteKm > rangeKm) {
    return {
      rule: "range_exceeded",
      message: `Szacowana długość trasy (${estimatedRouteKm.toFixed(2)} km) przekracza zasięg helikoptera (${rangeKm} km).`,
    };
  }
  return null;
}

/**
 * Rule 4: Each crew member's training_expiry_date must be after the flight date
 */
export function validateCrewTraining(
  crewMembers: CrewMemberData[],
  flightDate: Date
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const flightDateStr = flightDate.toISOString().substring(0, 10);
  for (const cm of crewMembers) {
    if (cm.training_expiry_date && new Date(cm.training_expiry_date) < flightDate) {
      warnings.push({
        rule: "crew_training_expired",
        message: `Szkolenie członka załogi (ID: ${cm.id}) wygasło (${cm.training_expiry_date}). Data lotu: ${flightDateStr}.`,
      });
    }
  }
  return warnings;
}

/**
 * Rule 5: Pilot license_expiry_date must be after the flight date
 */
export function validatePilotLicense(
  pilot: PilotData,
  flightDate: Date
): ValidationWarning | null {
  if (pilot.license_expiry_date && new Date(pilot.license_expiry_date) < flightDate) {
    const flightDateStr = flightDate.toISOString().substring(0, 10);
    return {
      rule: "pilot_license_expired",
      message: `Licencja pilota wygasła (${pilot.license_expiry_date}). Data lotu: ${flightDateStr}.`,
    };
  }
  return null;
}

/**
 * Rule 6 (extended): Helicopter inspection must be valid on the flight date
 */
export function validateHelicopterInspection(
  helicopter: HelicopterData,
  flightDate: Date
): ValidationWarning | null {
  if (helicopter.inspection_expiry_date && new Date(helicopter.inspection_expiry_date) < flightDate) {
    const flightDateStr = flightDate.toISOString().substring(0, 10);
    return {
      rule: "helicopter_inspection_expired",
      message: `Przegląd helikoptera wygasł (${helicopter.inspection_expiry_date}). Data lotu: ${flightDateStr}.`,
    };
  }
  return null;
}

/**
 * Run all validation rules and return combined warnings.
 */
export function validateFlightOrderRules(params: {
  helicopter: HelicopterData;
  pilot: PilotData;
  crewMembers: CrewMemberData[];
  estimatedRouteKm: number;
  flightDate: Date;
}): ValidationWarning[] {
  const { helicopter, pilot, crewMembers, estimatedRouteKm, flightDate } = params;
  const warnings: ValidationWarning[] = [];

  const w1 = validateCrewWeight(pilot.weight_kg, crewMembers, helicopter.max_crew_payload_kg);
  if (w1) warnings.push(w1);

  const w2 = validateCrewCount(crewMembers.length, helicopter.max_crew_count);
  if (w2) warnings.push(w2);

  const w3 = validateRouteLength(estimatedRouteKm, helicopter.range_km);
  if (w3) warnings.push(w3);

  warnings.push(...validateCrewTraining(crewMembers, flightDate));

  const w5 = validatePilotLicense(pilot, flightDate);
  if (w5) warnings.push(w5);

  const w6 = validateHelicopterInspection(helicopter, flightDate);
  if (w6) warnings.push(w6);

  return warnings;
}
