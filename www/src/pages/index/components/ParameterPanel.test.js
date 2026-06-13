import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParameterPanel from './ParameterPanel.vue'
import { APP_STATE_KEY } from '../composables/useAppState'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { SET_ERROR_KEY } from '@/composables/useError.js'

const MOCK_AIRFOILS = [
  {
    profileName: 'E168 (12%)',
    zeroLiftAoA: 0,
    stallAoa: 11,
    stallCl: 1.047,
    polar: [],
    getCruiseConditions: () => ({ cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null }),
  },
  {
    profileName: 'E169 (14%)',
    zeroLiftAoA: 0,
    stallAoa: 13,
    stallCl: 1.1,
    polar: [],
    getCruiseConditions: () => ({ cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null }),
  },
]

// Stub WingDefinitionPanel to avoid its dependencies in ParameterPanel tests
vi.mock('./WingDefinitionPanel.vue', () => ({
  default: {
    name: 'WingDefinitionPanel',
    template: '<div data-testid="wing-definition-panel">WingDefinitionPanel stub</div>',
  },
}))

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
  const state = ref({
    units: 'SI',
    siteAltitude: 0,
    planeType: 'Trainer',
    airfoilProfile: '- Select profile -',
    wingLoading: 30,
    cruisingSpeed: 13,
    wingSpan: 0,
    rootChord: 0,
    tipChord: 0,
    sweepAngle: 0,
    ...stateOverrides,
  })
  return {
    [APP_STATE_KEY]: {
      getState: () => state.value,
      setState: vi.fn((partial) => { state.value = { ...state.value, ...partial } }),
    },
    [FOCUSED_PARAM_KEY]: makeFocusedParamProvide(),
    [AIRFOILS_KEY]: { airfoils: MOCK_AIRFOILS },
    [SET_ERROR_KEY]: vi.fn(),
  }
}

function mountPanel(stateOverrides = {}, props = {}) {
  return mount(ParameterPanel, {
    props: { activePanel: 'general', ...props },
    global: { provide: makeProvide(stateOverrides) },
  })
}

describe('ParameterPanel', () => {
  it('renders an <aside> element', () => {
    expect(mountPanel().find('aside').exists()).toBe(true)
  })

  it('displays the "General" section heading', () => {
    expect(mountPanel().text()).toContain('General')
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

  it('renders two select elements', () => {
    expect(mountPanel().findAll('select')).toHaveLength(2)
  })

  it('registers contextual content for airfoilProfile on mount', () => {
    const provide = makeProvide()
    mount(ParameterPanel, { global: { provide } })
    const registeredKeys = provide[FOCUSED_PARAM_KEY].register.mock.calls.map((c) => c[0])
    expect(registeredKeys).toContain('airfoilProfile')
  })

  it('calls setFocused with "airfoilProfile" when its field receives focus', async () => {
    const provide = makeProvide()
    const wrapper = mount(ParameterPanel, { global: { provide } })
    await wrapper.findAll('a')[0].trigger('focusin')
    expect(provide[FOCUSED_PARAM_KEY].setFocused).toHaveBeenCalledWith('airfoilProfile')
  })

  it('reflects current airfoilProfile in the select', () => {
    expect(mountPanel({ airfoilProfile: 'E168 (12%)' }).findAll('a')[0].text()).toBe('E168 (12%)')
  })

  // — Navigation: header dropdown —

  it('header click opens dropdown', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('button[disabled]').exists() || wrapper.text()).toBeTruthy()
    await wrapper.find('div.cursor-pointer').trigger('click')
    expect(wrapper.find('[data-testid="panel-dropdown"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Wing Definition')
  })

  it('header click again closes dropdown', async () => {
    const wrapper = mountPanel()
    await wrapper.find('div.cursor-pointer').trigger('click')
    expect(wrapper.find('[data-testid="panel-dropdown"]').exists()).toBe(true)
    await wrapper.find('div.cursor-pointer').trigger('click')
    expect(wrapper.find('[data-testid="panel-dropdown"]').exists()).toBe(false)
  })

  it('dropdown "Wing Definition" item is disabled when airfoilProfile is null', async () => {
    const wrapper = mountPanel({ airfoilProfile: null, wingLoading: 30, cruisingSpeed: 13 })
    await wrapper.find('div.cursor-pointer').trigger('click')
    const buttons = wrapper.findAll('[data-testid="panel-dropdown"] button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition'))
    expect(wingDefBtn.attributes('disabled')).toBeDefined()
  })

  it('dropdown "Wing Definition" item is disabled when wingLoading is 0', async () => {
    const wrapper = mountPanel({ airfoilProfile: 'E168 (12%)', wingLoading: 0, cruisingSpeed: 13 })
    await wrapper.find('div.cursor-pointer').trigger('click')
    const buttons = wrapper.findAll('[data-testid="panel-dropdown"] button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition'))
    expect(wingDefBtn.attributes('disabled')).toBeDefined()
  })

  it('dropdown "Wing Definition" item is disabled when cruisingSpeed is 0', async () => {
    const wrapper = mountPanel({ airfoilProfile: 'E168 (12%)', wingLoading: 30, cruisingSpeed: 0 })
    await wrapper.find('div.cursor-pointer').trigger('click')
    const buttons = wrapper.findAll('[data-testid="panel-dropdown"] button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition'))
    expect(wingDefBtn.attributes('disabled')).toBeDefined()
  })

  it('dropdown "Wing Definition" item is enabled when all three conditions met', async () => {
    const wrapper = mountPanel({ airfoilProfile: 'E168 (12%)', wingLoading: 30, cruisingSpeed: 13 })
    await wrapper.find('div.cursor-pointer').trigger('click')
    const buttons = wrapper.findAll('[data-testid="panel-dropdown"] button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition'))
    expect(wingDefBtn.attributes('disabled')).toBeUndefined()
  })

  it('clicking disabled "Wing Definition" item does not emit navigate', async () => {
    const wrapper = mountPanel({ airfoilProfile: null, wingLoading: 30, cruisingSpeed: 13 })
    await wrapper.find('div.cursor-pointer').trigger('click')
    const buttons = wrapper.findAll('[data-testid="panel-dropdown"] button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition'))
    await wingDefBtn.trigger('click')
    expect(wrapper.emitted('navigate')).toBeFalsy()
  })

  it('clicking enabled "Wing Definition" item emits navigate with "wing-definition"', async () => {
    const wrapper = mountPanel({ airfoilProfile: 'E168 (12%)', wingLoading: 30, cruisingSpeed: 13 })
    await wrapper.find('div.cursor-pointer').trigger('click')
    const buttons = wrapper.findAll('[data-testid="panel-dropdown"] button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition'))
    await wingDefBtn.trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
    expect(wrapper.emitted('navigate')[0]).toEqual(['wing-definition'])
  })

  it('clicking "General" item in dropdown emits navigate with "general"', async () => {
    const wrapper = mountPanel()
    await wrapper.find('div.cursor-pointer').trigger('click')
    const buttons = wrapper.findAll('[data-testid="panel-dropdown"] button')
    const generalBtn = buttons.find(b => b.text() === 'General')
    await generalBtn.trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
    expect(wrapper.emitted('navigate')[0]).toEqual(['general'])
  })

  it('"Wing Definition →" button is present in General view', () => {
    const wrapper = mountPanel()
    const buttons = wrapper.findAll('button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition →'))
    expect(wingDefBtn).toBeTruthy()
  })

  it('"Wing Definition →" button is disabled when conditions not met', () => {
    const wrapper = mountPanel({ airfoilProfile: null, wingLoading: 0, cruisingSpeed: 0 })
    const buttons = wrapper.findAll('button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition →'))
    expect(wingDefBtn.attributes('disabled')).toBeDefined()
  })

  it('"Wing Definition →" button emits navigate with "wing-definition" when conditions met', async () => {
    const wrapper = mountPanel({ airfoilProfile: 'E168 (12%)', wingLoading: 30, cruisingSpeed: 13 })
    const buttons = wrapper.findAll('button')
    const wingDefBtn = buttons.find(b => b.text().includes('Wing Definition →'))
    await wingDefBtn.trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
    expect(wrapper.emitted('navigate')[0]).toEqual(['wing-definition'])
  })

  it('activePanel="wing-definition" renders WingDefinitionPanel instead of General fields', () => {
    const wrapper = mountPanel({}, { activePanel: 'wing-definition' })
    expect(wrapper.findComponent({name: "WingDefinitionPanel"}).exists()).toBe(true)
    // General panel should not be present
    expect(wrapper.findComponent({name: "GeneralPanel"}).exists()).toBe(false)
  })
})
