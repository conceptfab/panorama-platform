# Raport Analizy Kodu

## Podsumowanie
Kod jest czytelny i dobrze zorganizowany, ale architektura przechowywania danych (JSON na plikach) jest największym problemem ze względu na brak atomowości operacji (ryzyko utraty danych) oraz skalowalność. Bezpieczeństwo jest na dobrym poziomie w API, ale warstwa middleware wymaga uszczelnienia.

---

## 1. Bezpieczeństwo (Security)

### [KRYTYCZNE] Race Condition w Bazie Danych
Obecna implementacja (`src/lib/db/json-store.ts`) używa `fs.readFile` i `fs.writeFile` bez mechanizmu blokowania (locking).
- **Zagrożenie**: Jeśli dwóch użytkowników (np. adminów) edytuje dane w tym samym momencie, jedna z operacji nadpisze drugą, prowadząc do trwałej utraty danych.
- **Rekomendacja**:
  - **Opcja B**: Dodanie muteksów (np. biblioteka `async-mutex`) do operacji zapisu plików JSON.

### [WAŻNE] Middleware Authentication
Middleware (`src/middleware.ts`) sprawdza jedynie istnienie ciasteczka `panorama-session`, ale nie weryfikuje jego poprawności kryptograficznej.
- **Zagrożenie**: Sfałszowane ciasteczko o dowolnej treści pozwoli pominąć przekierowanie w middleware (choć API i tak odrzuci żądanie, to dostęp do plików statycznych lub stron renderowanych po stronie klienta może być mylący).
- **Rekomendacja**: Dodać weryfikację `verifySessionToken` (z `jose`) w middleware dla ścieżek chronionych.

---

## 2. Inżynieria Oprogramowania (Over-engineering vs Good Practices)

### Przechowywanie Danych (Over-engineering / Wrong Tool)
Użycie systemu plików jako bazy danych z "ręczną" obsługą relacji (np. `groupIds` w projektach) przy użyciu Zod do walidacji całych plików jest nieefektywne.
- **Problem**: Przy każdym odczycie (nawet jednego projektu) parsowany jest cały plik `data/projects.json`. Przy wzroście liczby projektów aplikacja drastycznie zwolni.
- **Rekomendacja**: Przejście na bazę SQL (SQLite/PostgreSQL) lub chociaż podział plików (jeden plik na projekt), co jednak skomplikuje wyszukiwanie.

### Walidacja (Good Practice)
Rozbudowane schematy Zod w `src/utils/validation.ts` to **dobra praktyka**. Zapewniają spójność danych, co przy braku bazy SQL (brak schema enforcement) jest kluczowe.

---

## 3. Optymalizacja i Wydajność

### Obrazy i Pliki Statyczne
- **Konfiguracja Next.js**: `unoptimized: true` w `next.config.ts` wyłącza optymalizację obrazów.
- **Rewrites**: Przekierowanie `/uploads` -> `/api/static` obciąża główny wątek Node.js serwowaniem plików.
- **Rekomendacja**: Wdrożenie serwowania plików przez serwer HTTP (Nginx) lub CDN, oraz włączenie `sharp` do optymalizacji obrazów.

---

## 4. Martwy Kod (Dead Code)

- **Zależności**: `tw-animate-css` w `package.json` - nie znaleziono użycia w konfiguracji Tailwind. Do usunięcia jeśli nieużywane w klasach CSS.
- **Skrypty**: `scripts/fix-thumbnails.js` wygląda na jednorazowe narzędzie migracyjne. Można przenieść do folderu `tools` lub usunąć.

---

## 5. Plan Naprawczy (Sugerowana kolejność)

1. **[PRIORYTET]** Migracja warstwy danych (`src/lib/db`) na SQLite lub dodanie blokad zapisu (`flock`).
2. Uszczelnienie Middleware (weryfikacja tokena JWT).
3. Optymalizacja serwowania plików statycznych.
4. Usunięcie nieużywanych zależności (`tw-animate-css`).
