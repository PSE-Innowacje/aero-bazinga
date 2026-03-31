# ✅ ✅ CHECKLISTA IMPLEMENTACYJNA (AERO v1)

## 🔴 1. MODEL DANYCH — krytyczne braki

### ⛔ 1.1. Pilot — user vs crew member

**Problem:**

- PRD → pilot wybierany z *członków załogi*
- Claude → pilot = aktualny user

**Decyzja do podjęcia (MUST):**

-  Czy pilot to:
  -  rekord z `crew_members`
  -  rekord z `users`
  -  powiązanie 1:1 (user ↔ crew)

👉 **Rekomendacja:**

```plaintext
users (login)
↔ crew_members (dane operacyjne)
```

------

### ⛔ 1.2. „Osoba wprowadzająca” (OPS)

-  Dodać pole: `created_by` (email / user_id)
-  Auto-uzupełnianie z sesji
-  Niezmienialne

------

### ⛔ 1.3. Powiązania operacja ↔ zlecenia

-  Relacja many-to-many:
  - `flight_orders_operations`
-  Widok:
  - operacja → lista zleceń

------

### ⛔ 1.4. Uwagi po realizacji (OPS)

-  Dodać pole: `post_completion_notes` (max 500)
-  Edycja:
  - tylko po statusie ≥ 5
  - tylko wybrane role

------

### ⛔ 1.5. Rozdzielenie dat (OPS)

-  `proposed_start_date`
-  `proposed_end_date`
-  `planned_start_date`
-  `planned_end_date`

👉 NIE łączyć!

------

## 🔴 2. UPRAWNIENIA — największe ryzyko błędu

### ⛔ 2.1. Macierz uprawnień (hard requirement)

Zaimplementować **dokładnie**:

| Rola       | Administracja | Operacje | Zlecenia |
| ---------- | ------------- | -------- | -------- |
| Admin      | CRUD          | READ     | READ     |
| Planner    | NONE          | CRUD     | NONE     |
| Supervisor | READ          | CRUD     | CRUD     |
| Pilot      | READ          | READ     | CRUD     |

------

### ⛔ 2.2. Poziomy dostępu (ważne!)

-  `NONE` → brak dostępu (ukryte w UI + backend blokada)
-  `READ` → tylko GET
-  `CRUD` → pełny dostęp

------

### ⛔ 2.3. Backend enforcement

-  Middleware RBAC (NIE tylko frontend)
-  Walidacja per endpoint
-  Walidacja per status (workflow)

------

## 🔴 3. WORKFLOW / STATUSY

### ⛔ 3.1. Statusy jako enum (strict)

-  Operacje: 1–7
-  Zlecenia: 1–7

👉 NIE stringi → tylko enum/int

------

### ⛔ 3.2. Blokady przejść (FSM)

-  Zaimplementować jako:
  - state machine / guard clauses

Np.:

-  1 → 3 tylko jeśli daty planowane istnieją
-  4 → 5/6 tylko jeśli daty rzeczywiste istnieją

------

### ⛔ 3.3. Automatyczne zmiany statusów

-  OPS: 3 → 4 przy dodaniu do zlecenia
-  OPS: 4 → 5/6/3 po raporcie pilota
-  FLT: cascade → zmienia OPS

👉 **Transakcje DB wymagane**

------

## 🔴 4. WALIDACJE (krytyczne)

### ⛔ 4.1. Flight order — blokady zapisu

-  brak ważnego przeglądu helikoptera
-  brak ważnej licencji pilota
-  brak ważnego szkolenia crew
-  przekroczona waga
-  przekroczony zasięg

👉 Wszystko jako:

- backend validation
- - komunikaty błędów

------

### ⛔ 4.2. Email validation (crew + users)

-  regex zgodny z PRD (NIE standardowy email RFC!)

------

### ⛔ 4.3. KML

-  max 5000 punktów
-  tylko 1 plik
-  walidacja kraju (opcjonalnie bbox Polska)

------

## 🔴 5. MAPA (często źle robiona)

### ⛔ 5.1. Operacje

-  render wszystkich punktów KML

### ⛔ 5.2. Zlecenia

-  start airfield
-  end airfield
-  wszystkie punkty z operacji

👉 NIE tylko linia — wszystkie punkty

------

## 🔴 6. LISTY I SORTOWANIA

### ⛔ 6.1. Domyślne sortowania (must-have)

-  Operacje → planned_start_date ASC
-  Zlecenia → planned_start_datetime ASC
-  Crew → email
-  Helicopters → status + registration

------

### ⛔ 6.2. Domyślne filtry

-  Operacje → status = 3
-  Zlecenia → status = 2

------

### ⛔ 6.3. Dropdowny

-  Crew → alfabetycznie
-  Operacje → po dacie

------

## 🔴 7. AUDYT / HISTORIA

### ⛔ 7.1. Historia zmian

-  old_value
-  new_value
-  field_name
-  timestamp
-  user_id

👉 per field change (nie snapshot!)

------

### ⛔ 7.2. Komentarze

-  lista (ordered)
-  max 500 znaków
-  timestamp + user

------

## 🔴 8. UI / MENU (często pomijane)

### ⛔ 8.1. Struktura menu (hardcoded logic)

-  Administracja
-  Planowanie operacji
-  Zlecenia

------

### ⛔ 8.2. Widoczność per rola

-  ukrywanie sekcji
-  blokada URL (ważne!)

------

## 🔴 9. TRANSAKCJE I SPÓJNOŚĆ

### ⛔ 9.1. Krytyczne operacje

-  dodanie operacji do zlecenia
-  zmiana statusu zlecenia
-  raportowanie pilota

👉 wszystko:

-  w jednej transakcji DB

------

## 🔴 10. TECHNICZNE (często pomijane)

### ⛔ 10.1. KML parsing

-  backend (Node.js)
-  obliczanie km (Haversine)

------

### ⛔ 10.2. Typy danych

-  km → integer
-  weight → integer
-  daty → timestamp (UTC!)