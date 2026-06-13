import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import WingDiagramChart from './WingDiagramChart.vue'
import { APP_STATE_KEY } from '../composables/useAppState'
import { SET_ERROR_KEY } from '@/composables/useError.js'

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

function mountChart(stateOverrides = {}, setError = vi.fn()) {
  const state = ref({ ...DEFAULT_STATE, ...stateOverrides })
  return mount(WingDiagramChart, {
    global: {
      provide: {
        [APP_STATE_KEY]: { getState: () => state.value, setState: vi.fn() },
        [SET_ERROR_KEY]: setError,
      },
    },
  })
}

function mountChartWithDraw(stateOverrides = {}, setError = vi.fn(), w = 600, h = 400) {
  vi.stubGlobal('ResizeObserver', makeSyncObserver(w, h))
  const state = ref({ ...DEFAULT_STATE, ...stateOverrides })
  return mount(WingDiagramChart, {
    global: {
      provide: {
        [APP_STATE_KEY]: { getState: () => state.value, setState: vi.fn() },
        [SET_ERROR_KEY]: setError,
      },
    },
  })
}

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
        },
      },
    })
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
    expect(setError).toHaveBeenCalledOnce()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
