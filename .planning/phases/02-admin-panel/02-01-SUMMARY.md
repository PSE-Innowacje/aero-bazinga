---
phase: 02-admin-panel
plan: "01"
subsystem: admin
tags: [crud, helicopters, express, react, react-hook-form, zod, shadcn, table]

# Dependency graph
requires:
  - phase: 01-03
    provides: requirePermission middleware, /api/admin prefix guard, React AppShell, authenticated routes
provides:
  - GET /api/admin/helicopters — sorted list (status DESC, registration ASC)
  - POST /api/admin/helicopters — create with full validation
  - GET /api/admin/helicopters/:id — single record
  - PUT /api/admin/helicopters/:id — update with full validation
  - HelicoptersPage React component at /admin/helicopters
  - HelicopterFormPage React component at /admin/helicopters/new and /admin/helicopters/:id/edit
  - Helicopter + CreateHelicopterRequest types in shared/types.ts
affects: [02-02, 02-03, phase-4 (helicopter selection in flight orders)]

# Tech tracking
tech-stack:
  added:
    - shadcn/ui: table, select, dialog, alert components
    - react-hook-form pinned to 7.59.0 (7.72.0 missing dist/index.d.ts)
  patterns:
    - CRUD pattern: Express Router file + React list page + React form page
    - Conditional field rendering: inspection_expiry_date rendered only when status=1
    - Zod .superRefine() for cross-field conditional validation
    - POST/PUT require CRUD permission, GET requires READ (inherited from prefix guard)

key-files:
  created:
    - server/src/routes/helicopters.ts
    - client/src/pages/admin/HelicoptersPage.tsx
    - client/src/pages/admin/HelicopterFormPage.tsx
    - client/src/components/ui/table.tsx
    - client/src/components/ui/select.tsx
    - client/src/components/ui/dialog.tsx
    - client/src/components/ui/alert.tsx
  modified:
    - server/src/index.ts (mount helicoptersRouter at /api/admin/helicopters)
    - shared/src/types.ts (Helicopter, CreateHelicopterRequest + crew/airfield/user types)
    - client/src/App.tsx (helicopter routes inside /admin/*)
    - client/package.json (react-hook-form pinned to 7.59.0)

key-decisions:
  - "react-hook-form pinned to 7.59.0 — 7.72.0 ships without dist/index.d.ts, TypeScript cannot resolve types"
  - "Conditional field for inspection_expiry_date: removed from DOM when status=0 (not just hidden)"
  - "Number fields use parseInt/parseFloat in onChange to keep form values as numbers not strings"

patterns-established:
  - "Admin CRUD pattern: Express router file per entity mounted at /api/admin/{entity}"
  - "Form page pattern: detect isEdit from URL params, load existing data in useEffect, POST or PUT on submit"
  - "List page pattern: fetch on mount, show loading/empty/error states, edit button per row"

requirements-completed: [HELI-01, HELI-02, HELI-03]

# Metrics
duration: ~30min
completed: 2026-03-31
---

# Phase 2 Plan 01: Helicopters CRUD Summary

**Express router + React list table + zod-validated form for helicopters, establishing the CRUD pattern all Phase 2 entities follow — inspection expiry date conditionally required for active status**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-31T12:10:00Z
- **Completed:** 2026-03-31T12:40:00Z
- **Tasks:** 2
- **Files modified:** 10 created/modified

## Accomplishments

- Full helicopter API: GET (list sorted by status DESC then registration ASC), POST with inspection_expiry_date conditional requirement, GET-by-id, PUT — all with proper validation and error codes
- React list page with shadcn Table, status badge (Aktywny/Nieaktywny), edit buttons
- React form page with 8 fields: inspection_expiry_date field conditionally rendered in DOM only when status=1, react-hook-form + zod with .superRefine() cross-field rule
- Established admin CRUD pattern that 02-02 and 02-03 replicate

## Task Commits

1. **Task 1: Helicopter API endpoints** - `bbf0389` (feat)
2. **Task 2: Helicopter list page and create/edit form** - `e19be61` (feat)

## Files Created/Modified

- `server/src/routes/helicopters.ts` — 4 endpoints, CRUD permission on mutations, 409 on duplicate registration
- `server/src/index.ts` — helicoptersRouter mounted at /api/admin/helicopters
- `shared/src/types.ts` — Helicopter, CreateHelicopterRequest (also added CrewMember, Airfield, SystemUser types)
- `client/src/pages/admin/HelicoptersPage.tsx` — list with badge status display
- `client/src/pages/admin/HelicopterFormPage.tsx` — 8-field form, conditional inspection date
- `client/src/App.tsx` — /admin/helicopters routes + nested Routes inside AppShell

## Decisions Made

- react-hook-form pinned to exact `7.59.0` — v7.72.0 (latest) ships with `"types": "dist/index.d.ts"` in package.json but that file is absent, breaking TypeScript compilation
- DOM exclusion for inspection_expiry_date when inactive — matches same principle used in sidebar (security parity)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Downgraded react-hook-form from 7.72.0 to 7.59.0**
- **Found during:** Task 2 (TypeScript compilation of HelicopterFormPage)
- **Issue:** react-hook-form 7.72.0 declares `"types": "dist/index.d.ts"` in package.json but that file does not exist in the distributed package. TypeScript could not resolve any react-hook-form types, causing `useForm`, `Controller`, etc. to be missing from the module.
- **Fix:** Pinned `"react-hook-form": "7.59.0"` in client/package.json; npm deduplication placed 7.59.0 in client/node_modules/react-hook-form which has the correct dist/index.d.ts
- **Files modified:** `client/package.json`, `package-lock.json`

**2. [Rule 1 - Bug] Fixed TS2345 on req.params.id — used indexed access**
- **Found during:** Task 1 (server TypeScript compilation)
- **Issue:** `parseInt(req.params.id, 10)` gave `TS2345: Argument of type 'string | string[]' is not assignable to parameter of type 'string'`
- **Fix:** Changed to `req.params["id"] as string` to satisfy strict Express type
- **Files modified:** `server/src/routes/helicopters.ts`

---

**Total deviations:** 2 auto-fixed
**Impact on plan:** Both fixes were environment/dependency issues. No scope changes.

## Known Stubs

None. All helicopter fields wire to real API endpoints.

---
*Phase: 02-admin-panel*
*Completed: 2026-03-31*
