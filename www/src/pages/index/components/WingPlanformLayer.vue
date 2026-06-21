<script setup>
/**
 * WingPlanformLayer — a headless SVG <g> fragment that renders the wing planform.
 *
 * All geometry values are in metres (SI). The parent component is responsible for
 * computing centreX, topY, and scale from container dimensions.
 *
 * This component is prop-driven and injects no application state, making it
 * reusable in any SVG canvas (WingDiagramChart, FuselageDiagramChart, CG panel, etc.).
 */

const props = defineProps({
  centreX:              { type: Number, required: true },
  topY:                 { type: Number, required: true },
  scale:                { type: Number, required: true },
  halfSpan:             { type: Number, required: true },
  rootChord:            { type: Number, required: true },
  tipChord:             { type: Number, required: true },
  xTipLE:               { type: Number, required: true },
  mac:                  { type: Number, default: null },
  macSpanPosition:      { type: Number, default: null },
  macLeadingEdgeOffset: { type: Number, default: null },
  showMac:              { type: Boolean, default: true },
  showQuarterChord:     { type: Boolean, default: true },
  showDimensions:       { type: Boolean, default: true },
})

function toSvg(px, py) {
  return [props.centreX + px * props.scale, props.topY + py * props.scale]
}

// Wing outline polygon points
function wingPoints() {
  const { halfSpan, rootChord, tipChord, xTipLE } = props
  const pts = [
    toSvg(0,          0),
    toSvg(-halfSpan,  xTipLE),
    toSvg(-halfSpan,  xTipLE + tipChord),
    toSvg(0,          rootChord),
    toSvg(halfSpan,   xTipLE + tipChord),
    toSvg(halfSpan,   xTipLE),
  ]
  return pts.map(p => p.join(',')).join(' ')
}

// Quarter-chord: root and tip points
function qcRoot()  { return toSvg(0,              0.25 * props.rootChord) }
function qcLeft()  { return toSvg(-props.halfSpan, props.xTipLE + 0.25 * props.tipChord) }
function qcRight() { return toSvg(props.halfSpan,  props.xTipLE + 0.25 * props.tipChord) }

// Quarter-MAC marker centre
function qmacPoint() {
  if (props.mac == null || props.macSpanPosition == null || props.macLeadingEdgeOffset == null) return null
  return toSvg(props.macSpanPosition, props.macLeadingEdgeOffset + 0.25 * props.mac)
}

// MAC line endpoints
function macStart() {
  if (props.macSpanPosition == null || props.macLeadingEdgeOffset == null) return null
  return toSvg(props.macSpanPosition, props.macLeadingEdgeOffset)
}
function macEnd() {
  if (props.mac == null || props.macSpanPosition == null || props.macLeadingEdgeOffset == null) return null
  return toSvg(props.macSpanPosition, props.macLeadingEdgeOffset + props.mac)
}

// Quarter-MAC arc paths (4 quadrants alternating fill)
function qmacArcs() {
  const pt = qmacPoint()
  if (!pt) return []
  const [cx, cy] = pt
  const R = 6
  return [0, 1, 2, 3].map(q => {
    const a0 = (q * Math.PI) / 2
    const a1 = a0 + Math.PI / 2
    const x0 = R * Math.cos(a0)
    const y0 = R * Math.sin(a0)
    const x1 = R * Math.cos(a1)
    const y1 = R * Math.sin(a1)
    return {
      d: `M0,0 L${x0},${y0} A${R},${R} 0 0,1 ${x1},${y1} Z`,
      transform: `translate(${cx},${cy})`,
      fill: q % 2 === 0 ? '#1e293b' : 'transparent',
    }
  })
}

// Quarter-chord label placement (60% from root toward right tip, offset toward LE)
function qcLabelProps() {
  const root  = qcRoot()
  const right = qcRight()
  const T = 0.6
  const lx = root[0] + T * (right[0] - root[0])
  const ly = root[1] + T * (right[1] - root[1])
  const dx = right[0] - root[0]
  const dy = right[1] - root[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  const ox = len > 0 ?  dy / len * 12 : 0
  const oy = len > 0 ? -dx / len * 12 : 0
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  return { x: lx + ox, y: ly + oy, angle, pivot: `${lx + ox},${ly + oy}` }
}

// Dimension lines
function wingTopY()    { return props.topY + Math.min(0, props.xTipLE) * props.scale }
function wingBottomY() { return props.topY + Math.max(props.rootChord, props.xTipLE + props.tipChord) * props.scale }

const DIM_COLOUR = '#64748b'
const FONT_SIZE  = 10
</script>

<template>
  <g class="wing-planform-layer">
    <!-- Wing outline -->
    <polygon
      :points="wingPoints()"
      fill="#dbeafe"
      stroke="#2563eb"
      stroke-width="1.5"
      stroke-linejoin="round"
    />

    <!-- Quarter-chord lines (root → left tip, root → right tip) -->
    <template v-if="showQuarterChord">
      <line
        :x1="qcRoot()[0]" :y1="qcRoot()[1]"
        :x2="qcLeft()[0]" :y2="qcLeft()[1]"
        stroke="#dc2626" stroke-width="1.2"
      />
      <line
        :x1="qcRoot()[0]" :y1="qcRoot()[1]"
        :x2="qcRight()[0]" :y2="qcRight()[1]"
        stroke="#dc2626" stroke-width="1.2"
      />
      <!-- Quarter-chord label -->
      <text
        :x="qcLabelProps().x"
        :y="qcLabelProps().y"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="FONT_SIZE"
        fill="#dc2626"
        :transform="`rotate(${qcLabelProps().angle},${qcLabelProps().pivot})`"
      >¼ chord</text>
    </template>

    <!-- MAC dashed line -->
    <template v-if="showMac && macStart() && macEnd()">
      <line
        :x1="macStart()[0]" :y1="macStart()[1]"
        :x2="macEnd()[0]"   :y2="macEnd()[1]"
        stroke="#94a3b8" stroke-width="1.2"
        stroke-dasharray="5 3"
      />
      <text
        :x="macStart()[0] + 8"
        :y="(macStart()[1] + macEnd()[1]) / 2"
        text-anchor="start"
        dominant-baseline="middle"
        :font-size="FONT_SIZE"
        fill="#94a3b8"
      >MAC</text>

      <!-- Quarter-MAC marker -->
      <template v-if="qmacPoint()">
        <path
          v-for="arc in qmacArcs()"
          :key="arc.d"
          :d="arc.d"
          :transform="arc.transform"
          :fill="arc.fill"
        />
        <circle
          :cx="qmacPoint()[0]"
          :cy="qmacPoint()[1]"
          r="6"
          fill="none"
          stroke="#1e293b"
          stroke-width="1"
        />
        <text
          :x="qmacPoint()[0] + 11"
          :y="qmacPoint()[1]"
          text-anchor="start"
          dominant-baseline="middle"
          :font-size="FONT_SIZE"
          fill="#1e293b"
        >¼ MAC</text>
      </template>
    </template>

    <!-- Dimension lines -->
    <template v-if="showDimensions">
      <!-- Wing-span dimension line (above wing) -->
      <line
        :x1="centreX - halfSpan * scale"
        :y1="wingTopY() - 30"
        :x2="centreX + halfSpan * scale"
        :y2="wingTopY() - 30"
        :stroke="DIM_COLOUR"
        stroke-width="1"
        marker-start="url(#arr-start)"
        marker-end="url(#arr-end)"
      />
      <text
        :x="centreX"
        :y="wingTopY() - 38"
        text-anchor="middle"
        :font-size="FONT_SIZE"
        :fill="DIM_COLOUR"
      >Wing Span</text>

      <!-- Root-chord dimension line (at centreline) -->
      <line
        :x1="centreX"
        :y1="topY + 5"
        :x2="centreX"
        :y2="topY + rootChord * scale"
        :stroke="DIM_COLOUR"
        stroke-width="1.5"
        marker-start="url(#arr-start)"
        marker-end="url(#arr-end)"
      />
      <text
        :x="centreX - 15"
        :y="topY + (rootChord * scale) / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="FONT_SIZE"
        :fill="DIM_COLOUR"
        :transform="`rotate(-90,${centreX - 15},${topY + (rootChord * scale) / 2})`"
      >Root Chord</text>
    </template>
  </g>
</template>
