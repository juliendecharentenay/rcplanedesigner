<script setup>
defineProps({
  axes: {
    type: Object,
    required: true,
    // { x: {ex, ey, lx, ly}, y: {ex, ey, lx, ly}, z: {ex, ey, lx, ly} }
  },
})

const emit = defineEmits(['snap'])
</script>

<template>
  <div class="bg-white/80 rounded-lg shadow-md select-none" title="Click axis label to snap view">
    <svg width="80" height="80" viewBox="0 0 100 100">
      <line :x1="50" :y1="50" :x2="axes.x.ex" :y2="axes.x.ey" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
      <line :x1="50" :y1="50" :x2="axes.y.ex" :y2="axes.y.ey" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/>
      <line :x1="50" :y1="50" :x2="axes.z.ex" :y2="axes.z.ey" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="3" fill="#6b7280"/>
      <text :x="axes.x.lx" :y="axes.x.ly" text-anchor="middle" dominant-baseline="middle"
        fill="#ef4444" font-size="14" font-weight="bold" class="cursor-pointer"
        @click="emit('snap', 'x')">X</text>
      <text :x="axes.y.lx" :y="axes.y.ly" text-anchor="middle" dominant-baseline="middle"
        fill="#16a34a" font-size="14" font-weight="bold" class="cursor-pointer"
        @click="emit('snap', 'y')">Y</text>
      <text :x="axes.z.lx" :y="axes.z.ly" text-anchor="middle" dominant-baseline="middle"
        fill="#3b82f6" font-size="14" font-weight="bold" class="cursor-pointer"
        @click="emit('snap', 'z')">Z</text>
    </svg>
  </div>
</template>
