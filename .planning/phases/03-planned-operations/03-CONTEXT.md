# Phase 3 Context: Planned Operations

## Phase Goal
A planner can submit a planned operation with a KML route, a supervisor can confirm or reject it, and the full 7-state workflow with field-level role restrictions, history log, and comments operates correctly.

## Key Technical Decisions
- KML parsing: server-side with fast-xml-parser (install if not present)
- Map display: react-leaflet (install if not present)
- Status as SMALLINT integers 1–7 (see shared/src/statuses.ts)
- Operation number: auto-assigned via operation_number_seq sequence; format "OP-YYYY-NNNN" (4-digit zero-padded, year from created_at)
- History log: every field change with old/new value, timestamp, user (operation_history table)
- Role restrictions: planner cannot edit planned dates, status, auto-calculated fields, post_completion_notes, created_by

## DB Tables Involved
- planned_operations (main table)
- planned_operation_types (M2M join)
- operation_contact_persons
- operation_comments
- operation_history
- operation_types (dictionary — already seeded)

## API Routes Pattern
- /api/operations — main CRUD (planowanie_operacji permission)
- /api/operations/:id/status — status transitions
- /api/operations/:id/comments — comments

## Upload Pattern
- KML file uploaded via multipart/form-data
- Parsed server-side, points stored in kml_points_json JSONB column
- Distance calculated server-side via Haversine formula

## Operation Number Format
Year-NNNN where NNNN is zero-padded sequence value: e.g. "2026-0001"
