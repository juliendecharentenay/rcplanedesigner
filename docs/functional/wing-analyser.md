# Functional Specification: WingAnalyser Class

## Overview

Wing-related calculations are currently scattered across two Vue components:
`WingDefinitionPanel.vue` (taper ratio, wing area, aspect ratio, Reynolds numbers) and
`WingDiagramChart.vue` (aspect ratio, MAC, induced angle-of-attack, performance table). A stub
class `WingAnalyser` already exists at `www/src/js/WingAnalyser.js` but contains no implemented
logic. This feature completes that class and refactors both components to use it exclusively for
all wing calculations.

## Goals

1. Centralise every wing aerodynamic and geometric calculation inside `WingAnalyser`.
2. Eliminate duplicated or near-duplicated logic between the two components.
3. Make wing calculations independently testable without mounting any Vue component.
4. Components become thin: they read state, construct (or update) a `WingAnalyser` instance, and
   display the results it provides.

## User-Visible Behaviour

No user-visible behaviour changes. All displayed values (taper ratio, wing area, aspect ratio,
Reynolds numbers, MAC, induced AoA) must remain numerically identical after the refactor.

## Scope

### In scope

- Implement all currently-stubbed and calculated-inline properties/methods in `WingAnalyser`:
  - `taperRatio` — dimensionless ratio of tip chord to root chord.
  - `wingArea` — trapezoidal planform area (SI, m²).
  - `aspectRatio` — span² / area (dimensionless).
  - `mac` — mean aerodynamic chord length (SI, m).
  - `macSpanPosition` — spanwise position of the MAC (SI, m from centreline).
  - `macLeadingEdgeOffset` — chordwise LE offset of the MAC from root LE along the sweep direction (SI, m).
  - `rootReynolds(speed_ms, altitude_m)` — Reynolds number at root chord.
  - `tipReynolds(speed_ms, altitude_m)` — Reynolds number at tip chord.
  - `inducedAoaDeg(cl)` — induced angle of attack in degrees for a given lift coefficient, using Oswald efficiency.
  - `cruiseAoaWing(cruiseAoaInfinite, cruiseCl)` — wing-corrected cruise angle of attack.
  - `landingAoaWing(landingAoaInfinite, landingCl)` — wing-corrected landing angle of attack.
- Write a comprehensive unit-test suite for `WingAnalyser` (`WingAnalyser.test.js`).
- Refactor `WingDefinitionPanel.vue` to delegate all computed properties to a `WingAnalyser`
  instance, removing inline calculation code.
- Refactor `WingDiagramChart.vue` to delegate MAC, induced AoA, and wing-corrected AoA
  calculations to a `WingAnalyser` instance, removing inline calculation code.
- Update existing component tests to remain green after the refactor.

### Out of scope

- No new UI elements or user controls.
- No changes to `AirfoilAnalyser.js` or any other JS class.
- No changes to URL sync, state management, or unit conversion functions.
- No changes to the D3 drawing logic in `WingDiagramChart.vue` beyond replacing the inline MAC
  and geometry calculations with `WingAnalyser` properties.
- The Oswald efficiency factor (currently hardcoded at 0.85 in `WingDiagramChart.vue`) remains
  a constant — it is not made user-configurable.

## Acceptance Criteria

1. `WingAnalyser` constructor accepts `{ wingSpan, rootChord, tipChord, sweepAngle }` in SI
   units (metres, degrees).
2. `taperRatio` returns `tipChord / rootChord`; returns `null` when `rootChord <= 0`.
3. `wingArea` returns `(rootChord + tipChord) / 2 * wingSpan`; returns `null` when `wingSpan <= 0`
   or `rootChord <= 0`.
4. `aspectRatio` returns `wingSpan² / wingArea`; returns `null` when area is null or zero.
5. `mac` returns the standard MAC formula `(2/3) * rootChord * (1 + λ + λ²) / (1 + λ)` where
   `λ = taperRatio`; returns `null` when `taperRatio` is null.
6. `macSpanPosition` returns `(wingSpan/2) * (1 + 2λ) / (3(1 + λ))`; returns `null` when
   `taperRatio` is null.
7. `macLeadingEdgeOffset` returns the chordwise LE offset of the MAC station relative to the root
   LE, accounting for sweep; returns `null` when sweep geometry is undefined.
8. `rootReynolds(speed_ms, altitude_m)` returns the correct Re using `atmosphere(altitude_m)`;
   returns `null` when `speed_ms <= 0` or `rootChord <= 0`.
9. `tipReynolds(speed_ms, altitude_m)` returns the correct Re using tip chord; returns `null`
   when `speed_ms <= 0`.
10. `inducedAoaDeg(cl)` returns `(cl / (π × AR × e)) × (180/π)` with `e = 0.85`; returns
    `null` when `AR` is null or `cl` is null.
11. `cruiseAoaWing(cruiseAoaInfinite, cruiseCl)` returns `cruiseAoaInfinite +
    inducedAoaDeg(cruiseCl)`; returns `null` when either input or the induced AoA is null.
12. `landingAoaWing(landingAoaInfinite, landingCl)` returns `landingAoaInfinite +
    inducedAoaDeg(landingCl)`; returns `null` when either input or the induced AoA is null.
13. `WingAnalyser.test.js` covers all properties and methods with valid inputs, boundary cases
    (zero, negative, null), and known numeric results.
14. After refactoring, `WingDefinitionPanel.vue` contains no inline arithmetic for taper ratio,
    wing area, aspect ratio, or Reynolds numbers — all are delegated to `WingAnalyser`.
15. After refactoring, `WingDiagramChart.vue` contains no inline arithmetic for MAC, MAC span
    position, MAC LE offset, or induced AoA — all are delegated to `WingAnalyser`.
16. All pre-existing tests in `WingDefinitionPanel.test.js` and `WingDiagramChart.test.js` pass
    without modification to the test files (test files may be extended, not altered).
17. `WingAnalyser` has no Vue dependency and no import from any Vue composable.
