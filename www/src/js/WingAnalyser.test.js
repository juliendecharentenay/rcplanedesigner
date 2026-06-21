import { describe, it, expect } from 'vitest'
import { WingAnalyser } from './WingAnalyser.js'

// Helpers for known atmospheric values at sea level (altitude = 0)
// density ≈ 1.225 kg/m³,  viscosity ≈ 1.7894e-5 Pa·s
// Re = density * speed * chord / viscosity

describe('WingAnalyser', () => {

  // ── Constructor / storage ────────────────────────────────────────────────────

  it('T01: constructor stores all four props', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 15 })
    expect(wa.wingSpan).toBe(10)
    expect(wa.rootChord).toBe(2)
    expect(wa.tipChord).toBe(1)
    expect(wa.sweepAngle).toBe(15)
  })

  // ── taperRatio ───────────────────────────────────────────────────────────────

  it('T02: taperRatio = tip / root (0.1 / 0.2 = 0.5)', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0.2, tipChord: 0.1, sweepAngle: 0 })
    expect(wa.taperRatio).toBeCloseTo(0.5, 10)
  })

  it('T03: taperRatio is null when rootChord = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0, tipChord: 0.1, sweepAngle: 0 })
    expect(wa.taperRatio).toBeNull()
  })

  it('T04: taperRatio is 0 when tipChord = 0 and rootChord > 0', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0.2, tipChord: 0, sweepAngle: 0 })
    expect(wa.taperRatio).toBe(0)
  })

  // ── wingArea ─────────────────────────────────────────────────────────────────

  it('T05: wingArea = (root + tip) / 2 * span (span=10, root=2, tip=1 → 15)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.wingArea).toBeCloseTo(15, 10)
  })

  it('T06: wingArea is null when wingSpan = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 0, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.wingArea).toBeNull()
  })

  it('T07: wingArea is null when rootChord = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 0, tipChord: 1, sweepAngle: 0 })
    expect(wa.wingArea).toBeNull()
  })

  // ── aspectRatio ──────────────────────────────────────────────────────────────

  it('T08: aspectRatio = span² / area (span=10, area=15 → 100/15 ≈ 6.667)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.aspectRatio).toBeCloseTo(100 / 15, 5)
  })

  it('T09: aspectRatio is null when wingSpan = 0 (area is null)', () => {
    const wa = new WingAnalyser({ wingSpan: 0, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.aspectRatio).toBeNull()
  })

  // ── mac ──────────────────────────────────────────────────────────────────────

  it('T10: mac for λ=0.5 (root=2, tip=1): (2/3)*2*(1+0.5+0.25)/(1.5)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    const expected = (2 / 3) * 2 * (1 + 0.5 + 0.25) / (1.5)
    expect(wa.mac).toBeCloseTo(expected, 8)
  })

  it('T11: rectangular wing (tip = root, λ=1) → mac = root', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 2, sweepAngle: 0 })
    // (2/3)*2*(1+1+1)/(2) = (2/3)*2*3/2 = 2
    expect(wa.mac).toBeCloseTo(2, 8)
  })

  it('T10b: mac is null when rootChord = 0 (taperRatio null)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 0, tipChord: 1, sweepAngle: 0 })
    expect(wa.mac).toBeNull()
  })

  // ── macSpanPosition ──────────────────────────────────────────────────────────

  it('T12: macSpanPosition for λ=0.5, span=10: (5)*(1+1)/(3*1.5) = 10/4.5', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    const expected = 5 * (1 + 2 * 0.5) / (3 * (1 + 0.5))
    expect(wa.macSpanPosition).toBeCloseTo(expected, 8)
  })

  it('T13: rectangular (λ=1, span=10) → macSpanPosition = (5)*(3)/(3*2) = 2.5 = span/4', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 2, sweepAngle: 0 })
    expect(wa.macSpanPosition).toBeCloseTo(2.5, 8)
  })

  it('T12b: macSpanPosition is null when rootChord = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 0, tipChord: 1, sweepAngle: 0 })
    expect(wa.macSpanPosition).toBeNull()
  })

  // ── xTipLE ───────────────────────────────────────────────────────────────────

  it('T16: xTipLE with sweep=0, root=2, tip=1 → 0.25*(2-1) = 0.25', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.xTipLE).toBeCloseTo(0.25, 8)
  })

  it('T17: xTipLE with sweep=45, root=tip=2, span=10 → halfSpan*tan(45°) = 5', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 2, sweepAngle: 45 })
    expect(wa.xTipLE).toBeCloseTo(5, 5)
  })

  // ── macLeadingEdgeOffset ─────────────────────────────────────────────────────

  it('T14: macLeadingEdgeOffset with sweep=0, root=2, tip=1 is between 0 and xTipLE', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    const offset = wa.macLeadingEdgeOffset
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(wa.xTipLE)
  })

  it('T15: macLeadingEdgeOffset with sweep=0, rectangular (λ=1) → 0', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 2, sweepAngle: 0 })
    // xTipLE = 0.25*(2-2) = 0; offset = 0 * anything = 0
    expect(wa.macLeadingEdgeOffset).toBeCloseTo(0, 8)
  })

  it('T14b: macLeadingEdgeOffset is null when rootChord = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 0, tipChord: 1, sweepAngle: 0 })
    expect(wa.macLeadingEdgeOffset).toBeNull()
  })

  // ── rootReynolds ─────────────────────────────────────────────────────────────

  it('T18: rootReynolds at sea level, speed=15 m/s, root=0.2 → positive finite number', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0.2, tipChord: 0.1, sweepAngle: 0 })
    const re = wa.rootReynolds(15, 0)
    expect(re).toBeGreaterThan(0)
    expect(isFinite(re)).toBe(true)
    // Approximate check: sea level density≈1.225, visc≈1.789e-5
    // Re ≈ 1.225 * 15 * 0.2 / 1.789e-5 ≈ 204900
    expect(re).toBeCloseTo(205000, -3)
  })

  it('T19: rootReynolds returns null when speed = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0.2, tipChord: 0.1, sweepAngle: 0 })
    expect(wa.rootReynolds(0, 0)).toBeNull()
  })

  it('T20: rootReynolds returns null when rootChord = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0, tipChord: 0.1, sweepAngle: 0 })
    expect(wa.rootReynolds(15, 0)).toBeNull()
  })

  // ── tipReynolds ──────────────────────────────────────────────────────────────

  it('T21: tipReynolds is half of rootReynolds when tipChord = rootChord / 2', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0.2, tipChord: 0.1, sweepAngle: 0 })
    const rootRe = wa.rootReynolds(15, 0)
    const tipRe  = wa.tipReynolds(15, 0)
    expect(tipRe).toBeCloseTo(rootRe / 2, 5)
  })

  it('T22: tipReynolds returns null when speed = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 5, rootChord: 0.2, tipChord: 0.1, sweepAngle: 0 })
    expect(wa.tipReynolds(0, 0)).toBeNull()
  })

  // ── inducedAoaDeg ────────────────────────────────────────────────────────────

  it('T23: inducedAoaDeg with AR≈6.667, cl=0.5 → positive finite number', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    const induced = wa.inducedAoaDeg(0.5)
    // (0.5 / (π * 6.667 * 0.85)) * (180/π)
    const ar = 100 / 15
    const expected = (0.5 / (Math.PI * ar * 0.85)) * (180 / Math.PI)
    expect(induced).toBeCloseTo(expected, 8)
  })

  it('T24: inducedAoaDeg returns null when AR is null (rootChord=0)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 0, tipChord: 1, sweepAngle: 0 })
    expect(wa.inducedAoaDeg(0.5)).toBeNull()
  })

  it('T25: inducedAoaDeg returns null when cl is null', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.inducedAoaDeg(null)).toBeNull()
  })

  // ── cruiseAoaWing ────────────────────────────────────────────────────────────

  it('T26: cruiseAoaWing = cruiseAoaInfinite + inducedAoaDeg(cruiseCl)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    const induced = wa.inducedAoaDeg(0.5)
    expect(wa.cruiseAoaWing(4, 0.5)).toBeCloseTo(4 + induced, 8)
  })

  it('T27: cruiseAoaWing returns null when cruiseAoaInfinite is null', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.cruiseAoaWing(null, 0.5)).toBeNull()
  })

  it('T28: cruiseAoaWing returns null when cl is null', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.cruiseAoaWing(4, null)).toBeNull()
  })

  // ── landingAoaWing ───────────────────────────────────────────────────────────

  it('T29: landingAoaWing = landingAoaInfinite + inducedAoaDeg(landingCl)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    const induced = wa.inducedAoaDeg(0.9)
    expect(wa.landingAoaWing(8.5, 0.9)).toBeCloseTo(8.5 + induced, 8)
  })

  it('T30: landingAoaWing returns null when landingAoaInfinite is null', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.landingAoaWing(null, 0.9)).toBeNull()
  })

  // ── inducedCd ────────────────────────────────────────────────────────────────

  it('T31: inducedCd with cl=1.0, AR≈6.667 (span=10,root=2,tip=1) → 1/(π×0.85×AR)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    const ar = 100 / 15
    const expected = (1.0 * 1.0) / (Math.PI * 0.85 * ar)
    expect(wa.inducedCd(1.0)).toBeCloseTo(expected, 8)
  })

  it('T32: inducedCd returns 0 when cl = 0', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.inducedCd(0)).toBe(0)
  })

  it('T33: inducedCd returns null when AR is null (rootChord=0)', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 0, tipChord: 1, sweepAngle: 0 })
    expect(wa.inducedCd(1.0)).toBeNull()
  })

  it('T34: inducedCd returns null when cl is null', () => {
    const wa = new WingAnalyser({ wingSpan: 10, rootChord: 2, tipChord: 1, sweepAngle: 0 })
    expect(wa.inducedCd(null)).toBeNull()
  })

})
