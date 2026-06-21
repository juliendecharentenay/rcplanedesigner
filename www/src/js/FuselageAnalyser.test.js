import { describe, it, expect } from 'vitest'
import { FuselageAnalyser } from './FuselageAnalyser'
import { WingAnalyser } from './WingAnalyser'

// Helper: build a WingAnalyser for a simple rectangular wing
function makeWing({ wingSpan = 1.5, rootChord = 0.3, tipChord = 0.2, sweepAngle = 0 } = {}) {
  return new WingAnalyser({ wingSpan, rootChord, tipChord, sweepAngle })
}

// Rectangular wing: span=1.5, rc=0.3, tc=0.3 (no taper)
// mac = rc = 0.3, wingArea = 0.3 * 1.5 = 0.45
function makeRectWing() {
  return new WingAnalyser({ wingSpan: 1.5, rootChord: 0.3, tipChord: 0.3, sweepAngle: 0 })
}

function makeFuselage(overrides = {}) {
  const wa = makeRectWing()
  const mac = wa.mac  // 0.3
  const frontLength = 2 * mac   // 0.6
  const rearLength  = 3 * mac   // 0.9
  const tailSpan    = FuselageAnalyser.defaultTailSpan(wa)
  const tailChord   = FuselageAnalyser.defaultTailChord(wa)
  return new FuselageAnalyser({
    wingAnalyser:  wa,
    fuselageWidth: 0.12,
    frontLength,
    rearLength,
    tailSpan,
    tailChord,
    ...overrides,
  })
}

// ── Static default factories ────────────────────────────────────────────────────

describe('FuselageAnalyser.defaultFrontLength', () => {
  it('returns 2 × mac for a valid wing', () => {
    const wa = makeRectWing()
    const result = FuselageAnalyser.defaultFrontLength(wa)
    expect(result).toBeCloseTo(2 * wa.mac, 8)
  })

  it('returns null when wingAnalyser is null', () => {
    expect(FuselageAnalyser.defaultFrontLength(null)).toBeNull()
  })

  it('returns null when mac is null (zero rootChord)', () => {
    const wa = new WingAnalyser({ wingSpan: 1.5, rootChord: 0, tipChord: 0, sweepAngle: 0 })
    expect(FuselageAnalyser.defaultFrontLength(wa)).toBeNull()
  })
})

describe('FuselageAnalyser.defaultRearLength', () => {
  it('returns 3 × mac for a valid wing', () => {
    const wa = makeRectWing()
    const result = FuselageAnalyser.defaultRearLength(wa)
    expect(result).toBeCloseTo(3 * wa.mac, 8)
  })

  it('returns null when wingAnalyser is null', () => {
    expect(FuselageAnalyser.defaultRearLength(null)).toBeNull()
  })
})

describe('FuselageAnalyser.defaultTailSpan', () => {
  it('returns sqrt(5 × 0.2 × wingArea)', () => {
    const wa = makeRectWing()
    const wingArea = wa.wingArea  // 0.45
    const expected = Math.sqrt(5 * 0.2 * wingArea)
    expect(FuselageAnalyser.defaultTailSpan(wa)).toBeCloseTo(expected, 8)
  })

  it('returns null when wingAnalyser is null', () => {
    expect(FuselageAnalyser.defaultTailSpan(null)).toBeNull()
  })

  it('returns null when wingArea is null (zero span)', () => {
    const wa = new WingAnalyser({ wingSpan: 0, rootChord: 0.3, tipChord: 0.3, sweepAngle: 0 })
    expect(FuselageAnalyser.defaultTailSpan(wa)).toBeNull()
  })
})

describe('FuselageAnalyser.defaultTailChord', () => {
  it('returns (0.2 × wingArea) / tailSpan', () => {
    const wa = makeRectWing()
    const tailSpan = FuselageAnalyser.defaultTailSpan(wa)
    const expected = (0.2 * wa.wingArea) / tailSpan
    expect(FuselageAnalyser.defaultTailChord(wa)).toBeCloseTo(expected, 8)
  })

  it('returns null when wingAnalyser is null', () => {
    expect(FuselageAnalyser.defaultTailChord(null)).toBeNull()
  })

  it('has AR = 5 by design', () => {
    const wa = makeRectWing()
    const ts = FuselageAnalyser.defaultTailSpan(wa)
    const tc = FuselageAnalyser.defaultTailChord(wa)
    const ar = (ts * ts) / (ts * tc)
    expect(ar).toBeCloseTo(5, 5)
  })

  it('tail area = 20% of wing area', () => {
    const wa = makeRectWing()
    const ts = FuselageAnalyser.defaultTailSpan(wa)
    const tc = FuselageAnalyser.defaultTailChord(wa)
    expect(ts * tc).toBeCloseTo(0.2 * wa.wingArea, 8)
  })
})

// ── Computed getters ────────────────────────────────────────────────────────────

describe('FuselageAnalyser tailArea', () => {
  it('returns tailSpan × tailChord', () => {
    const fa = makeFuselage()
    const ts = FuselageAnalyser.defaultTailSpan(makeRectWing())
    const tc = FuselageAnalyser.defaultTailChord(makeRectWing())
    expect(fa.tailArea).toBeCloseTo(ts * tc, 8)
  })

  it('returns null when tailSpan is 0', () => {
    const fa = makeFuselage({ tailSpan: 0 })
    expect(fa.tailArea).toBeNull()
  })

  it('returns null when tailChord is 0', () => {
    const fa = makeFuselage({ tailChord: 0 })
    expect(fa.tailArea).toBeNull()
  })

  it('returns null when tailSpan is negative', () => {
    const fa = makeFuselage({ tailSpan: -1 })
    expect(fa.tailArea).toBeNull()
  })
})

describe('FuselageAnalyser tailMomentArm', () => {
  it('returns rearLength − 0.25 × tailChord', () => {
    const fa = makeFuselage()
    const expected = fa.rearLength - 0.25 * fa.tailChord
    expect(fa.tailMomentArm).toBeCloseTo(expected, 8)
  })

  it('returns null when rearLength is 0', () => {
    const fa = makeFuselage({ rearLength: 0 })
    expect(fa.tailMomentArm).toBeNull()
  })

  it('returns null when tailChord is 0', () => {
    const fa = makeFuselage({ tailChord: 0 })
    expect(fa.tailMomentArm).toBeNull()
  })
})

describe('FuselageAnalyser tailAspectRatio', () => {
  it('returns tailSpan² / tailArea', () => {
    const fa = makeFuselage()
    const expected = (fa.tailSpan * fa.tailSpan) / fa.tailArea
    expect(fa.tailAspectRatio).toBeCloseTo(expected, 5)
  })

  it('returns null when tailArea is null', () => {
    const fa = makeFuselage({ tailSpan: 0 })
    expect(fa.tailAspectRatio).toBeNull()
  })
})

// ── SVG geometry helpers ────────────────────────────────────────────────────────

describe('FuselageAnalyser wingGeometry', () => {
  it('returns an object with expected keys', () => {
    const fa = makeFuselage()
    const geo = fa.wingGeometry
    expect(geo).not.toBeNull()
    expect(geo).toHaveProperty('halfSpan')
    expect(geo).toHaveProperty('rootChord')
    expect(geo).toHaveProperty('tipChord')
    expect(geo).toHaveProperty('xTipLE')
    expect(geo).toHaveProperty('mac')
    expect(geo).toHaveProperty('macSpanPosition')
    expect(geo).toHaveProperty('macLeadingEdgeOffset')
  })

  it('halfSpan equals wingSpan/2', () => {
    const fa = makeFuselage()
    expect(fa.wingGeometry.halfSpan).toBeCloseTo(0.75, 8)
  })

  it('returns null when wingAnalyser is null', () => {
    const fa = makeFuselage({ wingAnalyser: null })
    expect(fa.wingGeometry).toBeNull()
  })
})

describe('FuselageAnalyser fuselageGeometry', () => {
  it('returns an object with expected keys', () => {
    const fa = makeFuselage()
    const geo = fa.fuselageGeometry
    expect(geo).not.toBeNull()
    expect(geo).toHaveProperty('frontLength')
    expect(geo).toHaveProperty('rearLength')
    expect(geo).toHaveProperty('width')
  })

  it('returns null when fuselageWidth is 0', () => {
    const fa = makeFuselage({ fuselageWidth: 0 })
    expect(fa.fuselageGeometry).toBeNull()
  })

  it('returns null when frontLength is 0', () => {
    const fa = makeFuselage({ frontLength: 0 })
    expect(fa.fuselageGeometry).toBeNull()
  })

  it('returns null when rearLength is 0', () => {
    const fa = makeFuselage({ rearLength: 0 })
    expect(fa.fuselageGeometry).toBeNull()
  })
})

describe('FuselageAnalyser tailGeometry', () => {
  it('returns an object with expected keys', () => {
    const fa = makeFuselage()
    const geo = fa.tailGeometry
    expect(geo).not.toBeNull()
    expect(geo).toHaveProperty('halfTailSpan')
    expect(geo).toHaveProperty('tailChord')
    expect(geo).toHaveProperty('tailMomentArm')
  })

  it('halfTailSpan equals tailSpan/2', () => {
    const fa = makeFuselage()
    expect(fa.tailGeometry.halfTailSpan).toBeCloseTo(fa.tailSpan / 2, 8)
  })

  it('returns null when tailSpan is 0', () => {
    const fa = makeFuselage({ tailSpan: 0 })
    expect(fa.tailGeometry).toBeNull()
  })

  it('returns null when fuselageGeometry is null', () => {
    const fa = makeFuselage({ fuselageWidth: 0 })
    expect(fa.tailGeometry).toBeNull()
  })
})
