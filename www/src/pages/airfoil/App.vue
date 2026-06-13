<script setup>
import { provide, readonly, ref, computed, watch, onMounted } from 'vue'
import airfoilData from '@/assets/airfoils.json'
import { AirfoilAnalyser } from '@/js/AirfoilAnalyser'
import { useError, SET_ERROR_KEY } from '@/composables/useError'
import { useFocusedParam, FOCUSED_PARAM_KEY } from '@/pages/index/composables/useFocusedParam'
import { APP_STATE_KEY } from '@/pages/index/composables/useAppState'
import { convertDistance, convertWingLoading, convertSpeed } from '@/units/units'
import { AIRFOIL_KEY } from './composables/useAirfoil'
import ErrorDialog from '@/components/ErrorDialog.vue'
import AppHeader from '@/pages/index/components/AppHeader.vue'
import ParameterPanel from './components/ParameterPanel.vue'
import TabView from './components/TabView.vue'
import PolarChart from './components/PolarChart.vue'
import AirfoilViewerTab from './components/AirfoilViewerTab.vue'
import ComparisonTab from './components/ComparisonTab.vue'

const { error, setError, clearError } = useError()
provide(SET_ERROR_KEY, setError)

const VALID_TABS = ['Polar', 'Airfoil Viewer', 'Comparison']
const activeTab = ref('Polar')

// — State —
// Each numeric field is stored in the current unit system (SI or Imperial).
const VALID_COMPARISON_METRICS = [
  'cruiseCl', 'cruiseAoa', 'cruiseCd', 'cruiseCm', 'cruiseDeltaAoA',
  'stallAoa', 'stallCl', 'stallCd', 'stallCm',
  'landingAoa', 'landingCl', 'landingCd', 'landingCm',
  'cruiseSpeed', 'stallSpeed', 'landingSpeed',
]

const state = ref({
  units:           'SI', // 'SI' | 'Imperial'
  siteAltitude:    0,    // metres (SI) or feet (Imperial)
  wingLoading:     0,    // g/sq.dm (SI) or oz/sq.ft (Imperial)
  cruisingSpeed:   0,    // m/s (SI) or mph (Imperial)
  selectedAirfoil: airfoilData[0].profileName,
  comparisonX:     'cruiseAoa',
  comparisonY:     'cruiseCl',
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

// — Airfoil —
const analysers = airfoilData.map(entry => new AirfoilAnalyser(entry))
const airfoilList = analysers.map(a => ({ value: a.profileName, label: a.profileName }))

const selectedAirfoilData = computed(() =>
  analysers.find(a => a.profileName === state.value.selectedAirfoil) ?? analysers[0]
)

function setSelectedAirfoil(profileName) {
  setState({ selectedAirfoil: profileName })
}

provide(AIRFOIL_KEY, { airfoilList, selectedAirfoilData, setSelectedAirfoil })

// — Target CL and Cruise AoA —
// Convert state to SI before calling getCruiseConditions (which expects SI units)
const targetCl = computed(() => {
  const s = state.value
  const wl  = s.units === 'Imperial' ? convertWingLoading(s.wingLoading,  'Imperial', 'SI') : s.wingLoading
  const spd = s.units === 'Imperial' ? convertSpeed(s.cruisingSpeed,      'Imperial', 'SI') : s.cruisingSpeed
  const alt = s.units === 'Imperial' ? convertDistance(s.siteAltitude,    'Imperial', 'SI') : s.siteAltitude
  return AirfoilAnalyser.convertSpeedToCl(wl, spd, alt)
})

// — URL sync —
// Params are stored in the current display unit system so URLs are human-readable.
// The 'units' param is always written first so consumers can interpret the others.
// Default values are omitted to keep URLs short.

onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.search)
    const units         = params.get('units') === 'Imperial' ? 'Imperial' : 'SI'
    const siteAltitude  = Number(params.get('altitude')    ?? 0) || 0
    const wingLoading   = Number(params.get('wingLoading') ?? 0) || 0
    const cruisingSpeed = Number(params.get('speed')       ?? 0) || 0
    const airfoilParam  = params.get('airfoil')
    const selectedAirfoil =
      analysers.find(a => a.profileName === airfoilParam)?.profileName ?? analysers[0].profileName
    const tabParam = params.get('tab')
    if (VALID_TABS.includes(tabParam)) activeTab.value = tabParam

    const cmpXParam = params.get('cmpX')
    const cmpYParam = params.get('cmpY')
    const comparisonX = VALID_COMPARISON_METRICS.includes(cmpXParam) ? cmpXParam : 'cruiseAoa'
    const comparisonY = VALID_COMPARISON_METRICS.includes(cmpYParam) ? cmpYParam : 'cruiseCl'

    state.value = { units, siteAltitude, wingLoading, cruisingSpeed, selectedAirfoil, comparisonX, comparisonY }
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
})

watch([state, activeTab], ([s, tab]) => {
  try {
    const params = new URLSearchParams()
    params.set('units', s.units)
    if (s.siteAltitude)  params.set('altitude',    s.siteAltitude)
    if (s.wingLoading)   params.set('wingLoading',  s.wingLoading)
    if (s.cruisingSpeed) params.set('speed',        s.cruisingSpeed)
    if (s.selectedAirfoil !== analysers[0].profileName)
      params.set('airfoil', s.selectedAirfoil)
    if (tab !== VALID_TABS[0]) params.set('tab', tab)
    if (s.comparisonX !== 'cruiseAoa') params.set('cmpX', s.comparisonX)
    if (s.comparisonY !== 'cruiseCl')  params.set('cmpY', s.comparisonY)
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
      <main class="flex-1 overflow-hidden flex flex-col">
        <TabView v-model="activeTab" :tabs="VALID_TABS" class="flex-1 flex flex-col">
          <template #Polar>
            <PolarChart :airfoil="selectedAirfoilData" :target-cl="targetCl" class="flex-1" />
          </template>
          <template #AirfoilViewer>
            <AirfoilViewerTab :target-cl="targetCl" class="flex-1" />
          </template>
          <template #Comparison>
            <ComparisonTab :target-cl="targetCl" class="flex-1" />
          </template>
        </TabView>
      </main>
    </div>
  </div>
</template>
