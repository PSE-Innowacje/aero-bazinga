export enum UserRole {
  ADMINISTRATOR = "administrator",
  PLANNER = "planner",
  SUPERVISOR = "supervisor",
  PILOT = "pilot",
}

export const ROLE_LABELS_PL: Record<UserRole, string> = {
  [UserRole.ADMINISTRATOR]: "Administrator systemu",
  [UserRole.PLANNER]: "Osoba planujaca",
  [UserRole.SUPERVISOR]: "Osoba nadzorujaca",
  [UserRole.PILOT]: "Pilot",
};

export const ROLE_DISPLAY_PL: Record<UserRole, string> = {
  [UserRole.ADMINISTRATOR]: "Administrator systemu",
  [UserRole.PLANNER]: "Osoba planująca",
  [UserRole.SUPERVISOR]: "Osoba nadzorująca",
  [UserRole.PILOT]: "Pilot",
};
