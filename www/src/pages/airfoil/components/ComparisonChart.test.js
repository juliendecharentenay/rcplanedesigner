import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ComparisonChart from './ComparisonChart.vue'

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

function mountChart(props = {}) {
  return mount(ComparisonChart, {
    props: {
      data:   MOCK_DATA,
      xLabel: 'Cruise AoA',
      yLabel: 'Cruise CL',
      ...props,
    },
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
})
