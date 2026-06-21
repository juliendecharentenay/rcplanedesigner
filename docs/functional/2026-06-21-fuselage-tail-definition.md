# Functional Specification — Fuselage and Tail Definition

**Date:** 2026-06-21  
**Feature:** Fuselage and Tail Definition Panel

---

## 1. Overview

The Fuselage and Tail Definition feature extends the aircraft design tool with a dedicated parameter panel and SVG visualisation for defining the airplane fuselage body and tail surfaces. It follows the same panel-plus-diagram pattern established by the Wing Definition feature.

The user navigates to this panel from the main parameter panel navigation. The panel presents editable inputs for fuselage dimensions, horizontal tail geometry, and airfoil selection. The SVG canvas switches to show a top-down (plan/vertical) view of the complete aircraft: wing, fuselage, horizontal tail, and a symmetric representation of the vertical tail.

---

## 2. User Goals

- Define the fuselage geometry (length fore and aft of the wing, width at the wing).
- Define the horizontal tail geometry (span, chord, airfoil).
- See a real-time top-down SVG diagram that reflects all parameter choices.
- Read computed outputs: horizontal tail area and tail moment arm.
- Work in either SI (metric) or Imperial units consistently with the rest of the app.

---

## 3. Navigation

- The Fuselage and Tail Definition panel is accessible from the ParameterPanel navigation (alongside Wing Definition).
- A "back" button returns the user to the General parameter panel.
- Navigation is gated: the user must have already defined a wing (wing span, root chord, tip chord must be non-zero) before they can navigate to Fuselage and Tail Definition.

---

## 4. Fuselage Parameters

### 4.1 Fuselage Width at Wing

- Label: "Width at wing"
- Units: metres (SI) or feet (Imperial)
- The fuselage cross-section at the wing station is the user-facing dimension.

### 4.2 Front Fuselage Length

- Label: "Front fuselage length"
- Definition: distance from the wing quarter-MAC to the front of the fuselage (the nose just aft of the propeller — not the spinner tip).
- Units: metres (SI) or feet (Imperial)
- **Default:** 2 × MAC (Mean Aerodynamic Chord). The MAC is calculated by the existing WingAnalyser.
- The user may override this value.

### 4.3 Rear Fuselage Length

- Label: "Rear fuselage length"
- Definition: distance from the wing quarter-MAC to the end of the fuselage (the tail attachment point).
- Units: metres (SI) or feet (Imperial)
- **Default:** 3 × MAC.
- The user may override this value.

---

## 5. Fuselage Shape (Visual, Not Parametric)

The fuselage shape in the SVG follows a fixed morphing rule that is not exposed as additional user parameters:

- **Nose section** (from the front of the fuselage to the wing leading-edge position): cross-section transitions from oval (elliptical) at the nose tip to rectangular at the wing.
- **Wing section** (at the wing chord station): cross-section is rectangular, matching the fuselage width parameter.
- **Tail section** (from the wing trailing-edge position to the tail): cross-section tapers symmetrically from rectangular down to a narrow tail point.

This shape is presented in top-down view in the SVG. No additional parameters are required to define the shape profile.

---

## 6. Horizontal Tail Parameters

### 6.1 Tail Span

- Label: "Tail span"
- Units: metres (SI) or feet (Imperial)
- **Default initialisation:** computed so that horizontal tail area = 20% of wing area and aspect ratio = 5. Given `tailArea = 0.2 × wingArea` and `AR = span² / tailArea`, then `tailSpan = sqrt(AR × tailArea) = sqrt(5 × 0.2 × wingArea)`.

### 6.2 Tail Chord

- Label: "Tail chord"
- Units: metres (SI) or feet (Imperial)
- **Default initialisation:** `tailChord = tailArea / tailSpan`.

### 6.3 Tail Airfoil

- Label: "Tail airfoil"
- Type: selection from the same airfoil library used by the wing.
- **Default:** Eppler 168.

---

## 7. Computed Outputs (Read-Only Display)

### 7.1 Horizontal Tail Area

- Label: "Horizontal tail area"
- Formula: `tailSpan × tailChord`
- Units: m² (SI) or ft² (Imperial), consistent with the area unit used for wing area.

### 7.2 Tail Moment Arm

- Label: "Tail moment arm"
- Definition: distance from the wing quarter-MAC to the horizontal tail quarter-MAC (i.e. rear fuselage length minus 0.25 × tailChord).
- Units: metres (SI) or feet (Imperial)
- This value is surfaced here and must be available for reuse in a future Centre-of-Gravity calculation.

---

## 8. SVG Top-Down View

The SVG canvas switches to a top-down plan view when the Fuselage and Tail Definition panel is active. It contains:

### 8.1 Wing

- Rendered identically to the WingDiagramChart (same planform geometry: root chord, tip chord, span, sweep).
- To avoid duplicating this code, the wing planform SVG logic should be extracted into a shared, reusable component or composable that both the Wing Definition panel and the Fuselage/Tail Definition panel consume.

### 8.2 Fuselage

- Drawn as a symmetric body centred on the aircraft centreline.
- **Nose section:** oval/elliptical outline narrowing from fuselage width at the wing to a point at the front.
- **Wing section:** rectangular profile of width = fuselage width parameter, length = root chord.
- **Tail section:** tapered outline narrowing from fuselage width at the wing trailing edge to a narrow tail point.
- The fuselage is drawn aligned with the wing's root chord position and the front/rear fuselage lengths.

### 8.3 Horizontal Tail

- Drawn similarly to the wing planform but using a rectangular planform (no taper, no sweep).
- Centred on the aircraft centreline, positioned at the rear fuselage attachment point.
- Span = tailSpan, chord = tailChord.

### 8.4 Vertical Tail

- Shown as a symmetric outline at the tail end of the fuselage.
- Not user-parametric in this feature — the vertical tail profile is shown schematically as a symmetric aerofoil shape, giving context for the full tail view.

### 8.5 Dimension Lines

- Front fuselage dimension: annotated line from the fuselage nose to the wing quarter-MAC.
- Rear fuselage dimension: annotated line from the wing quarter-MAC to the horizontal tail quarter-MAC (or fuselage end).

---

## 9. FuselageAnalyser Class

A new `FuselageAnalyser` class (in `www/src/js/FuselageAnalyser.js`) encapsulates all fuselage and tail calculations:

- Inputs: wing geometry (via WingAnalyser), fuselage parameters, tail parameters.
- Outputs:
  - `tailArea` — horizontal tail planform area.
  - `tailMomentArm` — distance from wing ¼-MAC to horizontal tail ¼-MAC.
  - Initialisation helpers: `defaultFrontLength()`, `defaultRearLength()`, `defaultTailSpan()`, `defaultTailChord()`.
- The class must be plain ES2020 (no Vue dependency) so it can be reused in a future Centre-of-Gravity component without any Vue context.

---

## 10. Reusability Requirement

The fuselage and tail view components must be architected to be embedded in a future Centre-of-Gravity panel without duplication. Specifically:

- The fuselage geometry rendering logic (SVG paths for nose, body, tail) should be encapsulated in a component or composable with props-driven inputs rather than directly consuming the Vuex/provide state.
- The FuselageAnalyser class must be importable independently of any panel.

---

## 11. Unit Handling

- All length and area inputs and outputs respect the active unit system (SI / Imperial).
- When the unit system changes, fuselage and tail length/width values are converted in the same atomic update as the wing geometry.
- Area is displayed in the correct unit-system label (m² or ft²).

---

## 12. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-1 | The Fuselage and Tail Definition panel is reachable via the navigation in ParameterPanel, gated by wing parameters being defined. |
| AC-2 | The panel displays editable inputs for: fuselage width, front fuselage length, rear fuselage length, tail span, tail chord, tail airfoil. |
| AC-3 | Front fuselage length defaults to 2 × MAC; rear fuselage length defaults to 3 × MAC. |
| AC-4 | Tail span and tail chord default so that tail area = 20% of wing area and tail aspect ratio = 5. |
| AC-5 | Default tail airfoil is Eppler 168. |
| AC-6 | The panel displays computed horizontal tail area in the correct unit. |
| AC-7 | The panel displays the tail moment arm in the correct unit. |
| AC-8 | When the unit system changes, all fuselage and tail length/area values update correctly. |
| AC-9 | The SVG shows a top-down view containing: wing planform, fuselage body, horizontal tail, vertical tail schematic. |
| AC-10 | The fuselage shape transitions from oval nose to rectangular body to tapered tail. |
| AC-11 | The horizontal tail is drawn as a rectangular planform at the tail position. |
| AC-12 | Dimension lines annotate the front and rear fuselage lengths in the SVG. |
| AC-13 | A `FuselageAnalyser` class encapsulates all calculations and is independently testable without Vue. |
| AC-14 | The fuselage SVG component is reusable (props-driven) so it can be embedded in a future Centre-of-Gravity panel without modification. |
| AC-15 | The wing planform is not duplicated — a shared component or composable renders it in both Wing Definition and Fuselage/Tail Definition views. |
| AC-16 | All fuselage/tail state fields are synchronised to the browser URL (omitted when at default values). |

---

## 13. Out of Scope

- Vertical tail parametric dimensions (span, chord) — vertical tail is schematic only in this feature.
- Centre-of-gravity calculations — these are the subject of a future feature.
- 3D or side-view rendering of the fuselage.
- Fuselage structural or mass properties.
