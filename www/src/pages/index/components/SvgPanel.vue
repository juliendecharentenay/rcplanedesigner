<template>
  <main class="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-50">
    <!-- canvas -->
    <div class="relative w-full h-full bg-white shadow-md border border-slate-200 overflow-hidden fill-none stroke-current">
      <TrainerSideView class="w-full h-full" />
      <!--
      <svg
        class="w-full h-full"
        viewBox="0 0 800 600"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Design canvas"
      >
        <line x1="400" y1="20" x2="400" y2="580" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="6 4" />
        <line x1="20" y1="300" x2="780" y2="300" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="6 4" />

        <text x="400" y="308" text-anchor="middle" font-size="13" fill="#cbd5e1" font-family="system-ui, sans-serif">
          Design canvas
        </text>
      </svg>
      -->
    </div>
  </main>
</template>
<script setup>
import TrainerSideView from './SvgPanel/Trainer/TrainerSideView.vue'
</script>
