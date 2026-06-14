# Technical Specification — AirfoilAnalyser

**Version:** 1.0
**Date:** 2026-06-12
**Status:** Approved

---

## 1. Context and Constraints

This specification is derived from the functional specification at `docs/functional/airfoil-analyser.md`. The approved architecture constrains the implementation as follows:

- Single implementation file: `www/src/js/AirfoilAnalyser.js`
- Single test file: `www/src/js/AirfoilAnalyser.test.js`
- Plain ES2020 class — no Vue reactivity, no DOM dependency
- All fixed properties computed at construction time and stored on the instance
- Imports from existing utility files in `www/src/js/` only; no new utility files

---

## 2. Module Structure

### 2.1 File: `www/src/js/AirfoilAnalyser.js`

```
import { getStallAoA, getStallParameters, getLandingParameters } from './stallParameters'
import { computeCruiseCL } from './liftCoefficient'
import { interpolateAoA } from './interpolateAoA'
import { interpolateAtAoA } from './interpolateAtAoA'
```

No other imports are required. `cruiseDeltaAoA.js` and `speedParameters.js` are not used directly by this class — their underlying primitives (`interpolateAoA`, `computeCruiseCL`) are sufficient.

### 2.2 File: `www/src/js/AirfoilAnalyser.test.js`

Standard Vitest unit test file. Uses `describe` / `it` / `expect`. No external mocking required — all logic is pure.

---

## 3. Class Design

### 3.1 Constructor

```js
constructor(airfoilEntry)
```

**Parameters:**
- `airfoilEntry` — object matching the airfoils.json shape (see functional spec §4). Must not be mutated.

**Construction-time computation sequence:**

1. Store `this.profileName` from `airfoilEntry.profileName`.
2. Store `this.polar` as a direct reference to `airfoilEntry.polar` (no copy needed; the array is not mutated).
3. Store `this.zeroLiftAoA` from `airfoilEntry.zeroLiftAoA`.
4. Store `this.zeroLiftCl = 0`.
5. Interpolate `cd` and `cm` at `zeroLiftAoA` via `interpolateAtAoA(polar, zeroLiftAoA)`:
   - Store `this.zeroLiftCd` and `this.zeroLiftCm` (null if interpolation fails).
6. Call `getStallParameters(airfoilEntry)` and destructure into:
   - `this.stallAoa`, `this.stallCl`, `this.stallCd`, `this.stallCm`
7. Call `getLandingParameters(airfoilEntry)`:
   - If result is non-null, store `this.landingCl`, `this.landingAoa`, `this.landingCd`, `this.landingCm`.
   - If result is null, store all four as `null`.

### 3.2 Method: getCruiseConditions

```js
getCruiseConditions(wingLoading, speed, altitude)
```

**Parameters:**
- `wingLoading` — wing loading in g/sq.dm
- `speed` — cruise speed in m/s
- `altitude` — site altitude in metres

**Algorithm:**

1. Compute `cruiseCl = computeCruiseCL(wingLoading, speed, altitude)`.
2. If `cruiseCl` is null, return `{ cruiseCl: null, cruiseAoa: null, cruiseCd: null, cruiseCm: null }`.
3. Compute `cruiseAoa = interpolateAoA(this.polar, cruiseCl)`.
4. If `cruiseAoa` is null, return the null-valued result object.
5. Interpolate `{ cd, cm }` at `cruiseAoa` via `interpolateAtAoA(this.polar, cruiseAoa)`.
6. Return `{ cruiseCl, cruiseAoa, cruiseCd: cd ?? null, cruiseCm: cm ?? null }`.

**Return type:** `{ cruiseCl: number|null, cruiseAoa: number|null, cruiseCd: number|null, cruiseCm: number|null }`

The method always returns an object (never `null` itself) so callers can destructure safely.

---

## 4. Instance Properties (summary)

| Property | Type | Source |
|----------|------|--------|
| `profileName` | `string` | `airfoilEntry.profileName` |
| `polar` | `PolarPoint[]` | `airfoilEntry.polar` (direct reference) |
| `zeroLiftAoA` | `number` | `airfoilEntry.zeroLiftAoA` |
| `zeroLiftCl` | `number` | Always `0` |
| `zeroLiftCd` | `number\|null` | `interpolateAtAoA` at `zeroLiftAoA` |
| `zeroLiftCm` | `number\|null` | `interpolateAtAoA` at `zeroLiftAoA` |
| `stallAoa` | `number` | `getStallParameters` |
| `stallCl` | `number\|null` | `getStallParameters` |
| `stallCd` | `number\|null` | `getStallParameters` |
| `stallCm` | `number\|null` | `getStallParameters` |
| `landingCl` | `number\|null` | `getLandingParameters` |
| `landingAoa` | `number\|null` | `getLandingParameters` |
| `landingCd` | `number\|null` | `getLandingParameters` |
| `landingCm` | `number\|null` | `getLandingParameters` |

---

## 5. Pre-stall Polar Handling

The pre-stall constraint (always resolve to the ascending CL side for any given CL value) is fully delegated to `interpolateAoA`, which already implements this. `AirfoilAnalyser` does not re-implement that logic.

---

## 6. Error Handling and Edge Cases

| Situation | Behaviour |
|-----------|-----------|
| `stall_aoa` is null | `getStallAoA` falls back to `computeStallAoA` (handled by `stallParameters.js`) |
| `stall_clmax` absent, `clmax` absent | `stallCl` is null; `getLandingParameters` returns null; all landing props are null |
| `zeroLiftAoA` outside polar AoA range | `interpolateAtAoA` returns null; `zeroLiftCd` and `zeroLiftCm` are null |
| `getCruiseConditions` with `wingLoading = 0` or `speed = 0` | `computeCruiseCL` returns null; method returns null-valued object |
| Required cruise CL above stall CL | `interpolateAoA` returns null (pre-stall only); method returns null-valued object |
| Input `airfoilEntry` is mutated externally after construction | Not guarded — the spec states the class must not mutate the input, but does not require defensive copying |

---

## 7. Test Specification

All tests live in `www/src/js/AirfoilAnalyser.test.js`. The test fixture is a minimal synthetic airfoil:

```js
const mockEntry = {
  profileName: 'Test Airfoil',
  zeroLiftAoA: -2,
  clmax: 1.4,
  stall_clmax: 1.5,
  stall_aoa: 14,
  polar: [
    { aoa: -4, cl: -0.2, cd: 0.012, cm: -0.04 },
    { aoa: -2, cl:  0.0, cd: 0.010, cm: -0.04 },
    { aoa:  0, cl:  0.2, cd: 0.011, cm: -0.04 },
    { aoa:  4, cl:  0.6, cd: 0.014, cm: -0.05 },
    { aoa:  8, cl:  1.0, cd: 0.020, cm: -0.06 },
    { aoa: 12, cl:  1.4, cd: 0.035, cm: -0.07 },
    { aoa: 14, cl:  1.5, cd: 0.050, cm: -0.08 },
    { aoa: 16, cl:  1.3, cd: 0.090, cm: -0.10 },
  ],
}
```

### 7.1 Test Groups and Coverage

**Group 1 — Construction (FR-01 to FR-03, AC-01)**
- Constructing with `mockEntry` does not throw.

**Group 2 — Zero-lift (FR-04 to FR-06, AC-02 to AC-04)**
- `zeroLiftAoA` equals `mockEntry.zeroLiftAoA` (-2).
- `zeroLiftCl` equals 0.
- `zeroLiftCd` is a number (interpolated at aoa=-2, expected 0.010).
- `zeroLiftCm` is a number (interpolated at aoa=-2, expected -0.04).

**Group 3 — Stall (FR-07 to FR-09, AC-05 to AC-07)**
- `stallAoa` equals 14 (from `stall_aoa` field).
- With `stall_aoa: null`, `stallAoa` is computed from polar (should be 14 from the fixture).
- `stallCl` equals 1.5 (from `stall_clmax`).
- With `stall_clmax` absent and `clmax` present, `stallCl` equals `clmax`.
- `stallCd` and `stallCm` are numbers interpolated at stallAoa.

**Group 4 — Landing (FR-10 to FR-13, AC-08 to AC-11)**
- `landingCl` equals `stallCl / 1.44`.
- `landingAoa` is a number within the polar range.
- `landingCd` and `landingCm` are numbers.
- When `stallCl` is null (no `stall_clmax`, no `clmax`), all four landing properties are null.

**Group 5 — Cruise (FR-14 to FR-18, AC-12 to AC-14)**
- `getCruiseConditions(wl, speed, alt)` with valid inputs returns an object with numeric `cruiseCl`, `cruiseAoa`, `cruiseCd`, `cruiseCm`.
- `getCruiseConditions(0, speed, alt)` returns all-null object.
- `getCruiseConditions(wl, 0, alt)` returns all-null object.
- `getCruiseConditions(wl, speed, alt)` where computed CL exceeds polar range returns all-null object.

**Group 6 — Polar and metadata (FR-19 to FR-21, AC-15 to AC-16)**
- `polar` is the exact same array reference as `mockEntry.polar`.
- `profileName` equals `mockEntry.profileName`.

**Group 7 — Immutability and caching (AC-17, AC-18)**
- Accessing `stallCl` twice returns the same value.
- `mockEntry` is not mutated after construction.

---

## 8. Acceptance Criteria Traceability

All 18 acceptance criteria from the functional specification (AC-01 through AC-18) are covered by the test groups in §7.1. No acceptance criteria are deferred.

---

## 9. Integration Notes

`AirfoilAnalyser` is a plain ES module. Vue components and composables that need aerodynamic analysis should:

1. Import `AirfoilAnalyser` directly.
2. Construct one instance per airfoil entry (e.g. in a computed property or `watchEffect`).
3. Read instance properties directly — no method calls needed for fixed parameters.

No changes to existing files in `www/src/js/` are required.
