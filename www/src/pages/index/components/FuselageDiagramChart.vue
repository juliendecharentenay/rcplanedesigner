<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { APP_STATE_KEY } from '../composables/useAppState'
import { AIRFOILS_KEY } from '../composables/useAirfoils'
import { useUnits } from '../composables/useUnits'
import { SET_ERROR_KEY } from '@/composables/useError.js'
import { convertDistance } from '@/units/units.js'
import { WingAnalyser } from '@/js/WingAnalyser.js'
import { FuselageAnalyser } from '@/js/FuselageAnalyser.js'
import WingPlanformLayer from './WingPlanformLayer.vue'

const setError     = inject(SET_ERROR_KEY)
const { getState } = inject(APP_STATE_KEY)
const { system }   = useUnits()

const containerEl = ref(null)
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

// ── WingAnalyser (SI) ─────────────────────────────────────────────────────────

const wingAnalyser = computed(() => {
  try {
    const s = getState()
    return new WingAnalyser({
      wingSpan:   convertDistance(s.wingSpan,   system.value, 'SI'),
      rootChord:  convertDistance(s.rootChord,  system.value, 'SI'),
      tipChord:   convertDistance(s.tipChord,   system.value, 'SI'),
      sweepAngle: s.sweepAngle,
    })
  } catch (e) { setError(e); return null }
})

// ── Effective lengths (SI) ────────────────────────────────────────────────────

const effectiveFrontLengthSI = computed(() => {
  try {
    const s = getState()
    if (s.frontFuselage > 0) return convertDistance(s.frontFuselage, system.value, 'SI')
    return FuselageAnalyser.defaultFrontLength(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

const effectiveRearLengthSI = computed(() => {
  try {
    const s = getState()
    if (s.rearFuselage > 0) return convertDistance(s.rearFuselage, system.value, 'SI')
    return FuselageAnalyser.defaultRearLength(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

const effectiveTailSpanSI = computed(() => {
  try {
    const s = getState()
    if (s.tailSpan > 0) return convertDistance(s.tailSpan, system.value, 'SI')
    return FuselageAnalyser.defaultTailSpan(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

const effectiveTailChordSI = computed(() => {
  try {
    const s = getState()
    if (s.tailChord > 0) return convertDistance(s.tailChord, system.value, 'SI')
    return FuselageAnalyser.defaultTailChord(wingAnalyser.value)
  } catch (e) { setError(e); return null }
})

// ── FuselageAnalyser ──────────────────────────────────────────────────────────

const fuselageAnalyser = computed(() => {
  try {
    const s  = getState()
    const fl = effectiveFrontLengthSI.value
    const rl = effectiveRearLengthSI.value
    const ts = effectiveTailSpanSI.value
    const tc = effectiveTailChordSI.value
    if (fl == null || rl == null || ts == null || tc == null) return null
    return new FuselageAnalyser({
      wingAnalyser:  wingAnalyser.value,
      fuselageWidth: convertDistance(s.fuselageWidth, system.value, 'SI'),
      frontLength:   fl,
      rearLength:    rl,
      tailSpan:      ts,
      tailChord:     tc,
    })
  } catch (e) { setError(e); return null }
})

// ── SVG layout ────────────────────────────────────────────────────────────────

const layout = computed(() => {
  try {
    const fa = fuselageAnalyser.value
    if (!fa) return null
    const wingGeo = fa.wingGeometry
    const fuseGeo = fa.fuselageGeometry
    const tailGeo = fa.tailGeometry
    if (!wingGeo || !fuseGeo || !tailGeo) return null

    const { halfSpan, rootChord, tipChord, xTipLE, mac, macSpanPosition, macLeadingEdgeOffset } = wingGeo
    const { frontLength, rearLength, width: fuselageWidth, quarterMacOffset } = fuseGeo
    const { halfTailSpan, tailChord, tailMomentArm } = tailGeo

    const canvasW = containerW.value
    const canvasH = containerH.value
    if (canvasW === 0 || canvasH === 0) return null

    // Aircraft total span: max of wing span and tail span
    const totalSpan = Math.max(halfSpan * 2, halfTailSpan * 2)

    // Aircraft total chord-wise extent:
    // From nose (frontLength before ¼-MAC of root) to tail end
    // ¼-MAC of root is at rootChord * 0.25 from root LE
    // Nose is at: -(frontLength) before ¼-MAC → y = -(frontLength)  [relative to ¼-MAC]
    // Tail end (tail TE) is at: rearLength + 0.75*tailChord after ¼-MAC
    // Total chordwise: frontLength + rearLength + 0.75*tailChord
    const totalLength = frontLength + rearLength + 0.75 * tailChord

    const MARGIN_H = 60
    const MARGIN_V = 60
    const availW  = canvasW - 2 * MARGIN_H
    const availH  = canvasH - 2 * MARGIN_V
    const scale   = Math.min(availW / totalSpan, availH / totalLength)

    const centreX = canvasW / 2
    // topY = y in SVG for the nose tip
    const topY    = MARGIN_V

    // In SVG: y increases downward. Root LE is at:
    //   topY + frontLength * scale
    // ¼-MAC of root is at:
    //   topY + (frontLength + quarterMacOffset) * scale
    const rootLeY       = topY + frontLength * scale
    const quarterMacY   = rootLeY + quarterMacOffset * scale
    const rootTeY       = rootLeY + rootChord * scale
    const tailLeY       = quarterMacY + tailMomentArm * scale - 0.25 * tailChord * scale
    const tailTeY       = tailLeY + tailChord * scale
    const tailAttachY   = rootLeY + rearLength * scale   // where fuselage ends
    const noseTipY      = topY                            // = nose tip

    const halfFuseWidth = (fuselageWidth / 2) * scale

    return {
      scale, centreX,
      canvasW, canvasH,
      // Wing planform layer props
      wingLayer: {
        centreX,
        topY: rootLeY,
        scale,
        halfSpan,
        rootChord,
        tipChord,
        xTipLE,
        mac,
        macSpanPosition,
        macLeadingEdgeOffset,
      },
      // Fuselage
      noseTipY,
      rootLeY,
      rootTeY,
      tailAttachY,
      halfFuseWidth,
      frontLength,
      rearLength,
      quarterMacY,
      // Horizontal tail
      halfTailSpan: halfTailSpan * scale,
      tailLeY,
      tailTeY,
      tailChordPx: tailChord * scale,
      // Vertical tail (schematic)
      vertTailHeight: fuselageWidth * 0.6 * scale,
      vertTailWidth:  fuselageWidth * 0.3 * scale,
    }
  } catch (e) { setError(e); return null }
})

// ── Fuselage path ─────────────────────────────────────────────────────────────

const fuselagePath = computed(() => {
  if (!layout.value) return ''
  const { centreX, noseTipY, rootLeY, rootTeY, tailAttachY, halfFuseWidth } = layout.value
  // Right side: nose (oval) → root LE → root TE (rect) → tail (taper)
  // Left side: mirror

  const noseCtrlY   = noseTipY + (rootLeY - noseTipY) * 0.33  // oval control point toward nose

  // SVG path (clockwise, starting from nose tip)
  return [
    `M ${centreX} ${noseTipY}`,
    // Right side oval nose
    `C ${centreX + halfFuseWidth * 0.6} ${noseCtrlY},`,
    `  ${centreX + halfFuseWidth} ${rootLeY - (rootLeY - noseTipY) * 0.15},`,
    `  ${centreX + halfFuseWidth} ${rootLeY}`,
    // Right side parallel at wing
    `L ${centreX + halfFuseWidth} ${rootTeY}`,
    // Right side taper to tail
    `L ${centreX + halfFuseWidth * 0.12} ${tailAttachY}`,
    // Tail tip
    `L ${centreX} ${tailAttachY}`,
    // Left side taper from tail
    `L ${centreX - halfFuseWidth * 0.12} ${tailAttachY}`,
    // Left side parallel at wing (bottom to top)
    `L ${centreX - halfFuseWidth} ${rootTeY}`,
    `L ${centreX - halfFuseWidth} ${rootLeY}`,
    // Left side oval nose back to tip
    `C ${centreX - halfFuseWidth} ${rootLeY - (rootLeY - noseTipY) * 0.15},`,
    `  ${centreX - halfFuseWidth * 0.6} ${noseCtrlY},`,
    `  ${centreX} ${noseTipY}`,
    'Z',
  ].join(' ')
})

const DIM_COLOUR = '#64748b'
const FONT_SIZE  = 10
</script>

<template>
  <div ref="containerEl" class="relative w-full h-full">
    <svg class="block w-full h-full" :width="containerW" :height="containerH">
      <template v-if="layout">
        <!-- Arrow marker defs -->
        <defs>
          <marker id="arr-end"   viewBox="0 -4 8 8" refX="8" refY="0" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,-4 L8,0 L0,4" :fill="DIM_COLOUR" />
          </marker>
          <marker id="arr-start" viewBox="0 -4 8 8" refX="0" refY="0" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,-4 L8,0 L0,4" :fill="DIM_COLOUR" />
          </marker>
        </defs>

        <!-- Centreline (dashed) -->
        <line
          :x1="layout.centreX" :y1="layout.noseTipY - 10"
          :x2="layout.centreX" :y2="layout.tailAttachY + layout.vertTailHeight + 10"
          stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 3"
        />

        <!-- Fuselage body (drawn first, behind wing) -->
        <path
          :d="fuselagePath"
          fill="#f1f5f9"
          stroke="#475569"
          stroke-width="1.5"
          stroke-linejoin="round"
        />

        <!-- Wing planform (shared layer) -->
        <WingPlanformLayer
          :centre-x="layout.wingLayer.centreX"
          :top-y="layout.wingLayer.topY"
          :scale="layout.wingLayer.scale"
          :half-span="layout.wingLayer.halfSpan"
          :root-chord="layout.wingLayer.rootChord"
          :tip-chord="layout.wingLayer.tipChord"
          :x-tip-l-e="layout.wingLayer.xTipLE"
          :mac="layout.wingLayer.mac"
          :mac-span-position="layout.wingLayer.macSpanPosition"
          :mac-leading-edge-offset="layout.wingLayer.macLeadingEdgeOffset"
          :show-mac="true"
          :show-quarter-chord="false"
          :show-dimensions="false"
        />

        <!-- Horizontal tail (rectangular planform) -->
        <g class="horizontal-tail">
          <!-- Tail outline -->
          <polygon
            :points="[
              [layout.centreX - layout.halfTailSpan, layout.tailLeY],
              [layout.centreX + layout.halfTailSpan, layout.tailLeY],
              [layout.centreX + layout.halfTailSpan, layout.tailTeY],
              [layout.centreX - layout.halfTailSpan, layout.tailTeY],
            ].map(p => p.join(',')).join(' ')"
            fill="#e0f2fe"
            stroke="#0284c7"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <!-- Tail ¼-chord line -->
          <line
            :x1="layout.centreX - layout.halfTailSpan"
            :y1="layout.tailLeY + layout.tailChordPx * 0.25"
            :x2="layout.centreX + layout.halfTailSpan"
            :y2="layout.tailLeY + layout.tailChordPx * 0.25"
            stroke="#dc2626" stroke-width="1.2"
          />
          <!-- Tail ¼-chord label -->
          <text
            :x="layout.centreX + layout.halfTailSpan + 6"
            :y="layout.tailLeY + layout.tailChordPx * 0.25"
            text-anchor="start"
            dominant-baseline="middle"
            :font-size="FONT_SIZE"
            fill="#dc2626"
          >¼ chord</text>
        </g>

        <!-- Vertical tail (schematic ellipse at tail tip) -->
        <g class="vertical-tail">
          <ellipse
            :cx="layout.centreX"
            :cy="layout.tailAttachY + layout.vertTailHeight / 2"
            :rx="layout.vertTailWidth / 2"
            :ry="layout.vertTailHeight / 2"
            fill="#f0fdf4"
            stroke="#166534"
            stroke-width="1.2"
          />
        </g>

        <!-- Dimension lines -->
        <g class="dimension-lines">
          <!-- Front fuselage dimension: nose tip → ¼-MAC of root -->
          <line
            :x1="layout.centreX - layout.halfFuseWidth - 20"
            :y1="layout.noseTipY"
            :x2="layout.centreX - layout.halfFuseWidth - 20"
            :y2="layout.quarterMacY"
            :stroke="DIM_COLOUR"
            stroke-width="1"
            marker-start="url(#arr-start)"
            marker-end="url(#arr-end)"
          />
          <text
            :x="layout.centreX - layout.halfFuseWidth - 28"
            :y="(layout.noseTipY + layout.quarterMacY) / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            :font-size="FONT_SIZE"
            :fill="DIM_COLOUR"
            :transform="`rotate(-90,${layout.centreX - layout.halfFuseWidth - 28},${(layout.noseTipY + layout.quarterMacY) / 2})`"
          >Front</text>

          <!-- Rear fuselage dimension: ¼-MAC of root → tail attachment -->
          <line
            :x1="layout.centreX - layout.halfFuseWidth - 20"
            :y1="layout.quarterMacY"
            :x2="layout.centreX - layout.halfFuseWidth - 20"
            :y2="layout.tailAttachY"
            :stroke="DIM_COLOUR"
            stroke-width="1"
            marker-start="url(#arr-start)"
            marker-end="url(#arr-end)"
          />
          <text
            :x="layout.centreX - layout.halfFuseWidth - 28"
            :y="(layout.quarterMacY + layout.tailAttachY) / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            :font-size="FONT_SIZE"
            :fill="DIM_COLOUR"
            :transform="`rotate(-90,${layout.centreX - layout.halfFuseWidth - 28},${(layout.quarterMacY + layout.tailAttachY) / 2})`"
          >Rear</text>
        </g>
      </template>
    </svg>
  </div>
</template>
