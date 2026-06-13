import { describe, it, expect } from 'vitest'
import { AirfoilAnalyser } from './AirfoilAnalyser'

const mockEntry = {
  profileName: 'Test Airfoil',
  zeroLiftAoA: -2,
  clmax: 1.4,
  stall_clmax: 1.5,
  stall_aoa: 14,
  polar: [
    { aoa: -4, cl: -0.2, cd: 0.012, cm: -0.04 },
    { aoa: -2, cl:  0.0, cd: 0.010, cm: -0.04 },
    { aoa:  0, cl:  0.2, cd: 0.011, cm: -0.04 },
    { aoa:  4, cl:  0.6, cd: 0.014, cm: -0.05 },
    { aoa:  8, cl:  1.0, cd: 0.020, cm: -0.06 },
    { aoa: 12, cl:  1.4, cd: 0.035, cm: -0.07 },
    { aoa: 14, cl:  1.5, cd: 0.050, cm: -0.08 },
    { aoa: 16, cl:  1.3, cd: 0.090, cm: -0.10 },
  ],
}

// Group 1 — Construction (FR-01 to FR-03, AC-01)
describe('AirfoilAnalyser construction', () => {
  it('AC-01: constructs without throwing given a valid airfoil entry', () => {
    expect(() => new AirfoilAnalyser(mockEntry)).not.toThrow()
  })
})

// Group 2 — Zero-lift (FR-04 to FR-06, AC-02 to AC-04)
describe('AirfoilAnalyser zero-lift properties', () => {
  const analyser = new AirfoilAnalyser(mockEntry)

  it('AC-02: zeroLiftAoA equals mockEntry.zeroLiftAoA (-2)', () => {
    expect(analyser.zeroLiftAoA).toBe(-2)
  })

  it('AC-03: zeroLiftCl equals 0', () => {
    expect(analyser.zeroLiftCl).toBe(0)
  })

  it('AC-04a: zeroLiftCd is a number interpolated at aoa=-2 (expected 0.010)', () => {
    expect(typeof analyser.zeroLiftCd).toBe('number')
    expect(analyser.zeroLiftCd).toBeCloseTo(0.010, 5)
  })

  it('AC-04b: zeroLiftCm is a number interpolated at aoa=-2 (expected -0.04)', () => {
    expect(typeof analyser.zeroLiftCm).toBe('number')
    expect(analyser.zeroLiftCm).toBeCloseTo(-0.04, 5)
  })
})

// Group 3 — Stall (FR-07 to FR-09, AC-05 to AC-07)
describe('AirfoilAnalyser stall properties', () => {
  it('AC-05: stallAoa equals 14 when stall_aoa field is provided', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(analyser.stallAoa).toBe(14)
  })

  it('AC-05b: stallAoa is computed from polar when stall_aoa is null', () => {
    const entry = { ...mockEntry, stall_aoa: null }
    const analyser = new AirfoilAnalyser(entry)
    // polar peak is at aoa=14 (cl=1.5), drops at aoa=16 (cl=1.3)
    expect(analyser.stallAoa).toBe(14)
  })

  it('AC-06a: stallCl equals 1.5 from stall_clmax', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(analyser.stallCl).toBe(1.5)
  })

  it('AC-06b: stallCl falls back to clmax when stall_clmax is absent', () => {
    const entry = { ...mockEntry, stall_clmax: undefined }
    const analyser = new AirfoilAnalyser(entry)
    expect(analyser.stallCl).toBe(1.4)
  })

  it('AC-07a: stallCd is a number interpolated at stallAoa', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(typeof analyser.stallCd).toBe('number')
    expect(analyser.stallCd).toBeCloseTo(0.050, 5)
  })

  it('AC-07b: stallCm is a number interpolated at stallAoa', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(typeof analyser.stallCm).toBe('number')
    expect(analyser.stallCm).toBeCloseTo(-0.08, 5)
  })
})

// Group 4 — Landing (FR-10 to FR-13, AC-08 to AC-11)
describe('AirfoilAnalyser landing properties', () => {
  it('AC-08: landingCl equals stallCl / 1.44', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(analyser.landingCl).toBeCloseTo(1.5 / 1.44, 10)
  })

  it('AC-09: landingAoa is a number within the polar AoA range', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(typeof analyser.landingAoa).toBe('number')
    expect(analyser.landingAoa).toBeGreaterThanOrEqual(-4)
    expect(analyser.landingAoa).toBeLessThanOrEqual(16)
  })

  it('AC-10: landingCd is a number', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(typeof analyser.landingCd).toBe('number')
  })

  it('AC-11a: landingCm is a number', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(typeof analyser.landingCm).toBe('number')
  })

  it('AC-11b: all landing properties are null when stallCl is null (no stall_clmax, no clmax)', () => {
    const entry = { ...mockEntry, stall_clmax: undefined, clmax: undefined }
    const analyser = new AirfoilAnalyser(entry)
    expect(analyser.landingCl).toBeNull()
    expect(analyser.landingAoa).toBeNull()
    expect(analyser.landingCd).toBeNull()
    expect(analyser.landingCm).toBeNull()
  })
})

// Group 5 — Cruise (FR-14 to FR-18, AC-12 to AC-14)
describe('AirfoilAnalyser getCruiseConditions', () => {
  const analyser = new AirfoilAnalyser(mockEntry)

  it('AC-12: returns numeric cruiseCl, cruiseAoa, cruiseCd, cruiseCm for valid inputs', () => {
    // wing loading ~5 g/sq.dm, speed 15 m/s, altitude 0 m => moderate CL
    const cl = AirfoilAnalyser.convertSpeedToCl(5, 15, 0)
    const result = analyser.getCruiseConditions(cl)
    expect(typeof result.cruiseCl).toBe('number')
    expect(typeof result.cruiseAoa).toBe('number')
    expect(typeof result.cruiseCd).toBe('number')
    expect(typeof result.cruiseCm).toBe('number')
  })

  it('AC-13a: returns all-null object when wingLoading is 0', () => {
    const cl = AirfoilAnalyser.convertSpeedToCl(0, 15, 0)
    const result = analyser.getCruiseConditions(cl)
    expect(result.cruiseCl).toBeNull()
    expect(result.cruiseAoa).toBeNull()
    expect(result.cruiseCd).toBeNull()
    expect(result.cruiseCm).toBeNull()
  })

  it('AC-13b: returns all-null object when speed is 0', () => {
    const cl = AirfoilAnalyser.convertSpeedToCl(5, 0, 0)
    const result = analyser.getCruiseConditions(cl)
    expect(result.cruiseCl).toBeNull()
    expect(result.cruiseAoa).toBeNull()
    expect(result.cruiseCd).toBeNull()
    expect(result.cruiseCm).toBeNull()
  })

  it('AC-14: returns all-null object when required CL exceeds polar range', () => {
    // Very high wing loading and very low speed => CL beyond stall
    const cl = AirfoilAnalyser.convertSpeedToCl(1000, 1, 0)
    const result = analyser.getCruiseConditions(cl)
    expect(result.cruiseCl).toBeNull()
    expect(result.cruiseAoa).toBeNull()
    expect(result.cruiseCd).toBeNull()
    expect(result.cruiseCm).toBeNull()
  })

  it('getCruiseConditions always returns an object (never null itself)', () => {
    const cl = AirfoilAnalyser.convertSpeedToCl(0, 0, 0)
    const result = analyser.getCruiseConditions(cl)
    expect(result).toBeTypeOf('object')
    expect(result).not.toBeNull()
  })
})

// Group 6 — Polar and metadata (FR-19 to FR-21, AC-15 to AC-16)
describe('AirfoilAnalyser polar and metadata', () => {
  it('AC-15: polar is the exact same array reference as mockEntry.polar', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(analyser.polar).toBe(mockEntry.polar)
  })

  it('AC-16: profileName equals mockEntry.profileName', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    expect(analyser.profileName).toBe('Test Airfoil')
  })
})

// Group 6b — atAoA method (refactor AC — additive method)
describe('AirfoilAnalyser atAoA', () => {
  const analyser = new AirfoilAnalyser(mockEntry)

  it('returns an object with cd and cm for an AoA within the polar range', () => {
    const result = analyser.atAoA(8)
    expect(result).not.toBeNull()
    expect(typeof result.cd).toBe('number')
    expect(typeof result.cm).toBe('number')
  })

  it('returns values matching the polar at an exact polar point (aoa=8)', () => {
    const result = analyser.atAoA(8)
    expect(result.cd).toBeCloseTo(0.020, 5)
    expect(result.cm).toBeCloseTo(-0.06, 5)
  })

  it('returns null when aoa is null', () => {
    expect(analyser.atAoA(null)).toBeNull()
  })

  it('returns null when aoa is undefined', () => {
    expect(analyser.atAoA(undefined)).toBeNull()
  })

  it('returns null when aoa is outside the polar range', () => {
    // polar only covers -4 to 16
    expect(analyser.atAoA(100)).toBeNull()
  })
})

// Group 6c — Speed methods
describe('AirfoilAnalyser speed methods', () => {
  const analyser = new AirfoilAnalyser(mockEntry)

  it('getStallSpeed returns a positive number for valid inputs', () => {
    const speed = analyser.getStallSpeed(5, 0)
    expect(typeof speed).toBe('number')
    expect(speed).toBeGreaterThan(0)
  })

  it('getStallSpeed returns null when wingLoading is 0', () => {
    expect(analyser.getStallSpeed(0, 0)).toBeNull()
  })

  it('getLandingSpeed returns a positive number for valid inputs', () => {
    const speed = analyser.getLandingSpeed(5, 0)
    expect(typeof speed).toBe('number')
    expect(speed).toBeGreaterThan(0)
  })

  it('getLandingSpeed is faster than stall speed (lower CL → higher speed)', () => {
    // Landing CL = stallCl / 1.44 < stallCl, so landing speed > stall speed
    const stall = analyser.getStallSpeed(5, 0)
    const landing = analyser.getLandingSpeed(5, 0)
    expect(landing).toBeGreaterThan(stall)
  })

  it('convertClToSpeed returns a positive number for valid inputs', () => {
    const speed = AirfoilAnalyser.convertClToSpeed(5, 0.5, 0)
    expect(typeof speed).toBe('number')
    expect(speed).toBeGreaterThan(0)
  })

  it('convertClToSpeed returns null when cruiseCl is 0', () => {
    expect(AirfoilAnalyser.convertClToSpeed(5, 0, 0)).toBeNull()
  })

  it('getLandingSpeed returns null when stallCl is null', () => {
    const entry = { ...mockEntry, stall_clmax: undefined, clmax: undefined }
    const a = new AirfoilAnalyser(entry)
    expect(a.getLandingSpeed(5, 0)).toBeNull()
  })
})

// Group 7 — Immutability and caching (AC-17, AC-18)
describe('AirfoilAnalyser immutability and caching', () => {
  it('AC-17: accessing stallCl twice returns the same value', () => {
    const analyser = new AirfoilAnalyser(mockEntry)
    const first = analyser.stallCl
    const second = analyser.stallCl
    expect(first).toBe(second)
  })

  it('AC-18: mockEntry is not mutated after construction', () => {
    const original = JSON.stringify(mockEntry)
    const analyser = new AirfoilAnalyser(mockEntry) // eslint-disable-line no-unused-vars
    expect(JSON.stringify(mockEntry)).toBe(original)
  })
})
