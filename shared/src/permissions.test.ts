import { describe, it, expect } from "vitest";
import { PERMISSIONS, PermissionLevel } from "./permissions";
import { UserRole } from "./roles";

describe("PERMISSIONS matrix", () => {
  it("has entries for all 5 roles", () => {
    const roles = Object.values(UserRole);
    for (const role of roles) {
      expect(PERMISSIONS[role]).toBeDefined();
    }
  });

  it("has all 3 sections for each role", () => {
    const sections = ["administracja", "planowanie_operacji", "zlecenia_na_lot"];
    for (const role of Object.values(UserRole)) {
      for (const section of sections) {
        expect(PERMISSIONS[role][section as keyof typeof PERMISSIONS[typeof role]]).toBeDefined();
      }
    }
  });

  // SUPERADMIN: CRUD on everything
  it("gives SUPERADMIN CRUD on all sections", () => {
    const perms = PERMISSIONS[UserRole.SUPERADMIN];
    expect(perms.administracja).toBe(PermissionLevel.CRUD);
    expect(perms.planowanie_operacji).toBe(PermissionLevel.CRUD);
    expect(perms.zlecenia_na_lot).toBe(PermissionLevel.CRUD);
  });

  // ADMINISTRATOR: CRUD on admin, READ on ops and orders
  it("gives ADMINISTRATOR CRUD on administracja, READ on others", () => {
    const perms = PERMISSIONS[UserRole.ADMINISTRATOR];
    expect(perms.administracja).toBe(PermissionLevel.CRUD);
    expect(perms.planowanie_operacji).toBe(PermissionLevel.READ);
    expect(perms.zlecenia_na_lot).toBe(PermissionLevel.READ);
  });

  // PLANNER: CRUD on ops, NONE on admin and orders
  it("gives PLANNER CRUD on planowanie_operacji, NONE on others", () => {
    const perms = PERMISSIONS[UserRole.PLANNER];
    expect(perms.administracja).toBe(PermissionLevel.NONE);
    expect(perms.planowanie_operacji).toBe(PermissionLevel.CRUD);
    expect(perms.zlecenia_na_lot).toBe(PermissionLevel.NONE);
  });

  // SUPERVISOR: READ on admin, CRUD on ops, EDIT_VIEW on orders
  it("gives SUPERVISOR READ on admin, CRUD on ops, EDIT_VIEW on orders", () => {
    const perms = PERMISSIONS[UserRole.SUPERVISOR];
    expect(perms.administracja).toBe(PermissionLevel.READ);
    expect(perms.planowanie_operacji).toBe(PermissionLevel.CRUD);
    expect(perms.zlecenia_na_lot).toBe(PermissionLevel.EDIT_VIEW);
  });

  // PILOT: NONE on admin, READ on ops, CRUD on orders
  it("gives PILOT NONE on admin, READ on ops, CRUD on orders", () => {
    const perms = PERMISSIONS[UserRole.PILOT];
    expect(perms.administracja).toBe(PermissionLevel.NONE);
    expect(perms.planowanie_operacji).toBe(PermissionLevel.READ);
    expect(perms.zlecenia_na_lot).toBe(PermissionLevel.CRUD);
  });
});

describe("PermissionLevel enum", () => {
  it("contains exactly 4 levels", () => {
    expect(Object.values(PermissionLevel)).toHaveLength(4);
  });

  it("has correct string values", () => {
    expect(PermissionLevel.NONE).toBe("NONE");
    expect(PermissionLevel.READ).toBe("READ");
    expect(PermissionLevel.CRUD).toBe("CRUD");
    expect(PermissionLevel.EDIT_VIEW).toBe("EDIT_VIEW");
  });
});
