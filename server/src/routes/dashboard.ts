import { Router, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { UserRole } from "shared/roles";

export const dashboardRouter = Router();

// requireAuth is applied at mount level in index.ts
dashboardRouter.get("/", async (req: Request, res: Response) => {
  const role = req.session.role as string;
  const userId = req.session.userId!;

  try {
    const result: Record<string, any> = {};

    // ── Stats for everyone ──────────────────────────────────────────
    const [opsStats, foStats, heliStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 1) AS ops_new,
          COUNT(*) FILTER (WHERE status = 3) AS ops_confirmed,
          COUNT(*) FILTER (WHERE status = 4) AS ops_scheduled,
          COUNT(*) FILTER (WHERE status IN (5,6)) AS ops_completed,
          COUNT(*) AS ops_total
        FROM planned_operations
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 1) AS fo_draft,
          COUNT(*) FILTER (WHERE status = 2) AS fo_submitted,
          COUNT(*) FILTER (WHERE status = 4) AS fo_accepted,
          COUNT(*) FILTER (WHERE status IN (5,6)) AS fo_completed,
          COUNT(*) AS fo_total
        FROM flight_orders
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 1) AS active,
          COUNT(*) AS total
        FROM helicopters
      `),
    ]);

    result.stats = {
      operations: opsStats.rows[0],
      flightOrders: foStats.rows[0],
      helicopters: heliStats.rows[0],
    };

    // ── Role-specific data ──────────────────────────────────────────

    if (role === UserRole.PLANNER) {
      // My operations by status
      const myOps = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 1) AS new,
           COUNT(*) FILTER (WHERE status = 3) AS confirmed,
           COUNT(*) FILTER (WHERE status = 7) AS cancelled,
           COUNT(*) AS total
         FROM planned_operations
         WHERE created_by_user_id = $1`,
        [userId]
      );
      result.myOperations = myOps.rows[0];
    }

    if (role === UserRole.SUPERVISOR || role === UserRole.SUPERADMIN) {
      // Operations awaiting action (status 1)
      const pendingOps = await pool.query(
        `SELECT id, operation_number, short_description, created_at
         FROM planned_operations
         WHERE status = 1
         ORDER BY created_at DESC
         LIMIT 10`
      );
      result.pendingOperations = pendingOps.rows;

      // Flight orders awaiting action (status 2)
      const pendingFO = await pool.query(
        `SELECT fo.id, fo.order_number, fo.planned_start_datetime,
                u.first_name || ' ' || u.last_name AS pilot_name
         FROM flight_orders fo
         JOIN users u ON u.id = fo.pilot_user_id
         WHERE fo.status = 2
         ORDER BY fo.planned_start_datetime ASC
         LIMIT 10`
      );
      result.pendingFlightOrders = pendingFO.rows;
    }

    if (role === UserRole.PILOT) {
      // My flight orders by status
      const myFO = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 1) AS draft,
           COUNT(*) FILTER (WHERE status = 2) AS submitted,
           COUNT(*) FILTER (WHERE status = 4) AS accepted,
           COUNT(*) AS total
         FROM flight_orders
         WHERE pilot_user_id = $1`,
        [userId]
      );
      result.myFlightOrders = myFO.rows[0];

      // Accepted orders ready for completion
      const readyFO = await pool.query(
        `SELECT fo.id, fo.order_number, fo.planned_start_datetime,
                h.registration_number AS helicopter
         FROM flight_orders fo
         JOIN helicopters h ON h.id = fo.helicopter_id
         WHERE fo.pilot_user_id = $1 AND fo.status = 4
         ORDER BY fo.planned_start_datetime ASC
         LIMIT 10`,
        [userId]
      );
      result.readyFlightOrders = readyFO.rows;
    }

    if (
      role === UserRole.ADMINISTRATOR ||
      role === UserRole.SUPERADMIN
    ) {
      // Users by role
      const usersByRole = await pool.query(
        `SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role`
      );
      result.usersByRole = usersByRole.rows;

      // Expiring soon (within 30 days)
      const now = new Date().toISOString().split("T")[0];
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      // Show already-expired AND expiring within 30 days
      const [expiringHeli, expiringLicense, expiringTraining] =
        await Promise.all([
          pool.query(
            `SELECT id, registration_number, inspection_expiry_date
             FROM helicopters
             WHERE status = 1 AND inspection_expiry_date <= $1
             ORDER BY inspection_expiry_date ASC`,
            [in30]
          ),
          pool.query(
            `SELECT id, first_name, last_name, license_expiry_date
             FROM crew_members
             WHERE role = 'Pilot' AND license_expiry_date <= $1
             ORDER BY license_expiry_date ASC`,
            [in30]
          ),
          pool.query(
            `SELECT id, first_name, last_name, training_expiry_date
             FROM crew_members
             WHERE training_expiry_date <= $1
             ORDER BY training_expiry_date ASC`,
            [in30]
          ),
        ]);

      result.expiring = {
        helicopters: expiringHeli.rows,
        licenses: expiringLicense.rows,
        training: expiringTraining.rows,
      };
    }

    // ── Recent activity (last 10 status changes) ────────────────────
    const recentActivity = await pool.query(
      `SELECT
         oh.field_name,
         oh.old_value,
         oh.new_value,
         oh.changed_at,
         u.email AS user_email,
         po.operation_number AS ref_number,
         'operation' AS ref_type,
         po.id AS ref_id
       FROM operation_history oh
       JOIN planned_operations po ON po.id = oh.operation_id
       JOIN users u ON u.id = oh.user_id
       WHERE oh.field_name = 'status'
       ORDER BY oh.changed_at DESC
       LIMIT 10`
    );
    result.recentActivity = recentActivity.rows;

    return res.json(result);
  } catch (error) {
    console.error("Dashboard error:", error);
    return res
      .status(500)
      .json({ error: "server_error", message: "Błąd serwera." });
  }
});
