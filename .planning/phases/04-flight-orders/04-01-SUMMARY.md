---
phase: "04-flight-orders"
plan: "04-01"
subsystem: "flight-orders-core"
tags: [flight-orders, api, validation, database]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [flight-orders-api, validation-rules, crew-weight-calc, route-length-calc]
  affects: [planned-operations-status]
tech_stack:
  added: []
  patterns: [atomic-transaction, validation-pipeline, auto-fill]
key_files:
  created:
    - server/src/routes/flight-orders.ts
  modified:
    - shared/src/types.ts
    - server/src/index.ts
    - server/src/middleware/rbac.ts
    - shared/src/permissions.ts
decisions:
  - "Reference data endpoints (airfields, helicopters, crew) scoped under /api/flight-orders/* to avoid admin permission requirements for pilot/supervisor roles"
  - "RBAC middleware enhanced to block EDIT_VIEW from CRUD-only endpoints"
  - "Pilot admin permission corrected from READ to NONE per permissions matrix"
metrics:
  duration_minutes: 11
  completed: "2026-03-31"
---

# Phase 4 Plan 01: Flight Orders Core Summary

Flight orders CRUD API with 5 validation rules, auto-fill pilot from session, crew weight + route length auto-calculation, and atomic OPS 3->4 status transition on link.

## What Was Built

### API Endpoints
- `GET /api/flight-orders` — list with status filter, sorted by planned start datetime
- `GET /api/flight-orders/:id` — full order with crew members and linked operations
- `POST /api/flight-orders` — create (pilot only), auto-fill pilot_user_id from session
- `PUT /api/flight-orders/:id` — update with re-validation and recalculation
- `POST /api/flight-orders/validate` — dry-run validation for real-time form feedback
- `GET /api/flight-orders/airfields/list` — airfields for form selection
- `GET /api/flight-orders/helicopters/list` — active helicopters for selection
- `GET /api/flight-orders/crew/list` — crew members for selection

### 5 Validation Rules (FLT-05)
1. Crew total weight vs helicopter max_crew_payload_kg
2. Crew count (including pilot) vs helicopter max_crew_count
3. Estimated route length vs helicopter range_km
4. Crew member training_expiry_date vs flight date
5. Pilot license_expiry_date vs flight date
6. Helicopter inspection_expiry_date vs flight date (bonus)

### Auto-Calculations
- Crew total weight: pilot weight + sum of selected crew member weights (FLT-02)
- Estimated route length: sum of route_distance_km from all linked operations (FLT-03)

### Status Transitions on Link (FLT-11 / OPS-09)
- Operations added to order: status 3 -> 4 (atomic transaction)
- Operations removed from order: status 4 -> 3 (revert)
- History entries recorded on each operation

## Shared Types Added
- FlightOrder, FlightOrderCrewMember, FlightOrderOperation
- CreateFlightOrderRequest, UpdateFlightOrderRequest
- FlightOrderValidationWarning

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Reference data endpoints for non-admin roles**
- Found during: API implementation
- Issue: Pilot and supervisor have NONE/EDIT_VIEW for administracja, cannot access /api/admin/* endpoints
- Fix: Added scoped /api/flight-orders/airfields/list, /helicopters/list, /crew/list endpoints
- Files modified: server/src/routes/flight-orders.ts

**2. [Rule 2 - Missing] EDIT_VIEW not blocked from CRUD endpoints**
- Found during: RBAC review
- Issue: requirePermission(CRUD) only blocked READ, not EDIT_VIEW
- Fix: Added EDIT_VIEW check in requirePermission middleware
- Files modified: server/src/middleware/rbac.ts

**3. [Rule 1 - Bug] Pilot admin permission was READ instead of NONE**
- Found during: Pre-existing uncommitted fix
- Issue: Pilot had READ access to admin panel, should be NONE per requirements
- Fix: Changed to PermissionLevel.NONE
- Files modified: shared/src/permissions.ts

## Known Stubs

None.

## Self-Check: PASSED
