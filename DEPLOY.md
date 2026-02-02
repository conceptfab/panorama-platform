# Deployment na Railway

## Wymagania

- Konto na [Railway.app](https://railway.app)
- Repozytorium Git (GitHub/GitLab)

## Krok 1: Utwórz projekt na Railway

1. Zaloguj się na Railway
2. Kliknij "New Project" → "Deploy from GitHub repo"
3. Wybierz repozytorium z aplikacją

## Krok 2: Dodaj Volume (WAŻNE!)

Railway ma ephemeral filesystem - pliki znikają po restarcie. Wszystkie dane muszą być na Volume:

1. W projekcie kliknij "New" → "Volume"
2. Nazwa: `pano-data`
3. Mount Path: **`/pano-data`** (np. 5 GB)
4. Kliknij "Create"

## Krok 3: Zmienne środowiskowe

W ustawieniach projektu na Railway: **Variables** (lub **Settings → Environment Variables**). Dodaj co najmniej:

| Zmienna | Opis | Przykład |
|--------|------|----------|
| **ADMIN_EMAIL** | Email konta administratora (używany przy pierwszej inicjalizacji) | `admin@twojadomena.com` |
| **ADMIN_PASSWORD** | Hasło admina (ustaw na pierwszym uruchomieniu, potem zmień w aplikacji) | `bezpieczne-haslo` |
| **JWT_SECRET** | Klucz JWT (min. 32 znaki) | wygeneruj losowy ciąg |
| **NEXT_PUBLIC_APP_URL** | Adres aplikacji | `https://pano.conceptfab.com` |

Pełna lista (do wklejenia lub uzupełnienia w Railway):

```env
# Wymagane
JWT_SECRET=wygeneruj-bezpieczny-klucz-min-32-znaki

# Admin – konto tworzone przy pierwszym uruchomieniu (init-data.js)
ADMIN_EMAIL=twoj@email.com
ADMIN_PASSWORD=bezpieczne-haslo

# Dane: Railway ustawia RAILWAY_VOLUME_MOUNT_PATH automatycznie (np. /pano-data).
# Aplikacja używa tej ścieżki – PANO_DATA_DIR nie jest wymagane.

# Email (do wysyłki kodów logowania)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Panorama <noreply@twojadomena.com>

# Aplikacja
NEXT_PUBLIC_APP_URL=https://twoja-domena.railway.app
```

## Krok 4: Deploy

Railway automatycznie:

1. Wykryje Next.js i zbuduje aplikację
2. Uruchomi `npm run start` (który najpierw inicjalizuje dane)
3. Udostępni aplikację pod adresem `*.railway.app`

## Struktura danych

Wszystkie dane są pod ścieżką Volume (`RAILWAY_VOLUME_MOUNT_PATH`, np. `/pano-data`):

```
/pano-data/
├── data/
│   ├── users.json
│   ├── groups.json
│   ├── projects.json
│   └── access-control.json
└── uploads/
    └── projects/
        └── [project-id]/
            ├── config.json
            ├── panoramas/
            └── thumbnails/
```

## Pierwsze logowanie

Po deploymencie:

1. Wejdź na `https://twoja-domena.railway.app/login`
2. Zaloguj się emailem i hasłem z ADMIN_EMAIL/ADMIN_PASSWORD
3. **Natychmiast zmień hasło w ustawieniach!**

## Troubleshooting

### Dane znikają po restarcie

- Sprawdź czy Volume jest dodany i zamontowany (Mount Path np. `/pano-data`)
- Railway ustawia `RAILWAY_VOLUME_MOUNT_PATH` automatycznie – aplikacja z niego korzysta

### Błąd 500 przy uploadzie

- Sprawdź logi: Railway Dashboard → Logs
- Upewnij się że Volume ma wystarczająco miejsca

### Aplikacja nie startuje

- Sprawdź czy wszystkie wymagane zmienne są ustawione
- Sprawdź logi budowania

## Custom Domain

1. Railway Dashboard → Settings → Domains
2. Dodaj swoją domenę
3. Skonfiguruj DNS (CNAME na Railway)
4. Zaktualizuj `NEXT_PUBLIC_APP_URL`

## Backup

Regularnie eksportuj dane z Volume:

```bash
railway run tar -czvf backup.tar.gz /data
```
