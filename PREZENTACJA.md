# AERO — System Zarządzania Operacjami Lotniczymi

### Prezentacja projektu

---

## Zespół

| Rola | Osoba | Narzędzie |
|------|-------|-----------|
| Product Owner & Developer | **Jakub Remski** | Wizja produktu, decyzje architektoniczne, testowanie manualne, nadzór nad kodem |
| AI Pair Programmer | **Claude Sonnet 4.6** | Generowanie kodu, implementacja, refaktoryzacja, testy |
| AI Code Reviewer | **Claude Opus 4.6** | Przegląd bezpieczeństwa, analiza architektury, audyt UI |

> Projekt został zrealizowany w modelu **Human-AI Pair Programming** — człowiek podejmuje decyzje, AI implementuje.

---

## Problem biznesowy

Polskie Sieci Elektroenergetyczne potrzebują systemu do:

- Ewidencji planowanych operacji lotniczych helikopterami
- Przygotowania i walidacji zleceń na lot
- Kontroli dostępu opartej na rolach użytkowników
- Wizualizacji tras przelotów na mapie

---

## Stos technologiczny

```
┌─────────────────────────────────────────────┐
│              FRONTEND                        │
│  React 18 · TypeScript · Vite · Tailwind CSS │
│  shadcn/ui · Leaflet.js · react-day-picker   │
├─────────────────────────────────────────────┤
│              BACKEND                         │
│  Node.js · Express · TypeScript              │
│  express-session · bcryptjs · multer         │
├─────────────────────────────────────────────┤
│              BAZA DANYCH                     │
│  PostgreSQL · 16 tabel · raw SQL (pg)        │
├─────────────────────────────────────────────┤
│              TESTY                            │
│  Vitest (jednostkowe) · Playwright (E2E)     │
├─────────────────────────────────────────────┤
│              NARZĘDZIA AI                    │
│  Claude Code CLI · GSD Workflow System       │
└─────────────────────────────────────────────┘
```

---

## Podejście: Agentic Coding

### Czym jest Agentic Coding?

Programowanie agentowe to model, w którym **AI autonomicznie wykonuje zadania programistyczne** pod nadzorem człowieka. Człowiek definiuje cel — AI planuje, implementuje i weryfikuje.

### Jak to wyglądało w praktyce?

```
Człowiek                         AI Agent
  │                                │
  ├─ "Zbuduj aplikację wg PRD" ──→│
  │                                ├─ Analiza wymagań
  │                                ├─ Planowanie faz
  │                                ├─ Generowanie kodu
  │                                ├─ Samonaprawa błędów
  │←─ "Gotowe, przetestuj" ───────┤
  │                                │
  ├─ "Popraw uprawnienia" ────────→│
  │                                ├─ Lokalizacja problemu
  │                                ├─ Implementacja poprawki
  │←─ "Naprawione" ───────────────┤
  │                                │
  ├─ "Przegląd kodu (Opus)" ─────→│
  │                                ├─ Analiza bezpieczeństwa
  │                                ├─ 6 krytycznych znalezisk
  │←─ "Raport REVIEWS.md" ────────┤
  │                                │
  ├─ "Napraw znalezione" ─────────→│
  │                                ├─ 6/6 naprawionych
  │←─ "Zweryfikowane" ────────────┤
```

### Workflow GSD (Get Shit Done)

Wykorzystany system orkiestracji agentów:

| Etap | Komenda | Opis |
|------|---------|------|
| 1. Inicjalizacja | `/gsd:new-project` | Analiza PRD, tworzenie roadmapy |
| 2. Dyskusja | `/gsd:discuss-phase` | Omówienie szarych stref z użytkownikiem |
| 3. Projektowanie UI | `/gsd:ui-phase` | Kontrakt wizualny (UI-SPEC.md) |
| 4. Planowanie | `/gsd:plan-phase` | Szczegółowe plany implementacji |
| 5. Wykonanie | `/gsd:execute-phase` | Autonomiczne kodowanie z commitami |
| 6. Testy | `/gsd:add-tests` | Generowanie testów jednostkowych i E2E |
| 7. Przegląd | `/gsd:review` | Przegląd kodu przez inny model AI |
| 8. Audyt UI | `/gsd:ui-review` | Audyt wizualny 6-filarowy |

---

## Realizacja projektu

### Harmonogram

| Faza | Zakres | Czas realizacji |
|------|--------|:-:|
| **Faza 1** — Fundament | Scaffolding, schemat DB, autoryzacja | ~90 min |
| **Faza 2** — Panel admina | CRUD helikoptery, załoga, lądowiska, użytkownicy | ~75 min |
| **Faza 3** — Operacje | KML, mapa, workflow statusów, historia | ~90 min |
| **Faza 4** — Zlecenia | Walidacja, kaskada, rozliczenie | ~45 min |
| **Post-faza** — Ulepszenia | Dashboard, uprawnienia dynamiczne, SUPERADMIN, testy, przegląd bezpieczeństwa | ~120 min |
| | **ŁĄCZNIE** | **~7 godzin** |

### Projekt w liczbach

| Metryka | Wartość |
|---------|--------|
| Pliki źródłowe | **77** |
| Linie kodu | **12 523** |
| Commity git | **45** |
| Tabele w bazie danych | **16** |
| Endpointy API | **35+** |
| Strony React | **19** |
| Komponenty UI | **22** |
| Role użytkowników | **5** |
| Statusy operacji | **7** |
| Statusy zleceń | **7** |
| Reguły walidacji zleceń | **5** |

---

## Testy

### Strategia testowania

```
                    ┌──────────────┐
                    │   E2E Tests  │  ← Playwright (przeglądarka)
                    │   65 testów  │
                ┌───┴──────────────┴───┐
                │    Unit Tests        │  ← Vitest (logika)
                │    39 testów         │
            ┌───┴──────────────────────┴───┐
            │       Code Review (AI)       │  ← Opus (bezpieczeństwo)
            │   6 HIGH + 6 MEDIUM issues   │
            └──────────────────────────────┘
```

### Testy jednostkowe (39 testów, Vitest)

| Moduł | Testów | Co testuje |
|-------|:------:|-----------|
| `haversine.ts` | 10 | Obliczanie odległości, symetria, zaokrąglanie |
| `kml.ts` | 9 | Parsowanie KML, walidacja granic Polski, format |
| `permissions.ts` | 8 | Macierz uprawnień dla 5 ról |
| `statuses.ts` | 6 | Enumy statusów operacji i zleceń |
| `roles.ts` | 6 | Enumy ról, polskie etykiety |

### Testy E2E (65 testów, Playwright)

| Obszar | Testów | Co testuje |
|--------|:------:|-----------|
| Autoryzacja i RBAC | 12 | Login, sesja, widoczność menu per rola, blokada URL |
| Panel administracyjny | 9 | Listy, formularze, tryb read-only dla nadzorcy |
| Planowane operacje | 8 | Lista, filtrowanie, tworzenie, szczegóły, statusy |
| Zlecenia na lot | 9 | Lista, formularz, lądowiska, akceptacja |
| Dashboard | 9 | Statystyki, karty per rola, nawigacja |
| Uprawnienia | 4 | Edytor macierzy, blokada SUPERADMIN |
| User Stories (PRD §5) | 14 | Wszystkie 9 scenariuszy z PRD |

### Wynik

```
  ✓ Testy jednostkowe:  39/39  (100%)
  ✓ Testy E2E:          65/65  (100%)
  ✓ Przegląd Opus:      6/6 HIGH naprawione
  ─────────────────────────────────────
  ŁĄCZNIE:              104 testy, 0 błędów
```

---

## Przegląd bezpieczeństwa (AI Code Review)

Przeprowadzony przez **Claude Opus 4.6** — niezależny model AI:

| Znalezisko | Waga | Status |
|-----------|:----:|:------:|
| Middleware nie propaguje auth do sub-routerów | HIGH | NAPRAWIONE |
| Brak rate limitingu na logowaniu | HIGH | NAPRAWIONE |
| RBAC nie sprawdza EDIT_VIEW vs READ | HIGH | NAPRAWIONE |
| Kaskada statusów bez guardu | HIGH | NAPRAWIONE |
| Dashboard nie pokazuje wygasłych certyfikatów | MEDIUM | NAPRAWIONE |
| JSON.parse bez try/catch na inputach użytkownika | MEDIUM | NAPRAWIONE |

> Ocena ryzyka po poprawkach: **NISKIE**

---

## Zużycie tokenów AI

| Agent | Model | Tokeny | Czas |
|-------|-------|-------:|-----:|
| Planowanie (new-project) | Sonnet 4.6 | ~50K | 15 min |
| Faza 1 — Fundament | Sonnet 4.6 | ~150K | 90 min |
| Faza 2 — Panel admina | Sonnet 4.6 | ~147K | 75 min |
| Faza 3 — Operacje | Sonnet 4.6 | ~101K | 90 min |
| Faza 4 — Zlecenia | Sonnet 4.6 | ~122K | 45 min |
| Post-faza (dashboard, uprawnienia, UI) | Sonnet 4.6 | ~200K | 120 min |
| Code Review | Opus 4.6 | ~92K | 5 min |
| Testy (unit + E2E) | Sonnet 4.6 | ~80K | 30 min |
| **ŁĄCZNIE** | | **~942K** | **~7h** |

> Szacunkowy koszt tokenów: **~$15–20** (przy cenach API Anthropic)

---

## Kluczowe funkcjonalności

### 5 ról z dynamicznymi uprawnieniami
Superadmin · Administrator · Osoba planująca · Osoba nadzorująca · Pilot

### Planowane operacje lotnicze
Upload KML · Mapa Leaflet · 7 statusów · Historia zmian · Komentarze

### Zlecenia na lot
5 reguł walidacji · Kaskada statusów · Rozliczenie pilota · Mapa trasy

### Dashboard
Statystyki per rola · Wygasające certyfikaty · Ostatnia aktywność

### Bezpieczeństwo
Rate limiting · HTTP-only cookies · RBAC na frontendzie i backendzie

---

## Wnioski

### Co działa dobrze w Agentic Coding?

- **Szybkość** — pełna aplikacja w 7 godzin zamiast tygodni
- **Spójność** — jeden styl kodu, konsekwentne wzorce
- **Iteracja** — natychmiastowe poprawki po feedbacku
- **Przegląd krzyżowy** — inny model AI weryfikuje kod

### Co wymaga ludzkiego nadzoru?

- **Decyzje architektoniczne** — AI proponuje, człowiek decyduje
- **Testowanie manualne** — AI pisze testy, człowiek weryfikuje UX
- **Bezpieczeństwo** — AI Code Review to narzędzie, nie gwarancja
- **Domena biznesowa** — AI nie zna kontekstu PSE bez PRD

### Podsumowanie

> Agentic Coding to nie zastąpienie programisty — to **multiplikator produktywności**.
> Jeden developer + AI = wydajność małego zespołu.

---

## Demo

**Logowanie:** http://localhost:5173

| Konto | Rola |
|-------|------|
| `admin@aero.local` | Superadministrator |
| `marek.kowalski@pse.pl` | Pilot |
| `jan.nowicki@pse.pl` | Osoba planująca |
| `robert.szymanski@pse.pl` | Osoba nadzorująca |

Hasło dla wszystkich: `Admin123!`

---

*Prezentacja przygotowana: kwiecień 2026*
*Projekt: AERO v1.0 — PSE Innowacje*
