---
phase: "04-flight-orders"
plan: "04-03"
subsystem: "flight-orders-ui"
tags: [flight-orders, ui, leaflet, map, react]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [flight-order-form, flight-order-list, flight-order-detail, flight-order-map]
  affects: []
tech_stack:
  added: []
  patterns: [leaflet-dynamic-import, multi-select-checkbox, real-time-validation]
key_files:
  created:
    - client/src/pages/flight-orders/FlightOrdersListPage.tsx
    - client/src/pages/flight-orders/FlightOrderFormPage.tsx
    - client/src/pages/flight-orders/FlightOrderDetailPage.tsx
  modified:
    - client/src/App.tsx
    - client/src/components/layout/Sidebar.tsx
    - client/src/pages/operations/OperationsListPage.tsx
decisions:
  - "Map displays start airfield (green), operation routes (multi-color polylines), end airfield (red) using Leaflet divIcon markers"
  - "Completion dialog inline on detail page (not separate route) for actual datetime entry"
  - "Validation runs client-side via /validate endpoint with 500ms debounce"
  - "Submit button disabled when validation warnings present"
metrics:
  duration_minutes: 0
  completed: "2026-03-31"
---

# Phase 4 Plan 03: Flight Orders UI Summary

Complete flight orders UI with form, list, detail pages, interactive map display, and status action buttons per role.

## What Was Built

### FlightOrdersListPage
- Status filter dropdown (default: status 2 - Przekazane do akceptacji) per FLT-10
- Columns: order number, planned start, helicopter, pilot, status
- Sorted by planned start datetime ascending
- "Nowe zlecenie" button visible only for Pilot role
- Status badges with color-coding per status

### FlightOrderFormPage
- Helicopter selection (active only, shows max crew/payload/range)
- Start/end airfield selection
- Crew member multi-select checkboxes (excludes pilot's own crew member)
- Operation multi-select checkboxes (status 3 only, shows route distance)
- Planned start/end datetime pickers
- Real-time validation via /validate endpoint (500ms debounce)
- Validation warnings displayed with orange alert styling
- Auto-calculated crew weight and route length displayed
- Live map preview showing start airfield + operation routes + end airfield
- Submit button blocked when validation warnings present (FLT-05)
- Pilot auto-filled from session (displayed as read-only info)

### FlightOrderDetailPage
- Full order details in 2-column grid layout
- Crew members table (name, role, weight, training expiry)
- Linked operations table (number, description, route distance) — clickable to navigate
- Interactive Leaflet map (FLT-04): start airfield (green marker), operation routes (colored polylines), end airfield (red marker)
- Status action buttons per role:
  - Pilot (status 1): "Przekaz do akceptacji" submit button
  - Supervisor (status 2): "Zaakceptuj" + "Odrzuc" buttons
  - Pilot (status 4): "Zrealizowane w czesci" / "Zrealizowane w calosci" / "Nie zrealizowane"
- Completion dialog: inline form for actual start/end datetime (required for status 5/6)
- Edit button visible for pilot (status 1, 3) and supervisor (status 1, 2, 3, 4)

### Routing
- /flight-orders — list page (index route)
- /flight-orders/new — create form
- /flight-orders/:id — detail page
- /flight-orders/:id/edit — edit form

### Pre-existing Fixes Committed
- Sidebar: user profile + logout button added (was removed from TopBar)
- OperationsListPage: Radix Select "all" sentinel fix (prevents crash on empty value)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Radix Select crash with empty string value**
- Found during: Pre-existing uncommitted fix
- Issue: SelectItem with value="" causes Radix UI crash
- Fix: Use "all" as sentinel value for "Wszystkie" filter option
- Files modified: client/src/pages/operations/OperationsListPage.tsx

## Known Stubs

None.

## Self-Check: PASSED
