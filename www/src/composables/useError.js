import { ref } from 'vue'

export const SET_ERROR_KEY = Symbol('setError')

export function useError() {
  const error = ref(null)

  function setError(err) {
    if (error.value === null) {
      if (err) console.error(err);
      error.value = err
    }
  }

  function clearError() {
    error.value = null
  }

  return { error, setError, clearError }
}
