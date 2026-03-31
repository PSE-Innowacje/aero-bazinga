import { UserRole } from "./roles";

export enum PermissionLevel {
  NONE = "NONE",
  READ = "READ",
  CRUD = "CRUD",
  EDIT_VIEW = "EDIT_VIEW",
}

export type MenuSection = "administracja" | "planowanie_operacji" | "zlecenia_na_lot";

export const PERMISSIONS: Record<UserRole, Record<MenuSection, PermissionLevel>> = {
  [UserRole.ADMINISTRATOR]: {
    administracja: PermissionLevel.CRUD,
    planowanie_operacji: PermissionLevel.READ,
    zlecenia_na_lot: PermissionLevel.READ,
  },
  [UserRole.PLANNER]: {
    administracja: PermissionLevel.NONE,
    planowanie_operacji: PermissionLevel.CRUD,
    zlecenia_na_lot: PermissionLevel.NONE,
  },
  [UserRole.SUPERVISOR]: {
    administracja: PermissionLevel.READ,
    planowanie_operacji: PermissionLevel.CRUD,
    zlecenia_na_lot: PermissionLevel.EDIT_VIEW,
  },
  [UserRole.PILOT]: {
    administracja: PermissionLevel.READ,
    planowanie_operacji: PermissionLevel.READ,
    zlecenia_na_lot: PermissionLevel.CRUD,
  },
};
