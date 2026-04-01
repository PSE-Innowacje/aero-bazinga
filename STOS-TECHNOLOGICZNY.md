# Stos technologiczny — AERO

## Frontend

| Technologia | Wersja | Opis | Dlaczego? |
|-------------|--------|------|-----------|
| **React** | 18.3 | Biblioteka do budowania interfejsów użytkownika opartych na komponentach | Standard rynkowy, ogromny ekosystem, komponenty reaktywne |
| **TypeScript** | 5.7 | Nadzbiór JavaScript z typowaniem statycznym | Bezpieczeństwo typów, lepsza refaktoryzacja, autouzupełnianie w IDE |
| **Vite** | 6.0 | Nowoczesny bundler i serwer deweloperski | Błyskawiczny HMR, szybki cold start, wsparcie ESM |
| **Tailwind CSS** | 3.4 | Narzędziowy framework CSS (utility-first) | Szybkie prototypowanie, spójny design system, brak osobnych plików CSS |
| **shadcn/ui** | — | Zbiór gotowych komponentów UI opartych na Radix UI | Dostępność (a11y), pełna kontrola nad kodem, integracja z Tailwind |
| **React Router** | 6.28 | Routing po stronie klienta (SPA) | Standard dla React, zagnieżdżone trasy, ochrona tras |
| **React Hook Form** | 7.59 | Zarządzanie formularzami z walidacją | Wydajność (minimalne re-rendery), integracja z zod |
| **Zod** | 3.23 | Deklaratywna walidacja schematów danych | Walidacja formularzy na frontendzie, typowanie TypeScript z inferencją |
| **Leaflet** | 1.9 | Interaktywne mapy open-source | Wyświetlanie tras KML, znaczników lądowisk, brak wymaganych kluczy API |
| **react-leaflet** | 4.2 | Integracja Leaflet z React (komponenty deklaratywne) | Mapa jako komponent React, łatwe zarządzanie stanem |
| **react-day-picker** | 8.10 | Komponent wyboru daty z kalendarzem | Polski locale, integracja z date-fns, lepszy UX niż natywny input |
| **date-fns** | 3.6 | Biblioteka do operacji na datach | Lekka, modularna, wspiera lokalizację (pl) |
| **Lucide React** | 0.468 | Zestaw ikon SVG jako komponenty React | Lekkie, spójne, tree-shakeable |
| **clsx + tailwind-merge** | — | Narzędzia do łączenia klas CSS | Warunkowe klasy, rozwiązywanie konfliktów Tailwind |
| **class-variance-authority** | 0.7 | Zarządzanie wariantami komponentów (np. Button) | Typowane warianty, spójny API dla shadcn/ui |

### Radix UI (primitives)

| Komponent | Zastosowanie |
|-----------|-------------|
| `react-select` | Rozwijane listy (status, rola, helikopter) |
| `react-dialog` | Okna modalne |
| `react-popover` | Menu kontekstowe profilu, kalendarz |
| `react-tooltip` | Podpowiedzi w zwiniętym sidebarze |
| `react-label` | Etykiety formularzy z dostępnością |
| `react-dropdown-menu` | Menu rozwijane |
| `react-separator` | Separatory wizualne |
| `react-avatar` | Awatary użytkowników |

---

## Backend

| Technologia | Wersja | Opis | Dlaczego? |
|-------------|--------|------|-----------|
| **Node.js** | 24.x | Środowisko uruchomieniowe JavaScript po stronie serwera | Jeden język (TypeScript) na frontendzie i backendzie |
| **Express** | 4.21 | Minimalistyczny framework webowy | Standard, elastyczność, ogromny ekosystem middleware |
| **TypeScript** | 5.7 | Typowanie statyczne dla Node.js | Spójność z frontendem, bezpieczeństwo typów w API |
| **tsx** | 4.19 | Uruchamianie TypeScript bez kompilacji | Szybki development z hot reload (`tsx watch`) |
| **express-session** | 1.18 | Zarządzanie sesjami użytkowników | Sesje HTTP-only cookie, bezpieczne przechowywanie stanu |
| **connect-pg-simple** | 10.0 | Przechowywanie sesji w PostgreSQL | Sesje przeżywają restart serwera, współdzielenie między instancjami |
| **bcryptjs** | 2.4 | Hashowanie haseł (implementacja JS) | Bezpieczne przechowywanie haseł, koszt hashowania 12 |
| **helmet** | 8.0 | Nagłówki bezpieczeństwa HTTP | Ochrona przed XSS, clickjacking, MIME sniffing |
| **cors** | 2.8 | Obsługa Cross-Origin Resource Sharing | Kontrola dostępu z frontendu na innym porcie |
| **express-rate-limit** | 8.3 | Ograniczanie liczby żądań (rate limiting) | Ochrona przed brute-force na endpoincie logowania |
| **multer** | 2.1 | Obsługa uploadu plików (multipart/form-data) | Upload plików KML z walidacją rozszerzenia |
| **fast-xml-parser** | 5.5 | Parser XML (do plików KML) | Czysty JS, brak zależności natywnych, działa w ESM |
| **pg** | 8.20 | Klient PostgreSQL dla Node.js | Surowe zapytania SQL, pełna kontrola, pool połączeń |
| **dotenv** | 16.4 | Ładowanie zmiennych środowiskowych z pliku .env | Konfiguracja bez hardkodowania sekretów |

---

## Baza danych

| Technologia | Wersja | Opis | Dlaczego? |
|-------------|--------|------|-----------|
| **PostgreSQL** | 17.x | Relacyjna baza danych open-source | ACID, enum types, JSON, sekwencje, sprawdzone w produkcji |

### Architektura bazy

| Element | Szczegóły |
|---------|-----------|
| Tabel | 16 (crew_members, users, session, helicopters, airfields, operation_types, planned_operations, planned_operation_types, operation_contact_persons, operation_comments, operation_history, flight_orders, flight_order_crew_members, flight_order_operations, crew_roles, role_permissions) |
| Podejście | Raw SQL (bez ORM) — `schema.sql` jest kanonicznym źródłem prawdy |
| Migracje | Idempotentne (`IF NOT EXISTS`), bezpieczne do ponownego uruchomienia |
| Sesje | Tabela `session` via connect-pg-simple |
| Sekwencje | `operation_number_seq`, `order_number_seq` dla autonumeracji |
| Enum | `user_role` — PostgreSQL enum (superadmin, administrator, planner, supervisor, pilot) |
| Status | SMALLINT (1-7) — wydajniejszy niż string, mapowany na etykiety w shared/ |

---

## Testy

| Technologia | Wersja | Opis | Dlaczego? |
|-------------|--------|------|-----------|
| **Vitest** | 4.1 | Framework testów jednostkowych | Natywna integracja z Vite/TypeScript, szybki, API kompatybilne z Jest |
| **Playwright** | 1.58 | Framework testów E2E (przeglądarkowych) | Stabilne selektory, auto-wait, wieloprzeglądarkowe, headless |

### Pokrycie testów

| Typ | Testów | Zakres |
|-----|:------:|--------|
| **Unit (Vitest)** | 66 | Haversine, KML parser, uprawnienia, statusy, role, 6 reguł walidacji zleceń |
| **E2E (Playwright)** | 65 | Auth/RBAC, admin CRUD, operacje, zlecenia, dashboard, uprawnienia, user stories |
| **Łącznie** | **131** | |

---

## Narzędzia AI

| Narzędzie | Model | Zastosowanie | Dlaczego? |
|-----------|-------|-------------|-----------|
| **Claude Code CLI** | Sonnet 4.6 | Pair programming — generowanie kodu, implementacja, refaktoryzacja, testy | Autonomiczne kodowanie z commitami, rozumienie kontekstu projektu |
| **Claude Code CLI** | Opus 4.6 | Code review — przegląd bezpieczeństwa, analiza architektury | Niezależny model weryfikuje kod napisany przez Sonnet (cross-review) |
| **GSD Workflow System** | — | Orkiestracja agentów AI — planowanie, wykonanie, weryfikacja | Strukturalny workflow: discuss → plan → execute → test → review |

### Workflow GSD

| Komenda | Etap | Opis |
|---------|------|------|
| `/gsd:new-project` | Inicjalizacja | Analiza PRD, tworzenie roadmapy, wymagań |
| `/gsd:discuss-phase` | Dyskusja | Omówienie szarych stref i decyzji z użytkownikiem |
| `/gsd:ui-phase` | Projektowanie | Kontrakt wizualny (UI-SPEC.md) |
| `/gsd:plan-phase` | Planowanie | Szczegółowe plany implementacji z zadaniami |
| `/gsd:execute-phase` | Wykonanie | Autonomiczne kodowanie z atomic commits |
| `/gsd:add-tests` | Testowanie | Generowanie testów jednostkowych i E2E |
| `/gsd:review` | Przegląd | Cross-AI code review (Opus weryfikuje Sonnet) |
| `/gsd:ui-review` | Audyt UI | 6-filarowy audyt wizualny |

---

## Narzędzia deweloperskie

| Narzędzie | Zastosowanie |
|-----------|-------------|
| **npm workspaces** | Monorepo — client, server, shared jako osobne pakiety |
| **Git** | Kontrola wersji, 45 commitów, conventional commits |
| **PostCSS + Autoprefixer** | Przetwarzanie CSS, kompatybilność przeglądarek |
| **tailwindcss-animate** | Animacje CSS dla komponentów shadcn/ui |

---

*Dokument wygenerowany: kwiecień 2026*
*Projekt: AERO v1.0 — PSE Innowacje*
