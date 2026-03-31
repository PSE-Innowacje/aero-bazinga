---
phase: "03"
plan: "03"
name: "Operations UI"
subsystem: "planned-operations"
tags: ["ui", "frontend", "leaflet", "react", "forms"]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides: ["operations-ui"]
  affects: ["04-03"]
tech_stack:
  added: ["react-leaflet@4", "leaflet", "@types/leaflet"]
  patterns: ["multipart-form-data", "leaflet-polyline", "role-conditional-ui"]
key_files:
  created:
    - client/src/pages/operations/OperationsListPage.tsx
    - client/src/pages/operations/OperationFormPage.tsx
    - client/src/pages/operations/OperationDetailPage.tsx
  modified:
    - client/src/App.tsx
    - client/package.json
    - package.json
    - package-lock.json
decisions:
  - "react-leaflet@4 (not v5) — v5 requires React 19, project uses React 18"
  - "Leaflet default icon fix via L.Icon.Default.mergeOptions with unpkg CDN URLs"
  - "Dynamic import of leaflet to avoid SSR/bundler issues with window references"
  - "@types/react pinned back to 18.3.18 — v18.3.28 missing jsx-runtime.d.ts file"
  - "Leaflet polyline drawn in PSE primary blue #003E7E matching design system"
metrics:
  duration: "~45 min"
  completed: "2026-03-31"
  tasks: 6
  files: 6
---

# Phase 3 Plan 3: Operations UI Summary

**One-liner:** Operations list (default filter status=3, 8 columns), form with multipart KML upload and operation type checkboxes, detail page with Leaflet route map, status action buttons per role, comments, and history log.

## What Was Built

### OperationsListPage (`/operations`)
- 8-column table: operation_number, project_reference, operation_types, proposed_earliest_date, proposed_latest_date, planned_earliest_date, planned_latest_date, status
- Default filter: status=3 (Potwierdzone do planu)
- Status filter dropdown with all 7 statuses + "Wszystkie" option
- Color-coded status badges (blue/red/green/orange/yellow/gray/slate)
- "Nowa operacja" button visible only for planner and supervisor roles
- Row click navigates to detail page

### OperationFormPage (`/operations/new`, `/operations/:id/edit`)
- Shared component for create and edit
- Custom checkbox-toggle operation type selector (multi-select)
- Proposed dates (planner + supervisor), planned dates (supervisor only)
- Post-completion notes shown only for supervisor when status >= 5
- FormData multipart upload for KML file with clear/replace UX
- Read-only info panel in edit mode: operation_number, status, route_distance_km, created_by

### OperationDetailPage (`/operations/:id`)
- Status action buttons: supervisor Odrzuć/Potwierdź (status=1), planner/supervisor cancel (1,3,4→7)
- Pre-validation warning when confirming without planned dates
- Leaflet map with polyline route (PSE blue #003E7E) and circle markers
- Linked flight orders read-only list (OPS-06c)
- Comments section: scrollable list + add form with 500-char limit
- History log: collapsible table, newest-first, field/before/after columns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] react-leaflet@5 requires React 19**
- **Found during:** Task 1
- **Issue:** `npm install react-leaflet` installed v5 which has peer dep `react@^19.0.0`; project uses React 18.3.1
- **Fix:** Installed `react-leaflet@4` explicitly (supports React 18)
- **Files modified:** `client/package.json`, `package-lock.json`
- **Commit:** 2aa44f3

**2. [Rule 3 - Blocking] @types/react@18.3.28 missing jsx-runtime.d.ts**
- **Found during:** Task 6 (TypeScript compile check)
- **Issue:** react-leaflet install upgraded root `@types/react` to 18.3.28 which exports `./jsx-runtime` but the file `jsx-runtime.d.ts` doesn't exist in that version; this broke `tsc -b` for the entire client
- **Fix:** Pinned `@types/react@18.3.18` and `@types/react-dom@18.3.5` at root — these versions include `jsx-runtime.d.ts`
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** 2aa44f3

## Known Stubs

None — all data is wired to live API endpoints.

## Self-Check: PASSED
- client/src/pages/operations/OperationsListPage.tsx: FOUND
- client/src/pages/operations/OperationFormPage.tsx: FOUND
- client/src/pages/operations/OperationDetailPage.tsx: FOUND
- Commit 2aa44f3: FOUND
- npm run build: SUCCESS (1717 modules, no errors)
