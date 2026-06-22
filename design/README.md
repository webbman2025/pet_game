# Designer Handoff Guide

This folder is for designers. Do not edit files in `src/` — AI integrates your work from here.

## Folder ownership

| Folder | Owner | Sections |
|--------|-------|----------|
| `designer-a/` | Designer A | Home, Feed |
| `designer-b/` | Designer B | Walk, Spa |
| `shared/` | Both designers | Tokens, common UI rules |

## What to deliver per section

Each section folder should contain:

- `assets/` — images, GIFs, sounds for that section only
- `config.json` — timings, points, copy text
- `notes.md` — behavior notes for AI (plain language)

## Workflow

1. Update your section folder
2. Commit and push to GitHub
3. Tell AI which section changed
4. AI updates `src/` and shares a preview link
5. Review on desktop and mobile before merge

## Run preview locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Mobile (same Wi-Fi): `http://<your-computer-ip>:5173/3Care/chi/gamify/pet_game/`
