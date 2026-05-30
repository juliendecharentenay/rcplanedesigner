import { describe, it, expect } from 'vitest'
import { useAirfoils } from './useAirfoils'

describe('useAirfoils', () => {
  it('returns an airfoils array', () => {
    const { airfoils } = useAirfoils()
    expect(Array.isArray(airfoils)).toBe(true)
  })

  it('contains 14 profiles', () => {
    const { airfoils } = useAirfoils()
    expect(airfoils).toHaveLength(14)
  })

  it('each profile has required fields', () => {
    const { airfoils } = useAirfoils()
    for (const a of airfoils) {
      expect(a).toHaveProperty('profileName')
      expect(a).toHaveProperty('zeroLiftAoA')
      expect(a).toHaveProperty('stall_clmax')
      expect(a).toHaveProperty('stall_aoa')
      expect(a).toHaveProperty('polar')
    }
  })

  it('the first profile is E168  (12.45%)', () => {
    const { airfoils } = useAirfoils()
    expect(airfoils[0].profileName).toBe('E168  (12.45%)')
  })
})
