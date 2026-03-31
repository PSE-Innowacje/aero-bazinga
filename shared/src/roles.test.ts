import { describe, it, expect } from "vitest";
import { UserRole, ROLE_LABELS_PL, ROLE_DISPLAY_PL } from "./roles";

describe("UserRole enum", () => {
  it("has 5 roles", () => {
    expect(Object.values(UserRole)).toHaveLength(5);
  });

  it("contains correct string values", () => {
    expect(UserRole.SUPERADMIN).toBe("superadmin");
    expect(UserRole.ADMINISTRATOR).toBe("administrator");
    expect(UserRole.PLANNER).toBe("planner");
    expect(UserRole.SUPERVISOR).toBe("supervisor");
    expect(UserRole.PILOT).toBe("pilot");
  });
});

describe("ROLE_DISPLAY_PL", () => {
  it("has a Polish display name for every role", () => {
    for (const role of Object.values(UserRole)) {
      expect(ROLE_DISPLAY_PL[role]).toBeDefined();
      expect(ROLE_DISPLAY_PL[role].length).toBeGreaterThan(0);
    }
  });

  it("maps correct display names", () => {
    expect(ROLE_DISPLAY_PL[UserRole.SUPERADMIN]).toBe("Superadministrator");
    expect(ROLE_DISPLAY_PL[UserRole.ADMINISTRATOR]).toBe("Administrator systemu");
    expect(ROLE_DISPLAY_PL[UserRole.PLANNER]).toBe("Osoba planująca");
    expect(ROLE_DISPLAY_PL[UserRole.SUPERVISOR]).toBe("Osoba nadzorująca");
    expect(ROLE_DISPLAY_PL[UserRole.PILOT]).toBe("Pilot");
  });
});

describe("ROLE_LABELS_PL", () => {
  it("has a label for every role", () => {
    for (const role of Object.values(UserRole)) {
      expect(ROLE_LABELS_PL[role]).toBeDefined();
      expect(ROLE_LABELS_PL[role].length).toBeGreaterThan(0);
    }
  });
});
