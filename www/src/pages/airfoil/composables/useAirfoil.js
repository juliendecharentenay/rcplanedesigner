import { inject } from 'vue'

export const AIRFOIL_KEY = Symbol('airfoil')

export function useAirfoil() {
  return inject(AIRFOIL_KEY)
}
