import { describe, it, expect } from 'vitest'
import { computeCruiseDeltaAoA } from './cruiseDeltaAoA'

// Simple linear polar for testing
const polar = [
  { aoa: -4, cl: 0.0 },
  { aoa:  0, cl: 0.4 },
  { aoa:  4, cl: 0.8 },
  { aoa:  8, cl: 1.2 },
]

describe('computeCruiseDeltaAoA', () => {
  it('returns null when targetCl is null', () => {
    expect(computeCruiseDeltaAoA(polar, -4, null)).toBeNull()
  })

  it('returns null when targetCl is undefined', () => {
    expect(computeCruiseDeltaAoA(polar, -4, undefined)).toBeNull()
  })

  it('returns null when targetCl is out of the polar range', () => {
    expect(computeCruiseDeltaAoA(polar, -4, 2.0)).toBeNull()
  })

  it('returns cruiseAoA minus zeroLiftAoA', () => {
    // At CL=0.4 the polar gives cruiseAoA=0; zeroLiftAoA=-4 → delta = 0-(-4) = 4
    expect(computeCruiseDeltaAoA(polar, -4, 0.4)).toBeCloseTo(4, 5)
  })

  it('returns 0 when cruise AoA equals zeroLiftAoA', () => {
    // At CL=0.0 the polar gives cruiseAoA=-4; zeroLiftAoA=-4 → delta = 0
    expect(computeCruiseDeltaAoA(polar, -4, 0.0)).toBeCloseTo(0, 5)
  })

  it('works with a positive zeroLiftAoA', () => {
    // At CL=0.8 → cruiseAoA=4; zeroLiftAoA=2 → delta = 2
    expect(computeCruiseDeltaAoA(polar, 2, 0.8)).toBeCloseTo(2, 5)
  })

  it('works with a negative zeroLiftAoA (cambered airfoil)', () => {
    // At CL=0.8 → cruiseAoA=4; zeroLiftAoA=-3 → delta = 7
    expect(computeCruiseDeltaAoA(polar, -3, 0.8)).toBeCloseTo(7, 5)
  })
})
