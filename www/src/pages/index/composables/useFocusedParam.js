import { computed, isRef, ref } from 'vue'

export const FOCUSED_PARAM_KEY = Symbol('focusedParam')

export function useFocusedParam() {
  const focusedKey = ref(null)
  const registry = new Map() // paramKey → { title, body } (body may be a ref)

  function register(key, content) {
    registry.set(key, content)
  }

  function setFocused(key) {
    focusedKey.value = key
  }

  function clearFocused() {
    focusedKey.value = null
  }

  const focusedContent = computed(() => {
    const content = focusedKey.value !== null ? (registry.get(focusedKey.value) ?? null) : null
    if (!content) return null
    if (isRef(content.body)) return { title: content.title, body: content.body.value }
    return content
  })

  return { focusedKey, focusedContent, register, setFocused, clearFocused }
}
