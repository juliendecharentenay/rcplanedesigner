import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorDialog from '@/components/ErrorDialog.vue'

describe('ErrorDialog', () => {
  it('renders nothing when error is null', () => {
    const wrapper = mount(ErrorDialog, {
      props: { error: null },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('renders the dialog when an Error is provided', () => {
    const wrapper = mount(ErrorDialog, {
      props: { error: new Error('something broke') },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('displays the error message', () => {
    const wrapper = mount(ErrorDialog, {
      props: { error: new Error('disk full') },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.text()).toContain('disk full')
  })

  it('emits dismiss when the button is clicked', async () => {
    const wrapper = mount(ErrorDialog, {
      props: { error: new Error('oops') },
      global: { stubs: { Teleport: true } },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('rejects a non-Error prop value via validator', () => {
    const { validator } = ErrorDialog.props.error
    expect(validator(null)).toBe(true)
    expect(validator(new Error('ok'))).toBe(true)
    expect(validator('a string')).toBe(false)
    expect(validator(42)).toBe(false)
  })
})
