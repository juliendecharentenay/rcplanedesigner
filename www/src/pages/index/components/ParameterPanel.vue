<script setup>
import { computed, inject } from 'vue'
import { APP_STATE_KEY, PLANE_TYPES } from '../composables/useAppState'
import { useUnits } from '../composables/useUnits'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { UNIT_SYSTEMS } from '@/units/units'
import { AirfoilAnalyser } from '@/js/AirfoilAnalyser.js'
import BaseSelect from '@/components/BaseSelect.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseAnchor from '@/components/BaseAnchor.vue'
import ParameterRow from './ParameterRow.vue'
import {
  ArrowTopRightOnSquareIcon,
  } from '@heroicons/vue/24/outline'

const { getState, setState } = inject(APP_STATE_KEY)
const { distanceUnit, wingLoadingUnit, speedUnit, system, convertDistance, convertWingLoading, convertSpeed } = useUnits()
const { register, setFocused, clearFocused } = inject(FOCUSED_PARAM_KEY)
const { airfoils } = inject(AIRFOILS_KEY)

const selectedAirfoil = computed(() => {
  const profile = getState().airfoilProfile
  return profile ? airfoils.find((a) => a.profileName === profile) ?? null : null
})

// Co-locate each parameter's contextual help with its definition.
// When adding a new parameter, add a register() call here alongside its state binding.
register('airfoilProfile', {
  title: 'Airfoil Profile',
  body: 'The cross-sectional shape of the wing. Each profile has a different lift curve, stall behaviour, and drag. Select one to see its key characteristics. The table shows zero-lift angle of attack, stall angle, and maximum lift coefficient.',
})
register('planeType', {
  title: 'Plane Type',
  body: 'Sets the overall design profile. Trainers have stable, high-lift wings suited to beginners. Gliders prioritise low drag and long glide ratios. Acrobatic planes favour agility and neutral stability.',
})
register('units', {
  title: 'Unit System',
  body: 'Switches all measurements between SI (metric) and Imperial. Existing values are converted automatically when the system changes.',
})
register('siteAltitude', {
  title: 'Site Altitude',
  body: 'The elevation of your flying site above sea level. Higher altitude means thinner air, which reduces lift and propeller efficiency.',
})

const wingLoadingBody = computed(() =>
  system.value === 'Imperial'
    ? 'Weight per unit of wing area. Higher values mean faster, less floaty flight. Typical: 10 oz/sq.ft (glider), 15 oz/sq.ft (trainer), 20 oz/sq.ft (acrobatic).'
    : 'Weight per unit of wing area. Higher values mean faster, less floaty flight. Typical: 30.5 g/sq.dm (glider), 45.8 g/sq.dm (trainer), 61.0 g/sq.dm (acrobatic).'
)
register('wingLoading', { title: 'Wing Loading', body: wingLoadingBody })

const cruisingSpeedBody = computed(() =>
  system.value === 'Imperial'
    ? 'Typical level-flight cruise speed. Typical: 30–40 mph (trainer), 30–50 mph (glider), 50–80 mph (acrobatic).'
    : 'Typical level-flight cruise speed. Typical: 13–18 m/s (trainer), 13–22 m/s (glider), 22–36 m/s (acrobatic).'
)
register('cruisingSpeed', { title: 'Cruising Speed', body: cruisingSpeedBody })

register('cruiseCL', {
  title: 'Cruise Lift Coefficient',
  body: 'The lift coefficient the wing must produce at cruise. Derived from wing loading, cruising speed, and air density at site altitude. A value near 0.1–0.2 is typical for fast models; 0.4–0.8 for slow or heavily loaded ones.',
})

const cruiseConditions = computed(() => {
  if (!selectedAirfoil.value) return { cruiseCl: null, cruiseAoa: null }
  const { wingLoading, cruisingSpeed: speed, siteAltitude } = getState()
  const wl_SI    = convertWingLoading(wingLoading, system.value, 'SI')
  const speed_SI = convertSpeed(speed, system.value, 'SI')
  const alt_SI   = convertDistance(siteAltitude, system.value, 'SI')
  const cl = AirfoilAnalyser.convertSpeedToCl(wl_SI, speed_SI, alt_SI)
  return selectedAirfoil.value.getCruiseConditions(cl)
})

const cruiseCL = computed(() =>
  cruiseConditions.value.cruiseCl != null
    ? cruiseConditions.value.cruiseCl.toFixed(3)
    : '—'
)

const cruiseAoA = computed(() =>
  cruiseConditions.value.cruiseAoa != null
    ? cruiseConditions.value.cruiseAoa.toFixed(1)
    : null
)

const planeType = computed({
  get: () => getState().planeType,
  set: (v) => setState({ planeType: v }),
})

const units = computed({
  get: () => getState().units,
  set: (v) => setState({ units: v }),
})

const siteAltitude = computed({
  get: () => getState().siteAltitude,
  set: (v) => setState({ siteAltitude: v }),
})

const wingLoading = computed({
  get: () => getState().wingLoading,
  set: (v) => setState({ wingLoading: v }),
})

const cruisingSpeed = computed({
  get: () => getState().cruisingSpeed,
  set: (v) => setState({ cruisingSpeed: v }),
})

const airfoilOptions = computed(() => [
  { value: '', label: '— Select airfoil —' },
  ...airfoils.map((a) => ({ value: a.profileName, label: a.profileName })),
])

const airfoilProfile = computed({
  get: () => getState().airfoilProfile ?? '- Select airfoil -',
  set: (v) => setState({ airfoilProfile: v === '' ? null : v }),
})

const airfoil_link = computed(() => {
  const url = new URL('/airfoil.html', window.location.origin)
  url.searchParams.append('units', units.value)
  url.searchParams.append('altitude', siteAltitude.value)
  url.searchParams.append('wingLoading', wingLoading.value)
  url.searchParams.append('speed', cruisingSpeed.value)
  return url.href
});

function onPanelFocusOut(e) {
  // Only clear when focus leaves the panel entirely, not when moving between fields
  if (!e.currentTarget.contains(e.relatedTarget)) {
    // Timeout used to allow for processing of events from temporary panels
    setTimeout(() => clearFocused(), 200)
  }
}
</script>

<template>
  <aside
    class="absolute left-0 top-0 bottom-0 z-10 flex flex-col min-w-48 bg-white/90 backdrop-blur-sm border-r border-slate-200 shadow-xl"
    @focusout="onPanelFocusOut"
  >
    <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
      <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 4h12M2 8h8M2 12h10" stroke-linecap="round" />
      </svg>
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">Parameters</span>
    </div>

    <div class="flex flex-col gap-4 px-4 py-4 overflow-y-auto">
      <div @focusin="setFocused('planeType')">
        <ParameterRow label="Plane Type" input-id="param-plane-type">
          <BaseSelect id="param-plane-type" v-model="planeType" :options="PLANE_TYPES" />
        </ParameterRow>
      </div>

      <div @focusin="setFocused('units')">
        <ParameterRow label="Units" input-id="param-units">
          <BaseSelect id="param-units" v-model="units" :options="UNIT_SYSTEMS" />
        </ParameterRow>
      </div>

      <div class="relative">
        <div @focusin="setFocused('airfoilProfile')">
          <ParameterRow label="Airfoil Selection" input-id="param-airfoil-profile">
            <BaseAnchor id="param-airfoil-profile" v-model="airfoilProfile" />
          </ParameterRow>
        </div>
        <div class="absolute z-20 top-0 right-0 text-xs text-indigo-400 underline hover:text-indigo-500">
          <a target="_blank" :href="airfoil_link">
            <ArrowTopRightOnSquareIcon class="w-4 h-4" />
          </a>
        </div>
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

      <div class="flex gap-4" @focusin="setFocused('cruiseCL')">
        <ParameterRow label="Cruise C&#x2097;">
          <span class="text-sm font-mono text-slate-700">{{ cruiseCL }}</span>
        </ParameterRow>
        <ParameterRow v-if="cruiseAoA !== null" label="Cruise AoA @ ∞ AR">
          <span class="text-sm font-mono text-slate-700">{{ cruiseAoA }}°</span>
        </ParameterRow>
      </div>
    </div>
  </aside>
</template>
