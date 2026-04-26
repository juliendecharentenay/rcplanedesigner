import { ref } from 'vue'

export function useErrorHandler() {
  const appError = ref(null)

  function handleError({ message, error }) {
    if (appError.value === null) {
      appError.value = { message, error }
    }
  }

  function dismissError() {
    appError.value = null
  }

  return { appError, handleError, dismissError }
}
