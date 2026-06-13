<script setup>
import { ref, watch, onMounted, onUnmounted, inject } from 'vue'
import * as d3 from 'd3'
import { SET_ERROR_KEY } from '@/composables/useError.js'

const setError = inject(SET_ERROR_KEY)

const props = defineProps({
  airfoil:   { type: Object, default: null },
  targetCl: { default: null },
})

const containerEl = ref(null)
const svgEl       = ref(null)
const containerW  = ref(0)
const containerH  = ref(0)

const MARGIN = { top: 40, right: 20, bottom: 20, left: 130 }

let ro = null

onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    containerW.value = entry.contentRect.width
    containerH.value = entry.contentRect.height
  })
  ro.observe(containerEl.value)
})

onUnmounted(() => ro?.disconnect())

watch(
  [() => props.airfoil, () => props.targetCl, containerW, containerH],
  () => {
    if (!props.airfoil || !svgEl.value || containerW.value === 0) return
    draw()
  },
  { flush: 'post', immediate: true },
)

function aoaAnnotations() {
  const a = props.airfoil
  const cruiseAoa = a.getCruiseConditions(props.targetCl).cruiseAoa

  return [
    { aoa: a.zeroLiftAoA, label: `ZL ${a.zeroLiftAoA.toFixed(1)}°`, color: '#64748b' },
    ...(cruiseAoa != null
      ? [{ aoa: cruiseAoa, label: `Cruise ${cruiseAoa.toFixed(1)}°`, color: '#3b82f6' }]
      : []),
    ...(a.landingAoa != null
      ? [{ aoa: a.landingAoa, label: `Land. ${a.landingAoa.toFixed(1)}°`, color: '#16a34a' }]
      : []),
    { aoa: a.stallAoa, label: `Stall ${a.stallAoa.toFixed(1)}°`, color: '#dc2626' },
  ]
}

function draw() {
  try {
  const { x, y } = props.airfoil.coord
  const points = x.map((xi, i) => [xi, y[i]])

  const width  = containerW.value
  const height = Math.max(containerH.value, 260)
  const iW     = width  - MARGIN.left - MARGIN.right
  const iH     = height - MARGIN.top  - MARGIN.bottom

  const svg = d3.select(svgEl.value)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 22)
    .attr('text-anchor', 'middle')
    .attr('fill', '#374151')
    .attr('font-size', '13px')
    .attr('font-weight', '600')
    .text(props.airfoil.profileName)

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

  // Equal aspect ratio: x spans [0, 1] in iW pixels → same ppu for y
  const ppu = iW

  const [yMin, yMax] = d3.extent(y)
  const yPad = (yMax - yMin) * 0.15
  const yLo = yMin - yPad
  const yHi = yMax + yPad
  const yPixels = ppu * (yHi - yLo)
  const yMid = iH / 2

  const xScale = d3.scaleLinear().domain([0, 1]).range([0, iW])
  const yScale = d3.scaleLinear()
    .domain([yLo, yHi])
    .range([yMid + yPixels / 2, yMid - yPixels / 2])

  const annotations = aoaAnnotations()

  // Arrowhead markers (one per annotation to allow individual colours)
  const defs = svg.append('defs')
  annotations.forEach((entry, i) => {
    defs.append('marker')
      .attr('id', `qc-arr-${i}`)
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4Z')
      .attr('fill', entry.color)
  })

  // Airfoil profile
  const lineGen = d3.line().x(d => xScale(d[0])).y(d => yScale(d[1]))
  g.append('path')
    .datum(points)
    .attr('fill', '#f1f5f9')
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 1.8)
    .attr('stroke-linejoin', 'round')
    .attr('d', lineGen)

  // X-axis at chord line (y = 0)
  g.append('g')
    .attr('transform', `translate(0,${yScale(0)})`)
    .call(d3.axisBottom(xScale).ticks(10))
    .call(ax => {
      ax.select('.domain').attr('stroke', '#94a3b8')
      ax.selectAll('line').attr('stroke', '#94a3b8')
      ax.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px')
    })

  // Quarter chord: tip point on the chord line
  const qcX = xScale(0.25)
  const qcY = yScale(0)

  // AoA arrows — tails in the left margin, tips at the quarter-chord point.
  // Arrow length = 30% of chord width in pixels (≈ "20% of airfoil width" per spec;
  // chosen so tails land left of the leading edge for typical AoA values ≤ ~30°).
  const arrowLen = 0.15 * iW
  const startLen = 0.2 * iW

  annotations.forEach((entry, i) => {
    const rad  = entry.aoa * Math.PI / 180
    // SVG y increases downward; positive AoA (nose up) → flow from below-left.
    const tailX = qcX - (startLen + arrowLen) * Math.cos(rad)
    const tailY = qcY + (startLen + arrowLen) * Math.sin(rad)
    const tipX = qcX - startLen * Math.cos(rad)
    const tipY = qcY + startLen * Math.sin(rad)

    g.append('line')
      .attr('x1', tailX)
      .attr('y1', tailY)
      .attr('x2', tipX)
      .attr('y2', tipY)
      .attr('stroke', entry.color)
      .attr('stroke-width', 1.5)
      .attr('marker-end', `url(#qc-arr-${i})`)

    // Label at tail, right-aligned so it extends further left
    g.append('text')
      .attr('x', tailX - 5)
      .attr('y', tailY)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', entry.color)
      .attr('font-size', '10px')
      .text(entry.label)
  })

  // Quarter-chord symbol: circle with alternating transparent/dark-gray quadrants
  const qcR = 6
  const qcGroup = g.append('g')
  // Draw 4 pie wedges; quadrants 0 and 2 filled, 1 and 3 transparent
  ;[0, 1, 2, 3].forEach(q => {
    const startAngle = (q * Math.PI) / 2
    const endAngle   = startAngle + Math.PI / 2
    const x1 = qcR * Math.cos(startAngle)
    const y1 = qcR * Math.sin(startAngle)
    const x2 = qcR * Math.cos(endAngle)
    const y2 = qcR * Math.sin(endAngle)
    qcGroup.append('path')
      .attr('d', `M0,0 L${x1},${y1} A${qcR},${qcR} 0 0,1 ${x2},${y2} Z`)
      .attr('transform', `translate(${qcX},${qcY})`)
      .attr('fill', q % 2 === 0 ? '#1e293b' : 'transparent')
  })
  qcGroup.append('circle')
    .attr('cx', qcX)
    .attr('cy', qcY)
    .attr('r', qcR)
    .attr('fill', 'none')
    .attr('stroke', '#1e293b')
    .attr('stroke-width', 1)
  } catch (e) { setError(e); return }
}
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg v-if="airfoil" ref="svgEl" class="block" />
  </div>
</template>
