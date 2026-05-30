import { describe, it, expect } from 'vitest'
import {
  UNIT_SYSTEMS,
  getDistanceUnit, convertDistance,
  getWingLoadingUnit, convertWingLoading,
  getSpeedUnit, convertSpeed,
  getTemperatureUnit, convertTemperature, kelvinToCelsius, kelvinToFahrenheit,
  getPressureUnit, convertPressure,
  getDensityUnit, convertDensity,
} from './units'

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

describe('getTemperatureUnit', () => {
  it('returns "°C" for SI', () => {
    expect(getTemperatureUnit('SI')).toBe('°C')
  })

  it('returns "°F" for Imperial', () => {
    expect(getTemperatureUnit('Imperial')).toBe('°F')
  })
})

describe('convertTemperature', () => {
  it('returns the same value when systems are equal', () => {
    expect(convertTemperature(20, 'SI', 'SI')).toBe(20)
    expect(convertTemperature(68, 'Imperial', 'Imperial')).toBe(68)
  })

  it('converts °C to °F', () => {
    expect(convertTemperature(0, 'SI', 'Imperial')).toBeCloseTo(32)
    expect(convertTemperature(100, 'SI', 'Imperial')).toBeCloseTo(212)
  })

  it('converts °F to °C', () => {
    expect(convertTemperature(32, 'Imperial', 'SI')).toBeCloseTo(0)
    expect(convertTemperature(212, 'Imperial', 'SI')).toBeCloseTo(100)
  })

  it('round-trips without drift', () => {
    const original = 15
    const converted = convertTemperature(convertTemperature(original, 'SI', 'Imperial'), 'Imperial', 'SI')
    expect(converted).toBeCloseTo(original)
  })
})

describe('kelvinToCelsius / kelvinToFahrenheit', () => {
  it('converts 288.15 K to 15 °C', () => {
    expect(kelvinToCelsius(288.15)).toBeCloseTo(15)
  })

  it('converts 288.15 K to 59 °F', () => {
    expect(kelvinToFahrenheit(288.15)).toBeCloseTo(59)
  })

  it('converts 0 K to −273.15 °C', () => {
    expect(kelvinToCelsius(0)).toBeCloseTo(-273.15)
  })
})

describe('getPressureUnit', () => {
  it('returns "Pa" for SI', () => {
    expect(getPressureUnit('SI')).toBe('Pa')
  })

  it('returns "inHg" for Imperial', () => {
    expect(getPressureUnit('Imperial')).toBe('inHg')
  })
})

describe('convertPressure', () => {
  it('returns the same value when systems are equal', () => {
    expect(convertPressure(101325, 'SI', 'SI')).toBe(101325)
    expect(convertPressure(29.92, 'Imperial', 'Imperial')).toBe(29.92)
  })

  it('converts Pa to inHg — sea-level std pressure ≈ 29.92 inHg', () => {
    expect(convertPressure(101325, 'SI', 'Imperial')).toBeCloseTo(29.92, 1)
  })

  it('converts inHg to Pa', () => {
    expect(convertPressure(29.92, 'Imperial', 'SI')).toBeCloseTo(101325, -1)
  })

  it('round-trips without drift', () => {
    const original = 101325
    const converted = convertPressure(convertPressure(original, 'SI', 'Imperial'), 'Imperial', 'SI')
    expect(converted).toBeCloseTo(original, 0)
  })
})

describe('getDensityUnit', () => {
  it('returns "kg/m³" for SI', () => {
    expect(getDensityUnit('SI')).toBe('kg/m³')
  })

  it('returns "lb/ft³" for Imperial', () => {
    expect(getDensityUnit('Imperial')).toBe('lb/ft³')
  })
})

describe('convertDensity', () => {
  it('returns the same value when systems are equal', () => {
    expect(convertDensity(1.225, 'SI', 'SI')).toBe(1.225)
    expect(convertDensity(0.07647, 'Imperial', 'Imperial')).toBe(0.07647)
  })

  it('converts kg/m³ to lb/ft³ — sea-level std density ≈ 0.07647 lb/ft³', () => {
    expect(convertDensity(1.225, 'SI', 'Imperial')).toBeCloseTo(0.07647, 4)
  })

  it('converts lb/ft³ to kg/m³', () => {
    expect(convertDensity(0.07647, 'Imperial', 'SI')).toBeCloseTo(1.225, 2)
  })

  it('round-trips without drift', () => {
    const original = 1.225
    const converted = convertDensity(convertDensity(original, 'SI', 'Imperial'), 'Imperial', 'SI')
    expect(converted).toBeCloseTo(original, 5)
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
