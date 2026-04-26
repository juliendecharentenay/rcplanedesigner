<script setup>
import { ref } from 'vue'

const props = defineProps({
  aircraft: { type: Object, required: true },
  selectedKey: { type: String, default: null }
})

const emit = defineEmits([
  'select',
  'add-wing-element',
  'delete-wing',
  'delete-wing-element'
])

const panelOpen = ref(true)
const expandedWings = ref({})

function isWingExpanded(wi) {
  return expandedWings.value[wi] !== false
}

function toggleWing(wi) {
  expandedWings.value[wi] = !isWingExpanded(wi)
}

function selectAircraft() {
  emit('select', { type: 'aircraft' })
}

function selectWing(wi) {
  emit('select', { type: 'wing', wingIndex: wi })
}

function selectElement(wi, ei) {
  emit('select', { type: 'element', wingIndex: wi, elementIndex: ei })
}

function nodeClass(key) {
  return props.selectedKey === key
    ? 'bg-blue-100 text-blue-700'
    : 'hover:bg-gray-100 text-gray-700'
}
</script>

<template>
  <div class="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-xs select-none overflow-hidden"
       :class="panelOpen ? 'w-48' : 'w-8'">

    <!-- panel header / toggle -->
    <div class="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
      <span v-if="panelOpen" class="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Structure</span>
      <button @click="panelOpen = !panelOpen"
              class="text-gray-400 hover:text-gray-600 leading-none w-4 h-4 flex items-center justify-center">
        {{ panelOpen ? '◀' : '▶' }}
      </button>
    </div>

    <div v-if="panelOpen" class="py-1 max-h-[60vh] overflow-y-auto">
      <!-- aircraft root -->
      <div
        class="flex items-center gap-1 px-2 py-0.5 cursor-pointer rounded mx-1"
        :class="nodeClass('aircraft')"
        @click="selectAircraft"
      >
        <span class="text-gray-400">✈</span>
        <span class="truncate">{{ aircraft.information.name || 'Aircraft' }}</span>
      </div>

      <!-- wings group label -->
      <div class="px-3 py-0.5 text-[10px] text-gray-400 uppercase tracking-wide mt-1">Wings</div>

      <template v-for="(wing, wi) in aircraft.wings" :key="wi">
        <!-- wing row -->
        <div class="flex items-center gap-1 px-2 py-0.5 mx-1 rounded group"
             :class="nodeClass(`wing-${wi}`)">
          <button
            @click.stop="toggleWing(wi)"
            class="text-gray-400 hover:text-gray-600 w-3 text-[10px] shrink-0"
          >{{ isWingExpanded(wi) ? '▾' : '▸' }}</button>
          <span
            class="flex-1 truncate cursor-pointer"
            @click="selectWing(wi)"
          >{{ wing.name || `wing${wi + 1}` }}</span>
          <button
            @click.stop="emit('add-wing-element', wi)"
            class="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 px-0.5"
            title="Add element"
          >+</button>
          <button
            @click.stop="emit('delete-wing', wi)"
            class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 px-0.5"
            title="Delete wing"
          >✕</button>
        </div>

        <!-- elements -->
        <template v-if="isWingExpanded(wi)">
          <div
            v-for="(el, ei) in wing.elements"
            :key="ei"
            class="flex items-center gap-1 pl-6 pr-2 py-0.5 mx-1 rounded group cursor-pointer"
            :class="nodeClass(`wing-${wi}-el-${ei}`)"
            @click="selectElement(wi, ei)"
          >
            <span class="text-gray-300 text-[10px]">—</span>
            <span class="flex-1 truncate">{{ el.airfoilUid }}</span>
            <button
              @click.stop="emit('delete-wing-element', wi, ei)"
              class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 px-0.5"
              title="Delete element"
            >✕</button>
          </div>

          <div
            class="pl-6 pr-2 py-0.5 mx-1 text-blue-500 hover:text-blue-700 cursor-pointer"
            @click="emit('add-wing-element', wi)"
          >+ element</div>
        </template>
      </template>
    </div>
  </div>
</template>
