# Functional Specification: Error Handling Propagation

**Feature name:** error-handling-propagation
**Date:** 2026-06-13
**Status:** Draft

---

## 1. Background and Context

The application consists of two pages (`pages/index` and `pages/airfoil`), each with its own `App.vue` that owns an error state via the `useError` composable. Both `App.vue` files already:

- Instantiate `useError()` to obtain `{ error, setError, clearError }`.
- Provide `setError` to the component tree under the key `SET_ERROR_KEY`.
- Render `<ErrorDialog :error="error" @dismiss="clearError" />` to surface any caught error to the user.

A single reference implementation exists in `AirfoilCoordTable.vue`:

```js
import { inject } from 'vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'
const setError = inject(SET_ERROR_KEY)

const coords = computed(() => {
  try {
    // ... fallible logic
  } catch (e) { setError(e) }
})
```

This pattern ensures that if the fallible logic throws, the error is routed to the `ErrorDialog` rather than crashing the component tree. The component returns `undefined` from the computed on failure, which the template handles gracefully (e.g. via `v-for` over an empty/undefined list doing nothing).

---

## 2. Problem Statement

The majority of components in both pages do **not** wrap their fallible logic in try/catch blocks. Errors thrown inside:

- `computed()` callbacks
- `watch()` callbacks
- D3 drawing functions (`draw()`) called from watch handlers
- Lifecycle hooks (`onMounted`, `onUnmounted`)
- Event handlers and inline methods

…propagate unhandled and can crash the Vue component tree, producing a blank screen or broken UI rather than a user-visible error message.

---

## 3. Goal

Apply the same try/catch + `setError` pattern already demonstrated in `AirfoilCoordTable.vue` to every component and composable in:

- `www/src/pages/airfoil/components/`
- `www/src/pages/index/components/`

so that **no unhandled error can crash the application**. The error dialog must appear instead.

---

## 4. Scope

### 4.1 In scope

The following files contain fallible logic without error handling and must be updated:

**`pages/airfoil/` components:**
- `AirfoilProfileChart.vue` — `draw()` called from `watch`, `aoaAnnotations()` calls on `airfoil` object
- `LiftCurveChart.vue` — `draw()` called from `watch`, accesses `airfoil.polar`, D3 operations
- `LiftDragPolarChart.vue` — `draw()` called from `watch`, accesses `airfoil.polar`, D3 operations
- `PolarChart.vue` — `sharedYDomain` computed, accesses `airfoil.polar`
- `ComparisonTab.vue` — `chartData` computed, calls `analyser.getCruiseConditions()`, `getCruiseSpeed()`, etc.
- `ComparisonChart.vue` — `draw()` called from `watch`, D3 operations

**`pages/index/` components:**
- `AirfoilPanel.vue` — accesses `airfoils` from injected composable, reads `airfoil` properties in template

### 4.2 Out of scope

- `AirfoilCoordTable.vue` — already implemented (the reference)
- `AirfoilViewerTab.vue` — only composes child components; no fallible logic of its own
- `ParameterPanel.vue` (airfoil page) — only wires state reads/writes through safe accessors
- `TabView.vue` — pure UI routing, no fallible computations
- `AppHeader.vue` — purely presentational
- `ParameterRow.vue` — purely presentational
- `ActionPanel.vue` — only reads injected state; no fallible logic beyond what `useAppState` already guards
- `SvgPanel.vue` — only renders static SVG via `TrainerSideView`
- `TrainerSideView.vue` — static SVG markup
- Both `App.vue` files — already have comprehensive error handling
- Composables (`useAppState`, `useAirfoils`, `useFocusedParam`, `useUnits`, `useAirfoil`) — already safe or not the target of this feature

### 4.3 Documentation

The error handling pattern must be documented in `CLAUDE.md` so future developers know to apply it when writing new components.

---

## 5. User-Facing Requirements

| ID | Requirement |
|----|-------------|
| UFR-1 | When any component in the `pages/airfoil` or `pages/index` trees encounters a runtime error, an `ErrorDialog` must appear with a readable message. |
| UFR-2 | The rest of the application must remain rendered and interactive after the error dialog is dismissed (i.e. partial failures must not tear down the whole page). |
| UFR-3 | A component that fails to render its content (e.g. a chart) must not display a blank or broken view without explanation — the ErrorDialog is the explanation. |
| UFR-4 | Dismissing the error dialog must clear the error state, allowing new errors to be reported if they occur again. |

---

## 6. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | Every `computed()` that calls methods on `airfoil`, `analyser`, or other potentially-null/throwing objects is wrapped in try/catch, with `setError(e)` in the catch and a safe fallback return value. |
| AC-2 | Every `watch()` callback that calls a `draw()` function (or other fallible logic) is wrapped in try/catch with `setError`. |
| AC-3 | The `draw()` functions themselves (in chart components) are wrapped in try/catch with `setError` so that D3 errors are caught at the drawing boundary. |
| AC-4 | All components that do not yet inject `SET_ERROR_KEY` must do so via `inject(SET_ERROR_KEY)` before using it. |
| AC-5 | Each catch block calls `setError` with the caught error (or wraps it in `new Error(String(e))` if it is not already an `Error` instance). |
| AC-6 | Safe fallback values are returned from failed computeds (e.g. `[]` for arrays, `null` for objects, `[-1, 2]` for domain arrays). |
| AC-7 | The `CLAUDE.md` file is updated to document the error handling pattern for new component authors. |
| AC-8 | All existing tests continue to pass after the changes. |
| AC-9 | New unit tests verify that when a component's data source throws, `setError` is called and the component does not throw itself. |

---

## 7. Non-Goals

- This feature does not introduce new error recovery strategies beyond what `useError` already provides.
- This feature does not change the visual design of `ErrorDialog`.
- This feature does not add error handling to the data layer (`AirfoilAnalyser.js`, `atmosphere.js`).
- This feature does not instrument errors with logging or telemetry.

---

## 8. Open Questions

None at this time. The reference implementation in `AirfoilCoordTable.vue` is clear and the pattern is consistent with what the two `App.vue` files already do for their own logic.
