# Technical Specification: Wing Performance Table

## 1. Overview

Add a reactive HTML table overlay to `WingDiagramChart.vue` that displays cruise and landing angles of attack in two columns: Infinite AR (2D airfoil) and Wing (finite-span corrected). The overlay is positioned `absolute top-0 right-0` inside the component's existing `relative` container.

## 2. Scope

Single component modification: `www/src/pages/index/components/WingDiagramChart.vue`
Single test file update: `www/src/pages/index/components/WingDiagramChart.test.js`

No new files, no new composables, no changes to `AirfoilAnalyser.js`, `useAppState.js`, or any other shared module.

## 3. Architecture

### 3.1 Overlay approach

The table is rendered as an HTML `<div>` placed in the component's `<template>` alongside the existing `<svg>`. The container `<div ref="containerEl">` already has `class="relative w-full h-full"`, so a child element with `class="absolute top-0 right-0"` will position correctly.

Using HTML rather than D3/SVG for the table:
- Enables standard Tailwind styling without D3 boilerplate.
- Makes the table trivially testable via `@vue/test-utils` DOM queries.
- Avoids re-drawing the table inside the D3 `draw()` function, keeping D3 concerns (the planform geometry) cleanly separated from tabular data concerns.

### 3.2 New inject: AIRFOILS_KEY

`WingDiagramChart.vue` currently does not inject the airfoil list. Add:

```js
import { AIRFOILS_KEY } from '../composables/useAirfoils'
const { airfoils } = inject(AIRFOILS_KEY)
```

`airfoils` is a plain array of `AirfoilAnalyser` instances constructed once at module load time in `useAirfoils.js`. It is safe to inject and iterate synchronously.

### 3.3 performanceData computed

Add a single `computed` property that derives all four table cell values. It returns an object with this shape:

```js
{
  cruiseAoaInfinite: number | null,   // degrees
  cruiseAoaWing:     number | null,   // degrees
  landingAoaInfinite: number | null,  // degrees
  landingAoaWing:     number | null,  // degrees
}
```

`null` means "display as —".

#### 3.3.1 Airfoil lookup

```js
const s = getState()
const analyser = airfoils.find(a => a.profileName === s.airfoilProfile) ?? null
```

If `analyser` is `null`, return all-null result immediately.

#### 3.3.2 SI conversion

State values are in the active unit system. Convert to SI before aerodynamic computation:

```js
import { convertDistance, convertWingLoading, convertSpeed } from '@/units/units.js'

const wl  = convertWingLoading(s.wingLoading,    s.units, 'SI')  // g/dm²
const spd = convertSpeed(s.cruisingSpeed,         s.units, 'SI')  // m/s
const alt = convertDistance(s.siteAltitude,       s.units, 'SI')  // m
const b   = convertDistance(s.wingSpan,           s.units, 'SI')  // m
const rc  = convertDistance(s.rootChord,          s.units, 'SI')  // m
const tc  = convertDistance(s.tipChord,           s.units, 'SI')  // m
```

#### 3.3.3 Cruise CL and Infinite AR AoA

```js
const cruiseCl = AirfoilAnalyser.convertSpeedToCl(wl, spd, alt)  // null if wl/spd are 0
const { cruiseAoa: cruiseAoaInfinite, cruiseCl: resolvedCruiseCl } =
  analyser.getCruiseConditions(cruiseCl)
// cruiseAoaInfinite may be null if cruiseCl is null or out of polar range
```

Note: `getCruiseConditions` returns `{ cruiseCl, cruiseAoa, cruiseCd, cruiseCm }` where `cruiseCl` is the passed-in value (not re-derived). We need it back for the wing correction.

#### 3.3.4 Landing AoA (Infinite AR)

```js
const landingAoaInfinite = analyser.landingAoa   // pre-computed in constructor; null if unavailable
const landingCl          = analyser.landingCl    // null if unavailable
```

#### 3.3.5 Aspect ratio

```js
const wingArea = (rc + tc) / 2 * b     // m²
const AR = (b * b) / wingArea           // dimensionless
// AR is invalid if wingArea <= 0 or b <= 0; guard with: if (wingArea <= 0 || b <= 0) AR = null
```

#### 3.3.6 Induced AoA correction

Oswald efficiency `e = 0.85` (module-level constant).

```js
const E = 0.85

function inducedAoaDeg(cl, ar) {
  if (cl == null || ar == null || ar <= 0) return null
  return (cl / (Math.PI * ar * E)) * (180 / Math.PI)
}
```

#### 3.3.7 Wing column values

```js
const cruiseAoaWing = (cruiseAoaInfinite != null && resolvedCruiseCl != null && AR != null)
  ? cruiseAoaInfinite + inducedAoaDeg(resolvedCruiseCl, AR)
  : null

const landingAoaWing = (landingAoaInfinite != null && landingCl != null && AR != null)
  ? landingAoaInfinite + inducedAoaDeg(landingCl, AR)
  : null
```

#### 3.3.8 Full computed with error guard

```js
const performanceData = computed(() => {
  const nullResult = {
    cruiseAoaInfinite: null, cruiseAoaWing: null,
    landingAoaInfinite: null, landingAoaWing: null,
  }
  try {
    // ... logic above ...
    return { cruiseAoaInfinite, cruiseAoaWing, landingAoaInfinite, landingAoaWing }
  } catch (e) { setError(e); return nullResult }
})
```

### 3.4 Formatting helper

```js
function fmtAoa(val) {
  if (val == null || !isFinite(val)) return '—'
  return val.toFixed(1) + '°'
}
```

### 3.5 Template

Add after the `<svg>` element inside the container `<div>`:

```html
<div class="absolute top-0 right-0 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-bl-md text-xs">
  <table class="border-collapse">
    <thead>
      <tr>
        <th class="px-2 py-1 text-left font-medium text-slate-500"></th>
        <th class="px-2 py-1 text-center font-medium text-slate-500">Infinite AR</th>
        <th class="px-2 py-1 text-center font-medium text-slate-500">Wing</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="px-2 py-1 text-slate-600">Cruise AoA</td>
        <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.cruiseAoaInfinite) }}</td>
        <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.cruiseAoaWing) }}</td>
      </tr>
      <tr>
        <td class="px-2 py-1 text-slate-600">Landing AoA</td>
        <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.landingAoaInfinite) }}</td>
        <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.landingAoaWing) }}</td>
      </tr>
    </tbody>
  </table>
</div>
```

## 4. Integration points

| Integration | File | Change |
|-------------|------|--------|
| Inject airfoil list | `WingDiagramChart.vue` | Add `inject(AIRFOILS_KEY)` |
| AirfoilAnalyser API | `AirfoilAnalyser.js` | Read-only: `landingAoa`, `landingCl`, `getCruiseConditions()`, `convertSpeedToCl()` |
| Units conversion | `@/units/units.js` | Import `convertWingLoading`, `convertSpeed` (already imported: `convertDistance`) |
| App.vue provide | `App.vue` | No change — `AIRFOILS_KEY` is already provided |

## 5. Test plan (`WingDiagramChart.test.js`)

All tests follow TDD. Write tests first, then implement.

| # | Test description | State / inputs | Expected |
|---|-----------------|----------------|----------|
| T1 | Table is rendered in the DOM | Default state (no airfoil) | `div.absolute` with table element exists |
| T2 | All cells show "—" when no airfoil selected | `airfoilProfile: null` | All 4 data cells contain "—" |
| T3 | Cruise cells show "—" when cruisingSpeed is 0 | valid airfoil, `cruisingSpeed: 0` | Cruise row cells = "—"; landing row may have values |
| T4 | Landing AoA (Infinite AR) matches analyser.landingAoa | valid airfoil with known landingAoa | cell = `landingAoa.toFixed(1) + '°'` |
| T5 | Wing column cruise AoA > Infinite AR cruise AoA | valid airfoil, positive cruise CL, valid wing dims | `cruiseAoaWing > cruiseAoaInfinite` |
| T6 | Landing AoA Wing > Infinite AR landing AoA | valid airfoil, positive landing CL, valid wing dims | `landingAoaWing > landingAoaInfinite` |
| T7 | Wing cells show "—" when wing span is 0 (AR undefined) | valid airfoil, `wingSpan: 0` | Wing column cells = "—" |
| T8 | performanceData error routes through setError | computed getter throws | setError called once with Error instance |

### Test fixture requirements

- Tests T2–T8 require a real or mock `AirfoilAnalyser` instance in the airfoils provide. Use a minimal mock object with the required shape rather than importing real airfoil JSON.
- Tests must provide `AIRFOILS_KEY` in `global.provide`.
- The existing `mountChart` / `mountChartWithDraw` helpers must be extended to accept an `airfoils` override for `AIRFOILS_KEY`.

### Mock analyser shape for tests

```js
const MOCK_ANALYSER = {
  profileName:    'test-foil',
  landingAoa:     8.5,
  landingCl:      0.9,
  getCruiseConditions: (cl) => cl != null
    ? { cruiseCl: cl, cruiseAoa: 4.0, cruiseCd: 0.02, cruiseCm: -0.05 }
    : { cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null },
}
// AirfoilAnalyser.convertSpeedToCl is a static method — stub on the class in tests
// or use a real airfoil entry for integration-level tests.
```

Because `AirfoilAnalyser.convertSpeedToCl` is a static method, tests that need to control the cruise CL must either:
(a) stub `AirfoilAnalyser.convertSpeedToCl` with `vi.spyOn`, or
(b) pass wing loading and speed values for which the real formula produces a known, in-range CL.

Option (b) is preferred to avoid coupling tests to implementation details.

## 6. Acceptance criteria cross-reference

| Functional AC | Technical implementation |
|---------------|-------------------------|
| AC1: Numeric values when airfoil selected | `performanceData` computed returns non-null for all four values |
| AC2: "—" when no airfoil | `analyser === null` early-return path |
| AC3: "—" for cruise when speed/WL = 0 | `AirfoilAnalyser.convertSpeedToCl` returns null; `getCruiseConditions(null)` returns null AoA |
| AC4: Wing >= Infinite AR for positive CL | `inducedAoaDeg` always positive for positive CL and positive AR |
| AC5: Landing AoA matches analyser.landingAoa | Direct property read from `AirfoilAnalyser` instance |
| AC6: Format `x.x°` | `fmtAoa` function |
| AC7: top-0 right-0 | Tailwind classes on overlay div |
| AC8: Reactive updates | `computed` depends on `getState()` and `airfoils` array |

## 7. Constants

```js
const OSWALD_E = 0.85   // Oswald efficiency factor — module-level constant
```

## 8. Files changed

| File | Change type |
|------|-------------|
| `www/src/pages/index/components/WingDiagramChart.vue` | Modified — add inject, computed, helper, template overlay |
| `www/src/pages/index/components/WingDiagramChart.test.js` | Modified — extend helpers + 8 new tests |
