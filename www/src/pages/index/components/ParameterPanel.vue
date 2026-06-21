<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { APP_STATE_KEY, } from '../composables/useAppState'
import { FOCUSED_PARAM_KEY } from '../composables/useFocusedParam'
import GeneralPanel from './ParameterPanel/GeneralPanel.vue'
import WingDefinitionPanel from './ParameterPanel/WingDefinitionPanel.vue'
import FuselageDefinitionPanel from './ParameterPanel/FuselageDefinitionPanel.vue'
import {
  ArrowTopRightOnSquareIcon,
  } from '@heroicons/vue/24/outline'

const props = defineProps({
  activePanel: { type: String, default: 'general' },
})
const emit = defineEmits(['navigate'])

const { getState, } = inject(APP_STATE_KEY)
const { register, setFocused, clearFocused } = inject(FOCUSED_PARAM_KEY)

// — Dropdown state —
const dropdownOpen = ref(false)
const asideEl = ref(null)

function toggleDropdown() { dropdownOpen.value = !dropdownOpen.value }
function closeDropdown()  { dropdownOpen.value = false }

const canNavigateToWing = computed(() => {
  const s = getState()
  return s.airfoilProfile !== null && s.wingLoading > 0 && s.cruisingSpeed > 0
})

const canNavigateToFuselage = computed(() => {
  const s = getState()
  return s.wingSpan > 0 && s.rootChord > 0
})

function navigateTo(panel) {
  if (!canNavigateToWing.value && panel === 'wing-definition') return
  if (!canNavigateToFuselage.value && panel === 'fuselage-definition') return
  emit('navigate', panel)
  closeDropdown()
}

function onDocumentMouseDown(e) {
  if (asideEl.value && !asideEl.value.contains(e.target)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('mousedown', onDocumentMouseDown))
onUnmounted(() => document.removeEventListener('mousedown', onDocumentMouseDown))

// — Existing General state —
function onPanelFocusOut(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setTimeout(() => clearFocused(), 200)
  }
}
</script>

<template>
  <aside
    ref="asideEl"
    class="flex flex-col min-w-48 max-w-96 bg-white/90 backdrop-blur-sm border-r border-slate-200 shadow-xl"
    @focusout="onPanelFocusOut"
  >
    <!-- Header — clickable to open dropdown -->
    <div
      class="flex items-center gap-2 px-4 py-3 border-b border-slate-100 cursor-pointer select-none"
      @click="toggleDropdown"
    >
      <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 4h12M2 8h8M2 12h10" stroke-linecap="round" />
      </svg>
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">
        {{ props.activePanel === 'general' ? 'General' : props.activePanel === 'wing-definition' ? 'Wing Definition' : 'Fuselage &amp; Tail' }}
      </span>
      <svg class="ml-auto w-3 h-3 text-slate-400" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 4l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <!-- Dropdown menu -->
    <div
      v-if="dropdownOpen"
      data-testid="panel-dropdown"
      class="absolute z-20 left-0 top-12 w-full bg-white border border-slate-200 shadow-lg rounded-b"
    >
      <button
        class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
        @click="navigateTo('general')"
      >
        General
      </button>
      <button
        class="w-full text-left px-4 py-2 text-sm"
        :class="canNavigateToWing ? 'hover:bg-slate-50' : 'text-slate-400 cursor-default'"
        :disabled="!canNavigateToWing"
        @click="navigateTo('wing-definition')"
      >
        Wing Definition
      </button>
      <button
        class="w-full text-left px-4 py-2 text-sm"
        :class="canNavigateToFuselage ? 'hover:bg-slate-50' : 'text-slate-400 cursor-default'"
        :disabled="!canNavigateToFuselage"
        @click="navigateTo('fuselage-definition')"
      >
        Fuselage &amp; Tail
      </button>
    </div>

    <!-- General panel body -->
    <GeneralPanel :can-navigate-to-wing="canNavigateToWing"
      v-if="props.activePanel === 'general'" @navigate="emit('navigate', $event)" />

    <!-- Wing Definition panel body -->
    <WingDefinitionPanel v-else-if="props.activePanel === 'wing-definition'" @navigate="emit('navigate', $event)" />

    <!-- Fuselage & Tail panel body -->
    <FuselageDefinitionPanel v-else-if="props.activePanel === 'fuselage-definition'" @navigate="emit('navigate', $event)" />

    <!-- else -->
    <div v-else>
      Oops, you have navigated to panel {{ props.activePanel }} which does not exists.
    </div>
  </aside>
</template>
