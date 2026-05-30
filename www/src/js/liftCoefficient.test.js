import { describe, it, expect } from 'vitest'
import { computeCruiseCL } from './liftCoefficient'
import { atmosphere } from './atmosphere'

// Reference: CL = 2 × (wl_gSqdm × 0.1 × 9.80665) / (density × speed²)

describe('computeCruiseCL — known values', () => {
  it('returns correct CL at sea level', () => {
    const { density } = atmosphere(0)           // 1.225 kg/m³
    const wl = 45.8                             // g/sq.dm
    const v  = 18                               // m/s
    const expected = 2 * wl * 0.1 * 9.80665 / (density * v ** 2)
    expect(computeCruiseCL(wl, v, 0)).toBeCloseTo(expected, 6)
  })

  it('returns correct CL at 1000 m altitude', () => {
    const { density } = atmosphere(1000)
    const wl = 30.5
    const v  = 15
    const expected = 2 * wl * 0.1 * 9.80665 / (density * v ** 2)
    expect(computeCruiseCL(wl, v, 1000)).toBeCloseTo(expected, 6)
  })
})

describe('computeCruiseCL — null cases', () => {
  it('returns null when wing loading is zero', () => {
    expect(computeCruiseCL(0, 18, 0)).toBeNull()
  })

  it('returns null when speed is zero', () => {
    expect(computeCruiseCL(45.8, 0, 0)).toBeNull()
  })
})

describe('computeCruiseCL — physical properties', () => {
  it('CL increases as speed decreases (slower flight needs more lift)', () => {
    expect(computeCruiseCL(45.8, 12, 0)).toBeGreaterThan(computeCruiseCL(45.8, 18, 0))
  })

  it('CL increases as wing loading increases', () => {
    expect(computeCruiseCL(60, 18, 0)).toBeGreaterThan(computeCruiseCL(30, 18, 0))
  })

  it('CL increases with altitude (less dense air requires more lift coefficient)', () => {
    expect(computeCruiseCL(45.8, 18, 2000)).toBeGreaterThan(computeCruiseCL(45.8, 18, 0))
  })

  it('CL is positive for positive inputs', () => {
    expect(computeCruiseCL(45.8, 18, 0)).toBeGreaterThan(0)
  })
})
