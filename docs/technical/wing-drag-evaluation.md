# Technical Specification: Wing Drag Evaluation Expansion

## 1. Overview

This spec covers two incremental additions to `WingDiagramChart.vue`:

1. **Performance table expansion** — three new drag coefficient rows appended to the existing AoA table.
2. **Drag curve overlay** — a toggleable D3 chart replacing the planform, showing base drag, induced drag, and total drag vs. speed.

Functional spec: `docs/functional/wing-drag-evaluation.md`

---

## 2. Files Changed

| File | Change |
|---|---|
| `www/src/js/WingAnalyser.js` | Add `inducedCd(cl)` method |
| `www/src/pages/index/components/WingDiagramChart.vue` | Extend `performanceData`, add drag curve state and computed, update template |
| `www/src/pages/index/components/WingDragCurveChart.vue` | **New** — D3 drag curve chart component |
| `www/src/js/WingAnalyser.test.js` | Tests for `inducedCd` |
| `www/src/pages/index/components/WingDiagramChart.test.js` | Tests for new table rows and toggle |
| `www/src/pages/index/components/WingDragCurveChart.test.js` | **New** — chart rendering tests |

---

## 3. Chunk 1 — Performance Table Expansion

### 3.1 `WingAnalyser.js` — add `inducedCd(cl)`

Add a new public method after `inducedAoaDeg`:

```js
inducedCd(cl) {
  const ar = this.aspectRatio
  if (cl == null || ar == null || ar <= 0) return null
  return (cl * cl) / (Math.PI * OSWALD_E * ar)
}
```

Null semantics mirror `inducedAoaDeg`: any null or non-positive AR returns null; `cl = 0` returns `0`.

### 3.2 `WingDiagramChart.vue` — extend `performanceData`

**Extend `nullResult`:**

```js
const nullResult = {
  cruiseAoaInfinite: null, cruiseAoaWing: null,
  landingAoaInfinite: null, landingAoaWing: null,
  baseCdCruise: null, inducedCdWing: null, totalCdWing: null,
}
```

**After step 3 (cruise conditions)**, the existing call:

```js
const { cruiseAoa: cruiseAoaInfinite, cruiseCl: resolvedCruiseCl } =
  analyser.getCruiseConditions(cruiseCl)
```

already returns `cruiseCd`. Extend the destructuring:

```js
const { cruiseAoa: cruiseAoaInfinite, cruiseCl: resolvedCruiseCl, cruiseCd } =
  analyser.getCruiseConditions(cruiseCl)
```

**After step 5 (wing AoA corrections)**, compute drag values:

```js
const baseCdCruise  = cruiseCd ?? null
const inducedCdWing = (baseCdCruise != null && resolvedCruiseCl != null)
  ? (wa.inducedCd(resolvedCruiseCl) ?? null)
  : null
const totalCdWing   = (baseCdCruise != null && inducedCdWing != null)
  ? baseCdCruise + inducedCdWing
  : null
```

**Return value:**

```js
return {
  cruiseAoaInfinite, cruiseAoaWing, landingAoaInfinite, landingAoaWing,
  baseCdCruise, inducedCdWing, totalCdWing,
}
```

### 3.3 `WingDiagramChart.vue` — `fmtCd` formatter

Add alongside `fmtAoa`:

```js
function fmtCd(val) {
  if (val == null || !isFinite(val)) return '—'
  return val.toFixed(3)
}
```

### 3.4 `WingDiagramChart.vue` — template table rows

Insert after the existing two `<tbody>` rows and before `</tbody>`:

```html
<!-- Drag group separator -->
<tr>
  <td colspan="3" class="px-2 pt-2 pb-0">
    <hr class="border-slate-200" />
  </td>
</tr>
<tr class="table-row-banded">
  <td class="px-2 py-1 text-slate-600">Base drag Cd</td>
  <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.baseCdCruise) }}</td>
  <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.baseCdCruise) }}</td>
</tr>
<tr class="table-row-banded">
  <td class="px-2 py-1 text-slate-600">Induced drag Cd</td>
  <td class="px-2 py-1 text-center font-mono text-slate-800">0.000</td>
  <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.inducedCdWing) }}</td>
</tr>
<tr class="table-row-banded">
  <td class="px-2 py-1 text-slate-600">Total drag Cd</td>
  <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.baseCdCruise) }}</td>
  <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.totalCdWing) }}</td>
</tr>
```

Notes:
- Infinite AR induced drag is the hard-coded string `0.000` (always zero, not computed).
- Infinite AR base drag and total drag both display `baseCdCruise` (profile drag is the same for infinite AR and finite wing).
- The `<hr>` separator row visually groups drag rows from AoA rows.

### 3.5 Tests — `WingAnalyser.test.js`

Four new tests for `inducedCd`:

| Test | Input | Expected |
|---|---|---|
| Valid CL and AR | cl=1.0, AR=6.0, e=0.85 | `1 / (π × 0.85 × 6)` ≈ `0.0623` |
| cl = 0 | cl=0 | `0` |
| ar = null (invalid geometry) | wa with rootChord=0 | `null` |
| cl = null | `wa.inducedCd(null)` | `null` |

### 3.6 Tests — `WingDiagramChart.test.js`

New tests (AC-T1–T7):

| ID | Test |
|---|---|
| T-drag-1 | Table has rows with text "Base drag Cd", "Induced drag Cd", "Total drag Cd" |
| T-drag-2 | Infinite AR column shows same baseCdCruise as Wing column |
| T-drag-3 | Infinite AR induced drag cell text is `"0.000"` |
| T-drag-4 | Wing total drag cell = baseCdCruise + inducedCdWing (to 3dp) |
| T-drag-5 | All three values update when a mock with different cruiseCd is provided |
| T-drag-6 | Cells display `"—"` when no airfoil is selected |
| T-drag-7 | A `<hr>` separator exists between AoA rows and drag rows |

Use `MOCK_ANALYSER` fixture already in the file; extend it so `getCruiseConditions` returns a known `cruiseCd` value.

---

## 4. Chunk 2 — Drag Curve Overlay

### 4.1 `WingDiagramChart.vue` — new state and computeds

Add the following at the end of `<script setup>`, before the `watch`:

```js
// ── Drag curve state ──────────────────────────────────────────────────────────

const showDragCurve = ref(false)

const dragCurveAvailable = computed(() => {
  try {
    const s = getState()
    const analyser = airfoils.find(a => a.profileName === s.airfoilProfile) ?? null
    const wa = wingAnalyser.value
    if (!analyser || !wa) return false
    const wl  = convertWingLoading(s.wingLoading,  s.units, 'SI')
    const alt = convertDistance(s.siteAltitude,    s.units, 'SI')
    const stallSpeed = analyser.getStallSpeed(wl, alt)
    return stallSpeed != null && stallSpeed > 0
  } catch { return false }
})

const N_CURVE_POINTS = 100

const dragCurveData = computed(() => {
  const nullResult = { points: [], stallSpeedSI: null, cruiseSpeedSI: null, minDragSpeedSI: null }
  if (!dragCurveAvailable.value) return nullResult
  try {
    const s = getState()
    const analyser = airfoils.find(a => a.profileName === s.airfoilProfile)
    const wa = wingAnalyser.value
    const wl  = convertWingLoading(s.wingLoading,  s.units, 'SI')
    const alt = convertDistance(s.siteAltitude,    s.units, 'SI')
    const cruiseSpeedSI = convertSpeed(s.cruisingSpeed, s.units, 'SI')
    const stallSpeedSI  = analyser.getStallSpeed(wl, alt)

    const vMax = Math.max(cruiseSpeedSI * 2, stallSpeedSI * 4)
    const step = (vMax - stallSpeedSI) / (N_CURVE_POINTS - 1)

    const points = []
    for (let i = 0; i < N_CURVE_POINTS; i++) {
      const v  = stallSpeedSI + i * step
      const cl = AirfoilAnalyser.convertSpeedToCl(wl, v, alt)
      if (cl == null || cl <= 0) break
      const { cruiseAoa, cruiseCd } = analyser.getCruiseConditions(cl)
      if (cruiseAoa == null || cruiseCd == null) break
      const induced = wa.inducedCd(cl)
      if (induced == null) break
      points.push({ v, baseCd: cruiseCd, inducedCd: induced, totalCd: cruiseCd + induced })
    }

    if (points.length < 2) return nullResult

    let minIdx = 0
    for (let i = 1; i < points.length; i++) {
      if (points[i].totalCd < points[minIdx].totalCd) minIdx = i
    }

    return { points, stallSpeedSI, cruiseSpeedSI, minDragSpeedSI: points[minIdx].v }
  } catch (e) { setError(e); return nullResult }
})
```

**Imports to add:** none — `convertSpeed` is already imported; `AirfoilAnalyser` is already imported; `ref` is already imported.

### 4.2 `WingDiagramChart.vue` — update `watch`

Add `showDragCurve` to the watch source array, and guard the draw call:

```js
watch(
  [geometry, containerW, containerH, showDragCurve],
  () => {
    if (!svgEl.value || containerW.value === 0 || showDragCurve.value) return
    draw()
  },
  { flush: 'post', immediate: true },
)
```

The `showDragCurve.value` guard prevents D3 drawing into the hidden SVG; adding it to the array ensures draw() is called when the user toggles back to the planform.

### 4.3 `WingDiagramChart.vue` — import `WingDragCurveChart`

```js
import WingDragCurveChart from './WingDragCurveChart.vue'
```

### 4.4 `WingDiagramChart.vue` — template additions

Replace the existing `<div ref="containerEl" ...>` contents as follows:

```html
<div ref="containerEl" class="relative w-full h-full">
  <!-- Planform SVG — kept in DOM (v-show) so ResizeObserver and D3 are unaffected -->
  <svg ref="svgEl" v-show="!showDragCurve" class="block w-full h-full" />

  <!-- Drag curve chart -->
  <WingDragCurveChart
    v-if="showDragCurve"
    class="absolute inset-0"
    :points="dragCurveData.points"
    :cruise-speed-s-i="dragCurveData.cruiseSpeedSI"
    :min-drag-speed-s-i="dragCurveData.minDragSpeedSI"
    :stall-speed-s-i="dragCurveData.stallSpeedSI"
    :system="system"
  />

  <!-- Toggle button — hidden when curve data is unavailable -->
  <button
    v-if="dragCurveData.points.length >= 2"
    class="absolute bottom-2 left-2 text-xs font-medium px-2 py-1 rounded border border-slate-300 bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-slate-50"
    @click="showDragCurve = !showDragCurve"
  >
    {{ showDragCurve ? 'Show planform' : 'Show drag curve' }}
  </button>

  <!-- Performance table overlay (existing, with new rows per Chunk 1) -->
  ...
</div>
```

### 4.5 `WingDragCurveChart.vue` — new component

Full file structure:

```vue
<script setup>
import { ref, watch, onMounted, onUnmounted, inject, computed } from 'vue'
import * as d3 from 'd3'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { convertSpeed } from '@/units/units.js'

const props = defineProps({
  points:         { type: Array,  required: true },
  cruiseSpeedSI:  { type: Number, default: null },
  minDragSpeedSI: { type: Number, default: null },
  stallSpeedSI:   { type: Number, default: null },
  system:         { type: String, required: true },
})

const setError   = inject(SET_ERROR_KEY)
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

// Speed display helpers
const speedUnit = computed(() => props.system === 'Imperial' ? 'ft/s' : 'm/s')
function toDisplay(v_si) { return convertSpeed(v_si, 'SI', props.system) }

// Tooltip state
const tooltip = ref({ visible: false, x: 0, y: 0, name: '', speed: 0, cd: 0 })

watch(
  [() => props.points, () => props.system, containerW, containerH],
  () => {
    if (!svgEl.value || containerW.value === 0 || props.points.length < 2) return
    draw()
  },
  { flush: 'post', immediate: true },
)

function draw() {
  try {
    const W = containerW.value
    const H = containerH.value
    const svg = d3.select(svgEl.value)
    svg.selectAll('*').remove()
    tooltip.value.visible = false

    const ML = 52, MR = 20, MT = 36, MB = 44   // margins

    // Convert all speed values to display unit
    const pts = props.points.map(p => ({ ...p, vDisplay: toDisplay(p.v) }))
    const cruiseDisplay   = props.cruiseSpeedSI  != null ? toDisplay(props.cruiseSpeedSI)  : null
    const minDragDisplay  = props.minDragSpeedSI != null ? toDisplay(props.minDragSpeedSI) : null

    const maxDisplay = Math.max(
      cruiseDisplay  ?? 0,
      minDragDisplay ?? 0,
      pts[pts.length - 1]?.vDisplay ?? 0
    ) * 1.15

    const maxCd = d3.max(pts, p => p.totalCd) * 1.1

    const xScale = d3.scaleLinear().domain([0, maxDisplay]).range([ML, W - MR])
    const yScale = d3.scaleLinear().domain([0, maxCd]).range([H - MB, MT])

    svg.attr('width', W).attr('height', H)

    // Title
    svg.append('text')
      .attr('x', (ML + W - MR) / 2).attr('y', 14)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#1e293b')
      .attr('font-weight', '600')
      .text('Wing drag vs speed')

    // Gridlines
    const xGrid = d3.axisBottom(xScale).ticks(5).tickSize(-(H - MT - MB)).tickFormat('')
    const yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-(W - ML - MR)).tickFormat('')
    svg.append('g').attr('transform', `translate(0,${H - MB})`).call(xGrid)
      .selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3 3')
    svg.append('g').attr('transform', `translate(${ML},0)`).call(yGrid)
      .selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3 3')
    svg.selectAll('.domain').remove()

    // Axes
    svg.append('g').attr('transform', `translate(0,${H - MB})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr('font-size', 9)
    svg.append('g').attr('transform', `translate(${ML},0)`)
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.3f')))
      .attr('font-size', 9)

    // Axis labels
    svg.append('text')
      .attr('x', (ML + W - MR) / 2).attr('y', H - 6)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#475569')
      .text(`Speed (${speedUnit.value})`)
    svg.append('text')
      .attr('x', 0).attr('y', (MT + H - MB) / 2)
      .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#475569')
      .attr('transform', `rotate(-90, 12, ${(MT + H - MB) / 2})`)
      .text('Cd')

    // Curve definitions
    const curves = [
      { key: 'baseCd',    label: 'Base drag',    stroke: '#94a3b8', dash: '5 3', width: 1.5 },
      { key: 'inducedCd', label: 'Induced drag', stroke: '#38bdf8', dash: '5 3', width: 1.5 },
      { key: 'totalCd',   label: 'Total drag',   stroke: '#1d4ed8', dash: '',    width: 2.5 },
    ]

    const lineGen = key => d3.line()
      .x(p => xScale(p.vDisplay))
      .y(p => yScale(p[key]))
      .defined(p => p[key] != null)

    for (const c of curves) {
      svg.append('path')
        .datum(pts)
        .attr('fill', 'none')
        .attr('stroke', c.stroke)
        .attr('stroke-width', c.width)
        .attr('stroke-dasharray', c.dash || null)
        .attr('d', lineGen(c.key)(pts))
    }

    // Legend (top-left, inside chart area)
    const LX = ML + 8, LY0 = MT + 4
    curves.forEach((c, i) => {
      const y = LY0 + i * 16
      svg.append('line')
        .attr('x1', LX).attr('y1', y + 5).attr('x2', LX + 20).attr('y2', y + 5)
        .attr('stroke', c.stroke).attr('stroke-width', c.width)
        .attr('stroke-dasharray', c.dash || null)
      svg.append('text')
        .attr('x', LX + 24).attr('y', y + 9)
        .attr('font-size', 9).attr('fill', '#475569')
        .text(c.label)
    })

    // Merged marker check
    const MERGE_THRESH_SI = 0.5 // m/s
    const merged = props.cruiseSpeedSI != null && props.minDragSpeedSI != null &&
      Math.abs(props.cruiseSpeedSI - props.minDragSpeedSI) < MERGE_THRESH_SI

    const markers = merged
      ? [{ speedSI: props.cruiseSpeedSI,  display: cruiseDisplay,  label: 'Cruise / Min drag', stroke: '#dc2626', dash: '' }]
      : [
          { speedSI: props.cruiseSpeedSI,  display: cruiseDisplay,  label: 'Cruise',   stroke: '#dc2626', dash: '' },
          { speedSI: props.minDragSpeedSI, display: minDragDisplay, label: 'Min drag', stroke: '#d97706', dash: '6 4' },
        ]

    for (const m of markers) {
      if (m.display == null) continue
      const mx = xScale(m.display)
      if (mx < ML || mx > W - MR) continue

      // Vertical line
      svg.append('line')
        .attr('x1', mx).attr('y1', MT).attr('x2', mx).attr('y2', H - MB)
        .attr('stroke', m.stroke).attr('stroke-width', 1)
        .attr('stroke-dasharray', m.dash || null)
        .attr('opacity', 0.7)

      // Label at top
      svg.append('text')
        .attr('x', mx + 3).attr('y', MT + 2)
        .attr('font-size', 8).attr('fill', m.stroke)
        .text(m.label)

      // Dots at each curve intersection
      for (const c of curves) {
        const nearest = pts.reduce((best, p) =>
          Math.abs(p.vDisplay - m.display) < Math.abs(best.vDisplay - m.display) ? p : best
        )
        const cdVal = nearest[c.key]
        if (cdVal == null) continue
        const dx = xScale(nearest.vDisplay)
        const dy = yScale(cdVal)

        svg.append('circle')
          .attr('cx', dx).attr('cy', dy).attr('r', 5)
          .attr('fill', c.stroke).attr('stroke', 'white').attr('stroke-width', 1.5)
          .style('cursor', 'pointer')
          .on('mouseenter', (event) => {
            tooltip.value = {
              visible: true,
              x: event.offsetX + 12,
              y: event.offsetY - 28,
              name: c.label,
              speed: nearest.vDisplay,
              cd: cdVal,
            }
          })
          .on('mouseleave', () => { tooltip.value.visible = false })
      }
    }

  } catch (e) { setError(e); return }
}
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full bg-white">
    <svg ref="svgEl" class="block w-full h-full" />

    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      class="absolute pointer-events-none bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="font-semibold">{{ tooltip.name }}</div>
      <div>{{ tooltip.speed.toFixed(1) }} {{ speedUnit }}</div>
      <div>Cd: {{ tooltip.cd.toFixed(3) }}</div>
    </div>
  </div>
</template>
```

### 4.6 `WingDragCurveChart.test.js` — new test file

Mount helper stub: provide `SET_ERROR_KEY` (vi.fn()), pass minimal valid `points` array, `cruiseSpeedSI`, `minDragSpeedSI`, `stallSpeedSI`, `system`.

| Test ID | Description |
|---|---|
| DC-1 | SVG element is rendered |
| DC-2 | Three `<path>` elements are drawn when points is non-empty |
| DC-3 | No paths are drawn when points is empty |
| DC-4 | Chart title text "Wing drag vs speed" is present |
| DC-5 | Axis labels "Cd" and "Speed (m/s)" are present in SI mode |
| DC-6 | Axis label shows "ft/s" when system is 'Imperial' |
| DC-7 | Dots (`<circle>`) are rendered at cruise speed position |
| DC-8 | A second set of dots is rendered at min drag speed when speeds differ by > 0.5 m/s |
| DC-9 | Only one set of marker lines when cruise and minDrag speeds are within 0.5 m/s |
| DC-10 | Tooltip div is not visible initially |
| DC-11 | `setError` is called when draw() throws (tested via non-enumerable getter on points) |

### 4.7 `WingDiagramChart.test.js` — toggle tests

| Test ID | Description |
|---|---|
| G-1 | Toggle button is visible when `dragCurveData.points.length >= 2` (mock valid airfoil + geometry) |
| G-2 | Toggle button is absent when no airfoil is selected |
| G-3 | Clicking toggle shows `WingDragCurveChart` and hides planform SVG |
| G-4 | Clicking toggle again hides `WingDragCurveChart` and shows planform SVG |

Tests use `mountChartWithDraw` helper already in the file; extend `MOCK_ANALYSER` so `getStallSpeed` returns a valid speed, and `getCruiseConditions` returns a valid object with `cruiseAoa`, `cruiseCd`.

---

## 5. Scope Evaluation

Score: Modules 3 + Endpoints 1 + Entities 2 + Integrations 2 + Criteria 5 = 13. Split into 2 chunks.

**Chunk 1 (Table):** `WingAnalyser.js`, `WingDiagramChart.vue` (performanceData + template). Tests: `WingAnalyser.test.js` (+4), `WingDiagramChart.test.js` (+7).

**Chunk 2 (Drag curve):** `WingDiagramChart.vue` (curve state + watch + template additions), `WingDragCurveChart.vue` (new). Tests: `WingDiagramChart.test.js` (+4), `WingDragCurveChart.test.js` (new, 11 tests).

---

## 6. Key Invariants

- **OSWALD_E** is not duplicated. `inducedCd()` uses the existing module-level constant in `WingAnalyser.js`.
- **`dragCurveData` guards itself** with `if (!dragCurveAvailable.value) return nullResult` — it never runs without valid inputs.
- **`getCruiseConditions` is the only polar interpolation path** used in drag curve point generation, consistent with the existing `performanceData` pattern.
- **SVG kept in DOM with `v-show`** while drag curve is active, so the ResizeObserver and the D3 draw watch remain valid.
- **Toggle bound to `dragCurveData.points.length >= 2`** — not `dragCurveAvailable` — so it only appears when enough points were actually computed.
- **No new provide/inject keys** — `WingDragCurveChart` receives all data as props; it injects only the pre-existing `SET_ERROR_KEY`.
- **`showDragCurve` is not URL-synced** — it is transient UI state local to the component.
