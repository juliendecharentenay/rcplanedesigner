<script setup>
import { computed, inject } from 'vue'
import { APP_STATE_KEY } from '../../composables/useAppState'
import { useUnits } from '../../composables/useUnits'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { FOCUSED_PARAM_KEY } from '../../composables/useFocusedParam.js'
import { WingAnalyser } from '@/js/WingAnalyser.js'
import { convertDistance, convertSpeed } from '@/units/units.js'
import ParameterRow from '@/components/ParameterRow.vue'
import BaseInput from '@/components/BaseInput.vue'

const setError = inject(SET_ERROR_KEY)
const { getState, setState } = inject(APP_STATE_KEY)
const { system, distanceUnit, areaUnit } = useUnits()
const { register, setFocused, clearFocused } = inject(FOCUSED_PARAM_KEY)

const wingSpanBody = computed(() =>
  system.value === 'Imperial'
    ? 'The full span of the wing from tip to tip, in feet. Longer spans increase aspect ratio and glide efficiency but can reduce structural stiffness and agility.'
    : 'The full span of the wing from tip to tip, in metres. Longer spans increase aspect ratio and glide efficiency but can reduce structural stiffness and agility.'
)
register('wingSpan', { title: 'Wing Span', body: wingSpanBody })

const rootChordBody = computed(() =>
  system.value === 'Imperial'
    ? 'The chord length at the wing root (centreline), in feet. A larger root chord increases lift and structural strength at the fuselage junction.'
    : 'The chord length at the wing root (centreline), in metres. A larger root chord increases lift and structural strength at the fuselage junction.'
)
register('rootChord', { title: 'Root Chord', body: rootChordBody })

const tipChordBody = computed(() =>
  system.value === 'Imperial'
    ? 'The chord length at the wing tip, in feet. Reducing the tip chord relative to the root (taper) improves efficiency by moving lift distribution toward elliptical.'
    : 'The chord length at the wing tip, in metres. Reducing the tip chord relative to the root (taper) improves efficiency by moving lift distribution toward elliptical.'
)
register('tipChord', { title: 'Tip Chord', body: tipChordBody })

register('sweepAngle', {
  title: 'Sweep Angle',
  body: 'The angle between the quarter-chord line and the lateral axis, in degrees. Sweep improves stability at higher speeds and affects the spanwise lift distribution.',
})

function onPanelFocusOut(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setTimeout(() => clearFocused(), 200)
  }
}

const emit = defineEmits(['navigate'])

const wingSpan = computed({
  get: () => { try { return getState().wingSpan } catch (e) { setError(e); return 0 } },
  set: (v) => setState({ wingSpan: Number(v) }),
})
const rootChord = computed({
  get: () => { try { return getState().rootChord } catch (e) { setError(e); return 0 } },
  set: (v) => setState({ rootChord: Number(v) }),
})
const tipChord = computed({
  get: () => { try { return getState().tipChord } catch (e) { setError(e); return 0 } },
  set: (v) => setState({ tipChord: Number(v) }),
})
const sweepAngle = computed({
  get: () => { try { return getState().sweepAngle } catch (e) { setError(e); return 0 } },
  set: (v) => setState({ sweepAngle: Number(v) }),
})

// ── WingAnalyser instance (SI values) ─────────────────────────────────────────

function siChord(displayValue) {
  return convertDistance(displayValue, system.value, 'SI')
}
function siSpeed(displayValue) {
  return convertSpeed(displayValue, system.value, 'SI')
}
function siAltitude(displayValue) {
  return convertDistance(displayValue, system.value, 'SI')
}

const analyser = computed(() => {
  try {
    const s = getState()
    return new WingAnalyser({
      wingSpan:   siChord(s.wingSpan),
      rootChord:  siChord(s.rootChord),
      tipChord:   siChord(s.tipChord),
      sweepAngle: s.sweepAngle,
    })
  } catch (e) { setError(e); return null }
})

const taperRatio = computed(() => {
  try {
    return analyser.value?.taperRatio ?? null
  } catch (e) { setError(e); return null }
})

const wingArea = computed(() => {
  try {
    return analyser.value?.wingArea ?? null
  } catch (e) { setError(e); return null }
})

const aspectRatio = computed(() => {
  try {
    return analyser.value?.aspectRatio ?? null
  } catch (e) { setError(e); return null }
})

const reynoldsNumbers = computed(() => {
  try {
    const s = getState()
    const speed_SI = siSpeed(s.cruisingSpeed)
    const alt_SI   = siAltitude(s.siteAltitude)
    if (!analyser.value || speed_SI <= 0) return { root: null, tip: null }
    return {
      root: analyser.value.rootReynolds(speed_SI, alt_SI),
      tip:  analyser.value.tipReynolds(speed_SI, alt_SI),
    }
  } catch (e) { setError(e); return { root: null, tip: null } }
})

const rootRe = computed(() => reynoldsNumbers.value.root)
const tipRe  = computed(() => reynoldsNumbers.value.tip)

function formatReynolds(re) {
  if (re === null || re <= 0 || !isFinite(re)) return '—'
  const exp       = Math.floor(Math.log10(re))
  const mantissa  = re / Math.pow(10, exp)
  const superMap  = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const superExp  = String(exp).split('').map(c => superMap[Number(c)]).join('')
  return `${mantissa.toPrecision(3)} × 10${superExp}`
}
</script>

<template>
  <div class="flex flex-col gap-4 px-4 py-4 overflow-y-auto" @focusout="onPanelFocusOut">
    <!-- Editable inputs -->
    <div @focusin="setFocused('wingSpan')">
      <ParameterRow label="Wing Span" input-id="wing-span">
        <BaseInput id="wing-span" v-model="wingSpan" type="number" :min="0" :step="0.01" :suffix="distanceUnit" />
      </ParameterRow>
    </div>

    <div @focusin="setFocused('rootChord')">
      <ParameterRow label="Root Chord" input-id="root-chord">
        <BaseInput id="root-chord" v-model="rootChord" type="number" :min="0" :step="0.001" :suffix="distanceUnit" />
      </ParameterRow>
    </div>

    <div @focusin="setFocused('tipChord')">
      <ParameterRow label="Tip Chord" input-id="tip-chord">
        <BaseInput id="tip-chord" v-model="tipChord" type="number" :min="0" :step="0.001" :suffix="distanceUnit" />
      </ParameterRow>
    </div>

    <div @focusin="setFocused('sweepAngle')">
      <ParameterRow label="Sweep Angle" input-id="sweep-angle">
        <BaseInput id="sweep-angle" v-model="sweepAngle" type="number" :min="0" :max="89" :step="0.1" suffix="°" />
      </ParameterRow>
    </div>

    <!-- Read-only outputs -->
    <div class="border-t border-slate-100 pt-3 flex flex-col gap-3">
      <ParameterRow label="Taper Ratio">
        <span class="text-sm font-mono text-slate-700">{{ taperRatio !== null ? taperRatio.toFixed(3) : '—' }}</span>
      </ParameterRow>

      <ParameterRow :label="`Wing Area (${areaUnit})`">
        <span class="text-sm font-mono text-slate-700">{{ wingArea !== null ? wingArea.toFixed(4) : '—' }}</span>
      </ParameterRow>

      <ParameterRow label="Aspect Ratio">
        <span class="text-sm font-mono text-slate-700">{{ aspectRatio !== null ? aspectRatio.toFixed(2) : '—' }}</span>
      </ParameterRow>

      <ParameterRow label="Root Re">
        <span class="text-sm font-mono text-slate-700">{{ formatReynolds(rootRe) }}</span>
      </ParameterRow>

      <ParameterRow label="Tip Re">
        <span class="text-sm font-mono text-slate-700">{{ formatReynolds(tipRe) }}</span>
      </ParameterRow>
    </div>

    <!-- Navigation -->
    <div class="pt-2 border-t border-slate-100">
      <button class="text-sm font-medium text-indigo-600 hover:bg-indigo-50 py-2 px-3 rounded"
              @click="emit('navigate', 'general')">
        ← General
      </button>
    </div>
  </div>
</template>
