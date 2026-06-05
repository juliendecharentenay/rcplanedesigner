import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParameterPanel from './ParameterPanel.vue'
import { APP_STATE_KEY } from '@/pages/index/composables/useAppState'
import { FOCUSED_PARAM_KEY } from '@/pages/index/composables/useFocusedParam'
import { AIRFOIL_KEY } from '../composables/useAirfoil'

const MOCK_AIRFOIL_LIST = [
  { value: 'E168 (12%)', label: 'E168 (12%)' },
  { value: 'E169 (14%)', label: 'E169 (14%)' },
]

function makeProvide(stateOverrides = {}) {
  const state = ref({
    units: 'SI',
    siteAltitude: 0,
    wingLoading: 30,
    cruisingSpeed: 13,
    ...stateOverrides,
  })
  return {
    [APP_STATE_KEY]: {
      getState: () => state.value,
      setState: vi.fn((partial) => { state.value = { ...state.value, ...partial } }),
    },
    [FOCUSED_PARAM_KEY]: {
      focusedKey: ref(null),
      focusedContent: ref(null),
      register: vi.fn(),
      setFocused: vi.fn(),
      clearFocused: vi.fn(),
    },
    [AIRFOIL_KEY]: {
      airfoilList: MOCK_AIRFOIL_LIST,
      selectedAirfoilData: ref({ profileName: 'E168 (12%)' }),
      setSelectedAirfoil: vi.fn(),
    },
  }
}

function mountPanel(stateOverrides = {}) {
  const provide = makeProvide(stateOverrides)
  const wrapper = mount(ParameterPanel, { global: { provide } })
  return { wrapper, provide }
}

describe('ParameterPanel', () => {
  it('renders an <aside> element with a "Parameters" heading', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find('aside').exists()).toBe(true)
    expect(wrapper.text()).toContain('Parameters')
  })

  it('registers all five parameter keys on mount', () => {
    const provide = makeProvide()
    mount(ParameterPanel, { global: { provide } })
    const keys = provide[FOCUSED_PARAM_KEY].register.mock.calls.map((c) => c[0])
    expect(keys).toContain('airfoil')
    expect(keys).toContain('units')
    expect(keys).toContain('siteAltitude')
    expect(keys).toContain('wingLoading')
    expect(keys).toContain('cruisingSpeed')
  })

  it('calls setFocused("airfoil") when the airfoil row receives focus', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.findAll('[data-testid]').at(0)
    // Focus the first focusin div (airfoil row)
    await wrapper.find('aside > div > div').trigger('focusin')
    expect(provide[FOCUSED_PARAM_KEY].setFocused).toHaveBeenCalledWith('airfoil')
  })

  it('calls setFocused("units") when the units row receives focus', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    const focusDivs = wrapper.findAll('aside > div > div')
    await focusDivs[1].trigger('focusin')
    expect(provide[FOCUSED_PARAM_KEY].setFocused).toHaveBeenCalledWith('units')
  })

  it('renders SI and Imperial options in the units select', () => {
    const { wrapper } = mountPanel()
    const options = wrapper.findAll('select option').map((o) => o.element.value)
    expect(options).toContain('SI')
    expect(options).toContain('Imperial')
  })

  it('reflects the current units value in the select', () => {
    const { wrapper } = mountPanel({ units: 'Imperial' })
    const selects = wrapper.findAll('select')
    const unitsSelect = selects.find((s) =>
      Array.from(s.element.options).some((o) => o.value === 'Imperial'),
    )
    expect(unitsSelect.element.value).toBe('Imperial')
  })

  it('calls setState when the units select changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    const selects = wrapper.findAll('select')
    const unitsSelect = selects.find((s) =>
      Array.from(s.element.options).some((o) => o.value === 'Imperial'),
    )
    await unitsSelect.setValue('Imperial')
    expect(provide[APP_STATE_KEY].setState).toHaveBeenCalledWith({ units: 'Imperial' })
  })

  it('reflects the current siteAltitude in its input', () => {
    const { wrapper } = mountPanel({ siteAltitude: 500 })
    const inputs = wrapper.findAll('input[type="number"]')
    expect(Number(inputs[0].element.value)).toBe(500)
  })

  it('calls setState with a numeric siteAltitude when the input changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.findAll('input[type="number"]')[0].setValue('1200')
    expect(provide[APP_STATE_KEY].setState).toHaveBeenCalledWith({ siteAltitude: 1200 })
  })

  it('calls setState with a numeric wingLoading when the input changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.findAll('input[type="number"]')[1].setValue('45')
    expect(provide[APP_STATE_KEY].setState).toHaveBeenCalledWith({ wingLoading: 45 })
  })

  it('calls setState with a numeric cruisingSpeed when the input changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.findAll('input[type="number"]')[2].setValue('20')
    expect(provide[APP_STATE_KEY].setState).toHaveBeenCalledWith({ cruisingSpeed: 20 })
  })

  it('shows "m" distance unit suffix when units is SI', () => {
    const { wrapper } = mountPanel({ units: 'SI' })
    expect(wrapper.text()).toContain('m')
  })

  it('shows "ft" distance unit suffix when units is Imperial', () => {
    const { wrapper } = mountPanel({ units: 'Imperial' })
    expect(wrapper.text()).toContain('ft')
  })

  it('calls clearFocused when focus leaves the panel', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.find('aside').trigger('focusout', { relatedTarget: document.body })
    expect(provide[FOCUSED_PARAM_KEY].clearFocused).toHaveBeenCalled()
  })

  it('calls setSelectedAirfoil when the airfoil select changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    const airfoilSelect = wrapper.findAll('select').find((s) =>
      Array.from(s.element.options).some((o) => o.value === 'E168 (12%)'),
    )
    await airfoilSelect.setValue('E169 (14%)')
    expect(provide[AIRFOIL_KEY].setSelectedAirfoil).toHaveBeenCalledWith('E169 (14%)')
  })
})
