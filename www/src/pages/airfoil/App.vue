<script setup>
import { provide, readonly, ref, watch, onMounted } from 'vue'
import { useError, SET_ERROR_KEY } from '@/composables/useError'
import { useFocusedParam, FOCUSED_PARAM_KEY } from '@/pages/index/composables/useFocusedParam'
import { APP_STATE_KEY } from '@/pages/index/composables/useAppState'
import { convertDistance, convertWingLoading, convertSpeed } from '@/units/units'
import ErrorDialog from '@/components/ErrorDialog.vue'
import AppHeader from '@/pages/index/components/AppHeader.vue'
import ParameterPanel from './components/ParameterPanel.vue'

const { error, setError, clearError } = useError()
provide(SET_ERROR_KEY, setError)

// — State —
// Each numeric field is stored in the current unit system (SI or Imperial).
const state = ref({
  units:         'SI', // 'SI' | 'Imperial'
  siteAltitude:  0,    // metres (SI) or feet (Imperial)
  wingLoading:   0,    // g/sq.dm (SI) or oz/sq.ft (Imperial)
  cruisingSpeed: 0,    // m/s (SI) or mph (Imperial)
})

function getState() {
  return readonly(state.value)
}

function setState(partial) {
  try {
    const next = { ...state.value, ...partial }
    if ('units' in partial && partial.units !== state.value.units) {
      next.siteAltitude  = convertDistance(state.value.siteAltitude,  state.value.units, partial.units)
      next.wingLoading   = convertWingLoading(state.value.wingLoading, state.value.units, partial.units)
      next.cruisingSpeed = convertSpeed(state.value.cruisingSpeed,     state.value.units, partial.units)
    }
    state.value = next
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
}

provide(APP_STATE_KEY, { getState, setState })
provide(FOCUSED_PARAM_KEY, useFocusedParam())

// — URL sync —
// Params are stored in the current display unit system so URLs are human-readable.
// The 'units' param is always written first so consumers can interpret the others.

onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.search)
    const units        = params.get('units') === 'Imperial' ? 'Imperial' : 'SI'
    const siteAltitude = Number(params.get('altitude')    ?? 0) || 0
    const wingLoading  = Number(params.get('wingLoading') ?? 0) || 0
    const cruisingSpeed = Number(params.get('speed')      ?? 0) || 0
    // Set the numeric values directly in whichever unit system the URL declared.
    state.value = { units, siteAltitude, wingLoading, cruisingSpeed }
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
})

watch(state, (s) => {
  try {
    const params = new URLSearchParams()
    params.set('units', s.units)
    if (s.siteAltitude)  params.set('altitude',    s.siteAltitude)
    if (s.wingLoading)   params.set('wingLoading',  s.wingLoading)
    if (s.cruisingSpeed) params.set('speed',        s.cruisingSpeed)
    history.replaceState(null, '', '?' + params.toString())
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
}, { deep: true })
</script>

<template>
  <ErrorDialog :error="error" @dismiss="clearError" />

  <div class="flex flex-col h-screen overflow-hidden bg-slate-50">
    <AppHeader />
    <div class="relative flex flex-1 overflow-hidden">
      <ParameterPanel />
      <main class="flex-1 overflow-auto ml-48">
        <!-- airfoil detail content goes here -->
      </main>
    </div>
  </div>
</template>
