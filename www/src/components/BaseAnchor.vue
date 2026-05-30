<script setup>
defineProps({
  modelValue: { type: [String, Number], required: true },
  id:         { type: String, default: undefined },
})
import { ChevronRightIcon } from "@heroicons/vue/24/outline"
</script>

<template>
  <div class="relative flex items-center">
    <a
      href="javascript:void(0);"
      :id="id"
      class="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm
             focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500
             hover:border-slate-400 transition-colors no-underline"
      >{{ modelValue }}
    </a>
    <span class="absolute right-1"><ChevronRightIcon class="w-4 h-4" /></span>
  </div>
</template>
