import { describe, it, expect, vi } from 'vitest'
import { useAppState } from './useAppState'

function setup(onError = vi.fn()) {
  return { ...useAppState(onError), onError }
}

describe('useAppState', () => {
  it('returns the default state initially', () => {
    const { getState } = setup()
    expect(getState()).toEqual({
      units: 'SI', siteAltitude: 0, wingLoading: 45, cruisingSpeed: 15,
      planeType: 'Trainer', airfoilProfile: null,
      wingSpan: 1.5, rootChord: 0.3, tipChord: 0.2, sweepAngle: 0,
      fuselageWidth: 0.12, frontFuselage: 0, rearFuselage: 0,
      tailSpan: 0, tailChord: 0, tailAirfoil: 'E168  (12.45%)',
    })
  })

  it('defaults airfoilProfile to null', () => {
    const { getState } = setup()
    expect(getState().airfoilProfile).toBeNull()
  })

  it('setState can update airfoilProfile', () => {
    const { getState, setState } = setup()
    setState({ airfoilProfile: 'E168  (12.45%)' })
    expect(getState().airfoilProfile).toBe('E168  (12.45%)')
  })

  it('airfoilProfile is not affected when units change', () => {
    const { getState, setState } = setup()
    setState({ airfoilProfile: 'E168  (12.45%)' })
    setState({ units: 'Imperial' })
    expect(getState().airfoilProfile).toBe('E168  (12.45%)')
  })

  it('defaults planeType to Trainer', () => {
    const { getState } = setup()
    expect(getState().planeType).toBe('Trainer')
  })

  it('setState updates planeType', () => {
    const { getState, setState } = setup()
    setState({ planeType: 'Glider' })
    expect(getState().planeType).toBe('Glider')
  })

  it('planeType is not affected when units change', () => {
    const { getState, setState } = setup()
    setState({ planeType: 'Acrobatic' })
    setState({ units: 'Imperial' })
    expect(getState().planeType).toBe('Acrobatic')
  })

  it('defaults units to SI', () => {
    const { getState } = setup()
    expect(getState().units).toBe('SI')
  })

  it('defaults siteAltitude to 0', () => {
    const { getState } = setup()
    expect(getState().siteAltitude).toBe(0)
  })

  it('setState merges partial updates into state', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    expect(getState().units).toBe('Imperial')
    // siteAltitude was 0 — 0 ft is still 0
    expect(getState().siteAltitude).toBe(0)
  })

  it('converts siteAltitude from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 100 })             // 100 m
    setState({ units: 'Imperial' })
    expect(getState().siteAltitude).toBeCloseTo(328.084, 1)
  })

  it('converts siteAltitude from Imperial to SI when units change', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    setState({ siteAltitude: 328.084 })         // ~100 ft
    setState({ units: 'SI' })
    expect(getState().siteAltitude).toBeCloseTo(100, 1)
  })

  it('does not convert siteAltitude when units are unchanged', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 500 })
    setState({ units: 'SI' })                   // same system, no conversion
    expect(getState().siteAltitude).toBe(500)
  })

  it('defaults wingLoading to 45', () => {
    const { getState } = setup()
    expect(getState().wingLoading).toBe(45)
  })

  it('converts wingLoading from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ wingLoading: 45.773 })            // ~15 oz/sq.ft in g/sq.dm
    setState({ units: 'Imperial' })
    expect(getState().wingLoading).toBeCloseTo(15, 1)
  })

  it('converts wingLoading from Imperial to SI when units change', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    setState({ wingLoading: 15 })                // 15 oz/sq.ft
    setState({ units: 'SI' })
    expect(getState().wingLoading).toBeCloseTo(45.773, 0)
  })

  it('does not convert wingLoading when units are unchanged', () => {
    const { getState, setState } = setup()
    setState({ wingLoading: 30 })
    setState({ units: 'SI' })                   // same system, no conversion
    expect(getState().wingLoading).toBe(30)
  })

  it('defaults cruisingSpeed to 15', () => {
    const { getState } = setup()
    expect(getState().cruisingSpeed).toBe(15)
  })

  it('converts cruisingSpeed from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ cruisingSpeed: 17.882 })          // ~40 mph in m/s
    setState({ units: 'Imperial' })
    expect(getState().cruisingSpeed).toBeCloseTo(40, 1)
  })

  it('converts cruisingSpeed from Imperial to SI when units change', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    setState({ cruisingSpeed: 40 })              // 40 mph
    setState({ units: 'SI' })
    expect(getState().cruisingSpeed).toBeCloseTo(17.882, 1)
  })

  it('does not convert cruisingSpeed when units are unchanged', () => {
    const { getState, setState } = setup()
    setState({ cruisingSpeed: 15 })
    setState({ units: 'SI' })                   // same system, no conversion
    expect(getState().cruisingSpeed).toBe(15)
  })

  it('setState overwrites existing keys', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 100 })
    setState({ siteAltitude: 250 })
    expect(getState().siteAltitude).toBe(250)
  })

  it('getState returns a readonly snapshot — mutations are silently rejected', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 100 })
    const snap = getState()
    snap.siteAltitude = 999
    expect(snap.siteAltitude).toBe(100)
  })

  it('defaults wingSpan to 1.5', () => {
    const { getState } = setup()
    expect(getState().wingSpan).toBe(1.5)
  })

  it('defaults rootChord to 0.3', () => {
    const { getState } = setup()
    expect(getState().rootChord).toBe(0.3)
  })

  it('defaults tipChord to 0.2', () => {
    const { getState } = setup()
    expect(getState().tipChord).toBe(0.2)
  })

  it('defaults sweepAngle to 0', () => {
    const { getState } = setup()
    expect(getState().sweepAngle).toBe(0)
  })

  it('setState can update wingSpan', () => {
    const { getState, setState } = setup()
    setState({ wingSpan: 1.5 })
    expect(getState().wingSpan).toBe(1.5)
  })

  it('wingSpan converts from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ wingSpan: 1 })             // 1 m
    setState({ units: 'Imperial' })
    expect(getState().wingSpan).toBeCloseTo(3.28084, 2)
  })

  it('rootChord converts from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ rootChord: 1 })            // 1 m
    setState({ units: 'Imperial' })
    expect(getState().rootChord).toBeCloseTo(3.28084, 2)
  })

  it('tipChord converts from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ tipChord: 1 })             // 1 m
    setState({ units: 'Imperial' })
    expect(getState().tipChord).toBeCloseTo(3.28084, 2)
  })

  it('sweepAngle is NOT converted when units change', () => {
    const { getState, setState } = setup()
    setState({ sweepAngle: 25 })
    setState({ units: 'Imperial' })
    expect(getState().sweepAngle).toBe(25)
  })

  // ── Fuselage & Tail state fields ─────────────────────────────────────────────

  it('defaults fuselageWidth to 0.12', () => {
    const { getState } = setup()
    expect(getState().fuselageWidth).toBe(0.12)
  })

  it('defaults frontFuselage to 0 (sentinel for computed default)', () => {
    const { getState } = setup()
    expect(getState().frontFuselage).toBe(0)
  })

  it('defaults rearFuselage to 0 (sentinel)', () => {
    const { getState } = setup()
    expect(getState().rearFuselage).toBe(0)
  })

  it('defaults tailSpan to 0 (sentinel)', () => {
    const { getState } = setup()
    expect(getState().tailSpan).toBe(0)
  })

  it('defaults tailChord to 0 (sentinel)', () => {
    const { getState } = setup()
    expect(getState().tailChord).toBe(0)
  })

  it('defaults tailAirfoil to Eppler 168 profile name', () => {
    const { getState } = setup()
    expect(getState().tailAirfoil).toBe('E168  (12.45%)')
  })

  it('fuselageWidth converts from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ fuselageWidth: 1 })       // 1 m
    setState({ units: 'Imperial' })
    expect(getState().fuselageWidth).toBeCloseTo(3.28084, 2)
  })

  it('frontFuselage sentinel (0) remains 0 after unit conversion', () => {
    const { getState, setState } = setup()
    // frontFuselage defaults to 0; convertDistance(0, 'SI', 'Imperial') = 0
    setState({ units: 'Imperial' })
    expect(getState().frontFuselage).toBe(0)
  })

  it('frontFuselage converts non-zero value when units change', () => {
    const { getState, setState } = setup()
    setState({ frontFuselage: 0.6 })     // 0.6 m
    setState({ units: 'Imperial' })
    expect(getState().frontFuselage).toBeCloseTo(0.6 * 3.28084, 2)
  })

  it('tailAirfoil is NOT converted when units change', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    expect(getState().tailAirfoil).toBe('E168  (12.45%)')
  })

  it('calls onError when setState throws', () => {
    const onError = vi.fn()
    const { setState } = useAppState(onError)
    const badPartial = Object.defineProperty({}, 'boom', {
      get() { throw new Error('getter exploded') },
      enumerable: true,
    })
    expect(() => setState(badPartial)).not.toThrow()
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
