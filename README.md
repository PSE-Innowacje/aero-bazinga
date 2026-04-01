# AERO

System zarządzania operacjami lotniczymi helikopterów.

Aplikacja webowa do ewidencji planowanych operacji lotniczych, przygotowania zleceń na lot helikopterem oraz kontroli dostępu opartej na rolach.

## Stos technologiczny

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Leaflet.js, sonner
- **Backend:** Node.js, Express, TypeScript, express-rate-limit, helmet
- **Baza danych:** PostgreSQL (16 tabel, raw SQL)
- **Autoryzacja:** Sesje HTTP-only cookie (express-session + connect-pg-simple)
- **Testy:** Vitest (67 jednostkowych), Playwright (65 E2E) — 132 łącznie
- **AI Tooling:** Claude Code CLI (Sonnet 4.6 + Opus 4.6), GSD Workflow System

## Wymagania wstępne

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

## Instalacja

```bash
# Klonowanie i instalacja zależności
git clone <repo-url>
cd aero-bazinga
npm install

# Utworzenie bazy danych
createdb aero

# Konfiguracja środowiska
cp server/.env.example server/.env
# Edytuj server/.env — ustaw DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# Migracja schematu i dane początkowe
npm run migrate -w server
npm run seed -w server

# Dane demonstracyjne (opcjonalne)
npm run seed:demo

# Instalacja przeglądarki Playwright (do testów E2E)
npx playwright install chromium
```

### Zmienne środowiskowe

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `DATABASE_URL` | Adres połączenia PostgreSQL | `postgresql://user:pass@localhost:5432/aero` |
| `SESSION_SECRET` | Klucz szyfrowania sesji | Losowy ciąg 64 znaków |
| `ADMIN_EMAIL` | Email domyślnego administratora | `admin@aero.local` |
| `ADMIN_PASSWORD` | Hasło domyślnego administratora | `Admin123!` |
| `PORT` | Port serwera | `3000` |
| `CORS_ORIGIN` | Dozwolony origin CORS | `http://localhost:5173` |

## Uruchamianie

```bash
# Uruchom serwer i klienta
npm run dev:server   # Express na porcie 3000
npm run dev:client   # Vite na porcie 5173
```

Otwórz http://localhost:5173 i zaloguj się danymi administratora z pliku `.env`.

## Testy

```bash
# Testy jednostkowe (67 testów)
npm test

# Testy E2E (65 testów) — wymaga uruchomionego serwera i klienta
npm run test:e2e

# Testy E2E z interfejsem graficznym
npm run test:e2e:ui

# Tryb nasłuchiwania zmian (testy jednostkowe)
npm run test:watch
```

### Pokrycie testów

| Typ | Testów | Zakres |
|-----|:------:|--------|
| Unit (Vitest) | 67 | Haversine, KML parser, uprawnienia, statusy, role, 6 reguł walidacji zleceń |
| E2E (Playwright) | 65 | Auth/RBAC, admin CRUD, operacje, zlecenia, dashboard, uprawnienia, user stories |
| **Łącznie** | **132** | |

## Struktura projektu

```
aero-bazinga/
├── client/                 # Frontend React (Vite)
│   ├── src/
│   │   ├── components/     # 24 komponenty UI (shadcn/ui + layout + custom)
│   │   ├── context/        # AuthContext z dynamicznymi uprawnieniami
│   │   └── pages/          # 19 stron
│   │       ├── admin/      # Helikoptery, załoga, lądowiska, użytkownicy, uprawnienia
│   │       ├── operations/  # Planowane operacje — lista, formularz, szczegóły
│   │       └── flight-orders/ # Zlecenia na lot — lista, formularz, szczegóły
│   └── index.html
├── server/                 # Backend Express
│   ├── src/
│   │   ├── db/             # Pula połączeń, migracje, seed, demo-seed, cache uprawnień
│   │   ├── middleware/     # Sesja, RBAC (hierarchia NONE < READ < EDIT_VIEW < CRUD)
│   │   ├── routes/         # 40+ endpointów API
│   │   └── utils/          # Parser KML, Haversine, walidacja zleceń
│   └── .env
├── shared/                 # Wspólne typy TypeScript, enumy, uprawnienia
│   └── src/
├── e2e/                    # 7 plików testów E2E Playwright
├── prezentacja.html        # Interaktywna prezentacja projektu
├── stos-technologiczny.html # Szczegółowy opis stosu technologicznego
└── .planning/              # Artefakty planowania projektu (GSD)
```

## Role użytkowników

| Rola | Nazwa w systemie | Dostęp |
|------|-----------------|--------|
| Superadmin | Superadministrator | Pełny dostęp do wszystkich sekcji |
| Administrator | Administrator systemu | Panel administracyjny (CRUD), podgląd operacji i zleceń |
| Planista | Osoba planująca | Tworzenie i edycja planowanych operacji |
| Nadzorca | Osoba nadzorująca | Potwierdzanie/odrzucanie operacji, akceptacja/odrzucenie zleceń na lot |
| Pilot | Pilot | Tworzenie zleceń na lot, raportowanie realizacji |

Uprawnienia są dynamiczne i edytowalne przez administratora w `/admin/permissions`.

## Numeracja

- **Numer operacji:** `NO-2026-XXXX` (Numer Operacji)
- **Numer zlecenia:** `NZ-2026-XXXX` (Numer Zlecenia)

## Główne funkcjonalności

- **Planowane operacje:** Upload plików KML (drag & drop), wyświetlanie trasy na mapie Leaflet, 7-stanowy obieg statusów, historia zmian pól z polskimi etykietami, komentarze
- **Zlecenia na lot:** Powiązanie z potwierdzonymi operacjami, 5 reguł walidacji (waga, liczba załogi, zasięg, licencja, szkolenie) + przegląd helikoptera, kaskadowe zmiany statusów
- **Dashboard:** Statystyki dostosowane do roli, oczekujące działania, wygasające i wygasłe certyfikaty/licencje
- **RBAC:** Dynamiczna macierz uprawnień z edytorem, hierarchia NONE < READ < EDIT_VIEW < CRUD, ukrywanie elementów UI per rola, wymuszanie na backendzie
- **Bezpieczeństwo:** Rate limiting na logowaniu, HTTP-only cookies, helmet headers, walidacja env vars na starcie
- **KML:** Walidacja granic Polski (z wykluczeniem narożników Czech/Niemiec/Słowacji), parsowanie współrzędnych, obliczanie odległości formułą Haversine
- **UX:** Toast notifications (sonner), skeleton loaders, date picker z polskim locale, wyszukiwanie w tabelach
- **Polski interfejs:** Wszystkie etykiety, komunikaty, statusy i walidacje w języku polskim

## Dane demonstracyjne

```bash
npm run seed:demo
```

Tworzy realistyczne dane testowe:
- 4 helikoptery (3 aktywne, 1 nieaktywny)
- 8 lądowisk PSE w Polsce
- 6 członków załogi (3 pilotów, 3 obserwatorów)
- 5 użytkowników demo (2 pilotów, 2 planistów, 1 nadzorca)
- 8 operacji w różnych statusach
- 2 zlecenia na lot
- 3 komentarze

Hasło dla wszystkich kont demo: `Admin123!`

## API

Wszystkie endpointy znajdują się pod `/api`:

- `POST /api/auth/login` | `GET /api/auth/me` | `POST /api/auth/logout`
- `GET/POST /api/admin/helicopters` | `GET/PUT/DELETE /:id`
- `GET/POST /api/admin/crew` | `GET/PUT/DELETE /:id`
- `GET/POST /api/admin/airfields` | `GET/PUT/DELETE /:id`
- `GET/POST /api/admin/users` | `GET/PUT/DELETE /:id`
- `GET/PUT /api/admin/permissions`
- `GET/POST /api/operations` | `GET/PUT /:id` | `POST /:id/status` | `GET/POST /:id/comments`
- `GET/POST /api/flight-orders` | `GET/PUT /:id` | `POST /:id/status`
- `GET /api/dashboard`

## Projekt w liczbach

| Metryka | Wartość |
|---------|--------|
| Pliki źródłowe | 81 |
| Linie kodu | 13 398 |
| Commity git | 56 |
| Tabele w bazie danych | 16 |
| Endpointy API | 40+ |
| Strony React | 19 |
| Komponenty UI | 24 |
| Testy (unit + E2E) | 132 |
| Wymagania PRD v1 | 43/43 |
| Czas realizacji | ~9 godzin |

## Licencja

Własność — PSE Innowacje
