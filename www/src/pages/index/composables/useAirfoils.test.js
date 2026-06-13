import { describe, it, expect } from 'vitest'
import { useAirfoils } from './useAirfoils'
import { AirfoilAnalyser } from '@/js/AirfoilAnalyser'

describe('useAirfoils', () => {
  it('returns an airfoils array', () => {
    const { airfoils } = useAirfoils()
    expect(Array.isArray(airfoils)).toBe(true)
  })

  it('contains 14 profiles', () => {
    const { airfoils } = useAirfoils()
    expect(airfoils).toHaveLength(14)
  })

  it('each element is an AirfoilAnalyser instance', () => {
    const { airfoils } = useAirfoils()
    for (const a of airfoils) {
      expect(a).toBeInstanceOf(AirfoilAnalyser)
    }
  })

  it('each profile has required fields', () => {
    const { airfoils } = useAirfoils()
    for (const a of airfoils) {
      expect(a).toHaveProperty('profileName')
      expect(a).toHaveProperty('zeroLiftAoA')
      expect(a).toHaveProperty('stallAoa')
      expect(a).toHaveProperty('stallCl')
      expect(a).toHaveProperty('polar')
    }
  })

  it('the first profile is E168  (12.45%)', () => {
    const { airfoils } = useAirfoils()
    expect(airfoils[0].profileName).toBe('E168  (12.45%)')
  })

  it('each element returns the same array reference on repeated calls', () => {
    const { airfoils: a1 } = useAirfoils()
    const { airfoils: a2 } = useAirfoils()
    expect(a1).toBe(a2)
  })
})
