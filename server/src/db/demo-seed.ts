import { pool } from "./pool.js";
import bcryptjs from "bcryptjs";
import "dotenv/config";

/**
 * Demo seed — populates the database with realistic test data
 * for demonstrating all AERO features.
 *
 * Run: npx tsx server/src/db/demo-seed.ts
 */
async function demoSeed() {
  const client = await pool.connect();
  const passwordHash = await bcryptjs.hash("Admin123!", 12);

  try {
    await client.query("BEGIN");

    // ── Clean up duplicate E2E test data ──────────────────────────
    await client.query("DELETE FROM airfields WHERE name = 'Lotnisko E2E Test'");

    // ── Helicopters ───────────────────────────────────────────────
    const helicopters = [
      { reg: "SP-HWA", type: "Airbus H145", desc: "Helikopter główny PSE", crew: 5, payload: 800, range: 680, status: 1, inspection: "2026-08-15" },
      { reg: "SP-HWB", type: "Bell 407GXi", desc: "Helikopter pomocniczy", crew: 4, payload: 600, range: 550, status: 1, inspection: "2026-06-30" },
      { reg: "SP-HWC", type: "Robinson R66", desc: "Helikopter lekki", crew: 3, payload: 350, range: 400, status: 1, inspection: "2026-04-10" },
      { reg: "SP-HWD", type: "Airbus H125", desc: "W remoncie", crew: 4, payload: 500, range: 620, status: 0, inspection: null },
    ];

    for (const h of helicopters) {
      await client.query(
        `INSERT INTO helicopters (registration_number, type, description, max_crew_count, max_crew_payload_kg, range_km, status, inspection_expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (registration_number) DO NOTHING`,
        [h.reg, h.type, h.desc, h.crew, h.payload, h.range, h.status, h.inspection]
      );
    }
    console.log("Helicopters seeded (4)");

    // ── Airfields ─────────────────────────────────────────────────
    const airfields = [
      { name: "Lądowisko PSE Warszawa-Ochota", lat: 52.2180, lng: 20.9830 },
      { name: "Lądowisko PSE Radom", lat: 51.4027, lng: 21.1471 },
      { name: "Lądowisko PSE Lublin", lat: 51.2465, lng: 22.5684 },
      { name: "Lądowisko PSE Łódź", lat: 51.7769, lng: 19.4547 },
      { name: "Lądowisko PSE Kraków", lat: 50.0647, lng: 19.9450 },
      { name: "Lądowisko PSE Gdańsk", lat: 54.3520, lng: 18.6466 },
      { name: "Lądowisko PSE Poznań", lat: 52.4064, lng: 16.9252 },
      { name: "Lądowisko PSE Wrocław", lat: 51.1079, lng: 17.0385 },
    ];

    for (const a of airfields) {
      await client.query(
        `INSERT INTO airfields (name, latitude, longitude) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [a.name, a.lat, a.lng]
      );
    }
    console.log("Airfields seeded (8)");

    // ── Crew members ──────────────────────────────────────────────
    const crewMembers = [
      { first: "Marek", last: "Kowalski", email: "marek.kowalski@pse.pl", weight: 82, role: "Pilot", license: "PL-PIL-2024-001", licenseExp: "2027-03-15", trainingExp: "2026-09-30" },
      { first: "Anna", last: "Wiśniewska", email: "anna.wisniewska@pse.pl", weight: 65, role: "Pilot", license: "PL-PIL-2024-002", licenseExp: "2026-12-01", trainingExp: "2026-11-15" },
      { first: "Piotr", last: "Zieliński", email: "piotr.zielinski@pse.pl", weight: 78, role: "Obserwator", license: null, licenseExp: null, trainingExp: "2026-08-20" },
      { first: "Katarzyna", last: "Lewandowska", email: "katarzyna.lewandowska@pse.pl", weight: 60, role: "Obserwator", license: null, licenseExp: null, trainingExp: "2026-07-10" },
      { first: "Tomasz", last: "Dąbrowski", email: "tomasz.dabrowski@pse.pl", weight: 90, role: "Obserwator", license: null, licenseExp: null, trainingExp: "2026-10-05" },
      { first: "Ewa", last: "Kamińska", email: "ewa.kaminska@pse.pl", weight: 58, role: "Pilot", license: "PL-PIL-2023-015", licenseExp: "2026-04-20", trainingExp: "2026-05-01" },
    ];

    const crewIdMap: Record<string, number> = {};
    for (const c of crewMembers) {
      const res = await client.query(
        `INSERT INTO crew_members (first_name, last_name, email, weight_kg, role, pilot_license_number, license_expiry_date, training_expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO UPDATE SET first_name = $1 RETURNING id`,
        [c.first, c.last, c.email, c.weight, c.role, c.license, c.licenseExp, c.trainingExp]
      );
      crewIdMap[c.email] = res.rows[0].id;
    }
    console.log("Crew members seeded (6)");

    // ── Users (linked to crew) ────────────────────────────────────
    const demoUsers = [
      { first: "Marek", last: "Kowalski", email: "marek.kowalski@pse.pl", role: "pilot", crewEmail: "marek.kowalski@pse.pl" },
      { first: "Anna", last: "Wiśniewska", email: "anna.wisniewska@pse.pl", role: "pilot", crewEmail: "anna.wisniewska@pse.pl" },
      { first: "Jan", last: "Nowicki", email: "jan.nowicki@pse.pl", role: "planner", crewEmail: null },
      { first: "Maria", last: "Wójcik", email: "maria.wojcik@pse.pl", role: "planner", crewEmail: null },
      { first: "Robert", last: "Szymański", email: "robert.szymanski@pse.pl", role: "supervisor", crewEmail: null },
    ];

    for (const u of demoUsers) {
      const crewId = u.crewEmail ? crewIdMap[u.crewEmail] ?? null : null;
      await client.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, crew_member_id)
         VALUES ($1, $2, $3, $4, $5::user_role, $6)
         ON CONFLICT (email) DO UPDATE SET crew_member_id = $6 RETURNING id`,
        [u.first, u.last, u.email, passwordHash, u.role, crewId]
      );
    }

    // Link superadmin to a crew member for flight order creation
    const superadminCrewId = crewIdMap["marek.kowalski@pse.pl"];
    await client.query(
      `UPDATE users SET crew_member_id = $1 WHERE email = 'admin@aero.local' AND crew_member_id IS NULL`,
      [superadminCrewId]
    );

    console.log("Demo users seeded (5) + superadmin linked to crew");

    // ── Get reference IDs ─────────────────────────────────────────
    const airfieldRows = await client.query("SELECT id, name FROM airfields ORDER BY id");
    const airfieldMap: Record<string, number> = {};
    for (const a of airfieldRows.rows) airfieldMap[a.name] = a.id;

    const heliRows = await client.query("SELECT id, registration_number FROM helicopters WHERE status = 1 ORDER BY id");
    const heliMap: Record<string, number> = {};
    for (const h of heliRows.rows) heliMap[h.registration_number] = h.id;

    const plannerUser = await client.query("SELECT id FROM users WHERE email = 'jan.nowicki@pse.pl'");
    const plannerId = plannerUser.rows[0]?.id;

    const supervisorUser = await client.query("SELECT id FROM users WHERE email = 'robert.szymanski@pse.pl'");
    const supervisorId = supervisorUser.rows[0]?.id;

    const pilotUser = await client.query("SELECT id FROM users WHERE email = 'marek.kowalski@pse.pl'");
    const pilotId = pilotUser.rows[0]?.id;

    // ── KML sample data ───────────────────────────────────────────
    const kmlWarszawaRadom = JSON.stringify([
      { lat: 52.218, lng: 20.983 }, { lat: 52.1, lng: 21.0 },
      { lat: 51.8, lng: 21.05 }, { lat: 51.6, lng: 21.1 },
      { lat: 51.403, lng: 21.147 },
    ]);
    const kmlWarszawaLublin = JSON.stringify([
      { lat: 52.218, lng: 20.983 }, { lat: 52.0, lng: 21.3 },
      { lat: 51.7, lng: 21.8 }, { lat: 51.4, lng: 22.2 },
      { lat: 51.247, lng: 22.568 },
    ]);
    const kmlLodzKrakow = JSON.stringify([
      { lat: 51.777, lng: 19.455 }, { lat: 51.5, lng: 19.6 },
      { lat: 51.2, lng: 19.8 }, { lat: 50.8, lng: 19.9 },
      { lat: 50.065, lng: 19.945 },
    ]);
    const kmlGdanskPoznan = JSON.stringify([
      { lat: 54.352, lng: 18.647 }, { lat: 53.8, lng: 18.2 },
      { lat: 53.3, lng: 17.6 }, { lat: 52.8, lng: 17.1 },
      { lat: 52.406, lng: 16.925 },
    ]);
    const kmlWarszawaWroclaw = JSON.stringify([
      { lat: 52.218, lng: 20.983 }, { lat: 52.0, lng: 20.2 },
      { lat: 51.7, lng: 19.5 }, { lat: 51.4, lng: 18.5 },
      { lat: 51.108, lng: 17.039 },
    ]);

    // ── Planned Operations ────────────────────────────────────────
    // Reset sequence to ensure clean numbering
    await client.query("SELECT setval('operation_number_seq', (SELECT COALESCE(MAX(id), 0) FROM planned_operations))");

    const operations = [
      // Status 1 — Wprowadzone (awaiting supervisor confirmation)
      { proj: "DE-26-10001", desc: "Inspekcja linii 400kV Warszawa-Radom", kml: kmlWarszawaRadom, dist: 145, propEarly: "2026-05-01", propLate: "2026-06-30", planEarly: null, planLate: null, status: 1, userId: plannerId, types: [1, 4] },
      { proj: "DE-26-10002", desc: "Skan 3D słupów Warszawa-Lublin", kml: kmlWarszawaLublin, dist: 170, propEarly: "2026-05-15", propLate: "2026-07-15", planEarly: null, planLate: null, status: 1, userId: plannerId, types: [2] },
      // Status 2 — Odrzucone
      { proj: "CJI-3301", desc: "Patrolowanie linii Łódź-Kraków (odrzucone)", kml: kmlLodzKrakow, dist: 200, propEarly: "2026-04-01", propLate: "2026-04-30", planEarly: null, planLate: null, status: 2, userId: plannerId, types: [5] },
      // Status 3 — Potwierdzone do planu (ready for flight orders)
      { proj: "DE-26-10003", desc: "Oględziny wizualne Gdańsk-Poznań", kml: kmlGdanskPoznan, dist: 250, propEarly: "2026-05-01", propLate: "2026-08-31", planEarly: "2026-06-01", planLate: "2026-06-15", status: 3, userId: plannerId, types: [1] },
      { proj: "DE-26-10004", desc: "Lokalizacja awarii Warszawa-Wrocław", kml: kmlWarszawaWroclaw, dist: 310, propEarly: "2026-05-10", propLate: "2026-07-31", planEarly: "2026-06-10", planLate: "2026-06-25", status: 3, userId: plannerId, types: [3] },
      { proj: "CJI-3302", desc: "Zdjęcia infrastruktury Warszawa-Radom", kml: kmlWarszawaRadom, dist: 145, propEarly: "2026-06-01", propLate: "2026-09-30", planEarly: "2026-07-01", planLate: "2026-07-15", status: 3, userId: plannerId, types: [4] },
      // Status 6 — Zrealizowane
      { proj: "DE-25-09015", desc: "Inspekcja linii Łódź-Kraków (zrealizowana)", kml: kmlLodzKrakow, dist: 200, propEarly: "2026-02-01", propLate: "2026-03-15", planEarly: "2026-02-15", planLate: "2026-02-28", status: 6, userId: plannerId, types: [1, 2] },
      // Status 7 — Rezygnacja
      { proj: "CJI-3200", desc: "Patrolowanie Gdańsk-Poznań (rezygnacja)", kml: kmlGdanskPoznan, dist: 250, propEarly: "2026-01-15", propLate: "2026-03-01", planEarly: null, planLate: null, status: 7, userId: plannerId, types: [5] },
    ];

    const opIdMap: Record<string, number> = {};
    for (const op of operations) {
      const seqRes = await client.query("SELECT nextval('operation_number_seq') AS seq");
      const seq = Number(seqRes.rows[0].seq);

      const insertRes = await client.query(
        `INSERT INTO planned_operations (operation_number, project_reference, short_description, kml_file_path, kml_points_json, route_distance_km, proposed_earliest_date, proposed_latest_date, planned_earliest_date, planned_latest_date, status, created_by_user_id)
         VALUES ($1, $2, $3, 'demo', $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [seq, op.proj, op.desc, op.kml, op.dist, op.propEarly, op.propLate, op.planEarly, op.planLate, op.status, op.userId]
      );
      const opId = insertRes.rows[0].id;
      opIdMap[op.proj] = opId;

      for (const typeId of op.types) {
        await client.query(
          "INSERT INTO planned_operation_types (operation_id, operation_type_id) VALUES ($1, $2)",
          [opId, typeId]
        );
      }

      // Add history entry
      await client.query(
        `INSERT INTO operation_history (operation_id, user_id, field_name, old_value, new_value)
         VALUES ($1, $2, 'status', NULL, $3)`,
        [opId, op.userId, String(op.status)]
      );
    }
    console.log("Planned operations seeded (8)");

    // ── Comments on operations ────────────────────────────────────
    await client.query(
      `INSERT INTO operation_comments (operation_id, user_id, comment_text) VALUES ($1, $2, $3)`,
      [opIdMap["DE-26-10001"], supervisorId, "Proszę o doprecyzowanie zakresu inspekcji — północna czy południowa część odcinka?"]
    );
    await client.query(
      `INSERT INTO operation_comments (operation_id, user_id, comment_text) VALUES ($1, $2, $3)`,
      [opIdMap["DE-26-10001"], plannerId, "Cały odcinek — od stacji Warszawa Południe do stacji Radom Główna."]
    );
    await client.query(
      `INSERT INTO operation_comments (operation_id, user_id, comment_text) VALUES ($1, $2, $3)`,
      [opIdMap["DE-26-10003"], supervisorId, "Operacja potwierdzona. Planowane okno: 1-15 czerwca 2026."]
    );
    console.log("Comments seeded (3)");

    // ── Flight Orders ─────────────────────────────────────────────
    const foSeqRes = await client.query("SELECT nextval('order_number_seq') AS seq");
    const foSeq = Number(foSeqRes.rows[0].seq);

    // Flight order linking 2 confirmed operations — status 2 (Przekazane)
    const pilotCrewId = crewIdMap["marek.kowalski@pse.pl"];
    const observerCrewId = crewIdMap["piotr.zielinski@pse.pl"];

    const gdanskAirfieldId = airfieldMap["Lądowisko PSE Gdańsk"] ?? airfieldRows.rows[0]?.id;
    const poznanAirfieldId = airfieldMap["Lądowisko PSE Poznań"] ?? airfieldRows.rows[1]?.id;
    const spHwaId = heliMap["SP-HWA"] ?? heliRows.rows[0]?.id;

    const foRes = await client.query(
      `INSERT INTO flight_orders (order_number, planned_start_datetime, planned_end_datetime, pilot_user_id, helicopter_id, start_airfield_id, end_airfield_id, crew_total_weight_kg, estimated_route_length_km, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [foSeq, "2026-06-05T07:00:00", "2026-06-05T12:00:00", pilotId, spHwaId, gdanskAirfieldId, poznanAirfieldId, 82 + 78, 250, 2]
    );
    const foId = foRes.rows[0].id;

    // Link crew
    await client.query("INSERT INTO flight_order_crew_members (flight_order_id, crew_member_id) VALUES ($1, $2)", [foId, observerCrewId]);

    // Link operation
    const gdanskOpId = opIdMap["DE-26-10003"];
    await client.query("INSERT INTO flight_order_operations (flight_order_id, operation_id) VALUES ($1, $2)", [foId, gdanskOpId]);

    // Second flight order — status 1 (Wprowadzone / draft)
    const foSeq2 = Number((await client.query("SELECT nextval('order_number_seq') AS seq")).rows[0].seq);

    const warszawaAirfieldId = airfieldMap["Lądowisko PSE Warszawa-Ochota"] ?? airfieldRows.rows[0]?.id;
    const wroclawAirfieldId = airfieldMap["Lądowisko PSE Wrocław"] ?? airfieldRows.rows[1]?.id;
    const spHwbId = heliMap["SP-HWB"] ?? heliRows.rows[0]?.id;

    const foRes2 = await client.query(
      `INSERT INTO flight_orders (order_number, planned_start_datetime, planned_end_datetime, pilot_user_id, helicopter_id, start_airfield_id, end_airfield_id, crew_total_weight_kg, estimated_route_length_km, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [foSeq2, "2026-06-12T08:00:00", "2026-06-12T14:00:00", pilotId, spHwbId, warszawaAirfieldId, wroclawAirfieldId, 82 + 60, 310, 1]
    );
    const foId2 = foRes2.rows[0].id;

    const observer2Id = crewIdMap["katarzyna.lewandowska@pse.pl"];
    await client.query("INSERT INTO flight_order_crew_members (flight_order_id, crew_member_id) VALUES ($1, $2)", [foId2, observer2Id]);

    const wroclawOpId = opIdMap["DE-26-10004"];
    await client.query("INSERT INTO flight_order_operations (flight_order_id, operation_id) VALUES ($1, $2)", [foId2, wroclawOpId]);

    console.log("Flight orders seeded (2)");

    await client.query("COMMIT");
    console.log("\nDemo seed complete. Summary:");
    console.log("  Helicopters: 4 (3 active, 1 inactive)");
    console.log("  Airfields: 8 (PSE locations across Poland)");
    console.log("  Crew members: 6 (3 pilots, 3 observers)");
    console.log("  Users: 5 new (2 pilots, 2 planners, 1 supervisor)");
    console.log("  Operations: 8 (2 new, 1 rejected, 3 confirmed, 1 completed, 1 cancelled)");
    console.log("  Flight orders: 2 (1 draft, 1 submitted for acceptance)");
    console.log("  Comments: 3");
    console.log("\nAll demo users password: Admin123!");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

demoSeed().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
