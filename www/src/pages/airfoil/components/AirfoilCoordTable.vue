<script setup>
import { computed } from 'vue'

const props = defineProps({
  airfoil: { type: Object, default: null },
})

const coords = computed(() => {
  if (!props.airfoil) return []
  const { x, y } = props.airfoil.coord
  return x.map((xi, i) => ({ x: xi, y: y[i] }))
})
</script>

<template>
  <div class="overflow-y-auto h-full">
    <table class="w-full text-xs font-mono border-collapse">
      <thead class="sticky top-0 bg-white z-10">
        <tr>
          <th class="text-left px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-200">X</th>
          <th class="text-left px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-200">Y</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(c, i) in coords"
          :key="i"
          :class="i % 2 === 0 ? 'bg-white' : 'bg-slate-50'"
        >
          <td class="px-3 py-1 text-slate-600">{{ c.x.toFixed(2) }}</td>
          <td class="px-3 py-1 text-slate-600">{{ c.y.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
