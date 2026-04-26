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

## Error Handling

Runtime errors are surfaced to the user via a modal overlay managed in `App.vue`.

### Architecture

| Layer | File | Role |
|---|---|---|
| Root state | `src/composables/errorHandler.js` | Owns `appError` ref, provides `handleError` and `dismissError` |
| Child scaffolding | `src/composables/componentError.js` | Provides `reportError` and `forwardError` helpers |
| UI | `src/components/ErrorModal.vue` | Renders the modal when `appError !== null` |

**Error state shape:** `appError` is `null` (no error) or `{ message: string, error: Error }`.

**Vue events do not bubble.** A child's `emit('error', ...)` only reaches its direct parent. Grandchildren must be explicitly forwarded (see below).

### Adding error handling to a new direct child of App.vue

```js
// In the child's <script setup>:
import { useComponentError } from '@/composables/componentError.js'

const emit = defineEmits([/* existing events */, 'error'])
const { reportError } = useComponentError(emit)

// Call in try/catch:
try {
  riskyOperation()
} catch (err) {
  reportError('Failed to complete the operation', err)
}
```

Then in `App.vue`'s template add `@error="handleError"` to the component element.

### Adding error handling to a grandchild (e.g. inside BottomPanel)

1. In the grandchild, add `'error'` to `defineEmits` and use `reportError` from `useComponentError`.
2. In the parent (e.g. BottomPanel), destructure `forwardError` and wire it on the grandchild element:

```html
<GrandchildComponent @error="forwardError" />
```

### Tests

- `src/composables/errorHandler.test.js`
- `src/composables/componentError.test.js`
- `src/components/ErrorModal.test.js`
