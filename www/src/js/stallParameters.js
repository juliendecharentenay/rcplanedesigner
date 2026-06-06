import { interpolateAoA } from './interpolateAoA'
import { interpolateAtAoA } from './interpolateAtAoA'

/**
 * Calculate stall AoA from polar as the first local CL maximum
 * at or above the zero-lift AoA.
 *
 * @param {Array<{aoa: number, cl: number}>} polar
 * @param {number} zeroLiftAoA
 * @returns {number}
 */
export function computeStallAoA(polar, zeroLiftAoA) {
  const sorted = [...polar].sort((a, b) => a.aoa - b.aoa)

  let startIdx = sorted.findIndex(p => p.aoa >= zeroLiftAoA)
  if (startIdx === -1) startIdx = sorted.length - 1

  for (let i = startIdx; i < sorted.length - 1; i++) {
    if (sorted[i + 1].cl < sorted[i].cl) return sorted[i].aoa
  }

  return sorted[sorted.length - 1].aoa
}

/**
 * Returns the stall AoA for an airfoil entry. Uses the `stall_aoa` field
 * if present, otherwise falls back to computing it from the polar.
 *
 * @param {{ stall_aoa?: number|null, polar: Array, zeroLiftAoA: number }} airfoilEntry
 * @returns {number}
 */
export function getStallAoA(airfoilEntry) {
  if (airfoilEntry.stall_aoa != null) return airfoilEntry.stall_aoa
  return computeStallAoA(airfoilEntry.polar, airfoilEntry.zeroLiftAoA)
}

/**
 * Returns stall parameters for an airfoil entry.
 *
 * @param {{ stall_aoa?: number, stall_clmax?: number, clmax?: number, polar: Array, zeroLiftAoA: number }} airfoilEntry
 * @returns {{ stallAoa: number, stallCl: number|null, stallCd: number|null, stallCm: number|null }}
 */
export function getStallParameters(airfoilEntry) {
  const stallAoa = getStallAoA(airfoilEntry)
  const stallCl = airfoilEntry.stall_clmax ?? airfoilEntry.clmax ?? null
  const at = interpolateAtAoA(airfoilEntry.polar, stallAoa)
  return {
    stallAoa,
    stallCl,
    stallCd: at?.cd ?? null,
    stallCm: at?.cm ?? null,
  }
}

/**
 * Returns landing parameters for an airfoil entry.
 * Landing speed = 1.2 × stall speed, so landing CL = stall CL / 1.44. (1.44 = 1.2^2)
 *
 * @param {{ stall_clmax?: number, clmax?: number, polar: Array, zeroLiftAoA: number }} airfoilEntry
 * @returns {{ landingCl: number, landingAoa: number, landingCd: number|null, landingCm: number|null }|null}
 */
export function getLandingParameters(airfoilEntry) {
  const stall = getStallParameters(airfoilEntry)
  if (stall.stallCl == null) return null

  const landingCl = stall.stallCl / (1.2**2)
  const landingAoa = interpolateAoA(airfoilEntry.polar, landingCl)
  if (landingAoa == null) return null

  const at = interpolateAtAoA(airfoilEntry.polar, landingAoa)
  return {
    landingCl,
    landingAoa,
    landingCd: at?.cd ?? null,
    landingCm: at?.cm ?? null,
  }
}
