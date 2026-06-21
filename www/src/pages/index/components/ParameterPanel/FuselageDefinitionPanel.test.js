import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import FuselageDefinitionPanel from './FuselageDefinitionPanel.vue'
import { APP_STATE_KEY } from '../../composables/useAppState'
import { AIRFOILS_KEY } from '../../composables/useAirfoils'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { FOCUSED_PARAM_KEY } from '../../composables/useFocusedParam.js'

// Rectangular wing: span=1.5, rc=0.3, tc=0.3 — gives mac=0.3, wingArea=0.45
const DEFAULT_STATE = {
  units:          'SI',
  siteAltitude:   0,
  wingLoading:    45,
  cruisingSpeed:  15,
  planeType:      'Trainer',
  airfoilProfile: null,
  wingSpan:       1.5,
  rootChord:      0.3,
  tipChord:       0.3,
  sweepAngle:     0,
  fuselageWidth:  0.12,
  frontFuselage:  0,      // sentinel — use computed default (2×MAC)
  rearFuselage:   0,      // sentinel — use computed default (3×MAC)
  tailSpan:       0,      // sentinel — use computed default
  tailChord:      0,      // sentinel — use computed default
  tailAirfoil:    'E168  (12.45%)',
}

// Mock airfoils: minimal array with two entries
const MOCK_AIRFOILS = [
  { profileName: 'E168  (12.45%)' },
  { profileName: 'NACA 2412' },
]

function makeProvide(stateOverrides = {}) {
  const state = ref({ ...DEFAULT_STATE, ...stateOverrides })
  const setState = vi.fn((partial) => { state.value = { ...state.value, ...partial } })
  const setError = vi.fn()
  const focusedParam = { register: vi.fn(), setFocused: vi.fn(), clearFocused: vi.fn() }
  return {
    provide: {
      [APP_STATE_KEY]:   { getState: () => state.value, setState },
      [AIRFOILS_KEY]:    { airfoils: MOCK_AIRFOILS },
      [SET_ERROR_KEY]:   setError,
      [FOCUSED_PARAM_KEY]: focusedParam,
    },
    state,
    setState,
    setError,
    focusedParam,
  }
}

function mountPanel(stateOverrides = {}) {
  const ctx = makeProvide(stateOverrides)
  const wrapper = mount(FuselageDefinitionPanel, { global: { provide: ctx.provide } })
  return { wrapper, ...ctx }
}

describe('FuselageDefinitionPanel', () => {
  // ── Inputs render ───────────────────────────────────────────────────────────

  it('renders number inputs for fuselageWidth, frontFuselage, rearFuselage, tailSpan, tailChord', () => {
    const { wrapper } = mountPanel()
    const inputs = wrapper.findAll('input[type="number"]')
    expect(inputs.length).toBe(5)
  })

  it('renders a select element for tail airfoil', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('airfoil select has options from the airfoils list', () => {
    const { wrapper } = mountPanel()
    const options = wrapper.findAll('option')
    expect(options.length).toBe(MOCK_AIRFOILS.length)
    expect(options[0].element.value).toBe('E168  (12.45%)')
  })

  it('airfoil select defaults to Eppler 168', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find('select').element.value).toBe('E168  (12.45%)')
  })

  it('fuselageWidth input reflects state value', () => {
    const { wrapper } = mountPanel({ fuselageWidth: 0.15 })
    const inputs = wrapper.findAll('input[type="number"]')
    expect(Number(inputs[0].element.value)).toBeCloseTo(0.15, 4)
  })

  // ── Sentinel defaults resolution ────────────────────────────────────────────

  it('front fuselage input shows 2×MAC when frontFuselage state is 0', () => {
    // mac for rect wing (rc=tc=0.3) = 0.3; default = 2×0.3 = 0.6
    const { wrapper } = mountPanel({ frontFuselage: 0, rootChord: 0.3, tipChord: 0.3 })
    const inputs = wrapper.findAll('input[type="number"]')
    // second input is front fuselage
    expect(Number(inputs[1].element.value)).toBeCloseTo(0.6, 3)
  })

  it('rear fuselage input shows 3×MAC when rearFuselage state is 0', () => {
    const { wrapper } = mountPanel({ rearFuselage: 0, rootChord: 0.3, tipChord: 0.3 })
    const inputs = wrapper.findAll('input[type="number"]')
    expect(Number(inputs[2].element.value)).toBeCloseTo(0.9, 3)
  })

  it('tail span input shows computed default when tailSpan state is 0', () => {
    // wingArea = 0.3 * 1.5 = 0.45, defaultTailSpan = sqrt(5 * 0.2 * 0.45) = sqrt(0.45) ≈ 0.6708
    const { wrapper } = mountPanel({ tailSpan: 0 })
    const inputs = wrapper.findAll('input[type="number"]')
    expect(Number(inputs[3].element.value)).toBeCloseTo(Math.sqrt(5 * 0.2 * 0.45), 3)
  })

  it('tail chord input shows computed default when tailChord state is 0', () => {
    const { wrapper } = mountPanel({ tailChord: 0 })
    const inputs = wrapper.findAll('input[type="number"]')
    // defaultTailChord = (0.2 * 0.45) / defaultTailSpan
    const tailSpan = Math.sqrt(5 * 0.2 * 0.45)
    const tailChord = (0.2 * 0.45) / tailSpan
    expect(Number(inputs[4].element.value)).toBeCloseTo(tailChord, 3)
  })

  it('front fuselage input shows stored value when frontFuselage is non-zero', () => {
    const { wrapper } = mountPanel({ frontFuselage: 0.8 })
    const inputs = wrapper.findAll('input[type="number"]')
    expect(Number(inputs[1].element.value)).toBeCloseTo(0.8, 3)
  })

  // ── State updates on input change ───────────────────────────────────────────

  it('fuselageWidth input calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    const input = wrapper.findAll('input[type="number"]')[0]
    await input.setValue('0.2')
    expect(setState).toHaveBeenCalledWith(expect.objectContaining({ fuselageWidth: 0.2 }))
  })

  it('frontFuselage input calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    const input = wrapper.findAll('input[type="number"]')[1]
    await input.setValue('0.7')
    expect(setState).toHaveBeenCalledWith(expect.objectContaining({ frontFuselage: 0.7 }))
  })

  it('rearFuselage input calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    const input = wrapper.findAll('input[type="number"]')[2]
    await input.setValue('1.1')
    expect(setState).toHaveBeenCalledWith(expect.objectContaining({ rearFuselage: 1.1 }))
  })

  it('tailAirfoil select calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    const select = wrapper.find('select')
    await select.setValue('NACA 2412')
    expect(setState).toHaveBeenCalledWith(expect.objectContaining({ tailAirfoil: 'NACA 2412' }))
  })

  // ── Computed outputs ────────────────────────────────────────────────────────

  it('displays tail area (tail span × tail chord) in SI', () => {
    const tailSpan  = Math.sqrt(5 * 0.2 * 0.45)
    const tailChord = (0.2 * 0.45) / tailSpan
    const tailArea  = tailSpan * tailChord  // ≈ 0.09

    const { wrapper } = mountPanel()
    const outputText = wrapper.text()
    // The tail area value should appear somewhere in the output
    expect(outputText).toContain(tailArea.toFixed(4))
  })

  it('displays tail moment arm in SI', () => {
    // rearFuselage default = 3×0.3 = 0.9; tailChord default ≈ computed
    const tailSpan  = Math.sqrt(5 * 0.2 * 0.45)
    const tailChord = (0.2 * 0.45) / tailSpan
    const rearLength  = 3 * 0.3  // 0.9
    const momentArm   = rearLength - 0.25 * tailChord

    const { wrapper } = mountPanel()
    expect(wrapper.text()).toContain(momentArm.toFixed(3))
  })

  it('shows "—" for tail area when wing geometry is zero', () => {
    const { wrapper } = mountPanel({ wingSpan: 0, rootChord: 0, tipChord: 0 })
    expect(wrapper.text()).toContain('—')
  })

  // ── Navigation ──────────────────────────────────────────────────────────────

  it('emits navigate with wing-definition when back button is clicked', async () => {
    const { wrapper } = mountPanel()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
    expect(wrapper.emitted('navigate')[0]).toEqual(['wing-definition'])
  })

  // ── Unit handling ───────────────────────────────────────────────────────────

  it('distanceUnit suffix appears on inputs in SI', () => {
    const { wrapper } = mountPanel({ units: 'SI' })
    // BaseInput appends a suffix span — check for 'm' unit label in template text
    expect(wrapper.text()).toContain('m')
  })

  it('areaUnit appears in tail area label in SI', () => {
    const { wrapper } = mountPanel({ units: 'SI' })
    expect(wrapper.text()).toContain('m²')
  })

  // ── Error handling ──────────────────────────────────────────────────────────

  it('injects SET_ERROR_KEY and does not throw when provided', () => {
    expect(() => mountPanel()).not.toThrow()
  })

  it('registers all expected focused param keys', () => {
    const ctx = makeProvide()
    mount(FuselageDefinitionPanel, { global: { provide: ctx.provide } })
    const registered = ctx.focusedParam.register.mock.calls.map(c => c[0])
    expect(registered).toContain('fuselageWidth')
    expect(registered).toContain('frontFuselage')
    expect(registered).toContain('rearFuselage')
    expect(registered).toContain('tailSpan')
    expect(registered).toContain('tailChord')
    expect(registered).toContain('tailAirfoil')
  })
})
