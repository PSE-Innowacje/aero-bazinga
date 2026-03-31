import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../db/pool.js";
import { requirePermission } from "../middleware/rbac.js";
import { PermissionLevel } from "shared/permissions";
import { UserRole } from "shared/roles";
import { parseKml } from "../utils/kml.js";
import { totalRouteDistance } from "../utils/haversine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory — relative to project root
const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads/kml");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `kml-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".kml") {
      return cb(new Error("Dozwolone są tylko pliki .kml"));
    }
    cb(null, true);
  },
});

export const operationsRouter = Router();

// ─── Helper: format operation number ─────────────────────────────────────────
function formatOperationNumber(seqVal: number, year: number): string {
  return `${year}-${String(seqVal).padStart(4, "0")}`;
}

// ─── Helper: build full operation object from DB row ─────────────────────────
async function fetchOperationById(
  client: any,
  id: number
): Promise<any | null> {
  const opRes = await client.query(
    `SELECT
       po.id,
       po.operation_number,
       po.project_reference,
       po.short_description,
       po.kml_file_path,
       po.kml_points_json,
       po.route_distance_km,
       po.proposed_earliest_date,
       po.proposed_latest_date,
       po.planned_earliest_date,
       po.planned_latest_date,
       po.additional_info,
       po.post_completion_notes,
       po.status,
       po.created_by_user_id,
       u.email AS created_by_email,
       u.first_name || ' ' || u.last_name AS created_by_name,
       po.created_at,
       po.updated_at
     FROM planned_operations po
     JOIN users u ON u.id = po.created_by_user_id
     WHERE po.id = $1`,
    [id]
  );
  if (opRes.rowCount === 0) return null;
  const op = opRes.rows[0];

  // Fetch operation types
  const typesRes = await client.query(
    `SELECT ot.name
     FROM planned_operation_types pot
     JOIN operation_types ot ON ot.id = pot.operation_type_id
     WHERE pot.operation_id = $1`,
    [id]
  );
  op.operation_types = typesRes.rows.map((r: any) => r.name);

  // Fetch contact persons
  const contactRes = await client.query(
    `SELECT email FROM operation_contact_persons WHERE operation_id = $1`,
    [id]
  );
  op.contact_persons = contactRes.rows.map((r: any) => r.email);

  // Format operation_number as YYYY-NNNN if it's a plain integer
  if (typeof op.operation_number === "number") {
    const year = new Date(op.created_at).getFullYear();
    op.operation_number = formatOperationNumber(op.operation_number, year);
  }

  return op;
}

// ─── Helper: record history entry ────────────────────────────────────────────
async function recordHistory(
  client: any,
  operationId: number,
  userId: number,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO operation_history (operation_id, user_id, field_name, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5)`,
    [operationId, userId, fieldName, oldValue ?? null, newValue ?? null]
  );
}

// ─── GET /api/operations ──────────────────────────────────────────────────────
operationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query["status"];
    let whereClause = "";
    const params: any[] = [];

    if (statusFilter !== undefined && statusFilter !== "") {
      const statusNum = parseInt(statusFilter as string, 10);
      if (!isNaN(statusNum)) {
        whereClause = "WHERE po.status = $1";
        params.push(statusNum);
      }
    }

    const result = await pool.query(
      `SELECT
         po.id,
         po.operation_number,
         po.project_reference,
         po.short_description,
         po.kml_file_path,
         po.route_distance_km,
         po.proposed_earliest_date,
         po.proposed_latest_date,
         po.planned_earliest_date,
         po.planned_latest_date,
         po.additional_info,
         po.post_completion_notes,
         po.status,
         po.created_by_user_id,
         u.email AS created_by_email,
         po.created_at,
         po.updated_at,
         COALESCE(
           (SELECT array_agg(ot.name ORDER BY ot.name)
            FROM planned_operation_types pot
            JOIN operation_types ot ON ot.id = pot.operation_type_id
            WHERE pot.operation_id = po.id),
           '{}'
         ) AS operation_types,
         COALESCE(
           (SELECT array_agg(ocp.email)
            FROM operation_contact_persons ocp
            WHERE ocp.operation_id = po.id),
           '{}'
         ) AS contact_persons
       FROM planned_operations po
       JOIN users u ON u.id = po.created_by_user_id
       ${whereClause}
       ORDER BY po.planned_earliest_date ASC NULLS LAST, po.created_at ASC`,
      params
    );

    const operations = result.rows.map((op: any) => {
      if (typeof op.operation_number === "number") {
        const year = new Date(op.created_at).getFullYear();
        op.operation_number = formatOperationNumber(op.operation_number, year);
      }
      return op;
    });

    return res.status(200).json({ operations });
  } catch (error) {
    console.error("Get operations error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// ─── GET /api/operations/:id ──────────────────────────────────────────────────
operationsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
  }

  try {
    const client = await pool.connect();
    try {
      const op = await fetchOperationById(client, id);
      if (!op) {
        return res.status(404).json({ error: "not_found", message: "Operacja nie istnieje." });
      }

      // Also fetch linked flight orders (OPS-06c)
      const flightOrdersRes = await client.query(
        `SELECT fo.id, fo.order_number, fo.planned_start_datetime, fo.planned_end_datetime, fo.status
         FROM flight_order_operations foo
         JOIN flight_orders fo ON fo.id = foo.flight_order_id
         WHERE foo.operation_id = $1
         ORDER BY fo.planned_start_datetime ASC`,
        [id]
      );
      op.flight_orders = flightOrdersRes.rows;

      return res.status(200).json({ operation: op });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get operation error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// ─── GET /api/operations/types — list operation type dictionary ──────────────
operationsRouter.get("/types/list", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name FROM operation_types ORDER BY name ASC`
    );
    return res.status(200).json({ types: result.rows });
  } catch (error) {
    console.error("Get operation types error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});

// ─── POST /api/operations — create operation ──────────────────────────────────
operationsRouter.post(
  "/",
  requirePermission("planowanie_operacji", PermissionLevel.CRUD),
  upload.single("kml_file"),
  async (req: Request, res: Response) => {
    const role = req.session.role as UserRole;

    // Only planner and supervisor can create operations (admin + pilot have READ)
    if (role !== UserRole.PLANNER && role !== UserRole.SUPERVISOR) {
      // Clean up uploaded file
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "forbidden", message: "Brak uprawnień do tworzenia operacji." });
    }

    const {
      project_reference,
      short_description,
      operation_type_ids,
      proposed_earliest_date,
      proposed_latest_date,
      additional_info,
      contact_emails,
    } = req.body;

    if (!project_reference || !short_description) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "bad_request",
        message: "Uzupełnij numer projektu i krótki opis.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "bad_request",
        message: "Plik KML jest wymagany.",
      });
    }

    // Parse operation_type_ids from body (may be JSON string or array)
    let typeIds: number[] = [];
    try {
      if (typeof operation_type_ids === "string") {
        typeIds = JSON.parse(operation_type_ids);
      } else if (Array.isArray(operation_type_ids)) {
        typeIds = operation_type_ids.map(Number);
      }
    } catch {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe typy operacji." });
    }

    if (!Array.isArray(typeIds) || typeIds.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "bad_request",
        message: "Wybierz co najmniej jeden typ operacji.",
      });
    }

    // Parse contact emails
    let emails: string[] = [];
    try {
      if (typeof contact_emails === "string") {
        const parsed = JSON.parse(contact_emails);
        emails = Array.isArray(parsed) ? parsed : [];
      } else if (Array.isArray(contact_emails)) {
        emails = contact_emails;
      }
    } catch {
      emails = [];
    }

    // Parse KML
    const kmlContent = fs.readFileSync(req.file.path, "utf-8");
    const kmlResult = parseKml(kmlContent);
    if (kmlResult.error) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "bad_request",
        message: kmlResult.error,
      });
    }

    const routeDistance = totalRouteDistance(kmlResult.points);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get next sequence value
      const seqRes = await client.query(`SELECT nextval('operation_number_seq') AS seq`);
      const seqVal = parseInt(seqRes.rows[0].seq, 10);
      const year = new Date().getFullYear();

      const insertRes = await client.query(
        `INSERT INTO planned_operations
           (operation_number, project_reference, short_description, kml_file_path, kml_points_json,
            route_distance_km, proposed_earliest_date, proposed_latest_date, additional_info,
            status, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10)
         RETURNING id, created_at`,
        [
          seqVal,
          project_reference.trim(),
          short_description.trim(),
          req.file.path,
          JSON.stringify(kmlResult.points),
          routeDistance,
          proposed_earliest_date || null,
          proposed_latest_date || null,
          additional_info?.trim() || null,
          req.session.userId,
        ]
      );

      const opId = insertRes.rows[0].id;

      // Insert operation types
      for (const tid of typeIds) {
        await client.query(
          `INSERT INTO planned_operation_types (operation_id, operation_type_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [opId, tid]
        );
      }

      // Insert contact persons
      for (const email of emails) {
        const trimmed = email.trim();
        if (trimmed) {
          await client.query(
            `INSERT INTO operation_contact_persons (operation_id, email) VALUES ($1, $2)`,
            [opId, trimmed]
          );
        }
      }

      // Record creation in history
      await recordHistory(
        client,
        opId,
        req.session.userId!,
        "created",
        null,
        "Operacja utworzona"
      );

      await client.query("COMMIT");

      const op = await fetchOperationById(pool, opId);
      return res.status(201).json({ operation: op });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create operation error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    } finally {
      client.release();
    }
  }
);

// ─── PUT /api/operations/:id — update operation ───────────────────────────────
operationsRouter.put(
  "/:id",
  requirePermission("planowanie_operacji", PermissionLevel.CRUD),
  upload.single("kml_file"),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    const role = req.session.role as UserRole;
    const userId = req.session.userId!;

    const client = await pool.connect();
    try {
      // Fetch current operation
      const existing = await fetchOperationById(client, id);
      if (!existing) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "not_found", message: "Operacja nie istnieje." });
      }

      // Planner can only edit in statuses 1, 2, 3, 4, 5
      if (role === UserRole.PLANNER) {
        const editableStatuses = [1, 2, 3, 4, 5];
        if (!editableStatuses.includes(existing.status)) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(403).json({
            error: "forbidden",
            message: "Nie możesz edytować operacji o tym statusie.",
          });
        }
      }

      const body = req.body;

      // Parse operation_type_ids
      let typeIds: number[] | null = null;
      if (body.operation_type_ids !== undefined) {
        try {
          if (typeof body.operation_type_ids === "string") {
            typeIds = JSON.parse(body.operation_type_ids);
          } else if (Array.isArray(body.operation_type_ids)) {
            typeIds = body.operation_type_ids.map(Number);
          }
        } catch {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe typy operacji." });
        }
      }

      // Parse contact emails
      let emails: string[] | null = null;
      if (body.contact_emails !== undefined) {
        try {
          if (typeof body.contact_emails === "string") {
            const parsed = JSON.parse(body.contact_emails);
            emails = Array.isArray(parsed) ? parsed : [];
          } else if (Array.isArray(body.contact_emails)) {
            emails = body.contact_emails;
          }
        } catch {
          emails = [];
        }
      }

      // Fields planner is NOT allowed to modify
      const plannerRestrictedFields = [
        "planned_earliest_date",
        "planned_latest_date",
        "status",
        "route_distance_km",
        "kml_file_path",
        "post_completion_notes",
      ];

      if (role === UserRole.PLANNER) {
        for (const field of plannerRestrictedFields) {
          if (body[field] !== undefined) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({
              error: "forbidden",
              message: `Brak uprawnień do edycji pola: ${field}.`,
            });
          }
        }
        // Planner also cannot re-upload KML if status field restriction applies
        // KML re-upload is allowed by planner (just re-parses route; planned dates aren't in the file)
      }

      await client.query("BEGIN");

      const historyEntries: Array<{ field: string; old: string | null; new: string | null }> = [];

      // Build update fields
      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let paramIdx = 1;

      function addField(col: string, newVal: any, displayOld: string | null) {
        const oldVal = existing[col];
        const oldStr = oldVal != null ? String(oldVal) : null;
        const newStr = newVal != null ? String(newVal) : null;
        if (oldStr !== newStr) {
          updateFields.push(`${col} = $${paramIdx++}`);
          updateParams.push(newVal);
          historyEntries.push({ field: col, old: oldStr, new: newStr });
        } else {
          // Still include in update params even if unchanged? No — only changed fields.
          // But we need to track them in update query. Only update if changed.
        }
      }

      if (body.project_reference !== undefined) {
        addField("project_reference", body.project_reference.trim(), null);
      }
      if (body.short_description !== undefined) {
        addField("short_description", body.short_description.trim(), null);
      }
      if (body.proposed_earliest_date !== undefined) {
        addField("proposed_earliest_date", body.proposed_earliest_date || null, null);
      }
      if (body.proposed_latest_date !== undefined) {
        addField("proposed_latest_date", body.proposed_latest_date || null, null);
      }
      if (body.additional_info !== undefined) {
        addField("additional_info", body.additional_info?.trim() || null, null);
      }

      // Supervisor-only fields
      if (role === UserRole.SUPERVISOR) {
        if (body.planned_earliest_date !== undefined) {
          addField("planned_earliest_date", body.planned_earliest_date || null, null);
        }
        if (body.planned_latest_date !== undefined) {
          addField("planned_latest_date", body.planned_latest_date || null, null);
        }
        if (body.post_completion_notes !== undefined) {
          // Only editable when status >= 5
          if (existing.status >= 5) {
            addField("post_completion_notes", body.post_completion_notes?.trim() || null, null);
          }
        }
      }

      // KML re-upload
      if (req.file) {
        const kmlContent = fs.readFileSync(req.file.path, "utf-8");
        const kmlResult = parseKml(kmlContent);
        if (kmlResult.error) {
          await client.query("ROLLBACK");
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "bad_request", message: kmlResult.error });
        }
        const routeDistance = totalRouteDistance(kmlResult.points);

        // Delete old KML file if different
        if (existing.kml_file_path && existing.kml_file_path !== req.file.path) {
          try { fs.unlinkSync(existing.kml_file_path); } catch { /* ignore */ }
        }

        updateFields.push(`kml_file_path = $${paramIdx++}`);
        updateParams.push(req.file.path);
        historyEntries.push({ field: "kml_file_path", old: "previous file", new: "updated file" });

        updateFields.push(`kml_points_json = $${paramIdx++}`);
        updateParams.push(JSON.stringify(kmlResult.points));

        updateFields.push(`route_distance_km = $${paramIdx++}`);
        updateParams.push(routeDistance);
        historyEntries.push({
          field: "route_distance_km",
          old: existing.route_distance_km != null ? String(existing.route_distance_km) : null,
          new: String(routeDistance),
        });
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        updateParams.push(id);
        await client.query(
          `UPDATE planned_operations SET ${updateFields.join(", ")} WHERE id = $${paramIdx}`,
          updateParams
        );
      }

      // Update operation types if provided
      if (typeIds !== null) {
        const oldTypesRes = await client.query(
          `SELECT ot.name FROM planned_operation_types pot JOIN operation_types ot ON ot.id = pot.operation_type_id WHERE pot.operation_id = $1`,
          [id]
        );
        const oldTypes = oldTypesRes.rows.map((r: any) => r.name).sort().join(", ");

        await client.query(`DELETE FROM planned_operation_types WHERE operation_id = $1`, [id]);
        for (const tid of typeIds) {
          await client.query(
            `INSERT INTO planned_operation_types (operation_id, operation_type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, tid]
          );
        }

        const newTypesRes = await client.query(
          `SELECT ot.name FROM planned_operation_types pot JOIN operation_types ot ON ot.id = pot.operation_type_id WHERE pot.operation_id = $1`,
          [id]
        );
        const newTypes = newTypesRes.rows.map((r: any) => r.name).sort().join(", ");
        if (oldTypes !== newTypes) {
          historyEntries.push({ field: "operation_types", old: oldTypes, new: newTypes });
        }
      }

      // Update contact persons if provided
      if (emails !== null) {
        const oldContactsRes = await client.query(
          `SELECT email FROM operation_contact_persons WHERE operation_id = $1`,
          [id]
        );
        const oldContacts = oldContactsRes.rows.map((r: any) => r.email).sort().join(", ");

        await client.query(`DELETE FROM operation_contact_persons WHERE operation_id = $1`, [id]);
        for (const email of emails) {
          const trimmed = email.trim();
          if (trimmed) {
            await client.query(
              `INSERT INTO operation_contact_persons (operation_id, email) VALUES ($1, $2)`,
              [id, trimmed]
            );
          }
        }

        const newContacts = emails.map((e: string) => e.trim()).filter(Boolean).sort().join(", ");
        if (oldContacts !== newContacts) {
          historyEntries.push({ field: "contact_persons", old: oldContacts || null, new: newContacts || null });
        }
      }

      // Record all history entries
      for (const entry of historyEntries) {
        await recordHistory(client, id, userId, entry.field, entry.old, entry.new);
      }

      await client.query("COMMIT");

      const updated = await fetchOperationById(pool, id);
      return res.status(200).json({ operation: updated });
    } catch (error) {
      await client.query("ROLLBACK");
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      console.error("Update operation error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/operations/:id/status — status transition ─────────────────────
operationsRouter.post(
  "/:id/status",
  requirePermission("planowanie_operacji", PermissionLevel.READ),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    const role = req.session.role as UserRole;
    const userId = req.session.userId!;
    const { to_status, reason } = req.body;

    if (to_status == null) {
      return res.status(400).json({ error: "bad_request", message: "Pole to_status jest wymagane." });
    }

    const toStatus = parseInt(String(to_status), 10);
    if (isNaN(toStatus)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy status." });
    }

    const client = await pool.connect();
    try {
      const existing = await fetchOperationById(client, id);
      if (!existing) {
        return res.status(404).json({ error: "not_found", message: "Operacja nie istnieje." });
      }

      const fromStatus: number = existing.status;

      // Define allowed transitions: [from, to, allowedRoles]
      type TransitionRule = {
        from: number;
        to: number;
        roles: UserRole[];
        prereq?: (op: any) => string | null; // returns error message or null
        ownOnly?: boolean; // planner can only cancel their own
      };

      const TRANSITIONS: TransitionRule[] = [
        {
          // Supervisor: reject (1 → 2)
          from: 1, to: 2,
          roles: [UserRole.SUPERVISOR],
        },
        {
          // Supervisor: confirm (1 → 3) — requires planned dates
          from: 1, to: 3,
          roles: [UserRole.SUPERVISOR],
          prereq: (op) => {
            if (!op.planned_earliest_date || !op.planned_latest_date) {
              return "Potwierdzenie wymaga wypełnienia planowanych dat (najwcześniejszej i najpóźniejszej).";
            }
            return null;
          },
        },
        {
          // Planner or Supervisor: cancel from status 1
          from: 1, to: 7,
          roles: [UserRole.PLANNER, UserRole.SUPERVISOR],
          ownOnly: true,
        },
        {
          // Planner or Supervisor: cancel from status 3
          from: 3, to: 7,
          roles: [UserRole.PLANNER, UserRole.SUPERVISOR],
          ownOnly: true,
        },
        {
          // Planner or Supervisor: cancel from status 4
          from: 4, to: 7,
          roles: [UserRole.PLANNER, UserRole.SUPERVISOR],
          ownOnly: true,
        },
      ];

      const rule = TRANSITIONS.find((t) => t.from === fromStatus && t.to === toStatus);

      if (!rule) {
        return res.status(400).json({
          error: "bad_request",
          message: `Przejście ze statusu ${fromStatus} do ${toStatus} jest niedozwolone.`,
        });
      }

      if (!rule.roles.includes(role)) {
        return res.status(403).json({
          error: "forbidden",
          message: "Brak uprawnień do tej zmiany statusu.",
        });
      }

      // Planner "ownOnly" check — planner can only cancel their own operations
      if (role === UserRole.PLANNER && rule.ownOnly) {
        if (existing.created_by_user_id !== userId) {
          return res.status(403).json({
            error: "forbidden",
            message: "Możesz anulować tylko własne operacje.",
          });
        }
      }

      // Prerequisite check
      if (rule.prereq) {
        const prereqError = rule.prereq(existing);
        if (prereqError) {
          return res.status(400).json({ error: "bad_request", message: prereqError });
        }
      }

      await client.query("BEGIN");

      await client.query(
        `UPDATE planned_operations SET status = $1, updated_at = NOW() WHERE id = $2`,
        [toStatus, id]
      );

      // Status labels for history
      const STATUS_LABELS: Record<number, string> = {
        1: "Wprowadzone",
        2: "Odrzucone",
        3: "Potwierdzone do planu",
        4: "Zaplanowane do zlecenia",
        5: "Częściowo zrealizowane",
        6: "Zrealizowane",
        7: "Rezygnacja",
      };

      await recordHistory(
        client,
        id,
        userId,
        "status",
        STATUS_LABELS[fromStatus] ?? String(fromStatus),
        STATUS_LABELS[toStatus] ?? String(toStatus)
      );

      if (reason && String(reason).trim()) {
        await recordHistory(
          client,
          id,
          userId,
          "status_reason",
          null,
          String(reason).trim()
        );
      }

      await client.query("COMMIT");

      const updated = await fetchOperationById(pool, id);
      return res.status(200).json({ operation: updated });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Status transition error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    } finally {
      client.release();
    }
  }
);

// ─── GET /api/operations/:id/comments ────────────────────────────────────────
operationsRouter.get(
  "/:id/comments",
  requirePermission("planowanie_operacji", PermissionLevel.READ),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    try {
      const result = await pool.query(
        `SELECT
           oc.id,
           oc.operation_id,
           oc.user_id,
           u.email AS author_email,
           u.first_name || ' ' || u.last_name AS author_name,
           oc.comment_text,
           oc.created_at
         FROM operation_comments oc
         JOIN users u ON u.id = oc.user_id
         WHERE oc.operation_id = $1
         ORDER BY oc.created_at ASC`,
        [id]
      );
      return res.status(200).json({ comments: result.rows });
    } catch (error) {
      console.error("Get comments error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);

// ─── POST /api/operations/:id/comments ───────────────────────────────────────
operationsRouter.post(
  "/:id/comments",
  requirePermission("planowanie_operacji", PermissionLevel.READ),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
    }

    const { comment_text } = req.body;
    if (!comment_text || !String(comment_text).trim()) {
      return res.status(400).json({ error: "bad_request", message: "Treść komentarza jest wymagana." });
    }
    if (String(comment_text).trim().length > 500) {
      return res.status(400).json({ error: "bad_request", message: "Komentarz max 500 znaków." });
    }

    try {
      // Verify operation exists
      const opCheck = await pool.query(`SELECT id FROM planned_operations WHERE id = $1`, [id]);
      if (opCheck.rowCount === 0) {
        return res.status(404).json({ error: "not_found", message: "Operacja nie istnieje." });
      }

      const insertRes = await pool.query(
        `INSERT INTO operation_comments (operation_id, user_id, comment_text)
         VALUES ($1, $2, $3)
         RETURNING id, operation_id, user_id, comment_text, created_at`,
        [id, req.session.userId, String(comment_text).trim()]
      );

      const comment = insertRes.rows[0];

      // Join author info
      const userRes = await pool.query(
        `SELECT email, first_name || ' ' || last_name AS author_name FROM users WHERE id = $1`,
        [req.session.userId]
      );
      if (userRes.rowCount && userRes.rowCount > 0) {
        comment.author_email = userRes.rows[0].email;
        comment.author_name = userRes.rows[0].author_name;
      }

      return res.status(201).json({ comment });
    } catch (error) {
      console.error("Create comment error:", error);
      return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
    }
  }
);

// ─── GET /api/operations/:id/history ─────────────────────────────────────────
operationsRouter.get("/:id/history", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "bad_request", message: "Nieprawidłowe ID." });
  }

  try {
    const result = await pool.query(
      `SELECT
         oh.id,
         oh.operation_id,
         oh.user_id,
         u.email AS user_email,
         u.first_name || ' ' || u.last_name AS user_name,
         oh.field_name,
         oh.old_value,
         oh.new_value,
         oh.changed_at
       FROM operation_history oh
       JOIN users u ON u.id = oh.user_id
       WHERE oh.operation_id = $1
       ORDER BY oh.changed_at DESC`,
      [id]
    );
    return res.status(200).json({ history: result.rows });
  } catch (error) {
    console.error("Get operation history error:", error);
    return res.status(500).json({ error: "server_error", message: "Błąd serwera." });
  }
});
