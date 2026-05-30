import { describe, it, expect } from 'vitest'
import { interpolateAoA } from './interpolateAoA'

// Synthetic polar: CL rises linearly from -1.0 at -5° to +1.0 at +5°
const linearPolar = [
  { aoa: -5, cl: -1.0 },
  { aoa: -4, cl: -0.75 },
  { aoa: -3, cl: -0.5 },
  { aoa: -2, cl: -0.25 },
  { aoa: -1, cl:  0.0 },
  { aoa:  0, cl:  0.25 },
  { aoa:  1, cl:  0.5 },
  { aoa:  2, cl:  0.75 },
  { aoa:  3, cl:  1.0 },
]

describe('interpolateAoA — exact matches', () => {
  it('returns the exact aoa when CL matches a polar point', () => {
    expect(interpolateAoA(linearPolar, 0.5)).toBeCloseTo(1.0)
    expect(interpolateAoA(linearPolar, -1.0)).toBeCloseTo(-5.0)
    expect(interpolateAoA(linearPolar, 1.0)).toBeCloseTo(3.0)
  })
})

describe('interpolateAoA — interpolation', () => {
  it('interpolates midpoint between two polar entries', () => {
    // CL=0.625 sits halfway between aoa=1 (cl=0.5) and aoa=2 (cl=0.75)
    expect(interpolateAoA(linearPolar, 0.625)).toBeCloseTo(1.5)
  })

  it('interpolates at a quarter step', () => {
    // CL=0.3125 sits 1/4 of the way between aoa=0 (cl=0.25) and aoa=1 (cl=0.5)
    expect(interpolateAoA(linearPolar, 0.3125)).toBeCloseTo(0.25)
  })
})

describe('interpolateAoA — out of range', () => {
  it('returns null when CL is above the polar maximum', () => {
    expect(interpolateAoA(linearPolar, 1.1)).toBeNull()
  })

  it('returns null when CL is below the polar minimum', () => {
    expect(interpolateAoA(linearPolar, -1.1)).toBeNull()
  })

  it('returns null for an empty polar', () => {
    expect(interpolateAoA([], 0.5)).toBeNull()
  })
})

describe('interpolateAoA — polar with non-monotonic tail', () => {
  // Simulate stall: CL peaks then drops — target CL should resolve to pre-stall aoa
  const stallPolar = [
    { aoa: 0,  cl: 0.1 },
    { aoa: 2,  cl: 0.4 },
    { aoa: 4,  cl: 0.7 },
    { aoa: 6,  cl: 0.9 },
    { aoa: 8,  cl: 1.0 },  // stall peak
    { aoa: 10, cl: 0.7 },  // post-stall drop — same CL as aoa=4
    { aoa: 12, cl: 0.4 },
  ]

  it('returns the pre-stall aoa when CL appears on both sides of the peak', () => {
    // CL=0.7 exists at aoa=4 (pre-stall) and aoa=10 (post-stall)
    // should return the pre-stall value (~4)
    const result = interpolateAoA(stallPolar, 0.7)
    expect(result).toBeCloseTo(4.0)
  })
})
