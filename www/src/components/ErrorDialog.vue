<script setup>
defineProps({
  error: {
    default: null,
    validator: (v) => v === null || v instanceof Error,
  },
})

defineEmits(['dismiss'])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="error"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </span>
          <div>
            <h2 id="error-dialog-title" class="text-gray-900 font-semibold">
              An error occurred
            </h2>
            <p class="mt-1 text-sm text-gray-600">{{ error.message }}</p>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
            @click="$emit('dismiss')"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
