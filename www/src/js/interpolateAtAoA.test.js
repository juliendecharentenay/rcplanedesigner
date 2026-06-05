import { describe, it, expect } from 'vitest'
import { interpolateAtAoA } from './interpolateAtAoA'

// Synthetic polar: AoA from 0° to 4°, with known cd and cm values
const polar = [
  { aoa: 0, cd: 0.010, cm: -0.020 },
  { aoa: 1, cd: 0.012, cm: -0.022 },
  { aoa: 2, cd: 0.018, cm: -0.025 },
  { aoa: 3, cd: 0.030, cm: -0.030 },
  { aoa: 4, cd: 0.050, cm: -0.040 },
]

describe('interpolateAtAoA — exact matches', () => {
  it('returns the exact cd and cm when AoA matches a polar point', () => {
    const result = interpolateAtAoA(polar, 0)
    expect(result.cd).toBeCloseTo(0.010)
    expect(result.cm).toBeCloseTo(-0.020)
  })

  it('returns values at the upper end of the range', () => {
    const result = interpolateAtAoA(polar, 4)
    expect(result.cd).toBeCloseTo(0.050)
    expect(result.cm).toBeCloseTo(-0.040)
  })
})

describe('interpolateAtAoA — interpolation', () => {
  it('interpolates midpoint between two polar entries', () => {
    // midpoint between aoa=0 (cd=0.010) and aoa=1 (cd=0.012) → cd=0.011
    const result = interpolateAtAoA(polar, 0.5)
    expect(result.cd).toBeCloseTo(0.011)
    expect(result.cm).toBeCloseTo(-0.021)
  })

  it('interpolates at a quarter step', () => {
    // 1/4 of the way from aoa=2 (cd=0.018) to aoa=3 (cd=0.030) → cd=0.021
    const result = interpolateAtAoA(polar, 2.25)
    expect(result.cd).toBeCloseTo(0.021)
  })
})

describe('interpolateAtAoA — out of range', () => {
  it('returns null when AoA is below the polar minimum', () => {
    expect(interpolateAtAoA(polar, -1)).toBeNull()
  })

  it('returns null when AoA is above the polar maximum', () => {
    expect(interpolateAtAoA(polar, 5)).toBeNull()
  })
})

describe('interpolateAtAoA — invalid inputs', () => {
  it('returns null for a single-entry polar', () => {
    expect(interpolateAtAoA([{ aoa: 0, cd: 0.01, cm: -0.02 }], 0)).toBeNull()
  })

  it('returns null when targetAoA is null', () => {
    expect(interpolateAtAoA(polar, null)).toBeNull()
  })

  it('returns null for an empty polar', () => {
    expect(interpolateAtAoA([], 1)).toBeNull()
  })

  it('returns null for a null polar', () => {
    expect(interpolateAtAoA(null, 1)).toBeNull()
  })
})
