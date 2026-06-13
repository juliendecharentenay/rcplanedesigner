import { readonly, ref } from 'vue'
import airfoilData from '@/assets/airfoils.json'
import { convertDistance, convertWingLoading, convertSpeed } from '@/units/units'

export const STATE_DEFAULTS = {
  units:           'SI',                       // 'SI' | 'Imperial'
  siteAltitude:    0,                          // metres (SI) or feet (Imperial)
  wingLoading:     0,                          // g/sq.dm (SI) or oz/sq.ft (Imperial)
  cruisingSpeed:   0,                          // m/s (SI) or mph (Imperial)
  selectedAirfoil: airfoilData[0].profileName,
  comparisonX:     'cruiseAoa',
  comparisonY:     'cruiseCl',
}

/**
 * @param {(err: Error) => void} onError - called when a state operation fails
 */
export function useAirfoilState(onError) {
  const state = ref({ ...STATE_DEFAULTS })

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
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  return { getState, setState }
}
