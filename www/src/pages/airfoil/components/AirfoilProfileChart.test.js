import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AirfoilProfileChart from './AirfoilProfileChart.vue'

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

function mountChart(props = {}) {
  return mount(AirfoilProfileChart, { props })
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
})
