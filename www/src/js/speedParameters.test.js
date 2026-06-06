import { describe, it, expect } from 'vitest'
import { computeSpeedFromCL, computeCruiseSpeed, computeStallSpeed, computeLandingSpeed } from './speedParameters'

const G_SQDM_TO_N_M2 = 0.1 * 9.80665
const T0 = 288.15
const P0 = 101325
const R = 287.058
const densityAt0m = P0 / (R * T0)

describe('computeSpeedFromCL', () => {
  it('returns null when wingLoading is zero', () => {
    expect(computeSpeedFromCL(0, 1.0, 0)).toBeNull()
  })

  it('returns null when wingLoading is null', () => {
    expect(computeSpeedFromCL(null, 1.0, 0)).toBeNull()
  })

  it('returns null when cl is zero', () => {
    expect(computeSpeedFromCL(50, 0, 0)).toBeNull()
  })

  it('returns null when cl is null', () => {
    expect(computeSpeedFromCL(50, null, 0)).toBeNull()
  })

  it('returns the correct speed at known inputs', () => {
    const expectedSpeed = Math.sqrt(2 * 50 * G_SQDM_TO_N_M2 / (densityAt0m * 1.0))
    expect(computeSpeedFromCL(50, 1.0, 0)).toBeCloseTo(expectedSpeed, 5)
  })

  it('returns higher speed at lower CL', () => {
    const speedHighCL = computeSpeedFromCL(50, 1.5, 0)
    const speedLowCL  = computeSpeedFromCL(50, 0.5, 0)
    expect(speedLowCL).toBeGreaterThan(speedHighCL)
  })

  it('returns higher speed at higher altitude (lower density)', () => {
    const speedLow  = computeSpeedFromCL(50, 1.0, 0)
    const speedHigh = computeSpeedFromCL(50, 1.0, 2000)
    expect(speedHigh).toBeGreaterThan(speedLow)
  })

  it('returns higher speed at higher wing loading', () => {
    const speedLow  = computeSpeedFromCL(30, 1.0, 0)
    const speedHigh = computeSpeedFromCL(80, 1.0, 0)
    expect(speedHigh).toBeGreaterThan(speedLow)
  })
})

describe('computeCruiseSpeed', () => {
  it('delegates to computeSpeedFromCL', () => {
    const expected = Math.sqrt(2 * 50 * G_SQDM_TO_N_M2 / (densityAt0m * 0.8))
    expect(computeCruiseSpeed(50, 0.8, 0)).toBeCloseTo(expected, 5)
  })

  it('returns null when wingLoading is zero', () => {
    expect(computeCruiseSpeed(0, 0.8, 0)).toBeNull()
  })

  it('returns null when cl is null', () => {
    expect(computeCruiseSpeed(50, null, 0)).toBeNull()
  })
})

describe('computeStallSpeed', () => {
  it('delegates to computeSpeedFromCL', () => {
    const expected = Math.sqrt(2 * 50 * G_SQDM_TO_N_M2 / (densityAt0m * 1.4))
    expect(computeStallSpeed(50, 1.4, 0)).toBeCloseTo(expected, 5)
  })

  it('returns null when wingLoading is zero', () => {
    expect(computeStallSpeed(0, 1.4, 0)).toBeNull()
  })

  it('returns null when stallCl is null', () => {
    expect(computeStallSpeed(50, null, 0)).toBeNull()
  })
})

describe('computeLandingSpeed', () => {
  it('equals 1.2 times stall speed', () => {
    const stallSpeed = computeStallSpeed(50, 1.4, 0)
    const landingSpeed = computeLandingSpeed(50, 1.4, 0)
    expect(landingSpeed).toBeCloseTo(1.2 * stallSpeed, 5)
  })

  it('returns null when stallCl is null', () => {
    expect(computeLandingSpeed(50, null, 0)).toBeNull()
  })

  it('returns null when wingLoading is zero', () => {
    expect(computeLandingSpeed(0, 1.4, 0)).toBeNull()
  })
})
