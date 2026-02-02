# Deployment na Railway

## Wymagania

- Konto na [Railway.app](https://railway.app)
- Repozytorium Git (GitHub/GitLab)

## Krok 1: Utwórz projekt na Railway

1. Zaloguj się na Railway
2. Kliknij "New Project" → "Deploy from GitHub repo"
3. Wybierz repozytorium z aplikacją

## Krok 2: Dodaj Volume (WAŻNE!)

Railway ma ephemeral filesystem - pliki znikają po restarcie. Musisz dodać Volume:

1. W projekcie kliknij "New" → "Volume"
2. Nazwa: `pano-data`
3. Mount Path: `/data`
4. Kliknij "Create"

## Krok 3: Zmienne środowiskowe

W ustawieniach projektu → Variables, dodaj:

```env
# Wymagane
JWT_SECRET=wygeneruj-bezpieczny-klucz-min-32-znaki
PANO_DATA_DIR=/data

# Admin (pierwsze uruchomienie)
ADMIN_EMAIL=twoj@email.com
ADMIN_PASSWORD=bezpieczne-haslo

# Email (opcjonalne - do magic links)
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

Po uruchomieniu, w Volume `/data` powstanie:

```
/data/
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
- Sprawdź czy Volume jest zamontowany na `/data`
- Sprawdź czy `PANO_DATA_DIR=/data` jest ustawione

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
