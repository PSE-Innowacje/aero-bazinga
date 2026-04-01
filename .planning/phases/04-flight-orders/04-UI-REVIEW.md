# Phase 4 -- UI Review

**Audited:** 2026-03-31
**Baseline:** UI-SPEC.md (Phase 1 design contract)
**Screenshots:** Captured (desktop 1440x900, tablet 768x1024, mobile 375x812) -- login page visible (unauthenticated state)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All user-facing labels in Polish per spec; sidebar "Dashboard" label remains in English |
| 2. Visuals | 3/4 | Strong visual hierarchy; detail pages well-structured with cards, maps, and status badges |
| 3. Color | 3/4 | PSE brand palette applied correctly via tokens; status badges use default Tailwind colors outside the declared palette |
| 4. Typography | 3/4 | Custom text scale (label/body/heading/display) used consistently; `text-base` and `text-2xl` appear outside the 4-size contract |
| 5. Spacing | 3/4 | Custom spacing tokens (xs/sm/md/lg/xl/2xl) used consistently throughout; some arbitrary pixel values in brackets |
| 6. Experience Design | 4/4 | Loading, error, and empty states present on every data page; disabled states for submitting actions; real-time validation on flight orders |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Sidebar "Dashboard" label is in English** -- Breaks the all-Polish UI contract (CONTEXT.md Specifics, UI-SPEC Copywriting Contract) -- Change `{ label: "Dashboard", path: "/", icon: LayoutDashboard }` in `Sidebar.tsx:59` to `{ label: "Pulpit", ... }` or `{ label: "Strona glowna", ... }`.

2. **Status badges use default Tailwind color classes instead of PSE brand tokens** -- Colors like `bg-blue-100`, `bg-green-100`, `bg-orange-100` are outside the declared palette (`#003E7E`, `#D20A11`, `#707070`, `#F8F9FA`) -- Replace StatusBadge color maps in `OperationsListPage.tsx:34-40`, `OperationDetailPage.tsx:24-30`, `FlightOrdersListPage.tsx:47-53`, `FlightOrderDetailPage.tsx:24-30` with PSE-derived semantic classes (e.g., `bg-primary/10 text-primary` for confirmed, `bg-accent/10 text-accent` for rejected).

3. **"Confirm" and "Accept" buttons use `bg-green-700` outside the design system** -- `OperationDetailPage.tsx:303` and `FlightOrderDetailPage.tsx:405,419` use `bg-green-700` which is not a declared PSE color -- Use `bg-primary text-white hover:bg-primary-hover` for affirmative actions, or define a `success` token in `tailwind.config.ts` if green is required.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

All critical UI copy matches the UI-SPEC contract:
- Login page: "AERO", "System zarzadzania operacjami lotniczymi", "Email", "Haslo", "Zaloguj sie" -- all correct
- Error messages: "Nieprawidlowy email lub haslo. Sprobuj ponownie.", "Blad serwera. Skontaktuj sie z administratorem." -- match spec
- Sidebar sections: "ADMINISTRACJA", "PLANOWANIE OPERACJI", "ZLECENIA NA LOT" -- match spec
- Sidebar items: "Helikoptery", "Czlonkowie zalogi", "Ladowiska planowe", "Uzytkownicy", "Lista operacji", "Lista zlecen" -- match spec
- Sidebar collapse tooltip: "Zwin menu" / "Rozwin menu" -- match spec
- Logout: "Wyloguj sie" -- match spec

**Issues found:**
- `Sidebar.tsx:59` -- `label: "Dashboard"` is in English, not Polish. Every other label in the UI is Polish. This should be "Pulpit" or "Strona glowna".
- Form pages use good domain-specific Polish copy: "Nowa operacja", "Edytuj helikopter", "Zapisz zmiany", "Utworz zlecenie", "Przekaz do akceptacji", etc.
- Empty states are all in Polish: "Brak helikopterow.", "Brak zlecen dla wybranego filtra.", "Brak komentarzy." -- good.
- Loading states: "Ladowanie..." consistently used -- good.

### Pillar 2: Visuals (3/4)

**Strengths:**
- Login page: Clean centered card with AERO branding, good focal point. Screenshot confirms correct layout at all breakpoints.
- Page headers consistently use `text-heading font-semibold text-primary` with action buttons right-aligned -- strong visual hierarchy.
- Detail pages (OperationDetailPage, FlightOrderDetailPage) use well-structured card sections with `h2` subheadings, `dl` definition lists for key-value pairs, and distinct sections for maps, comments, history.
- StatusBadge components provide visual differentiation for operation/flight order statuses.
- Icon-only buttons have `aria-label` attributes (e.g., `HelicoptersPage.tsx:107` "Edytuj helikopter", `UsersPage.tsx:110` "Edytuj uzytkownika") -- good accessibility.
- Sidebar collapse button has `aria-label` with dynamic text -- good.
- Map integration (Leaflet) with route visualization provides rich context on operation/flight order detail pages.

**Issues found:**
- FlightOrderDetailPage has a large number of action buttons when `canComplete` is true (3 buttons: "Zrealizowane w czesci", "Zrealizowane w calosci", "Nie zrealizowane") plus Edit -- this may crowd the header on smaller viewports. The `flex-wrap` class handles it but the visual density is high.
- No confirmation dialog for destructive actions like "Odrzuc" or "Anuluj operacje" -- single-click executes the status transition. While the UI-SPEC does not mandate confirmation for these (only logout is "immediate"), industry practice suggests confirmation for irreversible status changes.

### Pillar 3: Color (3/4)

**Token compliance:**
- `tailwind.config.ts` correctly defines all PSE brand tokens: `primary: #003E7E`, `accent: #D20A11`, `secondary: #707070`, `surface: #F8F9FA`, `background: #FFFFFF`, `text: #212529`.
- CSS variables in `index.css` map to correct HSL values for shadcn integration.
- Primary buttons use `bg-primary text-white hover:bg-primary-hover` consistently.
- Error alerts use `border-accent bg-[#FFF5F5] text-accent` consistently across all pages.
- Sidebar uses `bg-surface` and `border-border-subtle` per spec.
- Active nav items use `bg-primary text-white` per spec.
- Logout button uses `text-accent` (Energy Red) per spec.

**Issues found:**
- StatusBadge components across 4 files use raw Tailwind colors: `bg-blue-100`, `bg-red-100`, `bg-green-100`, `bg-orange-100`, `bg-yellow-100`, `bg-gray-100`, `bg-slate-100`. These are default Tailwind palette colors not in the PSE brand system. UI-SPEC states "No default shadcn blue/violet/slate palette must be fully overridden."
- Confirm/Accept buttons use `bg-green-700 text-white hover:bg-green-800` (OperationDetailPage:303, FlightOrderDetailPage:405). Green is not in the declared palette.
- `bg-orange-600` used for partial completion button (FlightOrderDetailPage:418).
- Hardcoded hex `#FFF5F5` used in ~15 locations for error backgrounds -- should be extracted to a token (e.g., `accent-surface` or `destructive-bg`).
- Hardcoded hex `#EBF2FA` used in DashboardPage:117 for primary icon background -- should be tokenized.
- Map markers use inline `style` with `#16a34a` (green, not in palette) and `#D20A11` -- inline styles are acceptable for Leaflet but the green is off-brand.
- Map polyline colors include `#2563eb`, `#9333ea`, `#ea580c` (FlightOrderFormPage:98) -- outside PSE palette, but reasonable for multi-route differentiation.

### Pillar 4: Typography (3/4)

**Token compliance:**
- Custom `fontSize` tokens defined correctly: `label` (12px/1.4/600), `body` (14px/1.5/400), `heading` (20px/1.2/600), `display` (28px/1.1/600).
- Page titles consistently use `text-heading font-semibold text-primary`.
- AERO logo text uses `text-display font-semibold text-primary` (LoginPage:87).
- Form labels use `text-label font-semibold`.
- Body text uses `text-body text-text-muted` for loading/empty states.
- Only two font weights in use: 400 (regular) and 600 (semibold) -- matches spec.
- Inter font loaded via Google Fonts import in `index.css:1`.

**Issues found:**
- `text-2xl` used in DashboardPage:134 for stat card values -- not in the 4-size contract (label/body/heading/display). Should use `text-heading` or a custom `stat` size.
- `text-base` used in LoginPage:157 for submit button and in OperationDetailPage:340,391,398,414,460 for section headings. `text-base` (16px) is not in the declared 4-size scale. Section subheadings should use `text-heading` (20px) or `text-body` (14px).
- `text-sm` used extensively alongside `text-body` -- both map to 14px so functionally equivalent, but `text-sm` does not include the line-height/weight config of `text-body`. Prefer `text-body` for consistency.
- `text-xs` used for label-like content -- functionally similar to `text-label` (12px) but without the semibold weight. Acceptable where regular weight at 12px is needed.
- `font-medium` (500 weight) used in DashboardPage:131, OperationDetailPage:42, and several table headers -- the spec declares only 400 and 600, making 500 an extra weight. This is a minor deviation as Inter supports it, but it adds a third visual weight.

### Pillar 5: Spacing (3/4)

**Token compliance:**
- Custom spacing tokens defined: `xs` (4px), `sm` (8px), `md` (16px), `lg` (24px), `xl` (32px), `2xl` (48px), `3xl` (64px).
- AppShell main content uses `p-xl` (32px) -- matches spec.
- Sidebar uses `px-md` (16px) for nav item padding, `gap-sm` (8px) for icon-to-label gap, `h-10` (40px) for nav item height -- all match spec.
- Form spacing uses `space-y-md` (16px) consistently.
- Page title to content gap uses `mb-xl` (32px) consistently.
- Login card uses inline `paddingTop: "48px"` / `paddingLeft: "32px"` matching the spec (48px vertical, 32px horizontal).
- Collapse button uses `min-w-[44px] min-h-[44px]` for WCAG 2.5.5 touch target -- matches spec.
- Sidebar width: `w-60` (240px) expanded, `w-16` (64px) collapsed -- matches spec.

**Issues found:**
- Arbitrary bracket values used for component widths: `w-[220px]`, `w-[260px]`, `w-[200px]`, `max-w-[400px]`, `h-[44px]`, `h-[300px]`, `min-h-[80px]`, `min-h-[120px]`, `max-h-[200px]`. While some are justified (select trigger widths, login card max-width matching spec), the volume suggests room for tokenization.
- `px-3 py-2` used in inline textarea styles (OperationDetailPage:435, OperationFormPage:18) instead of token-based `px-sm py-sm` or `p-sm`.
- `p-4` in alert.tsx:7 instead of `p-md`.
- `space-y-1.5` and `p-6` in card.tsx:28,63 -- standard shadcn defaults, minor inconsistency with the 4px grid.
- LoginPage uses inline `style` for card padding instead of Tailwind classes -- functional but inconsistent with the rest of the codebase.

### Pillar 6: Experience Design (4/4)

**Loading states:**
- Every data-fetching page has `isLoading` state with "Ladowanie..." text feedback.
- ProtectedRoute shows a spinner during auth check.
- Form submission states show "Zapisywanie...", "Logowanie...", "Wysylanie..." with disabled buttons.

**Error states:**
- Every fetch has `.catch()` with Polish error messages displayed in styled alert boxes.
- Server errors show "Blad serwera. Skontaktuj sie z administratorem." or specific messages.
- Form validation errors display inline below fields with `text-accent` styling.
- Status transition errors display in alert boxes above content.

**Empty states:**
- "Brak helikopterow. Dodaj pierwszy helikopter." (HelicoptersPage:70)
- "Brak zlecen dla wybranego filtra." (FlightOrdersListPage:160)
- "Brak operacji dla wybranego filtra." (OperationsListPage:149)
- "Brak komentarzy." (OperationDetailPage:417)
- "Brak dodatkowych czlonkow zalogi." (FlightOrderDetailPage:568)
- "Brak dostepnych czlonkow zalogi." (FlightOrderFormPage:565)
- "Brak punktow trasy do wyswietlenia." (OperationDetailPage:112)

**Disabled states:**
- Submit buttons disabled during submission with `disabled={isSubmitting}`.
- FlightOrderFormPage disables submit when validation warnings exist: `disabled={isSubmitting || validationWarnings.length > 0}`.
- Status action buttons disabled during API calls: `disabled={statusActionLoading}`.

**Advanced UX patterns:**
- Real-time dry-validation on FlightOrderFormPage with debounced API calls (500ms).
- Validation warnings displayed as orange alert with itemized list before form submission.
- Flight order form shows auto-calculated crew weight and estimated route length.
- Map preview updates live as airfields and operations are selected.
- Character counters on textareas (e.g., "420/500").
- Collapsible history section on OperationDetailPage to reduce visual noise.
- RBAC-aware button visibility (edit/confirm/reject buttons only shown when user has permission and status allows it).

---

## Registry Safety

No `components.json` found in project root. Shadcn components are present but registry audit skipped (no third-party registries declared in UI-SPEC).

---

## Files Audited

- `client/tailwind.config.ts` -- Design tokens
- `client/src/index.css` -- CSS variables and global styles
- `client/src/components/layout/Sidebar.tsx` -- Navigation sidebar
- `client/src/components/layout/AppShell.tsx` -- Layout shell
- `client/src/components/ProtectedRoute.tsx` -- Route guard with loading state
- `client/src/components/ui/button.tsx` -- Button variants
- `client/src/components/ui/card.tsx` -- Card component
- `client/src/components/ui/select.tsx` -- Select component
- `client/src/components/ui/alert.tsx` -- Alert component
- `client/src/components/ui/date-picker.tsx` -- Date and DateTime pickers
- `client/src/pages/LoginPage.tsx` -- Login page
- `client/src/pages/DashboardPage.tsx` -- Dashboard with role-specific widgets
- `client/src/pages/admin/HelicoptersPage.tsx` -- Helicopters list
- `client/src/pages/admin/HelicopterFormPage.tsx` -- Helicopter form
- `client/src/pages/admin/UsersPage.tsx` -- Users list with tab navigation
- `client/src/pages/admin/PermissionsPage.tsx` -- Permissions matrix editor
- `client/src/pages/operations/OperationsListPage.tsx` -- Operations list with status filter
- `client/src/pages/operations/OperationFormPage.tsx` -- Operation form with file upload
- `client/src/pages/operations/OperationDetailPage.tsx` -- Operation detail with map, comments, history
- `client/src/pages/flight-orders/FlightOrdersListPage.tsx` -- Flight orders list with status filter
- `client/src/pages/flight-orders/FlightOrderFormPage.tsx` -- Flight order form with live validation and map
- `client/src/pages/flight-orders/FlightOrderDetailPage.tsx` -- Flight order detail with completion dialog
