<script setup>
import { computed, inject } from 'vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import LiftDragPolarChart from './LiftDragPolarChart.vue'
import LiftCurveChart from './LiftCurveChart.vue'

const setError = inject(SET_ERROR_KEY)

const props = defineProps({
  airfoil:  { type: Object, default: null },
  targetCl: { default: null },
})

// Shared y-domain: union of all coefficient data so both charts have identical y-axes.
// Computed from the full dataset regardless of legend toggles to keep axes stable.
const sharedYDomain = computed(() => {
  try {
    if (!props.airfoil) return [-1, 2]
    const polar = props.airfoil.polar
    const values = [
      ...polar.map(d => d.cl),
      ...polar.map(d => d.cd),
      ...polar.map(d => d.cm),
    ]
    if (props.targetCl != null && isFinite(props.targetCl)) values.push(props.targetCl)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.08 || 0.1
    return [min - pad, max + pad]
  } catch (e) { setError(e); return [-1, 2] }
})
</script>

<template>
  <div class="flex h-full w-full">
    <div
      v-if="!airfoil"
      class="flex-1 flex items-center justify-center text-slate-400 text-sm"
    >
      Select an airfoil to view its polar.
    </div>
    <template v-else>
      <LiftDragPolarChart
        :airfoil="airfoil"
        :target-cl="targetCl"
        :y-domain="sharedYDomain"
        class="flex-1 min-w-0"
      />
      <LiftCurveChart
        :airfoil="airfoil"
        :target-cl="targetCl"
        :y-domain="sharedYDomain"
        class="flex-1 min-w-0"
      />
    </template>
  </div>
</template>
