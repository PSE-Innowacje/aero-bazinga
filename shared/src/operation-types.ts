export const OPERATION_TYPES_PL = [
  "Oględziny wizualne",
  "Skan 3D",
  "Lokalizacja awarii",
  "Zdjęcia",
  "Patrolowanie",
] as const;

export type OperationType = typeof OPERATION_TYPES_PL[number];
