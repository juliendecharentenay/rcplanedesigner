import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SvgPanel from './SvgPanel.vue'

describe('SvgPanel', () => {
  it('renders a <main> element', () => {
    const wrapper = mount(SvgPanel)
    expect(wrapper.find('main').exists()).toBe(true)
  })

  it('renders the canvas wrapper div', () => {
    const wrapper = mount(SvgPanel)
    // the canvas is a relative div inside main
    expect(wrapper.find('main div').exists()).toBe(true)
  })

  it('renders the TrainerSideView SVG inside the canvas', () => {
    const wrapper = mount(SvgPanel)
    const svgs = wrapper.findAll('svg')
    // at least two SVGs: dot-grid background + trainer side view
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('trainer SVG uses a 1000×371 viewBox', () => {
    const wrapper = mount(SvgPanel)
    const trainerSvg = wrapper.find('svg[data-tracer-version]')
    expect(trainerSvg.exists()).toBe(true)
    expect(trainerSvg.attributes('viewBox')).toBe('0 0 1000 371')
  })
})
