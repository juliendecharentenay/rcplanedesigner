import { AirfoilAnalyser } from '@/js/AirfoilAnalyser'
import airfoilsData from '@/assets/airfoils.json'

export const AIRFOILS_KEY = Symbol('airfoils')

const airfoils = airfoilsData.map(entry => new AirfoilAnalyser(entry))

export function useAirfoils() {
  return { airfoils }
}
