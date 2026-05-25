import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import ActionPanel from './ActionPanel.vue'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'

function mountPanel(content = null) {
  const focusedContent = ref(content)
  return mount(ActionPanel, {
    global: {
      provide: {
        [FOCUSED_PARAM_KEY]: { focusedContent },
      },
    },
  })
}

describe('ActionPanel', () => {
  it('renders an <aside> element', () => {
    expect(mountPanel().find('aside').exists()).toBe(true)
  })

  it('shows the idle prompt when no parameter is focused', () => {
    expect(mountPanel(null).text()).toContain('Focus a parameter')
  })

  it('does not show idle prompt when a parameter is focused', () => {
    const wrapper = mountPanel({ title: 'Units', body: 'Some help text.' })
    expect(wrapper.text()).not.toContain('Focus a parameter')
  })

  it('displays the focused parameter title', () => {
    const wrapper = mountPanel({ title: 'Site Altitude', body: 'Help about altitude.' })
    expect(wrapper.text()).toContain('Site Altitude')
  })

  it('displays the focused parameter body text', () => {
    const wrapper = mountPanel({ title: 'Site Altitude', body: 'Help about altitude.' })
    expect(wrapper.text()).toContain('Help about altitude.')
  })

  it('updates content when focusedContent changes', async () => {
    const focusedContent = ref(null)
    const wrapper = mount(ActionPanel, {
      global: { provide: { [FOCUSED_PARAM_KEY]: { focusedContent } } },
    })
    expect(wrapper.text()).toContain('Focus a parameter')
    focusedContent.value = { title: 'Plane Type', body: 'About plane type.' }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Plane Type')
  })
})
