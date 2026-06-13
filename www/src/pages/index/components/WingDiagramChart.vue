<script setup>
import { ref, watch, onMounted, onUnmounted, inject, computed } from 'vue'
import * as d3 from 'd3'
import { APP_STATE_KEY } from '../composables/useAppState'
import { useUnits } from '../composables/useUnits'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { convertDistance } from '@/units/units.js'

const setError = inject(SET_ERROR_KEY)
const { getState } = inject(APP_STATE_KEY)
const { system } = useUnits()

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

const geometry = computed(() => {
  try {
    const s     = getState()
    const sys   = system.value
    const span  = convertDistance(s.wingSpan,  sys, 'SI')
    const rc    = convertDistance(s.rootChord, sys, 'SI')
    const tc    = convertDistance(s.tipChord,  sys, 'SI')
    const sweep = s.sweepAngle   // degrees
    return { span, rc, tc, sweep }
  } catch (e) { setError(e); return { span: 0, rc: 0, tc: 0, sweep: 0 } }
})

watch(
  [geometry, containerW, containerH],
  () => {
    if (!svgEl.value || containerW.value === 0) return
    draw()
  },
  { flush: 'post', immediate: true },
)

function draw() {
  try {
    const { span, rc, tc, sweep } = geometry.value
    const svg = d3.select(svgEl.value)
    svg.selectAll('*').remove()

    if (span <= 0 || rc <= 0) {
      svg.attr('width', containerW.value).attr('height', containerH.value)
      return
    }

    const halfSpan = span / 2
    const sweepRad = sweep * Math.PI / 180
    const xTipLE   = halfSpan * Math.tan(sweepRad) + 0.25 * (rc - tc)
    const λ        = tc / rc

    const yMin = Math.min(0, xTipLE)
    const yMax = Math.max(rc, xTipLE + tc)

    const MARGIN_H = 40
    const MARGIN_T = 65   // extra headroom for wing-span dimension line + label
    const MARGIN_B = 40
    const canvasW  = containerW.value
    const canvasH  = containerH.value
    const availW   = canvasW - 2 * MARGIN_H
    const availH   = canvasH - MARGIN_T - MARGIN_B
    const scale    = Math.min(availW / span, availH / (yMax - yMin))

    const centreX = canvasW / 2
    const topY    = MARGIN_T + (availH - (yMax - yMin) * scale) / 2 - yMin * scale

    const toSvg = (px, py) => [centreX + px * scale, topY + py * scale]

    svg.attr('width', canvasW).attr('height', canvasH)

    // Arrow marker defs (used by dimension lines)
    const defs = svg.append('defs')
    const mkArrow = (id, orient, refX) =>
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', refX).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', orient)
        .append('path').attr('d', 'M0,-4 L8,0 L0,4').attr('fill', '#64748b')
    mkArrow('arr-end',   'auto',               8)
    mkArrow('arr-start', 'auto-start-reverse', 0)

    const DIM   = '#64748b'
    const DFONT = 10

    // Topmost / bottommost y of wing in SVG space
    const wingTopY    = topY + yMin * scale
    const wingBottomY = topY + yMax * scale

    // ── Centreline (light dashed) ──────────────────────────────────────────
    svg.append('line')
      .attr('x1', centreX).attr('y1', wingTopY - 15)
      .attr('x2', centreX).attr('y2', wingBottomY + 15)
      .attr('stroke', '#cbd5e1').attr('stroke-width', 1)
      .attr('stroke-dasharray', '6 3')

    // ── Wing outline (blue) ───────────────────────────────────────────────
    const outline = [
      toSvg(0,         0),
      toSvg(-halfSpan, xTipLE),
      toSvg(-halfSpan, xTipLE + tc),
      toSvg(0,         rc),
      toSvg(halfSpan,  xTipLE + tc),
      toSvg(halfSpan,  xTipLE),
    ]
    svg.append('polygon')
      .attr('points', outline.map(p => p.join(',')).join(' '))
      .attr('fill', '#dbeafe')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 1.5)
      .attr('stroke-linejoin', 'round')

    // ── Quarter-chord lines (red) ─────────────────────────────────────────
    const qcRoot  = toSvg(0,         0.25 * rc)
    const qcLeft  = toSvg(-halfSpan, xTipLE + 0.25 * tc)
    const qcRight = toSvg(halfSpan,  xTipLE + 0.25 * tc)

    for (const qcTip of [qcLeft, qcRight]) {
      svg.append('line')
        .attr('x1', qcRoot[0]).attr('y1', qcRoot[1])
        .attr('x2', qcTip[0]).attr('y2', qcTip[1])
        .attr('stroke', '#dc2626').attr('stroke-width', 1.2)
    }

    // Quarter-chord label — offset toward LE, aligned along the right-side line
    const qcT  = 0.6   // 60 % from root toward right tip
    const qcLx = qcRoot[0] + qcT * (qcRight[0] - qcRoot[0])
    const qcLy = qcRoot[1] + qcT * (qcRight[1] - qcRoot[1])
    const qcDx = qcRight[0] - qcRoot[0]
    const qcDy = qcRight[1] - qcRoot[1]
    const qcLen = Math.sqrt(qcDx * qcDx + qcDy * qcDy)
    // CW perpendicular of line direction points toward leading edge in SVG
    const qcOx =  qcDy / qcLen * 12
    const qcOy = -qcDx / qcLen * 12
    const qcAngle = Math.atan2(qcDy, qcDx) * 180 / Math.PI
    svg.append('text')
      .attr('x', qcLx + qcOx).attr('y', qcLy + qcOy)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', DFONT).attr('fill', '#dc2626')
      .attr('transform', `rotate(${qcAngle},${qcLx + qcOx},${qcLy + qcOy})`)
      .text('¼ chord')

    // ── MAC (grey dashed, right side) ─────────────────────────────────────
    const mac    = (2 / 3) * rc * (1 + λ + λ * λ) / (1 + λ)
    const yMac   = halfSpan * (1 + 2 * λ) / (3 * (1 + λ))
    const xMacLE = xTipLE * (yMac / halfSpan)

    const macStart = toSvg(yMac, xMacLE)
    const macEnd   = toSvg(yMac, xMacLE + mac)

    svg.append('line')
      .attr('x1', macStart[0]).attr('y1', macStart[1])
      .attr('x2', macEnd[0]).attr('y2', macEnd[1])
      .attr('stroke', '#94a3b8').attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '5 3')

    // MAC label — to the right of the line midpoint
    svg.append('text')
      .attr('x', macStart[0] + 8)
      .attr('y', (macStart[1] + macEnd[1]) / 2)
      .attr('text-anchor', 'start').attr('dominant-baseline', 'middle')
      .attr('font-size', DFONT).attr('fill', '#94a3b8')
      .text('MAC')

    // ── Quarter-MAC marker (quartered circle) ─────────────────────────────
    const [qmX, qmY] = toSvg(yMac, xMacLE + 0.25 * mac)
    const qmR = 6

    ;[0, 1, 2, 3].forEach(q => {
      const a0 = (q * Math.PI) / 2
      const a1 = a0 + Math.PI / 2
      svg.append('path')
        .attr('d', `M0,0 L${qmR * Math.cos(a0)},${qmR * Math.sin(a0)} A${qmR},${qmR} 0 0,1 ${qmR * Math.cos(a1)},${qmR * Math.sin(a1)} Z`)
        .attr('transform', `translate(${qmX},${qmY})`)
        .attr('fill', q % 2 === 0 ? '#1e293b' : 'transparent')
    })
    svg.append('circle')
      .attr('cx', qmX).attr('cy', qmY).attr('r', qmR)
      .attr('fill', 'none').attr('stroke', '#1e293b').attr('stroke-width', 1)

    // Quarter-MAC label
    svg.append('text')
      .attr('x', qmX + qmR + 5).attr('y', qmY)
      .attr('text-anchor', 'start').attr('dominant-baseline', 'middle')
      .attr('font-size', DFONT).attr('fill', '#1e293b')
      .text('¼ MAC')

    // ── Wing-span dimension line (above wing) ─────────────────────────────
    // x of tips is purely a function of the spanwise coordinate
    const leftTipX  = centreX - halfSpan * scale
    const rightTipX = centreX + halfSpan * scale
    const spanLineY  = wingTopY - 30

    svg.append('line')
      .attr('x1', leftTipX).attr('y1', spanLineY)
      .attr('x2', rightTipX).attr('y2', spanLineY)
      .attr('stroke', DIM).attr('stroke-width', 1)
      .attr('marker-start', 'url(#arr-start)')
      .attr('marker-end',   'url(#arr-end)')

    svg.append('text')
      .attr('x', centreX).attr('y', spanLineY - 8)
      .attr('text-anchor', 'middle').attr('font-size', DFONT).attr('fill', DIM)
      .text('Wing Span')

    // ── Root-chord dimension line (at centreline, vertical, with arrows) ──
    const rcTopSvg = toSvg(0, 0)[1]    // root LE y
    const rcBotSvg = toSvg(0, rc)[1]   // root TE y

    svg.append('line')
      .attr('x1', centreX).attr('y1', rcTopSvg+5)
      .attr('x2', centreX).attr('y2', rcBotSvg)
      .attr('stroke', DIM).attr('stroke-width', 1.5)
      .attr('marker-start', 'url(#arr-start)')
      .attr('marker-end',   'url(#arr-end)')

    // Label to the left of the centreline, rotated so it reads bottom-to-top
    const rcMidY   = (rcTopSvg + rcBotSvg) / 2
    const rcLabelX = centreX - 15
    svg.append('text')
      .attr('x', rcLabelX).attr('y', rcMidY)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', DFONT).attr('fill', DIM)
      .attr('transform', `rotate(-90,${rcLabelX},${rcMidY})`)
      .text('Root Chord')

  } catch (e) { setError(e); return }
}
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg ref="svgEl" class="block w-full h-full" />
  </div>
</template>
