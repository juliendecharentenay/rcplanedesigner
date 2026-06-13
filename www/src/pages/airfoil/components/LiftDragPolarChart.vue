<script setup>
import { ref, watch, onMounted, onUnmounted, inject } from 'vue'
import * as d3 from 'd3'
import { SET_ERROR_KEY } from '@/composables/useError.js'

const props = defineProps({
  airfoil:   { type: Object, default: null },
  targetCl:  { default: null },
  yDomain:   { type: Array,  required: true }, // [yMin, yMax] shared with LiftCurveChart
})

const setError = inject(SET_ERROR_KEY)

const containerEl = ref(null)
const svgEl       = ref(null)
const containerW  = ref(0)
const containerH  = ref(0)

// Left/top/bottom margins match LiftCurveChart so y-axes are pixel-aligned
const MARGIN = { top: 20, right: 24, bottom: 46, left: 56 }

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
  [() => props.airfoil, () => props.targetCl, () => props.yDomain, containerW, containerH],
  () => {
    if (!props.airfoil || !svgEl.value || containerW.value === 0) return
    draw()
  },
  { flush: 'post', immediate: true },
)

function draw() {
  try {
  const polar  = props.airfoil.polar
  const width  = containerW.value
  const height = Math.max(containerH.value, 260)
  const iW     = width  - MARGIN.left - MARGIN.right
  const iH     = height - MARGIN.top  - MARGIN.bottom

  const svg = d3.select(svgEl.value)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

  // X scale: CD, starting from 0
  const cdMax = d3.max(polar, d => d.cd) * 1.08
  const xScale = d3.scaleLinear().domain([0, cdMax]).range([0, iW])

  // Y scale: CL, same domain as the right chart for visual alignment
  const yScale = d3.scaleLinear().domain(props.yDomain).range([iH, 0]).nice()

  // Horizontal grid lines
  g.append('g')
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(''))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('line').attr('stroke', '#e2e8f0'))

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .call(ax => {
      ax.select('.domain').attr('stroke', '#94a3b8')
      ax.selectAll('line').attr('stroke', '#94a3b8')
      ax.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px')
    })

  g.append('g')
    .call(d3.axisLeft(yScale))
    .call(ax => {
      ax.select('.domain').attr('stroke', '#94a3b8')
      ax.selectAll('line').attr('stroke', '#94a3b8')
      ax.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px')
    })

  // Axis labels
  g.append('text')
    .attr('x', iW / 2).attr('y', iH + 40)
    .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', '12px')
    .text('Drag Coefficient (CD)')

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -iH / 2).attr('y', -44)
    .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', '12px')
    .text('Lift Coefficient (CL)')

  // Lilienthal polar curve: CL vs CD, parameterized by AoA order
  const sorted = [...polar].sort((a, b) => a.aoa - b.aoa)

  const polarLine = d3.line()
    .x(d => xScale(d.cd))
    .y(d => yScale(d.cl))
    .curve(d3.curveCatmullRom.alpha(0.5))

  g.append('path')
    .datum(sorted)
    .attr('fill', 'none')
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 1.8)
    .attr('d', polarLine)

  // Target CL reference line + operating point
  if (props.targetCl != null && isFinite(props.targetCl)) {
    const [domYMin, domYMax] = yScale.domain()
    if (props.targetCl >= domYMin && props.targetCl <= domYMax) {
      const ty = yScale(props.targetCl)

      // Horizontal line at target CL
      g.append('line')
        .attr('x1', 0).attr('x2', iW)
        .attr('y1', ty).attr('y2', ty)
        .attr('stroke', '#cbd5e1').attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,3')

      // Find operating point using pre-computed targetCl
      const opAoA = props.airfoil.getCruiseConditions(props.targetCl).cruiseAoa
      const opCD = opAoA != null ? props.airfoil.atAoA(opAoA)?.cd : null
      if (opCD != null) {
        g.append('circle')
          .attr('cx', xScale(opCD))
          .attr('cy', ty)
          .attr('r', 4)
          .attr('fill', '#94a3b8')
          .attr('stroke', 'white')
          .attr('stroke-width', 1.5)
      }
    }
  }
  } catch (e) { setError(e); return }
}
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg v-if="airfoil" ref="svgEl" class="block" />
  </div>
</template>
