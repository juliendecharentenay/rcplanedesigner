<script setup>
import { airfoils } from '@/data/airfoils.js'

const props = defineProps({
  modelValue: { type: String, required: true }
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex items-center gap-2">
    <label class="text-xs text-gray-500 whitespace-nowrap">Airfoil</label>
    <select
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
      class="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white
             focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
    >
      <option v-for="a in airfoils" :key="a.uID" :value="a.uID">
        {{ a.uID }} — {{ a.name }}
      </option>
    </select>
  </div>
</template>
