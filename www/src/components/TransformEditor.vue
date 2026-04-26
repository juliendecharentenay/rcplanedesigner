<script setup>
const props = defineProps({
  transform: { type: Object, required: true },
  label: { type: String, default: 'Transform' }
})
</script>

<template>
  <div class="text-sm">
    <p class="font-medium text-gray-500 mb-1">{{ label }}</p>
    <div class="grid grid-cols-4 gap-x-2 gap-y-1 items-center">
      <div class="text-xs text-gray-400"></div>
      <div class="text-xs text-center text-gray-400 font-medium">X</div>
      <div class="text-xs text-center text-gray-400 font-medium">Y</div>
      <div class="text-xs text-center text-gray-400 font-medium">Z</div>

      <div class="text-xs text-gray-500">Rotation</div>
      <input v-model.number="transform.rotation.x" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />
      <input v-model.number="transform.rotation.y" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />
      <input v-model.number="transform.rotation.z" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />

      <div class="text-xs text-gray-500">Scaling</div>
      <input v-model.number="transform.scaling.x" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />
      <input v-model.number="transform.scaling.y" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />
      <input v-model.number="transform.scaling.z" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />

      <div class="text-xs text-gray-500">Translation</div>
      <input v-model.number="transform.translation.x" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />
      <input v-model.number="transform.translation.y" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />
      <input v-model.number="transform.translation.z" type="number" step="any" class="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 bg-white" />
    </div>
  </div>
</template>
