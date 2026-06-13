import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ComparisonChart from './ComparisonChart.vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'

const MOCK_DATA = [
  { profileName: 'E168 (12%)', x: 3.5,  y: 0.8, isSelected: true  },
  { profileName: 'E169 (14%)', x: 4.0,  y: 0.9, isSelected: false },
  { profileName: 'NACA 2412',  x: 3.8,  y: 0.85, isSelected: false },
]

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
  return mount(ComparisonChart, {
    props: {
      data:   MOCK_DATA,
      xLabel: 'Cruise AoA',
      yLabel: 'Cruise CL',
      ...props,
    },
    global: { provide: { [SET_ERROR_KEY]: setError } },
  })
}

describe('ComparisonChart', () => {
  it('mounts without error', () => {
    expect(() => mountChart()).not.toThrow()
  })

  it('renders a container div', () => {
    const wrapper = mountChart()
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('renders an svg element', () => {
    expect(mountChart().find('svg').exists()).toBe(true)
  })

  it('mounts without error when data is empty', () => {
    expect(() => mountChart({ data: [] })).not.toThrow()
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

  it('calls setError and does not crash when draw() throws', async () => {
    const setError = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb) { this._cb = cb }
      observe() { this._cb([{ contentRect: { width: 400, height: 300 } }]) }
      disconnect() {}
    })
    // Non-enumerable getter: Vue test-utils deep traversal uses Object.keys()
    // so it skips non-enumerable props; d3's accessor d => d.x still triggers it.
    const badItem = { profileName: 'Bad', y: 0.5, isSelected: false }
    Object.defineProperty(badItem, 'x', {
      get() { throw new Error('x access failed') },
      enumerable: false,
    })
    const wrapper = mountChart({ data: [badItem] }, setError)
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(setError).toHaveBeenCalledOnce()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
