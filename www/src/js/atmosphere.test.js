import { describe, it, expect } from 'vitest'
import { atmosphere } from './atmosphere'

// Reference values from US Standard Atmosphere 1976 tables
describe('atmosphere — sea level (0 m)', () => {
  const result = atmosphere(0)

  it('temperature is 288.15 K', () => {
    expect(result.temperature).toBeCloseTo(288.15, 2)
  })

  it('pressure is 101325 Pa', () => {
    expect(result.pressure).toBeCloseTo(101325, 0)
  })

  it('density is 1.225 kg/m³', () => {
    expect(result.density).toBeCloseTo(1.225, 3)
  })

  it('viscosity is ~1.789e-5 Pa·s', () => {
    expect(result.viscosity).toBeCloseTo(1.789e-5, 7)
  })
})

describe('atmosphere — 1000 m', () => {
  const result = atmosphere(1000)

  it('temperature is 281.65 K', () => {
    expect(result.temperature).toBeCloseTo(281.65, 2)
  })

  it('pressure is ~89875 Pa', () => {
    expect(result.pressure).toBeCloseTo(89875, 0)
  })

  it('density is ~1.112 kg/m³', () => {
    expect(result.density).toBeCloseTo(1.112, 3)
  })
})

describe('atmosphere — 4000 m', () => {
  const result = atmosphere(4000)

  it('temperature is 262.15 K', () => {
    expect(result.temperature).toBeCloseTo(262.15, 2)
  })

  it('pressure is ~61641 Pa', () => {
    expect(result.pressure).toBeCloseTo(61641, -1)
  })

  it('density is ~0.8191 kg/m³', () => {
    expect(result.density).toBeCloseTo(0.8191, 3)
  })
})

describe('atmosphere — physical properties', () => {
  it('temperature decreases with altitude', () => {
    expect(atmosphere(0).temperature).toBeGreaterThan(atmosphere(2000).temperature)
    expect(atmosphere(2000).temperature).toBeGreaterThan(atmosphere(4000).temperature)
  })

  it('pressure decreases with altitude', () => {
    expect(atmosphere(0).pressure).toBeGreaterThan(atmosphere(2000).pressure)
    expect(atmosphere(2000).pressure).toBeGreaterThan(atmosphere(4000).pressure)
  })

  it('density decreases with altitude', () => {
    expect(atmosphere(0).density).toBeGreaterThan(atmosphere(2000).density)
    expect(atmosphere(2000).density).toBeGreaterThan(atmosphere(4000).density)
  })

  it('viscosity decreases with altitude (cooler air is less viscous)', () => {
    expect(atmosphere(0).viscosity).toBeGreaterThan(atmosphere(4000).viscosity)
  })

  it('ideal gas law holds: density = pressure / (R * temperature)', () => {
    const R = 287.058
    const { temperature, pressure, density } = atmosphere(2500)
    expect(density).toBeCloseTo(pressure / (R * temperature), 10)
  })
})

describe('atmosphere — range validation', () => {
  it('throws for negative altitude', () => {
    expect(() => atmosphere(-1)).toThrow(RangeError)
  })

  it('throws for altitude above 4000 m', () => {
    expect(() => atmosphere(4001)).toThrow(RangeError)
  })

  it('accepts boundary values 0 and 4000', () => {
    expect(() => atmosphere(0)).not.toThrow()
    expect(() => atmosphere(4000)).not.toThrow()
  })
})
