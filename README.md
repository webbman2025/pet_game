# Pet Game - Build and Handover Guide

This project is a React + TypeScript app built with Vite.

Use this guide to set up, run, and build the project on a new machine.

## 1. Prerequisites

Install the following first:

1. Node.js 20 LTS (recommended)
2. npm (comes with Node.js)
3. Git

### Install Node.js and npm

If Node.js and npm are not installed yet:

1. Go to https://nodejs.org
2. Download and install the **Node.js 20 LTS** version
3. Keep default installer options (npm is included automatically)
4. Re-open terminal after installation

Alternative (macOS/Linux): install Node.js 20 LTS using a version manager such as nvm.

Verify installation:

```bash
node -v
npm -v
git --version
```

## 2. Clone and Open the Project

```bash
git clone <your-repo-url>
cd pet_game
```

Or, if you already have the project folder, open it directly in VS Code.

## 3. Install Dependencies

Install packages from package-lock.json:

```bash
npm ci
```

If package-lock.json is missing in another clone, use:

```bash
npm install
```

## 4. Run in Development Mode

```bash
npm run dev
```

Vite will print the local URL (usually http://localhost:5173).

## 5. Build for Production

```bash
npm run build
```

What this does:

1. Runs TypeScript project build (`tsc -b`)
2. Runs Vite production build (`vite build`)
3. Outputs final static files to the dist folder

## 6. Preview Production Build Locally

```bash
npm run preview
```

This serves the dist output so you can test the same assets that will be deployed.

## 7. Lint Check

```bash
npm run lint
```

Run this before handoff, PR, or deployment.

## 8. Important Deployment Note (Base Path)

In vite.config.ts, the app base path is currently:

`/3Care/chi/gamify/pet_game/`

That means build assets are generated for hosting under this subpath.

If deploying to a different path (or root `/`), update `base` in vite.config.ts before running `npm run build`.

Example for root deployment:

```ts
base: '/'
```

## 9. Common Troubleshooting

1. Build fails after switching Node versions
   - Delete node_modules and reinstall:
   - `rm -rf node_modules package-lock.json` (macOS/Linux)
   - `rmdir /s /q node_modules && del package-lock.json` (Windows cmd)
   - Then run `npm install`
2. Port 5173 already in use
   - Vite usually offers another port automatically
   - Or run with a custom port: `npm run dev -- --port 5174`
3. Old assets shown in browser
   - Hard refresh (Ctrl+F5) or clear cache

## 10. Handover Checklist

Before handing over to teammate:

1. Confirm `npm ci` works from a clean clone
2. Confirm `npm run dev` starts without errors
3. Confirm `npm run build` succeeds
4. Confirm `npm run preview` loads correctly
5. Confirm base path in vite.config.ts matches target hosting path

## Project Scripts

- `npm run dev` - start Vite development server
- `npm run build` - TypeScript build + Vite production build
- `npm run preview` - preview built app from dist
- `npm run lint` - run ESLint
