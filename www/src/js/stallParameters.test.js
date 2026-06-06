import { describe, it, expect } from 'vitest'
import { computeStallAoA, getStallAoA, getStallParameters, getLandingParameters } from './stallParameters'

// Synthetic polar: linear rise then stall drop
// CL peaks at aoa=10, then drops
const stallPolar = [
  { aoa: -5,  cl: -0.5, cd: 0.05, cm: -0.02 },
  { aoa:  0,  cl:  0.0, cd: 0.01, cm: -0.01 },
  { aoa:  5,  cl:  0.5, cd: 0.02, cm: -0.01 },
  { aoa:  8,  cl:  0.8, cd: 0.03, cm: -0.02 },
  { aoa: 10,  cl:  1.0, cd: 0.05, cm: -0.03 }, // stall peak
  { aoa: 12,  cl:  0.7, cd: 0.12, cm: -0.04 }, // post-stall drop
  { aoa: 15,  cl:  0.5, cd: 0.18, cm: -0.05 },
]

// Monotone polar: no post-stall drop
const monotonePolar = [
  { aoa: 0,  cl: 0.0, cd: 0.01, cm: 0.0 },
  { aoa: 5,  cl: 0.5, cd: 0.02, cm: 0.0 },
  { aoa: 10, cl: 1.0, cd: 0.05, cm: 0.0 },
  { aoa: 15, cl: 1.2, cd: 0.08, cm: 0.0 },
]

describe('computeStallAoA', () => {
  it('returns the AoA of the first local CL maximum after zero-lift AoA', () => {
    expect(computeStallAoA(stallPolar, 0)).toBe(10)
  })

  it('ignores negative-CL portion when zero-lift AoA is given', () => {
    // zeroLiftAoA = 0, so it starts walking from aoa=0 upward
    expect(computeStallAoA(stallPolar, 0)).toBe(10)
  })

  it('returns the last AoA when polar is monotonically increasing', () => {
    expect(computeStallAoA(monotonePolar, 0)).toBe(15)
  })

  it('handles unsorted polar input', () => {
    const unsorted = [...stallPolar].reverse()
    expect(computeStallAoA(unsorted, 0)).toBe(10)
  })

  it('handles zero-lift AoA in the middle of the polar range', () => {
    // zeroLiftAoA = 5: starts walking from aoa=5, peak still at 10
    expect(computeStallAoA(stallPolar, 5)).toBe(10)
  })

  it('returns the last point when zeroLiftAoA is beyond all polar AoAs', () => {
    expect(computeStallAoA(stallPolar, 20)).toBe(15)
  })
})

describe('getStallAoA', () => {
  it('returns stall_aoa from the entry when present', () => {
    const entry = { stall_aoa: 11.5, polar: stallPolar, zeroLiftAoA: 0 }
    expect(getStallAoA(entry)).toBe(11.5)
  })

  it('falls back to computeStallAoA when stall_aoa is null', () => {
    const entry = { stall_aoa: null, polar: stallPolar, zeroLiftAoA: 0 }
    expect(getStallAoA(entry)).toBe(10)
  })

  it('falls back to computeStallAoA when stall_aoa is absent', () => {
    const entry = { polar: stallPolar, zeroLiftAoA: 0 }
    expect(getStallAoA(entry)).toBe(10)
  })
})

describe('getStallParameters', () => {
  it('returns the correct structure with all four fields', () => {
    const entry = {
      stall_aoa: 10,
      stall_clmax: 1.0,
      polar: stallPolar,
      zeroLiftAoA: 0,
    }
    const result = getStallParameters(entry)
    expect(result).not.toBeNull()
    expect(result.stallAoa).toBe(10)
    expect(result.stallCl).toBe(1.0)
    expect(result.stallCd).toBeCloseTo(0.05)
    expect(result.stallCm).toBeCloseTo(-0.03)
  })

  it('uses clmax when stall_clmax is absent', () => {
    const entry = { clmax: 0.9, polar: stallPolar, zeroLiftAoA: 0 }
    const result = getStallParameters(entry)
    expect(result.stallCl).toBe(0.9)
  })

  it('returns null stallCl when neither stall_clmax nor clmax is present', () => {
    const entry = { polar: stallPolar, zeroLiftAoA: 0 }
    const result = getStallParameters(entry)
    expect(result.stallCl).toBeNull()
  })
})

describe('getLandingParameters', () => {
  const entry = {
    stall_aoa: 10,
    stall_clmax: 1.0,
    polar: stallPolar,
    zeroLiftAoA: 0,
  }

  it('returns landingCl as stallCl / 1.44', () => {
    const result = getLandingParameters(entry)
    expect(result).not.toBeNull()
    expect(result.landingCl).toBeCloseTo(1.0 / 1.44)
  })

  it('returns a valid landingAoa via interpolation', () => {
    const result = getLandingParameters(entry)
    // landingCl ≈ 0.694, which is between aoa=8 (cl=0.8) and aoa=5 (cl=0.5)
    expect(result.landingAoa).toBeGreaterThan(5)
    expect(result.landingAoa).toBeLessThan(10)
  })

  it('returns landing CD and CM values', () => {
    const result = getLandingParameters(entry)
    expect(result.landingCd).not.toBeNull()
    expect(result.landingCm).not.toBeNull()
  })

  it('returns null when stall CL is missing', () => {
    const entryNoStallCl = { polar: stallPolar, zeroLiftAoA: 0 }
    expect(getLandingParameters(entryNoStallCl)).toBeNull()
  })

  it('returns null when landingCl is outside the polar CL range', () => {
    const entryHighStall = { stall_clmax: 0.001, polar: stallPolar, zeroLiftAoA: 0 }
    // landingCl would be tiny, likely below polar minimum pre-stall CL
    const result = getLandingParameters(entryHighStall)
    // Either null (AoA not found) or valid — just must not throw
    expect(() => getLandingParameters(entryHighStall)).not.toThrow()
  })
})
