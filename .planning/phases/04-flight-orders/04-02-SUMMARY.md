---
phase: "04-flight-orders"
plan: "04-02"
subsystem: "flight-orders-workflow"
tags: [flight-orders, workflow, status-transitions, cascade]
dependency_graph:
  requires: [04-01]
  provides: [flight-order-workflow, completion-cascade]
  affects: [planned-operations-status]
tech_stack:
  added: []
  patterns: [state-machine, atomic-cascade, datetime-validation]
key_files:
  created: []
  modified:
    - server/src/routes/flight-orders.ts
decisions:
  - "All cascade status changes execute in a single DB transaction (BEGIN/COMMIT) per FLT-11"
  - "Nie zrealizowane (4->7) does not require actual datetimes; only status 5 and 6 do per FLT-09"
metrics:
  duration_minutes: 0
  completed: "2026-03-31"
---

# Phase 4 Plan 02: Flight Orders Workflow Summary

Complete status workflow with submit, accept/reject, completion reporting, and cascade to linked operations — all implemented within the flight-orders route handler.

## What Was Built

### Status Transitions (POST /api/flight-orders/:id/status)
- **Submit (1->2)**: Pilot submits for supervisor approval (FLT-06)
- **Accept (2->4)**: Supervisor accepts flight order (FLT-07)
- **Reject (2->3)**: Supervisor rejects flight order (FLT-07)
- **Partial completion (4->5)**: Pilot reports partial, cascades linked ops to status 5 (FLT-08)
- **Full completion (4->6)**: Pilot reports full, cascades linked ops to status 6 (FLT-08)
- **Not completed (4->7)**: Pilot reports not completed, cascades linked ops back to status 3 (FLT-08)

### Actual Datetime Requirement (FLT-09)
- Status 5 and 6 require actual_start_datetime and actual_end_datetime
- Can be provided in the status transition request body
- Validated before transition is allowed

### Cascade Logic (FLT-08 / FLT-11)
- All linked operations receive cascaded status in single atomic transaction
- History entries recorded on each affected operation
- Status labels preserved in history for traceability

## Deviations from Plan

None - workflow executed exactly as specified.

## Known Stubs

None.

## Self-Check: PASSED
