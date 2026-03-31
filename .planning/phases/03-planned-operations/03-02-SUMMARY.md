---
phase: "03"
plan: "02"
name: "Operations Workflow"
subsystem: "planned-operations"
tags: ["api", "backend", "status-machine", "comments", "history"]
dependency_graph:
  requires: ["03-01"]
  provides: ["status-transitions", "comments-api"]
  affects: ["03-03", "04-01"]
tech_stack:
  added: []
  patterns: ["status-machine", "ownership-check", "atomic-transition"]
key_files:
  created: []
  modified:
    - server/src/routes/operations.ts
decisions:
  - "Planner cancel is 'ownOnly' — checked against created_by_user_id to prevent cancelling others' operations"
  - "Confirm (1→3) validates planned dates server-side before executing transition"
  - "Status transition history records labels not integers for human readability"
  - "Comments endpoint requires READ permission (all roles with access can comment)"
metrics:
  duration: "~15 min"
  completed: "2026-03-31"
  tasks: 3
  files: 1
---

# Phase 3 Plan 2: Operations Workflow Summary

**One-liner:** Status transition machine (supervisor confirm/reject, planner cancel with ownership check), history log entries for all transitions, and comments append/list API.

## What Was Built

### Status Transitions (`POST /api/operations/:id/status`)
Allowed transitions (enforced server-side):
- 1 → 2: Supervisor only (reject)
- 1 → 3: Supervisor only (confirm) — requires planned_earliest_date AND planned_latest_date set
- 1 → 7: Planner (own only) or Supervisor (cancel)
- 3 → 7: Planner (own only) or Supervisor (cancel)
- 4 → 7: Planner (own only) or Supervisor (cancel)

Every transition:
- Updates `status` in `planned_operations`
- Records history entry with Polish status label before/after
- Optionally records `status_reason` as separate history entry

### Comments API
- `GET /api/operations/:id/comments` — ordered ASC, includes author email + full name
- `POST /api/operations/:id/comments` — max 500 chars, available to any user with planowanie_operacji READ

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- Commit 3770379: FOUND
- Status transition endpoint added to operations.ts: FOUND
- Comments endpoints added to operations.ts: FOUND
