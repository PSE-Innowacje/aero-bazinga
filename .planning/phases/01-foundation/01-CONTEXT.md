# Phase 1: Foundation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a working project structure, full database schema, and authentication system. All four roles (Administrator, Osoba planująca, Osoba nadzorująca, Pilot) can log in, stay logged in across refreshes, and land in their role-appropriate area. Role-based access enforced on both frontend (navigation/sections hidden) and backend (middleware per endpoint). No business features yet — this phase is pure infrastructure.

Plans in scope:
- 01-01: Project scaffolding — React + Node.js/Express + PostgreSQL + shared dev tooling
- 01-02: Database schema — all tables, constraints, FK relationships, seed data
- 01-03: Authentication — login endpoint, sessions, RBAC middleware, role-aware navigation shell

</domain>

<decisions>
## Implementation Decisions

### Language
- **D-01:** TypeScript throughout — both frontend (React) and backend (Node.js/Express). Strict mode enabled.

### Auth strategy
- **D-02:** HTTP-only cookie sessions (server-side). Use `express-session` with `connect-pg-simple` to store sessions in PostgreSQL. No JWT, no localStorage tokens. Cookie is httpOnly + sameSite=strict.
- **D-03:** Session contains: `userId`, `email`, `role`. Role is read from DB at login, stored in session — no re-querying per request for basic auth checks.

### First admin setup
- **D-04:** Seed script (`npm run seed`) creates the initial admin account with a default email/password defined in `.env`. If the admin record already exists, the seed is a no-op.

### Navigation layout
- **D-05:** Left collapsible sidebar — always visible on desktop/tablet, collapsible to icon-only on smaller screens.
- **D-06:** Sidebar structure matches PRD section 7.1 exactly:
  ```
  📂 Administracja
  ├── Helikoptery
  ├── Członkowie załogi
  ├── Lądowiska planowe
  └── Użytkownicy

  📂 Planowanie operacji
  └── Lista operacji

  📂 Zlecenia na lot
  └── Lista zleceń
  ```
- **D-07:** Sections hidden per role (NONE = not rendered in DOM, not just CSS hidden). Active route highlighted.

### UI component library
- **D-08:** shadcn/ui + Tailwind CSS. Custom color palette applied via `tailwind.config.ts`:
  - `primary`: #003E7E (PSE Navy) — main buttons, nav headers, headings
  - `accent`: #D20A11 (Energy Red) — CTA buttons, alerts, critical state indicators
  - `secondary`: #707070 (Steel Gray) — helper text, icons
  - `surface`: #F8F9FA — card/section backgrounds
  - `background`: #FFFFFF — main app background
  - `text`: #212529 (Text Dark) — body text
- **D-09:** Shadcn components customized to use the above palette. No default blue/violet shadcn colors in the final product.

### Responsiveness
- **D-10:** Desktop-first, mobile-adaptive. Breakpoints: desktop (≥1280px) primary, tablet (768–1279px) fully functional, mobile (<768px) readable and navigable but data entry optimized for desktop/tablet. Sidebar collapses to hamburger on mobile.

### Project structure (monorepo)
- **D-11:** Single repository with two top-level packages: `client/` (React) and `server/` (Node.js/Express). Shared types in `shared/` (TypeScript interfaces for API contracts, status enums, role constants).
- **D-12:** Status enums and role constants defined once in `shared/` and imported by both client and server — single source of truth.

### Database schema scope
- **D-13:** Phase 01-02 creates the COMPLETE schema for the entire application (not just Phase 1 tables). All tables needed for Phases 2–4 are created now so later phases only add data, not structure. Tables: `users`, `crew_members`, `helicopters`, `airfields`, `planned_operations`, `operation_types` (dictionary), `operation_contact_persons`, `operation_comments`, `operation_history`, `flight_orders`, `flight_order_operations` (join table).
- **D-14:** Status fields stored as integers (smallint). Roles stored as enum type in PostgreSQL.
- **D-15:** Pilot 1:1 link implemented as nullable `crew_member_id` FK on `users` table. When role = 'pilot', this FK must be non-null (enforced at app layer, not DB constraint, to allow admin creation flexibility).

### RBAC enforcement
- **D-16:** Backend middleware reads `req.session.role` and checks against a role-permission map. Applied at router level per section. Returns 403 JSON on unauthorized access.
- **D-17:** Frontend route guards implemented as a `<ProtectedRoute>` component that reads role from auth context and redirects to `/unauthorized` or `/` if access denied.

### Claude's Discretion
- ORM choice (Drizzle, Prisma, or raw `pg` queries)
- Password hashing library (bcrypt vs argon2)
- Session store TTL and cookie expiry duration
- Exact folder/file naming conventions within client/ and server/
- Loading states and error boundary implementation
- Login page visual design (layout, illustration or not)

</decisions>

<specifics>
## Specific Ideas

- The color scheme is PSE-branded (Polskie Sieci Elektroenergetyczne). Navy (#003E7E) and Red (#D20A11) are brand colors — must be used faithfully, not approximated.
- The sidebar should feel like a professional enterprise tool — not minimal/startup-y.
- Desktop is the primary use context (operators at workstations); mobile and tablet support matters for field/tablet use.
- All UI text, labels, status names, and error messages must be in Polish.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements and decisions
- `.planning/PROJECT.md` — Stack decisions, pilot 1:1 model, RBAC enforcement model, transaction requirements
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-04, full field specs for all entities (needed for complete DB schema in plan 01-02)
- `.planning/ROADMAP.md` — Phase 1 goal, plan breakdown, success criteria

### Domain reference
- `AERO PRD.md` — Full field specs (sections 6.1–6.6) for complete DB schema; permissions matrix (section 7.2); menu structure (section 7.1)
- `COLOR SCHEME.md` — Exact hex values for all color tokens

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code.

### Established Patterns
- None yet — this phase establishes the patterns all future phases follow.

### Integration Points
- This phase creates the foundation all other phases build on: DB schema, session middleware, RBAC middleware, navigation shell, shared types.

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-31*
