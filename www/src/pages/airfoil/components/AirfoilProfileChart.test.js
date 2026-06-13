import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AirfoilProfileChart from './AirfoilProfileChart.vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'

const MOCK_AIRFOIL = {
  profileName: 'E168 (12.45%)',
  zeroLiftAoA: -2,
  stallAoa: 13,
  stallCl: 1.2,
  stallCd: 0.04,
  stallCm: -0.08,
  landingAoa: 10,
  landingCl: 0.83,
  coord: {
    x: [1.0, 0.5, 0.0, 0.5, 1.0],
    y: [0.0, 0.05, 0.0, -0.05, 0.0],
  },
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe()    {}
    unobserve()  {}
    disconnect() {}
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountChart(props = {}, setError = vi.fn()) {
  return mount(AirfoilProfileChart, {
    props,
    global: { provide: { [SET_ERROR_KEY]: setError } },
  })
}

describe('AirfoilProfileChart', () => {
  it('mounts without error', () => {
    expect(() => mountChart()).not.toThrow()
  })

  it('renders a container div', () => {
    const wrapper = mountChart()
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('does not render an svg when airfoil is null', () => {
    expect(mountChart({ airfoil: null }).find('svg').exists()).toBe(false)
  })

  it('renders an svg when an airfoil is provided', () => {
    expect(mountChart({ airfoil: MOCK_AIRFOIL }).find('svg').exists()).toBe(true)
  })

  it('sets up a ResizeObserver on mount', () => {
    const observe = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      observe = observe
      disconnect() {}
    })
    mountChart()
    expect(observe).toHaveBeenCalledOnce()
  })

  it('accepts targetCl prop without error', () => {
    expect(() => mountChart({ airfoil: MOCK_AIRFOIL, targetCl: 4.5 })).not.toThrow()
  })

  it('accepts null targetCl without error', () => {
    expect(() => mountChart({ airfoil: MOCK_AIRFOIL, targetCl: null })).not.toThrow()
  })

  it('calls setError and does not crash when draw() throws', async () => {
    const setError = vi.fn()
    // ResizeObserver that fires immediately with a non-zero size so draw() runs
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb) { this._cb = cb }
      observe() {
        this._cb([{ contentRect: { width: 400, height: 300 } }])
      }
      disconnect() {}
    })
    const badAirfoil = {
      profileName: 'Bad',
      zeroLiftAoA: -2,
      stallAoa: 13,
      landingAoa: 10,
      coord: { x: [0, 1], y: [0, 0] },
      getCruiseConditions: () => { throw new Error('draw failed') },
    }
    const wrapper = mountChart({ airfoil: badAirfoil }, setError)
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(setError).toHaveBeenCalledOnce()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
