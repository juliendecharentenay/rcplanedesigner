<script setup>
import { ref, watch, computed, onMounted, onUnmounted, inject } from 'vue'
import * as d3 from 'd3'
import { APP_STATE_KEY } from '../composables/useAppState'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { useUnits } from '../composables/useUnits'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { convertDistance, convertWingLoading, convertSpeed } from '@/units/units.js'
import { AirfoilAnalyser } from '@/js/AirfoilAnalyser.js'
import { WingAnalyser } from '@/js/WingAnalyser.js'
import { atmosphere } from '@/js/atmosphere.js'
import WingDragCurveChart from './WingDragCurveChart.vue'
import WingPlanformLayer from './WingPlanformLayer.vue'

const props = defineProps({
  showDragCurve: { type: Boolean, default: false },
})
const emit = defineEmits(['update:showDragCurve'])

const setError = inject(SET_ERROR_KEY)
const { getState } = inject(APP_STATE_KEY)
const { airfoils } = inject(AIRFOILS_KEY)
const { system } = useUnits()

// Local mirror so the toggle works immediately; propagates changes to parent for URL sync.
const localShowDragCurve = ref(props.showDragCurve)
watch(() => props.showDragCurve, v => { localShowDragCurve.value = v })

function toggleDragCurve() {
  localShowDragCurve.value = !localShowDragCurve.value
  emit('update:showDragCurve', localShowDragCurve.value)
}

const containerEl = ref(null)
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

// ── Geometry (SI) ─────────────────────────────────────────────────────────────

const geometry = computed(() => {
  try {
    const s    = getState()
    const sys  = system.value
    const span = convertDistance(s.wingSpan,  sys, 'SI')
    const rc   = convertDistance(s.rootChord, sys, 'SI')
    const tc   = convertDistance(s.tipChord,  sys, 'SI')
    const sweep = s.sweepAngle
    return { span, rc, tc, sweep }
  } catch (e) { setError(e); return { span: 0, rc: 0, tc: 0, sweep: 0 } }
})

// ── WingAnalyser instance ─────────────────────────────────────────────────────

const wingAnalyser = computed(() => {
  try {
    const { span, rc, tc, sweep } = geometry.value
    return new WingAnalyser({ wingSpan: span, rootChord: rc, tipChord: tc, sweepAngle: sweep })
  } catch (e) { setError(e); return null }
})

// ── SVG layout ────────────────────────────────────────────────────────────────

const svgLayout = computed(() => {
  try {
    const { span, rc, tc, sweep } = geometry.value
    const wa = wingAnalyser.value
    if (!wa || span <= 0 || rc <= 0) return null

    const xTipLE  = wa.xTipLE
    const yMin    = Math.min(0, xTipLE)
    const yMax    = Math.max(rc, xTipLE + tc)

    const MARGIN_H = 40
    const MARGIN_T = 65
    const MARGIN_B = 40
    const canvasW  = containerW.value
    const canvasH  = containerH.value
    if (canvasW === 0 || canvasH === 0) return null
    const availW   = canvasW - 2 * MARGIN_H
    const availH   = canvasH - MARGIN_T - MARGIN_B
    const scale    = Math.min(availW / span, availH / (yMax - yMin))
    const centreX  = canvasW / 2
    const topY     = MARGIN_T + (availH - (yMax - yMin) * scale) / 2 - yMin * scale

    return {
      scale, centreX, topY,
      canvasW, canvasH,
      halfSpan:             span / 2,
      rootChord:            rc,
      tipChord:             tc,
      xTipLE,
      mac:                  wa.mac,
      macSpanPosition:      wa.macSpanPosition,
      macLeadingEdgeOffset: wa.macLeadingEdgeOffset,
      wingTopY:             topY + yMin * scale,
      wingBottomY:          topY + yMax * scale,
    }
  } catch (e) { setError(e); return null }
})

// ── Performance data ──────────────────────────────────────────────────────────

function fmtAoa(val) {
  if (val == null || !isFinite(val)) return '—'
  return val.toFixed(1) + '°'
}

function fmtCd(val) {
  if (val == null || !isFinite(val)) return '—'
  return val.toFixed(3)
}

const performanceData = computed(() => {
  const nullResult = {
    cruiseAoaInfinite: null, cruiseAoaWing: null,
    landingAoaInfinite: null, landingAoaWing: null,
    baseCdCruise: null, inducedCdWing: null, totalCdWing: null,
  }
  try {
    const s = getState()
    const analyser = airfoils.find(a => a.profileName === s.airfoilProfile) ?? null
    if (!analyser) return nullResult

    const wl  = convertWingLoading(s.wingLoading,   s.units, 'SI')
    const spd = convertSpeed(s.cruisingSpeed,        s.units, 'SI')
    const alt = convertDistance(s.siteAltitude,      s.units, 'SI')

    const cruiseCl = AirfoilAnalyser.convertSpeedToCl(wl, spd, alt)
    const { cruiseAoa: cruiseAoaInfinite, cruiseCl: resolvedCruiseCl, cruiseCd } =
      analyser.getCruiseConditions(cruiseCl)

    const landingAoaInfinite = analyser.landingAoa
    const landingCl          = analyser.landingCl

    const wa = wingAnalyser.value
    if (wa == null) throw new Error(`Wing analyser is null`)
    const cruiseAoaWing  = wa.cruiseAoaWing(cruiseAoaInfinite, resolvedCruiseCl) ?? null
    const landingAoaWing = wa.landingAoaWing(landingAoaInfinite, landingCl)      ?? null

    const baseCdCruise  = cruiseCd ?? null
    const inducedCdWing = (baseCdCruise != null && resolvedCruiseCl != null)
      ? (wa.inducedCd(resolvedCruiseCl) ?? null)
      : null
    const totalCdWing   = (baseCdCruise != null && inducedCdWing != null)
      ? baseCdCruise + inducedCdWing
      : null

    return {
      cruiseAoaInfinite, cruiseAoaWing, landingAoaInfinite, landingAoaWing,
      baseCdCruise, inducedCdWing, totalCdWing,
    }
  } catch (e) { setError(e); return nullResult }
})

// ── Drag curve state ──────────────────────────────────────────────────────────

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

    const wingAreaSI = wa.wingArea
    if (wingAreaSI == null || wingAreaSI <= 0) return nullResult

    const { density: rho } = atmosphere(alt)

    const vMax = Math.max(cruiseSpeedSI * 2, stallSpeedSI * 4)
    const step = (vMax - stallSpeedSI) / (N_CURVE_POINTS - 1)

    const points = []
    for (let i = 0; i < N_CURVE_POINTS; i++) {
      const v  = stallSpeedSI + i * step
      const cl = AirfoilAnalyser.convertSpeedToCl(wl, v, alt)
      if (cl == null || cl <= 0) continue
      const { cruiseAoa, cruiseCd } = analyser.getCruiseConditions(cl)
      if (cruiseAoa == null || cruiseCd == null) continue
      const induced = wa.inducedCd(cl)
      if (induced == null) continue
      const q           = 0.5 * rho * v * v
      const baseDrag    = q * wingAreaSI * cruiseCd
      const inducedDrag = q * wingAreaSI * induced
      points.push({ v, baseDrag, inducedDrag, totalDrag: baseDrag + inducedDrag })
    }

    if (points.length < 2) return nullResult

    let minIdx = 0
    for (let i = 1; i < points.length; i++) {
      if (points[i].totalDrag < points[minIdx].totalDrag) minIdx = i
    }

    return { points, stallSpeedSI, cruiseSpeedSI, minDragSpeedSI: points[minIdx].v }
  } catch (e) { setError(e); return nullResult }
})
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <!-- SVG wing diagram (reactive, no D3 draw loop) -->
    <svg
      v-show="!localShowDragCurve"
      class="block w-full h-full"
      :width="containerW"
      :height="containerH"
    >
      <template v-if="svgLayout">
        <!-- Arrow marker defs -->
        <defs>
          <marker id="arr-end"   viewBox="0 -4 8 8" refX="8" refY="0" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,-4 L8,0 L0,4" fill="#64748b" />
          </marker>
          <marker id="arr-start" viewBox="0 -4 8 8" refX="0" refY="0" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,-4 L8,0 L0,4" fill="#64748b" />
          </marker>
        </defs>

        <!-- Centreline -->
        <line
          :x1="svgLayout.centreX" :y1="svgLayout.wingTopY - 15"
          :x2="svgLayout.centreX" :y2="svgLayout.wingBottomY + 15"
          stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 3"
        />

        <!-- Wing planform (delegated to shared component) -->
        <WingPlanformLayer
          :centre-x="svgLayout.centreX"
          :top-y="svgLayout.topY"
          :scale="svgLayout.scale"
          :half-span="svgLayout.halfSpan"
          :root-chord="svgLayout.rootChord"
          :tip-chord="svgLayout.tipChord"
          :x-tip-l-e="svgLayout.xTipLE"
          :mac="svgLayout.mac"
          :mac-span-position="svgLayout.macSpanPosition"
          :mac-leading-edge-offset="svgLayout.macLeadingEdgeOffset"
          :show-mac="true"
          :show-quarter-chord="true"
          :show-dimensions="true"
        />
      </template>
    </svg>

    <!-- Drag curve chart -->
    <WingDragCurveChart
      v-if="localShowDragCurve"
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
      @click="toggleDragCurve"
    >
      {{ localShowDragCurve ? 'Show planform' : 'Show drag curve' }}
    </button>

    <!-- Performance table overlay — top-right corner -->
    <div class="absolute top-0 right-0 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-bl-md text-xs">
      <table class="border-collapse">
        <thead>
          <tr>
            <th class="table-th text-left"></th>
            <th class="table-th text-center">Infinite AR</th>
            <th class="table-th text-center">Wing</th>
          </tr>
        </thead>
        <tbody>
          <tr class="table-row-banded">
            <td class="px-2 py-1 text-slate-600">Cruise AoA</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.cruiseAoaInfinite) }}</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.cruiseAoaWing) }}</td>
          </tr>
          <tr class="table-row-banded">
            <td class="px-2 py-1 text-slate-600">Landing AoA</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.landingAoaInfinite) }}</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.landingAoaWing) }}</td>
          </tr>
          <tr class="table-row-banded">
            <td class="px-2 py-1 text-slate-600">Cruise base Cd</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.baseCdCruise) }}</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.baseCdCruise) }}</td>
          </tr>
          <tr class="table-row-banded">
            <td class="px-2 py-1 text-slate-600">Cruise induced Cd</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">0.000</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.inducedCdWing) }}</td>
          </tr>
          <tr class="table-row-banded">
            <td class="px-2 py-1 text-slate-600">Cruise total Cd</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.baseCdCruise) }}</td>
            <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtCd(performanceData.totalCdWing) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
