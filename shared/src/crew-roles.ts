export const CREW_ROLES = [
  "Pilot",
  "Obserwator",
] as const;

export type CrewRole = typeof CREW_ROLES[number];
