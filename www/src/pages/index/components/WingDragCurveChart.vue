<script setup>
import { ref, watch, onMounted, onUnmounted, inject, computed, reactive } from 'vue'
import * as d3 from 'd3'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { getForceUnit, convertForce } from '@/units/units.js'

const props = defineProps({
  points: {
    type: Array,
    required: true,
  },
  cruiseSpeedSI: {
    type: Number,
    default: null,
  },
  minDragSpeedSI: {
    type: Number,
    default: null,
  },
  stallSpeedSI: {
    type: Number,
    default: null,
  },
  system: {
    type: String,
    default: 'SI',
  },
})

const setError = inject(SET_ERROR_KEY)

const containerEl = ref(null)
const svgEl       = ref(null)
const containerW  = ref(0)
const containerH  = ref(0)
let ro = null

onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    containerW.value = entry.contentRect.width
    containerH.value = entry.contentRect.height
  })
  ro.observe(containerEl.value)
})

onUnmounted(() => ro?.disconnect())

// Speed display conversion: SI = m/s, Imperial = mph
const MS_TO_MPH = 1 / 0.44704

function toDisplaySpeed(v_ms) {
  return props.system === 'Imperial' ? v_ms * MS_TO_MPH : v_ms
}

const speedUnit = computed(() =>
  props.system === 'Imperial' ? 'mph' : 'm/s'
)

const forceUnit = computed(() => getForceUnit(props.system))

function toDisplayForce(n) {
  return convertForce(n, 'SI', props.system)
}

// Tooltip state
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  v: null,
  baseDrag: null,
  inducedDrag: null,
  totalDrag: null,
})

function hideTooltip() {
  tooltip.visible = false
}

const MARGIN = { top: 36, right: 20, bottom: 44, left: 60 }

function draw() {
  try {
    const svg = d3.select(svgEl.value)
    svg.selectAll('*').remove()

    const W = containerW.value
    const H = containerH.value

    svg.attr('width', W).attr('height', H)

    if (!props.points || props.points.length < 2) return

    const pts = props.points

    const innerW = W - MARGIN.left - MARGIN.right
    const innerH = H - MARGIN.top - MARGIN.bottom

    // Scales — X: speed in SI (m/s), displayed in chosen unit via tick format
    const xExtent = d3.extent(pts, p => p.v)
    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([0, innerW])
      .nice()

    // Y: drag force in SI (N), ticks displayed in chosen unit
    const yMaxSI = d3.max(pts, p => p.totalDrag) * 1.1
    const yScale = d3.scaleLinear()
      .domain([0, toDisplayForce(yMaxSI)])
      .range([innerH, 0])
      .nice()

    const g = svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Chart title
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', '600')
      .attr('fill', '#1e293b')
      .text('Wing drag vs speed')

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(v => toDisplaySpeed(v).toFixed(0)))
      .attr('font-size', 10)

    // X axis label
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 36)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#475569')
      .text(`Speed (${speedUnit.value})`)

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .attr('font-size', 10)

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -48)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#475569')
      .text(`Drag (${forceUnit.value})`)

    // Line generators — Y values converted to display unit for scale
    const lineMaker = accessor => d3.line()
      .x(p => xScale(p.v))
      .y(p => yScale(toDisplayForce(accessor(p))))
      .curve(d3.curveCatmullRom.alpha(0.5))

    const curves = [
      { key: 'baseDrag',    label: 'Base drag',    color: '#3b82f6', accessor: p => p.baseDrag    },
      { key: 'inducedDrag', label: 'Induced drag', color: '#f59e0b', accessor: p => p.inducedDrag },
      { key: 'totalDrag',   label: 'Total drag',   color: '#ef4444', accessor: p => p.totalDrag   },
    ]

    for (const curve of curves) {
      g.append('path')
        .datum(pts)
        .attr('fill', 'none')
        .attr('stroke', curve.color)
        .attr('stroke-width', 1.8)
        .attr('d', lineMaker(curve.accessor))
    }

    // Helper: interpolate a drag value at a given speed from the points array
    function valueAtSpeed(v, accessor) {
      for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i].v <= v && v <= pts[i + 1].v) {
          const t = (v - pts[i].v) / (pts[i + 1].v - pts[i].v)
          return accessor(pts[i]) + t * (accessor(pts[i + 1]) - accessor(pts[i]))
        }
      }
      if (v <= pts[0].v) return accessor(pts[0])
      return accessor(pts[pts.length - 1])
    }

    // Marker dots — cruise speed and (optionally) min drag speed
    const SPEED_THRESHOLD = 0.5  // m/s — merge markers if closer than this

    const markerSpeeds = []
    if (props.cruiseSpeedSI != null) {
      markerSpeeds.push({ v: props.cruiseSpeedSI, label: 'Cruise' })
    }

    for (const marker of markerSpeeds) {
      const vClamped = Math.min(Math.max(marker.v, xExtent[0]), xExtent[1])
      const mx = xScale(vClamped)

      // Vertical guide line
      g.append('line')
        .attr('x1', mx).attr('y1', 0)
        .attr('x2', mx).attr('y2', innerH)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 3')

      // Dots on each curve
      for (const curve of curves) {
        const cy = yScale(toDisplayForce(valueAtSpeed(vClamped, curve.accessor)))
        g.append('circle')
          .attr('cx', mx)
          .attr('cy', cy)
          .attr('r', 4)
          .attr('fill', curve.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
      }
    }

    // Legend — top left corner inside the chart area
    const legendX = 8
    const legendY = 4
    const LROW = 16

    curves.forEach((curve, i) => {
      const ly = legendY + i * LROW
      g.append('line')
        .attr('x1', legendX).attr('y1', ly + 6)
        .attr('x2', legendX + 16).attr('y2', ly + 6)
        .attr('stroke', curve.color).attr('stroke-width', 2)
      g.append('text')
        .attr('x', legendX + 20).attr('y', ly + 10)
        .attr('text-anchor', 'start')
        .attr('font-size', 9)
        .attr('fill', '#475569')
        .text(curve.label)
    })

    // Invisible overlay rect for mouse tracking
    g.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event)
        const v = xScale.invert(mx)
        const vClamped = Math.min(Math.max(v, xExtent[0]), xExtent[1])
        tooltip.visible = true
        tooltip.x = event.offsetX + 12
        tooltip.y = event.offsetY - 10
        tooltip.v         = toDisplaySpeed(vClamped)
        tooltip.baseDrag   = toDisplayForce(valueAtSpeed(vClamped, p => p.baseDrag))
        tooltip.inducedDrag = toDisplayForce(valueAtSpeed(vClamped, p => p.inducedDrag))
        tooltip.totalDrag   = toDisplayForce(valueAtSpeed(vClamped, p => p.totalDrag))
      })
      .on('mouseleave', hideTooltip)

  } catch (e) { setError(e); return }
}

watch(
  [() => props.points, () => props.system, containerW, containerH],
  () => {
    if (!svgEl.value || containerW.value === 0) return
    draw()
  },
  { flush: 'post', immediate: true },
)
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg ref="svgEl" class="block w-full h-full" />

    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      class="pointer-events-none absolute z-20 rounded border border-slate-200 bg-white/95 px-2 py-1 text-xs shadow"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="font-medium text-slate-700">{{ tooltip.v?.toFixed(1) }} {{ speedUnit }}</div>
      <div class="text-blue-600">Base: {{ tooltip.baseDrag?.toFixed(3) }} {{ forceUnit }}</div>
      <div class="text-amber-600">Induced: {{ tooltip.inducedDrag?.toFixed(3) }} {{ forceUnit }}</div>
      <div class="text-red-600">Total: {{ tooltip.totalDrag?.toFixed(3) }} {{ forceUnit }}</div>
    </div>
  </div>
</template>
