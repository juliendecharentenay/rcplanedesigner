# Technical Specification: WingAnalyser Class

## 1. Context

`www/src/js/WingAnalyser.js` is a stub class. Two Vue components contain inline wing
calculations that must be centralised into this class:

- `WingDefinitionPanel.vue` — taper ratio, wing area, aspect ratio, root/tip Reynolds numbers.
- `WingDiagramChart.vue` — MAC, MAC span position, MAC LE offset, induced AoA, wing-corrected
  cruise and landing AoA.

The refactor must not change any displayed value or user-visible behaviour.

## 2. Class Design

### 2.1 File

`www/src/js/WingAnalyser.js` — replaces the current stub. No Vue import. Only external
dependency: `import { atmosphere } from './atmosphere'`.

### 2.2 Constructor

```js
constructor({ wingSpan, rootChord, tipChord, sweepAngle })
```

All inputs are in SI units:
- `wingSpan` — full span in metres.
- `rootChord` — root chord length in metres.
- `tipChord` — tip chord length in metres.
- `sweepAngle` — quarter-chord sweep angle in degrees.

All four are stored as `this.wingSpan`, `this.rootChord`, `this.tipChord`, `this.sweepAngle`.

### 2.3 Module-Level Constant

```js
const OSWALD_E = 0.85
```

Extracted from `WingDiagramChart.vue`. Not a constructor parameter.

### 2.4 Getter Properties

All getters follow the null-propagation rule: if a prerequisite is null/invalid, return null.

#### `taperRatio`
```
return this.rootChord > 0 ? this.tipChord / this.rootChord : null
```

#### `wingArea`
```
if (this.wingSpan <= 0 || this.rootChord <= 0) return null
return (this.rootChord + this.tipChord) / 2 * this.wingSpan
```

#### `aspectRatio`
```
const area = this.wingArea
if (area == null || area <= 0) return null
return (this.wingSpan * this.wingSpan) / area
```

#### `mac`
```
const λ = this.taperRatio
if (λ == null) return null
return (2 / 3) * this.rootChord * (1 + λ + λ * λ) / (1 + λ)
```

Standard mean aerodynamic chord for a trapezoidal planform.

#### `macSpanPosition`
```
const λ = this.taperRatio
if (λ == null) return null
return (this.wingSpan / 2) * (1 + 2 * λ) / (3 * (1 + λ))
```

Distance from centreline (metres) where the MAC is located spanwise.

#### `macLeadingEdgeOffset`
```
const λ = this.taperRatio
if (λ == null) return null
const halfSpan  = this.wingSpan / 2
const sweepRad  = this.sweepAngle * Math.PI / 180
const xTipLE    = halfSpan * Math.tan(sweepRad) + 0.25 * (this.rootChord - this.tipChord)
return xTipLE * (this.macSpanPosition / halfSpan)
```

This exactly mirrors the inline draw() computation in `WingDiagramChart.vue`:
`xTipLE` is the chordwise position of the tip LE relative to root LE (positive = aft).
`macLeadingEdgeOffset` is the interpolated LE position at the MAC station.

#### `halfSpanAndTipLE` (private helper — not exported)

The `xTipLE` formula appears in both `macLeadingEdgeOffset` and the D3 draw function.
Rather than duplicating it, expose it as a getter so `draw()` can use it too:

```js
get xTipLE() {
  const halfSpan = this.wingSpan / 2
  const sweepRad = this.sweepAngle * Math.PI / 180
  return halfSpan * Math.tan(sweepRad) + 0.25 * (this.rootChord - this.tipChord)
}
```

This getter is part of the public API so `WingDiagramChart.vue` can use it in `draw()`.

### 2.5 Methods

#### `rootReynolds(speed_ms, altitude_m)`
```
if (speed_ms <= 0 || this.rootChord <= 0) return null
const { density, viscosity } = atmosphere(altitude_m)
return (density * speed_ms * this.rootChord) / viscosity
```

#### `tipReynolds(speed_ms, altitude_m)`
```
if (speed_ms <= 0) return null
const { density, viscosity } = atmosphere(altitude_m)
return (density * speed_ms * this.tipChord) / viscosity
```

#### `inducedAoaDeg(cl)`
```
const ar = this.aspectRatio
if (cl == null || ar == null || ar <= 0) return null
return (cl / (Math.PI * ar * OSWALD_E)) * (180 / Math.PI)
```

#### `cruiseAoaWing(cruiseAoaInfinite, cruiseCl)`
```
if (cruiseAoaInfinite == null || cruiseCl == null) return null
const induced = this.inducedAoaDeg(cruiseCl)
if (induced == null) return null
return cruiseAoaInfinite + induced
```

#### `landingAoaWing(landingAoaInfinite, landingCl)`
```
if (landingAoaInfinite == null || landingCl == null) return null
const induced = this.inducedAoaDeg(landingCl)
if (induced == null) return null
return landingAoaInfinite + induced
```

## 3. Test File

### 3.1 Location

`www/src/js/WingAnalyser.test.js`

### 3.2 Test Cases

The test file must test `WingAnalyser` directly (no Vue, no component mounting).

**Constructor / storage:**
- T01: constructor stores all four props.

**taperRatio:**
- T02: tip=0.1, root=0.2 → 0.5 exactly.
- T03: root=0 → null.
- T04: tip=0, root=0.2 → 0.

**wingArea:**
- T05: span=10, root=2, tip=1 → 15.
- T06: span=0 → null.
- T07: root=0 → null.

**aspectRatio:**
- T08: span=10, root=2, tip=1, area=15 → 100/15 ≈ 6.667.
- T09: span=0 → null (area null).

**mac:**
- T10: root=2, tip=1 (λ=0.5) → (2/3)*2*(1+0.5+0.25)/(1+0.5) = 1.5556 (approx).
- T11: rectangular wing (tip=root, λ=1) → mac = root.

**macSpanPosition:**
- T12: span=10, root=2, tip=1 (λ=0.5) → (5)*(1+1)/(3*1.5) = 10/4.5 ≈ 2.222.
- T13: rectangular (λ=1) → span/4 (geometric midpoint of half-span is span/4).

**macLeadingEdgeOffset:**
- T14: no sweep (sweepAngle=0), root=2, tip=1 → offset accounts only for taper (LE shifts aft at tip).
- T15: sweep=0, rectangular (λ=1) → offset = 0 (no taper shift, no sweep).

**xTipLE:**
- T16: span=10, sweep=0, root=2, tip=1 → 0.25*(2-1) = 0.25.
- T17: span=10, sweep=45, root=tip → halfSpan * tan(45°) = 5.

**rootReynolds:**
- T18: speed=15, alt=0, root=0.2 → known value (use same formula: density≈1.225, visc≈1.789e-5).
- T19: speed=0 → null.
- T20: root=0 → null.

**tipReynolds:**
- T21: same speed/alt, tip=0.1 → half of rootReynolds at same speed.
- T22: speed=0 → null.

**inducedAoaDeg:**
- T23: AR=6.667, cl=0.5 → known value.
- T24: AR=null → null.
- T25: cl=null → null.

**cruiseAoaWing:**
- T26: cruiseAoaInfinite=4, cl=0.5 → 4 + inducedAoaDeg(0.5).
- T27: cruiseAoaInfinite=null → null.
- T28: cl=null → null.

**landingAoaWing:**
- T29: landingAoaInfinite=8.5, cl=0.9 → 8.5 + inducedAoaDeg(0.9).
- T30: landingAoaInfinite=null → null.

## 4. Refactor: WingDefinitionPanel.vue

### 4.1 Import

Add `import { WingAnalyser } from '@/js/WingAnalyser.js'` at the top of `<script setup>`.

### 4.2 New computed: `analyser`

```js
const analyser = computed(() => {
  try {
    const s = getState()
    const rc_SI = siChord(s.rootChord)
    const tc_SI = siChord(s.tipChord)
    const sp_SI = siChord(s.wingSpan)
    return new WingAnalyser({
      wingSpan:   sp_SI,
      rootChord:  rc_SI,
      tipChord:   tc_SI,
      sweepAngle: s.sweepAngle,
    })
  } catch (e) { setError(e); return null }
})
```

### 4.3 Replace computed properties

- `taperRatio` → `computed(() => analyser.value?.taperRatio ?? null)` (wrapped in try/catch per pattern).
- `wingArea` → `computed(() => analyser.value?.wingArea ?? null)`.
- `aspectRatio` → `computed(() => analyser.value?.aspectRatio ?? null)`.
- `reynoldsNumbers` → delegate to `analyser.value?.rootReynolds(speed_SI, alt_SI)` and
  `analyser.value?.tipReynolds(speed_SI, alt_SI)`.

### 4.4 Remove

Delete the old inline computed bodies for `taperRatio`, `wingArea`, `aspectRatio`, and
`reynoldsNumbers`. The `siChord`, `siSpeed`, `siAltitude` helpers remain (used when building
the analyser and when computing Reynolds).

## 5. Refactor: WingDiagramChart.vue

### 5.1 Import

Add `import { WingAnalyser } from '@/js/WingAnalyser.js'` at the top of `<script setup>`.
Remove the inline `OSWALD_E` constant and `inducedAoaDeg` function.

### 5.2 New computed: `wingAnalyser`

```js
const wingAnalyser = computed(() => {
  try {
    const { span, rc, tc, sweep } = geometry.value
    return new WingAnalyser({ wingSpan: span, rootChord: rc, tipChord: tc, sweepAngle: sweep })
  } catch (e) { setError(e); return null }
})
```

### 5.3 Refactor `performanceData`

Replace the inline `wingArea`, `AR`, and `inducedAoaDeg` calls with:
```js
const AR = wingAnalyser.value?.aspectRatio ?? null
const cruiseAoaWing   = wingAnalyser.value?.cruiseAoaWing(cruiseAoaInfinite, resolvedCruiseCl) ?? null
const landingAoaWing  = wingAnalyser.value?.landingAoaWing(landingAoaInfinite, landingCl) ?? null
```

### 5.4 Refactor `draw()`

Replace the inline MAC calculations:
```js
// Before:
const mac  = (2/3) * rc * (1 + λ + λ*λ) / (1 + λ)
const yMac = halfSpan * (1 + 2*λ) / (3*(1 + λ))
const xMacLE = xTipLE * (yMac / halfSpan)

// After (wa = wingAnalyser.value):
const mac     = wa.mac
const yMac    = wa.macSpanPosition
const xMacLE  = wa.macLeadingEdgeOffset
const xTipLE  = wa.xTipLE
```

The `λ` variable in `draw()` can be replaced by `wa.taperRatio`.

## 6. Component Test Updates

### 6.1 WingAnalyser.test.js (new file)

Created in Chunk 1. Tests the class in isolation.

### 6.2 WingDefinitionPanel.test.js

No changes required. The existing 22 tests assert on rendered text values and `setState` calls —
these are unaffected by whether the computation happens inline or via `WingAnalyser`.

### 6.3 WingDiagramChart.test.js

No changes required. The mock analyser and existing assertions are about SVG structure and the
performance table values — the refactor does not change how those values are computed.

## 7. Implementation Chunks

### Chunk 1 — WingAnalyser class + tests

**Scope:** `WingAnalyser.js` full implementation. `WingAnalyser.test.js` full test suite.
**Input preconditions:** Stub `WingAnalyser.js` exists.
**Output:** Fully implemented class, 30 passing tests, no Vue files changed.
**Spec sections:** 2, 3.

### Chunk 2 — Refactor WingDefinitionPanel.vue

**Scope:** Refactor `WingDefinitionPanel.vue` to use `WingAnalyser`. No test changes required.
**Input preconditions:** Chunk 1 complete; `WingAnalyser` fully implemented and tested.
**Output:** `WingDefinitionPanel.vue` uses `analyser` computed; existing 22 panel tests still pass.
**Spec sections:** 4, 6.2.

### Chunk 3 — Refactor WingDiagramChart.vue

**Scope:** Refactor `WingDiagramChart.vue` to use `WingAnalyser`. Remove `OSWALD_E` and
`inducedAoaDeg` from the component. No test changes required.
**Input preconditions:** Chunk 1 and Chunk 2 complete.
**Output:** `WingDiagramChart.vue` uses `wingAnalyser` computed; existing 16 chart tests still pass.
**Spec sections:** 5, 6.3.
