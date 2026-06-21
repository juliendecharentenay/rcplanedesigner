import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WingPlanformLayer from './WingPlanformLayer.vue'

// Minimal valid props for a simple rectangular wing
const BASE_PROPS = {
  centreX:              200,
  topY:                 100,
  scale:                200,   // 200 px per metre
  halfSpan:             0.75,  // 1.5m span
  rootChord:            0.3,
  tipChord:             0.3,
  xTipLE:               0,
  mac:                  0.3,
  macSpanPosition:      0.375,
  macLeadingEdgeOffset: 0,
  showMac:              true,
  showQuarterChord:     true,
  showDimensions:       true,
}

function mountLayer(props = {}) {
  // WingPlanformLayer renders a <g> fragment; wrap in SVG for valid DOM
  return mount({
    template: `<svg><WingPlanformLayer v-bind="layerProps" /></svg>`,
    components: { WingPlanformLayer },
    setup() { return { layerProps: { ...BASE_PROPS, ...props } } },
  })
}

describe('WingPlanformLayer', () => {
  it('renders a <g> element with class wing-planform-layer', () => {
    const wrapper = mountLayer()
    expect(wrapper.find('g.wing-planform-layer').exists()).toBe(true)
  })

  it('renders a polygon for the wing outline', () => {
    const wrapper = mountLayer()
    expect(wrapper.find('polygon').exists()).toBe(true)
  })

  it('polygon has a points attribute with 6 coordinate pairs', () => {
    const wrapper = mountLayer()
    const points = wrapper.find('polygon').attributes('points')
    // 6 pairs separated by spaces
    expect(points.trim().split(' ').length).toBe(6)
  })

  it('renders quarter-chord lines when showQuarterChord=true', () => {
    const wrapper = mountLayer({ showQuarterChord: true })
    const lines = wrapper.findAll('line')
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render quarter-chord lines when showQuarterChord=false', () => {
    const wrapper = mountLayer({ showQuarterChord: false })
    // Dimension lines are still rendered; but quarter-chord lines (stroke="#dc2626") should be absent
    const redLines = wrapper.findAll('line[stroke="#dc2626"]')
    expect(redLines.length).toBe(0)
  })

  it('renders MAC dashed line when showMac=true and mac is provided', () => {
    const wrapper = mountLayer({ showMac: true })
    const dashedLine = wrapper.find('line[stroke-dasharray]')
    expect(dashedLine.exists()).toBe(true)
  })

  it('does not render MAC line when showMac=false', () => {
    const wrapper = mountLayer({ showMac: false })
    const dashedLine = wrapper.find('line[stroke-dasharray]')
    expect(dashedLine.exists()).toBe(false)
  })

  it('renders quarter-MAC circle marker when showMac=true', () => {
    const wrapper = mountLayer({ showMac: true })
    expect(wrapper.find('circle').exists()).toBe(true)
  })

  it('renders dimension lines when showDimensions=true', () => {
    const wrapper = mountLayer({ showDimensions: true })
    // Span dimension line + root chord dimension line = 2 slate-coloured lines (stroke="#64748b")
    const dimLines = wrapper.findAll('line[stroke="#64748b"]')
    expect(dimLines.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render slate dimension lines when showDimensions=false', () => {
    const wrapper = mountLayer({ showDimensions: false, showMac: false, showQuarterChord: false })
    const dimLines = wrapper.findAll('line[stroke="#64748b"]')
    expect(dimLines.length).toBe(0)
  })

  it('wing outline has correct fill colour', () => {
    const wrapper = mountLayer()
    expect(wrapper.find('polygon').attributes('fill')).toBe('#dbeafe')
  })

  it('renders ¼ MAC text label when showMac=true', () => {
    const wrapper = mountLayer({ showMac: true })
    const texts = wrapper.findAll('text')
    const labels = texts.map(t => t.text())
    expect(labels.some(l => l.includes('MAC'))).toBe(true)
  })
})
