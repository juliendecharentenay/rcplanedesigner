import { atmosphere } from './atmosphere'

const G_SQDM_TO_N_M2 = 0.1 * 9.80665

export function computeSpeedFromCL(wingLoading_gSqdm, cl, altitude_m) {
  if (!wingLoading_gSqdm || !cl) return null
  const { density } = atmosphere(altitude_m)
  return Math.sqrt(2 * wingLoading_gSqdm * G_SQDM_TO_N_M2 / (density * cl))
}

export function computeCruiseSpeed(wingLoading_gSqdm, cruiseCl, altitude_m) {
  return computeSpeedFromCL(wingLoading_gSqdm, cruiseCl, altitude_m)
}

export function computeStallSpeed(wingLoading_gSqdm, stallCl, altitude_m) {
  return computeSpeedFromCL(wingLoading_gSqdm, stallCl, altitude_m)
}

export function computeLandingSpeed(wingLoading_gSqdm, stallCl, altitude_m) {
  if (!stallCl) return null
  return computeSpeedFromCL(wingLoading_gSqdm, stallCl / (1.2**2), altitude_m)
}
