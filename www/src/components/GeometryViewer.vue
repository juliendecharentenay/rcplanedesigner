<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  WebGLRenderer, Scene, PerspectiveCamera,
  AmbientLight, DirectionalLight, Color
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useAircraftGeometry } from '@/composables/useAircraftGeometry.js'

const props = defineProps({
  aircraft: { type: Object, required: true },
  selectedKey: { type: String, default: null }
})

const canvasRef = ref(null)
const wireframe = ref(false)

const scene = new Scene()
scene.background = new Color(0xf0f4f8)

const aircraftRef = computed(() => props.aircraft)
const { setWireframe } = useAircraftGeometry(scene, aircraftRef)

let renderer, camera, controls, animId, resizeObserver

onMounted(() => {
  renderer = new WebGLRenderer({ canvas: canvasRef.value, antialias: true })

  const parent = canvasRef.value.parentElement
  renderer.setSize(parent.clientWidth, parent.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)

  camera = new PerspectiveCamera(45, parent.clientWidth / parent.clientHeight, 0.01, 1000)
  camera.position.set(5, -3, 3)
  camera.up.set(0, 0, 1)
  camera.lookAt(0, 2, 0)

  scene.add(new AmbientLight(0xffffff, 0.4))
  const key = new DirectionalLight(0xffffff, 0.8)
  key.position.set(3, -2, 4)
  scene.add(key)
  const fill = new DirectionalLight(0xffffff, 0.3)
  fill.position.set(-3, 2, -1)
  scene.add(fill)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  resizeObserver = new ResizeObserver(() => {
    const pw = parent.clientWidth
    const ph = parent.clientHeight
    if (!pw || !ph) return
    renderer.setSize(pw, ph)
    camera.aspect = pw / ph
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(parent)

  function loop() {
    animId = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
  }
  loop()
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  resizeObserver?.disconnect()
  controls?.dispose()
  renderer?.dispose()
})

function toggleWireframe() {
  wireframe.value = !wireframe.value
  setWireframe(wireframe.value)
}
</script>

<template>
  <div class="relative w-full h-full">
    <canvas ref="canvasRef" class="w-full h-full block" />

    <button
      @click="toggleWireframe"
      class="absolute top-3 right-3 text-xs bg-white border border-gray-200 rounded px-2 py-1 shadow hover:bg-gray-50"
    >
      {{ wireframe ? 'Solid' : 'Wireframe' }}
    </button>

    <div class="absolute bottom-3 right-3 text-xs text-gray-500 bg-white/80 rounded px-2 py-1 leading-5">
      <span class="text-red-500 font-bold">X</span> chord &nbsp;
      <span class="text-green-600 font-bold">Y</span> span &nbsp;
      <span class="text-blue-500 font-bold">Z</span> thickness
    </div>
  </div>
</template>
