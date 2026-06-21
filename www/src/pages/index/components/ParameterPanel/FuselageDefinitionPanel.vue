<script setup>
import { computed, inject } from 'vue'
import { APP_STATE_KEY } from '../../composables/useAppState'
import { AIRFOILS_KEY } from '../../composables/useAirfoils'
import { useUnits } from '../../composables/useUnits'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { FOCUSED_PARAM_KEY } from '../../composables/useFocusedParam.js'
import { WingAnalyser } from '@/js/WingAnalyser.js'
import { FuselageAnalyser } from '@/js/FuselageAnalyser.js'
import { convertDistance, convertArea } from '@/units/units.js'
import ParameterRow from '@/components/ParameterRow.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseSelect from '@/components/BaseSelect.vue'

const setError = inject(SET_ERROR_KEY)
const { getState, setState } = inject(APP_STATE_KEY)
const { system, distanceUnit, areaUnit } = useUnits()
const { register, setFocused, clearFocused } = inject(FOCUSED_PARAM_KEY)
const { airfoils } = inject(AIRFOILS_KEY)

// ── Focused parameter help ────────────────────────────────────────────────────

const fuselageWidthBody = computed(() =>
  system.value === 'Imperial'
    ? 'Width of the fuselage at the wing station, in feet. This is the widest point of the fuselage cross-section where the wing attaches.'
    : 'Width of the fuselage at the wing station, in metres. This is the widest point of the fuselage cross-section where the wing attaches.'
)
register('fuselageWidth', { title: 'Fuselage Width', body: fuselageWidthBody })

const frontFuselageBody = computed(() =>
  system.value === 'Imperial'
    ? 'Distance from the wing ¼ MAC to the front of the fuselage (just aft of the propeller), in feet. Defaults to 2× MAC.'
    : 'Distance from the wing ¼ MAC to the front of the fuselage (just aft of the propeller), in metres. Defaults to 2× MAC.'
)
register('frontFuselage', { title: 'Front Fuselage Length', body: frontFuselageBody })

const rearFuselageBody = computed(() =>
  system.value === 'Imperial'
    ? 'Distance from the wing ¼ MAC to the tail attachment point, in feet. Defaults to 3× MAC.'
    : 'Distance from the wing ¼ MAC to the tail attachment point, in metres. Defaults to 3× MAC.'
)
register('rearFuselage', { title: 'Rear Fuselage Length', body: rearFuselageBody })

register('tailSpan', {
  title: 'Tail Span',
  body: 'Full span of the horizontal tail from tip to tip. Defaults to a value that gives tail area = 20% of wing area at aspect ratio 5.',
})

register('tailChord', {
  title: 'Tail Chord',
  body: 'Chord length of the horizontal tail. The tail has a rectangular planform (no taper, no sweep). Defaults to tailArea / tailSpan.',
})

register('tailAirfoil', {
  title: 'Tail Airfoil',
  body: 'Airfoil section used for the horizontal tail. Eppler 168 is a common symmetric section suited to tail surfaces.',
})

function onPanelFocusOut(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setTimeout(() => clearFocused(), 200)
  }
}

const emit = defineEmits(['navigate'])

// ── WingAnalyser (SI) ─────────────────────────────────────────────────────────

const wingAnalyser = computed(() => {
  try {
    const s = getState()
    return new WingAnalyser({
      wingSpan:   convertDistance(s.wingSpan,   system.value, 'SI'),
      rootChord:  convertDistance(s.rootChord,  system.value, 'SI'),
      tipChord:   convertDistance(s.tipChord,   system.value, 'SI'),
      sweepAngle: s.sweepAngle,
    })
  } catch (e) { setError(e); return null }
})

// ── Effective (resolved) values in SI ────────────────────────────────────────

const effectiveFrontLengthSI = computed(() => {
  try {
    const s = getState()
    if (s.frontFuselage > 0) return convertDistance(s.frontFuselage, system.value, 'SI')
    return FuselageAnalyser.defaultFrontLength(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

const effectiveRearLengthSI = computed(() => {
  try {
    const s = getState()
    if (s.rearFuselage > 0) return convertDistance(s.rearFuselage, system.value, 'SI')
    return FuselageAnalyser.defaultRearLength(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

const effectiveTailSpanSI = computed(() => {
  try {
    const s = getState()
    if (s.tailSpan > 0) return convertDistance(s.tailSpan, system.value, 'SI')
    return FuselageAnalyser.defaultTailSpan(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

const effectiveTailChordSI = computed(() => {
  try {
    const s = getState()
    if (s.tailChord > 0) return convertDistance(s.tailChord, system.value, 'SI')
    return FuselageAnalyser.defaultTailChord(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

// ── FuselageAnalyser instance ─────────────────────────────────────────────────

const fuselageAnalyser = computed(() => {
  try {
    const s = getState()
    const fl = effectiveFrontLengthSI.value
    const rl = effectiveRearLengthSI.value
    const ts = effectiveTailSpanSI.value
    const tc = effectiveTailChordSI.value
    if (fl == null || rl == null || ts == null || tc == null) return null
    return new FuselageAnalyser({
      wingAnalyser:  wingAnalyser.value,
      fuselageWidth: convertDistance(s.fuselageWidth, system.value, 'SI'),
      frontLength:   fl,
      rearLength:    rl,
      tailSpan:      ts,
      tailChord:     tc,
    })
  } catch (e) { setError(e); return null }
})

// ── Editable input bindings ───────────────────────────────────────────────────

const fuselageWidth = computed({
  get: () => { try { return getState().fuselageWidth } catch (e) { setError(e); return 0 } },
  set: (v) => setState({ fuselageWidth: Number(v) }),
})

// For sentinel fields: display the resolved effective value (in display units).
// When the user types, store the typed value directly.

const frontFuselageDisplay = computed({
  get: () => {
    try {
      const si = effectiveFrontLengthSI.value
      if (si == null) return ''
      return Number(convertDistance(si, 'SI', system.value).toFixed(4))
    } catch (e) { setError(e); return '' }
  },
  set: (v) => setState({ frontFuselage: Number(v) }),
})

const rearFuselageDisplay = computed({
  get: () => {
    try {
      const si = effectiveRearLengthSI.value
      if (si == null) return ''
      return Number(convertDistance(si, 'SI', system.value).toFixed(4))
    } catch (e) { setError(e); return '' }
  },
  set: (v) => setState({ rearFuselage: Number(v) }),
})

const tailSpanDisplay = computed({
  get: () => {
    try {
      const si = effectiveTailSpanSI.value
      if (si == null) return ''
      return Number(convertDistance(si, 'SI', system.value).toFixed(4))
    } catch (e) { setError(e); return '' }
  },
  set: (v) => setState({ tailSpan: Number(v) }),
})

const tailChordDisplay = computed({
  get: () => {
    try {
      const si = effectiveTailChordSI.value
      if (si == null) return ''
      return Number(convertDistance(si, 'SI', system.value).toFixed(4))
    } catch (e) { setError(e); return '' }
  },
  set: (v) => setState({ tailChord: Number(v) }),
})

const tailAirfoil = computed({
  get: () => { try { return getState().tailAirfoil } catch (e) { setError(e); return '' } },
  set: (v) => setState({ tailAirfoil: v }),
})

// Airfoil dropdown options
const airfoilOptions = computed(() => {
  try {
    return airfoils.map(a => ({ value: a.profileName, label: a.profileName }))
  } catch (e) { setError(e); return [] }
})

// ── Computed outputs ──────────────────────────────────────────────────────────

const tailArea = computed(() => {
  try {
    const fa = fuselageAnalyser.value
    if (!fa) return null
    const areaSI = fa.tailArea
    if (areaSI == null) return null
    return convertArea(areaSI, 'SI', system.value)
  } catch (e) { setError(e); return null }
})

const tailMomentArm = computed(() => {
  try {
    const fa = fuselageAnalyser.value
    if (!fa) return null
    const armSI = fa.tailMomentArm
    if (armSI == null) return null
    return convertDistance(armSI, 'SI', system.value)
  } catch (e) { setError(e); return null }
})
</script>

<template>
  <div class="flex flex-col gap-4 px-4 py-4 overflow-y-auto" @focusout="onPanelFocusOut">
    <!-- Editable inputs -->

    <div @focusin="setFocused('fuselageWidth')">
      <ParameterRow label="Width at wing" input-id="fuselage-width">
        <BaseInput id="fuselage-width" v-model="fuselageWidth" type="number" :min="0" :step="0.01" :suffix="distanceUnit" />
      </ParameterRow>
    </div>

    <div @focusin="setFocused('frontFuselage')">
      <ParameterRow label="Front fuselage" input-id="front-fuselage">
        <BaseInput id="front-fuselage" v-model="frontFuselageDisplay" type="number" :min="0" :step="0.01" :suffix="distanceUnit" />
      </ParameterRow>
    </div>

    <div @focusin="setFocused('rearFuselage')">
      <ParameterRow label="Rear fuselage" input-id="rear-fuselage">
        <BaseInput id="rear-fuselage" v-model="rearFuselageDisplay" type="number" :min="0" :step="0.01" :suffix="distanceUnit" />
      </ParameterRow>
    </div>

    <div class="border-t border-slate-100 pt-3 flex flex-col gap-3">
      <div @focusin="setFocused('tailSpan')">
        <ParameterRow label="Tail span" input-id="tail-span">
          <BaseInput id="tail-span" v-model="tailSpanDisplay" type="number" :min="0" :step="0.01" :suffix="distanceUnit" />
        </ParameterRow>
      </div>

      <div @focusin="setFocused('tailChord')">
        <ParameterRow label="Tail chord" input-id="tail-chord">
          <BaseInput id="tail-chord" v-model="tailChordDisplay" type="number" :min="0" :step="0.001" :suffix="distanceUnit" />
        </ParameterRow>
      </div>

      <div @focusin="setFocused('tailAirfoil')">
        <ParameterRow label="Tail airfoil" input-id="tail-airfoil">
          <BaseSelect id="tail-airfoil" v-model="tailAirfoil" :options="airfoilOptions" />
        </ParameterRow>
      </div>
    </div>

    <!-- Read-only outputs -->
    <div class="border-t border-slate-100 pt-3 flex flex-col gap-3">
      <ParameterRow :label="`Tail area (${areaUnit})`">
        <span class="text-sm font-mono text-slate-700">{{ tailArea !== null ? tailArea.toFixed(4) : '—' }}</span>
      </ParameterRow>

      <ParameterRow :label="`Tail moment arm (${distanceUnit})`">
        <span class="text-sm font-mono text-slate-700">{{ tailMomentArm !== null ? tailMomentArm.toFixed(3) : '—' }}</span>
      </ParameterRow>
    </div>

    <!-- Navigation -->
    <div class="pt-2 border-t border-slate-100">
      <button
        class="text-sm font-medium text-indigo-600 hover:bg-indigo-50 py-2 px-3 rounded"
        @click="emit('navigate', 'wing-definition')"
      >
        ← Wing Definition
      </button>
    </div>
  </div>
</template>
