import { atmosphere } from './atmosphere'

// --- Interpolation helpers ---

function interpolateAoA(polar, targetCL) {
  if (polar.length < 2) return null
  const sorted = [...polar].sort((a, b) => a.aoa - b.aoa)
  let peakIndex = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].cl < 0) peakIndex = i
    else if (sorted[i].cl > sorted[peakIndex].cl) peakIndex = i
    else break
  }
  const ascending = sorted.slice(0, peakIndex + 1)
  for (let i = 0; i < ascending.length - 1; i++) {
    const lo = ascending[i], hi = ascending[i + 1]
    if (lo.cl <= targetCL && targetCL <= hi.cl) {
      const t = (targetCL - lo.cl) / (hi.cl - lo.cl)
      return lo.aoa + t * (hi.aoa - lo.aoa)
    }
  }
  return null
}

function interpolateAtAoA(polar, targetAoA) {
  if (!polar || polar.length < 2 || targetAoA == null) return null
  const sorted = [...polar].sort((a, b) => a.aoa - b.aoa)
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i], hi = sorted[i + 1]
    if (lo.aoa <= targetAoA && targetAoA <= hi.aoa) {
      const t = (targetAoA - lo.aoa) / (hi.aoa - lo.aoa)
      return {
        cd: lo.cd + t * (hi.cd - lo.cd),
        cm: lo.cm + t * (hi.cm - lo.cm),
      }
    }
  }
  return null
}

// --- Aerodynamic computation helpers ---

const G_SQDM_TO_N_M2 = 0.1 * 9.80665

function computeCruiseCL(wingLoading_gSqdm, speed_ms, altitude_m) {
  if (!wingLoading_gSqdm || !speed_ms) return null
  const { density } = atmosphere(altitude_m)
  return 2 * wingLoading_gSqdm * G_SQDM_TO_N_M2 / (density * speed_ms ** 2)
}

function computeSpeedFromCL(wingLoading_gSqdm, cl, altitude_m) {
  if (!wingLoading_gSqdm || !cl) return null
  const { density } = atmosphere(altitude_m)
  return Math.sqrt(2 * wingLoading_gSqdm * G_SQDM_TO_N_M2 / (density * cl))
}

// --- Stall / landing helpers ---

function computeStallAoA(polar, zeroLiftAoA) {
  const sorted = [...polar].sort((a, b) => a.aoa - b.aoa)
  let startIdx = sorted.findIndex(p => p.aoa >= zeroLiftAoA)
  if (startIdx === -1) startIdx = sorted.length - 1
  for (let i = startIdx; i < sorted.length - 1; i++) {
    if (sorted[i + 1].cl < sorted[i].cl) return sorted[i].aoa
  }
  return sorted[sorted.length - 1].aoa
}

function getStallAoA(airfoilEntry) {
  if (airfoilEntry.stall_aoa != null) return airfoilEntry.stall_aoa
  return computeStallAoA(airfoilEntry.polar, airfoilEntry.zeroLiftAoA)
}

function getStallParameters(airfoilEntry) {
  const stallAoa = getStallAoA(airfoilEntry)
  const stallCl = airfoilEntry.stall_clmax ?? airfoilEntry.clmax ?? null
  const at = interpolateAtAoA(airfoilEntry.polar, stallAoa)
  return { stallAoa, stallCl, stallCd: at?.cd ?? null, stallCm: at?.cm ?? null }
}

function getLandingParameters(airfoilEntry) {
  const stall = getStallParameters(airfoilEntry)
  if (stall.stallCl == null) return null
  const landingCl = stall.stallCl / (1.2 ** 2)
  const landingAoa = interpolateAoA(airfoilEntry.polar, landingCl)
  if (landingAoa == null) return null
  const at = interpolateAtAoA(airfoilEntry.polar, landingAoa)
  return { landingCl, landingAoa, landingCd: at?.cd ?? null, landingCm: at?.cm ?? null }
}

// --- Class ---

export class AirfoilAnalyser {
  constructor(airfoilEntry) {
    this.profileName = airfoilEntry.profileName
    this.polar = airfoilEntry.polar
    this.coord = airfoilEntry.coord
    this.zeroLiftAoA = airfoilEntry.zeroLiftAoA

    this.zeroLiftCl = 0
    const zeroLiftAt = interpolateAtAoA(this.polar, this.zeroLiftAoA)
    this.zeroLiftCd = zeroLiftAt?.cd ?? null
    this.zeroLiftCm = zeroLiftAt?.cm ?? null

    const stall = getStallParameters(airfoilEntry)
    this.stallAoa = stall.stallAoa
    this.stallCl  = stall.stallCl
    this.stallCd  = stall.stallCd
    this.stallCm  = stall.stallCm

    const landing = getLandingParameters(airfoilEntry)
    if (landing !== null) {
      this.landingCl  = landing.landingCl
      this.landingAoa = landing.landingAoa
      this.landingCd  = landing.landingCd
      this.landingCm  = landing.landingCm
    } else {
      this.landingCl  = null
      this.landingAoa = null
      this.landingCd  = null
      this.landingCm  = null
    }
  }

  atAoA(aoa) {
    if (aoa == null) return null
    return interpolateAtAoA(this.polar, aoa) ?? null
  }

  static convertSpeedToCl(wingLoading, speed, altitude) {
    return computeCruiseCL(wingLoading, speed, altitude)
  }

  static convertClToSpeed(wingLoading, cruiseCl, altitude) {
    return computeSpeedFromCL(wingLoading, cruiseCl, altitude)
  }

  getCruiseConditions(cruiseCl) {
    const nullResult = { cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null }
    // const cruiseCl = AirfoilAnalyser.convertSpeedToCl(wingLoading, speed, altitude)
    if (cruiseCl === null) return nullResult
    const cruiseAoa = interpolateAoA(this.polar, cruiseCl)
    if (cruiseAoa === null) return nullResult
    const at = interpolateAtAoA(this.polar, cruiseAoa)
    return { cruiseCl, cruiseAoa, cruiseCd: at?.cd ?? null, cruiseCm: at?.cm ?? null }
  }

  getCruiseSpeed(wingLoading, targetCl, altitude) {
    return AirfoilAnalyser.convertClToSpeed(wingLoading, targetCl, altitude)
  }

  getStallSpeed(wingLoading, altitude) {
    return AirfoilAnalyser.convertClToSpeed(wingLoading, this.stallCl, altitude)
  }

  getLandingSpeed(wingLoading, altitude) {
    if (!this.stallCl) return null
    return AirfoilAnalyser.convertClToSpeed(wingLoading, this.stallCl / (1.2 ** 2), altitude)
  }
}
