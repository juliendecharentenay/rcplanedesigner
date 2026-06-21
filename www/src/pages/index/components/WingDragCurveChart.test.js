import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WingDragCurveChart from './WingDragCurveChart.vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'

// Points with drag force values in Newtons (SI), speeds in m/s
function makePoints(n = 10) {
  return Array.from({ length: n }, (_, i) => ({
    v: 8 + i * 2,
    baseDrag:    0.5 + i * 0.05,
    inducedDrag: 2.0 / (i + 1),
    totalDrag:   0.5 + i * 0.05 + 2.0 / (i + 1),
  }))
}

const VALID_PROPS = {
  points: makePoints(10),
  cruiseSpeedSI: 15,
  minDragSpeedSI: 12,
  stallSpeedSI: 8,
  system: 'SI',
}

function makeSyncObserver(w = 400, h = 300) {
  return class {
    constructor(cb) { this._cb = cb }
    observe() { this._cb([{ contentRect: { width: w, height: h } }]) }
    disconnect() {}
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', makeSyncObserver(400, 300))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountChart(propsOverrides = {}, setError = vi.fn()) {
  return mount(WingDragCurveChart, {
    props: { ...VALID_PROPS, ...propsOverrides },
    global: {
      provide: {
        [SET_ERROR_KEY]: setError,
      },
    },
  })
}

describe('WingDragCurveChart', () => {
  it('DC-1: SVG element is rendered', async () => {
    const wrapper = mountChart()
    await flushPromises()
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('DC-2: three <path> elements are drawn when points is non-empty', async () => {
    const wrapper = mountChart()
    await flushPromises()
    const paths = wrapper.findAll('path')
    expect(paths.length).toBeGreaterThanOrEqual(3)
  })

  it('DC-3: no paths are drawn when points is empty', async () => {
    const wrapper = mountChart({ points: [] })
    await flushPromises()
    expect(wrapper.findAll('path').length).toBe(0)
  })

  it('DC-4: chart title text "Wing drag vs speed" is present', async () => {
    const wrapper = mountChart()
    await flushPromises()
    const texts = wrapper.findAll('text')
    const title = texts.find(t => t.text() === 'Wing drag vs speed')
    expect(title).toBeDefined()
  })

  it('DC-5: axis labels show force unit and speed unit in SI mode', async () => {
    const wrapper = mountChart({ system: 'SI' })
    await flushPromises()
    const texts = wrapper.findAll('text').map(t => t.text())
    expect(texts.some(t => t.includes('Drag') && t.includes('N'))).toBe(true)
    expect(texts.some(t => t.includes('Speed') && t.includes('m/s'))).toBe(true)
  })

  it('DC-6: axis labels show lbf and mph when system is Imperial', async () => {
    const wrapper = mountChart({ system: 'Imperial' })
    await flushPromises()
    const texts = wrapper.findAll('text').map(t => t.text())
    expect(texts.some(t => t.includes('lbf'))).toBe(true)
    expect(texts.some(t => t.includes('mph'))).toBe(true)
  })

  it('DC-7: dots (<circle>) are rendered at cruise speed position', async () => {
    const wrapper = mountChart()
    await flushPromises()
    // 3 curves × at least 1 marker set = at least 3 circles
    expect(wrapper.findAll('circle').length).toBeGreaterThanOrEqual(3)
  })

  it('DC-9: only one set of marker lines when cruise and minDrag speeds are within 0.5 m/s', async () => {
    const wrapper = mountChart({ cruiseSpeedSI: 15, minDragSpeedSI: 15.3 })
    await flushPromises()
    // 1 merged marker set × 3 curves = 3 circles
    const circles = wrapper.findAll('circle')
    expect(circles.length).toBeGreaterThanOrEqual(3)
    expect(circles.length).toBeLessThan(6)
  })

  it('DC-10: tooltip div is not visible initially', async () => {
    const wrapper = mountChart()
    await flushPromises()
    // The tooltip div uses v-if="tooltip.visible" — should not be in DOM initially
    const tooltipDivs = wrapper.findAll('[class*="pointer-events-none"]')
    expect(tooltipDivs.length).toBe(0)
  })

  it('DC-11: setError is called when draw() throws (bad totalDrag getter on a point)', async () => {
    const setError = vi.fn()
    vi.stubGlobal('ResizeObserver', makeSyncObserver(400, 300))
    // Create two valid-looking points but with a bad totalDrag getter on one
    const badPoint = { v: 10, baseDrag: 0.5, inducedDrag: 1.0 }
    Object.defineProperty(badPoint, 'totalDrag', {
      get() { throw new Error('totalDrag broken') },
    })
    const pts = [{ v: 8, baseDrag: 0.5, inducedDrag: 1.5, totalDrag: 2.0 }, badPoint]
    const wrapper = mount(WingDragCurveChart, {
      props: { points: pts, cruiseSpeedSI: 15, minDragSpeedSI: 12, stallSpeedSI: 8, system: 'SI' },
      global: { provide: { [SET_ERROR_KEY]: setError } },
    })
    await flushPromises()
    expect(setError).toHaveBeenCalled()
    expect(setError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
