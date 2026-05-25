export const UNIT_SYSTEMS = [
  { value: 'SI',       label: 'SI (metric)' },
  { value: 'Imperial', label: 'Imperial' },
]

const M_TO_FT = 3.28084

// — Distance (length) —

export function getDistanceUnit(system) {
  return system === 'Imperial' ? 'ft' : 'm'
}

export function convertDistance(value, fromSystem, toSystem) {
  if (fromSystem === toSystem) return value
  return fromSystem === 'SI' ? value * M_TO_FT : value / M_TO_FT
}

// — Speed —
// 1 mph = 0.44704 m/s (exact)

const MPH_TO_MS = 0.44704

export function getSpeedUnit(system) {
  return system === 'Imperial' ? 'mph' : 'm/s'
}

export function convertSpeed(value, fromSystem, toSystem) {
  if (fromSystem === toSystem) return value
  return fromSystem === 'Imperial' ? value * MPH_TO_MS : value / MPH_TO_MS
}

// — Wing loading —
// 1 oz/sq.ft = (28.349523125 g) / (9.290304 sq.dm) ≈ 3.05152 g/sq.dm

const OZ_SQFT_TO_G_SQDM = 28.349523125 / 9.290304

export function getWingLoadingUnit(system) {
  return system === 'Imperial' ? 'oz/sq.ft' : 'g/sq.dm'
}

export function convertWingLoading(value, fromSystem, toSystem) {
  if (fromSystem === toSystem) return value
  return fromSystem === 'SI' ? value / OZ_SQFT_TO_G_SQDM : value * OZ_SQFT_TO_G_SQDM
}
