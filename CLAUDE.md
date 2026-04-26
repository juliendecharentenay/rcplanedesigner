# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `www/`:

```bash
npm run dev        # Vite dev server with hot-reload
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm run test:unit  # Vitest unit tests (jsdom environment)
```

Run a single test file:
```bash
npm run test:unit src/path/to/file.test.js
```

## Architecture

Vue 3 + Vite client-side app for aircraft/airfoil design and visualization. No backend.

**Entry points:** `index.html` → `src/main.js` → `src/App.vue`

**Path alias:** `@/` maps to `src/`

### Core domain modules

**`src/data/airfoils.js`** — NACA 4-digit airfoil geometry engine. `generateNaca4(code)` produces `{ x, y, z }` point arrays using cosine-spaced sampling (34 intervals) across upper and lower surfaces. The `airfoils` export contains 4 predefined profiles (NACA0009, NACA2412, NACA4412, NACA0012). Coordinates follow the convention: x = chordwise, z = thickness/camber, y = spanwise (always 0 at definition time).

**`src/js/aircraft.js`** — Aircraft data model. An aircraft is a plain JS object `{ information, wings[] }` where each wing has a `transform` and an `elements[]` array of `{ airfoilUid, transform }`. All mutation functions receive the aircraft object, mutate it in place, and return it.

### Transform structure

Used throughout for wings and wing elements:
```js
{ rotation: {x,y,z}, scaling: {x,y,z}, translation: {x,y,z} }
```
