import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParameterPanel from './ParameterPanel.vue'
import { APP_STATE_KEY } from '../composables/useAppState'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'

function makeFocusedParamProvide() {
  return {
    focusedKey: ref(null),
    focusedContent: ref(null),
    register: vi.fn(),
    setFocused: vi.fn(),
    clearFocused: vi.fn(),
  }
}

function makeProvide(stateOverrides = {}) {
  const state = ref({ units: 'SI', siteAltitude: 0, planeType: 'Trainer', ...stateOverrides })
  return {
    [APP_STATE_KEY]: {
      getState: () => state.value,
      setState: vi.fn((partial) => { state.value = { ...state.value, ...partial } }),
    },
    [FOCUSED_PARAM_KEY]: makeFocusedParamProvide(),
  }
}

function mountPanel(stateOverrides = {}) {
  return mount(ParameterPanel, {
    global: { provide: makeProvide(stateOverrides) },
  })
}

describe('ParameterPanel', () => {
  it('renders an <aside> element', () => {
    expect(mountPanel().find('aside').exists()).toBe(true)
  })

  it('displays the "Parameters" section heading', () => {
    expect(mountPanel().text()).toContain('Parameters')
  })

  it('is absolutely positioned with z-index class for SVG overlay', () => {
    const aside = mountPanel().find('aside')
    expect(aside.classes()).toContain('absolute')
    expect(aside.classes()).toContain('z-10')
  })

  it('registers contextual content for all three parameters on mount', () => {
    const provide = makeProvide()
    mount(ParameterPanel, { global: { provide } })
    const registeredKeys = provide[FOCUSED_PARAM_KEY].register.mock.calls.map((c) => c[0])
    expect(registeredKeys).toContain('planeType')
    expect(registeredKeys).toContain('units')
    expect(registeredKeys).toContain('siteAltitude')
  })

  it('calls setFocused with "planeType" when its field receives focus', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.find('select').trigger('focusin')
    expect(provide[FOCUSED_PARAM_KEY].setFocused).toHaveBeenCalledWith('planeType')
  })

  it('renders the Plane Type select with all three options', () => {
    const options = mountPanel().findAll('select option').map((o) => o.element.value)
    expect(options).toContain('Trainer')
    expect(options).toContain('Glider')
    expect(options).toContain('Acrobatic')
  })

  it('reflects the current planeType value in the select', () => {
    expect(mountPanel({ planeType: 'Glider' }).findAll('select')[0].element.value).toBe('Glider')
  })

  it('calls setState when planeType changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.findAll('select')[0].setValue('Acrobatic')
    expect(provide[APP_STATE_KEY].setState).toHaveBeenCalledWith({ planeType: 'Acrobatic' })
  })

  it('renders the Units select with SI and Imperial options', () => {
    const options = mountPanel().findAll('select option').map((o) => o.element.value)
    expect(options).toContain('SI')
    expect(options).toContain('Imperial')
  })

  it('reflects the current units value in the select', () => {
    expect(mountPanel({ units: 'Imperial' }).findAll('select')[1].element.value).toBe('Imperial')
  })

  it('calls setState when units changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.findAll('select')[1].setValue('Imperial')
    expect(provide[APP_STATE_KEY].setState).toHaveBeenCalledWith({ units: 'Imperial' })
  })

  it('renders the site altitude number input', () => {
    expect(mountPanel().find('input[type="number"]').exists()).toBe(true)
  })

  it('reflects the current siteAltitude value in the input', () => {
    expect(Number(mountPanel({ siteAltitude: 500 }).find('input[type="number"]').element.value)).toBe(500)
  })

  it('calls setState when siteAltitude changes', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.find('input[type="number"]').setValue('1200')
    expect(provide[APP_STATE_KEY].setState).toHaveBeenCalledWith({ siteAltitude: 1200 })
  })

  it('shows "m" suffix when units is SI', () => {
    expect(mountPanel({ units: 'SI' }).text()).toContain('m')
  })

  it('shows "ft" suffix when units is Imperial', () => {
    expect(mountPanel({ units: 'Imperial' }).text()).toContain('ft')
  })
})
