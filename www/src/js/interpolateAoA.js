/**
 * Estimate angle of attack for a given lift coefficient via linear interpolation
 * on a polar curve. Uses only the pre-stall (ascending CL) portion so that a CL
 * value appearing on both sides of the stall peak resolves to the pre-stall AoA.
 *
 * @param {Array<{aoa: number, cl: number}>} polar
 * @param {number} targetCL
 * @returns {number|null}
 */
export function interpolateAoA(polar, targetCL) {
  if (polar.length < 2) return null

  const sorted = [...polar].sort((a, b) => a.aoa - b.aoa)

  // Walk only the ascending (pre-stall) slope: stop at the CL peak.
  let peakIndex = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].cl < 0) peakIndex = i
    else if (sorted[i].cl > sorted[peakIndex].cl) peakIndex = i
    else break
  }

  const ascending = sorted.slice(0, peakIndex + 1)

  for (let i = 0; i < ascending.length - 1; i++) {
    const lo = ascending[i]
    const hi = ascending[i + 1]
    if (lo.cl <= targetCL && targetCL <= hi.cl) {
      const t = (targetCL - lo.cl) / (hi.cl - lo.cl)
      return lo.aoa + t * (hi.aoa - lo.aoa)
    }
  }

  return null
}
