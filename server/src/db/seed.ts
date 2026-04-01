import { pool } from "./pool.js";
import bcryptjs from "bcryptjs";
import "dotenv/config";
import { CREW_ROLES } from "shared/crew-roles";
import { OPERATION_TYPES_PL } from "shared/operation-types";
import { PERMISSIONS } from "shared/permissions";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Seed crew_roles dictionary
    for (const role of CREW_ROLES) {
      await client.query(
        `INSERT INTO crew_roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [role]
      );
    }
    console.log("Crew roles seeded.");

    // 2. Seed operation_types dictionary
    for (const opType of OPERATION_TYPES_PL) {
      await client.query(
        `INSERT INTO operation_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [opType]
      );
    }
    console.log("Operation types seeded.");

    // 3. Seed role_permissions from static defaults
    for (const [role, sections] of Object.entries(PERMISSIONS)) {
      for (const [section, level] of Object.entries(sections)) {
        await client.query(
          `INSERT INTO role_permissions (role, section, level)
           VALUES ($1::user_role, $2, $3)
           ON CONFLICT (role, section) DO NOTHING`,
          [role, section, level]
        );
      }
    }
    console.log("Role permissions seeded.");

    // 4. Seed admin user per D-04
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    }

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [adminEmail]
    );

    if (existing.rows.length === 0) {
      const hash = await bcryptjs.hash(adminPassword, 12);
      await client.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)`,
        ["Admin", "AERO", adminEmail, hash, "administrator"]
      );
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log(`Admin user already exists: ${adminEmail} (no-op)`);
    }

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
