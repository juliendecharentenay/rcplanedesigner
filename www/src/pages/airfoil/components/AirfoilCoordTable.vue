<script setup>
import { inject, computed } from 'vue'
import { SET_ERROR_KEY } from '@/composables/useError.js'
const setError = inject(SET_ERROR_KEY);

const props = defineProps({
  airfoil: { type: Object, default: null },
})

const coords = computed(() => {
  try {
    if (!props.airfoil) return []
    const { x, y } = props.airfoil.coord
    return x.map((xi, i) => ({ x: xi, y: y[i] }))
  } catch (e) { setError(e) }
})
</script>

<template>
  <div class="overflow-y-auto h-full">
    <table class="w-full text-xs font-mono border-collapse">
      <thead class="sticky top-0 bg-white z-10">
        <tr>
          <th class="table-th text-left">X</th>
          <th class="table-th text-left">Y</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(c, i) in coords"
          :key="i"
          class="table-row-banded"
        >
          <td class="px-3 py-1 text-slate-600">{{ c.x.toFixed(2) }}</td>
          <td class="px-3 py-1 text-slate-600">{{ c.y.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
