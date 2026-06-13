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

Vue 3 + Vite + TailwindCSS client-side app for aircraft/airfoil design and visualization. No backend.

**Entry points:** `src/index.html` → `src/pages/index/main.js` → `src/pages/index/App.vue`

**Path alias:** `@/` maps to `src/`

## Error handling

Centralised error state lives in `src/composables/useError.js`.

```js
const { error, setError, clearError } = useError()
// error      — Ref<Error | null>. null means no active error.
// setError   — first Error wins; subsequent calls are ignored until cleared.
// clearError — resets error to null, allowing setError to be used again.
```

**Pattern:**

- `App.vue` owns the error state, provides the setter to the component tree, and renders `<ErrorDialog>`:
  ```js
  import { provide } from 'vue'
  import { useError, SET_ERROR_KEY } from '@/composables/useError'
  import ErrorDialog from '@/components/ErrorDialog.vue'

  const { error, setError, clearError } = useError()
  provide(SET_ERROR_KEY, setError)
  ```
  ```html
  <ErrorDialog :error="error" @dismiss="clearError" />
  ```
- Child components inject the setter and call it on failure:
  ```js
  import { inject } from 'vue'
  import { SET_ERROR_KEY } from '@/composables/useError'
  const setError = inject(SET_ERROR_KEY)
  // setError(new Error('something went wrong'))
  ```

**`src/components/ErrorDialog.vue`**

Modal dialog displayed when `error` is non-null. Renders via `<Teleport to="body">`.

- Props: `error` (`Error | null`, validated) — the active error to display.
- Emits: `dismiss` — fired when the user clicks Dismiss; parent should call `clearError()`.

## Error handling in components

Every component that contains fallible logic (computed properties that access object methods or arrays, `draw()` functions that call D3, lifecycle hooks that touch the DOM) must:

1. Inject `setError` at the top of `<script setup>`:
   ```js
   import { inject } from 'vue'
   import { SET_ERROR_KEY } from '@/composables/useError.js'
   const setError = inject(SET_ERROR_KEY)
   ```

2. Wrap computed property bodies in try/catch and return a typed safe fallback:
   ```js
   const myData = computed(() => {
     try {
       // ... fallible logic ...
     } catch (e) { setError(e); return [] }  // [] / null / [-1, 2] as appropriate
   })
   ```

3. Wrap `myMethod()` function bodies in try/catch with early return:
   ```js
   function myMethod() {
     try {
       // ... Function logic ...
     } catch (e) { setError(e); return }
   }


**Reference implementation:** `www/src/pages/airfoil/components/AirfoilCoordTable.vue`

## Application state

Application state lives in `src/pages/index/composables/useAppState.js`.

```js
const { getState, setState } = useAppState(onError)
// getState()        — returns a readonly snapshot of the current state.
// setState(partial) — shallow-merges partial into state; routes any thrown Error through onError.
// onError           — (err: Error) => void, injected at construction time (see below).
```

`App.vue` constructs the composable with `setError` wired in directly, then provides the accessor and modifier to the component tree:

```js
const { getState, setState } = useAppState(setError)
provide(APP_STATE_KEY, { getState, setState })
```

Child components inject the state interface:

```js
import { inject } from 'vue'
import { APP_STATE_KEY } from '../composables/useAppState'
const { getState, setState } = inject(APP_STATE_KEY)
```

**Error coupling strategy:** `onError` is passed into `useAppState` at construction (not wrapped by App.vue after the fact). This keeps error messages contextual — the composable knows what failed — and children call state functions without any error-handling boilerplate.

### Adding a new state field

**Plain fields** (no unit dependency): add the key and default value to the `state` ref — done.

**Unit-dependent fields** (any physical measurement): three steps, all in `useAppState.js`:

1. Add the field to `state` with its SI default and a unit comment:
   ```js
   myField: 0,  // metres (SI) or feet (Imperial)
   ```
2. Import the matching converter from `@/units/units.js`.
3. Inside the `if ('units' in partial …)` block in `setState`, add:
   ```js
   next.myField = convertXxx(state.value.myField, state.value.units, partial.units)
   ```
   This re-converts the stored value in the same atomic update as the unit change, keeping the number consistent with the active unit system at all times.

## Units

Unit handling is split into two layers:

**`src/units/units.js`** — pure functions with no Vue dependency. This is the single source of truth for unit system definitions, labels, and conversions. Import from here whenever unit logic is needed outside a component.

```js
UNIT_SYSTEMS          // [{ value: 'SI', label: 'SI (metric)' }, { value: 'Imperial', label: 'Imperial' }]
getDistanceUnit(system)              // 'm' | 'ft'
convertDistance(value, from, to)     // converts between SI and Imperial
```

When adding a new physical quantity (mass, speed, area, …), add its `getXxxUnit` and `convertXxx` pure functions here.

**`src/pages/index/composables/useUnits.js`** — thin reactive wrapper. Reads `units` from AppState and exposes computed refs that update automatically when the user changes the unit system. Components call `useUnits()` directly — no additional provide/inject needed.

```js
const { system, distanceUnit, convertDistance } = useUnits()
// system        — Ref<'SI' | 'Imperial'>
// distanceUnit  — Ref<'m' | 'ft'>, reactive
// convertDistance — the same pure function from units.js
```

When adding a new quantity to `units.js`, add a matching computed ref here (e.g. `massUnit`).

## UI layout

Full-viewport layout composed in `src/pages/index/App.vue`:

```
┌─────────────────────────────────────────┐
│  AppHeader  (h-14, slate-900)           │
├─────────────────────────────────────────┤
│ [ParameterPanel] │  SvgPanel  │ Action  │
│  absolute, z-10  │  flex-1    │ Panel   │
│  overlaps SVG    │            │  w-60   │
└─────────────────────────────────────────┘
```

All panel components live in `src/pages/index/components/`.

**`AppHeader.vue`** — dark top bar with plane icon, title, and version badge.

**`ParameterPanel.vue`** — absolutely positioned over the left edge of the canvas (`z-10`), frosted-glass style. Width is content-driven; can overlap the SVG canvas. Shows an empty-state message until parameters are added.

**`SvgPanel.vue`** — fills remaining horizontal space (`flex-1`). Dot-grid background. Design canvas is a white card at `w-4/5 aspect-[4/3]` with an 800×600 `viewBox` and centre crosshairs.

**`ActionPanel.vue`** — fixed `w-60` right panel with three sections: View (zoom, fit), Design (generate, reset), Export (SVG, DXF). Uses scoped `@apply` with `@reference "@/style.css"` (required by Tailwind v4 for scoped styles).

> **Tailwind v4 note:** any `<style scoped>` block that uses `@apply` must begin with `@reference "@/style.css";`.

