# Technical Specification — Fuselage and Tail Definition

**Date:** 2026-06-21  
**Functional spec:** `docs/functional/2026-06-21-fuselage-tail-definition.md`

---

## 1. Architecture Overview

This feature follows the identical structural pattern established by the Wing Definition panel:

```
App.vue
  ├─ ParameterPanel.vue          ← extended: new nav item + FuselageDefinitionPanel
  ├─ SvgPanel.vue                ← extended: renders FuselageDiagramChart when activePanel='fuselage-definition'
  └─ [state] useAppState.js      ← extended: 5 new fuselage/tail fields
```

New files:
```
www/src/js/FuselageAnalyser.js
www/src/js/FuselageAnalyser.test.js
www/src/pages/index/components/ParameterPanel/FuselageDefinitionPanel.vue
www/src/pages/index/components/ParameterPanel/FuselageDefinitionPanel.test.js
www/src/pages/index/components/FuselageDiagramChart.vue
www/src/pages/index/components/FuselageDiagramChart.test.js
www/src/pages/index/components/WingPlanformLayer.vue        ← new shared wing SVG layer
www/src/pages/index/components/WingPlanformLayer.test.js
```

Modified files:
```
www/src/pages/index/composables/useAppState.js  ← 5 new state fields
www/src/pages/index/components/ParameterPanel.vue ← new nav entry
www/src/pages/index/components/SvgPanel.vue      ← render fuselage diagram
www/src/pages/index/App.vue                      ← URL sync for new fields; activePanel enum extension
```

---

## 2. FuselageAnalyser Class

**File:** `www/src/js/FuselageAnalyser.js`

Plain ES2020 class, no Vue dependency. All inputs in SI units. All properties are getters (null-propagation semantics — return `null` if inputs are invalid).

### 2.1 Constructor

```js
constructor({ wingAnalyser, fuselageWidth, frontLength, rearLength, tailSpan, tailChord })
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `wingAnalyser` | `WingAnalyser` | Fully constructed WingAnalyser instance (SI) |
| `fuselageWidth` | `number` | Width of fuselage at wing station, metres |
| `frontLength` | `number` | Distance from wing ¼-MAC to nose, metres |
| `rearLength` | `number` | Distance from wing ¼-MAC to tail attachment, metres |
| `tailSpan` | `number` | Full horizontal tail span, metres |
| `tailChord` | `number` | Horizontal tail chord, metres |

### 2.2 Static Default Factories

These methods compute defaults from a WingAnalyser; they are static to allow use before state has been initialised.

```js
static defaultFrontLength(wingAnalyser)  // 2 × mac; null if mac is null
static defaultRearLength(wingAnalyser)   // 3 × mac; null if mac is null
static defaultTailSpan(wingAnalyser)     // sqrt(5 × 0.2 × wingArea); null if wingArea is null
static defaultTailChord(wingAnalyser)    // (0.2 × wingArea) / defaultTailSpan; null if either is null
```

### 2.3 Computed Getters

| Getter | Formula | Null condition |
|--------|---------|----------------|
| `tailArea` | `tailSpan × tailChord` | Either ≤ 0 |
| `tailMomentArm` | `rearLength − 0.25 × tailChord` | Either param null/≤0 |
| `tailAspectRatio` | `tailSpan² / tailArea` | `tailArea` null or ≤ 0 |

### 2.4 SVG Geometry Helpers

These getters return plain objects used by `FuselageDiagramChart.vue` to avoid geometry duplication between test-driven class methods and SVG rendering code.

```js
get wingGeometry()
// Returns { halfSpan, rootChord, tipChord, xTipLE, mac, macSpanPosition, macLeadingEdgeOffset }
// Delegates entirely to this.wingAnalyser; null if wingAnalyser is null

get fuselageGeometry()
// Returns:
// {
//   frontLength,   // nose-to-¼MAC distance
//   rearLength,    // ¼MAC-to-tail distance
//   width,         // fuselage width at wing
//   noseX,         // chordwise position of nose LE relative to wing root LE (= −frontLength + ¼MAC offset of root LE)
//   tailX,         // chordwise position of tail attachment = rootChord/4 + rearLength
// }
// null if any required input is null or ≤ 0

get tailGeometry()
// Returns { halfTailSpan, tailChord, tailX }
// tailX = fuselageGeometry.tailX - 0.25 * tailChord (so ¼-MAC of tail aligns at tail moment arm position)
// null if fuselageGeometry is null or tailSpan/tailChord ≤ 0
```

---

## 3. State — useAppState.js

Add five new fields to `STATE_DEFAULTS`. All length fields are unit-dependent (metres/feet) and must be re-converted in the `setState` unit-change block.

```js
fuselageWidth:     0.12,   // metres (SI) or feet (Imperial); fuselage width at wing
frontFuselage:     0,      // metres (SI) or feet (Imperial); 0 = use computed default (2×MAC)
rearFuselage:      0,      // metres (SI) or feet (Imperial); 0 = use computed default (3×MAC)
tailSpan:          0,      // metres (SI) or feet (Imperial); 0 = use computed default
tailChord:         0,      // metres (SI) or feet (Imperial); 0 = use computed default
tailAirfoil:       'E168  (12.45%)',  // profileName string
```

**Zero-means-default convention:** `frontFuselage`, `rearFuselage`, `tailSpan`, and `tailChord` are stored as 0 when the user has not overridden them. The panel and diagram always resolve the actual value by calling `FuselageAnalyser.defaultXxx()` when the stored value is 0. This avoids recomputing defaults on every unit change and keeps URL serialisation simple (omit if 0).

Unit conversion additions in `setState`:
```js
next.fuselageWidth  = convertDistance(state.value.fuselageWidth,  state.value.units, partial.units)
next.frontFuselage  = convertDistance(state.value.frontFuselage,  state.value.units, partial.units)
  // only convert if non-zero (zero means "use default")
next.rearFuselage   = convertDistance(state.value.rearFuselage,   state.value.units, partial.units)
next.tailSpan       = convertDistance(state.value.tailSpan,        state.value.units, partial.units)
next.tailChord      = convertDistance(state.value.tailChord,       state.value.units, partial.units)
```

Note: for fields where stored value is 0 (default sentinel), `convertDistance(0, from, to)` = 0, so no special-casing is needed.

---

## 4. FuselageDefinitionPanel.vue

**File:** `www/src/pages/index/components/ParameterPanel/FuselageDefinitionPanel.vue`

### 4.1 Injections and Composables

```js
const setError   = inject(SET_ERROR_KEY)
const { getState, setState } = inject(APP_STATE_KEY)
const { system, distanceUnit, areaUnit } = useUnits()
const { register, setFocused, clearFocused } = inject(FOCUSED_PARAM_KEY)
const { airfoils } = inject(AIRFOILS_KEY)
```

### 4.2 WingAnalyser and FuselageAnalyser Computeds

```js
const wingAnalyser = computed(() => {
  // Converts display-unit state to SI, constructs WingAnalyser
  // returns null on error
})

const effectiveFrontLength = computed(() => {
  // If state.frontFuselage > 0, return convertDistance(state.frontFuselage, system, 'SI')
  // Else return FuselageAnalyser.defaultFrontLength(wingAnalyser.value)
})

const effectiveRearLength = computed(() => { /* same pattern */ })
const effectiveTailSpan   = computed(() => { /* same pattern */ })
const effectiveTailChord  = computed(() => { /* same pattern */ })

const fuselageAnalyser = computed(() => {
  // Constructs FuselageAnalyser with SI values
  // returns null on error
})
```

### 4.3 Editable Inputs

| Field | v-model binding | Sentinel behaviour |
|-------|----------------|-------------------|
| Fuselage width | `fuselageWidth` computed (get/set via state) | No sentinel; always explicit |
| Front fuselage length | `frontFuselageDisplay` — shows effective SI→display converted value; set stores raw number or 0 if matches default | User can type; placeholder shows computed default |
| Rear fuselage length | Same pattern | Same |
| Tail span | Same pattern | Same |
| Tail chord | Same pattern | Same |

For simplicity: inputs always show the current resolved value (display units). When the user modifies the value, it is stored directly in state. A "Reset to default" affordance (or showing the placeholder) is not required in this iteration — the inputs simply always show the effective value.

Airfoil selection: a `<select>` bound to `tailAirfoil` in state. Options from `airfoils` array (by `profileName`).

### 4.4 Computed Outputs (Read-Only)

| Label | Source | Format |
|-------|--------|--------|
| Horizontal tail area | `fuselageAnalyser.tailArea` converted to display area unit | `toFixed(4)` + unit |
| Tail moment arm | `fuselageAnalyser.tailMomentArm` converted to display distance unit | `toFixed(3)` + unit |

### 4.5 Focused Parameter Registration

Register all six editable inputs using `register(key, { title, body })`.

### 4.6 Navigation

Emits `navigate` event. Back button navigates to `'wing-definition'` (not `'general'`), since fuselage logically follows wing.

---

## 5. WingPlanformLayer.vue — Shared Wing SVG Component

**File:** `www/src/pages/index/components/WingPlanformLayer.vue`

This is a headless SVG `<g>` element (SVG group) that renders the wing planform given pre-computed geometry values as props. It does not inject any application state — all data comes from props.

### 5.1 Props

```js
props: {
  // All values in SVG pixel space — the parent converts from metres
  centreX:    Number,   // SVG x of the aircraft centreline
  topY:       Number,   // SVG y of wing root leading edge
  scale:      Number,   // pixels per metre
  halfSpan:   Number,   // half-span in metres (SI)
  rootChord:  Number,   // root chord in metres (SI)
  tipChord:   Number,   // tip chord in metres (SI)
  xTipLE:     Number,   // chordwise position of tip LE (metres, SI)
  mac:        Number,   // MAC length (metres, SI)
  macSpanPosition: Number,
  macLeadingEdgeOffset: Number,
  showMac:    { type: Boolean, default: true },
  showQuarterChord: { type: Boolean, default: true },
  showDimensions: { type: Boolean, default: true },
}
```

### 5.2 Output

The component renders into an SVG `<g>` element (using `<template>` with `<g>` wrapper) everything currently drawn by `WingDiagramChart.draw()` for the wing only:
- Wing outline polygon (blue fill, blue stroke)
- Quarter-chord lines (red)
- MAC dashed line (grey)
- Quarter-MAC quartered-circle marker
- Wing-span dimension line (when `showDimensions` is true)
- Root-chord dimension line (when `showDimensions` is true)

The component does NOT contain the `<svg>` element — it is a fragment intended for embedding inside a parent SVG.

### 5.3 Adoption in WingDiagramChart.vue

`WingDiagramChart.vue` currently draws the wing inline in `draw()`. After this change:
- The D3 `draw()` function is removed.
- `WingDiagramChart.vue` becomes a Vue-reactive SVG component using `WingPlanformLayer` inside an `<svg>` element.
- The ResizeObserver / containerW / containerH / svgEl pattern is retained to compute `scale`, `centreX`, `topY`.
- The performance table overlay and drag curve chart/toggle are retained unchanged.

**Important:** This is the most significant structural change in this feature. It eliminates the D3 imperative draw pattern from WingDiagramChart in favour of a reactive SVG approach.

---

## 6. FuselageDiagramChart.vue

**File:** `www/src/pages/index/components/FuselageDiagramChart.vue`

Top-down plan-view SVG of the complete aircraft. D3 is used only for scale computation and arrow marker definitions (same pattern as WingDiagramChart).

### 6.1 Structure

```html
<div ref="containerEl" class="relative w-full h-full">
  <svg ref="svgEl" class="block w-full h-full">
    <!-- Arrow marker defs -->
    <defs> ... </defs>

    <!-- Centreline -->
    <line ... />

    <!-- Wing planform -->
    <WingPlanformLayer v-if="wingGeo" v-bind="wingLayerProps" />

    <!-- Fuselage body -->
    <FuselageBodyLayer v-if="fuselageGeo" v-bind="fuselageLayerProps" />

    <!-- Horizontal tail -->
    <g v-if="tailGeo" class="horizontal-tail"> ... rect planform ... </g>

    <!-- Vertical tail schematic -->
    <g v-if="tailGeo" class="vertical-tail"> ... symmetric ellipse/teardrop ... </g>

    <!-- Dimension lines -->
    <g v-if="fuselageGeo"> ... front/rear dimension arrows ... </g>
  </svg>
</div>
```

### 6.2 Scale Computation

The SVG bounding box is determined by the union of wing span and total aircraft length (frontLength + rootChord + rearLength). Scale = min(availW / totalWidth, availH / totalLength). The wing root LE is positioned at a computed `topY` with appropriate margins. All geometry is rendered relative to this origin.

### 6.3 Fuselage Body Geometry

The fuselage is drawn as a closed SVG path (symmetric about the centreline) using cubic Bézier curves:

- **Nose section** (forward of wing root LE): An elliptical lobe. The path runs from the nose tip (centreX, noseY) outward to fuselage half-width at the wing LE station, using a cubic Bézier control point biased 2/3 toward the nose for oval shape.
- **Parallel section** (along root chord): Straight lines at ±halfWidth from centreX.
- **Tail section** (aft of wing root TE): Tapers from ±halfWidth at the wing TE to a narrow point (±5px or ~2% of fuselage width at minimum) at the tail attachment.

The tail attachment point is at `noseY + (frontLength + rootChord + rearLength) * scale`.

The path is symmetric (drawn for both port and starboard simultaneously as a single closed path).

Fill: `#f1f5f9` (slate-100). Stroke: `#475569` (slate-600), stroke-width 1.5.

### 6.4 Horizontal Tail Geometry

Rectangular planform centred on centreline at the tail chord's ¼-MAC position:
- Tail LE y-position: `tailMomentArmY - 0.25 * tailChord * scale` where `tailMomentArmY = topY + (frontLength + 0.25 * rootChord + tailMomentArm) * scale`
- A simple polygon with four points: `[±halfTailSpan, tailLE_Y]`, `[±halfTailSpan, tailLE_Y + tailChord * scale]`
- Fill: `#e0f2fe` (sky-100). Stroke: `#0284c7` (sky-600), stroke-width 1.5.
- A red ¼-chord line at `tailLE_Y + 0.25 * tailChord * scale` from `-halfTailSpan` to `+halfTailSpan`.

### 6.5 Vertical Tail (Schematic)

A symmetric teardrop/ellipse drawn vertically at the tail attachment point, centred on the centreline. Fixed proportions relative to fuselage width:
- Height: `0.6 * fuselageWidth * scale` (fin height schematic)
- Width: `0.3 * fuselageWidth * scale`

Drawn as an SVG ellipse or a Bézier path for teardrop shape. Fill: `#f0fdf4` (green-50). Stroke: `#166534` (green-800). This is purely decorative and non-parametric.

### 6.6 Dimension Lines

Two horizontal dimension lines along the aircraft centreline, annotated with text:

1. **Front fuselage:** arrow from nose tip to wing ¼-MAC (a vertical line at `topY + frontLength * scale`, labelled with the distance in current units).
2. **Rear fuselage:** arrow from wing ¼-MAC to the tail attachment point, labelled with the distance.

These use the same arrow marker pattern as WingDiagramChart.

### 6.7 Injections

```js
const setError       = inject(SET_ERROR_KEY)
const { getState }   = inject(APP_STATE_KEY)
const { system }     = useUnits()
const { airfoils }   = inject(AIRFOILS_KEY)
```

---

## 7. ParameterPanel.vue — Extensions

### 7.1 New Nav Entry

Add `'fuselage-definition'` to the navigation dropdown, placed below `'wing-definition'`.

Enabled condition: `canNavigateToFuselage` — wing span, root chord, and tip chord are all > 0 (i.e. the wing is defined). This mirrors how `canNavigateToWing` gates the wing panel.

```js
const canNavigateToFuselage = computed(() => {
  const s = getState()
  return s.wingSpan > 0 && s.rootChord > 0
})
```

### 7.2 Header Label

Extend the header label to include `'Fuselage & Tail'` for `activePanel === 'fuselage-definition'`.

### 7.3 Panel Body

Add:
```html
<FuselageDefinitionPanel v-else-if="props.activePanel === 'fuselage-definition'" @navigate="emit('navigate', $event)" />
```

---

## 8. SvgPanel.vue — Extensions

Add a new conditional:
```html
<FuselageDiagramChart
  v-else-if="props.activePanel === 'fuselage-definition'"
  class="w-full h-full"
/>
```

Import `FuselageDiagramChart` from `'../FuselageDiagramChart.vue'`.

---

## 9. App.vue — URL Sync Extensions

### 9.1 URL_DEFAULTS additions

```js
const URL_DEFAULTS = {
  ...STATE_DEFAULTS,
  activePanel:   'general',
  showDragCurve: false,
  // STATE_DEFAULTS already includes fuselageWidth, frontFuselage, rearFuselage, tailSpan, tailChord, tailAirfoil
}
```

### 9.2 onMounted parse additions

```js
const fuselageWidth = parseNum('fw',  0.01, 5,   URL_DEFAULTS.fuselageWidth)
const frontFuselage = parseNum('ff',  0,    20,  URL_DEFAULTS.frontFuselage)
const rearFuselage  = parseNum('rf',  0,    30,  URL_DEFAULTS.rearFuselage)
const tailSpan      = parseNum('ts',  0,    10,  URL_DEFAULTS.tailSpan)
const tailChord     = parseNum('tch', 0,    5,   URL_DEFAULTS.tailChord)
const tailAirfoilParam = params.get('tfoil')
const tailAirfoil = tailAirfoilParam !== null && airfoils.airfoils.some(a => a.profileName === tailAirfoilParam)
  ? tailAirfoilParam
  : URL_DEFAULTS.tailAirfoil
```

Include in `setState` call.

### 9.3 watch serialise additions

```js
if (s.fuselageWidth !== URL_DEFAULTS.fuselageWidth) params.set('fw',   s.fuselageWidth.toFixed(3))
if (s.frontFuselage !== URL_DEFAULTS.frontFuselage) params.set('ff',   s.frontFuselage.toFixed(3))
if (s.rearFuselage  !== URL_DEFAULTS.rearFuselage)  params.set('rf',   s.rearFuselage.toFixed(3))
if (s.tailSpan      !== URL_DEFAULTS.tailSpan)       params.set('ts',   s.tailSpan.toFixed(3))
if (s.tailChord     !== URL_DEFAULTS.tailChord)      params.set('tch',  s.tailChord.toFixed(3))
if (s.tailAirfoil   !== URL_DEFAULTS.tailAirfoil)    params.set('tfoil', s.tailAirfoil)
```

### 9.4 activePanel enum extension

Add `'fuselage-definition'` to the valid set in the `onMounted` parse block.

---

## 10. Reusability Architecture

### 10.1 FuselageAnalyser — Framework-free

`FuselageAnalyser.js` is importable without any Vue dependency. The Centre-of-Gravity future feature can import it directly:

```js
import { FuselageAnalyser } from '@/js/FuselageAnalyser.js'
import { WingAnalyser } from '@/js/WingAnalyser.js'

const wa = new WingAnalyser({ ... })
const fa = new FuselageAnalyser({ wingAnalyser: wa, fuselageWidth, frontLength, rearLength, tailSpan, tailChord })
fa.tailMomentArm  // available as a getter
```

### 10.2 WingPlanformLayer — Prop-driven SVG Fragment

Because `WingPlanformLayer` is purely prop-driven, it can be embedded in any future SVG canvas (e.g. a CG view) without pulling in App state.

---

## 11. Test Strategy

### FuselageAnalyser.test.js (≥ 20 tests)

- `defaultFrontLength`: returns 2×mac; null when mac is null.
- `defaultRearLength`: returns 3×mac; null when mac is null.
- `defaultTailSpan`: returns sqrt(5 × 0.2 × wingArea); null when wingArea is null.
- `defaultTailChord`: returns tailArea / tailSpan; null when tailSpan is null or 0.
- `tailArea`: span × chord; null when either is ≤ 0.
- `tailMomentArm`: rearLength − 0.25 × tailChord; null when either ≤ 0.
- `tailAspectRatio`: span² / area; null when area null or ≤ 0.
- `fuselageGeometry`: returns correct object; null on bad inputs.
- `tailGeometry`: returns correct object; null on bad inputs.
- Boundary cases: zero inputs, negative inputs, null wingAnalyser.

### WingPlanformLayer.test.js (≥ 8 tests)

- Renders `<g>` with polygon, quarter-chord lines, MAC line, quarter-MAC marker.
- Hides MAC when `showMac=false`.
- Hides dimension lines when `showDimensions=false`.
- Renders correctly with zero sweep (xTipLE = 0).

### FuselageDefinitionPanel.test.js (≥ 20 tests)

- All 6 inputs render.
- Computed outputs: tail area and moment arm display correctly.
- Airfoil select contains the correct options; defaults to Eppler 168.
- Effective values resolve from defaults when stored values are 0.
- Effective values use stored values when non-zero.
- navigate emit on back button.
- Unit change converts display values.
- SET_ERROR_KEY stub injected; FOCUSED_PARAM_KEY stub injected; APP_STATE_KEY stub injected; AIRFOILS_KEY stub injected.

### FuselageDiagramChart.test.js (≥ 12 tests)

- SVG renders an `<svg>` element.
- When wing geometry is zero/null, no planform rendered (no crash).
- WingPlanformLayer is present in the SVG.
- Fuselage path element rendered when geometry is valid.
- Horizontal tail polygon rendered.
- Vertical tail schematic rendered.
- Dimension lines rendered (two `<line>` elements with marker attributes).
- setError guard: fuselage geometry computation error is caught.

### ParameterPanel.test.js additions (≥ 4 tests)

- `'fuselage-definition'` nav entry present in dropdown.
- Nav entry disabled when wing not defined.
- `canNavigateToFuselage` gate works.
- FuselageDefinitionPanel rendered when `activePanel='fuselage-definition'`.

### SvgPanel.test.js additions (≥ 2 tests)

- `FuselageDiagramChart` rendered when `activePanel='fuselage-definition'`.
- WingDiagramChart not rendered in fuselage mode.

### App.test.js additions (≥ 8 tests)

- URL params `fw`, `ff`, `rf`, `ts`, `tch`, `tfoil` parsed and applied.
- Invalid values fall back to defaults.
- Non-default values serialised to URL.
- Default values omitted from URL.
- `panel=fuselage-definition` accepted.

---

## 12. Accepted Architectural Trade-offs

### WingDiagramChart Refactor (D3 → Reactive SVG)

**Trade-off:** Converting `WingDiagramChart.vue` from a D3 imperative draw loop to a reactive SVG component (using `WingPlanformLayer`) is a moderate regression risk. However:
- The wing draw code is already well-tested.
- The reactive approach is more idiomatic Vue and directly testable without needing DOM-level assertions.
- D3 is retained only for arrow markers and scale computation (minimal surface).

### Zero-means-default State Convention

**Trade-off:** Storing `0` as "use computed default" means the computed defaults must be re-derived every time the panel renders. This is cheap (a few multiplications) and avoids stale computed values after the user changes wing geometry. The alternative — eagerly writing computed defaults on navigation — would require watching wing state changes to keep tail defaults in sync, which is more complex.

### No FuselageBodyLayer Component

The fuselage body path is drawn directly inside `FuselageDiagramChart.vue` rather than extracted to a separate `FuselageBodyLayer` component (as suggested for `WingPlanformLayer`). Rationale: the fuselage body is tightly coupled to the overall chart scale and layout and is not needed independently by any other planned component. Only the `FuselageAnalyser` class needs to be portable for the CG feature.

---

## 13. Acceptance Criteria Mapping

| AC | Implementation location |
|----|------------------------|
| AC-1 | ParameterPanel.vue — `canNavigateToFuselage` gate + nav entry |
| AC-2 | FuselageDefinitionPanel.vue — 6 inputs |
| AC-3 | FuselageAnalyser.defaultFrontLength / defaultRearLength; resolved in panel computed |
| AC-4 | FuselageAnalyser.defaultTailSpan / defaultTailChord |
| AC-5 | STATE_DEFAULTS.tailAirfoil = 'E168  (12.45%)' |
| AC-6 | FuselageDefinitionPanel.vue computed output — tailArea via fuselageAnalyser |
| AC-7 | FuselageDefinitionPanel.vue computed output — tailMomentArm |
| AC-8 | useAppState.js setState unit-change block; convertDistance for 4 new length fields |
| AC-9 | FuselageDiagramChart.vue — WingPlanformLayer + fuselage + tail elements |
| AC-10 | FuselageDiagramChart.vue — Bézier fuselage path |
| AC-11 | FuselageDiagramChart.vue — rectangular tail polygon |
| AC-12 | FuselageDiagramChart.vue — dimension lines with arrow markers |
| AC-13 | FuselageAnalyser.js — plain ES2020 class, test file |
| AC-14 | WingPlanformLayer.vue — prop-driven, state-free; FuselageAnalyser framework-free |
| AC-15 | WingPlanformLayer.vue — shared between WingDiagramChart and FuselageDiagramChart |
| AC-16 | App.vue — URL sync for all 6 new fields |
