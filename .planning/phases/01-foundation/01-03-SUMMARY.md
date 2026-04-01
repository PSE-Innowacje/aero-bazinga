---
phase: 01-foundation
plan: "03"
subsystem: auth
tags: [auth, session, rbac, express-session, connect-pg-simple, react, login, sidebar, protected-route]

# Dependency graph
requires:
  - phase: 01-01
    provides: shared TypeScript types (SessionUser, UserRole, PERMISSIONS), React+Vite scaffold, shadcn/ui
  - phase: 01-02
    provides: users table, session table, pg.Pool connection
provides:
  - POST /api/auth/login — bcryptjs credential check, session creation
  - GET /api/auth/me — session restore on page refresh
  - POST /api/auth/logout — session destruction + cookie clear
  - Express session middleware (connect-pg-simple, httpOnly cookie, 24h TTL)
  - RBAC middleware: requireAuth, requireRole, requirePermission
  - React AuthContext with login/logout/session restore
  - ProtectedRoute component with section-based permission guard
  - AppShell layout (56px TopBar + collapsible Sidebar + content area)
  - Role-filtered Sidebar (NONE sections absent from DOM)
  - LoginPage with PSE branding, Polish labels, zod validation
affects: [phase-2, phase-3, phase-4]

# Tech tracking
tech-stack:
  added:
    - express-session + connect-pg-simple (PostgreSQL session store)
    - bcryptjs (password comparison)
    - react-hook-form + zod + @hookform/resolvers (login form validation)
    - lucide-react icons (Plane, Users, MapPin, UserCog, ClipboardList, FileText)
    - shadcn/ui: Button, Input, Label, Form, Card, Badge, Avatar, Tooltip, DropdownMenu, Separator
  patterns:
    - Session data stored in PostgreSQL session table via connect-pg-simple
    - All fetch calls use credentials: "include" for cookie forwarding
    - Section guard pattern: PERMISSIONS[role][section] !== NONE check in ProtectedRoute
    - DOM exclusion pattern: sidebar sections with NONE permission not rendered (D-07)
    - Express route prefix middleware: /api/admin, /api/operations, /api/flight-orders pre-guarded

key-files:
  created:
    - server/src/middleware/session.ts
    - server/src/middleware/rbac.ts
    - server/src/routes/auth.ts
    - server/src/types/express-session.d.ts
    - client/src/context/AuthContext.tsx
    - client/src/components/ProtectedRoute.tsx
    - client/src/components/layout/AppShell.tsx
    - client/src/components/layout/Sidebar.tsx
    - client/src/components/layout/TopBar.tsx
    - client/src/pages/LoginPage.tsx
    - client/src/pages/DashboardPage.tsx
    - client/src/pages/UnauthorizedPage.tsx
    - client/src/pages/NotFoundPage.tsx
  modified:
    - server/src/index.ts (session middleware mount, auth routes, RBAC prefix guards)
    - client/src/App.tsx (full routing tree with ProtectedRoute wrappers)
    - client/tailwind.config.ts (PSE color tokens)
    - shared/package.json (created — workspace package registration)
    - package.json (zod downgraded to 3.23.8)

key-decisions:
  - "httpOnly + sameSite strict cookie — no JS access to session token, CSRF mitigation"
  - "connect-pg-simple with createTableIfMissing: false — session table already in schema.sql"
  - "DOM exclusion for NONE-permission sections — hidden sections are a security risk if CSS loads late"
  - "zod pinned to 3.23.8 — v4 RC breaks Vite build (react-hook-form resolvers incompatible)"
  - "Plane icon used in place of Helicopter (lucide-react v0.468 does not include Helicopter)"

patterns-established:
  - "RBAC pattern: requirePermission(section, minLevel) middleware on route groups"
  - "Session restore pattern: GET /api/auth/me on AuthContext mount, isLoading flag prevents flash of /login"
  - "Protected route pattern: <ProtectedRoute section='...'>  redirects to /unauthorized on NONE permission"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: ~45min
completed: 2026-03-31
---

# Phase 1 Plan 03: Authentication + Shell Summary

**Express session auth (PostgreSQL store, httpOnly cookie) with bcryptjs login, RBAC middleware, and a role-filtered React shell — all four roles can authenticate and reach only their permitted sections**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-31T11:12:00Z
- **Completed:** 2026-03-31T12:00:00Z
- **Tasks:** 2 (+ 1 human-verify checkpoint)
- **Files modified:** 18 created/modified

## Accomplishments

- Complete server-side session flow: POST /api/auth/login validates credentials via bcryptjs, stores userId/email/role/firstName/lastName/crewMemberId in PostgreSQL-backed session; GET /api/auth/me restores session on refresh; POST /api/auth/logout destroys session and clears cookie
- RBAC middleware trio: requireAuth (session check), requireRole (enum match), requirePermission (section + level check against PERMISSIONS matrix) — all three used across route groups
- React AppShell with 56px TopBar (role badge, user name, logout) and collapsible Sidebar; sidebar filter uses `PERMISSIONS[role][section] !== NONE` so sections absent from DOM entirely for unauthorized roles (D-07)
- LoginPage with PSE #003E7E branding, Polish labels, react-hook-form + zod validation, inline error alerts
- All four requirements AUTH-01 through AUTH-04 satisfied; Pilot crewMemberId flows through session

## Task Commits

Each task was committed atomically:

1. **Task 1: Server-side session management, auth endpoints, and RBAC middleware** - (feat: session + auth routes + rbac middleware)
2. **Task 2: Frontend auth context, login page, app shell with role-filtered sidebar** - (feat: auth context + login page + app shell)

**Plan metadata:** (docs: complete 01-03 plan)

## Files Created/Modified

- `server/src/middleware/session.ts` — express-session with connect-pg-simple store, httpOnly+sameSite strict cookie, 24h TTL, SESSION_SECRET from env
- `server/src/middleware/rbac.ts` — requireAuth, requireRole, requirePermission exports; uses PERMISSIONS matrix from shared
- `server/src/routes/auth.ts` — POST /api/auth/login (bcryptjs compare, session write), GET /api/auth/me (session read), POST /api/auth/logout (session.destroy + clearCookie)
- `server/src/types/express-session.d.ts` — SessionData type augmentation (userId, email, role, firstName, lastName, crewMemberId)
- `server/src/index.ts` — session middleware applied before routes; authRouter mounted; /api/admin, /api/operations, /api/flight-orders prefixed with requireAuth + requirePermission guards
- `client/src/context/AuthContext.tsx` — SessionUser state, GET /api/auth/me on mount (AUTH-02), login/logout actions, isLoading flag
- `client/src/components/ProtectedRoute.tsx` — reads useAuth, redirects to /login or /unauthorized based on auth + section permission
- `client/src/components/layout/AppShell.tsx` — CSS flex layout: Sidebar left + content area right + TopBar at top
- `client/src/components/layout/Sidebar.tsx` — role-filtered NAV_SECTIONS (Plane/Helikoptery, Users/Członkowie załogi, MapPin/Lądowiska, UserCog/Użytkownicy, etc.), collapsed/expanded states, tooltip on collapsed icons
- `client/src/components/layout/TopBar.tsx` — "AERO" brand text, ROLE_DISPLAY_PL badge, user name, LogOut button (#D20A11)
- `client/src/pages/LoginPage.tsx` — shadcn Card centered, "AERO" navy heading, Polish subtitle, Email+Password inputs, "Zaloguj się" button, inline error alerts
- `client/src/pages/DashboardPage.tsx` — "Witaj, {firstName} {lastName}" welcome with role badge
- `client/src/pages/UnauthorizedPage.tsx` — ShieldAlert icon, "Brak dostępu", "Nie masz uprawnień do przeglądania tej sekcji."
- `client/src/pages/NotFoundPage.tsx` — "404" in accent red, "Strona nie istnieje"
- `client/src/App.tsx` — full routing tree: /login (public), / + /unauthorized + /admin/* + /operations/* + /flight-orders/* (protected with section guards), * (404)

## Decisions Made

- httpOnly + sameSite strict cookie chosen for session token — no JavaScript access, CSRF protection out of the box
- `createTableIfMissing: false` in connect-pg-simple — the session table is part of schema.sql (plan 01-02), not created by the session middleware
- DOM exclusion for NONE-permission sidebar sections — hiding via CSS would still render sensitive nav items in the DOM tree
- zod pinned to 3.23.8 (exact) — zod v4 RC was installed by default and broke Vite build; react-hook-form @hookform/resolvers is incompatible with v4 API changes
- Lucide `Plane` icon used instead of `Helicopter` — Helicopter does not exist in lucide-react v0.468

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created shared/package.json to register npm workspace**
- **Found during:** Task 1 (server imports from "shared/permissions")
- **Issue:** `shared/` directory existed with TypeScript files but had no package.json, so npm workspaces did not recognize it as a named package — `import from "shared/..."` resolved to nothing
- **Fix:** Created `shared/package.json` with `"name": "shared"`, `"main": "src/index.ts"`, pointing to source directly (tsx handles transpilation)
- **Files modified:** `shared/package.json`
- **Verification:** `import { PERMISSIONS } from "shared/permissions"` resolved correctly in server

**2. [Rule 1 - Bug] Downgraded zod from v4 RC to 3.23.8**
- **Found during:** Task 2 (LoginPage form validation)
- **Issue:** zod v4 RC (4.0.0-beta) was installed; Vite build failed with module resolution errors because @hookform/resolvers imports zod internals that changed in v4
- **Fix:** Changed `"zod": "^3.23.8"` in root package.json and reinstalled; both client and shared now use 3.23.8
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `vite build` and `tsc --noEmit` pass cleanly

**3. [Rule 1 - Bug] Reinstalled @hookform/resolvers (corrupt dist)**
- **Found during:** Task 2 (zod resolver import)
- **Issue:** After zod downgrade, @hookform/resolvers/zod still failed to import — dist was left in a partially overwritten state from the previous broken install
- **Fix:** Removed and reinstalled @hookform/resolvers via npm install
- **Files modified:** `package-lock.json`

**4. [Rule 1 - Bug] Replaced Helicopter icon with Plane**
- **Found during:** Task 2 (Sidebar icon imports)
- **Issue:** `import { Helicopter } from "lucide-react"` caused TypeScript error — Helicopter was added to lucide-react after v0.468 which is the pinned version
- **Fix:** Changed import to `Plane` which is semantically appropriate for a helicopter operations app and exists in v0.468
- **Files modified:** `client/src/components/layout/Sidebar.tsx`

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All fixes resolved pre-existing environment or dependency issues. No scope creep.

## Known Stubs

- `DashboardPage.tsx` — renders "Witaj, {firstName} {lastName}" welcome text only; no data-driven widgets. This is intentional — dashboard content will be added progressively as Phase 2/3/4 features are built. No plan goal is blocked by this stub.
- `/admin/*`, `/operations/*`, `/flight-orders/*` routes render `<PlaceholderPage>` text. These will be replaced in Phase 2 (admin panel) and Phase 3/4 (operations, flight orders).

## Next Phase Readiness

- Phase 2 (Admin Panel) can proceed: requirePermission("administracja", PermissionLevel.CRUD) middleware is already applied at /api/admin prefix
- All four roles can authenticate and navigate to their sections
- Sidebar links for /admin/helicopters, /admin/crew, /admin/airfields, /admin/users are present — Phase 2 only needs to implement the page components and register routes in App.tsx

---
*Phase: 01-foundation*
*Completed: 2026-03-31*
