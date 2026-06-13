<script setup>
import { ref, provide, onMounted, watch } from 'vue'
import { useError, SET_ERROR_KEY } from '@/composables/useError'
import { useAppState, APP_STATE_KEY, PLANE_TYPES, STATE_DEFAULTS } from './composables/useAppState'
import { useFocusedParam, FOCUSED_PARAM_KEY } from './composables/useFocusedParam'
import { useAirfoils, AIRFOILS_KEY } from './composables/useAirfoils'
import ErrorDialog from '@/components/ErrorDialog.vue'
import AppHeader from './components/AppHeader.vue'
import ParameterPanel from './components/ParameterPanel.vue'
import AirfoilPanel from './components/AirfoilPanel.vue'
import SvgPanel from './components/SvgPanel.vue'
import ActionPanel from './components/ActionPanel.vue'

const URL_DEFAULTS = {
  ...STATE_DEFAULTS,
  activePanel:    'general',
}

const { error, setError, clearError } = useError()
provide(SET_ERROR_KEY, setError)

const { getState, setState } = useAppState(setError)
provide(APP_STATE_KEY, { getState, setState })

provide(FOCUSED_PARAM_KEY, useFocusedParam())

const airfoils = useAirfoils()
provide(AIRFOILS_KEY, airfoils)

const activePanel = ref('general')  // 'general' | 'wing-definition'

onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.search)

    // 1. units first — required before interpreting any numeric field
    const unitsParam = params.get('units')
    const units = unitsParam === 'Imperial' ? 'Imperial' : 'SI'

    // 2. numeric fields — parseFloat + range guard
    function parseNum(key, min, max, fallback) {
      const raw = params.get(key)
      if (raw === null) return fallback
      const v = parseFloat(raw)
      return !isNaN(v) && v >= min && v <= max ? v : fallback
    }

    const siteAltitude  = parseNum('alt',   0,    9000, URL_DEFAULTS.siteAltitude)
    const wingLoading   = parseNum('wl',    1,    500,  URL_DEFAULTS.wingLoading)
    const cruisingSpeed = parseNum('spd',   1,    500,  URL_DEFAULTS.cruisingSpeed)
    const wingSpan      = parseNum('span',  0.01, 100,  URL_DEFAULTS.wingSpan)
    const rootChord     = parseNum('rc',    0.01, 20,   URL_DEFAULTS.rootChord)
    const tipChord      = parseNum('tc',    0,    20,   URL_DEFAULTS.tipChord)
    const sweepAngle    = parseNum('sweep', -89,  89,   URL_DEFAULTS.sweepAngle)

    // 3. planeType enum
    const typeParam = params.get('type')
    const planeType = PLANE_TYPES.map(p => p.value).includes(typeParam)
      ? typeParam
      : URL_DEFAULTS.planeType

    // 4. airfoilProfile — validate against known names
    const foilParam = params.get('foil')
    const airfoilProfile = foilParam !== null && airfoils.airfoils.some(a => a.profileName === foilParam)
      ? foilParam
      : URL_DEFAULTS.airfoilProfile

    // 5. activePanel enum
    const panelParam = params.get('panel')
    const newActivePanel = ['general', 'wing-definition'].includes(panelParam)
      ? panelParam
      : URL_DEFAULTS.activePanel

    // 6. set units first so conversion of existing defaults fires, then set parsed values
    //    (which are already in the target unit system) in a second call
    setState({ units })
    setState({ siteAltitude, wingLoading, cruisingSpeed, planeType, airfoilProfile,
               wingSpan, rootChord, tipChord, sweepAngle })
    activePanel.value = newActivePanel
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
})

watch([() => getState(), activePanel], ([s, panel]) => {
  try {
    const params = new URLSearchParams()

    if (s.units !== URL_DEFAULTS.units)
      params.set('units', s.units)
    if (s.siteAltitude !== URL_DEFAULTS.siteAltitude)
      params.set('alt', String(Math.round(s.siteAltitude)))
    if (s.wingLoading !== URL_DEFAULTS.wingLoading)
      params.set('wl', s.wingLoading.toFixed(2))
    if (s.cruisingSpeed !== URL_DEFAULTS.cruisingSpeed)
      params.set('spd', s.cruisingSpeed.toFixed(2))
    if (s.planeType !== URL_DEFAULTS.planeType)
      params.set('type', s.planeType)
    if (s.airfoilProfile !== URL_DEFAULTS.airfoilProfile)
      params.set('foil', s.airfoilProfile)
    if (s.wingSpan !== URL_DEFAULTS.wingSpan)
      params.set('span', s.wingSpan.toFixed(2))
    if (s.rootChord !== URL_DEFAULTS.rootChord)
      params.set('rc', s.rootChord.toFixed(2))
    if (s.tipChord !== URL_DEFAULTS.tipChord)
      params.set('tc', s.tipChord.toFixed(2))
    if (s.sweepAngle !== URL_DEFAULTS.sweepAngle)
      params.set('sweep', s.sweepAngle.toFixed(2))
    if (panel !== URL_DEFAULTS.activePanel)
      params.set('panel', panel)

    const qs = params.toString()
    history.replaceState(null, '', qs ? '?' + qs : window.location.pathname)
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
      <ParameterPanel :active-panel="activePanel" @navigate="activePanel = $event" />
      <AirfoilPanel />
      <SvgPanel :active-panel="activePanel" />
      <ActionPanel />
    </div>
  </div>
</template>
