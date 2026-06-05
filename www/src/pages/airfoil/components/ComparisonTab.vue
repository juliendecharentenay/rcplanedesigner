<script setup>
import { ref, computed, inject } from 'vue'
import airfoilData from '@/assets/airfoils.json'
import { interpolateAoA } from '@/js/interpolateAoA'
import { interpolateAtAoA } from '@/js/interpolateAtAoA'
import { useAirfoil } from '../composables/useAirfoil'
import BaseSelect from '@/components/BaseSelect.vue'
import ComparisonChart from './ComparisonChart.vue'

const props = defineProps({
  targetCl: { default: null },
})

const { selectedAirfoilData } = useAirfoil()

const METRICS = [
  { value: 'cruiseCl',  label: 'Cruise CL',  axisLabel: 'Lift Coefficient (CL)' },
  { value: 'cruiseAoa', label: 'Cruise AoA', axisLabel: 'Angle of Attack (°)' },
  { value: 'cruiseCd',  label: 'Cruise CD',  axisLabel: 'Drag Coefficient (CD)' },
  { value: 'cruiseCm',  label: 'Cruise CM',  axisLabel: 'Moment Coefficient (CM)' },
]

const METRIC_OPTIONS = METRICS.map(m => ({ value: m.value, label: m.label }))

const xMetric = ref('cruiseAoa')
const yMetric = ref('cruiseCl')

const xAxisLabel = computed(() => METRICS.find(m => m.value === xMetric.value)?.axisLabel ?? xMetric.value)
const yAxisLabel = computed(() => METRICS.find(m => m.value === yMetric.value)?.axisLabel ?? yMetric.value)

const chartData = computed(() => {
  if (props.targetCl == null) return []
  return airfoilData.map(a => {
    const cruiseAoa = interpolateAoA(a.polar, props.targetCl)
    const at        = interpolateAtAoA(a.polar, cruiseAoa)
    const vals = {
      cruiseCl:  props.targetCl,
      cruiseAoa,
      cruiseCd:  at?.cd ?? null,
      cruiseCm:  at?.cm ?? null,
    }
    return {
      profileName: a.profileName,
      x: vals[xMetric.value],
      y: vals[yMetric.value],
      isSelected: a.profileName === selectedAirfoilData.value.profileName,
    }
  }).filter(d => d.x != null && d.y != null)
})
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

    <!-- No cruise conditions set -->
    <div
      v-if="targetCl == null"
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
