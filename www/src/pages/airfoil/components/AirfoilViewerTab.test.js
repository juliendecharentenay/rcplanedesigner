import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AirfoilViewerTab from './AirfoilViewerTab.vue'

describe('AirfoilViewerTab', () => {
  it('mounts without error', () => {
    expect(() => mount(AirfoilViewerTab)).not.toThrow()
  })

  it('renders a coming-soon placeholder message', () => {
    expect(mount(AirfoilViewerTab).text()).toContain('coming soon')
  })
})
