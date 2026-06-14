import { atmosphere } from './atmosphere'

const OSWALD_E = 0.85

export class WingAnalyser {
  constructor({ wingSpan, rootChord, tipChord, sweepAngle }) {
    this.wingSpan   = wingSpan
    this.rootChord  = rootChord
    this.tipChord   = tipChord
    this.sweepAngle = sweepAngle
  }

  get taperRatio() {
    if (this.rootChord <= 0) return null
    return this.tipChord / this.rootChord
  }

  get wingArea() {
    if (this.wingSpan <= 0 || this.rootChord <= 0) return null
    return (this.rootChord + this.tipChord) / 2 * this.wingSpan
  }

  get aspectRatio() {
    const area = this.wingArea
    if (area == null || area <= 0) return null
    return (this.wingSpan * this.wingSpan) / area
  }

  get mac() {
    const lambda = this.taperRatio
    if (lambda == null) return null
    return (2 / 3) * this.rootChord * (1 + lambda + lambda * lambda) / (1 + lambda)
  }

  get macSpanPosition() {
    const lambda = this.taperRatio
    if (lambda == null) return null
    return (this.wingSpan / 2) * (1 + 2 * lambda) / (3 * (1 + lambda))
  }

  /**
   * Chordwise position (aft of root LE) of the tip leading edge,
   * combining quarter-chord sweep and taper LE shift.
   * Used by draw() in WingDiagramChart and by macLeadingEdgeOffset.
   */
  get xTipLE() {
    const halfSpan = this.wingSpan / 2
    const sweepRad = this.sweepAngle * Math.PI / 180
    return halfSpan * Math.tan(sweepRad) + 0.25 * (this.rootChord - this.tipChord)
  }

  get macLeadingEdgeOffset() {
    const macSpanPosition = this.macSpanPosition
    if (macSpanPosition == null) return null
    const halfSpan = this.wingSpan / 2
    if (halfSpan <= 0) return null
    return this.xTipLE * (macSpanPosition / halfSpan)
  }

  rootReynolds(speed_ms, altitude_m) {
    if (speed_ms <= 0 || this.rootChord <= 0) return null
    const { density, viscosity } = atmosphere(altitude_m)
    return (density * speed_ms * this.rootChord) / viscosity
  }

  tipReynolds(speed_ms, altitude_m) {
    if (speed_ms <= 0) return null
    const { density, viscosity } = atmosphere(altitude_m)
    return (density * speed_ms * this.tipChord) / viscosity
  }

  inducedAoaDeg(cl) {
    const ar = this.aspectRatio
    if (cl == null || ar == null || ar <= 0) return null
    return (cl / (Math.PI * ar * OSWALD_E)) * (180 / Math.PI)
  }

  cruiseAoaWing(cruiseAoaInfinite, cruiseCl) {
    if (cruiseAoaInfinite == null || cruiseCl == null) return null
    const induced = this.inducedAoaDeg(cruiseCl)
    if (induced == null) return null
    return cruiseAoaInfinite + induced
  }

  landingAoaWing(landingAoaInfinite, landingCl) {
    if (landingAoaInfinite == null || landingCl == null) return null
    const induced = this.inducedAoaDeg(landingCl)
    if (induced == null) return null
    return landingAoaInfinite + induced
  }
}
