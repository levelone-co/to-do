# To Do

A generic, reusable shared task management app with a Google Sheets backend and an embedded Claude AI assistant. Fork it, plug in your own Sheet + API key, and self-host.

## Features

- **Shared sections** — customisable section names, synced via Google Sheets
- **Due dates & sorting** — items sorted by due date, then oldest created; today's due items drive the progress bar
- **Auto-archive** — completed items move to a "Done" sheet the following day
- **Tags** — preset tags (urgent, note, waiting, low) or custom tags on any item
- **Task notes** — timestamped notes per item, stored in a single DB column; right-click or tap the notepad icon
- **Claude AI assistant** — embedded chat that can add, complete, delete items and draft messages
- **Dark mode** — toggle in the header, preference persisted
- **PWA** — installable on mobile/desktop with offline support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Single HTML file (vanilla JS/CSS) |
| Backend | Google Apps Script |
| Database | Google Sheets (Todos, Done, Config tabs) |
| AI | Claude Haiku via Anthropic API (direct browser access) |

## Google Sheets Schema

**Todos / Done sheets:** `id, text, section, done, tag, createdAt, dueDate, completedAt, notes`

**Config sheet:** `key, value` (stores section names as JSON)

## Setup

1. Create a Google Sheet
2. Go to **Extensions > Apps Script**, paste `TodoAppScript.gs`
3. Replace `YOUR_SHEET_ID_HERE` in the script with your Sheet's ID (the long string from the sheet URL between `/d/` and `/edit`)
4. **Deploy > New deployment > Web app** (Execute as: Me, Access: Anyone)
5. Open `todo.html` in a browser (or host via GitHub Pages)
6. Click **⚙ Setup needed** in the header and paste your deployment URL
7. Click the **⚪ Offline** badge in the chat panel and paste your [Anthropic API key](https://console.anthropic.com)

No secrets are stored in the code — the deployment URL and API key are saved in your browser's localStorage.

## Hosting (GitHub Pages)

1. Go to **Settings > Pages** in this repo
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Save — the app will be live at `https://<user>.github.io/<repo>/todo.html`

## Files

| File | Purpose |
|------|---------|
| `todo.html` | Complete frontend (HTML + CSS + JS) |
| `TodoAppScript.gs` | Google Apps Script backend |
| `manifest.json` | PWA manifest |
| `service-worker.js` | PWA offline caching |
| `icons/icon-192.png` | PWA icon (192x192) |
| `icons/icon-512.png` | PWA icon (512x512) |

## Deployment

When updating the backend:
1. Paste `TodoAppScript.gs` into Apps Script
2. **Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy**
3. Always **edit the existing deployment** to keep the same URL

---

Built with Claude Code
