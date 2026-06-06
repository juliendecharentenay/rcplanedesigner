import { interpolateAoA } from './interpolateAoA'

export function computeCruiseDeltaAoA(polar, zeroLiftAoA, targetCl) {
  if (targetCl == null) return null
  const cruiseAoA = interpolateAoA(polar, targetCl)
  if (cruiseAoA == null) return null
  return cruiseAoA - zeroLiftAoA
}
