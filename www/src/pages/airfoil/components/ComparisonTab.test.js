import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ComparisonTab from './ComparisonTab.vue'
import { AIRFOIL_KEY } from '../composables/useAirfoil'
import { APP_STATE_KEY } from '@/pages/index/composables/useAppState'

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

function makeAppStateProvide(overrides = {}) {
  const state = ref({ comparisonX: 'cruiseAoa', comparisonY: 'cruiseCl', ...overrides })
  return {
    [APP_STATE_KEY]: {
      getState: () => state.value,
      setState: (partial) => { state.value = { ...state.value, ...partial } },
    },
  }
}

function mountTab(props = {}, stateOverrides = {}) {
  return mount(ComparisonTab, {
    props,
    global: {
      provide: {
        ...makeAirfoilProvide(),
        ...makeAppStateProvide(stateOverrides),
      },
      stubs: STUBS,
    },
  })
}

describe('ComparisonTab', () => {
  it('mounts without error', () => {
    expect(() => mountTab()).not.toThrow()
  })

  it('shows a prompt message when targetCl is null and cruise metrics selected', () => {
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

  it('does not render the ComparisonChart when targetCl is null and cruise metrics selected', () => {
    const wrapper = mountTab({ targetCl: null })
    expect(wrapper.find('.stub-comparison-chart').exists()).toBe(false)
  })

  it('renders the ComparisonChart for stall metrics even when targetCl is null', () => {
    const wrapper = mountTab({ targetCl: null }, { comparisonX: 'stallAoa', comparisonY: 'stallCl' })
    expect(wrapper.find('.stub-comparison-chart').exists()).toBe(true)
  })

  it('renders X and Y axis metric selects', () => {
    const wrapper = mountTab()
    expect(wrapper.findAll('select')).toHaveLength(2)
  })

  it('metric selects contain all sixteen metric options', () => {
    const wrapper = mountTab()
    const options = wrapper.findAll('select')[0].findAll('option').map((o) => o.element.value)
    expect(options).toContain('cruiseCl')
    expect(options).toContain('cruiseAoa')
    expect(options).toContain('cruiseCd')
    expect(options).toContain('cruiseCm')
    expect(options).toContain('stallAoa')
    expect(options).toContain('stallCl')
    expect(options).toContain('stallCd')
    expect(options).toContain('stallCm')
    expect(options).toContain('landingAoa')
    expect(options).toContain('landingCl')
    expect(options).toContain('landingCd')
    expect(options).toContain('landingCm')
    expect(options).toContain('cruiseSpeed')
    expect(options).toContain('stallSpeed')
    expect(options).toContain('landingSpeed')
    expect(options).toContain('cruiseDeltaAoA')
    expect(options).toHaveLength(16)
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

  it('passes stall axis label when stall metric selected', async () => {
    const wrapper = mountTab({ targetCl: null }, { comparisonX: 'stallAoa', comparisonY: 'stallCl' })
    const chart = wrapper.findComponent({ name: 'ComparisonChart' })
    expect(chart.props('xLabel')).toBe('Stall Angle of Attack (°)')
    expect(chart.props('yLabel')).toBe('Stall Lift Coefficient (CL)')
  })

  it('passes landing axis label when landing metric selected', async () => {
    const wrapper = mountTab({ targetCl: null }, { comparisonX: 'landingAoa', comparisonY: 'landingCl' })
    const chart = wrapper.findComponent({ name: 'ComparisonChart' })
    expect(chart.props('xLabel')).toBe('Landing Angle of Attack (°)')
    expect(chart.props('yLabel')).toBe('Landing Lift Coefficient (CL)')
  })

  it('passes cruise delta AoA axis label to ComparisonChart', async () => {
    const wrapper = mountTab({ targetCl: 0.8 })
    const xSelect = wrapper.findAll('select')[0]
    await xSelect.setValue('cruiseDeltaAoA')
    const chart = wrapper.findComponent({ name: 'ComparisonChart' })
    expect(chart.props('xLabel')).toBe('Cruise ΔAoA (°)')
  })

  it('does not render chart when cruiseDeltaAoA is selected and targetCl is null', () => {
    const wrapper = mountTab({ targetCl: null }, { comparisonX: 'cruiseDeltaAoA', comparisonY: 'stallCl' })
    expect(wrapper.find('.stub-comparison-chart').exists()).toBe(false)
  })

  it('reads initial x/y metric from app state', () => {
    const wrapper = mountTab({}, { comparisonX: 'stallCd', comparisonY: 'landingCm' })
    const [xSel, ySel] = wrapper.findAll('select')
    expect(xSel.element.value).toBe('stallCd')
    expect(ySel.element.value).toBe('landingCm')
  })

  it('does not render the chart when cruiseSpeed is selected and targetCl is null', () => {
    const wrapper = mountTab({ targetCl: null }, { comparisonX: 'cruiseSpeed', comparisonY: 'stallSpeed' })
    expect(wrapper.find('.stub-comparison-chart').exists()).toBe(false)
  })

  it('renders chart for stallSpeed metric when targetCl is null but wingLoading is set', () => {
    const wrapper = mountTab(
      { targetCl: null },
      { comparisonX: 'stallSpeed', comparisonY: 'stallCl', units: 'SI', wingLoading: 50, siteAltitude: 0 }
    )
    expect(wrapper.find('.stub-comparison-chart').exists()).toBe(true)
  })

  it('speed axis label includes speed unit', async () => {
    const wrapper = mountTab(
      { targetCl: 0.8 },
      { comparisonX: 'stallSpeed', comparisonY: 'stallCl', units: 'SI', wingLoading: 50, siteAltitude: 0 }
    )
    const chart = wrapper.findComponent({ name: 'ComparisonChart' })
    expect(chart.props('xLabel')).toContain('m/s')
  })
})
