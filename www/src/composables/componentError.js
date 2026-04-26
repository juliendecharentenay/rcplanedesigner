export function useComponentError(emit) {
  function reportError(message, error) {
    emit('error', { message, error })
  }

  function forwardError({ message, error }) {
    emit('error', { message, error })
  }

  return { reportError, forwardError }
}
