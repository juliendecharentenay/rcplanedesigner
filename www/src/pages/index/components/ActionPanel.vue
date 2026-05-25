<script setup>
import { inject } from 'vue'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'

const { focusedContent } = inject(FOCUSED_PARAM_KEY)
</script>

<template>
  <aside class="flex flex-col w-60 shrink-0 bg-white border-l border-slate-200">
    <div v-if="focusedContent" class="p-5">
      <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
        About this parameter
      </p>
      <h2 class="text-sm font-semibold text-slate-800 mb-2">{{ focusedContent.title }}</h2>
      <p class="text-xs text-slate-500 leading-relaxed">{{ focusedContent.body }}</p>
    </div>
    <div v-else class="flex-1 flex items-center justify-center p-5">
      <p class="text-xs text-slate-300 text-center leading-relaxed">
        Focus a parameter<br />to see guidance here
      </p>
    </div>
  </aside>
</template>
