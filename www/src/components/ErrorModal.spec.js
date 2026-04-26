import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorModal from '@/components/ErrorModal.vue'

function makeProps(overrides = {}) {
  return {
    appError: {
      message: 'Test error message',
      error: new Error('Underlying detail'),
      ...overrides
    }
  }
}

describe('ErrorModal', () => {
  it('renders the message from appError', () => {
    const wrapper = mount(ErrorModal, { props: makeProps() })
    expect(wrapper.text()).toContain('Test error message')
  })

  it('renders the underlying error message', () => {
    const wrapper = mount(ErrorModal, { props: makeProps() })
    expect(wrapper.text()).toContain('Underlying detail')
  })

  it('emits "dismiss" when the Dismiss button is clicked', async () => {
    const wrapper = mount(ErrorModal, { props: makeProps() })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('does not emit "dismiss" before the button is clicked', () => {
    const wrapper = mount(ErrorModal, { props: makeProps() })
    expect(wrapper.emitted('dismiss')).toBeUndefined()
  })
})
