<script setup>
defineProps({
  modelValue: { type: String, required: true },
  options: {
    type: Array,
    required: true,
    // each option: { value: string, label: string }
  },
  id: { type: String, default: undefined },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <select
    :id="id"
    :value="modelValue"
    class="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm
           focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500
           hover:border-slate-400 transition-colors cursor-pointer"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option v-for="opt in options" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>
</template>
