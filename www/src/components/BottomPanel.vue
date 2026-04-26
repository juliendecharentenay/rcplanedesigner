<script setup>
import { computed } from 'vue'
import TransformEditor from './TransformEditor.vue'
import AirfoilSelector from './AirfoilSelector.vue'

const props = defineProps({
  selection: { type: Object, required: true },
  aircraft: { type: Object, required: true }
})

const emit = defineEmits(['close', 'update:wing', 'update:element'])

const title = computed(() => {
  const s = props.selection
  if (s.type === 'aircraft') return 'Aircraft'
  if (s.type === 'wing') {
    const wing = props.aircraft.wings[s.wingIndex]
    return wing?.name || `Wing ${s.wingIndex + 1}`
  }
  if (s.type === 'element') {
    const el = props.aircraft.wings[s.wingIndex]?.elements[s.elementIndex]
    return `${props.aircraft.wings[s.wingIndex]?.name || `Wing ${s.wingIndex + 1}`} — Element ${s.elementIndex + 1}`
  }
  return ''
})

const wing = computed(() => {
  if (props.selection.type === 'wing' || props.selection.type === 'element') {
    return props.aircraft.wings[props.selection.wingIndex] ?? null
  }
  return null
})

const element = computed(() => {
  if (props.selection.type === 'element') {
    return props.aircraft.wings[props.selection.wingIndex]?.elements[props.selection.elementIndex] ?? null
  }
  return null
})

function updateWingName(e) {
  emit('update:wing', props.selection.wingIndex, { name: e.target.value })
}

function updateAirfoil(uid) {
  emit('update:element', props.selection.wingIndex, props.selection.elementIndex, { airfoilUid: uid })
}

function updateInformation(field, value) {
  // aircraft-level info edits handled in App.vue — just emit a stub
}
</script>

<template>
  <div class="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl
              max-h-[40vh] overflow-y-auto z-20 rounded-t-2xl">

    <!-- panel header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 sticky top-0 bg-white z-10">
      <span class="text-sm font-semibold text-gray-700">{{ title }}</span>
      <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">✕</button>
    </div>

    <div class="px-4 py-3 space-y-4">

      <!-- Aircraft level -->
      <template v-if="selection.type === 'aircraft'">
        <p class="text-xs text-gray-400">Select a wing or element to edit its properties.</p>
      </template>

      <!-- Wing level -->
      <template v-if="selection.type === 'wing' && wing">
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Wing name</label>
            <input
              :value="wing.name"
              @input="updateWingName"
              class="text-sm border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <TransformEditor :transform="wing.transform" label="Wing transform" />
        </div>
      </template>

      <!-- Element level -->
      <template v-if="selection.type === 'element' && element">
        <div class="space-y-3">
          <AirfoilSelector :modelValue="element.airfoilUid" @update:modelValue="updateAirfoil" />
          <TransformEditor :transform="element.transform" label="Element transform" />
        </div>
      </template>

    </div>
  </div>
</template>
