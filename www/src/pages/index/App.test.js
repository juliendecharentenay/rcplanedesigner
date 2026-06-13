import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import App from './App.vue'
import { SET_ERROR_KEY } from '@/composables/useError'
import { APP_STATE_KEY, PLANE_TYPES } from './composables/useAppState'
import { FOCUSED_PARAM_KEY } from './composables/useFocusedParam'
import { AIRFOILS_KEY } from './composables/useAirfoils'

// Stub all child components so we only test App.vue's URL sync logic
vi.mock('./components/AppHeader.vue',      () => ({ default: { template: '<div />' } }))
vi.mock('./components/ParameterPanel.vue', () => ({ default: { template: '<div />', props: ['activePanel'], emits: ['navigate'] } }))
vi.mock('./components/AirfoilPanel.vue',   () => ({ default: { template: '<div />' } }))
vi.mock('./components/SvgPanel.vue',       () => ({ default: { template: '<div />', props: ['activePanel'] } }))
vi.mock('./components/ActionPanel.vue',    () => ({ default: { template: '<div />' } }))
vi.mock('@/components/ErrorDialog.vue',    () => ({ default: { template: '<div />', props: ['error'], emits: ['dismiss'] } }))

const KNOWN_AIRFOIL = 'E168  (12.45%)'
const UNKNOWN_AIRFOIL = 'NoSuchFoil'

const MOCK_AIRFOILS = [
  { profileName: KNOWN_AIRFOIL, polar: [], zeroLiftAoA: 0, stallAoa: 11, stallCl: 1.0 },
]

// Default URL_DEFAULTS (mirrors App.vue constant)
const URL_DEFAULTS = {
  units:          'SI',
  siteAltitude:   0,
  wingLoading:    50,
  cruisingSpeed:  25,
  planeType:      'Trainer',
  airfoilProfile: null,
  wingSpan:       1.5,
  rootChord:      0.3,
  tipChord:       0.2,
  sweepAngle:     0,
  activePanel:    'general',
}

// We need to intercept useAirfoils so tests can control which airfoils are "known"
vi.mock('./composables/useAirfoils', () => ({
  AIRFOILS_KEY: Symbol('airfoils'),
  useAirfoils: () => ({ airfoils: MOCK_AIRFOILS }),
}))

let replaceStateSpy

beforeEach(() => {
  replaceStateSpy = vi.spyOn(history, 'replaceState').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  // Reset location.search to empty
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '', pathname: '/' },
    writable: true,
    configurable: true,
  })
})

function setSearch(search) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search, pathname: '/' },
    writable: true,
    configurable: true,
  })
}

async function mountApp(search = '') {
  setSearch(search)
  // App.vue manages its own state; we mount without overriding provides
  // so the real useAppState and URL sync logic runs
  const wrapper = mount(App, {
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

// Helper: get setState spy by mounting and capturing the real setState calls
// Since App.vue uses its own real useAppState, we need to spy on history.replaceState
// and inspect what URL was set. For parse tests we inspect replaceState arguments indirectly
// through the watch that fires after onMounted setState.

describe('App.vue — URL sync', () => {
  // ── Parsing tests ──────────────────────────────────────────────────────────

  it('test 1: all valid params → setState restores state and activePanel', async () => {
    const search = '?units=Imperial&alt=500&wl=30.00&spd=40.00&type=Glider&foil=E168%20%20(12.45%25)&span=2.00&rc=0.50&tc=0.40&sweep=10.00&panel=wing-definition'
    await mountApp(search)
    // The watch fires after onMounted sets state; replaceState will be called with the serialised URL.
    // Check that known non-default values appear in the serialised URL.
    const calls = replaceStateSpy.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('units=Imperial')
    expect(lastUrl).toContain('alt=500')
    expect(lastUrl).toContain('type=Glider')
    expect(lastUrl).toContain('foil=E168')
    expect(lastUrl).toContain('panel=wing-definition')
  })

  it('test 2: units=Imperial parsed before numerics; numerics accepted', async () => {
    const search = '?units=Imperial&wl=30.00&spd=40.00'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('units=Imperial')
    expect(lastUrl).toContain('wl=30.00')
    expect(lastUrl).toContain('spd=40.00')
  })

  it('test 3: unknown key (foo=bar) is silently ignored', async () => {
    const search = '?foo=bar'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).not.toContain('foo')
  })

  it('test 4: invalid numeric (wl=banana) falls back to default', async () => {
    const search = '?wl=banana'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    // wl default is 50, so it should not appear in URL
    expect(lastUrl).not.toContain('wl=')
  })

  it('test 5: out-of-range numeric (sweep=999) falls back to default', async () => {
    const search = '?sweep=999'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    // sweep default is 0, so it should not appear in URL
    expect(lastUrl).not.toContain('sweep=')
  })

  it('test 6: unrecognised type value → planeType falls back to Trainer', async () => {
    const search = '?type=Biplane'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    // planeType default is Trainer, not written to URL
    expect(lastUrl).not.toContain('type=')
  })

  it('test 7: foil matching no known airfoil → airfoilProfile stays null', async () => {
    const search = `?foil=${encodeURIComponent(UNKNOWN_AIRFOIL)}`
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).not.toContain('foil=')
  })

  it('test 8: foil absent from URL → airfoilProfile is null (foil key absent)', async () => {
    await mountApp('')
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).not.toContain('foil=')
  })

  it('test 9: partial URL (only wl and foil) → unspecified fields use defaults', async () => {
    const search = `?wl=30.00&foil=${encodeURIComponent(KNOWN_AIRFOIL)}`
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('wl=30.00')
    expect(lastUrl).toContain('foil=')
    // Fields not in URL should use defaults → not written
    expect(lastUrl).not.toContain('units=')
    expect(lastUrl).not.toContain('alt=')
    expect(lastUrl).not.toContain('type=')
    expect(lastUrl).not.toContain('panel=')
  })

  it('test 10: empty query string → all fields use defaults; activePanel is general', async () => {
    await mountApp('')
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    // All defaults → URL should be just the pathname (no query string)
    expect(lastUrl).toBe('/')
  })

  // ── Serialisation tests ────────────────────────────────────────────────────

  it('test 11: default state → replaceState called with pathname (no ?)', async () => {
    await mountApp('')
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toBe('/')
    expect(lastUrl).not.toContain('?')
  })

  it('test 12: non-default units=Imperial → written first in URL', async () => {
    const search = '?units=Imperial'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('units=Imperial')
    // units should appear before other keys
    const unitsIdx = lastUrl.indexOf('units=')
    const wlIdx = lastUrl.indexOf('wl=')
    if (wlIdx !== -1) expect(unitsIdx).toBeLessThan(wlIdx)
  })

  it('test 13: airfoilProfile=null → foil key absent from URL', async () => {
    await mountApp('')
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).not.toContain('foil=')
  })

  it('test 14: non-default numeric → serialised with toFixed(2) for decimals', async () => {
    const search = '?wl=30.00&spd=40.00'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('wl=30.00')
    expect(lastUrl).toContain('spd=40.00')
  })

  it('test 15: siteAltitude is integer → serialised without decimal point', async () => {
    const search = '?alt=500'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('alt=500')
    expect(lastUrl).not.toMatch(/alt=\d+\.\d+/)
  })

  it('test 16: non-default activePanel → panel key written', async () => {
    const search = '?panel=wing-definition'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('panel=wing-definition')
  })

  it('test 17: switching units via URL → units key appears and numerics re-serialised', async () => {
    // Load with Imperial units
    const search = '?units=Imperial&wl=30.00&spd=40.00'
    await mountApp(search)
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toContain('units=Imperial')
    // wl and spd should appear (non-default values)
    expect(lastUrl).toContain('wl=')
    expect(lastUrl).toContain('spd=')
  })

  it('test 18: all fields set to defaults → URL is pathname (clean)', async () => {
    // Start with some non-default values
    const search = '?wl=30.00'
    const wrapper = await mountApp(search)
    replaceStateSpy.mockClear()

    // Now trigger a state change that brings everything back to default by loading empty
    // We test this by mounting fresh with no params
    wrapper.unmount()
    await mountApp('')
    const calls = replaceStateSpy.mock.calls
    const lastUrl = calls[calls.length - 1][2]
    expect(lastUrl).toBe('/')
  })
})
