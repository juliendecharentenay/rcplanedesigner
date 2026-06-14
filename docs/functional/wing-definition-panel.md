# Functional Specification: Wing Definition Panel

## Overview

The Parameter Panel currently displays a single set of aircraft configuration inputs under the heading "Parameters". This feature introduces a second panel view — "Wing Definition" — that collects wing geometry inputs, derives calculated aerodynamic properties, and renders a live top-view wing diagram on the SVG canvas. Navigation between the two panel views is provided by in-panel buttons and a dropdown triggered from the panel header.

---

## Panels

### Panel 1: General (formerly "Parameters")

The existing panel is renamed from "Parameters" to "General". All existing fields remain unchanged:

- Plane type
- Units
- Airfoil selection
- Altitude
- Wing loading
- Cruise speed

At the bottom of the General panel, a navigation button labelled **"Wing Definition →"** allows the user to switch to the Wing Definition panel.

**Enabled condition:** the button is active only when all three of the following are true:
1. An airfoil has been selected.
2. Wing loading is greater than zero.
3. Cruise speed is greater than zero.

When the enabled condition is not met, the button is visually disabled: greyed out and using a default (non-pointer) cursor. It must not be clickable in the disabled state.

---

### Panel 2: Wing Definition

A new panel view with two groups of fields: editable inputs and read-only calculated values.

#### Editable Inputs

| Field | Description | Unit (SI) | Unit (Imperial) |
|---|---|---|---|
| Wing span | Total span from tip to tip | m | ft |
| Root chord | Chord length at the wing root | m | ft |
| Tip chord | Chord length at the wing tip | m | ft |
| Sweep angle | Quarter-chord sweep angle | ° | ° |

All four inputs are free-entry numeric fields. The user may enter any non-negative numeric value. Labels and any inline unit hints must reflect the currently active unit system.

#### Calculated / Read-Only Values

The following values are derived from the inputs above and displayed as read-only. They update live as inputs change.

| Field | Formula | Unit (SI) | Unit (Imperial) |
|---|---|---|---|
| Taper ratio | tip chord ÷ root chord | — (dimensionless) | — |
| Wing area | See note below | m² | ft² |
| Aspect ratio | wing span² ÷ wing area | — (dimensionless) | — |
| Root chord Reynolds number | See note below | — | — |
| Tip chord Reynolds number | See note below | — | — |

**Wing area** is calculated as the area of a trapezoidal half-wing (root chord + tip chord) × (span ÷ 2), multiplied by two for both halves:

```
wing_area = (root_chord + tip_chord) / 2 × wing_span
```

This is the standard trapezoidal wing area formula.

**Reynolds number** for a chord length `c` at the current cruise conditions is:

```
Re = (density × velocity × c) / dynamic_viscosity
```

where density and dynamic viscosity are derived from the selected altitude (using the same atmosphere model already used elsewhere in the app), and velocity is the cruise speed. Root and tip chord Reynolds numbers use `c = root_chord` and `c = tip_chord` respectively.

Reynolds numbers are dimensionless. Display them formatted to three significant figures (e.g. `2.45 × 10⁶`).

If any required input (wing span, root chord, tip chord, sweep angle, altitude, cruise speed) is zero or absent, the affected calculated field should display a dash (`—`) rather than a computed value.

#### Navigation

At the bottom of the Wing Definition panel, a button labelled **"← General"** returns the user to the General panel. This button is always enabled.

---

## Panel Header Navigation (Dropdown)

Clicking anywhere on the panel header — including the SVG icon or the panel title text — opens a dropdown menu listing the available panel views:

- General
- Wing Definition

The dropdown item for Wing Definition follows the same enabled/disabled logic as the "Wing Definition →" navigation button in the General panel: disabled (greyed out, non-interactive) when the airfoil, wing loading, or cruise speed conditions are not met.

Clicking an enabled item navigates to that panel and closes the dropdown. Clicking a disabled item has no effect. Clicking outside the dropdown (or clicking the header again) closes it without navigating.

---

## SVG Canvas Behaviour

When the General panel is active, the SVG canvas behaves as it does today.

When the Wing Definition panel is active, the SVG canvas replaces its current content with a **top-view wing diagram** drawn to reflect the current wing geometry proportions.

### Diagram Elements

The diagram represents a full-span, top-view planform of the wing, centred on the canvas.

**Wing outline**
- Drawn in a distinctive colour (blue recommended).
- Represents the trapezoidal planform: root chord at the centreline, tip chord at each wingtip, with leading and trailing edges swept according to the sweep angle.
- The outline is symmetric about the centreline.

**Quarter-chord line**
- A straight line connecting the quarter-chord point of the root chord to the quarter-chord point of the tip chord on each side.
- Drawn in a contrasting colour (red recommended).

**Mean Aerodynamic Chord (MAC)**
- The MAC is shown as a chord line positioned at its spanwise location, using the standard formula for a trapezoidal wing:

```
MAC = (2/3) × root_chord × (1 + λ + λ²) / (1 + λ)
```

where λ (lambda) is the taper ratio (tip chord / root chord).

The spanwise position of the MAC and its chordwise offset (leading-edge position) should be derived from the trapezoidal geometry and rendered correctly on the diagram.

**Quarter-MAC point marker**
- A marker symbol is placed at the quarter-chord point of the MAC.
- The marker is a circle divided into four quadrants, alternating between filled and transparent (two opposite quadrants filled, two transparent) — resembling a quartered-circle symbol used in aeronautics to denote the aerodynamic centre.

### Diagram Scaling

The diagram should scale to fill the canvas area while preserving the correct aspect ratio of the wing planform. As the user edits inputs, the diagram updates live. If any required dimension is zero, the diagram is not drawn and the canvas is blank.

---

## Unit System Behaviour

All distance inputs (wing span, root chord, tip chord) and distance-derived outputs (wing area) display in the unit system selected in the General panel:

- SI: metres (m), square metres (m²)
- Imperial: feet (ft), square feet (ft²)

Sweep angle is always in degrees regardless of unit system.

Aspect ratio, taper ratio, and Reynolds numbers are dimensionless and require no unit label.

When the user changes the unit system in the General panel, all numeric values in the Wing Definition panel convert automatically without requiring the user to re-enter them.

---

## State Persistence

Wing geometry inputs (wing span, root chord, tip chord, sweep angle) are part of application state and persist for the session. They are not reset when the user navigates between panels.

---

## Edge Cases and Constraints

- If root chord is zero, taper ratio, aspect ratio, root Reynolds number, and tip Reynolds number all display `—`.
- If wing span is zero, wing area, aspect ratio, and tip/root Reynolds numbers display `—`.
- Negative values in any geometry input are not meaningful; inputs should accept only non-negative values (validation may be enforced via input constraints or by treating negative entries as zero for calculation purposes).
- The Wing Definition panel is accessible only via navigation from the General panel or the header dropdown; it is not a separate page or route.

---

## Out of Scope

- 3D visualisation of the wing.
- Dihedral angle.
- Wing twist (washout).
- Fuselage or tail surfaces.
- Saving or exporting wing definition data.
