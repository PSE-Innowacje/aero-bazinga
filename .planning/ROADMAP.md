# Roadmap: AERO

## Overview

AERO is built in four phases that follow the natural dependency chain of the application. Phase 1 lays the technical foundation — project scaffolding, database schema, and authentication. Phase 2 delivers the admin panel with all reference-data CRUD (helicopters, crew, airfields, system users). Phase 3 implements the core domain: planned operations with KML upload, map display, and the 7-state status workflow. Phase 4 adds flight orders — the most complex module — which links operations, validates against helicopter and crew data, and drives the completion cascade. Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffolding, database schema, and authentication
- [x] **Phase 2: Admin Panel** - CRUD management for helicopters, crew members, airfields, and system users
- [ ] **Phase 3: Planned Operations** - Full operations module with KML upload, map display, status workflow, and history
- [ ] **Phase 4: Flight Orders** - Full flight order module with validation, map display, and completion cascade

## Phase Details

### Phase 1: Foundation
**Goal**: The application has a working project structure, database schema, and login flow — all four roles can authenticate and reach their respective areas
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can log in with email and password and is redirected to the correct area for their role
  2. User stays logged in after browser refresh without re-entering credentials
  3. A user with the wrong role cannot access a protected section (e.g. Pilot cannot reach the admin panel)
  4. The database schema exists with all tables and relationships needed for the full application
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold monorepo (React + Vite + Tailwind + shadcn/ui, Express, shared types/enums/permissions)
- [x] 01-02-PLAN.md — Complete database schema (all tables for Phases 1-4), connection pool, migration runner, seed script
- [x] 01-03-PLAN.md — Authentication flow (login/logout/session endpoints, RBAC middleware, frontend shell with role-filtered sidebar)
**UI hint**: yes

### Phase 2: Admin Panel
**Goal**: An admin can manage all reference data — helicopters, crew members, airfields, and system users — through a complete CRUD interface with validated forms and sorted lists
**Depends on**: Phase 1
**Requirements**: HELI-01, HELI-02, HELI-03, CREW-01, CREW-02, CREW-03, CREW-04, LAND-01, LAND-02, LAND-03, USR-01, USR-02, USR-03
**Success Criteria** (what must be TRUE):
  1. Admin can create, edit, and view a helicopter record with all required fields and validation enforced
  2. Admin can create, edit, and view a crew member record; email format is validated; pilot-role fields (license, expiry) are required only when role is Pilot
  3. Admin can create and edit an airfield record with name and coordinates
  4. Admin can create and edit a system user record with name, email, and role
  5. All four list views (helicopters, crew, airfields, users) display correct columns and apply their default sort orders
**Plans**: TBD

Plans:
- [x] 02-01: Helicopters CRUD — API endpoints + React list and form (all fields, validation, default sort)
- [x] 02-02: Crew members CRUD — API endpoints + React list and form (email validation, pilot-conditional fields, default sort)
- [x] 02-03: Airfields + System users CRUD — API endpoints + React lists and forms for both simpler entities
**UI hint**: yes

### Phase 3: Planned Operations
**Goal**: A planner can submit a planned operation with a KML route, a supervisor can confirm or reject it, and the full 7-state workflow with field-level role restrictions, history log, and comments operates correctly
**Depends on**: Phase 2
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07, OPS-08, OPS-09, OPS-10, OPS-11, OPS-12
**Success Criteria** (what must be TRUE):
  1. Planner can create an operation with auto-assigned number, KML upload, and all required fields; route distance is calculated and displayed automatically
  2. KML route points are displayed on an interactive map within the operation view
  3. Supervisor can confirm (status 1 -> 3) or reject (1 -> 2) an operation; planner can cancel (1, 3, 4 -> 7) their own operation
  4. Role-based field restrictions are enforced: planner cannot edit planned dates, status, or auto-calculated fields in any status; supervisor has full access
  5. Every field change is captured in the history log with old value, new value, timestamp, and user
  6. Operation list shows correct columns, defaults to status 3 filter, and sorts by planned earliest date ascending
**Plans**: TBD

Plans:
- [ ] 03-01: Operations core — DB layer, KML upload and parsing, Haversine distance calculation, create/edit API with auto-number and role restrictions
- [ ] 03-02: Operations workflow — status transitions (planner cancel, supervisor confirm/reject, OPS-09 auto-transitions), history log, comments API
- [ ] 03-03: Operations UI — operation form with map display (Leaflet), list view with filtering/sorting, status action buttons per role
**UI hint**: yes

### Phase 4: Flight Orders
**Goal**: A pilot can create a flight order linking confirmed operations, all 5 validation rules are enforced before save, a supervisor can accept or reject it, and the pilot's completion report cascades status changes to all linked operations
**Depends on**: Phase 3
**Requirements**: FLT-01, FLT-02, FLT-03, FLT-04, FLT-05, FLT-06, FLT-07, FLT-08, FLT-09, FLT-10, FLT-11
**Success Criteria** (what must be TRUE):
  1. Pilot can create a flight order with auto-filled pilot field, selected helicopter, crew members, airfields, and linked confirmed operations (status 3 only)
  2. Crew total weight and estimated route length are auto-calculated; save is blocked with specific warnings if any of the 5 validation rules are violated
  3. Map displays start airfield marker, all KML route points from selected operations, and end airfield marker
  4. Supervisor can accept (2 -> 4) or reject (2 -> 3) a submitted flight order
  5. When operations are added to a flight order their status changes from 3 to 4; when the pilot reports completion the linked operations receive the correct cascaded status
  6. Flight order list shows correct columns, defaults to status 2 filter, and sorts by planned start datetime ascending
**Plans**: TBD

Plans:
- [ ] 04-01: Flight orders core — DB layer, create/edit API with auto-fill, crew weight + route length calculation, all 5 validation rules, OPS status 3->4 transition on link
- [ ] 04-02: Flight orders workflow — submit (1->2), supervisor accept/reject (2->4 or 2->3), completion reporting (4->5/6/7) with cascade to linked operations, real datetime requirement for status 5/6
- [ ] 04-03: Flight orders UI — order form with map display (start + operation routes + end), list view with filtering/sorting, status action buttons per role
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-31 |
| 2. Admin Panel | 3/3 | Complete | 2026-03-31 |
| 3. Planned Operations | 0/3 | Not started | - |
| 4. Flight Orders | 0/3 | Not started | - |
