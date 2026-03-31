---
phase: 01-foundation
plan: "02"
subsystem: database
tags: [postgres, pg, bcryptjs, sql, seed, schema]

# Dependency graph
requires:
  - phase: 01-01
    provides: shared TypeScript types, roles enum, statuses enum, project scaffolding
provides:
  - Complete PostgreSQL schema (15 tables) for all 4 application phases
  - Database connection pool (pg.Pool via DATABASE_URL)
  - Schema migration runner (reads schema.sql and applies via pool.query)
  - Idempotent seed script (admin user, crew_roles, operation_types dictionaries)
  - Shared crew-roles and operation-types constants
affects: [01-03, phase-2, phase-3, phase-4]

# Tech tracking
tech-stack:
  added: [pg, bcryptjs, dotenv]
  patterns:
    - Raw pg queries (no ORM) per Claude's Discretion in D-13
    - Idempotent seeds via ON CONFLICT DO NOTHING
    - Schema applied as single SQL file via pool.query

key-files:
  created:
    - server/src/db/pool.ts
    - server/src/db/schema.sql
    - server/src/db/migrate.ts
    - server/src/db/seed.ts
    - shared/src/crew-roles.ts
    - shared/src/operation-types.ts
  modified:
    - server/package.json
    - shared/src/index.ts

key-decisions:
  - "Raw pg queries (no ORM) — keeps schema.sql as canonical source of truth; no ORM migration drift"
  - "IF NOT EXISTS guards on all CREATE TABLE/SEQUENCE — migration is idempotent and safe to re-run"
  - "user_role PostgreSQL enum matches shared/src/roles.ts UserRole values exactly (administrator, planner, supervisor, pilot)"
  - "bcryptjs cost factor 12 for admin password hash"

patterns-established:
  - "Schema SQL: use CREATE TABLE IF NOT EXISTS and DO $$ BEGIN...EXCEPTION pattern for enum idempotency"
  - "Seed: ON CONFLICT (name) DO NOTHING for dictionary tables, SELECT-then-insert for users"
  - "Seed: always wrap in transaction (BEGIN/COMMIT/ROLLBACK)"
  - "Shared constants: defined as const arrays with as const for type narrowing"

requirements-completed: [AUTH-04]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 1 Plan 02: Database Schema Summary

**Complete 15-table PostgreSQL schema with pg.Pool connection, idempotent migration runner, and bcrypt-hashed admin seed — full schema for all 4 application phases created in one shot**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-31T11:07:04Z
- **Completed:** 2026-03-31T11:09:41Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Full PostgreSQL schema (15 tables: crew_members, users, session, helicopters, airfields, operation_types, planned_operations, planned_operation_types, operation_contact_persons, operation_comments, operation_history, flight_orders, flight_order_crew_members, flight_order_operations, crew_roles) with correct FK constraints, smallint status columns, and user_role enum
- Connection pool (pool.ts) and idempotent migration runner (migrate.ts) — schema uses IF NOT EXISTS throughout so it is safe to re-run
- Seed script (seed.ts) creates admin user with bcrypt cost 12, populates crew_roles and operation_types dictionaries; all inserts are idempotent; wrapped in a single transaction
- Shared constants (crew-roles.ts, operation-types.ts) exported from shared/src/index.ts as single source of truth

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database connection pool and complete schema SQL** - `6d583cd` (feat)
2. **Task 2: Create seed script with admin user, crew roles, and operation types** - `360f3b9` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `server/src/db/pool.ts` - pg.Pool configured from DATABASE_URL env var
- `server/src/db/schema.sql` - Complete 15-table schema with user_role enum, sequences, FK constraints, session table
- `server/src/db/migrate.ts` - Reads schema.sql, executes via pool.query, then ends pool
- `server/src/db/seed.ts` - Seeds admin user (bcryptjs hash, cost 12), crew_roles dictionary, operation_types dictionary; idempotent; transactional
- `shared/src/crew-roles.ts` - CREW_ROLES const array: ['Pilot', 'Obserwator']
- `shared/src/operation-types.ts` - OPERATION_TYPES_PL const array: 5 Polish operation type names
- `server/package.json` - Added migrate script (tsx src/db/migrate.ts); seed script path corrected to src/db/seed.ts
- `shared/src/index.ts` - Added re-exports for crew-roles and operation-types

## Decisions Made

- Raw `pg` queries chosen (no ORM) — schema.sql is canonical, avoids ORM migration drift
- `IF NOT EXISTS` guards on all DDL statements — migration is safe to re-run without errors
- `user_role` PostgreSQL enum wrapped in `DO $$ BEGIN...EXCEPTION` block for idempotent enum creation
- bcryptjs cost factor 12 (industry minimum 10 exceeded; good balance of security and performance)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before running `npm run migrate -w server` and `npm run seed -w server`, the following environment variables must be set in `.env` at the root:

- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/aero`)
- `ADMIN_EMAIL` — Email address for the initial admin account
- `ADMIN_PASSWORD` — Password for the initial admin account

## Next Phase Readiness

- All tables required for Phases 1-4 are created — no ALTER TABLE needed in future phases (D-13)
- Session table ready for connect-pg-simple (plan 01-03)
- users table with crew_member_id nullable FK ready for Pilot 1:1 link (AUTH-04 / D-15)
- user_role PostgreSQL enum matches shared/src/roles.ts — no type drift possible
- Shared operation-types and crew-roles constants available to both client and server via shared package

---
*Phase: 01-foundation*
*Completed: 2026-03-31*
