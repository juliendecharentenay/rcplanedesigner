import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ComparisonTab from './ComparisonTab.vue'
import { AIRFOIL_KEY } from '../composables/useAirfoil'

// Stub ComparisonChart to isolate ComparisonTab logic from D3/ResizeObserver
const STUBS = {
  ComparisonChart: { name: 'ComparisonChart', template: '<div class="stub-comparison-chart" />', props: ['data', 'xLabel', 'yLabel'] },
}

function makeAirfoilProvide(profileName = 'E168 (12%)') {
  return {
    [AIRFOIL_KEY]: {
      airfoilList: [{ value: profileName, label: profileName }],
      selectedAirfoilData: ref({ profileName }),
      setSelectedAirfoil: vi.fn(),
    },
  }
}

function mountTab(props = {}) {
  return mount(ComparisonTab, {
    props,
    global: {
      provide: makeAirfoilProvide(),
      stubs: STUBS,
    },
  })
}

describe('ComparisonTab', () => {
  it('mounts without error', () => {
    expect(() => mountTab()).not.toThrow()
  })

  it('shows a prompt message when targetCl is null', () => {
    const wrapper = mountTab({ targetCl: null })
    expect(wrapper.text()).toContain('Enter wing loading and cruising speed to compare airfoils.')
  })

  it('does not show the prompt when targetCl is provided', () => {
    const wrapper = mountTab({ targetCl: 0.8 })
    expect(wrapper.text()).not.toContain('Enter wing loading and cruising speed')
  })

  it('renders the ComparisonChart when targetCl is provided', () => {
    const wrapper = mountTab({ targetCl: 0.8 })
    expect(wrapper.find('.stub-comparison-chart').exists()).toBe(true)
  })

  it('does not render the ComparisonChart when targetCl is null', () => {
    const wrapper = mountTab({ targetCl: null })
    expect(wrapper.find('.stub-comparison-chart').exists()).toBe(false)
  })

  it('renders X and Y axis metric selects', () => {
    const wrapper = mountTab()
    expect(wrapper.findAll('select')).toHaveLength(2)
  })

  it('metric selects contain all four metric options', () => {
    const wrapper = mountTab()
    const options = wrapper.findAll('select')[0].findAll('option').map((o) => o.element.value)
    expect(options).toContain('cruiseCl')
    expect(options).toContain('cruiseAoa')
    expect(options).toContain('cruiseCd')
    expect(options).toContain('cruiseCm')
  })

  it('passes the correct x-axis label to ComparisonChart when xMetric changes', async () => {
    const wrapper = mountTab({ targetCl: 0.8 })
    const xSelect = wrapper.findAll('select')[0]
    await xSelect.setValue('cruiseCd')
    const chart = wrapper.findComponent({ name: 'ComparisonChart' })
    expect(chart.props('xLabel')).toBe('Drag Coefficient (CD)')
  })

  it('passes the correct y-axis label to ComparisonChart when yMetric changes', async () => {
    const wrapper = mountTab({ targetCl: 0.8 })
    const ySelect = wrapper.findAll('select')[1]
    await ySelect.setValue('cruiseAoa')
    const chart = wrapper.findComponent({ name: 'ComparisonChart' })
    expect(chart.props('yLabel')).toBe('Angle of Attack (°)')
  })
})
