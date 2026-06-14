# Technical Specification: Error Handling Propagation

**Feature name:** error-handling-propagation
**Date:** 2026-06-13
**Status:** Approved
**Functional spec:** docs/functional/error-handling-propagation.md

---

## 1. Overview

Apply the uniform try/catch + `setError` error propagation pattern (already present in `AirfoilCoordTable.vue`) to seven components that currently have unguarded fallible logic. Also document the pattern in `www/CLAUDE.md`.

**Reference implementation:** `www/src/pages/airfoil/components/AirfoilCoordTable.vue`

```js
import { inject } from 'vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'
const setError = inject(SET_ERROR_KEY)

const coords = computed(() => {
  try {
    if (!props.airfoil) return []
    // ... fallible logic ...
  } catch (e) { setError(e) }
})
```

---

## 2. Guard Rules (authoritative)

| Site type | Rule |
|-----------|------|
| `computed()` body | Wrap entire body in try/catch. Return typed safe fallback in catch (`[]`, `null`, `[-1, 2]`). |
| `draw()` function body | Wrap entire body in try/catch. In catch: call `setError(e)` and `return`. |
| `watch()` callback that only calls `draw()` | No extra wrapping needed — `draw()` guard is sufficient. |
| Error value | Pass `e` directly to `setError(e)`. If `e` is known to not be an Error instance, wrap: `setError(e instanceof Error ? e : new Error(String(e)))`. |
| Inject | Every modified file adds `inject(SET_ERROR_KEY)` from `@/composables/useError.js` at the top of `<script setup>`. |

---

## 3. Files to Modify

### 3.1 `www/src/pages/airfoil/components/AirfoilProfileChart.vue`

**Current state:** No error handling. `draw()` calls `aoaAnnotations()` which accesses `props.airfoil.getCruiseConditions(...)`, `props.airfoil.zeroLiftAoA`, `props.airfoil.landingAoa`, `props.airfoil.stallAoa`, and performs D3 operations.

**Changes:**
1. Add `inject` to the `vue` import and import `SET_ERROR_KEY` from `@/composables/useError.js`.
2. Add `const setError = inject(SET_ERROR_KEY)` at the top of `<script setup>`.
3. Wrap the entire `draw()` function body in `try { ... } catch (e) { setError(e); return }`.

**No changes to:** `aoaAnnotations()` — it is only called from within `draw()` so `draw()`'s guard covers it. No changes to `watch()` callback (it only calls `draw()`).

**Safe fallback:** Not applicable to `draw()` — early return after `setError`.

---

### 3.2 `www/src/pages/airfoil/components/LiftCurveChart.vue`

**Current state:** No error handling. `draw()` accesses `props.airfoil.polar`, `props.airfoil.getCruiseCondition(...)`, and performs D3 operations.

**Changes:**
1. Add `inject` to the `vue` import and import `SET_ERROR_KEY` from `@/composables/useError.js`.
2. Add `const setError = inject(SET_ERROR_KEY)` at the top of `<script setup>`.
3. Wrap the entire `draw()` function body in `try { ... } catch (e) { setError(e); return }`.

**No changes to:** `watch()` callback.

---

### 3.3 `www/src/pages/airfoil/components/LiftDragPolarChart.vue`

**Current state:** No error handling. `draw()` accesses `props.airfoil.polar`, `props.airfoil.getCruiseConditions(...)`, `props.airfoil.atAoA(...)`, and performs D3 operations.

**Changes:**
1. Add `inject` to the `vue` import and import `SET_ERROR_KEY` from `@/composables/useError.js`.
2. Add `const setError = inject(SET_ERROR_KEY)` at the top of `<script setup>`.
3. Wrap the entire `draw()` function body in `try { ... } catch (e) { setError(e); return }`.

**No changes to:** `watch()` callback.

---

### 3.4 `www/src/pages/airfoil/components/PolarChart.vue`

**Current state:** No error handling on the `sharedYDomain` computed. It accesses `props.airfoil.polar` and spreads its `cl`, `cd`, `cm` arrays.

**Changes:**
1. Add `inject` to the `vue` import and import `SET_ERROR_KEY` from `@/composables/useError.js`.
2. Add `const setError = inject(SET_ERROR_KEY)` at the top of `<script setup>`.
3. Wrap the body of `sharedYDomain` computed in try/catch:
   ```js
   const sharedYDomain = computed(() => {
     try {
       if (!props.airfoil) return [-1, 2]
       // ... existing logic ...
     } catch (e) { setError(e); return [-1, 2] }
   })
   ```

**Safe fallback:** `[-1, 2]` — matches the existing null-guard default already in the computed.

---

### 3.5 `www/src/pages/airfoil/components/ComparisonTab.vue`

**Current state:** `inject` already used (for `APP_STATE_KEY`) but `SET_ERROR_KEY` is not injected. The `chartData` computed calls `analyser.getCruiseConditions(...)`, `analyser.getCruiseSpeed(...)`, `analyser.getStallSpeed(...)`, `analyser.getLandingSpeed(...)`, `convertWingLoading(...)`, `convertSpeed(...)` — all fallible.

**Changes:**
1. Import `SET_ERROR_KEY` from `@/composables/useError.js` (add to existing imports).
2. Add `const setError = inject(SET_ERROR_KEY)` alongside the existing injects.
3. Wrap the body of `chartData` computed in try/catch:
   ```js
   const chartData = computed(() => {
     try {
       // ... existing logic ...
     } catch (e) { setError(e); return [] }
   })
   ```

**Safe fallback:** `[]` — `hasData` is `chartData.value.length > 0`, so an empty array correctly triggers the "no data" UI.

---

### 3.6 `www/src/pages/airfoil/components/ComparisonChart.vue`

**Current state:** No error handling. `draw()` performs D3 scale, axis, data-join, and tooltip operations.

**Changes:**
1. Add `inject` to the `vue` import and import `SET_ERROR_KEY` from `@/composables/useError.js`.
2. Add `const setError = inject(SET_ERROR_KEY)` at the top of `<script setup>`.
3. Wrap the entire `draw()` function body in `try { ... } catch (e) { setError(e); return }`.

**No changes to:** `watch()` callback. `showTooltip` and `hideTooltip` are defined inside `draw()` so they are covered by `draw()`'s guard.

---

### 3.7 `www/src/pages/index/components/AirfoilPanel.vue`

**Current state:** `inject` already used (for `AIRFOILS_KEY`, `APP_STATE_KEY`, `FOCUSED_PARAM_KEY`). The template iterates `airfoils` directly; if `inject(AIRFOILS_KEY)` returns a malformed value or `airfoils` is not iterable, the template crashes.

**Changes:**
1. Import `SET_ERROR_KEY` from `@/composables/useError.js` (add to existing imports).
2. Add `const setError = inject(SET_ERROR_KEY)` alongside the existing injects.
3. Add a `safeAirfoils` computed that wraps the raw `airfoils` reference:
   ```js
   const safeAirfoils = computed(() => {
     try {
       if (!Array.isArray(airfoils.value)) return []
       return airfoils.value
     } catch (e) { setError(e); return [] }
   })
   ```
4. In the template, replace `v-for="airfoil in airfoils"` with `v-for="airfoil in safeAirfoils"`.

**Safe fallback:** `[]` — empty array renders an empty table body with no crash.

**Note on `airfoils`:** `useAirfoils()` returns `{ airfoils }` where `airfoils` is a plain ref from `inject(AIRFOILS_KEY)`. The destructured `airfoils` is the ref itself; `airfoils.value` holds the array. The `safeAirfoils` computed wraps `.value` access.

---

## 4. Documentation Change

**File:** `www/CLAUDE.md`

Add a new subsection "Error handling in components" immediately after the closing line of the existing "Error handling" section (after the `ErrorDialog.vue` block, before the next `##` heading).

**Content to add:**

```markdown
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

3. Wrap `draw()` function bodies in try/catch with early return:
   ```js
   function draw() {
     try {
       // ... D3 drawing logic ...
     } catch (e) { setError(e); return }
   }
   ```

`watch()` callbacks that only call `draw()` do not need extra wrapping — the `draw()` guard is sufficient.

**Reference implementation:** `www/src/pages/airfoil/components/AirfoilCoordTable.vue`
```

---

## 5. Testing Requirements

### 5.1 Unit tests — new tests required

For each of the seven modified components, write a Vitest unit test that:

1. Mounts the component with a `setError` mock provided under `SET_ERROR_KEY`.
2. Passes a prop that will cause the component's guarded code to throw (e.g. an `airfoil` object whose relevant method throws).
3. Asserts that `setError` was called with an `Error` instance.
4. Asserts that the component itself did not throw during mount/render.

Test file locations: co-locate with the component using the `.test.js` convention, e.g.:
- `www/src/pages/airfoil/components/AirfoilProfileChart.test.js`
- `www/src/pages/airfoil/components/LiftCurveChart.test.js`
- `www/src/pages/airfoil/components/LiftDragPolarChart.test.js`
- `www/src/pages/airfoil/components/PolarChart.test.js`
- `www/src/pages/airfoil/components/ComparisonTab.test.js`
- `www/src/pages/airfoil/components/ComparisonChart.test.js`
- `www/src/pages/index/components/AirfoilPanel.test.js`

### 5.2 Existing tests

Run `npm run test:unit` from `www/` after all changes. All pre-existing tests must continue to pass.

### 5.3 Build verification

Run `npm run build` from `www/` after all changes. Zero build errors are required.

---

## 6. Acceptance Criteria Mapping

| AC | Covered by section |
|----|--------------------|
| AC-1: computed wrapped in try/catch with setError and safe fallback | 3.4, 3.5, 3.7 |
| AC-2: watch callbacks transitively guarded | 3.1, 3.2, 3.3, 3.6 (via draw() guard) |
| AC-3: draw() functions wrapped in try/catch | 3.1, 3.2, 3.3, 3.6 |
| AC-4: SET_ERROR_KEY injected in all modified components | 3.1–3.7 |
| AC-5: catch calls setError(e) | 3.1–3.7 |
| AC-6: safe fallback values returned | 3.4 (`[-1,2]`), 3.5 (`[]`), 3.7 (`[]`) |
| AC-7: CLAUDE.md updated | Section 4 |
| AC-8: existing tests pass | Section 5.2 |
| AC-9: new unit tests for setError being called | Section 5.1 |

---

## 7. Implementation Order

Implement in this sequence to keep diffs reviewable:

1. `AirfoilProfileChart.vue` — draw() guard
2. `LiftCurveChart.vue` — draw() guard
3. `LiftDragPolarChart.vue` — draw() guard
4. `PolarChart.vue` — computed guard
5. `ComparisonTab.vue` — computed guard
6. `ComparisonChart.vue` — draw() guard
7. `AirfoilPanel.vue` — safeAirfoils computed
8. `www/CLAUDE.md` — documentation
9. Unit tests for all seven components
