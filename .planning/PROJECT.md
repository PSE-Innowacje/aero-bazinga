# AERO — Helicopter Flight Operations Management

## What This Is

AERO is a web application for managing planned aerial operations and helicopter flight orders. It supports four roles — planner, supervisor, pilot, and system administrator — across the full lifecycle of a flight operation: from initial planning through approval, execution, and reporting. KML route files are uploaded per operation and displayed on an interactive map.

## Core Value

A planner can submit a planned operation with a KML route, and a supervisor can confirm, schedule, and approve the resulting flight order — end to end, with role-based access and procedure validation enforced throughout.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Administration**
- [ ] Admin can manage helicopters (registration, type, crew capacity, weight capacity, inspection date, range, status)
- [ ] Admin can manage crew members (name, email, weight, role, pilot license, training expiry)
- [ ] Admin can manage planned airfields (name, coordinates)
- [ ] Admin can manage system users (name, email, role)

**Planned Operations**
- [ ] Planner can create a planned operation with auto-number, project ref, description, KML route file, proposed dates, operation types, and contact persons
- [ ] KML route is parsed and km distance calculated as sum of point-to-point segments
- [ ] KML route and operation points are displayed on an interactive map
- [ ] Planner can cancel their own operations (status → Rezygnacja)
- [ ] Supervisor can confirm (→ Potwierdzone) or reject (→ Odrzucone) operations, setting planned dates
- [ ] Operations have a 7-state status workflow with role-based edit restrictions
- [ ] Operation list with filtering (default: status 3) and sorting by planned date asc
- [ ] Change history is recorded for each operation (old/new value, date, user)

**Flight Orders**
- [ ] Pilot can create a flight order linking one or more confirmed operations (status 3), selecting helicopter, crew, and airfields
- [ ] Pilot field auto-filled with current logged-in user
- [ ] Crew weight is auto-calculated (pilot + crew members); validated against helicopter max payload
- [ ] Route length estimated from selected operations; validated against helicopter range
- [ ] Helicopter inspection date, pilot license, and crew training dates validated against flight date
- [ ] Map shows start airfield, all operation route points, and end airfield
- [ ] Supervisor can accept or reject submitted flight orders (status 2 → 4 or 3)
- [ ] Pilot can report completion: fully realized (→ 6), partially (→ 5), or not realized (→ 7)
- [ ] Completion reporting cascades status changes to all linked operations
- [ ] Flight order list with filtering (default: status 2) and sorting by planned start datetime asc

**Auth & Access Control**
- [ ] Login with email + password
- [ ] Role-based menu and data access: Admin (admin panel only), Planner (operations), Supervisor (operations + orders), Pilot (orders)

### Out of Scope

- Automatic optimal route calculation — PRD explicitly excludes this
- Automatic estimated flight distance calculation — PRD explicitly excludes this
- Additional validations beyond those specified in PRD section 6.6.c
- External API integrations, cloud deployment — local/internal network only

## Context

- PRD is in Polish; the application UI will be in Polish
- 4 user roles with distinct permissions: Osoba planująca, Osoba nadzorująca, Pilot, Administrator systemu
- Operations use KML files (up to 5000 points, Poland territory) for route definition
- Status workflows are central: 7 statuses for operations, 7 for flight orders, with specific transition rules per role
- The "Minimum Viable Demo" criterion: 2+ user roles, operation list, flight order management

## Constraints

- **Tech Stack**: React (frontend) + Node.js/Express (backend) — user preference
- **Database**: PostgreSQL — user preference
- **Deployment**: Local/internal network — self-hosted, no cloud dependency
- **Language**: Polish UI — all labels, statuses, and messages in Polish
- **KML**: Must handle up to 5000 points; distance calculation via Haversine or equivalent

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + Node.js/Express + PostgreSQL | User-specified stack, well-suited for CRUD-heavy app with complex data relationships | — Pending |
| KML file parsing server-side | Keeps frontend lightweight; allows validation and km calculation before storage | — Pending |
| Leaflet.js for maps | Open-source, works offline/locally, handles KML overlays well | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after initialization*
