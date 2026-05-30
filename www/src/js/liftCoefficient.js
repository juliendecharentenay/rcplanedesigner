import { atmosphere } from './atmosphere'

// 1 g/sq.dm = 0.1 kg/m²; multiply by g to get N/m² (pressure = weight per area)
const G_SQDM_TO_N_M2 = 0.1 * 9.80665

/**
 * Cruise lift coefficient from wing loading, speed, and site altitude.
 *
 * @param {number} wingLoading_gSqdm - Wing loading in g/sq.dm (SI state unit)
 * @param {number} speed_ms          - Cruising speed in m/s (SI state unit)
 * @param {number} altitude_m        - Site altitude in metres
 * @returns {number|null}            - Dimensionless CL, or null if inputs are insufficient
 */
export function computeCruiseCL(wingLoading_gSqdm, speed_ms, altitude_m) {
  if (!wingLoading_gSqdm || !speed_ms) return null
  const { density } = atmosphere(altitude_m)
  return 2 * wingLoading_gSqdm * G_SQDM_TO_N_M2 / (density * speed_ms ** 2)
}
