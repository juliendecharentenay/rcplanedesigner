import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { useUnits } from './useUnits'
import { APP_STATE_KEY } from './useAppState'

function mountWithUnits(unitSystem = 'SI') {
  const state = ref({ units: unitSystem, siteAltitude: 0 })
  let result

  mount(
    {
      setup() {
        result = useUnits()
        return () => null
      },
    },
    {
      global: {
        provide: {
          [APP_STATE_KEY]: {
            getState: () => state.value,
            setState: vi.fn((p) => { state.value = { ...state.value, ...p } }),
          },
        },
      },
    },
  )

  return { result, state }
}

describe('useUnits', () => {
  it('exposes the current unit system', () => {
    const { result } = mountWithUnits('SI')
    expect(result.system.value).toBe('SI')
  })

  it('distanceUnit is "m" when system is SI', () => {
    const { result } = mountWithUnits('SI')
    expect(result.distanceUnit.value).toBe('m')
  })

  it('distanceUnit is "ft" when system is Imperial', () => {
    const { result } = mountWithUnits('Imperial')
    expect(result.distanceUnit.value).toBe('ft')
  })

  it('distanceUnit updates reactively when state changes', async () => {
    const { result, state } = mountWithUnits('SI')
    expect(result.distanceUnit.value).toBe('m')
    state.value = { ...state.value, units: 'Imperial' }
    await Promise.resolve()
    expect(result.distanceUnit.value).toBe('ft')
  })

  it('exposes convertDistance as a function', () => {
    const { result } = mountWithUnits('SI')
    expect(typeof result.convertDistance).toBe('function')
  })

  it('areaUnit is "m²" when system is SI', () => {
    const { result } = mountWithUnits('SI')
    expect(result.areaUnit.value).toBe('m²')
  })

  it('areaUnit is "ft²" when system is Imperial', () => {
    const { result } = mountWithUnits('Imperial')
    expect(result.areaUnit.value).toBe('ft²')
  })

  it('areaUnit updates reactively when state changes', async () => {
    const { result, state } = mountWithUnits('SI')
    expect(result.areaUnit.value).toBe('m²')
    state.value = { ...state.value, units: 'Imperial' }
    await Promise.resolve()
    expect(result.areaUnit.value).toBe('ft²')
  })
})
