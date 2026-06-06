<script setup>
import { computed, inject } from 'vue'
import airfoilData from '@/assets/airfoils.json'
import { interpolateAoA } from '@/js/interpolateAoA'
import { computeCruiseDeltaAoA } from '@/js/cruiseDeltaAoA'
import { interpolateAtAoA } from '@/js/interpolateAtAoA'
import { getStallParameters, getLandingParameters } from '@/js/stallParameters'
import { computeCruiseSpeed, computeStallSpeed, computeLandingSpeed } from '@/js/speedParameters'
import { convertWingLoading, convertDistance, convertSpeed } from '@/units/units'
import { useUnits } from '@/pages/index/composables/useUnits'
import { useAirfoil } from '../composables/useAirfoil'
import { APP_STATE_KEY } from '@/pages/index/composables/useAppState'
import BaseSelect from '@/components/BaseSelect.vue'
import ComparisonChart from './ComparisonChart.vue'

const props = defineProps({
  targetCl: { default: null },
})

const { selectedAirfoilData } = useAirfoil()
const { getState, setState } = inject(APP_STATE_KEY)
const { speedUnit } = useUnits()

const METRICS = [
  { value: 'cruiseCl',   label: 'Cruise CL',    axisLabel: 'Lift Coefficient (CL)' },
  { value: 'cruiseAoa',  label: 'Cruise AoA',   axisLabel: 'Angle of Attack (°)' },
  { value: 'cruiseCd',   label: 'Cruise CD',    axisLabel: 'Drag Coefficient (CD)' },
  { value: 'cruiseCm',       label: 'Cruise CM',        axisLabel: 'Moment Coefficient (CM)' },
  { value: 'cruiseDeltaAoA', label: 'Cruise ΔAoA',      axisLabel: 'Cruise ΔAoA (°)' },
  { value: 'stallAoa',       label: 'Stall AoA',        axisLabel: 'Stall Angle of Attack (°)' },
  { value: 'stallCl',    label: 'Stall CL',     axisLabel: 'Stall Lift Coefficient (CL)' },
  { value: 'stallCd',    label: 'Stall CD',     axisLabel: 'Stall Drag Coefficient (CD)' },
  { value: 'stallCm',    label: 'Stall CM',     axisLabel: 'Stall Moment Coefficient (CM)' },
  { value: 'landingAoa', label: 'Landing AoA',  axisLabel: 'Landing Angle of Attack (°)' },
  { value: 'landingCl',  label: 'Landing CL',   axisLabel: 'Landing Lift Coefficient (CL)' },
  { value: 'landingCd',  label: 'Landing CD',   axisLabel: 'Landing Drag Coefficient (CD)' },
  { value: 'landingCm',  label: 'Landing CM',   axisLabel: 'Landing Moment Coefficient (CM)' },
  { value: 'cruiseSpeed',  label: 'Cruise Speed',  axisLabel: 'Cruise Speed' },
  { value: 'stallSpeed',   label: 'Stall Speed',   axisLabel: 'Stall Speed' },
  { value: 'landingSpeed', label: 'Landing Speed', axisLabel: 'Landing Speed' },
]

const METRIC_OPTIONS = METRICS.map(m => ({ value: m.value, label: m.label }))

const CRUISE_METRICS = new Set(['cruiseCl', 'cruiseAoa', 'cruiseCd', 'cruiseCm', 'cruiseDeltaAoA', 'cruiseSpeed'])
const SPEED_METRICS  = new Set(['cruiseSpeed', 'stallSpeed', 'landingSpeed'])

const xMetric = computed({
  get: () => getState().comparisonX,
  set: v => setState({ comparisonX: v }),
})
const yMetric = computed({
  get: () => getState().comparisonY,
  set: v => setState({ comparisonY: v }),
})

function getAxisLabel(metricValue) {
  const m = METRICS.find(m => m.value === metricValue)
  if (!m) return metricValue
  if (SPEED_METRICS.has(metricValue)) return `${m.label} (${speedUnit.value})`
  return m.axisLabel
}
const xAxisLabel = computed(() => getAxisLabel(xMetric.value))
const yAxisLabel = computed(() => getAxisLabel(yMetric.value))

const chartData = computed(() => {
  const needsCruise = CRUISE_METRICS.has(xMetric.value) || CRUISE_METRICS.has(yMetric.value)
  if (needsCruise && props.targetCl == null) return []

  const s = getState()
  const wingLoadingSI = s.units === 'Imperial'
    ? convertWingLoading(s.wingLoading, 'Imperial', 'SI')
    : s.wingLoading
  const altitudeSI = s.units === 'Imperial'
    ? convertDistance(s.siteAltitude, 'Imperial', 'SI')
    : s.siteAltitude
  const toDisplaySpeed = v => {
    if (v == null) return null
    return s.units === 'Imperial' ? convertSpeed(v, 'SI', 'Imperial') : v
  }

  return airfoilData.map(a => {
    const cruiseAoa = props.targetCl != null ? interpolateAoA(a.polar, props.targetCl) : null
    const cruiseAt  = cruiseAoa != null ? interpolateAtAoA(a.polar, cruiseAoa) : null
    const stall     = getStallParameters(a)
    const landing   = getLandingParameters(a)
    const vals = {
      cruiseCl:     props.targetCl,
      cruiseAoa,
      cruiseCd:     cruiseAt?.cd ?? null,
      cruiseCm:       cruiseAt?.cm ?? null,
      cruiseDeltaAoA: computeCruiseDeltaAoA(a.polar, a.zeroLiftAoA, props.targetCl),
      stallAoa:     stall?.stallAoa   ?? null,
      stallCl:      stall?.stallCl    ?? null,
      stallCd:      stall?.stallCd    ?? null,
      stallCm:      stall?.stallCm    ?? null,
      landingAoa:   landing?.landingAoa ?? null,
      landingCl:    landing?.landingCl  ?? null,
      landingCd:    landing?.landingCd  ?? null,
      landingCm:    landing?.landingCm  ?? null,
      cruiseSpeed:  toDisplaySpeed(computeCruiseSpeed(wingLoadingSI, props.targetCl, altitudeSI)),
      stallSpeed:   toDisplaySpeed(computeStallSpeed(wingLoadingSI, stall?.stallCl ?? null, altitudeSI)),
      landingSpeed: toDisplaySpeed(computeLandingSpeed(wingLoadingSI, stall?.stallCl ?? null, altitudeSI)),
    }
    return {
      profileName: a.profileName,
      x: vals[xMetric.value],
      y: vals[yMetric.value],
      isSelected: a.profileName === selectedAirfoilData.value.profileName,
    }
  }).filter(d => d.x != null && d.y != null)
})

const hasData = computed(() => chartData.value.length > 0)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Banner -->
    <div class="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-200 shrink-0">
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Axes</span>
      <div class="flex items-center gap-2">
        <label for="cmp-x" class="text-xs text-slate-500">X</label>
        <BaseSelect id="cmp-x" v-model="xMetric" :options="METRIC_OPTIONS" />
      </div>
      <span class="text-slate-300">|</span>
      <div class="flex items-center gap-2">
        <label for="cmp-y" class="text-xs text-slate-500">Y</label>
        <BaseSelect id="cmp-y" v-model="yMetric" :options="METRIC_OPTIONS" />
      </div>
    </div>

    <!-- No data available -->
    <div
      v-if="!hasData"
      class="flex-1 flex items-center justify-center text-slate-400 text-sm"
    >
      Enter wing loading and cruising speed to compare airfoils.
    </div>

    <!-- Chart -->
    <ComparisonChart
      v-else
      :data="chartData"
      :x-label="xAxisLabel"
      :y-label="yAxisLabel"
      class="flex-1 min-h-0"
    />
  </div>
</template>
