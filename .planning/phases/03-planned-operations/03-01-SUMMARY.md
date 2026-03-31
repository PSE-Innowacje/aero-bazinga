---
phase: "03"
plan: "01"
name: "Operations Core"
subsystem: "planned-operations"
tags: ["api", "backend", "kml", "haversine"]
dependency_graph:
  requires: ["02-03"]
  provides: ["operations-crud-api", "kml-parsing", "haversine-distance"]
  affects: ["03-02", "03-03"]
tech_stack:
  added: ["fast-xml-parser", "multer"]
  patterns: ["multipart-upload", "haversine-formula", "operation-history-log"]
key_files:
  created:
    - server/src/routes/operations.ts
    - server/src/utils/kml.ts
    - server/src/utils/haversine.ts
    - server/uploads/kml/ (directory)
  modified:
    - server/src/index.ts
    - shared/src/types.ts
    - server/package.json
decisions:
  - "fast-xml-parser for KML parsing — pure JS, no native deps, works in ESM context"
  - "multer with diskStorage to preserve KML files server-side for later re-serving"
  - "Operation number formatted as YYYY-NNNN (year-zero-padded sequence)"
  - "Poland bounding box validation: lat 49.0–54.9, lng 14.1–24.2"
  - "Planner restricted from: planned_dates, status, route_distance_km, post_completion_notes"
metrics:
  duration: "~30 min"
  completed: "2026-03-31"
  tasks: 7
  files: 5
---

# Phase 3 Plan 1: Operations Core Summary

**One-liner:** DB layer + KML upload/parsing with Poland validation + Haversine route distance + create/edit API with auto-assigned YYYY-NNNN operation numbers and planner field restrictions.

## What Was Built

### KML Parsing Utility (`server/src/utils/kml.ts`)
- Parses KML XML using fast-xml-parser
- Extracts coordinates from any nested Placemark/LineString/Point structure
- Validates: min 2 points, max 5000 points, all within Poland bounding box
- Returns `{ points, error? }` structure

### Haversine Distance Utility (`server/src/utils/haversine.ts`)
- Standard Haversine formula, Earth radius 6371 km
- `totalRouteDistance()` sums consecutive point distances, rounds to 2 decimal places

### Operations Router (`server/src/routes/operations.ts`)
- `GET /api/operations` — list with optional status filter, sorted by planned_earliest_date ASC
- `GET /api/operations/:id` — full operation with joined types, contacts, flight_orders (OPS-06c)
- `GET /api/operations/types/list` — operation type dictionary
- `POST /api/operations` — create with multipart KML, auto-sequence number, history entry on create
- `PUT /api/operations/:id` — update with role-based field restrictions + field-level history tracking
- `GET /api/operations/:id/history` — history log ordered newest first

### Shared Types (`shared/src/types.ts`)
Added: `PlannedOperation`, `OperationTypeRow`, `OperationContactPerson`, `OperationComment`, `OperationHistory`, `KmlPoint`, `CreateOperationRequest`, `UpdateOperationRequest`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OperationType name collision with shared/src/operation-types.ts**
- **Found during:** Task 7 (TypeScript compile check)
- **Issue:** `OperationType` already exported from `operation-types.ts` as a string union type; naming the new DB row interface `OperationType` caused TS2308 duplicate export error
- **Fix:** Renamed interface to `OperationTypeRow` in `shared/src/types.ts`
- **Files modified:** `shared/src/types.ts`
- **Commit:** 7159c6f

## Self-Check: PASSED
- server/src/routes/operations.ts: FOUND
- server/src/utils/kml.ts: FOUND
- server/src/utils/haversine.ts: FOUND
- Commit 7159c6f: FOUND
