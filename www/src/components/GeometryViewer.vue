<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  WebGLRenderer, Scene, PerspectiveCamera,
  AmbientLight, DirectionalLight, Color,
  AxesHelper, Vector3
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useAircraftGeometry } from '@/composables/useAircraftGeometry.js'
import { useComponentError } from '@/composables/componentError.js'
import AxisGizmo from '@/components/AxisGizmo.vue'

const props = defineProps({
  aircraft: { type: Object, required: true },
  selectedKey: { type: String, default: null }
})

const emit = defineEmits(['select', 'error'])
const { reportError } = useComponentError(emit)

const canvasRef = ref(null)
const wireframe = ref(false)

const scene = new Scene()
scene.background = new Color(0xf0f4f8)

const aircraftRef = computed(() => props.aircraft)
const { setWireframe } = useAircraftGeometry(scene, aircraftRef)

// Gizmo state: projected SVG coordinates for each axis label and line endpoint
const gizmo = ref({
  x: { ex: 82, ey: 50, lx: 90, ly: 50 },
  y: { ex: 50, ey: 82, lx: 50, ly: 90 },
  z: { ex: 50, ey: 18, lx: 50, ly: 10 },
})

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

  scene.add(new AxesHelper(1.5))

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

  const _worldAxes = {
    x: new Vector3(1, 0, 0),
    y: new Vector3(0, 1, 0),
    z: new Vector3(0, 0, 1),
  }
  const _tmp = new Vector3()

  function updateGizmo() {
    // Project world axes into camera space to drive the 2D SVG gizmo
    const cx = 50, cy = 50, lineR = 32, labelR = 44
    const out = {}
    for (const [k, worldDir] of Object.entries(_worldAxes)) {
      _tmp.copy(worldDir).transformDirection(camera.matrixWorldInverse)
      // camera space: +x = right, +y = up (SVG y is flipped)
      out[k] = {
        ex: cx + _tmp.x * lineR,
        ey: cy - _tmp.y * lineR,
        lx: cx + _tmp.x * labelR,
        ly: cy - _tmp.y * labelR,
      }
    }
    gizmo.value = out
  }

  function loop() {
    animId = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
    updateGizmo()
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

function snapView(axis) {
  const target = controls.target.clone()
  const dist = camera.position.distanceTo(target)
  if (axis === 'x') {
    // Side view: look along X, Z is up
    camera.position.set(target.x - dist, target.y, target.z)
    camera.up.set(0, 0, 1)
  } else if (axis === 'y') {
    // Front view: look along Y, Z is up
    camera.position.set(target.x, target.y - dist, target.z)
    camera.up.set(0, 0, 1)
  } else if (axis === 'z') {
    // Top view: look down Z, Y span runs up in viewport
    camera.position.set(target.x, target.y, target.z + dist)
    camera.up.set(0, 1, 0)
  }
  camera.lookAt(target)
  controls.target.copy(target)
  controls.update()
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

    <div class="absolute bottom-3 left-3">
      <AxisGizmo :axes="gizmo" @snap="snapView" />
    </div>

    <div class="absolute bottom-3 right-3 text-xs text-gray-500 bg-white/80 rounded px-2 py-1 leading-5">
      <span class="text-red-500 font-bold">X</span> chord &nbsp;
      <span class="text-green-600 font-bold">Y</span> span &nbsp;
      <span class="text-blue-500 font-bold">Z</span> thickness
    </div>
  </div>
</template>
