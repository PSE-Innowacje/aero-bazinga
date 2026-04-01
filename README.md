# AERO

System zarządzania operacjami lotniczymi helikopterów.

Aplikacja webowa do ewidencji planowanych operacji lotniczych, przygotowania zleceń na lot helikopterem oraz kontroli dostępu opartej na rolach.

## Stos technologiczny

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Leaflet.js
- **Backend:** Node.js, Express, TypeScript
- **Baza danych:** PostgreSQL
- **Autoryzacja:** Sesje HTTP-only cookie (express-session + connect-pg-simple)
- **Testy:** Vitest (jednostkowe), Playwright (E2E)

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

# Instalacja przeglądarki Playwright (do testów E2E)
npx playwright install chromium
```

### Zmienne środowiskowe

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `DATABASE_URL` | Adres połączenia PostgreSQL | `postgresql://user@localhost:5432/aero` |
| `SESSION_SECRET` | Klucz szyfrowania sesji | Losowy ciąg 64 znaków |
| `ADMIN_EMAIL` | Email domyślnego administratora | `admin@aero.local` |
| `ADMIN_PASSWORD` | Hasło domyślnego administratora | `Admin123!` |
| `PORT` | Port serwera | `3000` |
| `NODE_ENV` | Środowisko | `development` |

## Uruchamianie

```bash
# Uruchom serwer i klienta
npm run dev:server   # Express na porcie 3000
npm run dev:client   # Vite na porcie 5173
```

Otwórz http://localhost:5173 i zaloguj się danymi administratora z pliku `.env`.

## Testy

```bash
# Testy jednostkowe (39 testów)
npm test

# Testy E2E (51 testów) — wymaga uruchomionego serwera i klienta
npm run test:e2e

# Testy E2E z interfejsem graficznym
npm run test:e2e:ui

# Tryb nasłuchiwania zmian (testy jednostkowe)
npm run test:watch
```

## Struktura projektu

```
aero-bazinga/
├── client/                 # Frontend React (Vite)
│   ├── src/
│   │   ├── components/     # Komponenty UI (shadcn/ui + layout)
│   │   ├── context/        # AuthContext z dynamicznymi uprawnieniami
│   │   └── pages/          # Strony tras
│   │       ├── admin/      # Helikoptery, załoga, lądowiska, użytkownicy, uprawnienia
│   │       ├── operations/  # Planowane operacje — lista, formularz, szczegóły
│   │       └── flight-orders/ # Zlecenia na lot — lista, formularz, szczegóły
│   └── index.html
├── server/                 # Backend Express
│   ├── src/
│   │   ├── db/             # Pula połączeń, migracje, seed, cache uprawnień
│   │   ├── middleware/     # Sesja, RBAC
│   │   ├── routes/         # Endpointy API
│   │   └── utils/          # Parser KML, odległość Haversine
│   └── .env
├── shared/                 # Wspólne typy TypeScript, enumy, uprawnienia
│   └── src/
├── e2e/                    # Testy E2E Playwright
└── .planning/              # Artefakty planowania projektu
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

## Główne funkcjonalności

- **Planowane operacje:** Upload plików KML, wyświetlanie trasy na mapie, 7-stanowy obieg statusów, historia zmian pól, komentarze
- **Zlecenia na lot:** Powiązanie z potwierdzonymi operacjami, 5 reguł walidacji (waga, liczba załogi, zasięg, licencja, szkolenie), kaskadowe zmiany statusów
- **Dashboard:** Statystyki dostosowane do roli, oczekujące działania, wygasające certyfikaty i licencje
- **RBAC:** Dynamiczna macierz uprawnień, ukrywanie elementów UI per rola, wymuszanie na backendzie
- **Mapy:** Leaflet.js z poliliniami tras KML, znacznikami lądowisk
- **Polski interfejs:** Wszystkie etykiety, komunikaty i statusy w języku polskim

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

## Licencja

Własność — PSE Innowacje
