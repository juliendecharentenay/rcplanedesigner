<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  airfoil: { type: Object, default: null },
})

const containerEl = ref(null)
const svgEl       = ref(null)
const containerW  = ref(0)
const containerH  = ref(0)

const MARGIN = { top: 40, right: 20, bottom: 20, left: 20 }

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
  [() => props.airfoil, containerW, containerH],
  () => {
    if (!props.airfoil || !svgEl.value || containerW.value === 0) return
    draw()
  },
  { flush: 'post', immediate: true },
)

function draw() {
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
}
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg v-if="airfoil" ref="svgEl" class="block" />
  </div>
</template>
