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

Every page must manage its state in a dedicated `composables/useXxxState.js` composable — never inline in `App.vue`. State must not be managed with a plain `ref` inside `App.vue`.

**Reference implementations:**
- Index page: `src/pages/index/composables/useAppState.js`
- Airfoil page: `src/pages/airfoil/composables/useAirfoilState.js`

### Required exports

Each state composable must export two things:

**`STATE_DEFAULTS`** — a plain object that is the single source of truth for every field's default value. Define each default here; never duplicate it elsewhere.

**`useXxxState(onError)`** — a function accepting `(err: Error) => void` and returning `{ getState, setState }`:

```js
export const STATE_DEFAULTS = {
  units:      'SI',
  myField:    0,     // metres (SI) or feet (Imperial)
}

export function useXxxState(onError) {
  const state = ref({ ...STATE_DEFAULTS })

  function getState() {
    return readonly(state.value)
  }

  function setState(partial) {
    try {
      const next = { ...state.value, ...partial }
      if ('units' in partial && partial.units !== state.value.units) {
        next.myField = convertXxx(state.value.myField, state.value.units, partial.units)
      }
      state.value = next
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  return { getState, setState }
}
```

```js
// getState()        — returns a readonly snapshot of the current state.
// setState(partial) — shallow-merges partial into state; routes any thrown Error through onError.
// onError           — (err: Error) => void, injected at construction time (see below).
```

### Wiring in App.vue

`App.vue` constructs the composable with `setError` wired in directly, then provides the accessor and modifier to the component tree:

```js
const { getState, setState } = useXxxState(setError)
provide(APP_STATE_KEY, { getState, setState })
```

`App.vue` also builds a `URL_DEFAULTS` object by spreading `STATE_DEFAULTS` and adding any UI-only fields (fields that are tracked in the URL but are not part of the composable state, such as `activeTab`):

```js
import { STATE_DEFAULTS } from './composables/useXxxState'

const URL_DEFAULTS = {
  ...STATE_DEFAULTS,
  activeTab: VALID_TABS[0],   // UI-only, not part of app state
}
```

Use `URL_DEFAULTS.*` for all URL comparison and fallback logic — never hard-code literal default values in the watch or onMounted blocks.

Child components inject the state interface:

```js
import { inject } from 'vue'
import { APP_STATE_KEY } from '../composables/useAppState'
const { getState, setState } = inject(APP_STATE_KEY)
```

The watch on state must use a getter function so Vue can track the readonly snapshot reactively:

```js
watch([() => getState(), activeTab], ([s, tab]) => { ... }, { deep: true })
```

**Error coupling strategy:** `onError` is passed into the composable at construction (not wrapped by App.vue after the fact). This keeps error messages contextual — the composable knows what failed — and children call state functions without any error-handling boilerplate.

### Adding a new state field

**Plain fields** (no unit dependency): add the key and default value to `STATE_DEFAULTS` — done.

**Unit-dependent fields** (any physical measurement): three steps, all in `useXxxState.js`:

1. Add the field to `STATE_DEFAULTS` with its SI default and a unit comment:
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

## Focused parameters

`ActionPanel.vue` displays contextual help for whichever parameter input is currently focused. The mechanism is owned by `src/pages/index/composables/useFocusedParam.js` and wired via provide/inject.

```js
const { focusedKey, focusedContent, register, setFocused, clearFocused } = useFocusedParam()
// focusedKey     — Ref<string|null>, the currently focused parameter key
// focusedContent — computed { title, body } for the active key, or null
// register(key, { title, body }) — registers help content; body may be a computed ref for unit-aware text
// setFocused(key) / clearFocused() — called by parameter panel components
```

`App.vue` instantiates the composable and provides it:

```js
import { useFocusedParam, FOCUSED_PARAM_KEY } from './composables/useFocusedParam'
provide(FOCUSED_PARAM_KEY, useFocusedParam())
```

**Pattern for parameter panel components:**

1. Inject and destructure at the top of `<script setup>`:
   ```js
   import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam.js'
   const { register, setFocused, clearFocused } = inject(FOCUSED_PARAM_KEY)
   ```

2. Register help content for each parameter (use a computed ref for unit-aware body text):
   ```js
   const myParamBody = computed(() =>
     system.value === 'Imperial' ? 'Help text in Imperial...' : 'Help text in SI...'
   )
   register('myParam', { title: 'My Parameter', body: myParamBody })
   ```

3. Wrap each input in a div with `@focusin`, and add `@focusout` on the panel root:
   ```html
   <div @focusout="onPanelFocusOut">
     <div @focusin="setFocused('myParam')">
       <BaseInput ... />
     </div>
   </div>
   ```

4. Implement `onPanelFocusOut` with a 200 ms debounce so tab-navigation within the panel doesn't flicker:
   ```js
   function onPanelFocusOut(e) {
     if (!e.currentTarget.contains(e.relatedTarget)) {
       setTimeout(() => clearFocused(), 200)
     }
   }
   ```

Every new parameter panel component that contains editable inputs **must** wire up focused parameter support. Tests must provide a `FOCUSED_PARAM_KEY` stub (`{ register: vi.fn(), setFocused: vi.fn(), clearFocused: vi.fn() }`).

**Reference implementations:** `ParameterPanel.vue` (General panel), `WingDefinitionPanel.vue` (Wing Definition panel).

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

## URL query string synchronisation

Both the index page (`src/pages/index/App.vue`) and the airfoil page (`src/pages/airfoil/App.vue`) sync their full application state to the browser URL so that pages can be bookmarked and shared.

### Approach

URL sync logic lives directly in `App.vue` — no composable. The two-part pattern:

1. **`onMounted` — parse URL into state.** Read `window.location.search`, validate each parameter, and call `setState`. Units are applied first in a separate `setState({ units })` call so that the unit-conversion side-effect in `useAppState` fires before numeric values (which are already in the target unit system) are written in a second `setState` call.

2. **`watch` — serialise state to URL.** A deep watcher on `[() => getState(), activePanel]` writes all non-default fields via `history.replaceState` (no new history entry). When all fields are at their defaults, the URL is reset to `window.location.pathname` with no query string.

### URL_DEFAULTS constant

`App.vue` defines a module-level `URL_DEFAULTS` object built by spreading `STATE_DEFAULTS` (exported from `useAppState.js`) and adding any UI-only fields:

```js
import { STATE_DEFAULTS } from './composables/useAppState'

const URL_DEFAULTS = {
  ...STATE_DEFAULTS,
  activePanel: 'general',   // UI-only, not part of app state
}
```

`STATE_DEFAULTS` is the single source of truth for state field defaults — define each default once there, never duplicate it. A field is omitted from the URL when its value equals its `URL_DEFAULTS` entry; this object also drives validation fallbacks during parsing.

### Parameter keys and validation

Each state field maps to a short, human-readable URL key. Numeric fields are validated against a plausible range (e.g. `alt` in `[0, 9000]`); out-of-range or non-numeric values silently fall back to the default. Enum fields (e.g. `type`, `panel`) are accepted only if the parsed value is a known member of the valid set. Unknown URL keys are silently ignored.

### Adding a new state field to URL sync

1. **State fields:** add the default to `STATE_DEFAULTS` in `useAppState.js` (it is automatically inherited by `URL_DEFAULTS`). **UI-only fields** (e.g. `activePanel`): add directly to the `URL_DEFAULTS` literal in `App.vue`.
2. In the `onMounted` parse block: read and validate the new URL key, assign to a local variable, include it in the `setState` call (or set the ref directly for UI-only fields).
3. In the `watch` serialise block: add a conditional `params.set(key, serialisedValue)` that runs only when the field differs from its default.
4. Add test cases to `App.test.js` covering valid, invalid, and absent values.

