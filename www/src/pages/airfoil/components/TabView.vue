<script setup>
defineProps({
  tabs:       { type: Array,  required: true },
  modelValue: { type: String, required: true },
})

defineEmits(['update:modelValue'])

function slotName(tab) {
  // 'Airfoil Viewer' → 'AirfoilViewer', 'Polar' → 'Polar'
  return tab.replace(/\s+(.)/g, (_, c) => c.toUpperCase())
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex border-b border-slate-200 bg-white px-4 shrink-0">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none"
        :class="tab === modelValue
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'"
        @click="$emit('update:modelValue', tab)"
      >
        {{ tab }}
      </button>
    </div>

    <div class="flex-1 overflow-hidden">
      <template v-for="tab in tabs" :key="tab">
        <div v-show="tab === modelValue" class="h-full">
          <slot :name="slotName(tab)" />
        </div>
      </template>
    </div>
  </div>
</template>
