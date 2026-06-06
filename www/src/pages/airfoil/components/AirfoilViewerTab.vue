<script setup>
import { useAirfoil } from '../composables/useAirfoil.js'
import AirfoilProfileChart from './AirfoilProfileChart.vue'
import AirfoilCoordTable from './AirfoilCoordTable.vue'

const { selectedAirfoilData: airfoil } = useAirfoil()
</script>

<template>
  <div v-if="airfoil" class="flex flex-row h-full gap-4 p-4">
    <AirfoilProfileChart :airfoil="airfoil" class="flex-1 min-w-0" />
    <AirfoilCoordTable :airfoil="airfoil" class="w-52 shrink-0" />
  </div>
  <div v-else class="flex items-center justify-center h-full text-slate-400 text-sm">
    Select an airfoil to view its profile.
  </div>
</template>
