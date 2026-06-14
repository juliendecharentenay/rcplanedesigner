# Functional Specification: Wing Performance Table

## Overview

Add a performance data table to the Wing Diagram Chart. The table is displayed as an overlay in the top-right corner of the chart and presents two key angles of attack — cruise and landing — under two reference frames: the infinite aspect ratio (2D airfoil) and the actual wing (corrected for finite aspect ratio).

## Background

The Wing Diagram Chart (`WingDiagramChart.vue`) currently shows a top-view planform of the wing with geometric annotations (span, root chord, quarter-chord line, MAC). Users need a quick reference for how the wing performs aerodynamically at cruise and landing conditions, without navigating away from the diagram view.

Two reference frames are relevant:

- **Infinite AR (airfoil):** The 2D aerodynamic performance of the selected airfoil profile, as if the wing had an infinite aspect ratio. This is what the airfoil polar data reports directly.
- **Wing:** The corrected performance of the actual finite-span wing, accounting for induced angle of attack due to the finite aspect ratio.

## User Stories

1. As a designer, I want to see the cruise angle of attack for both the airfoil (2D) and the actual wing so I can understand how much the finite wing increases the required angle of attack at cruise.
2. As a designer, I want to see the landing angle of attack for both the airfoil (2D) and the actual wing so I can assess tail clearance and structural requirements at landing.

## Functional Requirements

### FR-1: Table placement and layout

- The table is positioned in the top-right corner of the Wing Diagram Chart container, using absolute positioning (`top-0 right-0`).
- The table is always visible when the wing diagram is shown, regardless of wing geometry (it may show "—" when data is unavailable).
- The table must not obscure the centreline or other primary diagram annotations.

### FR-2: Table structure

The table has three columns:

| Column | Content |
|--------|---------|
| Label | Row name (e.g. "Cruise AoA", "Landing AoA") |
| Infinite AR | Airfoil value (2D polar, no finite-span correction) |
| Wing | Wing value (finite-span corrected) |

The table has two rows:

| Row | Description |
|-----|-------------|
| Cruise AoA | Angle of attack at the configured cruise speed and wing loading |
| Landing AoA | Angle of attack at landing (derived from the stall speed method: CL_land = CL_stall / 1.2²) |

### FR-3: Infinite AR (airfoil) values

The "Infinite AR" column reports the angle of attack that the selected 2D airfoil profile must achieve to produce the required lift coefficient, without any finite-span correction.

- **Cruise AoA (Infinite AR):** The AoA at which the airfoil polar reaches the cruise CL (computed from wing loading, cruise speed, and site altitude).
- **Landing AoA (Infinite AR):** The AoA at which the airfoil polar reaches the landing CL. Landing CL is derived from the stall CL via `CL_land = CL_stall / 1.2²`. The `AirfoilAnalyser` class already exposes this as `landingAoa`.

### FR-4: Wing (finite-span corrected) values

The "Wing" column applies the finite-span induced angle of attack correction to the infinite AR values:

`AoA_wing = AoA_airfoil + (CL / (π × AR × e))`  × (180 / π)

Where:
- `CL` is the relevant lift coefficient (cruise CL or landing CL)
- `AR` is the aspect ratio of the wing (span² / wing area)
- `e` is the Oswald efficiency factor (assumed constant at **0.85** for all calculations)
- The correction term is converted from radians to degrees

The wing AoA is the sum of the 2D airfoil AoA and the induced AoA correction.

### FR-5: Data availability

- If no airfoil profile is selected, both the Infinite AR and Wing columns display "—" for all rows.
- If the airfoil profile has no polar data sufficient to interpolate a value, the affected cell displays "—".
- If any of wing span, root chord, or tip chord are zero or invalid, the Wing column displays "—" (AR cannot be computed).
- If cruise speed or wing loading are zero, the Cruise AoA row displays "—" in both columns.

### FR-6: Value formatting

- All AoA values are displayed in degrees, rounded to one decimal place, with a "°" suffix (e.g. `3.2°`).
- Unavailable values display as "—" (em dash).

### FR-7: Unit independence

- The AoA values are dimensionless in terms of the unit system (degrees are always degrees). No unit conversion is needed for the displayed values.
- The underlying computation must use SI values for physical quantities (wing loading in g/dm², speed in m/s, altitude in m, dimensions in m) regardless of the active unit system.

### FR-8: Reactive updates

- The table updates automatically whenever any of the following change: airfoil profile selection, cruise speed, wing loading, site altitude, wing span, root chord, tip chord.
- The table is a reactive overlay on the SVG chart container — it is not drawn using D3 but rendered as an HTML element positioned over the SVG.

## Out of scope

- Drag or lift-to-drag ratio values.
- Stall AoA row.
- User-configurable Oswald efficiency factor (fixed at 0.85).
- Any modification to the AirfoilAnalyser class.

## Acceptance Criteria

1. When an airfoil is selected and all parameters are valid, the table shows numeric values in all four data cells (Cruise × 2 columns, Landing × 2 columns).
2. When no airfoil is selected, all data cells show "—".
3. When cruise speed is 0 or wing loading is 0, both Cruise AoA cells show "—".
4. When wing dimensions produce a valid AR, the Wing column value for cruise is greater than or equal to the Infinite AR value (the finite-span correction always adds a positive increment for positive CL).
5. The Landing AoA (Infinite AR) matches `AirfoilAnalyser.landingAoa` for the selected profile.
6. All AoA values are formatted to one decimal place with a "°" suffix.
7. The table is positioned at `top-0 right-0` within the chart container.
8. The table updates reactively when any relevant state field changes.
