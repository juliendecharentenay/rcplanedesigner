# Functional Specification — Refactor UI Components to Use AirfoilAnalyser

**Version:** 1.0
**Date:** 2026-06-12
**Status:** Draft

---

## 1. Overview

The `AirfoilAnalyser` class has been implemented as a single cohesive interface for all aerodynamic calculations relating to a single airfoil entry. However, the existing UI components still call the scattered utility functions directly (`stallParameters.js`, `interpolateAoA.js`, `liftCoefficient.js`, `speedParameters.js`, `cruiseDeltaAoA.js`, `interpolateAtAoA.js`), bypassing the new abstraction.

This feature refactors all affected UI components so that:
- Aerodynamic parameters are read from `AirfoilAnalyser` instance properties instead of being recomputed inline.
- Cruise-condition queries go through `AirfoilAnalyser.getCruiseConditions()` instead of calling utility functions directly.
- The data layer (`useAirfoils`) constructs and vends `AirfoilAnalyser` instances, so individual components never need to know about the underlying utility functions.

The refactor must preserve all existing user-visible behaviour exactly. No new features are added. No UI changes are visible to the user.

---

## 2. Scope

### In scope

- Updating `useAirfoils` (index page composable) to wrap each raw airfoil entry in an `AirfoilAnalyser` instance and vend those instances.
- Updating `www/src/pages/airfoil/App.vue` to construct `AirfoilAnalyser` instances for the airfoil page and expose them through the existing provide/inject mechanism.
- Removing direct utility-function imports from the following six files, replacing usage with `AirfoilAnalyser` instance reads or `getCruiseConditions()` calls:
  1. `www/src/pages/airfoil/App.vue`
  2. `www/src/pages/airfoil/components/AirfoilProfileChart.vue`
  3. `www/src/pages/airfoil/components/ComparisonTab.vue`
  4. `www/src/pages/airfoil/components/LiftCurveChart.vue`
  5. `www/src/pages/airfoil/components/LiftDragPolarChart.vue`
  6. `www/src/pages/index/components/ParameterPanel.vue`
- Updating all test files that exercise the above components, so mock data conforms to the `AirfoilAnalyser` shape (pre-computed properties on the object) rather than the raw JSON shape.
- Keeping all existing tests passing; adding new tests where the refactor changes the contract expected by a component.

### Out of scope

- Changes to `AirfoilAnalyser` itself — it is complete and must not be modified.
- Changes to the underlying utility files (`stallParameters.js`, etc.) — they remain in place as the implementation layer used by `AirfoilAnalyser`.
- Adding any new aerodynamic computations or user-visible features.
- Changes to chart rendering logic, D3 drawing code, or visual appearance.
- The `useAppState` composable and the index-page `App.vue` — these do not import utility functions directly.

---

## 3. Actors and Context

| Actor | Role |
|-------|------|
| `useAirfoils` composable (index page) | Constructs `AirfoilAnalyser` instances from raw JSON at initialisation time; provides them to the component tree. |
| `www/src/pages/airfoil/App.vue` | Constructs `AirfoilAnalyser` instances for the airfoil analysis page; exposes a selected instance and full list through the existing `AIRFOIL_KEY` provide. |
| UI components receiving airfoil objects | Read pre-computed properties (`stallAoa`, `landingCl`, etc.) and call `getCruiseConditions()` instead of importing utility functions. |
| Tests | Provide mock `AirfoilAnalyser`-shaped objects (with pre-computed properties) rather than raw JSON fixtures. |

---

## 4. Functional Requirements

### 4.1 Data layer — useAirfoils (index page)

**FR-01** — `useAirfoils` shall construct one `AirfoilAnalyser` instance per entry in `airfoils.json` and return that array as `airfoils`.
**FR-02** — The returned instances shall be constructed once (at module or composable initialisation time), not reconstructed on every call.
**FR-03** — `AirfoilPanel` (index page), which iterates `airfoils` to render a table, shall continue to display `profileName`, `zeroLiftAoA`, `stallAoa`, and `stallCl` — properties already exposed by `AirfoilAnalyser`.

### 4.2 Data layer — airfoil page App.vue

**FR-04** — `www/src/pages/airfoil/App.vue` shall construct `AirfoilAnalyser` instances from the same `airfoils.json` data.
**FR-05** — The `selectedAirfoilData` computed shall return the `AirfoilAnalyser` instance whose `profileName` matches the selected profile.
**FR-06** — The `airfoilList` (select options) shall still be derived from `profileName` on each instance.
**FR-07** — `App.vue` shall compute `targetCl` (the cruise CL) by calling `getCruiseConditions()` on the selected `AirfoilAnalyser` instance rather than calling `computeCruiseCL` directly. The result passed to child components as `:target-cl` shall remain a single number or null — the component interface is unchanged.

### 4.3 Component — AirfoilProfileChart

**FR-08** — `AirfoilProfileChart` shall read stall and landing AoA annotations from the `AirfoilAnalyser` instance properties (`stallAoa`, `landingAoa`, etc.) rather than calling `getStallParameters` and `getLandingParameters`.
**FR-09** — Cruise AoA annotation shall be read from `getCruiseConditions()` or the `targetCl` prop already passed in — no direct call to `interpolateAoA` for this annotation.
**FR-10** — The `zeroLiftAoA` annotation shall be read from the instance's `zeroLiftAoA` property.

### 4.4 Component — ComparisonTab

**FR-11** — `ComparisonTab` shall not import any utility function from `www/src/js/`.
**FR-12** — All per-airfoil metric values (stall, landing, cruise conditions, speeds) shall be computed using `AirfoilAnalyser` instance properties and `getCruiseConditions()`.
**FR-13** — Speed metrics (`cruiseSpeed`, `stallSpeed`, `landingSpeed`) are not directly on `AirfoilAnalyser`; `ComparisonTab` shall call `computeCruiseSpeed`, `computeStallSpeed`, `computeLandingSpeed` from `speedParameters.js` — or an alternative that does not require direct aerodynamic utility imports — using values already retrieved from the `AirfoilAnalyser` instance. (Clarification: `speedParameters.js` is a physics utility, not an aerodynamic calculation utility; the spirit of the refactor is to remove aerodynamic-interpolation calls, not physics helpers.)
**FR-14** — `cruiseDeltaAoA` shall be derived from instance properties: `cruiseAoA - zeroLiftAoA` using values from `getCruiseConditions()` and `analyser.zeroLiftAoA`, rather than calling `computeCruiseDeltaAoA`.

### 4.5 Component — LiftCurveChart

**FR-15** — The crosshair annotation in `LiftCurveChart` (which shows the AoA at which the curve crosses `targetCl`) shall use the cruise AoA from the airfoil instance's `getCruiseConditions()` — or, since the prop is already `targetCl`, may retain a direct call to `interpolateAoA` as a narrow drawing utility. The team must decide and document which approach is used (see open questions §6).

### 4.6 Component — LiftDragPolarChart

**FR-16** — Same as FR-15 for `LiftDragPolarChart`. Annotations on this chart use `interpolateAoA` and `interpolateAtAoA` purely for drawing coordinates; whether these should be routed through the `AirfoilAnalyser` instance is an open question.

### 4.7 Component — ParameterPanel (index page)

**FR-17** — `ParameterPanel` shall compute `cruiseCL` and `cruiseAoA` for display by calling `getCruiseConditions()` on the selected `AirfoilAnalyser` instance rather than importing `computeCruiseCL` and `interpolateAoA` directly.
**FR-18** — When no airfoil is selected, both values shall remain null/`—` as they do today.

### 4.8 Test updates

**FR-19** — All existing unit and component tests shall continue to pass after the refactor.
**FR-20** — Any test that previously used raw JSON fixture objects (with fields like `stall_aoa`, `stall_clmax`, `polar`) shall be updated to use `AirfoilAnalyser`-shaped fixtures (with fields like `stallAoa`, `stallCl`, `polar`), or to construct actual `AirfoilAnalyser` instances.
**FR-21** — No test may import the removed utility functions for the purpose of duplicating the computation — test assertions shall use the values the component is expected to derive from `AirfoilAnalyser`.

---

## 5. Non-Functional Requirements

**NFR-01 — Behaviour preservation:** Every user-visible output (displayed values, chart annotations, comparison data points) must be numerically identical before and after the refactor. No rounding differences are acceptable.
**NFR-02 — No new external dependencies:** The refactor shall not introduce any npm packages.
**NFR-03 — Test coverage:** All changed files must have passing tests.
**NFR-04 — No utility function deletion:** The utility files themselves (`stallParameters.js`, `interpolateAoA.js`, etc.) must not be deleted or modified — `AirfoilAnalyser` still depends on them.

---

## 6. Open Questions

| # | Question | Impact |
|---|----------|--------|
| OQ-1 | Should `LiftCurveChart` and `LiftDragPolarChart` have the `AirfoilAnalyser` instance passed as a prop (replacing the raw `airfoil` prop), or should they receive the pre-computed cruise AoA from the parent? | Determines whether these charts' drawing logic can drop `interpolateAoA`/`interpolateAtAoA` imports, or whether those imports are retained as pure drawing utilities. |
| OQ-2 | Should `speedParameters.js` imports be retained in `ComparisonTab`, given that `AirfoilAnalyser` does not expose speed calculations? | Determines whether a `getSpeeds()` method needs to be added to `AirfoilAnalyser` (out of scope per §2) or whether `speedParameters.js` is treated as a permitted physics helper rather than a forbidden aerodynamic utility. |

---

## 7. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-01 | `useAirfoils()` returns an array of `AirfoilAnalyser` instances, not raw JSON objects. |
| AC-02 | `AirfoilPanel` renders `stallAoa` and `stallCl` from instance properties (not `stall_aoa`/`stall_clmax` fields). |
| AC-03 | `www/src/pages/airfoil/App.vue` does not import `computeCruiseCL` from `liftCoefficient.js`. |
| AC-04 | `AirfoilProfileChart` does not import `getStallParameters` or `getLandingParameters`. |
| AC-05 | `ComparisonTab` does not import `interpolateAoA`, `interpolateAtAoA`, `computeCruiseDeltaAoA`, `getStallParameters`, or `getLandingParameters`. |
| AC-06 | `ParameterPanel` (index page) does not import `computeCruiseCL` or `interpolateAoA`. |
| AC-07 | All `npm run test:unit` tests pass with no regressions. |
| AC-08 | The `targetCl` prop contract for `PolarChart`, `AirfoilViewerTab`, and `ComparisonTab` is unchanged (single number or null). |
| AC-09 | Displayed cruise CL and cruise AoA values in `ParameterPanel` are numerically identical to pre-refactor values for the same inputs. |
| AC-10 | Comparison chart data points are numerically identical to pre-refactor values for the same inputs. |
| AC-11 | AirfoilProfileChart annotations (stall, landing, cruise AoA lines) are numerically identical to pre-refactor values. |
