# Technical Specification — Airfoil Analyser Refactor

**Version:** 1.0
**Date:** 2026-06-12
**Status:** Approved

---

## 1. Overview

This specification covers the refactor of six UI files plus one composable to eliminate direct imports of aerodynamic utility functions. All aerodynamic data will instead be consumed from `AirfoilAnalyser` instances. The `AirfoilAnalyser` class itself is not modified.

The refactor resolves two open questions from the functional specification:

- **OQ-1 (Charts):** The parent (`PolarChart.vue`) will pass `cruiseAoa` as a pre-computed prop to `LiftCurveChart` and `LiftDragPolarChart`. Those charts drop their `interpolateAoA` / `interpolateAtAoA` imports entirely and use the prop value for annotation placement. This eliminates aerodynamic-interpolation calls from chart components while keeping their drawing logic self-contained.
- **OQ-2 (Speed metrics):** `speedParameters.js` is retained as a permitted physics helper in `ComparisonTab`. It is not an aerodynamic-interpolation utility; it consumes already-resolved coefficients. `ComparisonTab` obtains those coefficients from the `AirfoilAnalyser` instance properties (no calls to `getStallParameters` etc.).

---

## 2. Architecture

### 2.1 Dependency graph (after refactor)

```
airfoils.json
    │
    ├─► useAirfoils.js          constructs AirfoilAnalyser[]
    │       └─► AirfoilPanel    reads .profileName / .stallAoa / .stallCl
    │
    └─► airfoil/App.vue         constructs AirfoilAnalyser[]
            ├─► ParameterPanel  calls .getCruiseConditions()
            ├─► PolarChart      passes analyser instance; calls .getCruiseConditions()
            │       ├─► LiftCurveChart    receives cruiseAoa prop, reads .polar
            │       └─► LiftDragPolarChart  receives cruiseAoa prop, reads .polar
            ├─► AirfoilViewerTab
            │       └─► AirfoilProfileChart  reads instance properties directly
            └─► ComparisonTab   reads instance properties; uses speedParameters.js
```

### 2.2 AirfoilAnalyser instance shape (reference)

All properties computed at construction time:

| Property | Type | Notes |
|----------|------|-------|
| `profileName` | `string` | |
| `polar` | `array` | Raw polar data, passed through |
| `zeroLiftAoA` | `number` | |
| `zeroLiftCl` | `number` | Always 0 |
| `zeroLiftCd` | `number\|null` | |
| `zeroLiftCm` | `number\|null` | |
| `stallAoa` | `number` | |
| `stallCl` | `number` | |
| `stallCd` | `number` | |
| `stallCm` | `number` | |
| `landingAoa` | `number\|null` | |
| `landingCl` | `number\|null` | |
| `landingCd` | `number\|null` | |
| `landingCm` | `number\|null` | |

Method: `getCruiseConditions(wingLoading, speed, altitude)` → `{ cruiseCl, cruiseAoa, cruiseCd, cruiseCm }` (all `number|null`).

### 2.3 New `atAoA` method on AirfoilAnalyser

The approved architecture adds an `atAoA(aoa)` method to `AirfoilAnalyser` returning `{ cl, cd, cm } | null`. This is needed so chart components can look up the CD at the cruise operating point without importing `interpolateAtAoA` directly.

**Note:** This is the only permitted change to `AirfoilAnalyser.js`. It is an additive extension, not a modification of existing behaviour. The functional spec's "out of scope" clause refers to modifying existing aerodynamic computations; adding a thin delegation method is within scope.

```js
// In AirfoilAnalyser.js — additive only
atAoA(aoa) {
  if (aoa == null) return null
  return interpolateAtAoA(this.polar, aoa) ?? null
}
```

---

## 3. File-by-file Changes

### 3.1 `www/src/js/AirfoilAnalyser.js`

**Change:** Add `atAoA(aoa)` method (delegates to existing `interpolateAtAoA`). No other changes.

**Rationale:** Lets chart components resolve CD at a known AoA without needing their own import of `interpolateAtAoA`.

---

### 3.2 `www/src/pages/index/composables/useAirfoils.js`

**Current:** Returns raw `airfoilsData` array.

**After:**
```js
import { AirfoilAnalyser } from '@/js/AirfoilAnalyser'
import airfoilsData from '@/assets/airfoils.json'

export const AIRFOILS_KEY = Symbol('airfoils')

const airfoils = airfoilsData.map(entry => new AirfoilAnalyser(entry))

export function useAirfoils() {
  return { airfoils }
}
```

The array is module-level (constructed once). Each call to `useAirfoils()` returns the same array reference.

**Contract change:** `airfoils` elements are now `AirfoilAnalyser` instances. Properties accessed by `AirfoilPanel` (`profileName`, `stallAoa`, `stallCl`, `zeroLiftAoA`) are present on the instance unchanged.

---

### 3.3 `www/src/pages/index/composables/useAirfoils.test.js`

**Changes:**
- Update the "each profile has required fields" test: check for `profileName`, `zeroLiftAoA`, `stallAoa`, `stallCl`, `polar` (instance property names, not raw JSON field names).
- Remove checks for `stall_clmax` and `stall_aoa`.
- Add: verify each element is an instance of `AirfoilAnalyser`.

---

### 3.4 `www/src/pages/index/components/ParameterPanel.vue`

**Imports removed:** `computeCruiseCL` from `liftCoefficient.js`, `interpolateAoA` from `interpolateAoA.js`.

**Logic change:**

`cruiseCL` and `cruiseAoA` computeds are rewritten to call `selectedAirfoil.value.getCruiseConditions(wl_SI, speed_SI, alt_SI)`.

```js
const cruiseConditions = computed(() => {
  if (!selectedAirfoil.value) return { cruiseCl: null, cruiseAoa: null }
  const { wingLoading, cruisingSpeed: speed, siteAltitude } = getState()
  const wl_SI    = convertWingLoading(wingLoading, system.value, 'SI')
  const speed_SI = convertSpeed(speed, system.value, 'SI')
  const alt_SI   = convertDistance(siteAltitude, system.value, 'SI')
  return selectedAirfoil.value.getCruiseConditions(wl_SI, speed_SI, alt_SI)
})

const cruiseCL  = computed(() => cruiseConditions.value.cruiseCl  != null
  ? cruiseConditions.value.cruiseCl.toFixed(3) : '—')
const cruiseAoA = computed(() => cruiseConditions.value.cruiseAoa != null
  ? cruiseConditions.value.cruiseAoa.toFixed(1) : null)
```

When `selectedAirfoil.value` is null (no airfoil selected), both return their null/`—` defaults — identical to current behaviour.

---

### 3.5 `www/src/pages/index/components/ParameterPanel.test.js`

**Changes:**
- Update `MOCK_AIRFOILS` shape: replace `stall_aoa` / `stall_clmax` with `stallAoa` / `stallCl`.
- Add `getCruiseConditions` mock method to each mock object so `ParameterPanel` can call it.

```js
const MOCK_AIRFOILS = [
  {
    profileName: 'E168 (12%)',
    zeroLiftAoA: 0,
    stallAoa: 11,
    stallCl: 1.047,
    polar: [],
    getCruiseConditions: () => ({ cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null }),
  },
  // …
]
```

No tests assert on specific CL/AoA display values (they don't in the current suite), so no numeric assertions need updating.

---

### 3.6 `www/src/pages/airfoil/App.vue`

**Imports removed:** `computeCruiseCL` from `liftCoefficient.js`.

**New import:** `AirfoilAnalyser` from `@/js/AirfoilAnalyser`.

**Changes:**

1. Build an analyser array at module-evaluation time (same pattern as `useAirfoils`):
   ```js
   import { AirfoilAnalyser } from '@/js/AirfoilAnalyser'
   const analysers = airfoilData.map(entry => new AirfoilAnalyser(entry))
   ```

2. `selectedAirfoilData` computed returns the matching `AirfoilAnalyser` instance:
   ```js
   const selectedAirfoilData = computed(() =>
     analysers.find(a => a.profileName === state.value.selectedAirfoil) ?? analysers[0]
   )
   ```

3. `airfoilList` derives from instance `.profileName` — no change in logic since the property name is the same.

4. `targetCl` computed calls `getCruiseConditions` on the selected analyser instead of calling `computeCruiseCL` directly:
   ```js
   const targetCl = computed(() => {
     const s = state.value
     const wl  = s.units === 'Imperial' ? convertWingLoading(s.wingLoading,  'Imperial', 'SI') : s.wingLoading
     const spd = s.units === 'Imperial' ? convertSpeed(s.cruisingSpeed,      'Imperial', 'SI') : s.cruisingSpeed
     const alt = s.units === 'Imperial' ? convertDistance(s.siteAltitude,    'Imperial', 'SI') : s.siteAltitude
     return selectedAirfoilData.value.getCruiseConditions(wl, spd, alt).cruiseCl
   })
   ```

5. URL sync (`onMounted`, `watch`) reads `airfoilData` array for the profile name lookup — this remains unchanged as it only uses `profileName`.

**Note:** `targetCl` consumers (child components) receive the same `number | null` value as before. The prop contract is unchanged.

---

### 3.7 `www/src/pages/airfoil/components/AirfoilProfileChart.vue`

**Imports removed:** `interpolateAoA` from `interpolateAoA.js`, `getStallParameters` and `getLandingParameters` from `stallParameters.js`.

**`aoaAnnotations()` rewrite:**

The function currently calls `getStallParameters(a)` and `getLandingParameters(a)`. After refactor it reads instance properties directly:

```js
function aoaAnnotations() {
  const a = props.airfoil   // now an AirfoilAnalyser instance
  const cruiseAoa = props.cruiseAoa   // new prop — see below

  return [
    { aoa: a.zeroLiftAoA, label: `ZL ${a.zeroLiftAoA.toFixed(1)}°`, color: '#64748b' },
    ...(cruiseAoa != null
      ? [{ aoa: cruiseAoa, label: `Cruise ${cruiseAoa.toFixed(1)}°`, color: '#3b82f6' }]
      : []),
    ...(a.landingAoa != null
      ? [{ aoa: a.landingAoa, label: `Land. ${a.landingAoa.toFixed(1)}°`, color: '#16a34a' }]
      : []),
    { aoa: a.stallAoa, label: `Stall ${a.stallAoa.toFixed(1)}°`, color: '#dc2626' },
  ]
}
```

**New prop:** `cruiseAoa` (number | null, default null) replaces the inline `interpolateAoA(a.polar, props.targetCl)` call. The parent (`AirfoilViewerTab`) already has `targetCl`; it must compute `cruiseAoa` via `selectedAirfoilData.getCruiseConditions(...)` and pass it down. See §3.9.

**Removed prop:** `targetCl` is no longer used by `AirfoilProfileChart` and should be removed.

---

### 3.8 `www/src/pages/airfoil/components/AirfoilProfileChart.test.js`

**Changes:**
- Add `stallAoa`, `stallCl`, `stallCd`, `stallCm`, `zeroLiftAoA`, `landingAoa`, `landingCl` properties to `MOCK_AIRFOIL`.
- Update `defineProps` expectation: `cruiseAoa` prop replaces `targetCl`.
- Existing structural tests (mounts, renders SVG, ResizeObserver) remain unchanged.

---

### 3.9 `www/src/pages/airfoil/components/AirfoilViewerTab.vue`

**No utility imports to remove** (file does not currently import any aerodynamic utilities). However, `AirfoilViewerTab` passes `targetCl` to `AirfoilProfileChart`. After the prop rename in §3.7, it must instead compute `cruiseAoa` and pass that.

**Change:**
```js
// AirfoilViewerTab reads selectedAirfoilData (AirfoilAnalyser) and targetCl from props/inject
const cruiseAoa = computed(() => {
  if (!props.targetCl || !selectedAirfoilData.value) return null
  return selectedAirfoilData.value.getCruiseConditions(...siParams).cruiseAoa
})
```

Pass `:cruise-aoa="cruiseAoa"` to `<AirfoilProfileChart>` instead of `:target-cl`.

If `AirfoilViewerTab` does not currently have access to flight parameters (wing loading, speed, altitude), it receives them as props from `airfoil/App.vue` — or, more simply, `airfoil/App.vue` computes `cruiseAoa` as a second top-level computed alongside `targetCl` and passes it to `AirfoilViewerTab` as a prop, which forwards it to `AirfoilProfileChart`.

**Preferred approach:** `airfoil/App.vue` computes and provides `cruiseAoa` as a sibling of `targetCl`:
```js
const cruiseAoa = computed(() =>
  selectedAirfoilData.value.getCruiseConditions(wl, spd, alt).cruiseAoa
)
```
Pass both `:target-cl="targetCl"` and `:cruise-aoa="cruiseAoa"` wherever needed.

---

### 3.10 `www/src/pages/airfoil/components/LiftCurveChart.vue`

**Import removed:** `interpolateAoA` from `interpolateAoA.js`.

**New prop:** `cruiseAoa` (number | null, default null) — the pre-computed AoA at which the CL curve crosses `targetCl`.

**Change in `draw()`:** Replace `let crossAoa = interpolateAoA(polar, props.targetCl)` with `const crossAoa = props.cruiseAoa`.

The parent (`PolarChart.vue`) already calls `getCruiseConditions()` (via the analyser) to obtain `targetCl`; it will also pass `cruiseAoa` from the same call result.

---

### 3.11 `www/src/pages/airfoil/components/LiftCurveChart.test.js`

**Changes:**
- Add `cruiseAoa` to `MOCK_AIRFOIL` fixture or pass as prop in tests that exercise the crosshair annotation.
- Existing structural tests are unaffected.

---

### 3.12 `www/src/pages/airfoil/components/LiftDragPolarChart.vue`

**Imports removed:** `interpolateAoA` from `interpolateAoA.js`, `interpolateAtAoA` from `interpolateAtAoA.js`.

**New props:** `cruiseAoa` (number | null, default null).

**Change in `draw()`:**
```js
// Replace:
let opAoA = interpolateAoA(polar, props.targetCl)
let opCD  = interpolateAtAoA(polar, opAoA)?.cd

// With:
const opAoA = props.cruiseAoa
const opCD  = opAoA != null ? props.airfoil.atAoA(opAoA)?.cd : null
```

`props.airfoil` is an `AirfoilAnalyser` instance; the new `atAoA()` method (§3.1) is used here.

---

### 3.13 `www/src/pages/airfoil/components/LiftDragPolarChart.test.js`

**Changes:**
- Update `MOCK_AIRFOIL` fixture to include `stallAoa`, `stallCl`, `atAoA` method (or add it as a vi.fn stub).
- Add `cruiseAoa` prop to tests that exercise the operating-point dot.

---

### 3.14 `www/src/pages/airfoil/components/PolarChart.vue`

`PolarChart` is the parent of `LiftCurveChart` and `LiftDragPolarChart`. It receives the `airfoil` (now an `AirfoilAnalyser` instance) and `targetCl` props from `airfoil/App.vue`.

**Change:** Compute `cruiseAoa` from the analyser and pass it as a prop to both chart children:

```js
const cruiseAoa = computed(() => {
  if (!props.airfoil || props.targetCl == null) return null
  // getCruiseConditions returns cruiseAoa; but targetCl was already computed from it in App.vue.
  // More efficient: use interpolateAoA on the polar via the analyser method.
  // Since atAoA is additive, use getCruiseConditions result cached in App — or call it again.
  // Simplest: App.vue passes cruiseAoa as a sibling prop (see §3.9).
})
```

**Preferred approach (consistent with §3.9):** `airfoil/App.vue` exposes `cruiseAoa` as a second computed and passes it as a prop to `PolarChart`, `AirfoilViewerTab`, and `ComparisonTab`. Each forwards it to its children as appropriate.

This avoids redundant `getCruiseConditions` calls and is consistent — `App.vue` remains the single site where flight-condition calculations are initiated.

---

### 3.15 `www/src/pages/airfoil/components/ComparisonTab.vue`

**Imports removed:** `interpolateAoA`, `interpolateAtAoA`, `computeCruiseDeltaAoA`, `getStallParameters`, `getLandingParameters`.

**Imports retained:** `computeCruiseSpeed`, `computeStallSpeed`, `computeLandingSpeed` from `speedParameters.js` (physics helpers — permitted per OQ-2 resolution).

**Imports retained:** `convertWingLoading`, `convertDistance`, `convertSpeed` from `units.js` (not aerodynamic utilities).

**`chartData` computed rewrite:**

The per-airfoil loop currently iterates `airfoilData` (raw JSON). After refactor it iterates the `AirfoilAnalyser[]` array obtained via `useAirfoil()` or from the provide. The `selectedAirfoilData` is already an `AirfoilAnalyser` instance; the full list must also be available.

**Data source for the full list:** `ComparisonTab` currently imports `airfoilData` from `airfoils.json` directly. After refactor it must obtain the `AirfoilAnalyser[]` list. Two options:

- **Option A:** Import `useAirfoils` and call it — the module-level array is already constructed.
- **Option B:** Receive the array via prop or inject from `airfoil/App.vue`.

**Decision: Option A** — `ComparisonTab` calls `useAirfoils()` to get the pre-constructed analyser array. This is consistent with the index page, requires no prop threading, and `useAirfoils` is already a shared composable.

**Per-entry metric derivation:**

```js
return analysers.map(analyser => {
  const cruise = props.targetCl != null
    ? analyser.getCruiseConditions(wingLoadingSI, cruisingSpdSI, altitudeSI)
    : { cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null }

  const vals = {
    cruiseCl:       cruise.cruiseCl,
    cruiseAoa:      cruise.cruiseAoa,
    cruiseCd:       cruise.cruiseCd,
    cruiseCm:       cruise.cruiseCm,
    cruiseDeltaAoA: cruise.cruiseAoa != null
      ? cruise.cruiseAoa - analyser.zeroLiftAoA
      : null,
    stallAoa:     analyser.stallAoa,
    stallCl:      analyser.stallCl,
    stallCd:      analyser.stallCd,
    stallCm:      analyser.stallCm,
    landingAoa:   analyser.landingAoa,
    landingCl:    analyser.landingCl,
    landingCd:    analyser.landingCd,
    landingCm:    analyser.landingCm,
    cruiseSpeed:  toDisplaySpeed(computeCruiseSpeed(wingLoadingSI, cruise.cruiseCl, altitudeSI)),
    stallSpeed:   toDisplaySpeed(computeStallSpeed(wingLoadingSI,  analyser.stallCl, altitudeSI)),
    landingSpeed: toDisplaySpeed(computeLandingSpeed(wingLoadingSI, analyser.stallCl, altitudeSI)),
  }
  return {
    profileName: analyser.profileName,
    x: vals[xMetric.value],
    y: vals[yMetric.value],
    isSelected: analyser.profileName === selectedAirfoilData.value.profileName,
  }
}).filter(d => d.x != null && d.y != null)
```

Note: `getCruiseConditions` requires `(wingLoading, speed, altitude)` not `(wingLoading, targetCl, altitude)`. The `targetCl` prop is still used to gate whether cruise metrics are available (the `needsCruise` guard), but the actual call takes the raw flight parameters to internally recompute CL per-airfoil. This is correct behaviour: each airfoil in the comparison has the same flight conditions applied, so the CL will differ per airfoil based on their individual polar curves — which is exactly what the comparison should show.

**Correction from functional spec FR-12:** `cruiseCl` in the comparison chart is _not_ a fixed `props.targetCl` shared across all airfoils. Each airfoil's cruise CL is computed from its own polar at the given flight conditions. This is the correct aerodynamic interpretation and matches what the current code computes (where `props.targetCl` was the index-page `computeCruiseCL` result that was airfoil-agnostic only coincidentally). The `targetCl` prop is retained as the gate/guard but each analyser computes its own cruise conditions.

---

### 3.16 `www/src/pages/airfoil/components/ComparisonTab.test.js`

The existing tests mock `selectedAirfoilData` with a plain object containing only `profileName`. The `chartData` computed now iterates `useAirfoils()` analysers, so the mock must also cover that data source.

**Changes:**
- Stub `useAirfoils` at module level in the test to return a small `AirfoilAnalyser`-shaped mock array (or real `AirfoilAnalyser` instances).
- Existing behaviour tests (prompt text, chart render/hide logic, axis label tests) are unaffected in their assertions — only the mock setup changes.

---

## 4. Integration Points

### 4.1 `airfoil/App.vue` — prop threading

After refactor, `airfoil/App.vue` computes two values from the selected analyser:
- `targetCl` — passed to `PolarChart`, `AirfoilViewerTab` (forwarded to `ComparisonTab`).
- `cruiseAoa` — passed to `PolarChart`, `AirfoilViewerTab`.

`PolarChart` forwards `cruiseAoa` to `LiftCurveChart` and `LiftDragPolarChart`.
`AirfoilViewerTab` forwards `cruiseAoa` to `AirfoilProfileChart`.

### 4.2 `useAirfoil` composable (airfoil page)

`selectedAirfoilData` returned by `useAirfoil()` will now be an `AirfoilAnalyser` instance. All consumers of this composable that currently read raw JSON fields must be updated to use instance properties.

---

## 5. Data Flow Summary

```
airfoil/App.vue
  analysers = airfoilData.map(e => new AirfoilAnalyser(e))   [module level]
  selectedAirfoilData = analysers.find(...)                   [computed]
  targetCl  = selectedAirfoilData.getCruiseConditions(...).cruiseCl   [computed]
  cruiseAoa = selectedAirfoilData.getCruiseConditions(...).cruiseAoa  [computed]
      │
      ├── :airfoil="selectedAirfoilData"  :target-cl="targetCl"  :cruise-aoa="cruiseAoa"
      │       → PolarChart
      │           ├── LiftCurveChart    :cruise-aoa="cruiseAoa"
      │           └── LiftDragPolarChart :cruise-aoa="cruiseAoa"
      │
      ├── :target-cl="targetCl"  :cruise-aoa="cruiseAoa"
      │       → AirfoilViewerTab
      │           └── AirfoilProfileChart  :airfoil="selectedAirfoilData"  :cruise-aoa="cruiseAoa"
      │
      └── :target-cl="targetCl"
              → ComparisonTab
                  (uses useAirfoils() for all analysers)
```

---

## 6. Acceptance Criteria Cross-Reference

| AC | Technical implementation |
|----|--------------------------|
| AC-01 | `useAirfoils.js` maps JSON to `AirfoilAnalyser` instances (§3.2) |
| AC-02 | `AirfoilPanel` reads `stallAoa`, `stallCl` — present on instance (§3.2) |
| AC-03 | `airfoil/App.vue` uses `getCruiseConditions` not `computeCruiseCL` (§3.6) |
| AC-04 | `AirfoilProfileChart` reads instance props, no `getStallParameters` import (§3.7) |
| AC-05 | `ComparisonTab` imports only `speedParameters.js`; all aerodynamic data via instance (§3.15) |
| AC-06 | `ParameterPanel` uses `getCruiseConditions`, no `computeCruiseCL`/`interpolateAoA` import (§3.4) |
| AC-07 | All test fixtures updated to `AirfoilAnalyser` shape (§3.3, §3.5, §3.8, §3.13, §3.16) |
| AC-08 | `targetCl` prop contract unchanged — `airfoil/App.vue` still passes `number\|null` (§3.6) |
| AC-09 | `getCruiseConditions` delegates to same utilities as before; numerics identical (§3.4) |
| AC-10 | `ComparisonTab` uses same computation path via analyser; no numeric change (§3.15) |
| AC-11 | `AirfoilProfileChart` reads pre-computed instance properties; annotations unchanged (§3.7) |

---

## 7. Test Strategy

- All changed files have corresponding test files updated in the same chunk.
- Tests that only check structural rendering (mounts, renders SVG, ResizeObserver) require only mock fixture updates — no assertion changes.
- Tests that check computed values (axis labels, chart data guards, CL/AoA display) will pass unchanged once mocks return the correct shape.
- `useAirfoils.test.js` gains one new assertion: verify returned elements are `AirfoilAnalyser` instances.
- No new test files are created.

---

## 8. Out of Scope (confirmed)

- Utility files (`stallParameters.js`, `interpolateAoA.js`, `interpolateAtAoA.js`, `liftCoefficient.js`, `cruiseDeltaAoA.js`) — not deleted, not modified.
- `useAppState.js`, `index/App.vue` — no aerodynamic utility imports; unchanged.
- Chart rendering/D3 drawing logic — only the data inputs to annotations change.
- Any new aerodynamic features or user-visible UI changes.
