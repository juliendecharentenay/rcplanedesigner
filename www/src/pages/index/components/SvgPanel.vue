<template>
  <main class="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-50">
    <!-- canvas -->
    <div class="relative w-full h-full bg-white shadow-md border border-slate-200 overflow-hidden fill-none stroke-current">
      <TrainerSideView v-if="props.activePanel === 'general'" class="w-full h-full" />
      <WingDiagramChart v-else-if="props.activePanel === 'wing-definition'" class="w-full h-full" />
    </div>
  </main>
</template>
<script setup>
import TrainerSideView from './SvgPanel/Trainer/TrainerSideView.vue'
import WingDiagramChart from './WingDiagramChart.vue'

const props = defineProps({
  activePanel: { type: String, default: 'general' },
})
</script>
