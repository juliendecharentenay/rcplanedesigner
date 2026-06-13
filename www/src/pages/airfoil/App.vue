<script setup>
import { provide, ref, computed, watch, onMounted } from 'vue'
import airfoilData from '@/assets/airfoils.json'
import { AirfoilAnalyser } from '@/js/AirfoilAnalyser'
import { useError, SET_ERROR_KEY } from '@/composables/useError'
import { useFocusedParam, FOCUSED_PARAM_KEY } from '@/pages/index/composables/useFocusedParam'
import { APP_STATE_KEY } from '@/pages/index/composables/useAppState'
import { convertDistance, convertWingLoading, convertSpeed } from '@/units/units'
import { useAirfoilState, STATE_DEFAULTS } from './composables/useAirfoilState'
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

const URL_DEFAULTS = { ...STATE_DEFAULTS, activeTab: VALID_TABS[0] }

const { getState, setState } = useAirfoilState(setError)

provide(APP_STATE_KEY, { getState, setState })
provide(FOCUSED_PARAM_KEY, useFocusedParam())

// — Airfoil —
const analysers = airfoilData.map(entry => new AirfoilAnalyser(entry))
const airfoilList = analysers.map(a => ({ value: a.profileName, label: a.profileName }))

const selectedAirfoilData = computed(() =>
  analysers.find(a => a.profileName === getState().selectedAirfoil) ?? analysers[0]
)

function setSelectedAirfoil(profileName) {
  setState({ selectedAirfoil: profileName })
}

provide(AIRFOIL_KEY, { airfoilList, selectedAirfoilData, setSelectedAirfoil })

// — Target CL and Cruise AoA —
// Convert state to SI before calling getCruiseConditions (which expects SI units)
const targetCl = computed(() => {
  const s = getState()
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
      analysers.find(a => a.profileName === airfoilParam)?.profileName ?? URL_DEFAULTS.selectedAirfoil
    const tabParam = params.get('tab')
    if (VALID_TABS.includes(tabParam)) activeTab.value = tabParam

    const cmpXParam = params.get('cmpX')
    const cmpYParam = params.get('cmpY')
    const comparisonX = VALID_COMPARISON_METRICS.includes(cmpXParam) ? cmpXParam : URL_DEFAULTS.comparisonX
    const comparisonY = VALID_COMPARISON_METRICS.includes(cmpYParam) ? cmpYParam : URL_DEFAULTS.comparisonY

    setState({ units, siteAltitude, wingLoading, cruisingSpeed, selectedAirfoil, comparisonX, comparisonY })
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
})

watch([() => getState(), activeTab], ([s, tab]) => {
  try {
    const params = new URLSearchParams()
    params.set('units', s.units)
    if (s.siteAltitude)  params.set('altitude',    s.siteAltitude)
    if (s.wingLoading)   params.set('wingLoading',  s.wingLoading)
    if (s.cruisingSpeed) params.set('speed',        s.cruisingSpeed)
    if (s.selectedAirfoil !== URL_DEFAULTS.selectedAirfoil)
      params.set('airfoil', s.selectedAirfoil)
    if (tab !== URL_DEFAULTS.activeTab) params.set('tab', tab)
    if (s.comparisonX !== URL_DEFAULTS.comparisonX) params.set('cmpX', s.comparisonX)
    if (s.comparisonY !== URL_DEFAULTS.comparisonY) params.set('cmpY', s.comparisonY)
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
