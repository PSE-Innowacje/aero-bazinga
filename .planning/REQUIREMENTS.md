# Requirements: AERO

**Defined:** 2026-03-31
**Core Value:** A planner can submit a planned operation with a KML route, and a supervisor can confirm and approve the resulting flight order — end to end, with role-based access and procedure validation enforced throughout.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: User session persists across browser refresh (stays logged in)
- [ ] **AUTH-03**: Access to menu sections and data is restricted by role per permissions matrix — enforced on both frontend (hidden sections) and backend (middleware per endpoint); `NONE` = hidden + 403, `READ` = GET only, `CRUD` = full access; Osoba nadzorująca on Zlecenia na lot = edit + view only (no create)
- [x] **AUTH-04**: A user with role Pilot must be linked 1:1 to a crew member record; the system enforces this link at user creation and uses the crew member record for weight, license, and training data in flight orders

### Helicopters

- [ ] **HELI-01**: Admin can create a helicopter record with: registration number (max 30), type (max 100), description (max 100, optional), max crew count (1–10), max crew payload kg (1–1000), status (active/inactive), inspection expiry date (required when active), range km (1–1000)
- [ ] **HELI-02**: Admin can edit an existing helicopter record
- [ ] **HELI-03**: Helicopter list shows registration number, type, status; default sort by status then registration number

### Crew Members

- [ ] **CREW-01**: Admin can create a crew member record with: first name (max 100), last name (max 100), email/login (max 100, validated), weight kg (30–200), role (from dictionary), pilot license number (max 30, required for Pilot role), license expiry date (required for Pilot role), training expiry date (required)
- [ ] **CREW-02**: Admin can edit an existing crew member record
- [ ] **CREW-03**: Email is validated: letters + `.-@` only, exactly one `@`, at least two dot-separated segments after `@`
- [ ] **CREW-04**: Crew list shows email, role, license expiry, training expiry; default sort by email

### Airfields

- [ ] **LAND-01**: Admin can create an airfield record with name and coordinates
- [ ] **LAND-02**: Admin can edit an existing airfield record
- [ ] **LAND-03**: Airfield list shows name; default sort by name

### System Users

- [ ] **USR-01**: Admin can create a system user with: first name (max 100), last name (max 100), email/login (max 100, validated), role (from dictionary: Administrator, Osoba planująca, Osoba nadzorująca, Pilot)
- [ ] **USR-02**: Admin can edit an existing system user record
- [ ] **USR-03**: User list shows email, role; default sort by email

### Planned Operations

- [ ] **OPS-01**: Planner can create a planned operation with: auto-assigned operation number, project reference number (max 30), short description (max 100), KML route file (1 file, max 5000 points, Poland territory), proposed earliest date (optional), proposed latest date (optional), operation types (multi-select from dictionary, min 1), additional info/priority notes (max 500, optional), contact persons (set of emails, optional), created_by (auto-set to current user's email, immutable)
- [ ] **OPS-02**: Route distance in km is automatically calculated from the KML file as the sum of Haversine distances between consecutive points
- [ ] **OPS-03**: KML route points are displayed on an interactive map within the operation form/view
- [ ] **OPS-04**: Operation has a 7-state status workflow: 1-Wprowadzone, 2-Odrzucone, 3-Potwierdzone do planu, 4-Zaplanowane do zlecenia, 5-Częściowo zrealizowane, 6-Zrealizowane, 7-Rezygnacja
- [ ] **OPS-05**: Planner can edit operations in statuses 1, 2, 3, 4, 5; planner cannot edit: auto-calculated fields, planned dates, status, post-completion notes, created_by
- [ ] **OPS-06**: Supervisor can edit operations in all statuses (full field access)
- [ ] **OPS-06b**: Post-completion notes (max 500 chars) are editable only when operation status ≥ 5 (Częściowo zrealizowane or Zrealizowane); editable by supervisor in all eligible statuses, not editable by planner
- [ ] **OPS-06c**: Operation detail view shows a list of all flight orders this operation has been linked to (read-only, auto-populated via the many-to-many relationship)
- [ ] **OPS-07**: Supervisor sees Reject (1→2) and Confirm (1→3, requires planned dates filled) action buttons when status = 1
- [ ] **OPS-08**: Planner sees Cancel (1,3,4 → 7) action button when status is 1, 3, or 4
- [ ] **OPS-09**: Status auto-transitions: 3→4 when operation is selected for a flight order; 4→5, 4→6, or 4→3 when pilot reports flight completion — all transitions that affect multiple records (link + cascade) execute in a single atomic DB transaction
- [ ] **OPS-10**: Every field change is recorded in history log: old value, new value, timestamp, user
- [ ] **OPS-11**: Multiple comments can be appended to an operation (comment text up to 500 chars each, stored as ordered list with timestamp and author user)
- [ ] **OPS-12**: Operation list shows: operation number, project ref, operation types, proposed earliest date, proposed latest date, planned earliest date, planned latest date, status; filterable (default filter: status 3); sorted by planned earliest date ascending

### Flight Orders

- [ ] **FLT-01**: Only Pilot can create a flight order (Osoba nadzorująca has edit/view only on Zlecenia); Pilot creates a flight order with: auto-assigned order number, planned start datetime, planned end datetime, pilot (auto-filled from the crew member record linked to the current logged-in Pilot user), helicopter (active only), crew members (multi-select, optional), start airfield, end airfield, selected planned operations (multi-select, status 3 only, sorted by planned earliest date)
- [ ] **FLT-02**: Crew total weight is auto-calculated: sum of pilot weight + all selected crew member weights
- [ ] **FLT-03**: Estimated route length is auto-calculated: sum of km from all selected operations
- [ ] **FLT-04**: Map displays: start airfield marker, all KML route points from selected operations, end airfield marker
- [ ] **FLT-05**: Save is blocked (with specific warning) if any of: helicopter inspection expired on flight date; pilot license expired on flight date; any crew member training expired on flight date; crew total weight exceeds helicopter max payload; estimated route length exceeds helicopter range
- [ ] **FLT-06**: Pilot can submit flight order for supervisor approval (1→2)
- [ ] **FLT-07**: Supervisor sees Accept (2→4) and Reject (2→3) action buttons when flight order status = 2
- [ ] **FLT-08**: Pilot sees completion reporting buttons when status = 4: "Zrealizowane w części" (4→5, all linked ops→5), "Zrealizowane w całości" (4→6, all linked ops→6), "Nie zrealizowane" (4→7, all linked ops→3)
- [ ] **FLT-09**: Real start and end datetime are required before a flight order can reach status 5 or 6
- [ ] **FLT-10**: Flight order list shows: order number, planned start datetime, helicopter, pilot, status; filterable (default filter: status 2); sorted by planned start datetime ascending
- [ ] **FLT-11**: When operations are added to a flight order, their status automatically changes from 3 to 4; this change and all cascade status changes execute in a single atomic DB transaction

## v2 Requirements

### Password Management

- **SEC-01**: User can reset forgotten password via email link
- **SEC-02**: Admin can force password reset for a user

### Notifications

- **NOTF-01**: Planner receives notification when their operation status changes
- **NOTF-02**: Pilot receives notification when their flight order is accepted or rejected

### Reporting

- **RPT-01**: Admin can export operations list to CSV/Excel
- **RPT-02**: Admin can export flight orders list to CSV/Excel

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic optimal route calculation | Explicitly excluded in PRD section 9 |
| Automatic route display (optimal path) | Explicitly excluded in PRD section 9 |
| Additional validations beyond PRD 6.6.c | Explicitly excluded in PRD section 9 |
| External API integrations | PRD section 8: no external system dependencies |
| Cloud deployment | User requirement: local/internal network only |
| Mobile app | Web-first, not mentioned in PRD |
| OAuth / SSO login | Email + password sufficient per PRD 7.4 |
| Real-time updates / WebSockets | No performance requirements per PRD 7.5 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Complete |
| HELI-01 | Phase 2 | Pending |
| HELI-02 | Phase 2 | Pending |
| HELI-03 | Phase 2 | Pending |
| CREW-01 | Phase 2 | Pending |
| CREW-02 | Phase 2 | Pending |
| CREW-03 | Phase 2 | Pending |
| CREW-04 | Phase 2 | Pending |
| LAND-01 | Phase 2 | Pending |
| LAND-02 | Phase 2 | Pending |
| LAND-03 | Phase 2 | Pending |
| USR-01 | Phase 2 | Pending |
| USR-02 | Phase 2 | Pending |
| USR-03 | Phase 2 | Pending |
| OPS-01 | Phase 3 | Pending |
| OPS-02 | Phase 3 | Pending |
| OPS-03 | Phase 3 | Pending |
| OPS-04 | Phase 3 | Pending |
| OPS-05 | Phase 3 | Pending |
| OPS-06 | Phase 3 | Pending |
| OPS-06b | Phase 3 | Pending |
| OPS-06c | Phase 3 | Pending |
| OPS-07 | Phase 3 | Pending |
| OPS-08 | Phase 3 | Pending |
| OPS-09 | Phase 3 | Pending |
| OPS-10 | Phase 3 | Pending |
| OPS-11 | Phase 3 | Pending |
| OPS-12 | Phase 3 | Pending |
| FLT-01 | Phase 4 | Pending |
| FLT-02 | Phase 4 | Pending |
| FLT-03 | Phase 4 | Pending |
| FLT-04 | Phase 4 | Pending |
| FLT-05 | Phase 4 | Pending |
| FLT-06 | Phase 4 | Pending |
| FLT-07 | Phase 4 | Pending |
| FLT-08 | Phase 4 | Pending |
| FLT-09 | Phase 4 | Pending |
| FLT-10 | Phase 4 | Pending |
| FLT-11 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 43 total (4 added from implementation checklist review)
- Mapped to phases: 43
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after implementation checklist review — 4 requirements added (AUTH-04, OPS-06b, OPS-06c, atomicity on OPS-09/FLT-11)*
