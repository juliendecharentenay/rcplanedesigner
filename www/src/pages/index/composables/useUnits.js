import { computed, inject } from 'vue'
import { APP_STATE_KEY } from './useAppState'
import { getDistanceUnit, convertDistance, getWingLoadingUnit, convertWingLoading, getSpeedUnit, convertSpeed, getAreaUnit, convertArea } from '@/units/units'

export function useUnits() {
  const { getState } = inject(APP_STATE_KEY)
  const system = computed(() => getState().units)

  const distanceUnit = computed(() => getDistanceUnit(system.value))
  const wingLoadingUnit = computed(() => getWingLoadingUnit(system.value))
  const speedUnit = computed(() => getSpeedUnit(system.value))
  const areaUnit = computed(() => getAreaUnit(system.value))

  return {
    system,
    distanceUnit,
    convertDistance,
    wingLoadingUnit,
    convertWingLoading,
    speedUnit,
    convertSpeed,
    areaUnit,
    convertArea,
  }
}
