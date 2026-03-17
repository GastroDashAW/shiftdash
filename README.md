# ShiftDash

Einfache Dienstplanung und Zeiterfassung für die Gastronomie.

## Tech Stack

- Vite + TypeScript
- React 18
- shadcn/ui + Tailwind CSS
- Supabase (Auth, Datenbank)

## Lokale Entwicklung

```sh
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Tests ausführen
npm test
```

## Umgebungsvariablen

Eine `.env`-Datei im Projektroot mit folgenden Variablen wird benötigt:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```
