<script setup>
import { ref, watch, onMounted, onUnmounted, inject } from 'vue'
import * as d3 from 'd3'
import { SET_ERROR_KEY } from '@/composables/useError.js'

const props = defineProps({
  airfoil:   { type: Object, default: null },
  targetCl:  { default: null },
  yDomain:   { type: Array,  required: true }, // [yMin, yMax] pre-computed by parent
})

const setError = inject(SET_ERROR_KEY)

const containerEl = ref(null)
const svgEl       = ref(null)
const showCl      = ref(true)
const showCd      = ref(true)
const showCm      = ref(true)
const containerW  = ref(0)
const containerH  = ref(0)

// Extra right margin to accommodate the legend
const MARGIN = { top: 20, right: 110, bottom: 46, left: 56 }
const COLORS  = { cl: '#3b82f6', cd: '#f97316', cm: '#22c55e' }

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
  [() => props.airfoil, () => props.targetCl, () => props.yDomain, showCl, showCd, showCm, containerW, containerH],
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

  const xScale = d3.scaleLinear().domain([-25, 25]).range([0, iW])
  const yScale = d3.scaleLinear().domain(props.yDomain).range([iH, 0]).nice()

  // Horizontal grid lines
  g.append('g')
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(''))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('line').attr('stroke', '#e2e8f0'))

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(10))
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
    .text('Angle of Attack (°)')

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -iH / 2).attr('y', -44)
    .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', '12px')
    .text('Coefficient')

  // Polar curves
  const curves = [
    { key: 'cl', label: 'CL', color: COLORS.cl, show: showCl },
    { key: 'cd', label: 'CD', color: COLORS.cd, show: showCd },
    { key: 'cm', label: 'CM', color: COLORS.cm, show: showCm },
  ]

  const lineGen = key =>
    d3.line()
      .x(d => xScale(d.aoa))
      .y(d => yScale(d[key]))
      .curve(d3.curveMonotoneX)

  curves.forEach(({ key, color, show }) => {
    if (!show.value) return
    g.append('path')
      .datum(polar)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.8)
      .attr('d', lineGen(key))
  })

  // Target CL reference lines
  if (props.targetCl != null && isFinite(props.targetCl)) {
    const [domYMin, domYMax] = yScale.domain()
    if (props.targetCl >= domYMin && props.targetCl <= domYMax) {
      const ty = yScale(props.targetCl)

      g.append('line')
        .attr('x1', 0).attr('x2', iW)
        .attr('y1', ty).attr('y2', ty)
        .attr('stroke', '#cbd5e1').attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,3')

      const crossAoa = props.airfoil.getCruiseConditions(props.targetCl).cruiseAoa
      if (crossAoa != null) {
        g.append('line')
          .attr('x1', xScale(crossAoa)).attr('x2', xScale(crossAoa))
          .attr('y1', 0).attr('y2', iH)
          .attr('stroke', '#cbd5e1').attr('stroke-width', 1)
          .attr('stroke-dasharray', '5,3')
      }
    }
  }

  // Legend (right of chart, clickable toggles)
  const legend = g.append('g').attr('transform', `translate(${iW + 14}, 10)`)
  curves.forEach(({ label, color, show }, i) => {
    const item = legend.append('g')
      .attr('transform', `translate(0, ${i * 24})`)
      .style('cursor', 'pointer')
      .on('click', () => { show.value = !show.value })

    item.append('circle')
      .attr('cx', 7).attr('cy', 7).attr('r', 5)
      .attr('fill', color)
      .attr('opacity', show.value ? 1 : 0.3)

    const text = item.append('text')
      .attr('x', 17).attr('y', 11.5)
      .attr('fill', show.value ? '#374151' : '#94a3b8')
      .attr('font-size', '12px')
      .text(label)

    if (!show.value) text.style('text-decoration', 'line-through')
  })
  } catch (e) { setError(e); return }
}
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg v-if="airfoil" ref="svgEl" class="block" />
  </div>
</template>
