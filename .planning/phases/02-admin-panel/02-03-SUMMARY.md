---
phase: 02-admin-panel
plan: "03"
subsystem: admin
tags: [crud, airfields, users, bcrypt, auth04, role-selection, react-hook-form]

# Dependency graph
requires:
  - phase: 02-02
    provides: crew API (/api/admin/crew) for pilot crew_member_id lookup in user form
provides:
  - GET /api/admin/airfields — sorted by name ASC
  - POST /api/admin/airfields — name + coordinate validation
  - GET /api/admin/airfields/:id
  - PUT /api/admin/airfields/:id
  - GET /api/admin/users — sorted by email ASC (no password_hash)
  - POST /api/admin/users — bcrypt hash, AUTH-04 pilot link required
  - GET /api/admin/users/:id
  - PUT /api/admin/users/:id — password optional (keeps existing hash if omitted)
  - AirfieldsPage + AirfieldFormPage at /admin/airfields
  - UsersPage + UserFormPage at /admin/users
affects: [phase-3 (operations need airfields), phase-4 (flight orders need airfields + pilot user link)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optional password on PUT — server branches on whether password field is present in body
    - AUTH-04 enforcement: role=pilot requires crew_member_id, cleared to null for other roles
    - ROLE_DISPLAY_PL used in user table and user form select options

key-files:
  created:
    - server/src/routes/airfields.ts
    - server/src/routes/users.ts
    - client/src/pages/admin/AirfieldsPage.tsx
    - client/src/pages/admin/AirfieldFormPage.tsx
    - client/src/pages/admin/UsersPage.tsx
    - client/src/pages/admin/UserFormPage.tsx
  modified:
    - server/src/index.ts (airfieldsRouter + usersRouter mounts)
    - client/src/App.tsx (complete /admin/* route tree)

key-decisions:
  - "Password not returned from any API endpoint — SELECT excludes password_hash column"
  - "PUT /api/admin/users keeps existing hash if no password in body — admin edit without password reset"
  - "crew_member_id Select in UserFormPage fetches /api/admin/crew and filters client-side to role=Pilot only"
  - "Warsaw coordinates used as default values for AirfieldFormPage (52.2297, 21.0122)"

requirements-completed: [LAND-01, LAND-02, LAND-03, USR-01, USR-02, USR-03]

# Metrics
duration: ~25min
completed: 2026-03-31
---

# Phase 2 Plan 03: Airfields + System Users CRUD Summary

**Airfields CRUD (name + coordinate validation) and system users CRUD (bcrypt password hashing, AUTH-04 pilot crew link, Polish role display) — completing all 13 Phase 2 requirements**

## Performance

- **Duration:** ~25 min
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments

- Airfields: simple but correct — latitude clamped -90..90, longitude -180..180, sorted by name ASC; Warsaw coordinates as form defaults
- System users: bcrypt cost 12 on creation, optional password on edit (keeps existing hash when omitted), AUTH-04 enforced (pilot requires crew_member_id), password_hash excluded from all SELECT responses
- UserFormPage: crew_member_id Select dynamically fetches /api/admin/crew and shows only role=Pilot entries; rendered only when role=Pilot
- Complete /admin/* routing tree in App.tsx — all 4 entities (helicopters, crew, airfields, users) fully wired

## Task Commits

1. **Task 1: Airfields API** - `7c0d7fa` (feat, combined with users)
2. **Task 2: System users API** - `7c0d7fa` (feat)
3. **Task 3: Airfield list and form pages** - `4e50bd4` (feat)
4. **Task 4: User list and form pages** - `4e50bd4` (feat)

## Files Created/Modified

- `server/src/routes/airfields.ts` — coordinate validation, sorted GET, CRUD permission on mutations
- `server/src/routes/users.ts` — bcryptjs hash, AUTH-04 pilot link check, password excluded from responses
- `server/src/index.ts` — all 4 admin routers mounted
- `client/src/pages/admin/AirfieldsPage.tsx` — name + lat/lng table
- `client/src/pages/admin/AirfieldFormPage.tsx` — 3-field form with Warsaw defaults
- `client/src/pages/admin/UsersPage.tsx` — email + ROLE_DISPLAY_PL column
- `client/src/pages/admin/UserFormPage.tsx` — 4-role select, optional password, pilot crew link
- `client/src/App.tsx` — complete /admin/* nested Routes for all entities

## Deviations from Plan

None - plan executed exactly as written.

## Phase 2 Complete

All 13 Phase 2 requirements satisfied:
- HELI-01, HELI-02, HELI-03: Helicopters CRUD (plan 02-01)
- CREW-01, CREW-02, CREW-03, CREW-04: Crew members CRUD (plan 02-02)
- LAND-01, LAND-02, LAND-03: Airfields CRUD (plan 02-03)
- USR-01, USR-02, USR-03: System users CRUD (plan 02-03)

---
*Phase: 02-admin-panel*
*Completed: 2026-03-31*
