import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { requirePermission } from "../middleware/rbac.js";
import { PermissionLevel } from "shared/permissions";
import { CREW_ROLES } from "shared/crew-roles";

export const crewRouter = Router();

// Email validation per CREW-03:
// letters (a-z A-Z) + digits + . - only before @
// exactly one @
// domain has at least two dot-separated segments
function isValidCrewEmail(email: string): boolean {
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

// GET /api/admin/crew — CREW-04: sorted by email ASC
crewRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, weight_kg, role,
              pilot_license_number, license_expiry_date, training_expiry_date,
              created_at, updated_at
       FROM crew_members
       ORDER BY email ASC`
    );
    return res.status(200).json({ crew: result.rows });
  } catch (error) {
    console.error("Get crew error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// GET /api/admin/crew/:id
crewRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
  }
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, weight_kg, role,
              pilot_license_number, license_expiry_date, training_expiry_date,
              created_at, updated_at
       FROM crew_members WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "not_found", message: "Członek załogi nie istnieje." });
    }
    return res.status(200).json({ crewMember: result.rows[0] });
  } catch (error) {
    console.error("Get crew member error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// POST /api/admin/crew — CREW-01
crewRouter.post(
  "/",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const {
      first_name,
      last_name,
      email,
      weight_kg,
      role,
      pilot_license_number,
      license_expiry_date,
      training_expiry_date,
    } = req.body;

    if (!first_name || !last_name || !email || weight_kg == null || !role || !training_expiry_date) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (first_name.length > 100) {
      return res.status(400).json({ error: "bad_request", message: "Imię max 100 znaków." });
    }
    if (last_name.length > 100) {
      return res.status(400).json({ error: "bad_request", message: "Nazwisko max 100 znaków." });
    }
    if (email.length > 100) {
      return res.status(400).json({ error: "bad_request", message: "Email max 100 znaków." });
    }

    // CREW-03: email validation
    if (!isValidCrewEmail(email)) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Nieprawidłowy format adresu email." });
    }

    const weight = Number(weight_kg);
    if (weight < 30 || weight > 200) {
      return res.status(400).json({ error: "bad_request", message: "Waga: 30–200 kg." });
    }

    if (!(CREW_ROLES as readonly string[]).includes(role)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowa rola." });
    }

    // CREW-01: pilot-conditional fields
    if (role === "Pilot") {
      if (!pilot_license_number) {
        return res
          .status(400)
          .json({ error: "bad_request", message: "Numer licencji jest wymagany dla Pilota." });
      }
      if (pilot_license_number.length > 30) {
        return res
          .status(400)
          .json({ error: "bad_request", message: "Numer licencji max 30 znaków." });
      }
      if (!license_expiry_date) {
        return res.status(400).json({
          error: "bad_request",
          message: "Data ważności licencji jest wymagana dla Pilota.",
        });
      }
    }

    try {
      const result = await pool.query(
        `INSERT INTO crew_members (first_name, last_name, email, weight_kg, role,
          pilot_license_number, license_expiry_date, training_expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          first_name,
          last_name,
          email,
          weight,
          role,
          role === "Pilot" ? pilot_license_number || null : null,
          role === "Pilot" ? license_expiry_date || null : null,
          training_expiry_date,
        ]
      );
      return res.status(201).json({ crewMember: result.rows[0] });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "conflict",
          message: "Członek załogi z tym adresem email już istnieje.",
        });
      }
      console.error("Create crew member error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);

// PUT /api/admin/crew/:id — CREW-02
crewRouter.put(
  "/:id",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    const {
      first_name,
      last_name,
      email,
      weight_kg,
      role,
      pilot_license_number,
      license_expiry_date,
      training_expiry_date,
    } = req.body;

    if (!first_name || !last_name || !email || weight_kg == null || !role || !training_expiry_date) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (first_name.length > 100) return res.status(400).json({ error: "bad_request", message: "Imię max 100 znaków." });
    if (last_name.length > 100) return res.status(400).json({ error: "bad_request", message: "Nazwisko max 100 znaków." });
    if (email.length > 100) return res.status(400).json({ error: "bad_request", message: "Email max 100 znaków." });
    if (!isValidCrewEmail(email)) return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy format adresu email." });

    const weight = Number(weight_kg);
    if (weight < 30 || weight > 200) return res.status(400).json({ error: "bad_request", message: "Waga: 30–200 kg." });
    if (!(CREW_ROLES as readonly string[]).includes(role)) return res.status(400).json({ error: "bad_request", message: "Nieprawidłowa rola." });

    if (role === "Pilot") {
      if (!pilot_license_number) return res.status(400).json({ error: "bad_request", message: "Numer licencji jest wymagany dla Pilota." });
      if (pilot_license_number.length > 30) return res.status(400).json({ error: "bad_request", message: "Numer licencji max 30 znaków." });
      if (!license_expiry_date) return res.status(400).json({ error: "bad_request", message: "Data ważności licencji jest wymagana dla Pilota." });
    }

    try {
      const result = await pool.query(
        `UPDATE crew_members
         SET first_name = $1, last_name = $2, email = $3, weight_kg = $4, role = $5,
             pilot_license_number = $6, license_expiry_date = $7,
             training_expiry_date = $8, updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          first_name,
          last_name,
          email,
          weight,
          role,
          role === "Pilot" ? pilot_license_number || null : null,
          role === "Pilot" ? license_expiry_date || null : null,
          training_expiry_date,
          id,
        ]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "not_found", message: "Członek załogi nie istnieje." });
      }
      return res.status(200).json({ crewMember: result.rows[0] });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "conflict",
          message: "Członek załogi z tym adresem email już istnieje.",
        });
      }
      console.error("Update crew member error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);
