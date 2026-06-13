<script setup>
defineProps({
  label:   { type: String, required: true },
  inputId: { type: String, default: undefined },
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <label
      :for="inputId"
      class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest select-none"
    >
      {{ label }}
    </label>
    <slot />
  </div>
</template>
