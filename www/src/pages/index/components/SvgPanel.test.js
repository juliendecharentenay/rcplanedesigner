import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SvgPanel from './SvgPanel.vue'

const WingDiagramChartStub    = { name: 'WingDiagramChart',    template: '<div data-testid="wing-diagram-chart" />' }
const FuselageDiagramChartStub = { name: 'FuselageDiagramChart', template: '<div data-testid="fuselage-diagram-chart" />' }

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountPanel(props = {}) {
  return mount(SvgPanel, {
    props,
    global: {
      stubs: {
        WingDiagramChart: WingDiagramChartStub,
        FuselageDiagramChart: FuselageDiagramChartStub,
      },
    },
  })
}

describe('SvgPanel', () => {
  it('renders a <main> element', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('main').exists()).toBe(true)
  })

  it('renders the canvas wrapper div', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('main div').exists()).toBe(true)
  })

  it('renders the TrainerSideView SVG inside the canvas', () => {
    const wrapper = mountPanel()
    const svgs = wrapper.findAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('trainer SVG uses a 1000×371 viewBox', () => {
    const wrapper = mountPanel()
    const trainerSvg = wrapper.find('svg[data-tracer-version]')
    expect(trainerSvg.exists()).toBe(true)
    expect(trainerSvg.attributes('viewBox')).toBe('0 0 1000 371')
  })

  it('renders TrainerSideView when activePanel is "general"', () => {
    const wrapper = mountPanel({ activePanel: 'general' })
    expect(wrapper.find('svg[data-tracer-version]').exists()).toBe(true)
  })

  it('does not render TrainerSideView when activePanel is "wing-definition"', () => {
    const wrapper = mountPanel({ activePanel: 'wing-definition' })
    expect(wrapper.find('svg[data-tracer-version]').exists()).toBe(false)
  })

  it('renders WingDiagramChart when activePanel is "wing-definition"', () => {
    const wrapper = mountPanel({ activePanel: 'wing-definition' })
    expect(wrapper.find('[data-testid="wing-diagram-chart"]').exists()).toBe(true)
  })

  it('renders FuselageDiagramChart when activePanel is "fuselage-definition"', () => {
    const wrapper = mountPanel({ activePanel: 'fuselage-definition' })
    expect(wrapper.find('[data-testid="fuselage-diagram-chart"]').exists()).toBe(true)
  })

  it('does not render WingDiagramChart when activePanel is "fuselage-definition"', () => {
    const wrapper = mountPanel({ activePanel: 'fuselage-definition' })
    expect(wrapper.find('[data-testid="wing-diagram-chart"]').exists()).toBe(false)
  })
})
