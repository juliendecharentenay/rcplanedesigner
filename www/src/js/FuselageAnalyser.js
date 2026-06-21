import { WingAnalyser } from './WingAnalyser'

export class FuselageAnalyser {
  /**
   * @param {object} params
   * @param {WingAnalyser} params.wingAnalyser   - fully constructed WingAnalyser (SI units)
   * @param {number}       params.fuselageWidth  - width at wing station (metres)
   * @param {number}       params.frontLength    - nose to wing ¼-MAC distance (metres)
   * @param {number}       params.rearLength     - wing ¼-MAC to tail attachment (metres)
   * @param {number}       params.tailSpan       - full horizontal tail span (metres)
   * @param {number}       params.tailChord      - horizontal tail chord (metres)
   */
  constructor({ wingAnalyser, fuselageWidth, frontLength, rearLength, tailSpan, tailChord }) {
    this.wingAnalyser   = wingAnalyser ?? null
    this.fuselageWidth  = fuselageWidth
    this.frontLength    = frontLength
    this.rearLength     = rearLength
    this.tailSpan       = tailSpan
    this.tailChord      = tailChord
  }

  // ── Static default factories ──────────────────────────────────────────────────

  /**
   * Returns the default front fuselage length = 2 × MAC.
   * @param {WingAnalyser} wingAnalyser
   * @returns {number|null}
   */
  static defaultFrontLength(wingAnalyser) {
    const mac = wingAnalyser?.mac ?? null
    if (mac == null || mac <= 0) return null
    return 2 * mac
  }

  /**
   * Returns the default rear fuselage length = 3 × MAC.
   * @param {WingAnalyser} wingAnalyser
   * @returns {number|null}
   */
  static defaultRearLength(wingAnalyser) {
    const mac = wingAnalyser?.mac ?? null
    if (mac == null || mac <= 0) return null
    return 3 * mac
  }

  /**
   * Returns the default tail span so that tailArea = 20% of wingArea and AR = 5.
   * tailSpan = sqrt(5 × 0.2 × wingArea)
   * @param {WingAnalyser} wingAnalyser
   * @returns {number|null}
   */
  static defaultTailSpan(wingAnalyser) {
    const wingArea = wingAnalyser?.wingArea ?? null
    if (wingArea == null || wingArea <= 0) return null
    return Math.sqrt(5 * 0.2 * wingArea)
  }

  /**
   * Returns the default tail chord = tailArea / tailSpan.
   * @param {WingAnalyser} wingAnalyser
   * @returns {number|null}
   */
  static defaultTailChord(wingAnalyser) {
    const tailSpan = FuselageAnalyser.defaultTailSpan(wingAnalyser)
    if (tailSpan == null || tailSpan <= 0) return null
    const wingArea = wingAnalyser?.wingArea ?? null
    if (wingArea == null) return null
    const tailArea = 0.2 * wingArea
    return tailArea / tailSpan
  }

  // ── Computed getters ──────────────────────────────────────────────────────────

  /** Horizontal tail planform area = tailSpan × tailChord. Returns null if either ≤ 0. */
  get tailArea() {
    if (this.tailSpan == null || this.tailSpan <= 0) return null
    if (this.tailChord == null || this.tailChord <= 0) return null
    return this.tailSpan * this.tailChord
  }

  /**
   * Tail moment arm = distance from wing ¼-MAC to horizontal tail ¼-MAC.
   * = rearLength − 0.25 × tailChord
   */
  get tailMomentArm() {
    if (this.rearLength == null || this.rearLength <= 0) return null
    if (this.tailChord == null || this.tailChord <= 0) return null
    return this.rearLength - 0.25 * this.tailChord
  }

  /** Horizontal tail aspect ratio = tailSpan² / tailArea. Returns null if tailArea is null or ≤ 0. */
  get tailAspectRatio() {
    const area = this.tailArea
    if (area == null || area <= 0) return null
    return (this.tailSpan * this.tailSpan) / area
  }

  // ── SVG geometry helpers ──────────────────────────────────────────────────────

  /**
   * Returns wing geometry delegated entirely to the WingAnalyser instance.
   * Used by FuselageDiagramChart to avoid re-deriving wing geometry.
   * @returns {{halfSpan, rootChord, tipChord, xTipLE, mac, macSpanPosition, macLeadingEdgeOffset}|null}
   */
  get wingGeometry() {
    const wa = this.wingAnalyser
    if (wa == null) return null
    const halfSpan = wa.wingSpan != null ? wa.wingSpan / 2 : null
    if (halfSpan == null || halfSpan <= 0) return null
    return {
      halfSpan,
      rootChord:            wa.rootChord,
      tipChord:             wa.tipChord,
      xTipLE:               wa.xTipLE,
      mac:                  wa.mac,
      macSpanPosition:      wa.macSpanPosition,
      macLeadingEdgeOffset: wa.macLeadingEdgeOffset,
    }
  }

  /**
   * Returns fuselage layout geometry.
   * @returns {{frontLength, rearLength, width, quarterMacOffset}|null}
   */
  get fuselageGeometry() {
    if (this.fuselageWidth == null || this.fuselageWidth <= 0) return null
    if (this.frontLength  == null || this.frontLength  <= 0) return null
    if (this.rearLength   == null || this.rearLength   <= 0) return null
    return {
      frontLength:      this.frontLength,
      rearLength:       this.rearLength,
      width:            this.fuselageWidth,
      // chordwise offset from root LE to wing ¼-MAC
      quarterMacOffset: this.wingAnalyser?.rootChord != null ? 0.25 * this.wingAnalyser.rootChord : 0,
    }
  }

  /**
   * Returns horizontal tail layout geometry.
   * @returns {{halfTailSpan, tailChord, tailMomentArm}|null}
   */
  get tailGeometry() {
    const fuselageGeo = this.fuselageGeometry
    if (fuselageGeo == null) return null
    if (this.tailSpan == null || this.tailSpan <= 0) return null
    if (this.tailChord == null || this.tailChord <= 0) return null
    const tma = this.tailMomentArm
    if (tma == null) return null
    return {
      halfTailSpan:    this.tailSpan / 2,
      tailChord:       this.tailChord,
      tailMomentArm:   tma,
    }
  }
}
