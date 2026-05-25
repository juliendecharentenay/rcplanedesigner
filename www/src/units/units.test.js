import { describe, it, expect } from 'vitest'
import { UNIT_SYSTEMS, getDistanceUnit, convertDistance, getWingLoadingUnit, convertWingLoading, getSpeedUnit, convertSpeed } from './units'

describe('UNIT_SYSTEMS', () => {
  it('contains SI and Imperial entries', () => {
    const values = UNIT_SYSTEMS.map((s) => s.value)
    expect(values).toContain('SI')
    expect(values).toContain('Imperial')
  })

  it('every entry has a value and a label', () => {
    for (const s of UNIT_SYSTEMS) {
      expect(s.value).toBeTruthy()
      expect(s.label).toBeTruthy()
    }
  })
})

describe('getDistanceUnit', () => {
  it('returns "m" for SI', () => {
    expect(getDistanceUnit('SI')).toBe('m')
  })

  it('returns "ft" for Imperial', () => {
    expect(getDistanceUnit('Imperial')).toBe('ft')
  })
})

describe('convertDistance', () => {
  it('returns the same value when systems are equal', () => {
    expect(convertDistance(100, 'SI', 'SI')).toBe(100)
    expect(convertDistance(100, 'Imperial', 'Imperial')).toBe(100)
  })

  it('converts metres to feet', () => {
    expect(convertDistance(1, 'SI', 'Imperial')).toBeCloseTo(3.28084)
  })

  it('converts feet to metres', () => {
    expect(convertDistance(3.28084, 'Imperial', 'SI')).toBeCloseTo(1)
  })

  it('round-trips without drift', () => {
    const original = 250
    const converted = convertDistance(convertDistance(original, 'SI', 'Imperial'), 'Imperial', 'SI')
    expect(converted).toBeCloseTo(original)
  })
})

describe('getWingLoadingUnit', () => {
  it('returns "g/sq.dm" for SI', () => {
    expect(getWingLoadingUnit('SI')).toBe('g/sq.dm')
  })

  it('returns "oz/sq.ft" for Imperial', () => {
    expect(getWingLoadingUnit('Imperial')).toBe('oz/sq.ft')
  })
})

describe('convertWingLoading', () => {
  it('returns the same value when systems are equal', () => {
    expect(convertWingLoading(15, 'Imperial', 'Imperial')).toBe(15)
    expect(convertWingLoading(45, 'SI', 'SI')).toBe(45)
  })

  it('converts oz/sq.ft to g/sq.dm', () => {
    expect(convertWingLoading(10, 'Imperial', 'SI')).toBeCloseTo(30.52, 1)
  })

  it('converts g/sq.dm to oz/sq.ft', () => {
    expect(convertWingLoading(30.52, 'SI', 'Imperial')).toBeCloseTo(10, 1)
  })

  it('round-trips without drift', () => {
    const original = 15
    const converted = convertWingLoading(convertWingLoading(original, 'Imperial', 'SI'), 'SI', 'Imperial')
    expect(converted).toBeCloseTo(original)
  })
})

describe('getSpeedUnit', () => {
  it('returns "m/s" for SI', () => {
    expect(getSpeedUnit('SI')).toBe('m/s')
  })

  it('returns "mph" for Imperial', () => {
    expect(getSpeedUnit('Imperial')).toBe('mph')
  })
})

describe('convertSpeed', () => {
  it('returns the same value when systems are equal', () => {
    expect(convertSpeed(35, 'Imperial', 'Imperial')).toBe(35)
    expect(convertSpeed(15, 'SI', 'SI')).toBe(15)
  })

  it('converts mph to m/s', () => {
    expect(convertSpeed(1, 'Imperial', 'SI')).toBeCloseTo(0.44704)
  })

  it('converts m/s to mph', () => {
    expect(convertSpeed(0.44704, 'SI', 'Imperial')).toBeCloseTo(1)
  })

  it('round-trips without drift', () => {
    const original = 35
    const converted = convertSpeed(convertSpeed(original, 'Imperial', 'SI'), 'SI', 'Imperial')
    expect(converted).toBeCloseTo(original)
  })
})
