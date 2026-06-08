<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  data:   { type: Array,  required: true }, // [{profileName, x, y, isSelected}]
  xLabel: { type: String, required: true },
  yLabel: { type: String, required: true },
})

const emit = defineEmits(['select:airfoil'])

const containerEl = ref(null)
const svgEl       = ref(null)
const containerW  = ref(0)
const containerH  = ref(0)

const MARGIN = { top: 20, right: 30, bottom: 46, left: 60 }

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
  [() => props.data, () => props.xLabel, () => props.yLabel, containerW, containerH],
  () => {
    if (!svgEl.value || containerW.value === 0 || props.data.length === 0) {
      if (svgEl.value) d3.select(svgEl.value).selectAll('*').remove()
      return
    }
    draw()
  },
  { flush: 'post', immediate: true },
)

function fmt(v) {
  return Number.isFinite(v) ? v.toFixed(4) : '—'
}

function draw() {
  const width  = containerW.value
  const height = Math.max(containerH.value, 260)
  const iW     = width  - MARGIN.left - MARGIN.right
  const iH     = height - MARGIN.top  - MARGIN.bottom

  const svg = d3.select(svgEl.value)
  svg.selectAll('*').remove()
  svg.attr('width', width).attr('height', height)

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

  // Scales with 8% padding
  const xs = d3.extent(props.data, d => d.x)
  const ys = d3.extent(props.data, d => d.y)
  const xPad = (xs[1] - xs[0]) * 0.08 || 0.01
  const yPad = (ys[1] - ys[0]) * 0.08 || 0.01

  const xScale = d3.scaleLinear().domain([xs[0] - xPad, xs[1] + xPad]).range([0, iW]).nice()
  const yScale = d3.scaleLinear().domain([ys[0] - yPad, ys[1] + yPad]).range([iH, 0]).nice()

  // Grid lines
  g.append('g')
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(''))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('line').attr('stroke', '#e2e8f0'))

  g.append('g')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(-iH).tickFormat(''))
    .call(gr => gr.select('.domain').remove())
    .call(gr => gr.selectAll('line').attr('stroke', '#e2e8f0'))

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(8))
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
    .text(props.xLabel)

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -iH / 2).attr('y', -48)
    .attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', '12px')
    .text(props.yLabel)

  // Draw non-selected airfoils first, then selected on top
  const others   = props.data.filter(d => !d.isSelected)
  const selected = props.data.filter(d =>  d.isSelected)

  g.selectAll('.pt-other')
    .data(others)
    .join('circle')
    .attr('class', 'pt-other')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5)
    .attr('fill', '#94a3b8')
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('mouseover', showTooltip)
    .on('mouseleave', hideTooltip)
    .on('click', (_, d) => emit('select:airfoil', d.profileName))

  g.selectAll('.pt-selected')
    .data(selected)
    .join('circle')
    .attr('class', 'pt-selected')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 7)
    .attr('fill', '#3b82f6')
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('mouseover', showTooltip)
    .on('mouseleave', hideTooltip)
    .on('click', (_, d) => emit('select:airfoil', d.profileName))

  // Tooltip group (hidden until hover)
  const tooltip = g.append('g').style('display', 'none').style('pointer-events', 'none')
  const tooltipBg = tooltip.append('rect')
    .attr('rx', 4).attr('ry', 4)
    .attr('fill', 'white')
    .attr('fill-opacity', 0.7)
    .attr('stroke', '#e2e8f0')
    .attr('stroke-width', 1)
  const tooltipName = tooltip.append('text').attr('font-size', '11px').attr('font-weight', '600').attr('fill', '#1e293b')
  const tooltipX    = tooltip.append('text').attr('font-size', '10px').attr('fill', '#475569')
  const tooltipY    = tooltip.append('text').attr('font-size', '10px').attr('fill', '#475569')

  function showTooltip(event, d) {
    const [mx, my] = d3.pointer(event, g.node())
    const pad = 6, lineH = 14
    tooltipName.text(d.profileName)
    tooltipX.text(`${props.xLabel}: ${fmt(d.x)}`)
    tooltipY.text(`${props.yLabel}: ${fmt(d.y)}`)

    // Make visible before measuring — getComputedTextLength() returns 0 on hidden elements
    tooltip.style('display', null)

    const textWidths = [tooltipName, tooltipX, tooltipY].map(t => t.node().getComputedTextLength())
    const bw = Math.max(...textWidths) + pad * 2
    const bh = lineH * 3 + pad * 2

    // Position tooltip so it stays within the chart
    let tx = mx + 10
    let ty = my - bh - 4
    if (tx + bw > iW) tx = mx - bw - 10
    if (ty < 0) ty = my + 10

    tooltipBg.attr('x', tx).attr('y', ty).attr('width', bw).attr('height', bh)
    tooltipName.attr('x', tx + pad).attr('y', ty + pad + lineH - 2)
    tooltipX.attr('x', tx + pad).attr('y', ty + pad + lineH * 2 - 2)
    tooltipY.attr('x', tx + pad).attr('y', ty + pad + lineH * 3 - 2)
  }

  function hideTooltip() {
    tooltip.style('display', 'none')
  }

}
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg ref="svgEl" class="block" />
  </div>
</template>
