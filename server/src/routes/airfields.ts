import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { requirePermission } from "../middleware/rbac.js";
import { PermissionLevel } from "shared/permissions";

export const airfieldsRouter = Router();

// GET /api/admin/airfields — LAND-03: sorted by name ASC
airfieldsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, latitude, longitude, created_at, updated_at
       FROM airfields
       ORDER BY name ASC`
    );
    return res.status(200).json({ airfields: result.rows });
  } catch (error) {
    console.error("Get airfields error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// GET /api/admin/airfields/:id
airfieldsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
  }
  try {
    const result = await pool.query(
      `SELECT id, name, latitude, longitude, created_at, updated_at
       FROM airfields WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "not_found", message: "Lądowisko nie istnieje." });
    }
    return res.status(200).json({ airfield: result.rows[0] });
  } catch (error) {
    console.error("Get airfield error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// POST /api/admin/airfields — LAND-01
airfieldsRouter.post(
  "/",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const { name, latitude, longitude } = req.body;

    if (!name || latitude == null || longitude == null) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (String(name).length > 200) {
      return res.status(400).json({ error: "bad_request", message: "Nazwa max 200 znaków." });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Szerokość geograficzna: -90 do 90." });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Długość geograficzna: -180 do 180." });
    }

    try {
      const result = await pool.query(
        `INSERT INTO airfields (name, latitude, longitude) VALUES ($1, $2, $3) RETURNING *`,
        [name, lat, lng]
      );
      return res.status(201).json({ airfield: result.rows[0] });
    } catch (error) {
      console.error("Create airfield error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);

// PUT /api/admin/airfields/:id — LAND-02
airfieldsRouter.put(
  "/:id",
  requirePermission("administracja", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    const { name, latitude, longitude } = req.body;

    if (!name || latitude == null || longitude == null) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Uzupełnij wszystkie wymagane pola." });
    }

    if (String(name).length > 200) {
      return res.status(400).json({ error: "bad_request", message: "Nazwa max 200 znaków." });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Szerokość geograficzna: -90 do 90." });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "Długość geograficzna: -180 do 180." });
    }

    try {
      const result = await pool.query(
        `UPDATE airfields SET name = $1, latitude = $2, longitude = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [name, lat, lng, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "not_found", message: "Lądowisko nie istnieje." });
      }
      return res.status(200).json({ airfield: result.rows[0] });
    } catch (error) {
      console.error("Update airfield error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);
