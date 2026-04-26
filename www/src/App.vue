<script setup>
import { reactive, ref, computed } from 'vue'
import { init, pushWing, deleteWing, pushWingElement, deleteWingElement } from '@/js/aircraft.js'
import { useErrorHandler } from '@/composables/errorHandler.js'
import AppHeader from '@/components/AppHeader.vue'
import GeometryViewer from '@/components/GeometryViewer.vue'
import GeometryTree from '@/components/GeometryTree.vue'
import BottomPanel from '@/components/BottomPanel.vue'
import ErrorModal from '@/components/ErrorModal.vue'

const { appError, handleError, dismissError } = useErrorHandler()

const aircraft = reactive(init())
const selection = ref(null)

const selectedKey = computed(() => {
  const s = selection.value
  if (!s) return null
  if (s.type === 'aircraft') return 'aircraft'
  if (s.type === 'wing') return `wing-${s.wingIndex}`
  return `wing-${s.wingIndex}-el-${s.elementIndex}`
})

function handleSelect(sel) {
  const key = sel.type === 'aircraft' ? 'aircraft'
    : sel.type === 'wing' ? `wing-${sel.wingIndex}`
    : `wing-${sel.wingIndex}-el-${sel.elementIndex}`
  if (selectedKey.value === key) {
    selection.value = null
  } else {
    selection.value = sel
  }
}

function handleUpdateInformation(patch) {
  Object.assign(aircraft.information, patch)
}

function handleAddWing() {
  pushWing(aircraft)
}

function handleDeleteWing(wingIndex) {
  if (selection.value?.wingIndex === wingIndex) selection.value = null
  deleteWing(aircraft, wingIndex)
}

function handleAddElement(wingIndex) {
  pushWingElement(aircraft, wingIndex)
}

function handleDeleteElement(wingIndex, elementIndex) {
  if (selection.value?.wingIndex === wingIndex &&
      selection.value?.elementIndex === elementIndex) {
    selection.value = null
  }
  deleteWingElement(aircraft, wingIndex, elementIndex)
}

function handleWingUpdate(wingIndex, patch) {
  Object.assign(aircraft.wings[wingIndex], patch)
}

function handleElementUpdate(wingIndex, elementIndex, patch) {
  Object.assign(aircraft.wings[wingIndex].elements[elementIndex], patch)
}

function handleExportXml() {
  const name = aircraft.information.name || 'aircraft'
  const xml = buildXml(aircraft)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.xml`
  a.click()
  URL.revokeObjectURL(url)
}

function buildXml(ac) {
  const info = ac.information
  const ts = new Date().toISOString()
  const wings = ac.wings.map((wing, wi) => {
    const elements = wing.elements.map((el, ei) => {
      const t = el.transform
      return `      <element>
        <airfoilUID>${el.airfoilUid}</airfoilUID>
        <transformation>
          <rotation><x>${t.rotation.x}</x><y>${t.rotation.y}</y><z>${t.rotation.z}</z></rotation>
          <scaling><x>${t.scaling.x}</x><y>${t.scaling.y}</y><z>${t.scaling.z}</z></scaling>
          <translation><x>${t.translation.x}</x><y>${t.translation.y}</y><z>${t.translation.z}</z></translation>
        </transformation>
      </element>`
    }).join('\n')
    const t = wing.transform
    return `    <wing>
      <name>${wing.name}</name>
      <transformation>
        <rotation><x>${t.rotation.x}</x><y>${t.rotation.y}</y><z>${t.rotation.z}</z></rotation>
        <scaling><x>${t.scaling.x}</x><y>${t.scaling.y}</y><z>${t.scaling.z}</z></scaling>
        <translation><x>${t.translation.x}</x><y>${t.translation.y}</y><z>${t.translation.z}</z></translation>
      </transformation>
      <elements>
${elements}
      </elements>
    </wing>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<aircraft>
  <header>
    <name>${info.name}</name>
    <version>${info.version}</version>
    <creator>${info.creator}</creator>
    <timestamp>${ts}</timestamp>
  </header>
  <wings>
${wings}
  </wings>
</aircraft>`
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100">

    <AppHeader
      :information="aircraft.information"
      @update:information="handleUpdateInformation"
      @add-wing="handleAddWing"
      @export-xml="handleExportXml"
      @error="handleError"
    />

    <div class="flex-1 relative overflow-hidden">

      <GeometryViewer
        :aircraft="aircraft"
        :selected-key="selectedKey"
        class="absolute inset-0"
        @select="handleSelect"
        @error="handleError"
      />

      <GeometryTree
        :aircraft="aircraft"
        :selected-key="selectedKey"
        class="absolute top-3 left-3 z-10"
        @select="handleSelect"
        @add-wing-element="handleAddElement"
        @delete-wing="handleDeleteWing"
        @delete-wing-element="handleDeleteElement"
        @error="handleError"
      />

      <Transition name="slide-up">
        <BottomPanel
          v-if="selection !== null"
          :selection="selection"
          :aircraft="aircraft"
          @close="selection = null"
          @update:wing="handleWingUpdate"
          @update:element="handleElementUpdate"
          @error="handleError"
        />
      </Transition>

    </div>

    <ErrorModal
      v-if="appError !== null"
      :app-error="appError"
      @dismiss="dismissError"
    />

  </div>
</template>

<style>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0%);
}
</style>
