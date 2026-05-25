<script setup>
defineProps({
  modelValue: { type: [String, Number], required: true },
  type:       { type: String, default: 'text' },
  id:         { type: String, default: undefined },
  min:        { type: Number, default: undefined },
  max:        { type: Number, default: undefined },
  step:       { type: Number, default: undefined },
  suffix:     { type: String, default: undefined },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative flex items-center">
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      class="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm
             focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500
             hover:border-slate-400 transition-colors"
      :class="suffix ? 'pr-8' : ''"
      @input="$emit('update:modelValue', type === 'number' ? Number($event.target.value) : $event.target.value)"
    />
    <span v-if="suffix" class="pointer-events-none absolute right-2.5 text-xs text-slate-400 select-none">
      {{ suffix }}
    </span>
  </div>
</template>
