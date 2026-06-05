import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabView from './TabView.vue'

const TABS = ['Polar', 'Airfoil Viewer', 'Comparison']

function mountTabView(modelValue = 'Polar') {
  return mount(TabView, {
    props: { tabs: TABS, modelValue },
    slots: {
      Polar: '<div class="slot-polar">Polar content</div>',
      AirfoilViewer: '<div class="slot-viewer">Viewer content</div>',
      Comparison: '<div class="slot-comparison">Comparison content</div>',
    },
  })
}

describe('TabView', () => {
  it('renders a button for each tab', () => {
    const buttons = mountTabView().findAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons.map((b) => b.text())).toEqual(['Polar', 'Airfoil Viewer', 'Comparison'])
  })

  it('active tab has blue border styling', () => {
    const wrapper = mountTabView('Airfoil Viewer')
    const buttons = wrapper.findAll('button')
    expect(buttons[1].classes()).toContain('border-blue-500')
  })

  it('inactive tabs do not have blue border styling', () => {
    const wrapper = mountTabView('Polar')
    const buttons = wrapper.findAll('button')
    expect(buttons[1].classes()).not.toContain('border-blue-500')
    expect(buttons[2].classes()).not.toContain('border-blue-500')
  })

  it('emits update:modelValue with the clicked tab name', async () => {
    const wrapper = mountTabView('Polar')
    await wrapper.findAll('button')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['Comparison'])
  })

  it('slot content for the active tab is visible', () => {
    const wrapper = mountTabView('Polar')
    expect(wrapper.find('.slot-polar').isVisible()).toBe(true)
  })

  it('slot content for inactive tabs is hidden', () => {
    const wrapper = mountTabView('Polar')
    expect(wrapper.find('.slot-viewer').isVisible()).toBe(false)
    expect(wrapper.find('.slot-comparison').isVisible()).toBe(false)
  })

  it('converts multi-word tab names to camelCase slot names', () => {
    // 'Airfoil Viewer' → slot name 'AirfoilViewer'; content must be visible when active
    const wrapper = mountTabView('Airfoil Viewer')
    expect(wrapper.find('.slot-viewer').isVisible()).toBe(true)
    expect(wrapper.find('.slot-polar').isVisible()).toBe(false)
  })
})
