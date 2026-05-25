import { describe, it, expect, beforeEach } from 'vitest'
import { useError } from '@/composables/useError'

describe('useError', () => {
  it('initialises error as null', () => {
    const { error } = useError()
    expect(error.value).toBeNull()
  })

  it('sets the error', () => {
    const { error, setError } = useError()
    const err = new Error('something went wrong')
    setError(err)
    expect(error.value).toBe(err)
  })

  it('first error takes priority — subsequent calls are ignored', () => {
    const { error, setError } = useError()
    const first = new Error('first')
    const second = new Error('second')
    setError(first)
    setError(second)
    expect(error.value).toBe(first)
  })

  it('each call to useError produces independent state', () => {
    const a = useError()
    const b = useError()
    a.setError(new Error('a'))
    expect(b.error.value).toBeNull()
  })

  it('clearError resets error to null', () => {
    const { error, setError, clearError } = useError()
    setError(new Error('oops'))
    clearError()
    expect(error.value).toBeNull()
  })

  it('setError works again after clearError', () => {
    const { error, setError, clearError } = useError()
    setError(new Error('first'))
    clearError()
    const second = new Error('second')
    setError(second)
    expect(error.value).toBe(second)
  })
})
