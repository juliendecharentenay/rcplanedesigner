# Technical Specification: Wing Definition Panel

## Overview

This feature introduces a second panel view ("Wing Definition") alongside the existing "General" panel (formerly "Parameters"). It adds wing geometry inputs, derived aerodynamic properties, and a live D3-drawn top-view planform diagram. Navigation between panels is controlled by `App.vue`, which owns an `activePanel` ref passed as a prop to `ParameterPanel` and `SvgPanel`.

---

## File Inventory

### Modified

| File | Change summary |
|---|---|
| `www/src/units/units.js` | Add `getAreaUnit`, `convertArea` |
| `www/src/pages/index/composables/useUnits.js` | Add `areaUnit` computed ref, re-export `convertArea` |
| `www/src/pages/index/composables/useAppState.js` | Add 4 new state fields; convert 3 on unit change |
| `www/src/pages/index/App.vue` | Own `activePanel` ref; pass to `ParameterPanel` and `SvgPanel` |
| `www/src/pages/index/components/ParameterPanel.vue` | Navigation shell: header dropdown, Wing Definition button, conditional body |
| `www/src/pages/index/components/SvgPanel.vue` | Add `activePanel` prop; v-if between `TrainerSideView` and `WingDiagramChart` |

### Created

| File | Purpose |
|---|---|
| `www/src/pages/index/components/WingDefinitionPanel.vue` | 4 editable inputs + 5 read-only computed outputs |
| `www/src/pages/index/components/WingDiagramChart.vue` | D3-drawn top-view wing planform |

### Test files (created)

| File | Covers |
|---|---|
| `www/src/pages/index/components/WingDefinitionPanel.test.js` | Input binding, computed outputs, Reynolds formatting, dash display, error guard |
| `www/src/pages/index/components/WingDiagramChart.test.js` | Prop-driven render, blank when zero dimensions, error guard |
| `www/src/pages/index/components/ParameterPanel.test.js` | **Extend existing** — header dropdown, nav button enable/disable, activePanel prop, emit |
| `www/src/pages/index/composables/useAppState.test.js` | **Extend existing** — 4 new fields, 3 distance conversions on unit change |
| `www/src/pages/index/composables/useUnits.test.js` | **Extend existing** — areaUnit reactive ref |
| `www/src/units/units.test.js` | **New** — `getAreaUnit`, `convertArea` |

---

## 1. Unit Layer

### 1a. `www/src/units/units.js`

Add after the Wing Loading section:

```js
// — Area —
// 1 m² = M_TO_FT² ft²  (derived from M_TO_FT = 3.28084)
const SQM_TO_SQFT = M_TO_FT * M_TO_FT   // ≈ 10.76391

export function getAreaUnit(system) {
  return system === 'Imperial' ? 'ft²' : 'm²'
}

export function convertArea(value, fromSystem, toSystem) {
  if (fromSystem === toSystem) return value
  return fromSystem === 'SI' ? value * SQM_TO_SQFT : value / SQM_TO_SQFT
}
```

`SQM_TO_SQFT` must use the same `M_TO_FT` constant already defined at the top of the file (do not introduce a new literal).

### 1b. `www/src/pages/index/composables/useUnits.js`

Add to the import line:
```js
import { ..., getAreaUnit, convertArea } from '@/units/units'
```

Add a new computed ref inside `useUnits()`:
```js
const areaUnit = computed(() => getAreaUnit(system.value))
```

Add `areaUnit` and `convertArea` to the return object.

---

## 2. State Layer

### `www/src/pages/index/composables/useAppState.js`

#### 2a. Import

Add `convertDistance` is already imported. No new imports needed — all three new distance fields use `convertDistance`.

#### 2b. New state fields

Add to the `state` ref object:

```js
wingSpan:    0,   // metres (SI) or feet (Imperial)
rootChord:   0,   // metres (SI) or feet (Imperial)
tipChord:    0,   // metres (SI) or feet (Imperial)
sweepAngle:  0,   // degrees (no unit conversion)
```

`sweepAngle` carries no unit dependency and is never converted.

#### 2c. Unit conversion block

Inside the `if ('units' in partial && partial.units !== state.value.units)` block, add:

```js
next.wingSpan  = convertDistance(state.value.wingSpan,  state.value.units, partial.units)
next.rootChord = convertDistance(state.value.rootChord, state.value.units, partial.units)
next.tipChord  = convertDistance(state.value.tipChord,  state.value.units, partial.units)
```

Place these three lines immediately after the existing `next.cruisingSpeed` conversion line, following the established pattern.

---

## 3. Navigation

### `www/src/pages/index/App.vue`

#### 3a. New ref

```js
import { ref, provide } from 'vue'
const activePanel = ref('general')  // 'general' | 'wing-definition'
```

#### 3b. Template wiring

```html
<ParameterPanel :active-panel="activePanel" @navigate="activePanel = $event" />
<SvgPanel :active-panel="activePanel" />
```

No other changes to `App.vue`.

---

## 4. ParameterPanel.vue

`ParameterPanel` becomes a navigation shell. It gains an `activePanel` prop, a local `dropdownOpen` ref, and conditionally renders either its existing General fields or `<WingDefinitionPanel>`.

### 4a. Props and emits

```js
const props = defineProps({
  activePanel: { type: String, default: 'general' },
})
const emit = defineEmits(['navigate'])
```

### 4b. New local state

```js
import { ref, computed, inject } from 'vue'
const dropdownOpen = ref(false)

function toggleDropdown() { dropdownOpen.value = !dropdownOpen.value }
function closeDropdown()  { dropdownOpen.value = false }

function navigateTo(panel) {
  if (!canNavigateToWing.value && panel === 'wing-definition') return
  emit('navigate', panel)
  closeDropdown()
}
```

### 4c. Wing-navigation guard

```js
const canNavigateToWing = computed(() => {
  const s = getState()
  return s.airfoilProfile !== null && s.wingLoading > 0 && s.cruisingSpeed > 0
})
```

### 4d. Header element

Replace the existing static header `<div>` with a clickable element that toggles the dropdown:

```html
<div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100 cursor-pointer select-none"
     @click="toggleDropdown">
  <!-- existing plane icon SVG -->
  <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">
    {{ props.activePanel === 'general' ? 'General' : 'Wing Definition' }}
  </span>
  <!-- chevron icon indicating dropdown -->
</div>
```

The header label reflects the active panel name.

### 4e. Dropdown menu

Rendered immediately after the header `<div>`, inside the `<aside>`:

```html
<div v-if="dropdownOpen"
     class="absolute z-20 left-0 top-[full] w-full bg-white border border-slate-200 shadow-lg rounded-b"
     @click.outside="closeDropdown">
  <button class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
          @click="navigateTo('general')">
    General
  </button>
  <button class="w-full text-left px-4 py-2 text-sm"
          :class="canNavigateToWing ? 'hover:bg-slate-50' : 'text-slate-400 cursor-default'"
          :disabled="!canNavigateToWing"
          @click="navigateTo('wing-definition')">
    Wing Definition
  </button>
</div>
```

Click-outside handling: add `@click="closeDropdown"` on the `<aside>` with a `@click.stop` on the header and dropdown, or use a `v-click-outside` directive. The simplest correct approach is to listen on `document` for mousedown and close if the target is outside the `<aside>` ref — use `onMounted`/`onUnmounted` to register/deregister the listener.

### 4f. Panel body

```html
<div v-if="props.activePanel === 'general'" class="flex flex-col gap-4 px-4 py-4 overflow-y-auto">
  <!-- All existing General fields unchanged -->

  <!-- Wing Definition navigation button — at bottom of field list -->
  <div class="pt-2 border-t border-slate-100">
    <button
      class="w-full text-sm font-medium py-2 px-3 rounded text-right"
      :class="canNavigateToWing
        ? 'text-indigo-600 hover:bg-indigo-50 cursor-pointer'
        : 'text-slate-400 cursor-default'"
      :disabled="!canNavigateToWing"
      @click="canNavigateToWing && navigateTo('wing-definition')"
    >
      Wing Definition →
    </button>
  </div>
</div>

<WingDefinitionPanel v-else @navigate="emit('navigate', $event)" />
```

Import `WingDefinitionPanel` in the `<script setup>`.

The existing `onPanelFocusOut` / `clearFocused` logic remains unchanged for the General view. `WingDefinitionPanel` does not participate in focused-param registration.

---

## 5. WingDefinitionPanel.vue

**File:** `www/src/pages/index/components/WingDefinitionPanel.vue`

### 5a. Script setup

```js
import { computed, inject } from 'vue'
import { APP_STATE_KEY } from '../composables/useAppState'
import { useUnits } from '../composables/useUnits'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { atmosphere } from '@/js/atmosphere.js'
import { convertDistance, convertSpeed } from '@/units/units.js'
import ParameterRow from './ParameterRow.vue'
import BaseInput from '@/components/BaseInput.vue'

const setError = inject(SET_ERROR_KEY)
const { getState, setState } = inject(APP_STATE_KEY)
const { system, distanceUnit, areaUnit } = useUnits()

const emit = defineEmits(['navigate'])
```

### 5b. Editable input bindings

Each field uses a `computed` with `get`/`set`:

```js
const wingSpan = computed({
  get: () => getState().wingSpan,
  set: (v) => setState({ wingSpan: Number(v) }),
})
const rootChord = computed({
  get: () => getState().rootChord,
  set: (v) => setState({ rootChord: Number(v) }),
})
const tipChord = computed({
  get: () => getState().tipChord,
  set: (v) => setState({ tipChord: Number(v) }),
})
const sweepAngle = computed({
  get: () => getState().sweepAngle,
  set: (v) => setState({ sweepAngle: Number(v) }),
})
```

`Number(v)` coerces the string value from `<BaseInput type="number">` to a number before storing.

### 5c. SI helpers (internal, not reactive refs)

These are used inside computed bodies:

```js
function siChord(displayValue) {
  return convertDistance(displayValue, system.value, 'SI')
}
function siSpeed(displayValue) {
  return convertSpeed(displayValue, system.value, 'SI')
}
function siAltitude(displayValue) {
  return convertDistance(displayValue, system.value, 'SI')
}
```

### 5d. Computed outputs

All wrapped in `try/catch` per the error-handling pattern. Safe fallback for all is `null` (displayed as `'—'`).

#### Taper ratio

```js
const taperRatio = computed(() => {
  try {
    const rc = siChord(getState().rootChord)
    const tc = siChord(getState().tipChord)
    if (rc <= 0) return null
    return tc / rc
  } catch (e) { setError(e); return null }
})
```

Display: `taperRatio.value !== null ? taperRatio.value.toFixed(3) : '—'`

#### Wing area

Compute directly in the display unit system: since `rootChord`, `tipChord`, and `wingSpan` are all in the same display unit, the product is already in the square of that unit (m² or ft²):

```js
const wingArea = computed(() => {
  try {
    const s = getState()
    if (s.wingSpan <= 0 || s.rootChord <= 0) return null
    return (s.rootChord + s.tipChord) / 2 * s.wingSpan
  } catch (e) { setError(e); return null }
})
```

Display: `wingArea.value !== null ? wingArea.value.toFixed(4) + ' ' + areaUnit.value : '—'`

#### Aspect ratio

```js
const aspectRatio = computed(() => {
  try {
    const s = getState()
    const span_SI = siChord(s.wingSpan)
    const rc_SI   = siChord(s.rootChord)
    const tc_SI   = siChord(s.tipChord)
    if (span_SI <= 0 || rc_SI <= 0) return null
    const area_SI = (rc_SI + tc_SI) / 2 * span_SI
    if (area_SI <= 0) return null
    return (span_SI * span_SI) / area_SI
  } catch (e) { setError(e); return null }
})
```

Display: `aspectRatio.value !== null ? aspectRatio.value.toFixed(2) : '—'`

#### Reynolds numbers (root and tip)

```js
const reynoldsNumbers = computed(() => {
  try {
    const s = getState()
    const rc_SI    = siChord(s.rootChord)
    const tc_SI    = siChord(s.tipChord)
    const span_SI  = siChord(s.wingSpan)
    const speed_SI = siSpeed(s.cruisingSpeed)
    const alt_SI   = siAltitude(s.siteAltitude)

    if (span_SI <= 0 || rc_SI <= 0 || speed_SI <= 0) return { root: null, tip: null }

    const { density, viscosity } = atmosphere(alt_SI)
    return {
      root: (density * speed_SI * rc_SI) / viscosity,
      tip:  (density * speed_SI * tc_SI) / viscosity,
    }
  } catch (e) { setError(e); return { root: null, tip: null } }
})

const rootRe = computed(() => reynoldsNumbers.value.root)
const tipRe  = computed(() => reynoldsNumbers.value.tip)
```

`atmosphere()` throws `RangeError` if `alt_SI` is outside 0–4000 m. The `try/catch` catches this and routes to `setError`, displaying `'—'` for both Reynolds numbers.

#### Reynolds number formatting helper

```js
function formatReynolds(re) {
  if (re === null || re <= 0 || !isFinite(re)) return '—'
  const exp       = Math.floor(Math.log10(re))
  const mantissa  = re / Math.pow(10, exp)
  const superMap  = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const superExp  = String(exp).split('').map(c => superMap[Number(c)]).join('')
  return `${mantissa.toPrecision(3)} × 10${superExp}`
}
```

Typical model aircraft Reynolds numbers fall in the range 10⁴–10⁷; `exp` is always a single positive digit, so the simple `superMap` lookup is sufficient. Display: `formatReynolds(rootRe.value)`.

### 5e. Template structure

```html
<template>
  <div class="flex flex-col gap-4 px-4 py-4 overflow-y-auto">
    <!-- Editable inputs -->
    <ParameterRow label="Wing Span" input-id="wing-span">
      <BaseInput id="wing-span" v-model="wingSpan" type="number" :min="0" :step="0.01" :suffix="distanceUnit" />
    </ParameterRow>

    <ParameterRow label="Root Chord" input-id="root-chord">
      <BaseInput id="root-chord" v-model="rootChord" type="number" :min="0" :step="0.001" :suffix="distanceUnit" />
    </ParameterRow>

    <ParameterRow label="Tip Chord" input-id="tip-chord">
      <BaseInput id="tip-chord" v-model="tipChord" type="number" :min="0" :step="0.001" :suffix="distanceUnit" />
    </ParameterRow>

    <ParameterRow label="Sweep Angle" input-id="sweep-angle">
      <BaseInput id="sweep-angle" v-model="sweepAngle" type="number" :min="0" :max="89" :step="0.1" suffix="°" />
    </ParameterRow>

    <!-- Read-only outputs -->
    <div class="border-t border-slate-100 pt-3 flex flex-col gap-3">
      <ParameterRow label="Taper Ratio">
        <span class="text-sm font-mono text-slate-700">{{ taperRatio !== null ? taperRatio.toFixed(3) : '—' }}</span>
      </ParameterRow>

      <ParameterRow :label="`Wing Area (${areaUnit})`">
        <span class="text-sm font-mono text-slate-700">{{ wingArea !== null ? wingArea.toFixed(4) : '—' }}</span>
      </ParameterRow>

      <ParameterRow label="Aspect Ratio">
        <span class="text-sm font-mono text-slate-700">{{ aspectRatio !== null ? aspectRatio.toFixed(2) : '—' }}</span>
      </ParameterRow>

      <ParameterRow label="Root Re">
        <span class="text-sm font-mono text-slate-700">{{ formatReynolds(rootRe) }}</span>
      </ParameterRow>

      <ParameterRow label="Tip Re">
        <span class="text-sm font-mono text-slate-700">{{ formatReynolds(tipRe) }}</span>
      </ParameterRow>
    </div>

    <!-- Navigation -->
    <div class="pt-2 border-t border-slate-100">
      <button class="text-sm font-medium text-indigo-600 hover:bg-indigo-50 py-2 px-3 rounded"
              @click="emit('navigate', 'general')">
        ← General
      </button>
    </div>
  </div>
</template>
```

---

## 6. SvgPanel.vue

### 6a. Props

```js
const props = defineProps({
  activePanel: { type: String, default: 'general' },
})
```

### 6b. Template

```html
<template>
  <main class="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-50">
    <div class="relative w-full h-full bg-white shadow-md border border-slate-200 overflow-hidden fill-none stroke-current">
      <TrainerSideView v-if="props.activePanel === 'general'" class="w-full h-full" />
      <WingDiagramChart v-else class="w-full h-full" />
    </div>
  </main>
</template>
```

Import `WingDiagramChart` alongside the existing `TrainerSideView` import.

---

## 7. WingDiagramChart.vue

**File:** `www/src/pages/index/components/WingDiagramChart.vue`

### 7a. Script setup

```js
import { ref, watch, onMounted, onUnmounted, inject, computed } from 'vue'
import * as d3 from 'd3'
import { APP_STATE_KEY } from '../composables/useAppState'
import { useUnits } from '../composables/useUnits'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { convertDistance, convertSpeed } from '@/units/units.js'

const setError = inject(SET_ERROR_KEY)
const { getState } = inject(APP_STATE_KEY)
const { system } = useUnits()

const containerEl = ref(null)
const svgEl       = ref(null)
const containerW  = ref(0)
const containerH  = ref(0)
let ro = null

onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    containerW.value = entry.contentRect.width
    containerH.value = entry.contentRect.height
  })
  ro.observe(containerEl.value)
})

onUnmounted(() => ro?.disconnect())
```

### 7b. Reactive geometry (SI values)

```js
const geometry = computed(() => {
  const s       = getState()
  const sys     = system.value
  const span    = convertDistance(s.wingSpan,   sys, 'SI')
  const rc      = convertDistance(s.rootChord,  sys, 'SI')
  const tc      = convertDistance(s.tipChord,   sys, 'SI')
  const sweep   = s.sweepAngle   // degrees
  return { span, rc, tc, sweep }
})
```

### 7c. Watch and draw trigger

```js
watch(
  [geometry, containerW, containerH],
  () => {
    if (!svgEl.value || containerW.value === 0) return
    draw()
  },
  { flush: 'post', immediate: true },
)
```

### 7d. `draw()` function — geometry and scaling

All drawing is inside `try { ... } catch (e) { setError(e); return }`.

#### Step 1: Early-exit guard

```js
function draw() {
  try {
    const { span, rc, tc, sweep } = geometry.value
    const svg = d3.select(svgEl.value)
    svg.selectAll('*').remove()

    if (span <= 0 || rc <= 0) {
      // blank canvas — spec requires no diagram when any required dimension is zero
      svg.attr('width', containerW.value).attr('height', containerH.value)
      return
    }
    // ... rest of draw
  } catch (e) { setError(e); return }
}
```

#### Step 2: Planform geometry (all in SI metres)

```js
const halfSpan = span / 2
const sweepRad = sweep * Math.PI / 180

// x_tip_LE: chordwise distance of tip leading-edge aft of root leading-edge.
// Derived from quarter-chord sweep: the quarter-chord moves aft by halfSpan * tan(sweep).
// Simultaneously, the chord shortens from rc to tc, so the LE moves forward by 0.25*(rc - tc).
const xTipLE = halfSpan * Math.tan(sweepRad) - 0.25 * (rc - tc)

const λ = tc / rc  // taper ratio

// Planform bounding box (y-axis = chordwise direction, 0 = root LE)
const yMin = Math.min(0, xTipLE)
const yMax = Math.max(rc, xTipLE + tc)
const planformWidth  = span      // x-axis = spanwise
const planformHeight = yMax - yMin
```

#### Step 3: Scale and canvas offset

```js
const MARGIN = 40
const canvasW = containerW.value
const canvasH = containerH.value
const availW  = canvasW - 2 * MARGIN
const availH  = canvasH - 2 * MARGIN
const scale   = Math.min(availW / planformWidth, availH / planformHeight)

// SVG origin: centre of canvas is x = canvasW/2, y varies
const centreX = canvasW / 2
const topY    = MARGIN + (availH - planformHeight * scale) / 2 - yMin * scale

// Convert planform (px, py) to SVG coordinates.
// px: spanwise, 0 = root, positive = right. py: chordwise, 0 = root LE, positive = aft.
function toSvg(px, py) {
  return [centreX + px * scale, topY + py * scale]
}
```

#### Step 4: Wing outline (blue)

Polygon vertices (clockwise from left tip LE):

```js
const outline = [
  toSvg(0,          0),                    // root LE (shared)
  toSvg(-halfSpan,  xTipLE),               // left tip LE
  toSvg(-halfSpan,  xTipLE + tc),          // left tip TE
  toSvg(0,          rc),                   // root TE
  toSvg(halfSpan,   xTipLE + tc),          // right tip TE
  toSvg(halfSpan,   xTipLE),               // right tip LE
]

svg.append('polygon')
  .attr('points', outline.map(p => p.join(',')).join(' '))
  .attr('fill', '#dbeafe')
  .attr('stroke', '#2563eb')
  .attr('stroke-width', 1.5)
  .attr('stroke-linejoin', 'round')
```

#### Step 5: Quarter-chord line (red)

```js
const qcRoot = toSvg(0,         0.25 * rc)
const qcLeft = toSvg(-halfSpan, xTipLE + 0.25 * tc)
const qcRight= toSvg(halfSpan,  xTipLE + 0.25 * tc)

// Left side
svg.append('line')
  .attr('x1', qcRoot[0]).attr('y1', qcRoot[1])
  .attr('x2', qcLeft[0]).attr('y2', qcLeft[1])
  .attr('stroke', '#dc2626').attr('stroke-width', 1.2)

// Right side
svg.append('line')
  .attr('x1', qcRoot[0]).attr('y1', qcRoot[1])
  .attr('x2', qcRight[0]).attr('y2', qcRight[1])
  .attr('stroke', '#dc2626').attr('stroke-width', 1.2)
```

#### Step 6: MAC (grey dashed, right side only)

```js
const mac        = (2 / 3) * rc * (1 + λ + λ * λ) / (1 + λ)
const yMac       = halfSpan * (1 + 2 * λ) / (3 * (1 + λ))  // spanwise distance from root
const xMacLE     = xTipLE * (yMac / halfSpan)               // chordwise LE position (linear interp)

const macStart = toSvg(yMac, xMacLE)
const macEnd   = toSvg(yMac, xMacLE + mac)

svg.append('line')
  .attr('x1', macStart[0]).attr('y1', macStart[1])
  .attr('x2', macEnd[0]).attr('y2', macEnd[1])
  .attr('stroke', '#94a3b8')
  .attr('stroke-width', 1.2)
  .attr('stroke-dasharray', '5 3')
```

The MAC is drawn on the right half only (positive spanwise direction from root).

#### Step 7: Quarter-MAC marker (quartered circle)

The marker is placed at the quarter-chord point of the MAC:

```js
const [qmX, qmY] = toSvg(yMac, xMacLE + 0.25 * mac)
const qmR = 6

// Four quadrant wedges — quadrants 0 and 2 filled, 1 and 3 transparent
;[0, 1, 2, 3].forEach(q => {
  const a0 = (q * Math.PI) / 2
  const a1 = a0 + Math.PI / 2
  const x1 = qmR * Math.cos(a0), y1 = qmR * Math.sin(a0)
  const x2 = qmR * Math.cos(a1), y2 = qmR * Math.sin(a1)
  svg.append('path')
    .attr('d', `M0,0 L${x1},${y1} A${qmR},${qmR} 0 0,1 ${x2},${y2} Z`)
    .attr('transform', `translate(${qmX},${qmY})`)
    .attr('fill', q % 2 === 0 ? '#1e293b' : 'transparent')
})
svg.append('circle')
  .attr('cx', qmX).attr('cy', qmY).attr('r', qmR)
  .attr('fill', 'none').attr('stroke', '#1e293b').attr('stroke-width', 1)
```

This follows the same pattern as the quarter-chord symbol in `AirfoilProfileChart.vue`.

### 7e. Template

```html
<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg ref="svgEl" class="block w-full h-full" />
  </div>
</template>
```

---

## 8. Formula Reference

| Symbol | Formula | Notes |
|---|---|---|
| λ (taper ratio) | `tipChord_SI / rootChord_SI` | Dimensionless; `—` when `rootChord_SI ≤ 0` |
| Wing area | `(rootChord + tipChord) / 2 × wingSpan` | Computed in display unit; convert rootChord/tipChord/wingSpan from state directly |
| Aspect ratio | `wingSpan_SI² / wingArea_SI` | Dimensionless |
| x_tip_LE | `halfSpan × tan(sweepAngle°) − 0.25 × (rc_SI − tc_SI)` | Chordwise aft offset of tip LE from root LE |
| Reynolds number | `(density × speed_SI × chord_SI) / viscosity` | `density`, `viscosity` from `atmosphere(alt_SI)` |
| MAC length | `(2/3) × rc_SI × (1 + λ + λ²) / (1 + λ)` | Standard trapezoidal formula |
| MAC spanwise position | `halfSpan × (1 + 2λ) / (3(1 + λ))` | Distance from root, outboard |
| MAC LE chordwise offset | `xTipLE × (yMac / halfSpan)` | Linear interpolation of LE sweep |

---

## 9. Error Handling Integration

Every component and composable follows the pattern documented in `CLAUDE.md`:

| Location | Guarded logic | Fallback |
|---|---|---|
| `WingDefinitionPanel` — `taperRatio` computed | Division, state access | `null` → displays `'—'` |
| `WingDefinitionPanel` — `wingArea` computed | Multiply, state access | `null` → displays `'—'` |
| `WingDefinitionPanel` — `aspectRatio` computed | Division, state access | `null` → displays `'—'` |
| `WingDefinitionPanel` — `reynoldsNumbers` computed | `atmosphere()` (can throw `RangeError` on altitude out of 0–4000 m), division | `{ root: null, tip: null }` → displays `'—'` |
| `WingDiagramChart` — `draw()` | All D3 calls, geometry arithmetic | `return` (blank canvas) |
| `useAppState` — `setState()` | Already guarded — no change needed |

`setError` is injected via `SET_ERROR_KEY` in both `WingDefinitionPanel` and `WingDiagramChart`.

---

## 10. Test Strategy

### 10a. `www/src/units/units.test.js` (new file)

```
getAreaUnit('SI')        → 'm²'
getAreaUnit('Imperial')  → 'ft²'
convertArea(1, 'SI', 'Imperial')        → ≈ 10.7639
convertArea(10.7639, 'Imperial', 'SI')  → ≈ 1.0
convertArea(5, 'SI', 'SI')             → 5  (no-op)
```

### 10b. `useAppState.test.js` (extend)

```
defaults wingSpan, rootChord, tipChord to 0, sweepAngle to 0
setState can update wingSpan
wingSpan converts from SI to Imperial when units change (e.g. 1 m → 3.28084 ft)
rootChord converts from SI to Imperial when units change
tipChord converts from SI to Imperial when units change
sweepAngle is NOT converted when units change (degrees stay as-is)
```

Pattern: set value in SI, switch to Imperial, `toBeCloseTo(expected, 2)`.

### 10c. `useUnits.test.js` (extend)

```
areaUnit is 'm²' when system is SI
areaUnit is 'ft²' when system is Imperial
areaUnit updates reactively when state changes
```

### 10d. `ParameterPanel.test.js` (extend existing)

Rename "Parameters" assertion to "General":
```
displays "General" section heading (update existing test)
```

New tests:
```
header click opens dropdown
header click again closes dropdown
dropdown "Wing Definition" item is disabled when airfoilProfile is null
dropdown "Wing Definition" item is disabled when wingLoading is 0
dropdown "Wing Definition" item is disabled when cruisingSpeed is 0
dropdown "Wing Definition" item is enabled when all three conditions met
clicking disabled "Wing Definition" item does not emit navigate
clicking enabled "Wing Definition" item emits navigate with 'wing-definition'
clicking "General" item in dropdown emits navigate with 'general'
"Wing Definition →" button is present in General view
"Wing Definition →" button is disabled when conditions not met
"Wing Definition →" button emits navigate with 'wing-definition' when conditions met
activePanel='wing-definition' renders WingDefinitionPanel instead of General fields
```

Provide `activePanel` as a prop in `mountPanel()`. Mock `WingDefinitionPanel` as a stub to avoid its dependencies.

### 10e. `WingDefinitionPanel.test.js` (new)

Test harness provides `APP_STATE_KEY`, `SET_ERROR_KEY`, and `APP_STATE_KEY` with `system='SI'` default. Mount with `@vue/test-utils`.

```
renders four number inputs (wingSpan, rootChord, tipChord, sweepAngle)
wingSpan input reflects state value
wingSpan input calls setState on change
rootChord input calls setState on change
tipChord input calls setState on change
sweepAngle input calls setState on change
displays distanceUnit suffix on span/chord inputs
displays '°' suffix on sweep angle input
taperRatio displays '—' when rootChord is 0
taperRatio computes correctly: tipChord=0.5, rootChord=1.0 → '0.500'
wingArea displays '—' when wingSpan is 0
wingArea computes correctly: span=10, root=2, tip=1 → 15.0000 (SI)
aspectRatio displays '—' when rootChord is 0
aspectRatio computes: span=10, root=2, tip=1, area=15 → AR = 100/15 ≈ 6.67
rootRe displays '—' when cruisingSpeed is 0
rootRe displays '—' when rootChord is 0
rootRe computes a finite positive number for valid SI inputs
tipRe computes a different value from rootRe when tipChord ≠ rootChord
Reynolds number formatReynolds(245000) → '2.45 × 10⁵'
Reynolds number formatReynolds(null) → '—'
setError is called and taperRatio returns null when rootChord getter throws
← General button emits navigate with 'general'
```

For the setError test, use the non-enumerable getter pattern (see notes.md architectural decision dated 2026-06-13).

### 10f. `WingDiagramChart.test.js` (new)

```
renders an svg element
svg is empty (no child elements) when wingSpan is 0
svg is empty when rootChord is 0
svg has polygon element when valid geometry provided (span=10, rc=2, tc=1, sweep=0)
svg has line elements for quarter-chord when valid geometry provided
svg has dashed line element for MAC when valid geometry provided
svg has circle element for quarter-MAC marker when valid geometry provided
setError is called and canvas is cleared when draw() throws (simulate via broken state getter)
```

Since `jsdom` does not support `ResizeObserver`, the test harness must stub it:

```js
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  disconnect() {}
})
```

After mount, manually set `containerW` and `containerH` by triggering the ResizeObserver callback or by directly setting the exposed refs. Alternatively, trigger a `watch` flush by setting `containerW` on the wrapper's component instance.

The simplest approach: pass initial dimensions via a test-only `expose` or by triggering the observer mock synchronously in the `observe()` stub.

### 10g. `SvgPanel.test.js` (extend)

```
renders TrainerSideView when activePanel is 'general' (existing tests still pass)
does not render TrainerSideView when activePanel is 'wing-definition'
renders WingDiagramChart when activePanel is 'wing-definition'
```

Mock `WingDiagramChart` as a stub component to avoid D3 and APP_STATE_KEY dependencies.

---

## 11. Implementation Order

1. `units.js` + test (no dependencies)
2. `useUnits.js` + test extension (depends on units.js)
3. `useAppState.js` + test extension (depends on units.js)
4. `WingDefinitionPanel.vue` + test (depends on state, units)
5. `WingDiagramChart.vue` + test (depends on state, units, D3)
6. `ParameterPanel.vue` changes + test extensions (depends on WingDefinitionPanel)
7. `SvgPanel.vue` changes + test extensions (depends on WingDiagramChart)
8. `App.vue` wiring (orchestration, no new tests needed)

Steps 4 and 5 can proceed in parallel.
