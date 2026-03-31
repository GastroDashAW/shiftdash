# ShiftDash

Einfache Dienstplanung und Zeiterfassung für die Gastronomie.

## Tech Stack

- Vite + TypeScript
- React 18
- shadcn/ui + Tailwind CSS
- Lovable Cloud (Auth, Datenbank, Edge Functions)

## Lokale Entwicklung

```sh
npm install
npm run dev
npm test
```

## Umgebungsvariablen

Die `.env`-Datei wird automatisch von Lovable Cloud verwaltet:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

---

## 🔐 API Keys & Secrets – Dokumentation

### Übersicht aller verwendeten Secrets

| Secret | Typ | Speicherort | Verwendet in | Öffentlich? |
|---|---|---|---|---|
| `SUPABASE_URL` | Backend URL | Lovable Cloud (auto) | Edge Functions | Nein |
| `SUPABASE_ANON_KEY` | Publishable Key | Lovable Cloud (auto) | Edge Functions | Ja (Anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | Lovable Cloud (auto) | Edge Functions | ⛔ Nein |
| `VAPID_PUBLIC_KEY` | Web Push Public Key | Lovable Cloud Secrets | Edge Function `send-shift-reminders`, Frontend SW | Ja |
| `VAPID_PRIVATE_KEY` | Web Push Private Key | Lovable Cloud Secrets | Edge Function `send-shift-reminders` | ⛔ Nein |
| `LOVABLE_API_KEY` | AI Gateway Key | Lovable Cloud Secrets | Edge Functions `dash-chat`, `parse-employee-document` | ⛔ Nein |
| `VITE_SUPABASE_URL` | Backend URL | `.env` (auto) | Frontend Client | Ja (Anon) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon Key | `.env` (auto) | Frontend Client | Ja (Anon) |

### Wo werden Secrets verwendet?

#### Edge Functions (Server-seitig, sicher)
- **`bootstrap-admin`** → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **`create-employee-user`** → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- **`reset-data`** → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **`send-monthly-report`** → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **`send-shift-reminders`** → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- **`dash-chat`** → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY`
- **`parse-employee-document`** → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY`

#### Frontend (Client-seitig, nur öffentliche Keys)
- **`src/integrations/supabase/client.ts`** → `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- **`src/lib/backend-config.ts`** → Fallback-Werte für die gleichen Keys (publishable/anon)

### ⛔ Was darf NIEMALS im Frontend landen?
- `SUPABASE_SERVICE_ROLE_KEY` – umgeht RLS, voller DB-Zugriff
- `VAPID_PRIVATE_KEY` – ermöglicht Push-Nachrichten im Namen der App
- `LOVABLE_API_KEY` – ermöglicht AI-API-Aufrufe auf Projektkosten

---

## 🔄 Key-Rotation-Checkliste

### VAPID Keys rotieren (Web Push)

1. [ ] Neues VAPID-Schlüsselpaar generieren (`web-push generate-vapid-keys`)
2. [ ] `VAPID_PUBLIC_KEY` in Lovable Cloud Secrets aktualisieren
3. [ ] `VAPID_PRIVATE_KEY` in Lovable Cloud Secrets aktualisieren
4. [ ] Den öffentlichen Key in `public/sw-push.js` aktualisieren (falls hardcodiert)
5. [ ] Alle bestehenden Push-Subscriptions werden ungültig → Nutzer müssen Benachrichtigungen neu aktivieren
6. [ ] Testen: Push-Benachrichtigung an ein Testgerät senden

### LOVABLE_API_KEY rotieren (AI Gateway)

1. [ ] Neuen API Key in Lovable Workspace Settings generieren
2. [ ] `LOVABLE_API_KEY` in Lovable Cloud Secrets aktualisieren
3. [ ] Testen: Dash-Chat öffnen und Nachricht senden
4. [ ] Testen: Mitarbeiter-Import mit AI-Dokumenterkennung

### Supabase Keys (automatisch verwaltet)

> ⚠️ Diese Keys werden von Lovable Cloud automatisch verwaltet und sollten normalerweise **nicht manuell rotiert** werden.

Falls eine Rotation notwendig ist:
1. [ ] Neuen Anon Key / Service Role Key über Lovable Cloud generieren
2. [ ] Alle Edge Functions deployen (automatisch)
3. [ ] Frontend neu deployen (automatisch via Publish)
4. [ ] Bestehende User-Sessions bleiben gültig (JWT-basiert)

### Nach jeder Rotation

1. [ ] Edge Functions testen (alle 7 Funktionen)
2. [ ] Frontend Login testen
3. [ ] Push-Benachrichtigungen testen
4. [ ] AI-Chat testen
5. [ ] Alte Keys aus Passwort-Managern/Dokumentation entfernen
6. [ ] Rotation im Team kommunizieren

---

## 🛡️ Sicherheitshinweise

- **Keine Secrets im Code**: Alle privaten Keys werden ausschliesslich über Lovable Cloud Secrets eingebunden
- **CSP-Header**: Strikte Content Security Policy in `vercel.json` (kein `unsafe-inline`)
- **CORS**: Nur erlaubte Domains (kein Wildcard `*`), konfiguriert in `supabase/functions/_shared/cors.ts`
- **RLS**: Alle 16 Tabellen haben Row Level Security mit rollenbasierten Policies
- **Error Handling**: Keine internen Fehlermeldungen im Frontend sichtbar
- **Logging**: Keine sensiblen Daten in Console-Logs
