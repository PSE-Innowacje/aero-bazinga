import { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { pool } from "../db/pool.js";
import { requirePermission } from "../middleware/rbac.js";
import { PermissionLevel } from "shared/permissions";
import { UserRole } from "shared/roles";

export const usersRouter = Router();

// Same email validation as CREW-03
function isValidEmail(email: string): boolean {
  const pattern = /^[a-zA-Z0-9.\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!pattern.test(email)) return false;
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  const parts = email.split("@");
  const domain = parts[1];
  if (!domain) return false;
  const segments = domain.split(".");
  return segments.length >= 2 && segments.every((s) => s.length > 0);
}

const VALID_ROLES = Object.values(UserRole) as string[];

// GET /api/admin/users — USR-03: sorted by email ASC
usersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, crew_member_id, is_active, created_at, updated_at
       FROM users
       ORDER BY email ASC`
    );
    return res.status(200).json({ users: result.rows });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// GET /api/admin/users/:id
usersRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
  }
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, crew_member_id, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "not_found", message: "Użytkownik nie istnieje." });
    }
    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// POST /api/admin/users — USR-01
usersRouter.post(
  "/",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const { first_name, last_name, email, password, role, crew_member_id } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (first_name.length > 100) return res.status(400).json({ error: "bad_request", message: "Imię max 100 znaków." });
    if (last_name.length > 100) return res.status(400).json({ error: "bad_request", message: "Nazwisko max 100 znaków." });
    if (email.length > 100) return res.status(400).json({ error: "bad_request", message: "Email max 100 znaków." });

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Nieprawidłowy format adresu email." });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowa rola." });
    }

    // AUTH-04: Pilot must have crew_member_id
    if (role === UserRole.PILOT && !crew_member_id) {
      return res.status(400).json({
        error: "bad_request",
        message: "Pilot musi być powiązany z członkiem załogi.",
      });
    }

    try {
      const password_hash = await bcryptjs.hash(password, 12);
      const result = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, crew_member_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, first_name, last_name, email, role, crew_member_id, is_active, created_at, updated_at`,
        [
          first_name,
          last_name,
          email,
          password_hash,
          role,
          role === UserRole.PILOT ? crew_member_id || null : null,
        ]
      );
      return res.status(201).json({ user: result.rows[0] });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "conflict",
          message: "Użytkownik z tym adresem email już istnieje.",
        });
      }
      console.error("Create user error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);

// PUT /api/admin/users/:id — USR-02
usersRouter.put(
  "/:id",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    const { first_name, last_name, email, password, role, crew_member_id } = req.body;

    if (!first_name || !last_name || !email || !role) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (first_name.length > 100) return res.status(400).json({ error: "bad_request", message: "Imię max 100 znaków." });
    if (last_name.length > 100) return res.status(400).json({ error: "bad_request", message: "Nazwisko max 100 znaków." });
    if (email.length > 100) return res.status(400).json({ error: "bad_request", message: "Email max 100 znaków." });
    if (!isValidEmail(email)) return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy format adresu email." });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: "bad_request", message: "Nieprawidłowa rola." });

    if (role === UserRole.PILOT && !crew_member_id) {
      return res.status(400).json({
        error: "bad_request",
        message: "Pilot musi być powiązany z członkiem załogi.",
      });
    }

    try {
      const crewIdToSet = role === UserRole.PILOT ? crew_member_id || null : null;

      let result;
      if (password) {
        const password_hash = await bcryptjs.hash(password, 12);
        result = await pool.query(
          `UPDATE users
           SET first_name = $1, last_name = $2, email = $3, password_hash = $4,
               role = $5, crew_member_id = $6, updated_at = NOW()
           WHERE id = $7
           RETURNING id, first_name, last_name, email, role, crew_member_id, is_active, created_at, updated_at`,
          [first_name, last_name, email, password_hash, role, crewIdToSet, id]
        );
      } else {
        result = await pool.query(
          `UPDATE users
           SET first_name = $1, last_name = $2, email = $3,
               role = $4, crew_member_id = $5, updated_at = NOW()
           WHERE id = $6
           RETURNING id, first_name, last_name, email, role, crew_member_id, is_active, created_at, updated_at`,
          [first_name, last_name, email, role, crewIdToSet, id]
        );
      }

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "not_found", message: "Użytkownik nie istnieje." });
      }
      return res.status(200).json({ user: result.rows[0] });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "conflict",
          message: "Użytkownik z tym adresem email już istnieje.",
        });
      }
      console.error("Update user error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);
