import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import WingDiagramChart from './WingDiagramChart.vue'
import { APP_STATE_KEY } from '../composables/useAppState'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { AirfoilAnalyser } from '@/js/AirfoilAnalyser.js'

const DEFAULT_STATE = {
  units: 'SI',
  wingSpan: 0,
  rootChord: 0,
  tipChord: 0,
  sweepAngle: 0,
  siteAltitude: 0,
  wingLoading: 0,
  cruisingSpeed: 0,
  planeType: 'Trainer',
  airfoilProfile: null,
}

// A minimal mock analyser covering the properties performanceData reads.
// landingAoa = 8.5°, landingCl = 0.9
// getCruiseConditions returns fixed 4.0° AoA for any non-null CL.
const MOCK_ANALYSER = {
  profileName: 'test-foil',
  landingAoa: 8.5,
  landingCl: 0.9,
  getCruiseConditions(cl) {
    if (cl == null) return { cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null }
    return { cruiseCl: cl, cruiseAoa: 4.0, cruiseCd: 0.02, cruiseCm: -0.05 }
  },
}

// ResizeObserver that fires synchronously when observe() is called
function makeSyncObserver(w = 400, h = 300) {
  return class {
    constructor(cb) { this._cb = cb }
    observe() { this._cb([{ contentRect: { width: w, height: h } }]) }
    disconnect() {}
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountChart(stateOverrides = {}, setError = vi.fn(), airfoils = []) {
  const state = ref({ ...DEFAULT_STATE, ...stateOverrides })
  return mount(WingDiagramChart, {
    global: {
      provide: {
        [APP_STATE_KEY]: { getState: () => state.value, setState: vi.fn() },
        [SET_ERROR_KEY]: setError,
        [AIRFOILS_KEY]: { airfoils },
      },
    },
  })
}

function mountChartWithDraw(stateOverrides = {}, setError = vi.fn(), w = 600, h = 400, airfoils = []) {
  vi.stubGlobal('ResizeObserver', makeSyncObserver(w, h))
  const state = ref({ ...DEFAULT_STATE, ...stateOverrides })
  return mount(WingDiagramChart, {
    global: {
      provide: {
        [APP_STATE_KEY]: { getState: () => state.value, setState: vi.fn() },
        [SET_ERROR_KEY]: setError,
        [AIRFOILS_KEY]: { airfoils },
      },
    },
  })
}

// ─── Existing SVG / geometry tests ───────────────────────────────────────────

describe('WingDiagramChart', () => {
  it('renders an svg element', () => {
    const wrapper = mountChart()
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('svg is empty (no child elements) when wingSpan is 0', async () => {
    const wrapper = mountChartWithDraw({ wingSpan: 0, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    await flushPromises()
    expect(wrapper.find('svg').element.children.length).toBe(0)
  })

  it('svg is empty when rootChord is 0', async () => {
    const wrapper = mountChartWithDraw({ wingSpan: 10, rootChord: 0, tipChord: 1, sweepAngle: 0 })
    await flushPromises()
    expect(wrapper.find('svg').element.children.length).toBe(0)
  })

  it('svg has polygon element when valid geometry provided', async () => {
    const wrapper = mountChartWithDraw({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    await flushPromises()
    expect(wrapper.find('polygon').exists()).toBe(true)
  })

  it('svg has line elements for quarter-chord when valid geometry provided', async () => {
    const wrapper = mountChartWithDraw({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    await flushPromises()
    const lines = wrapper.findAll('line')
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })

  it('svg has dashed line element for MAC when valid geometry provided', async () => {
    const wrapper = mountChartWithDraw({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    await flushPromises()
    const dashedLine = wrapper.findAll('line').find(l => l.attributes('stroke-dasharray'))
    expect(dashedLine).toBeDefined()
  })

  it('svg has circle element for quarter-MAC marker when valid geometry provided', async () => {
    const wrapper = mountChartWithDraw({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    await flushPromises()
    expect(wrapper.find('circle').exists()).toBe(true)
  })

  it('calls setError and canvas is cleared when draw() throws (broken state getter)', async () => {
    const setError = vi.fn()
    vi.stubGlobal('ResizeObserver', makeSyncObserver(600, 400))
    const badGetState = () => {
      const s = {
        units: 'SI',
        wingSpan: 10,
        sweepAngle: 0,
        tipChord: 1,
        siteAltitude: 0,
      }
      Object.defineProperty(s, 'rootChord', {
        enumerable: false,
        get() { throw new Error('state broken') },
      })
      return s
    }
    const wrapper = mount(WingDiagramChart, {
      global: {
        provide: {
          [APP_STATE_KEY]: { getState: badGetState, setState: vi.fn() },
          [SET_ERROR_KEY]: setError,
          [AIRFOILS_KEY]: { airfoils: [] },
        },
      },
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(setError).toHaveBeenCalledOnce()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  // ─── Performance table tests ─────────────────────────────────────────────

  it('T1: renders the performance table overlay', () => {
    const wrapper = mountChart()
    // The overlay div must be present
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('T2: all data cells show "—" when no airfoil is selected', () => {
    const wrapper = mountChart({ airfoilProfile: null })
    const cells = wrapper.findAll('td')
    // First column of each row is label; second and third are data
    // Row 1: label, infinite AR, wing; Row 2: label, infinite AR, wing
    const dataCells = cells.filter(c => c.text() === '—')
    expect(dataCells.length).toBe(4)
  })

  it('T3: cruise cells show "—" when cruisingSpeed is 0', () => {
    const wrapper = mountChart(
      { airfoilProfile: 'test-foil', cruisingSpeed: 0, wingLoading: 45, wingSpan: 1.5, rootChord: 0.3, tipChord: 0.2 },
      vi.fn(),
      [MOCK_ANALYSER],
    )
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    const cruiseRow = rows[0]
    const cruiseCells = cruiseRow.findAll('td')
    // cells[1] = Infinite AR, cells[2] = Wing
    expect(cruiseCells[1].text()).toBe('—')
    expect(cruiseCells[2].text()).toBe('—')
  })

  it('T4: landing AoA Infinite AR cell matches analyser.landingAoa formatted', () => {
    const wrapper = mountChart(
      { airfoilProfile: 'test-foil', cruisingSpeed: 15, wingLoading: 45, wingSpan: 1.5, rootChord: 0.3, tipChord: 0.2 },
      vi.fn(),
      [MOCK_ANALYSER],
    )
    const rows = wrapper.findAll('tbody tr')
    const landingRow = rows[1]
    const cells = landingRow.findAll('td')
    // MOCK_ANALYSER.landingAoa = 8.5
    expect(cells[1].text()).toBe('8.5°')
  })

  it('T5: wing column cruise AoA is greater than Infinite AR cruise AoA for positive CL', () => {
    // Use real AirfoilAnalyser.convertSpeedToCl with sensible values
    // wingLoading=45 g/dm², speed=15 m/s, alt=0 → CL > 0
    const wrapper = mountChart(
      { airfoilProfile: 'test-foil', cruisingSpeed: 15, wingLoading: 45, wingSpan: 1.5, rootChord: 0.3, tipChord: 0.2 },
      vi.fn(),
      [MOCK_ANALYSER],
    )
    const rows = wrapper.findAll('tbody tr')
    const cruiseRow = rows[0]
    const cells = cruiseRow.findAll('td')
    const infiniteVal = parseFloat(cells[1].text())
    const wingVal = parseFloat(cells[2].text())
    expect(infiniteVal).toBeCloseTo(4.0, 0)
    expect(wingVal).toBeGreaterThan(infiniteVal)
  })

  it('T6: landing AoA Wing column is greater than Infinite AR landing AoA', () => {
    const wrapper = mountChart(
      { airfoilProfile: 'test-foil', cruisingSpeed: 15, wingLoading: 45, wingSpan: 1.5, rootChord: 0.3, tipChord: 0.2 },
      vi.fn(),
      [MOCK_ANALYSER],
    )
    const rows = wrapper.findAll('tbody tr')
    const landingRow = rows[1]
    const cells = landingRow.findAll('td')
    const infiniteVal = parseFloat(cells[1].text())
    const wingVal = parseFloat(cells[2].text())
    expect(infiniteVal).toBeCloseTo(8.5, 0)
    expect(wingVal).toBeGreaterThan(infiniteVal)
  })

  it('T7: wing column cells show "—" when wingSpan is 0 (AR undefined)', () => {
    const wrapper = mountChart(
      { airfoilProfile: 'test-foil', cruisingSpeed: 15, wingLoading: 45, wingSpan: 0, rootChord: 0.3, tipChord: 0.2 },
      vi.fn(),
      [MOCK_ANALYSER],
    )
    const rows = wrapper.findAll('tbody tr')
    rows.forEach(row => {
      const cells = row.findAll('td')
      // Wing column (index 2) should be "—" when span = 0
      expect(cells[2].text()).toBe('—')
    })
  })

  it('T8: performanceData error routes through setError', () => {
    const setError = vi.fn()
    // Analyser that throws in getCruiseConditions
    const badAnalyser = {
      profileName: 'bad-foil',
      landingAoa: 8.5,
      landingCl: 0.9,
      getCruiseConditions() { throw new Error('analyser exploded') },
    }
    const wrapper = mountChart(
      { airfoilProfile: 'bad-foil', cruisingSpeed: 15, wingLoading: 45, wingSpan: 1.5, rootChord: 0.3, tipChord: 0.2 },
      setError,
      [badAnalyser],
    )
    expect(setError).toHaveBeenCalledOnce()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
