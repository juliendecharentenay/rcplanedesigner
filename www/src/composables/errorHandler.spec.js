import { describe, it, expect } from 'vitest'
import { isRef } from 'vue'
import { useErrorHandler } from '@/composables/errorHandler.js'

describe('useErrorHandler', () => {
  it('initialises appError as null', () => {
    const { appError } = useErrorHandler()
    expect(appError.value).toBeNull()
  })

  it('appError is a Vue ref', () => {
    const { appError } = useErrorHandler()
    expect(isRef(appError)).toBe(true)
  })

  it('handleError sets the error state from a payload object', () => {
    const { appError, handleError } = useErrorHandler()
    const err = new Error('boom')
    handleError({ message: 'Something broke', error: err })
    expect(appError.value).toEqual({ message: 'Something broke', error: err })
  })

  it('dismissError resets appError to null', () => {
    const { appError, handleError, dismissError } = useErrorHandler()
    handleError({ message: 'oops', error: new Error('x') })
    dismissError()
    expect(appError.value).toBeNull()
  })

  it('calling handleError twice keeps the first error only', () => {
    const { appError, handleError } = useErrorHandler()
    const first = new Error('first')
    const second = new Error('second')
    handleError({ message: 'first message', error: first })
    handleError({ message: 'second message', error: second })
    expect(appError.value).toEqual({ message: 'first message', error: first })
  })
})
