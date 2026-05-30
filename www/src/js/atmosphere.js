/**
 * US Standard Atmosphere 1976 — troposphere (0–4 km)
 *
 * Returns temperature (K), pressure (Pa), density (kg/m³),
 * and dynamic viscosity (Pa·s) at a given geometric altitude.
 */

const T0 = 288.15;        // Sea-level temperature, K
const P0 = 101325;        // Sea-level pressure, Pa
const L  = -0.0065;       // Temperature lapse rate, K/m
const R  = 287.058;       // Specific gas constant for dry air, J/(kg·K)
const G0 = 9.80665;       // Standard gravity, m/s²

// Exponent for pressure formula: -g0 / (R * L)
const PRESSURE_EXPONENT = -G0 / (R * L); // ≈ 5.2559

// Sutherland's Law constants
const MU_REF  = 1.716e-5; // Reference viscosity, Pa·s
const T_REF   = 273.15;   // Reference temperature, K
const S       = 110.4;    // Sutherland constant, K

/**
 * @param {number} altitude - Geometric altitude in metres (0–4000 m)
 * @returns {{ temperature: number, pressure: number, density: number, viscosity: number }}
 */
export function atmosphere(altitude) {
  if (altitude < 0 || altitude > 4000) {
    throw new RangeError(`Altitude ${altitude} m is outside the supported range (0–4000 m).`);
  }

  const temperature = T0 + L * altitude;
  const pressure    = P0 * Math.pow(temperature / T0, PRESSURE_EXPONENT);
  const density     = pressure / (R * temperature);
  const viscosity   = MU_REF
    * Math.pow(temperature / T_REF, 1.5)
    * (T_REF + S) / (temperature + S);

  return { temperature, pressure, density, viscosity };
}
