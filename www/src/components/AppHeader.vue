<script setup>
const props = defineProps({
  information: { type: Object, required: true }
})

const emit = defineEmits(['update:information', 'add-wing', 'export-xml'])

function update(field, value) {
  emit('update:information', { ...props.information, [field]: value })
}
</script>

<template>
  <header class="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0 gap-4">
    <div class="flex items-center gap-3 min-w-0">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">Aircraft</span>
      <input
        :value="information.name"
        @input="update('name', $event.target.value)"
        placeholder="Name"
        class="text-sm border border-gray-200 rounded px-2 py-1 w-36 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      />
      <input
        :value="information.version"
        @input="update('version', $event.target.value)"
        placeholder="Version"
        class="text-sm border border-gray-200 rounded px-2 py-1 w-24 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      />
      <input
        :value="information.creator"
        @input="update('creator', $event.target.value)"
        placeholder="Creator"
        class="text-sm border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      />
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button
        @click="emit('add-wing')"
        class="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 font-medium"
      >
        + Wing
      </button>
      <button
        @click="emit('export-xml')"
        class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded px-3 py-1.5 font-medium"
      >
        Export XML
      </button>
    </div>
  </header>
</template>
