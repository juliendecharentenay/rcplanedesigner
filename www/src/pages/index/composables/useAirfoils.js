import airfoilsData from '@/assets/airfoils.json'

export const AIRFOILS_KEY = Symbol('airfoils')

export function useAirfoils() {
  return { airfoils: airfoilsData }
}
