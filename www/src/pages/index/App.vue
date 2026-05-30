<script setup>
import { provide } from 'vue'
import { useError, SET_ERROR_KEY } from '@/composables/useError'
import { useAppState, APP_STATE_KEY } from './composables/useAppState'
import { useFocusedParam, FOCUSED_PARAM_KEY } from './composables/useFocusedParam'
import { useAirfoils, AIRFOILS_KEY } from './composables/useAirfoils'
import ErrorDialog from '@/components/ErrorDialog.vue'
import AppHeader from './components/AppHeader.vue'
import ParameterPanel from './components/ParameterPanel.vue'
import AirfoilPanel from './components/AirfoilPanel.vue'
import SvgPanel from './components/SvgPanel.vue'
import ActionPanel from './components/ActionPanel.vue'

const { error, setError, clearError } = useError()
provide(SET_ERROR_KEY, setError)

const { getState, setState } = useAppState(setError)
provide(APP_STATE_KEY, { getState, setState })

provide(FOCUSED_PARAM_KEY, useFocusedParam())
provide(AIRFOILS_KEY, useAirfoils())
</script>

<template>
  <ErrorDialog :error="error" @dismiss="clearError" />

  <div class="flex flex-col h-screen overflow-hidden bg-slate-50">
    <AppHeader />
    <div class="relative flex flex-1 overflow-hidden">
      <ParameterPanel />
      <AirfoilPanel />
      <SvgPanel />
      <ActionPanel />
    </div>
  </div>
</template>
