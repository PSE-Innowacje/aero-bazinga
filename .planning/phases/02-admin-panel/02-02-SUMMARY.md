---
phase: 02-admin-panel
plan: "02"
subsystem: admin
tags: [crud, crew, email-validation, pilot-conditional, react-hook-form, zod]

# Dependency graph
requires:
  - phase: 02-01
    provides: CRUD pattern (router + list page + form page), shadcn table/select/form components
provides:
  - GET /api/admin/crew — sorted by email ASC
  - POST /api/admin/crew — with CREW-03 email validation and pilot-conditional fields
  - GET /api/admin/crew/:id
  - PUT /api/admin/crew/:id
  - CrewPage at /admin/crew
  - CrewMemberFormPage at /admin/crew/new and /admin/crew/:id/edit
  - CrewMember type in shared/types.ts
affects: [02-03 (pilot crew list for user linking), phase-4 (crew weight calculation)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CREW-03 email regex: /^[a-zA-Z0-9.\-]+@[...]+\.[a-zA-Z]{2,}$/ with exact one @ check
    - Pilot-conditional DOM removal: fields not rendered when role !== Pilot
    - useEffect to clear pilot fields when role changes away from Pilot

key-files:
  created:
    - server/src/routes/crew.ts
    - client/src/pages/admin/CrewPage.tsx
    - client/src/pages/admin/CrewMemberFormPage.tsx
  modified:
    - server/src/index.ts (mount crewRouter)
    - client/src/App.tsx (crew routes)

key-decisions:
  - "Email regex matches CREW-03 spec exactly: letters+digits+.-@ before @, exactly one @, >=2 domain segments"
  - "Pilot fields cleared to null in DB when role != Pilot — avoids stale data from previous pilot assignment"
  - "Role change in form clears pilot fields via useEffect watch — DOM removal alone doesn't clear form values"

requirements-completed: [CREW-01, CREW-02, CREW-03, CREW-04]

# Metrics
duration: ~20min
completed: 2026-03-31
---

# Phase 2 Plan 02: Crew Members CRUD Summary

**Crew member API with CREW-03 email validation regex and pilot-conditional license fields (both server and client enforce the Pilot role requirement), sortable list by email**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Email validation: custom regex enforcing letters+digits+.-@ only, exactly one @, at least two dot-separated domain segments — same rule applied on both server (route handler) and client (zod schema)
- Pilot-conditional fields: pilot_license_number and license_expiry_date removed from DOM and zeroed in DB when role != Pilot; zod .superRefine() enforces both required when role = Pilot
- Crew list sorted by email ASC per CREW-04

## Task Commits

1. **Task 1: Crew member API endpoints** - `55999c0` (feat)
2. **Task 2: Crew list page and create/edit form** - `34a9859` (feat)

## Files Created/Modified

- `server/src/routes/crew.ts` — CREW-03 email regex, pilot-conditional INSERT/UPDATE logic, 409 on duplicate email
- `client/src/pages/admin/CrewPage.tsx` — table: email, role, license expiry (or "—"), training expiry
- `client/src/pages/admin/CrewMemberFormPage.tsx` — pilot fields in DOM only when role=Pilot, useEffect clears on role change

## Deviations from Plan

None - plan executed exactly as written.

---
*Phase: 02-admin-panel*
*Completed: 2026-03-31*
