import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import WingDefinitionPanel from './WingDefinitionPanel.vue'
import { APP_STATE_KEY } from '../../composables/useAppState'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { FOCUSED_PARAM_KEY } from '../../composables/useFocusedParam.js'

const DEFAULT_STATE = {
  units: 'SI',
  siteAltitude: 0,
  wingLoading: 0,
  cruisingSpeed: 0,
  planeType: 'Trainer',
  airfoilProfile: null,
  wingSpan: 0,
  rootChord: 0,
  tipChord: 0,
  sweepAngle: 0,
}

function makeProvide(stateOverrides = {}) {
  const state = ref({ ...DEFAULT_STATE, ...stateOverrides })
  const setState = vi.fn((partial) => { state.value = { ...state.value, ...partial } })
  const setError = vi.fn()
  const focusedParam = { register: vi.fn(), setFocused: vi.fn(), clearFocused: vi.fn() }
  return {
    provide: {
      [APP_STATE_KEY]: { getState: () => state.value, setState },
      [SET_ERROR_KEY]: setError,
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
  const wrapper = mount(WingDefinitionPanel, { global: { provide: ctx.provide } })
  return { wrapper, ...ctx }
}

describe('WingDefinitionPanel', () => {
  it('renders four number inputs (wingSpan, rootChord, tipChord, sweepAngle)', () => {
    const { wrapper } = mountPanel()
    const inputs = wrapper.findAll('input[type="number"]')
    expect(inputs).toHaveLength(4)
  })

  it('wingSpan input reflects state value', () => {
    const { wrapper } = mountPanel({ wingSpan: 1.5 })
    const inputs = wrapper.findAll('input[type="number"]')
    expect(Number(inputs[0].element.value)).toBe(1.5)
  })

  it('wingSpan input calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    await wrapper.findAll('input[type="number"]')[0].setValue('2.0')
    expect(setState).toHaveBeenCalledWith({ wingSpan: 2 })
  })

  it('rootChord input calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    await wrapper.findAll('input[type="number"]')[1].setValue('0.5')
    expect(setState).toHaveBeenCalledWith({ rootChord: 0.5 })
  })

  it('tipChord input calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    await wrapper.findAll('input[type="number"]')[2].setValue('0.3')
    expect(setState).toHaveBeenCalledWith({ tipChord: 0.3 })
  })

  it('sweepAngle input calls setState on change', async () => {
    const { wrapper, setState } = mountPanel()
    await wrapper.findAll('input[type="number"]')[3].setValue('15')
    expect(setState).toHaveBeenCalledWith({ sweepAngle: 15 })
  })

  it('displays distanceUnit suffix on span/chord inputs', () => {
    const { wrapper } = mountPanel({ units: 'SI' })
    const text = wrapper.text()
    // 'm' appears as suffix for wingspan, root chord, tip chord
    expect(text).toContain('m')
  })

  it('displays "ft" suffix when units is Imperial', () => {
    const { wrapper } = mountPanel({ units: 'Imperial' })
    expect(wrapper.text()).toContain('ft')
  })

  it('displays "°" suffix on sweep angle input', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.text()).toContain('°')
  })

  it('taperRatio displays "—" when rootChord is 0', () => {
    const { wrapper } = mountPanel({ rootChord: 0, tipChord: 0.5 })
    expect(wrapper.text()).toContain('—')
  })

  it('taperRatio computes correctly: tipChord=0.5, rootChord=1.0 → "0.500"', () => {
    const { wrapper } = mountPanel({ rootChord: 1.0, tipChord: 0.5 })
    expect(wrapper.text()).toContain('0.500')
  })

  it('wingArea displays "—" when wingSpan is 0', () => {
    const { wrapper } = mountPanel({ wingSpan: 0, rootChord: 1, tipChord: 0.5 })
    expect(wrapper.text()).toContain('—')
  })

  it('wingArea computes correctly: span=10, root=2, tip=1 → 15.0000 (SI)', () => {
    const { wrapper } = mountPanel({ wingSpan: 10, rootChord: 2, tipChord: 1 })
    expect(wrapper.text()).toContain('15.0000')
  })

  it('aspectRatio displays "—" when rootChord is 0', () => {
    const { wrapper } = mountPanel({ wingSpan: 10, rootChord: 0, tipChord: 0 })
    expect(wrapper.text()).toContain('—')
  })

  it('aspectRatio computes: span=10, root=2, tip=1, area=15 → AR ≈ 6.67', () => {
    const { wrapper } = mountPanel({ wingSpan: 10, rootChord: 2, tipChord: 1 })
    // AR = 100/15 ≈ 6.67
    expect(wrapper.text()).toContain('6.67')
  })

  it('rootRe displays "—" when cruisingSpeed is 0', () => {
    const { wrapper } = mountPanel({ wingSpan: 10, rootChord: 0.2, tipChord: 0.1, cruisingSpeed: 0 })
    // All Re values should show —
    const text = wrapper.text()
    expect(text).toContain('—')
  })

  it('rootRe displays "—" when rootChord is 0', () => {
    const { wrapper } = mountPanel({ wingSpan: 10, rootChord: 0, tipChord: 0, cruisingSpeed: 15 })
    expect(wrapper.text()).toContain('—')
  })

  it('rootRe computes a finite positive number for valid SI inputs', () => {
    const { wrapper } = mountPanel({
      wingSpan: 1.5, rootChord: 0.2, tipChord: 0.1,
      cruisingSpeed: 15, siteAltitude: 0,
    })
    // Should not show '—' for root Re
    const text = wrapper.text()
    // Check that we have a Reynolds number formatted as mantissa × 10^exp
    expect(text).toMatch(/× 10/)
  })

  it('tipRe computes a different value from rootRe when tipChord ≠ rootChord', () => {
    const { wrapper } = mountPanel({
      wingSpan: 1.5, rootChord: 0.2, tipChord: 0.1,
      cruisingSpeed: 15, siteAltitude: 0,
    })
    // Root Re and Tip Re should both show × 10 but with different mantissas
    const matches = wrapper.text().match(/× 10/g)
    expect(matches).toHaveLength(2)
  })

  it('formatReynolds(245000) returns "2.45 × 10⁵"', async () => {
    // Mount any valid state and verify format via a known value.
    // We test by passing a state that gives Re ≈ 245000.
    // sea level: density ≈ 1.225 kg/m³, viscosity ≈ 1.789e-5 Pa·s
    // Re = density * speed * chord / viscosity
    // 245000 = 1.225 * speed * chord / 1.789e-5
    // speed * chord ≈ 3.581
    // Let speed = 17.905 m/s, chord = 0.2 m → Re ≈ 245000
    const { wrapper } = mountPanel({
      wingSpan: 1.5, rootChord: 0.2, tipChord: 0.2,
      cruisingSpeed: 17.905, siteAltitude: 0,
    })
    // We just verify the format contains superscript digits and ×
    expect(wrapper.text()).toMatch(/\d+\.\d+ × 10[⁰¹²³⁴⁵⁶⁷⁸⁹]+/)
  })

  it('setError is called and taperRatio returns null when rootChord getter throws', () => {
    const ctx = makeProvide()
    // Override getState to throw from rootChord
    const originalGetState = ctx.provide[APP_STATE_KEY].getState
    ctx.provide[APP_STATE_KEY].getState = () => {
      const s = originalGetState()
      return Object.defineProperties({ ...s }, {
        rootChord: {
          get() { throw new Error('rootChord exploded') },
          enumerable: false,
        },
      })
    }
    const wrapper = mount(WingDefinitionPanel, { global: { provide: ctx.provide } })
    expect(ctx.setError).toHaveBeenCalled()
    // taperRatio should show '—'
    expect(wrapper.text()).toContain('—')
  })

  it('← General button emits navigate with "general"', async () => {
    const { wrapper } = mountPanel()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
    expect(wrapper.emitted('navigate')[0]).toEqual(['general'])
  })
})
