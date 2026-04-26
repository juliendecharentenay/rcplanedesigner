<script setup>
defineProps({
  appError: { type: Object, required: true }
})

const emit = defineEmits(['dismiss'])
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">

      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
          <span class="text-red-600 text-xs font-bold">!</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-800">{{ appError.message }}</p>
          <p v-if="appError.error?.message" class="mt-1 text-xs text-gray-500 font-mono break-words">
            {{ appError.error.message }}
          </p>
        </div>
      </div>

      <button
        @click="emit('dismiss')"
        class="w-full text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2 transition-colors"
      >
        Dismiss
      </button>

    </div>
  </div>
</template>
