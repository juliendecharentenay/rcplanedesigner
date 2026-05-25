import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppHeader from './AppHeader.vue'

describe('AppHeader', () => {
  it('renders a <header> element', () => {
    const wrapper = mount(AppHeader)
    expect(wrapper.find('header').exists()).toBe(true)
  })

  it('displays the application title', () => {
    const wrapper = mount(AppHeader)
    expect(wrapper.text()).toContain('R/C Plane Designer')
  })

  it('displays the version badge', () => {
    const wrapper = mount(AppHeader)
    expect(wrapper.text()).toContain('v0.1.0')
  })

  it('renders the plane icon svg', () => {
    const wrapper = mount(AppHeader)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
