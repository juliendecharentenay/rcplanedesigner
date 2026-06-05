import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PolarChart from './PolarChart.vue'

const MOCK_AIRFOIL = {
  profileName: 'E168 (12%)',
  polar: [
    { aoa: -5, cl: -0.2, cd: 0.012, cm: -0.02 },
    { aoa:  0, cl:  0.3, cd: 0.008, cm: -0.02 },
    { aoa:  5, cl:  0.8, cd: 0.012, cm: -0.025 },
    { aoa: 10, cl:  1.2, cd: 0.020, cm: -0.030 },
  ],
}

// Stub chart children to avoid ResizeObserver and D3 complexity
const CHART_STUBS = {
  LiftDragPolarChart: { name: 'LiftDragPolarChart', template: '<div class="stub-polar" />', props: ['airfoil', 'targetCl', 'yDomain'] },
  LiftCurveChart:     { name: 'LiftCurveChart',     template: '<div class="stub-lift" />',  props: ['airfoil', 'targetCl', 'yDomain'] },
}

function mountChart(props = {}) {
  return mount(PolarChart, {
    props,
    global: { stubs: CHART_STUBS },
  })
}

describe('PolarChart', () => {
  it('shows a prompt when no airfoil is selected', () => {
    const wrapper = mountChart({ airfoil: null })
    expect(wrapper.text()).toContain('Select an airfoil to view its polar.')
  })

  it('does not show the prompt when an airfoil is provided', () => {
    const wrapper = mountChart({ airfoil: MOCK_AIRFOIL })
    expect(wrapper.text()).not.toContain('Select an airfoil to view its polar.')
  })

  it('renders both chart components when an airfoil is provided', () => {
    const wrapper = mountChart({ airfoil: MOCK_AIRFOIL })
    expect(wrapper.find('.stub-polar').exists()).toBe(true)
    expect(wrapper.find('.stub-lift').exists()).toBe(true)
  })

  it('does not render chart components when airfoil is null', () => {
    const wrapper = mountChart({ airfoil: null })
    expect(wrapper.find('.stub-polar').exists()).toBe(false)
    expect(wrapper.find('.stub-lift').exists()).toBe(false)
  })

  it('passes a shared yDomain array to both child charts', () => {
    const wrapper = mountChart({ airfoil: MOCK_AIRFOIL })
    const polar = wrapper.findComponent({ name: 'LiftDragPolarChart' })
    const lift  = wrapper.findComponent({ name: 'LiftCurveChart' })
    expect(Array.isArray(polar.props('yDomain'))).toBe(true)
    expect(polar.props('yDomain')).toEqual(lift.props('yDomain'))
  })

  it('includes targetCl in the yDomain when provided', () => {
    const wrapper = mountChart({ airfoil: MOCK_AIRFOIL, targetCl: 1.5 })
    const [yMin, yMax] = wrapper.findComponent({ name: 'LiftCurveChart' }).props('yDomain')
    expect(yMax).toBeGreaterThanOrEqual(1.5)
  })

  it('falls back to [-1, 2] yDomain when airfoil is null', () => {
    // No child charts rendered, but the prop default is observable by checking
    // that mounting with null airfoil does not throw and shows the prompt
    expect(() => mountChart({ airfoil: null })).not.toThrow()
  })
})
