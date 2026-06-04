<script setup>
import { computed, inject } from 'vue'
import { APP_STATE_KEY } from '@/pages/index/composables/useAppState'
import { useUnits } from '@/pages/index/composables/useUnits'
import { FOCUSED_PARAM_KEY } from '@/pages/index/composables/useFocusedParam'
import { UNIT_SYSTEMS } from '@/units/units'
import BaseSelect from '@/components/BaseSelect.vue'
import BaseInput from '@/components/BaseInput.vue'
import ParameterRow from '@/pages/index/components/ParameterRow.vue'

const { getState, setState } = inject(APP_STATE_KEY)
const { distanceUnit, wingLoadingUnit, speedUnit, system } = useUnits()
const { register, setFocused, clearFocused } = inject(FOCUSED_PARAM_KEY)

register('units', {
  title: 'Unit System',
  body: 'Switches all measurements between SI (metric) and Imperial. Existing values are converted automatically when the system changes.',
})
register('siteAltitude', {
  title: 'Site Altitude',
  body: 'The elevation of your flying site above sea level. Higher altitude means thinner air, which reduces the lift and drag forces on the wing.',
})

const wingLoadingBody = computed(() =>
  system.value === 'Imperial'
    ? 'Weight per unit of wing area. Typical: 10 oz/sq.ft (glider), 15 oz/sq.ft (trainer), 20 oz/sq.ft (acrobatic).'
    : 'Weight per unit of wing area. Typical: 30.5 g/sq.dm (glider), 45.8 g/sq.dm (trainer), 61.0 g/sq.dm (acrobatic).'
)
register('wingLoading', { title: 'Wing Loading', body: wingLoadingBody })

const cruisingSpeedBody = computed(() =>
  system.value === 'Imperial'
    ? 'Typical level-flight cruise speed. Typical: 30–40 mph (trainer), 30–50 mph (glider), 50–80 mph (acrobatic).'
    : 'Typical level-flight cruise speed. Typical: 13–18 m/s (trainer), 13–22 m/s (glider), 22–36 m/s (acrobatic).'
)
register('cruisingSpeed', { title: 'Cruising Speed', body: cruisingSpeedBody })

const units = computed({
  get: () => getState().units,
  set: (v) => setState({ units: v }),
})

const siteAltitude = computed({
  get: () => getState().siteAltitude,
  set: (v) => setState({ siteAltitude: Number(v) }),
})

const wingLoading = computed({
  get: () => getState().wingLoading,
  set: (v) => setState({ wingLoading: Number(v) }),
})

const cruisingSpeed = computed({
  get: () => getState().cruisingSpeed,
  set: (v) => setState({ cruisingSpeed: Number(v) }),
})

function onPanelFocusOut(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) clearFocused()
}
</script>

<template>
  <aside
    class="absolute left-0 top-0 bottom-0 z-10 flex flex-col min-w-48 bg-white/90 backdrop-blur-sm border-r border-slate-200 shadow-xl rounded-br-xl"
    @focusout="onPanelFocusOut"
  >
    <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
      <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 4h12M2 8h8M2 12h10" stroke-linecap="round" />
      </svg>
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Parameters</span>
    </div>

    <div class="flex flex-col gap-4 px-4 py-4 overflow-y-auto">
      <div @focusin="setFocused('units')">
        <ParameterRow label="Units" input-id="param-units">
          <BaseSelect id="param-units" v-model="units" :options="UNIT_SYSTEMS" />
        </ParameterRow>
      </div>

      <div @focusin="setFocused('siteAltitude')">
        <ParameterRow label="Site Altitude" input-id="param-altitude">
          <BaseInput
            id="param-altitude"
            v-model="siteAltitude"
            type="number"
            :step="1"
            :suffix="distanceUnit"
          />
        </ParameterRow>
      </div>

      <div @focusin="setFocused('wingLoading')">
        <ParameterRow label="Wing Loading" input-id="param-wing-loading">
          <BaseInput
            id="param-wing-loading"
            v-model="wingLoading"
            type="number"
            :step="1"
            :suffix="wingLoadingUnit"
          />
        </ParameterRow>
      </div>

      <div @focusin="setFocused('cruisingSpeed')">
        <ParameterRow label="Cruising Speed" input-id="param-cruising-speed">
          <BaseInput
            id="param-cruising-speed"
            v-model="cruisingSpeed"
            type="number"
            :step="1"
            :suffix="speedUnit"
          />
        </ParameterRow>
      </div>
    </div>
  </aside>
</template>
