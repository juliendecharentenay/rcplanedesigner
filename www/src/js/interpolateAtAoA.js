/**
 * Interpolate drag and moment coefficients at a given angle of attack.
 * Since AoA is monotone in the polar data, no stall-handling is needed.
 *
 * @param {Array<{aoa: number, cd: number, cm: number}>} polar
 * @param {number|null} targetAoA - pre-computed AoA (e.g. from interpolateAoA)
 * @returns {{cd: number, cm: number} | null}
 */
export function interpolateAtAoA(polar, targetAoA) {
  if (!polar || polar.length < 2 || targetAoA == null) return null

  const sorted = [...polar].sort((a, b) => a.aoa - b.aoa)

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i], hi = sorted[i + 1]
    if (lo.aoa <= targetAoA && targetAoA <= hi.aoa) {
      const t = (targetAoA - lo.aoa) / (hi.aoa - lo.aoa)
      return {
        cd: lo.cd + t * (hi.cd - lo.cd),
        cm: lo.cm + t * (hi.cm - lo.cm),
      }
    }
  }

  return null
}
