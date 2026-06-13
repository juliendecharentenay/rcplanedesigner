import { describe, it, expect, vi } from 'vitest'
import airfoilData from '@/assets/airfoils.json'
import { useAirfoilState, STATE_DEFAULTS } from './useAirfoilState'

function setup(onError = vi.fn()) {
  return { ...useAirfoilState(onError), onError }
}

describe('useAirfoilState', () => {
  it('returns the default state initially', () => {
    const { getState } = setup()
    expect(getState()).toEqual({
      units:           'SI',
      siteAltitude:    0,
      wingLoading:     0,
      cruisingSpeed:   0,
      selectedAirfoil: airfoilData[0].profileName,
      comparisonX:     'cruiseAoa',
      comparisonY:     'cruiseCl',
    })
  })

  it('STATE_DEFAULTS selectedAirfoil is the first airfoil profileName', () => {
    expect(STATE_DEFAULTS.selectedAirfoil).toBe(airfoilData[0].profileName)
  })

  it('defaults units to SI', () => {
    const { getState } = setup()
    expect(getState().units).toBe('SI')
  })

  it('defaults siteAltitude to 0', () => {
    const { getState } = setup()
    expect(getState().siteAltitude).toBe(0)
  })

  it('defaults wingLoading to 0', () => {
    const { getState } = setup()
    expect(getState().wingLoading).toBe(0)
  })

  it('defaults cruisingSpeed to 0', () => {
    const { getState } = setup()
    expect(getState().cruisingSpeed).toBe(0)
  })

  it('defaults comparisonX to cruiseAoa', () => {
    const { getState } = setup()
    expect(getState().comparisonX).toBe('cruiseAoa')
  })

  it('defaults comparisonY to cruiseCl', () => {
    const { getState } = setup()
    expect(getState().comparisonY).toBe('cruiseCl')
  })

  it('setState merges partial updates into state', () => {
    const { getState, setState } = setup()
    setState({ comparisonX: 'stallAoa' })
    expect(getState().comparisonX).toBe('stallAoa')
    expect(getState().comparisonY).toBe('cruiseCl')
  })

  it('setState overwrites existing keys', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 100 })
    setState({ siteAltitude: 500 })
    expect(getState().siteAltitude).toBe(500)
  })

  it('setState can update selectedAirfoil', () => {
    const { getState, setState } = setup()
    setState({ selectedAirfoil: 'NACA 2412' })
    expect(getState().selectedAirfoil).toBe('NACA 2412')
  })

  it('selectedAirfoil is not affected when units change', () => {
    const { getState, setState } = setup()
    setState({ selectedAirfoil: 'NACA 2412' })
    setState({ units: 'Imperial' })
    expect(getState().selectedAirfoil).toBe('NACA 2412')
  })

  it('getState returns a readonly snapshot — mutations are silently rejected', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 100 })
    const snap = getState()
    snap.siteAltitude = 999
    expect(snap.siteAltitude).toBe(100)
  })

  it('converts siteAltitude from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 100 })
    setState({ units: 'Imperial' })
    expect(getState().siteAltitude).toBeCloseTo(328.084, 1)
  })

  it('converts siteAltitude from Imperial to SI when units change', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    setState({ siteAltitude: 328.084 })
    setState({ units: 'SI' })
    expect(getState().siteAltitude).toBeCloseTo(100, 1)
  })

  it('does not convert siteAltitude when units are unchanged', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 500 })
    setState({ units: 'SI' })
    expect(getState().siteAltitude).toBe(500)
  })

  it('converts wingLoading from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ wingLoading: 45.773 })
    setState({ units: 'Imperial' })
    expect(getState().wingLoading).toBeCloseTo(15, 1)
  })

  it('converts wingLoading from Imperial to SI when units change', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    setState({ wingLoading: 15 })
    setState({ units: 'SI' })
    expect(getState().wingLoading).toBeCloseTo(45.773, 0)
  })

  it('does not convert wingLoading when units are unchanged', () => {
    const { getState, setState } = setup()
    setState({ wingLoading: 30 })
    setState({ units: 'SI' })
    expect(getState().wingLoading).toBe(30)
  })

  it('converts cruisingSpeed from SI to Imperial when units change', () => {
    const { getState, setState } = setup()
    setState({ cruisingSpeed: 17.882 })
    setState({ units: 'Imperial' })
    expect(getState().cruisingSpeed).toBeCloseTo(40, 1)
  })

  it('converts cruisingSpeed from Imperial to SI when units change', () => {
    const { getState, setState } = setup()
    setState({ units: 'Imperial' })
    setState({ cruisingSpeed: 40 })
    setState({ units: 'SI' })
    expect(getState().cruisingSpeed).toBeCloseTo(17.882, 1)
  })

  it('does not convert cruisingSpeed when units are unchanged', () => {
    const { getState, setState } = setup()
    setState({ cruisingSpeed: 15 })
    setState({ units: 'SI' })
    expect(getState().cruisingSpeed).toBe(15)
  })

  it('does not fire any conversion when units is not in the partial', () => {
    const { getState, setState } = setup()
    setState({ siteAltitude: 100, wingLoading: 30, cruisingSpeed: 15 })
    setState({ comparisonX: 'stallAoa' })
    expect(getState().siteAltitude).toBe(100)
    expect(getState().wingLoading).toBe(30)
    expect(getState().cruisingSpeed).toBe(15)
  })

  it('calls onError when setState throws', () => {
    const onError = vi.fn()
    const { setState } = useAirfoilState(onError)
    const badPartial = Object.defineProperty({}, 'boom', {
      get() { throw new Error('getter exploded') },
      enumerable: true,
    })
    expect(() => setState(badPartial)).not.toThrow()
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
