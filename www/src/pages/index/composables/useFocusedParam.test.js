import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useFocusedParam } from './useFocusedParam'

const CONTENT_A = { title: 'Alpha', body: 'Description A' }
const CONTENT_B = { title: 'Beta',  body: 'Description B' }

describe('useFocusedParam', () => {
  it('focusedKey starts as null', () => {
    const { focusedKey } = useFocusedParam()
    expect(focusedKey.value).toBeNull()
  })

  it('focusedContent starts as null', () => {
    const { focusedContent } = useFocusedParam()
    expect(focusedContent.value).toBeNull()
  })

  it('setFocused updates focusedKey', () => {
    const { focusedKey, setFocused } = useFocusedParam()
    setFocused('alpha')
    expect(focusedKey.value).toBe('alpha')
  })

  it('clearFocused resets focusedKey to null', () => {
    const { focusedKey, setFocused, clearFocused } = useFocusedParam()
    setFocused('alpha')
    clearFocused()
    expect(focusedKey.value).toBeNull()
  })

  it('focusedContent returns the registered content for the focused key', () => {
    const { focusedContent, register, setFocused } = useFocusedParam()
    register('alpha', CONTENT_A)
    setFocused('alpha')
    expect(focusedContent.value).toBe(CONTENT_A)
  })

  it('focusedContent returns null when nothing is focused', () => {
    const { focusedContent, register } = useFocusedParam()
    register('alpha', CONTENT_A)
    expect(focusedContent.value).toBeNull()
  })

  it('focusedContent returns null for an unregistered key', () => {
    const { focusedContent, setFocused } = useFocusedParam()
    setFocused('unknown')
    expect(focusedContent.value).toBeNull()
  })

  it('focusedContent updates reactively when focused key changes', () => {
    const { focusedContent, register, setFocused } = useFocusedParam()
    register('alpha', CONTENT_A)
    register('beta',  CONTENT_B)
    setFocused('alpha')
    expect(focusedContent.value).toBe(CONTENT_A)
    setFocused('beta')
    expect(focusedContent.value).toBe(CONTENT_B)
  })

  it('each call to useFocusedParam produces independent state', () => {
    const a = useFocusedParam()
    const b = useFocusedParam()
    a.setFocused('x')
    expect(b.focusedKey.value).toBeNull()
  })

  it('focusedContent unwraps a ref body', () => {
    const { focusedContent, register, setFocused } = useFocusedParam()
    const body = ref('initial text')
    register('alpha', { title: 'Alpha', body })
    setFocused('alpha')
    expect(focusedContent.value.body).toBe('initial text')
    body.value = 'updated text'
    expect(focusedContent.value.body).toBe('updated text')
  })

  it('focusedContent returns the original object when body is a plain string', () => {
    const { focusedContent, register, setFocused } = useFocusedParam()
    register('alpha', CONTENT_A)
    setFocused('alpha')
    expect(focusedContent.value).toBe(CONTENT_A)
  })
})
