import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { requirePermission } from "../middleware/rbac.js";
import { PermissionLevel } from "shared/permissions";
import { UserRole } from "shared/roles";
import { FlightOrderStatus } from "shared/statuses";

export const flightOrdersRouter = Router();

// ─── Helper: format order number ────────────────────────────────────────────
function formatOrderNumber(seqVal: number, year: number): string {
  return `NZ-${year}-${String(seqVal).padStart(4, "0")}`;
}

// ─── Helper: fetch full flight order by ID ──────────────────────────────────
async function fetchFlightOrderById(
  client: any,
  id: number
): Promise<any | null> {
  const foRes = await client.query(
    `SELECT
       fo.id,
       fo.order_number,
       fo.planned_start_datetime,
       fo.planned_end_datetime,
       fo.actual_start_datetime,
       fo.actual_end_datetime,
       fo.pilot_user_id,
       u.first_name || ' ' || u.last_name AS pilot_name,
       u.email AS pilot_email,
       fo.helicopter_id,
       h.registration_number AS helicopter_registration,
       h.type AS helicopter_type,
       fo.start_airfield_id,
       sa.name AS start_airfield_name,
       fo.end_airfield_id,
       ea.name AS end_airfield_name,
       fo.crew_total_weight_kg,
       fo.estimated_route_length_km,
       fo.status,
       fo.created_at,
       fo.updated_at
     FROM flight_orders fo
     JOIN users u ON u.id = fo.pilot_user_id
     JOIN helicopters h ON h.id = fo.helicopter_id
     JOIN airfields sa ON sa.id = fo.start_airfield_id
     JOIN airfields ea ON ea.id = fo.end_airfield_id
     WHERE fo.id = $1`,
    [id]
  );
  if (foRes.rowCount === 0) return null;
  const fo = foRes.rows[0];

  // Format order_number as YYYY-NNNN
  if (typeof fo.order_number === "number") {
    const year = new Date(fo.created_at).getFullYear();
    fo.order_number = formatOrderNumber(fo.order_number, year);
  }

  // Fetch crew members
  const crewRes = await client.query(
    `SELECT cm.id AS crew_member_id, cm.first_name, cm.last_name, cm.email,
            cm.weight_kg, cm.role, cm.training_expiry_date
     FROM flight_order_crew_members focm
     JOIN crew_members cm ON cm.id = focm.crew_member_id
     WHERE focm.flight_order_id = $1
     ORDER BY cm.last_name, cm.first_name`,
    [id]
  );
  fo.crew_members = crewRes.rows;

  // Fetch linked operations
  const opsRes = await client.query(
    `SELECT po.id AS operation_id, po.operation_number, po.short_description,
            po.route_distance_km, po.status, po.kml_points_json, po.created_at
     FROM flight_order_operations foo
     JOIN planned_operations po ON po.id = foo.operation_id
     WHERE foo.flight_order_id = $1
     ORDER BY po.planned_earliest_date ASC NULLS LAST`,
    [id]
  );
  fo.operations = opsRes.rows.map((op: any) => {
    if (typeof op.operation_number === "number") {
      const year = new Date(op.created_at).getFullYear();
      op.operation_number = `NO-${year}-${String(op.operation_number).padStart(4, "0")}`;
    }
    return op;
  });

  return fo;
}

// ─── Helper: run 5 validation rules (FLT-05) ───────────────────────────────
interface ValidationWarning {
  rule: string;
  message: string;
}

async function validateFlightOrder(
  client: any,
  helicopterId: number,
  pilotUserId: number,
  crewMemberIds: number[],
  operationIds: number[],
  plannedStartDatetime: string
): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];
  const flightDate = new Date(plannedStartDatetime);
  const flightDateStr = flightDate.toISOString().substring(0, 10);

  // Get helicopter data
  const heliRes = await client.query(
    `SELECT max_crew_payload_kg, max_crew_count, range_km, inspection_expiry_date
     FROM helicopters WHERE id = $1`,
    [helicopterId]
  );
  if (heliRes.rowCount === 0) return warnings;
  const heli = heliRes.rows[0];

  // Get pilot's crew member data
  const pilotUserRes = await client.query(
    `SELECT u.crew_member_id FROM users u WHERE u.id = $1`,
    [pilotUserId]
  );
  let pilotWeight = 0;
  if (pilotUserRes.rowCount > 0 && pilotUserRes.rows[0].crew_member_id) {
    const pilotCmRes = await client.query(
      `SELECT weight_kg, license_expiry_date FROM crew_members WHERE id = $1`,
      [pilotUserRes.rows[0].crew_member_id]
    );
    if (pilotCmRes.rowCount && pilotCmRes.rowCount > 0) {
      pilotWeight = pilotCmRes.rows[0].weight_kg;

      // Rule 5: Pilot license_expiry_date must be in the future
      const licenseExpiry = pilotCmRes.rows[0].license_expiry_date;
      if (licenseExpiry && new Date(licenseExpiry) < flightDate) {
        warnings.push({
          rule: "pilot_license_expired",
          message: `Licencja pilota wygasła (${licenseExpiry}). Data lotu: ${flightDateStr}.`,
        });
      }
    }
  }

  // Get crew members data
  let crewWeight = 0;
  const crewCount = crewMemberIds.length + 1; // +1 for pilot

  if (crewMemberIds.length > 0) {
    const crewRes = await client.query(
      `SELECT id, weight_kg, training_expiry_date FROM crew_members WHERE id = ANY($1)`,
      [crewMemberIds]
    );
    for (const cm of crewRes.rows) {
      crewWeight += cm.weight_kg;

      // Rule 4: Crew member training_expiry_date must be in the future
      if (cm.training_expiry_date && new Date(cm.training_expiry_date) < flightDate) {
        warnings.push({
          rule: "crew_training_expired",
          message: `Szkolenie członka załogi (ID: ${cm.id}) wygasło (${cm.training_expiry_date}). Data lotu: ${flightDateStr}.`,
        });
      }
    }
  }

  const totalWeight = pilotWeight + crewWeight;

  // Rule 1: Crew total weight must not exceed helicopter max_crew_payload_kg
  if (totalWeight > heli.max_crew_payload_kg) {
    warnings.push({
      rule: "weight_exceeded",
      message: `Łączna waga załogi (${totalWeight} kg) przekracza maksymalne obciążenie helikoptera (${heli.max_crew_payload_kg} kg).`,
    });
  }

  // Rule 2: Crew count must not exceed helicopter max_crew_count
  if (crewCount > heli.max_crew_count) {
    warnings.push({
      rule: "crew_count_exceeded",
      message: `Liczba załogi (${crewCount}) przekracza maksymalną liczbę miejsc (${heli.max_crew_count}).`,
    });
  }

  // Calculate estimated route length from operations
  let estimatedRouteLength = 0;
  if (operationIds.length > 0) {
    const opsRes = await client.query(
      `SELECT COALESCE(SUM(route_distance_km), 0) AS total_km
       FROM planned_operations WHERE id = ANY($1)`,
      [operationIds]
    );
    estimatedRouteLength = parseFloat(opsRes.rows[0].total_km) || 0;
  }

  // Rule 3: Estimated route length must not exceed helicopter range_km
  if (estimatedRouteLength > heli.range_km) {
    warnings.push({
      rule: "range_exceeded",
      message: `Szacowana długość trasy (${estimatedRouteLength.toFixed(2)} km) przekracza zasięg helikoptera (${heli.range_km} km).`,
    });
  }

  // Rule: Helicopter inspection expired on flight date (FLT-05 extended)
  if (heli.inspection_expiry_date && new Date(heli.inspection_expiry_date) < flightDate) {
    warnings.push({
      rule: "helicopter_inspection_expired",
      message: `Przegląd helikoptera wygasł (${heli.inspection_expiry_date}). Data lotu: ${flightDateStr}.`,
    });
  }

  return warnings;
}

// ─── GET /api/flight-orders ─────────────────────────────────────────────────
flightOrdersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query["status"];
    let whereClause = "";
    const params: any[] = [];

    if (statusFilter !== undefined && statusFilter !== "") {
      const statusNum = parseInt(statusFilter as string, 10);
      if (!isNaN(statusNum)) {
        whereClause = "WHERE fo.status = $1";
        params.push(statusNum);
      }
    }

    const result = await pool.query(
      `SELECT
         fo.id,
         fo.order_number,
         fo.planned_start_datetime,
         fo.planned_end_datetime,
         fo.actual_start_datetime,
         fo.actual_end_datetime,
         fo.pilot_user_id,
         u.first_name || ' ' || u.last_name AS pilot_name,
         u.email AS pilot_email,
         fo.helicopter_id,
         h.registration_number AS helicopter_registration,
         h.type AS helicopter_type,
         fo.start_airfield_id,
         fo.end_airfield_id,
         fo.crew_total_weight_kg,
         fo.estimated_route_length_km,
         fo.status,
         fo.created_at,
         fo.updated_at
       FROM flight_orders fo
       JOIN users u ON u.id = fo.pilot_user_id
       JOIN helicopters h ON h.id = fo.helicopter_id
       ${whereClause}
       ORDER BY fo.planned_start_datetime ASC, fo.created_at ASC`,
      params
    );

    const orders = result.rows.map((fo: any) => {
      if (typeof fo.order_number === "number") {
        const year = new Date(fo.created_at).getFullYear();
        fo.order_number = formatOrderNumber(fo.order_number, year);
      }
      return fo;
    });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Get flight orders error:", error);
    return res.status(500).json({ error: "server_error", message: "Blad serwera." });
  }
});

// ─── GET /api/flight-orders/airfields — list airfields for flight order forms ─
flightOrdersRouter.get("/airfields/list", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, latitude, longitude FROM airfields ORDER BY name ASC`
    );
    return res.status(200).json({ airfields: result.rows });
  } catch (error) {
    console.error("Get airfields for flight orders error:", error);
    return res.status(500).json({ error: "server_error", message: "Blad serwera." });
  }
});

// ─── GET /api/flight-orders/helicopters — active helicopters for selection ───
flightOrdersRouter.get("/helicopters/list", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, registration_number, type, max_crew_count, max_crew_payload_kg,
              range_km, inspection_expiry_date
       FROM helicopters WHERE status = 1
       ORDER BY registration_number ASC`
    );
    return res.status(200).json({ helicopters: result.rows });
  } catch (error) {
    console.error("Get helicopters for flight orders error:", error);
    return res.status(500).json({ error: "server_error", message: "Blad serwera." });
  }
});

// ─── GET /api/flight-orders/crew — crew members for selection ────────────────
flightOrdersRouter.get("/crew/list", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, weight_kg, role, training_expiry_date
       FROM crew_members ORDER BY last_name, first_name ASC`
    );
    return res.status(200).json({ crew: result.rows });
  } catch (error) {
    console.error("Get crew for flight orders error:", error);
    return res.status(500).json({ error: "server_error", message: "Blad serwera." });
  }
});

// ─── GET /api/flight-orders/:id ─────────────────────────────────────────────
flightOrdersRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "bad_request", message: "Nieprawidlowe ID." });
  }

  try {
    const client = await pool.connect();
    try {
      const fo = await fetchFlightOrderById(client, id);
      if (!fo) {
        return res.status(404).json({ error: "not_found", message: "Zlecenie na lot nie istnieje." });
      }
      return res.status(200).json({ order: fo });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get flight order error:", error);
    return res.status(500).json({ error: "server_error", message: "Blad serwera." });
  }
});

// ─── POST /api/flight-orders — create flight order (Pilot only) ─────────────
flightOrdersRouter.post(
  "/",
  requirePermission("zlecenia_na_lot", PermissionLevel.CRUD),
  async (req: Request, res: Response) => {
    const role = req.session.role as UserRole;

    // Only pilot can create (FLT-01)
    if (role !== UserRole.PILOT && role !== UserRole.SUPERADMIN) {
      return res.status(403).json({
        error: "forbidden",
        message: "Tylko pilot moze tworzyc zlecenia na lot.",
      });
    }

    const {
      planned_start_datetime,
      planned_end_datetime,
      helicopter_id,
      start_airfield_id,
      end_airfield_id,
      crew_member_ids,
      operation_ids,
    } = req.body;

    // Basic validation
    if (!planned_start_datetime || !planned_end_datetime) {
      return res.status(400).json({
        error: "bad_request",
        message: "Planowana data rozpoczecia i zakonczenia sa wymagane.",
      });
    }
    if (!helicopter_id) {
      return res.status(400).json({
        error: "bad_request",
        message: "Helikopter jest wymagany.",
      });
    }
    if (!start_airfield_id || !end_airfield_id) {
      return res.status(400).json({
        error: "bad_request",
        message: "Lotnisko startowe i docelowe sa wymagane.",
      });
    }

    const heliId = parseInt(String(helicopter_id), 10);
    const startAirfieldId = parseInt(String(start_airfield_id), 10);
    const endAirfieldId = parseInt(String(end_airfield_id), 10);

    // Parse arrays (safe JSON.parse)
    let crewIds: number[] = [];
    if (crew_member_ids) {
      try {
        crewIds = Array.isArray(crew_member_ids)
          ? crew_member_ids.map(Number)
          : typeof crew_member_ids === "string"
            ? JSON.parse(crew_member_ids).map(Number)
            : [];
      } catch {
        return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy format listy członków załogi." });
      }
    }

    let opIds: number[] = [];
    if (operation_ids) {
      try {
        opIds = Array.isArray(operation_ids)
          ? operation_ids.map(Number)
          : typeof operation_ids === "string"
            ? JSON.parse(operation_ids).map(Number)
            : [];
      } catch {
        return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy format listy operacji." });
      }
    }

    // Verify helicopter is active
    const heliCheck = await pool.query(
      `SELECT id, status FROM helicopters WHERE id = $1`,
      [heliId]
    );
    if (heliCheck.rowCount === 0) {
      return res.status(400).json({ error: "bad_request", message: "Helikopter nie istnieje." });
    }
    if (heliCheck.rows[0].status !== 1) {
      return res.status(400).json({ error: "bad_request", message: "Helikopter jest nieaktywny." });
    }

    // Verify operations are status 3 (FLT-01: status 3 only)
    if (opIds.length > 0) {
      const opsCheck = await pool.query(
        `SELECT id, status FROM planned_operations WHERE id = ANY($1)`,
        [opIds]
      );
      for (const op of opsCheck.rows) {
        if (op.status !== 3) {
          return res.status(400).json({
            error: "bad_request",
            message: `Operacja ${op.id} nie ma statusu "Potwierdzone do planu" (status 3). Obecny status: ${op.status}.`,
          });
        }
      }
      if (opsCheck.rowCount !== opIds.length) {
        return res.status(400).json({
          error: "bad_request",
          message: "Jedna lub wiecej operacji nie istnieje.",
        });
      }
    }

    const client = await pool.connect();
    try {
      // Auto-fill pilot_user_id from session (FLT-01)
      const pilotUserId = req.session.userId!;

      // Run validation (FLT-05)
      const warnings = await validateFlightOrder(
        client,
        heliId,
        pilotUserId,
        crewIds,
        opIds,
        planned_start_datetime
      );

      if (warnings.length > 0) {
        return res.status(422).json({
          error: "validation_warnings",
          message: "Zlecenie nie spelnia wymagan walidacji.",
          warnings,
        });
      }

      // Calculate crew weight (FLT-02)
      let pilotWeight = 0;
      const pilotCmRes = await client.query(
        `SELECT cm.weight_kg FROM users u
         JOIN crew_members cm ON cm.id = u.crew_member_id
         WHERE u.id = $1`,
        [pilotUserId]
      );
      if (pilotCmRes.rowCount && pilotCmRes.rowCount > 0) {
        pilotWeight = pilotCmRes.rows[0].weight_kg;
      }

      let crewWeight = 0;
      if (crewIds.length > 0) {
        const cwRes = await client.query(
          `SELECT COALESCE(SUM(weight_kg), 0) AS total FROM crew_members WHERE id = ANY($1)`,
          [crewIds]
        );
        crewWeight = parseInt(cwRes.rows[0].total, 10) || 0;
      }
      const totalWeight = pilotWeight + crewWeight;

      // Calculate route length (FLT-03)
      let routeLength = 0;
      if (opIds.length > 0) {
        const rlRes = await client.query(
          `SELECT COALESCE(SUM(route_distance_km), 0) AS total_km
           FROM planned_operations WHERE id = ANY($1)`,
          [opIds]
        );
        routeLength = parseFloat(rlRes.rows[0].total_km) || 0;
      }

      await client.query("BEGIN");

      // Get next sequence value
      const seqRes = await client.query(`SELECT nextval('order_number_seq') AS seq`);
      const seqVal = parseInt(seqRes.rows[0].seq, 10);

      const insertRes = await client.query(
        `INSERT INTO flight_orders
           (order_number, planned_start_datetime, planned_end_datetime,
            pilot_user_id, helicopter_id, start_airfield_id, end_airfield_id,
            crew_total_weight_kg, estimated_route_length_km, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
         RETURNING id`,
        [
          seqVal,
          planned_start_datetime,
          planned_end_datetime,
          pilotUserId,
          heliId,
          startAirfieldId,
          endAirfieldId,
          totalWeight,
          Math.round(routeLength * 100) / 100,
        ]
      );

      const orderId = insertRes.rows[0].id;

      // Insert crew members
      for (const cmId of crewIds) {
        await client.query(
          `INSERT INTO flight_order_crew_members (flight_order_id, crew_member_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [orderId, cmId]
        );
      }

      // Insert operations and transition status 3 -> 4 (FLT-11 / OPS-09)
      for (const opId of opIds) {
        await client.query(
          `INSERT INTO flight_order_operations (flight_order_id, operation_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [orderId, opId]
        );

        // Transition operation status 3 -> 4
        await client.query(
          `UPDATE planned_operations SET status = 4, updated_at = NOW() WHERE id = $1 AND status = 3`,
          [opId]
        );

        // Record history on the operation
        await client.query(
          `INSERT INTO operation_history (operation_id, user_id, field_name, old_value, new_value)
           VALUES ($1, $2, 'status', 'Potwierdzone do planu', 'Zaplanowane do zlecenia')`,
          [opId, pilotUserId]
        );
      }

      await client.query("COMMIT");

      const order = await fetchFlightOrderById(pool, orderId);
      return res.status(201).json({ order });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create flight order error:", error);
      return res.status(500).json({ error: "server_error", message: "Blad serwera." });
    } finally {
      client.release();
    }
  }
);

// ─── PUT /api/flight-orders/:id — update flight order ───────────────────────
flightOrdersRouter.put(
  "/:id",
  requirePermission("zlecenia_na_lot", PermissionLevel.EDIT_VIEW),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidlowe ID." });
    }

    const role = req.session.role as UserRole;
    const userId = req.session.userId!;

    const client = await pool.connect();
    try {
      const existing = await fetchFlightOrderById(client, id);
      if (!existing) {
        return res.status(404).json({ error: "not_found", message: "Zlecenie na lot nie istnieje." });
      }

      // Pilot can edit in status 1, 3 (rejected -> edit and resubmit)
      // Supervisor can edit in status 2 (for accept/reject), and status 4 (for datetime)
      const pilotEditStatuses = [1, 3];
      const supervisorEditStatuses = [1, 2, 3, 4];

      if (role !== UserRole.SUPERADMIN) {
        if (role === UserRole.PILOT && !pilotEditStatuses.includes(existing.status)) {
          return res.status(403).json({
            error: "forbidden",
            message: "Nie mozesz edytowac zlecenia w tym statusie.",
          });
        }

        if (role === UserRole.SUPERVISOR && !supervisorEditStatuses.includes(existing.status)) {
          return res.status(403).json({
            error: "forbidden",
            message: "Nie mozesz edytowac zlecenia w tym statusie.",
          });
        }
      }

      const body = req.body;
      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let paramIdx = 1;

      function addField(col: string, newVal: any) {
        updateFields.push(`${col} = $${paramIdx++}`);
        updateParams.push(newVal);
      }

      if (body.planned_start_datetime !== undefined) {
        addField("planned_start_datetime", body.planned_start_datetime);
      }
      if (body.planned_end_datetime !== undefined) {
        addField("planned_end_datetime", body.planned_end_datetime);
      }
      if (body.helicopter_id !== undefined) {
        // Verify active
        const hCheck = await client.query(
          `SELECT status FROM helicopters WHERE id = $1`,
          [parseInt(String(body.helicopter_id), 10)]
        );
        if (hCheck.rowCount === 0 || hCheck.rows[0].status !== 1) {
          return res.status(400).json({
            error: "bad_request",
            message: "Helikopter nie istnieje lub jest nieaktywny.",
          });
        }
        addField("helicopter_id", parseInt(String(body.helicopter_id), 10));
      }
      if (body.start_airfield_id !== undefined) {
        addField("start_airfield_id", parseInt(String(body.start_airfield_id), 10));
      }
      if (body.end_airfield_id !== undefined) {
        addField("end_airfield_id", parseInt(String(body.end_airfield_id), 10));
      }
      if (body.actual_start_datetime !== undefined) {
        addField("actual_start_datetime", body.actual_start_datetime || null);
      }
      if (body.actual_end_datetime !== undefined) {
        addField("actual_end_datetime", body.actual_end_datetime || null);
      }

      // Parse crew member IDs (safe JSON.parse)
      let newCrewIds: number[] | null = null;
      if (body.crew_member_ids !== undefined) {
        try {
          newCrewIds = Array.isArray(body.crew_member_ids)
            ? body.crew_member_ids.map(Number)
            : typeof body.crew_member_ids === "string"
              ? JSON.parse(body.crew_member_ids).map(Number)
              : [];
        } catch {
          return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy format listy członków załogi." });
        }
      }

      // Parse operation IDs (safe JSON.parse)
      let newOpIds: number[] | null = null;
      if (body.operation_ids !== undefined) {
        try {
          newOpIds = Array.isArray(body.operation_ids)
            ? body.operation_ids.map(Number)
            : typeof body.operation_ids === "string"
              ? JSON.parse(body.operation_ids).map(Number)
              : [];
        } catch {
          return res.status(400).json({ error: "bad_request", message: "Nieprawidłowy format listy operacji." });
        }

        // Verify new operations are status 3 or already linked (status 4)
        if (newOpIds && newOpIds.length > 0) {
          const existingOpIds = existing.operations.map((o: any) => o.operation_id);
          const opsCheck = await client.query(
            `SELECT id, status FROM planned_operations WHERE id = ANY($1)`,
            [newOpIds]
          );
          for (const op of opsCheck.rows) {
            if (op.status !== 3 && op.status !== 4) {
              return res.status(400).json({
                error: "bad_request",
                message: `Operacja ${op.id} nie ma wymaganego statusu (3 lub 4).`,
              });
            }
            // New operations (not already linked) must be status 3
            if (!existingOpIds.includes(op.id) && op.status !== 3) {
              return res.status(400).json({
                error: "bad_request",
                message: `Nowa operacja ${op.id} musi miec status "Potwierdzone do planu" (3).`,
              });
            }
          }
        }
      }

      // Determine effective values for validation
      const effectiveHeliId = body.helicopter_id
        ? parseInt(String(body.helicopter_id), 10)
        : existing.helicopter_id;
      const effectiveCrewIds = newCrewIds !== null
        ? newCrewIds
        : existing.crew_members.map((cm: any) => cm.crew_member_id);
      const effectiveOpIds = newOpIds !== null
        ? newOpIds
        : existing.operations.map((op: any) => op.operation_id);
      const effectivePilotUserId = existing.pilot_user_id;
      const effectiveStartDatetime = body.planned_start_datetime || existing.planned_start_datetime;

      // Run validation (FLT-05)
      const warnings = await validateFlightOrder(
        client,
        effectiveHeliId,
        effectivePilotUserId,
        effectiveCrewIds,
        effectiveOpIds,
        effectiveStartDatetime
      );

      if (warnings.length > 0) {
        return res.status(422).json({
          error: "validation_warnings",
          message: "Zlecenie nie spelnia wymagan walidacji.",
          warnings,
        });
      }

      // Recalculate crew weight
      let pilotWeight = 0;
      const pilotCmRes = await client.query(
        `SELECT cm.weight_kg FROM users u
         JOIN crew_members cm ON cm.id = u.crew_member_id
         WHERE u.id = $1`,
        [effectivePilotUserId]
      );
      if (pilotCmRes.rowCount && pilotCmRes.rowCount > 0) {
        pilotWeight = pilotCmRes.rows[0].weight_kg;
      }
      let crewWeight = 0;
      if (effectiveCrewIds.length > 0) {
        const cwRes = await client.query(
          `SELECT COALESCE(SUM(weight_kg), 0) AS total FROM crew_members WHERE id = ANY($1)`,
          [effectiveCrewIds]
        );
        crewWeight = parseInt(cwRes.rows[0].total, 10) || 0;
      }
      addField("crew_total_weight_kg", pilotWeight + crewWeight);

      // Recalculate route length
      let routeLength = 0;
      if (effectiveOpIds.length > 0) {
        const rlRes = await client.query(
          `SELECT COALESCE(SUM(route_distance_km), 0) AS total_km
           FROM planned_operations WHERE id = ANY($1)`,
          [effectiveOpIds]
        );
        routeLength = parseFloat(rlRes.rows[0].total_km) || 0;
      }
      addField("estimated_route_length_km", Math.round(routeLength * 100) / 100);

      await client.query("BEGIN");

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        updateParams.push(id);
        await client.query(
          `UPDATE flight_orders SET ${updateFields.join(", ")} WHERE id = $${paramIdx}`,
          updateParams
        );
      }

      // Update crew members if changed
      if (newCrewIds !== null) {
        await client.query(
          `DELETE FROM flight_order_crew_members WHERE flight_order_id = $1`,
          [id]
        );
        for (const cmId of newCrewIds) {
          await client.query(
            `INSERT INTO flight_order_crew_members (flight_order_id, crew_member_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, cmId]
          );
        }
      }

      // Update operations if changed
      if (newOpIds !== null) {
        const oldOpIds = existing.operations.map((o: any) => o.operation_id);
        const removedOps = oldOpIds.filter((oId: number) => !newOpIds.includes(oId));
        const addedOps = newOpIds.filter((oId: number) => !oldOpIds.includes(oId));

        // Removed operations: revert status 4 -> 3
        for (const opId of removedOps) {
          await client.query(
            `UPDATE planned_operations SET status = 3, updated_at = NOW() WHERE id = $1 AND status = 4`,
            [opId]
          );
          await client.query(
            `INSERT INTO operation_history (operation_id, user_id, field_name, old_value, new_value)
             VALUES ($1, $2, 'status', 'Zaplanowane do zlecenia', 'Potwierdzone do planu')`,
            [opId, userId]
          );
        }

        // Delete all and re-insert
        await client.query(
          `DELETE FROM flight_order_operations WHERE flight_order_id = $1`,
          [id]
        );
        for (const opId of newOpIds) {
          await client.query(
            `INSERT INTO flight_order_operations (flight_order_id, operation_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, opId]
          );
        }

        // Added operations: transition status 3 -> 4
        for (const opId of addedOps) {
          await client.query(
            `UPDATE planned_operations SET status = 4, updated_at = NOW() WHERE id = $1 AND status = 3`,
            [opId]
          );
          await client.query(
            `INSERT INTO operation_history (operation_id, user_id, field_name, old_value, new_value)
             VALUES ($1, $2, 'status', 'Potwierdzone do planu', 'Zaplanowane do zlecenia')`,
            [opId, userId]
          );
        }
      }

      await client.query("COMMIT");

      const updated = await fetchFlightOrderById(pool, id);
      return res.status(200).json({ order: updated });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Update flight order error:", error);
      return res.status(500).json({ error: "server_error", message: "Blad serwera." });
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/flight-orders/:id/status — status transition ─────────────────
flightOrdersRouter.post(
  "/:id/status",
  requirePermission("zlecenia_na_lot", PermissionLevel.READ),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "bad_request", message: "Nieprawidlowe ID." });
    }

    const role = req.session.role as UserRole;
    const userId = req.session.userId!;
    const { to_status, actual_start_datetime, actual_end_datetime } = req.body;

    if (to_status == null) {
      return res.status(400).json({ error: "bad_request", message: "Pole to_status jest wymagane." });
    }

    const toStatus = parseInt(String(to_status), 10);

    const client = await pool.connect();
    try {
      const existing = await fetchFlightOrderById(client, id);
      if (!existing) {
        return res.status(404).json({ error: "not_found", message: "Zlecenie na lot nie istnieje." });
      }

      const fromStatus: number = existing.status;

      // Status labels for flight orders
      const FO_STATUS_LABELS: Record<number, string> = {
        1: "Wprowadzone",
        2: "Przekazane do akceptacji",
        3: "Odrzucone",
        4: "Zaakceptowane",
        5: "Zrealizowane w czesci",
        6: "Zrealizowane w calosci",
        7: "Nie zrealizowane",
      };

      // Transition rules
      type TransitionRule = {
        from: number;
        to: number;
        roles: UserRole[];
        cascadeOpsTo?: number; // cascade linked operations to this status
        requireActualDatetime?: boolean;
      };

      const TRANSITIONS: TransitionRule[] = [
        // FLT-06: Pilot submit (1 -> 2)
        { from: 1, to: 2, roles: [UserRole.PILOT, UserRole.SUPERADMIN] },
        // FLT-07: Supervisor accept (2 -> 4)
        { from: 2, to: 4, roles: [UserRole.SUPERVISOR, UserRole.SUPERADMIN] },
        // FLT-07: Supervisor reject (2 -> 3)
        { from: 2, to: 3, roles: [UserRole.SUPERVISOR, UserRole.SUPERADMIN] },
        // FLT-08: Pilot completion - partial (4 -> 5), cascade ops -> 5
        { from: 4, to: 5, roles: [UserRole.PILOT, UserRole.SUPERADMIN], cascadeOpsTo: 5, requireActualDatetime: true },
        // FLT-08: Pilot completion - full (4 -> 6), cascade ops -> 6
        { from: 4, to: 6, roles: [UserRole.PILOT, UserRole.SUPERADMIN], cascadeOpsTo: 6, requireActualDatetime: true },
        // FLT-08: Pilot completion - not completed (4 -> 7), cascade ops -> 3
        { from: 4, to: 7, roles: [UserRole.PILOT, UserRole.SUPERADMIN], cascadeOpsTo: 3 },
      ];

      const rule = TRANSITIONS.find((t) => t.from === fromStatus && t.to === toStatus);

      if (!rule) {
        return res.status(400).json({
          error: "bad_request",
          message: `Przejscie ze statusu ${fromStatus} do ${toStatus} jest niedozwolone.`,
        });
      }

      if (!rule.roles.includes(role)) {
        return res.status(403).json({
          error: "forbidden",
          message: "Brak uprawnien do tej zmiany statusu.",
        });
      }

      // FLT-09: Real start/end datetime required for status 5/6
      if (rule.requireActualDatetime) {
        const effectiveActualStart = actual_start_datetime || existing.actual_start_datetime;
        const effectiveActualEnd = actual_end_datetime || existing.actual_end_datetime;

        if (!effectiveActualStart || !effectiveActualEnd) {
          return res.status(400).json({
            error: "bad_request",
            message: "Rzeczywista data rozpoczecia i zakonczenia sa wymagane dla tego statusu.",
          });
        }
      }

      await client.query("BEGIN");

      // Update actual datetimes if provided
      const extraUpdates: string[] = [];
      const extraParams: any[] = [];
      let pIdx = 1;

      if (actual_start_datetime) {
        extraUpdates.push(`actual_start_datetime = $${pIdx++}`);
        extraParams.push(actual_start_datetime);
      }
      if (actual_end_datetime) {
        extraUpdates.push(`actual_end_datetime = $${pIdx++}`);
        extraParams.push(actual_end_datetime);
      }

      extraUpdates.push(`status = $${pIdx++}`);
      extraParams.push(toStatus);
      extraUpdates.push(`updated_at = NOW()`);
      extraParams.push(id);

      await client.query(
        `UPDATE flight_orders SET ${extraUpdates.join(", ")} WHERE id = $${pIdx}`,
        extraParams
      );

      // Cascade to linked operations (FLT-08 / FLT-11)
      if (rule.cascadeOpsTo !== undefined) {
        const linkedOps = existing.operations;
        for (const op of linkedOps) {
          const oldStatus = op.status;
          const newOpsStatus = rule.cascadeOpsTo;

          // Only cascade if operation is still at status 4 (Zaplanowane do zlecenia)
          // Prevents corrupting operations that have already progressed via another order
          const cascadeResult = await client.query(
            `UPDATE planned_operations SET status = $1, updated_at = NOW() WHERE id = $2 AND status = 4`,
            [newOpsStatus, op.operation_id]
          );

          // Record history only if the UPDATE actually changed a row
          if (cascadeResult.rowCount && cascadeResult.rowCount > 0) {
            const oldLabel: Record<number, string> = {
              1: "Wprowadzone", 2: "Odrzucone", 3: "Potwierdzone do planu",
              4: "Zaplanowane do zlecenia", 5: "Czesciowo zrealizowane",
              6: "Zrealizowane", 7: "Rezygnacja",
            };
            const newLabel = oldLabel[newOpsStatus] ?? String(newOpsStatus);
            const prevLabel = oldLabel[oldStatus] ?? String(oldStatus);

            await client.query(
              `INSERT INTO operation_history (operation_id, user_id, field_name, old_value, new_value)
               VALUES ($1, $2, 'status', $3, $4)`,
              [op.operation_id, userId, prevLabel, newLabel]
            );
          }
        }
      }

      await client.query("COMMIT");

      const updated = await fetchFlightOrderById(pool, id);
      return res.status(200).json({ order: updated });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Flight order status transition error:", error);
      return res.status(500).json({ error: "server_error", message: "Blad serwera." });
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/flight-orders/validate — dry-run validation ──────────────────
flightOrdersRouter.post(
  "/validate",
  requirePermission("zlecenia_na_lot", PermissionLevel.READ),
  async (req: Request, res: Response) => {
    const {
      helicopter_id,
      crew_member_ids,
      operation_ids,
      planned_start_datetime,
    } = req.body;

    if (!helicopter_id || !planned_start_datetime) {
      return res.status(400).json({
        error: "bad_request",
        message: "helicopter_id i planned_start_datetime sa wymagane do walidacji.",
      });
    }

    const pilotUserId = req.session.userId!;
    const crewIds = Array.isArray(crew_member_ids) ? crew_member_ids.map(Number) : [];
    const opIds = Array.isArray(operation_ids) ? operation_ids.map(Number) : [];

    try {
      const warnings = await validateFlightOrder(
        pool,
        parseInt(String(helicopter_id), 10),
        pilotUserId,
        crewIds,
        opIds,
        planned_start_datetime
      );

      // Also calculate crew weight and route length for the form
      let pilotWeight = 0;
      const pilotCmRes = await pool.query(
        `SELECT cm.weight_kg FROM users u
         JOIN crew_members cm ON cm.id = u.crew_member_id
         WHERE u.id = $1`,
        [pilotUserId]
      );
      if (pilotCmRes.rowCount && pilotCmRes.rowCount > 0) {
        pilotWeight = pilotCmRes.rows[0].weight_kg;
      }
      let crewWeight = 0;
      if (crewIds.length > 0) {
        const cwRes = await pool.query(
          `SELECT COALESCE(SUM(weight_kg), 0) AS total FROM crew_members WHERE id = ANY($1)`,
          [crewIds]
        );
        crewWeight = parseInt(cwRes.rows[0].total, 10) || 0;
      }

      let routeLength = 0;
      if (opIds.length > 0) {
        const rlRes = await pool.query(
          `SELECT COALESCE(SUM(route_distance_km), 0) AS total_km
           FROM planned_operations WHERE id = ANY($1)`,
          [opIds]
        );
        routeLength = parseFloat(rlRes.rows[0].total_km) || 0;
      }

      return res.status(200).json({
        valid: warnings.length === 0,
        warnings,
        crew_total_weight_kg: pilotWeight + crewWeight,
        estimated_route_length_km: Math.round(routeLength * 100) / 100,
      });
    } catch (error) {
      console.error("Validate flight order error:", error);
      return res.status(500).json({ error: "server_error", message: "Blad serwera." });
    }
  }
);
