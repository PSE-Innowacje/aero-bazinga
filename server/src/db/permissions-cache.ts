import { pool } from "./pool.js";
import { PERMISSIONS, PermissionLevel } from "shared/permissions";
import type { UserRole } from "shared/roles";

type PermissionMatrix = Record<string, Record<string, PermissionLevel>>;

let cachedPermissions: PermissionMatrix | null = null;

export async function loadPermissions(): Promise<PermissionMatrix> {
  try {
    const result = await pool.query(
      "SELECT role, section, level FROM role_permissions"
    );

    if (result.rows.length === 0) {
      // Fallback to static defaults if table is empty
      cachedPermissions = PERMISSIONS as unknown as PermissionMatrix;
      return cachedPermissions;
    }

    const matrix: PermissionMatrix = {};
    for (const row of result.rows) {
      if (!matrix[row.role]) matrix[row.role] = {};
      matrix[row.role][row.section] = row.level as PermissionLevel;
    }

    cachedPermissions = matrix;
    return matrix;
  } catch {
    // Table doesn't exist yet — use static defaults
    cachedPermissions = PERMISSIONS as unknown as PermissionMatrix;
    return cachedPermissions;
  }
}

export function getPermissions(): PermissionMatrix {
  return cachedPermissions ?? (PERMISSIONS as unknown as PermissionMatrix);
}

export function invalidatePermissionsCache(): void {
  cachedPermissions = null;
}

export function getPermissionLevel(
  role: string,
  section: string
): PermissionLevel {
  const perms = getPermissions();
  return (perms[role]?.[section] as PermissionLevel) ?? PermissionLevel.NONE;
}
