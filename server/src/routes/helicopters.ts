import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { requirePermission } from "../middleware/rbac.js";
import { PermissionLevel } from "shared/permissions";

export const helicoptersRouter = Router();

// GET /api/admin/helicopters — HELI-03: sorted by status DESC then registration_number ASC
helicoptersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, registration_number, type, description, max_crew_count,
              max_crew_payload_kg, status, inspection_expiry_date, range_km,
              created_at, updated_at
       FROM helicopters
       ORDER BY status DESC, registration_number ASC`
    );
    return res.status(200).json({ helicopters: result.rows });
  } catch (error) {
    console.error("Get helicopters error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// GET /api/admin/helicopters/:id
helicoptersRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
  }
  try {
    const result = await pool.query(
      `SELECT id, registration_number, type, description, max_crew_count,
              max_crew_payload_kg, status, inspection_expiry_date, range_km,
              created_at, updated_at
       FROM helicopters WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "not_found", message: "Helikopter nie istnieje." });
    }
    return res.status(200).json({ helicopter: result.rows[0] });
  } catch (error) {
    console.error("Get helicopter error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// POST /api/admin/helicopters — HELI-01
helicoptersRouter.post(
  "/",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const {
      registration_number,
      type,
      description,
      max_crew_count,
      max_crew_payload_kg,
      status,
      inspection_expiry_date,
      range_km,
    } = req.body;

    if (
      !registration_number ||
      !type ||
      max_crew_count == null ||
      max_crew_payload_kg == null ||
      status == null ||
      range_km == null
    ) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (registration_number.length > 30) {
      return res.status(400).json({ error: "bad_request", message: "Numer rejestracyjny max 30 znaków." });
    }
    if (type.length > 100) {
      return res.status(400).json({ error: "bad_request", message: "Typ max 100 znaków." });
    }
    if (description && description.length > 100) {
      return res.status(400).json({ error: "bad_request", message: "Opis max 100 znaków." });
    }

    const crewCount = Number(max_crew_count);
    const payload = Number(max_crew_payload_kg);
    const range = Number(range_km);
    const st = Number(status);

    if (crewCount < 1 || crewCount > 10) {
      return res.status(400).json({ error: "bad_request", message: "Liczba załogi: 1–10." });
    }
    if (payload < 1 || payload > 1000) {
      return res.status(400).json({ error: "bad_request", message: "Ładunek załogi: 1–1000 kg." });
    }
    if (range < 1 || range > 1000) {
      return res.status(400).json({ error: "bad_request", message: "Zasięg: 1–1000 km." });
    }
    if (st !== 0 && st !== 1) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy status." });
    }

    // HELI-01: inspection_expiry_date required when status = 1 (active)
    if (st === 1 && !inspection_expiry_date) {
      return res.status(400).json({
        error: "bad_request",
        message: "Data przeglądu jest wymagana dla aktywnych helikopterów.",
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO helicopters (registration_number, type, description, max_crew_count,
          max_crew_payload_kg, status, inspection_expiry_date, range_km)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          registration_number,
          type,
          description || null,
          crewCount,
          payload,
          st,
          inspection_expiry_date || null,
          range,
        ]
      );
      return res.status(201).json({ helicopter: result.rows[0] });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "conflict",
          message: "Helikopter z tym numerem rejestracyjnym już istnieje.",
        });
      }
      console.error("Create helicopter error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);

// PUT /api/admin/helicopters/:id — HELI-02
helicoptersRouter.put(
  "/:id",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    const {
      registration_number,
      type,
      description,
      max_crew_count,
      max_crew_payload_kg,
      status,
      inspection_expiry_date,
      range_km,
    } = req.body;

    if (
      !registration_number ||
      !type ||
      max_crew_count == null ||
      max_crew_payload_kg == null ||
      status == null ||
      range_km == null
    ) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (registration_number.length > 30) {
      return res.status(400).json({ error: "bad_request", message: "Numer rejestracyjny max 30 znaków." });
    }
    if (type.length > 100) {
      return res.status(400).json({ error: "bad_request", message: "Typ max 100 znaków." });
    }
    if (description && description.length > 100) {
      return res.status(400).json({ error: "bad_request", message: "Opis max 100 znaków." });
    }

    const crewCount = Number(max_crew_count);
    const payload = Number(max_crew_payload_kg);
    const range = Number(range_km);
    const st = Number(status);

    if (crewCount < 1 || crewCount > 10) {
      return res.status(400).json({ error: "bad_request", message: "Liczba załogi: 1–10." });
    }
    if (payload < 1 || payload > 1000) {
      return res.status(400).json({ error: "bad_request", message: "Ładunek załogi: 1–1000 kg." });
    }
    if (range < 1 || range > 1000) {
      return res.status(400).json({ error: "bad_request", message: "Zasięg: 1–1000 km." });
    }
    if (st !== 0 && st !== 1) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy status." });
    }
    if (st === 1 && !inspection_expiry_date) {
      return res.status(400).json({
        error: "bad_request",
        message: "Data przeglądu jest wymagana dla aktywnych helikopterów.",
      });
    }

    try {
      const result = await pool.query(
        `UPDATE helicopters
         SET registration_number = $1, type = $2, description = $3, max_crew_count = $4,
             max_crew_payload_kg = $5, status = $6, inspection_expiry_date = $7,
             range_km = $8, updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          registration_number,
          type,
          description || null,
          crewCount,
          payload,
          st,
          inspection_expiry_date || null,
          range,
          id,
        ]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "not_found", message: "Helikopter nie istnieje." });
      }
      return res.status(200).json({ helicopter: result.rows[0] });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "conflict",
          message: "Helikopter z tym numerem rejestracyjnym już istnieje.",
        });
      }
      console.error("Update helicopter error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);
