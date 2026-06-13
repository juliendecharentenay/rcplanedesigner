import { readonly, ref } from 'vue'
import { convertDistance, convertWingLoading, convertSpeed } from '@/units/units'

export const APP_STATE_KEY = Symbol('appState')

export const PLANE_TYPES = [
  { value: 'Trainer',   label: 'Trainer' },
  { value: 'Glider',    label: 'Glider' },
  { value: 'Acrobatic', label: 'Acrobatic' },
]

export const STATE_DEFAULTS = {
    units:          'SI',      // 'SI' | 'Imperial'
    siteAltitude:   0,         // metres (SI) or feet (Imperial)
    wingLoading:    45,        // g/sq.dm (SI) or oz/sq.ft (Imperial)
    cruisingSpeed:  15,        // m/s (SI) or mph (Imperial)
    planeType:      'Trainer', // 'Trainer' | 'Glider' | 'Acrobatic'
    airfoilProfile: null,      // profileName string or null (no selection)
    wingSpan:       1.5,       // metres (SI) or feet (Imperial)
    rootChord:      0.3,       // metres (SI) or feet (Imperial)
    tipChord:       0.2,       // metres (SI) or feet (Imperial)
    sweepAngle:     0,         // degrees (no unit conversion)
}

/**
 * @param {(err: Error) => void} onError - called when a state operation fails
 */
export function useAppState(onError) {
  // — State —
  //
  // Each field that carries a physical measurement must declare its unit system
  // in a comment (e.g. "metres (SI) or feet (Imperial)").
  //
  // When adding a new unit-dependent field:
  //   1. Add the field below with its SI default and a unit comment.
  //   2. Add the appropriate converter import from @/units/units.js.
  //   3. Inside the `if ('units' in partial …)` block in setState, add a line
  //      that re-converts the field using the same pattern as siteAltitude:
  //
  //        next.myField = convertXxx(state.value.myField, state.value.units, partial.units)
  //
  //      This keeps the numeric value consistent with the selected unit system
  //      in a single atomic state update.
  const state = ref({...STATE_DEFAULTS})

  // — Accessors —

  function getState() {
    return readonly(state.value)
  }

  // — Modifiers —

  function setState(partial) {
    try {
      const next = { ...state.value, ...partial }
      if ('units' in partial && partial.units !== state.value.units) {
        // Re-convert every unit-dependent field when the unit system changes.
        // Add a line here for each new physical measurement field (see note above).
        next.siteAltitude = convertDistance(state.value.siteAltitude, state.value.units, partial.units)
        next.wingLoading   = convertWingLoading(state.value.wingLoading, state.value.units, partial.units)
        next.cruisingSpeed = convertSpeed(state.value.cruisingSpeed, state.value.units, partial.units)
        next.wingSpan      = convertDistance(state.value.wingSpan,   state.value.units, partial.units)
        next.rootChord     = convertDistance(state.value.rootChord,  state.value.units, partial.units)
        next.tipChord      = convertDistance(state.value.tipChord,   state.value.units, partial.units)
      }
      state.value = next
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  return { getState, setState }
}
