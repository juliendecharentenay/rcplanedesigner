import { describe, it, expect, vi } from 'vitest'
import { useComponentError } from '@/composables/componentError.js'

describe('useComponentError', () => {
  describe('reportError', () => {
    it('calls emit exactly once', () => {
      const emit = vi.fn()
      const { reportError } = useComponentError(emit)
      reportError('msg', new Error('detail'))
      expect(emit).toHaveBeenCalledTimes(1)
    })

    it('emits the "error" event name', () => {
      const emit = vi.fn()
      const { reportError } = useComponentError(emit)
      reportError('msg', new Error('detail'))
      expect(emit.mock.calls[0][0]).toBe('error')
    })

    it('payload has the correct { message, error } shape', () => {
      const emit = vi.fn()
      const { reportError } = useComponentError(emit)
      const err = new Error('detail')
      reportError('Something failed', err)
      expect(emit.mock.calls[0][1]).toEqual({ message: 'Something failed', error: err })
    })

    it('multiple calls emit multiple times', () => {
      const emit = vi.fn()
      const { reportError } = useComponentError(emit)
      reportError('a', new Error('1'))
      reportError('b', new Error('2'))
      expect(emit).toHaveBeenCalledTimes(2)
    })
  })

  describe('forwardError', () => {
    it('calls emit exactly once', () => {
      const emit = vi.fn()
      const { forwardError } = useComponentError(emit)
      forwardError({ message: 'msg', error: new Error('x') })
      expect(emit).toHaveBeenCalledTimes(1)
    })

    it('emits the "error" event name with the same payload', () => {
      const emit = vi.fn()
      const { forwardError } = useComponentError(emit)
      const err = new Error('x')
      forwardError({ message: 'forwarded', error: err })
      expect(emit.mock.calls[0][0]).toBe('error')
      expect(emit.mock.calls[0][1]).toEqual({ message: 'forwarded', error: err })
    })

    it('multiple calls emit multiple times', () => {
      const emit = vi.fn()
      const { forwardError } = useComponentError(emit)
      forwardError({ message: 'a', error: new Error('1') })
      forwardError({ message: 'b', error: new Error('2') })
      expect(emit).toHaveBeenCalledTimes(2)
    })
  })
})
