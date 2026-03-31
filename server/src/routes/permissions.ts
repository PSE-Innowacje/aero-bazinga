import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/rbac.js";
import { UserRole } from "shared/roles";
import { PermissionLevel } from "shared/permissions";
import {
  loadPermissions,
  invalidatePermissionsCache,
} from "../db/permissions-cache.js";

export const permissionsRouter = Router();

const VALID_ROLES = Object.values(UserRole);
const VALID_SECTIONS = ["administracja", "planowanie_operacji", "zlecenia_na_lot"];
const VALID_LEVELS = Object.values(PermissionLevel);

// GET /api/admin/permissions — returns full matrix
permissionsRouter.get(
  "/",
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      // Admin or Superadmin only
      if (_req.session.role !== UserRole.ADMINISTRATOR && _req.session.role !== UserRole.SUPERADMIN) {
        return res.status(403).json({
          error: "forbidden",
          message: "Tylko administrator może zarządzać uprawnieniami",
        });
      }

      const result = await pool.query(
        "SELECT role, section, level FROM role_permissions ORDER BY role, section"
      );

      // Build matrix
      const matrix: Record<string, Record<string, string>> = {};
      for (const row of result.rows) {
        if (!matrix[row.role]) matrix[row.role] = {};
        matrix[row.role][row.section] = row.level;
      }

      return res.json({ permissions: matrix });
    } catch (error) {
      console.error("Get permissions error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);

// PUT /api/admin/permissions — update full matrix
permissionsRouter.put(
  "/",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (req.session.role !== UserRole.ADMINISTRATOR && req.session.role !== UserRole.SUPERADMIN) {
        return res.status(403).json({
          error: "forbidden",
          message: "Tylko administrator może zarządzać uprawnieniami",
        });
      }

      const { permissions } = req.body as {
        permissions: Record<string, Record<string, string>>;
      };

      if (!permissions || typeof permissions !== "object") {
        return res.status(400).json({
          error: "bad_request",
          message: "Nieprawidłowy format danych uprawnień.",
        });
      }

      // Validate all entries
      for (const [role, sections] of Object.entries(permissions)) {
        if (!VALID_ROLES.includes(role as UserRole)) {
          return res.status(400).json({
            error: "bad_request",
            message: `Nieprawidłowa rola: ${role}`,
          });
        }
        for (const [section, level] of Object.entries(sections)) {
          if (!VALID_SECTIONS.includes(section)) {
            return res.status(400).json({
              error: "bad_request",
              message: `Nieprawidłowa sekcja: ${section}`,
            });
          }
          if (!VALID_LEVELS.includes(level as PermissionLevel)) {
            return res.status(400).json({
              error: "bad_request",
              message: `Nieprawidłowy poziom: ${level}`,
            });
          }
        }
      }

      // Safety: superadmin must always have CRUD on everything
      for (const section of VALID_SECTIONS) {
        if (permissions[UserRole.SUPERADMIN]?.[section] !== PermissionLevel.CRUD) {
          return res.status(400).json({
            error: "bad_request",
            message: "Superadministrator musi zawsze mieć pełne uprawnienia (CRUD) do wszystkich sekcji.",
          });
        }
      }

      // Safety: administrator must always keep CRUD on administracja
      if (
        permissions[UserRole.ADMINISTRATOR]?.administracja !== PermissionLevel.CRUD
      ) {
        return res.status(400).json({
          error: "bad_request",
          message:
            "Administrator musi zawsze mieć pełne uprawnienia (CRUD) do sekcji Administracja.",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const [role, sections] of Object.entries(permissions)) {
          for (const [section, level] of Object.entries(sections)) {
            await client.query(
              `INSERT INTO role_permissions (role, section, level)
               VALUES ($1::user_role, $2, $3)
               ON CONFLICT (role, section) DO UPDATE SET level = $3`,
              [role, section, level]
            );
          }
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      // Invalidate and reload cache
      invalidatePermissionsCache();
      await loadPermissions();

      return res.json({ message: "Uprawnienia zaktualizowane." });
    } catch (error) {
      console.error("Update permissions error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);
