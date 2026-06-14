# Functional Specification — AirfoilAnalyser

**Version:** 1.0  
**Date:** 2026-06-12  
**Status:** Draft

---

## 1. Overview

The codebase currently calculates airfoil performance parameters through a collection of standalone functions spread across multiple files (`cruiseDeltaAoA.js`, `interpolateAoA.js`, `liftCoefficient.js`, `speedParameters.js`, `stallParameters.js`, and their associates). This makes it cumbersome for callers to assemble a complete aerodynamic picture of a single airfoil — they must import, call, and wire together several functions manually.

The `AirfoilAnalyser` class consolidates all of this logic behind a single, cohesive interface. A caller constructs one instance per airfoil and then reads the properties they need — no knowledge of internal interpolation or parameter-wiring required.

---

## 2. Scope

### In scope

- A single `AirfoilAnalyser` class accepting one airfoil data record on construction.
- Read-only access to all fixed aerodynamic parameters derivable from the airfoil alone (zero lift, stall, landing conditions).
- A method to compute cruise conditions given external flight parameters (wing loading, speed, altitude).
- Coefficient triples (cl, cd, cm) exposed alongside every AoA value.
- Direct access to the raw polar curve data.

### Out of scope

- Batch analysis of multiple airfoils.
- Atmosphere modelling (remains in `atmosphere.js`).
- Unit conversion (remains in `units.js` / `useUnits.js`).
- Modifications to existing standalone functions — they remain in place and may be used internally.
- UI components or reactive state.

---

## 3. Actors and Context

| Actor | Role |
|-------|------|
| Calling code (Vue component or composable) | Constructs `AirfoilAnalyser` with one airfoil entry, reads properties and calls methods. |
| AirfoilAnalyser | Encapsulates all parameter calculations for a single airfoil. |

---

## 4. Airfoil Data Structure

The class accepts a single **airfoil entry** object matching the shape found in `www/src/assets/airfoils.json`:

```
{
  profileName:  string              // Human-readable airfoil name
  zeroLiftAoA:  number              // Angle of attack (degrees) at which CL = 0
  clmax:        number              // Maximum lift coefficient (fallback)
  stall_clmax:  number              // Maximum lift coefficient at stall (preferred)
  stall_aoa:    number | null       // Stall angle of attack, if pre-computed
  polar:        PolarPoint[]        // Full polar curve
}

PolarPoint {
  aoa: number   // Angle of attack in degrees
  cl:  number   // Lift coefficient
  cd:  number   // Drag coefficient
  cm:  number   // Pitching moment coefficient
}
```

---

## 5. Functional Requirements

### 5.1 Construction

**FR-01** — The class shall be constructible with a single airfoil entry object.  
**FR-02** — Construction shall not throw for any well-formed airfoil entry (one that has at least two polar points).  
**FR-03** — All fixed aerodynamic properties (zero lift, stall, landing) shall be computed at construction time and cached, so repeated access has negligible cost.

### 5.2 Zero-Lift Condition

**FR-04** — The class shall expose the zero-lift AoA directly from the airfoil entry's `zeroLiftAoA` field.  
**FR-05** — The class shall expose the lift coefficient at zero-lift AoA (which by definition is 0.0).  
**FR-06** — The class shall expose the drag coefficient and moment coefficient at the zero-lift AoA, obtained by interpolating the polar at that AoA.

### 5.3 Stall Condition

**FR-07** — The class shall compute stall AoA using the `stall_aoa` field from the entry when it is present and non-null; otherwise it shall fall back to computing the first local CL maximum at or above the zero-lift AoA.  
**FR-08** — The class shall expose the stall CL using `stall_clmax` when present, otherwise `clmax`.  
**FR-09** — The class shall expose the drag coefficient and moment coefficient at the stall AoA, obtained by interpolating the polar at that AoA.

### 5.4 Landing Condition

**FR-10** — The class shall compute landing CL as stall CL divided by 1.44 (i.e. stall CL / 1.2²), reflecting a 1.2× safety margin above stall speed.  
**FR-11** — The class shall compute landing AoA by interpolating the pre-stall polar curve for the landing CL.  
**FR-12** — The class shall expose the drag coefficient and moment coefficient at the landing AoA, obtained by interpolating the polar at that AoA.  
**FR-13** — When stall CL is unavailable or landing AoA cannot be found in the polar range, the class shall expose `null` for all landing condition properties.

### 5.5 Cruise Condition

**FR-14** — The class shall provide a method to compute cruise conditions, accepting three external parameters:
  - `wingLoading` — wing loading in g/sq.dm
  - `speed` — cruise speed in m/s
  - `altitude` — site altitude in metres

**FR-15** — The method shall compute the required cruise CL from the given wing loading, speed, and altitude.  
**FR-16** — The method shall find the cruise AoA by interpolating the pre-stall polar for the computed cruise CL.  
**FR-17** — The method shall return all four values: cruise CL, cruise AoA, cruise CD, and cruise CM.  
**FR-18** — The method shall return `null` (or a null-valued result object) when wing loading or speed are zero/null, or when the required cruise CL falls outside the polar's pre-stall CL range.

### 5.6 Polar Curve Access

**FR-19** — The class shall expose the raw polar data as a read-only array of `{ aoa, cl, cd, cm }` objects.  
**FR-20** — The polar data shall be the exact data from the airfoil entry — no filtering or transformation.

### 5.7 Profile Metadata

**FR-21** — The class shall expose the airfoil's `profileName` string for display purposes.

---

## 6. Non-Functional Requirements

**NFR-01 — Accuracy:** All interpolated values shall use linear interpolation between adjacent polar data points. No extrapolation beyond polar bounds.  
**NFR-02 — Pre-stall resolution:** For any CL value that appears on both sides of the stall peak, the class shall always resolve to the pre-stall AoA (ascending CL curve side).  
**NFR-03 — Immutability:** The class shall not mutate the input airfoil entry object.  
**NFR-04 — No external state:** The class shall have no dependency on Vue reactivity, application state, or DOM APIs.  
**NFR-05 — Pure JavaScript:** Implementable as an ES module with no build-time dependencies beyond the existing `www/src/js/` utility functions.  
**NFR-06 — Testability:** All outputs shall be deterministic for a given input, enabling full unit test coverage.

---

## 7. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-01 | Constructing `new AirfoilAnalyser(entry)` with a valid airfoil entry does not throw. |
| AC-02 | `analyser.zeroLiftAoA` returns the value of `entry.zeroLiftAoA`. |
| AC-03 | `analyser.zeroLiftCl` returns 0. |
| AC-04 | `analyser.zeroLiftCd` and `analyser.zeroLiftCm` are numbers interpolated from the polar. |
| AC-05 | `analyser.stallAoa` returns `entry.stall_aoa` when present, else the computed first local CL maximum. |
| AC-06 | `analyser.stallCl` returns `entry.stall_clmax` when present, else `entry.clmax`. |
| AC-07 | `analyser.stallCd` and `analyser.stallCm` are interpolated at `stallAoa`. |
| AC-08 | `analyser.landingCl` equals `stallCl / 1.44`. |
| AC-09 | `analyser.landingAoa` is within the pre-stall polar range. |
| AC-10 | `analyser.landingCd` and `analyser.landingCm` are interpolated at `landingAoa`. |
| AC-11 | `analyser.landingCl` / `analyser.landingAoa` / `analyser.landingCd` / `analyser.landingCm` are all `null` when `stallCl` is unavailable. |
| AC-12 | `analyser.getCruiseConditions(wl, speed, alt)` returns `{ cruiseCl, cruiseAoa, cruiseCd, cruiseCm }` for valid inputs. |
| AC-13 | `analyser.getCruiseConditions(0, speed, alt)` returns null values. |
| AC-14 | `analyser.getCruiseConditions(wl, speed, alt)` returns null values when required CL is out of polar range. |
| AC-15 | `analyser.polar` returns the unmodified array of polar points from the entry. |
| AC-16 | `analyser.profileName` returns `entry.profileName`. |
| AC-17 | Accessing stall/landing properties multiple times returns the same value (caching). |
| AC-18 | The input airfoil entry object is not mutated by construction or any method call. |
