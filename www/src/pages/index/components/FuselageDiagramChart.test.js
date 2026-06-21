import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import FuselageDiagramChart from './FuselageDiagramChart.vue'
import { APP_STATE_KEY } from '../composables/useAppState'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { SET_ERROR_KEY } from '@/composables/useError.js'

// Rectangular wing + default fuselage/tail state
const DEFAULT_STATE = {
  units:          'SI',
  wingSpan:       1.5,
  rootChord:      0.3,
  tipChord:       0.3,
  sweepAngle:     0,
  siteAltitude:   0,
  wingLoading:    45,
  cruisingSpeed:  15,
  planeType:      'Trainer',
  airfoilProfile: null,
  fuselageWidth:  0.12,
  frontFuselage:  0,
  rearFuselage:   0,
  tailSpan:       0,
  tailChord:      0,
  tailAirfoil:    'E168  (12.45%)',
}

function makeSyncObserver(w = 600, h = 500) {
  return class {
    constructor(cb) { this._cb = cb }
    observe() { this._cb([{ contentRect: { width: w, height: h } }]) }
    disconnect() {}
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', makeSyncObserver())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountChart(stateOverrides = {}, setError = vi.fn()) {
  const state = ref({ ...DEFAULT_STATE, ...stateOverrides })
  return mount(FuselageDiagramChart, {
    global: {
      provide: {
        [APP_STATE_KEY]: { getState: () => state.value, setState: vi.fn() },
        [AIRFOILS_KEY]:  { airfoils: [] },
        [SET_ERROR_KEY]: setError,
      },
    },
  })
}

describe('FuselageDiagramChart', () => {
  it('renders an <svg> element', () => {
    const wrapper = mountChart()
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('SVG has no child drawing elements when wingSpan is 0', async () => {
    const wrapper = mountChart({ wingSpan: 0, rootChord: 0, tipChord: 0 })
    await flushPromises()
    // No path, polygon, etc. should exist
    expect(wrapper.find('path').exists()).toBe(false)
    expect(wrapper.find('polygon').exists()).toBe(false)
  })

  it('SVG has no child drawing elements when fuselageWidth is 0', async () => {
    const wrapper = mountChart({ fuselageWidth: 0 })
    await flushPromises()
    expect(wrapper.find('path').exists()).toBe(false)
  })

  it('renders a fuselage path element when geometry is valid', async () => {
    const wrapper = mountChart()
    await flushPromises()
    expect(wrapper.find('path[fill="#f1f5f9"]').exists()).toBe(true)
  })

  it('renders a WingPlanformLayer (polygon) for the wing', async () => {
    const wrapper = mountChart()
    await flushPromises()
    expect(wrapper.find('polygon').exists()).toBe(true)
  })

  it('renders a horizontal tail polygon with sky-blue fill', async () => {
    const wrapper = mountChart()
    await flushPromises()
    const polygons = wrapper.findAll('polygon')
    const tailPolygon = polygons.find(p => p.attributes('fill') === '#e0f2fe')
    expect(tailPolygon).toBeDefined()
  })

  it('renders a horizontal tail ¼-chord line in red', async () => {
    const wrapper = mountChart()
    await flushPromises()
    const redLines = wrapper.findAll('line[stroke="#dc2626"]')
    expect(redLines.length).toBeGreaterThanOrEqual(1)
  })

  it('renders a vertical tail ellipse schematic', async () => {
    const wrapper = mountChart()
    await flushPromises()
    expect(wrapper.find('ellipse').exists()).toBe(true)
  })

  it('renders dimension lines (at least 2 lines with DIM_COLOUR stroke)', async () => {
    const wrapper = mountChart()
    await flushPromises()
    // Dimension lines are slate-600 (#64748b)
    const dimLines = wrapper.findAll('line[stroke="#64748b"]')
    expect(dimLines.length).toBeGreaterThanOrEqual(2)
  })

  it('renders dimension line text labels (Front, Rear)', async () => {
    const wrapper = mountChart()
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('Front')
    expect(text).toContain('Rear')
  })

  it('renders a centreline dashed line', async () => {
    const wrapper = mountChart()
    await flushPromises()
    expect(wrapper.find('line[stroke-dasharray]').exists()).toBe(true)
  })

  it('dimension lines have arrow marker attributes', async () => {
    const wrapper = mountChart()
    await flushPromises()
    const arrowLines = wrapper.findAll('line[marker-start]')
    expect(arrowLines.length).toBeGreaterThanOrEqual(2)
  })

  it('calls setError and renders without crashing when geometry computation throws', async () => {
    const setError = vi.fn()
    const badGetState = () => {
      const s = { ...DEFAULT_STATE }
      Object.defineProperty(s, 'wingSpan', {
        enumerable: false,
        get() { throw new Error('state broken') },
      })
      return s
    }
    const wrapper = mount(FuselageDiagramChart, {
      global: {
        provide: {
          [APP_STATE_KEY]: { getState: badGetState, setState: vi.fn() },
          [AIRFOILS_KEY]:  { airfoils: [] },
          [SET_ERROR_KEY]: setError,
        },
      },
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(setError).toHaveBeenCalled()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
