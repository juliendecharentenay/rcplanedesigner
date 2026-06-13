import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import LiftCurveChart from './LiftCurveChart.vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'

const MOCK_AIRFOIL = {
  profileName: 'E168 (12%)',
  polar: [
    { aoa: -5, cl: -0.2, cd: 0.012, cm: -0.02 },
    { aoa:  0, cl:  0.3, cd: 0.008, cm: -0.02 },
    { aoa:  5, cl:  0.8, cd: 0.012, cm: -0.025 },
    { aoa: 10, cl:  1.2, cd: 0.020, cm: -0.030 },
  ],
}

const DEFAULT_Y_DOMAIN = [-1, 2]

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
  return mount(LiftCurveChart, {
    props: { yDomain: DEFAULT_Y_DOMAIN, ...props },
    global: { provide: { [SET_ERROR_KEY]: setError } },
  })
}

describe('LiftCurveChart', () => {
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

  it('accepts cruiseAoa prop without error', () => {
    expect(() => mountChart({ airfoil: MOCK_AIRFOIL, cruiseAoa: 3.2 })).not.toThrow()
  })

  it('accepts null cruiseAoa without error', () => {
    expect(() => mountChart({ airfoil: MOCK_AIRFOIL, cruiseAoa: null })).not.toThrow()
  })

  it('calls setError and does not crash when draw() throws', async () => {
    const setError = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb) { this._cb = cb }
      observe() { this._cb([{ contentRect: { width: 400, height: 300 } }]) }
      disconnect() {}
    })
    const badAirfoil = {
      profileName: 'Bad',
      polar: null, // will cause d3 operations to fail
    }
    const wrapper = mountChart({ airfoil: badAirfoil }, setError)
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(setError).toHaveBeenCalledOnce()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
