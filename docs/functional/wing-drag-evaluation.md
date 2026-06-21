# Functional Specification: Wing Drag Evaluation Expansion

## 1. Overview

The Wing Definition panel currently shows a top-view planform diagram of the wing with a small performance table overlay displaying cruise and landing angles of attack. This feature expands the aerodynamic evaluation presented in that view in two complementary ways:

1. **Performance table expansion** — the existing table gains three new rows showing drag coefficients (base, induced, total) evaluated at cruise conditions.
2. **Wing drag curve chart** — a new toggleable overlay shows how base drag, induced drag, and total drag vary with aircraft speed, with annotated vertical markers at cruise speed and minimum-drag speed.

---

## 2. Goals

- Give the user immediate quantitative feedback on wing drag at cruise without leaving the Wing Definition panel.
- Allow the user to visualise the drag breakdown across the full speed range, making the trade-off between parasite drag and induced drag intuitive.
- Surface the minimum total drag speed as a named, annotated design reference point.
- Maintain consistency with the existing panel layout, table component, and interaction patterns.

---

## 3. User Stories

| ID | As a… | I want to… | So that… |
|----|--------|-----------|----------|
| US-1 | Designer | See the wing's base, induced, and total drag coefficients at cruise in the performance table | I can evaluate how much drag the wing produces at its operating point without switching views |
| US-2 | Designer | See that the infinite aspect ratio (airfoil) has zero induced drag displayed in the table | I understand that induced drag is a finite-wing effect and can see its magnitude |
| US-3 | Designer | Toggle a drag curve overlay on the wing diagram | I can explore the full drag breakdown across all feasible speeds |
| US-4 | Designer | See where the cruise speed falls on the drag curves | I can read off the exact drag coefficients at my chosen cruise speed |
| US-5 | Designer | See where the minimum total drag speed falls on the drag curves | I can compare my cruise speed against the aerodynamically optimal speed |
| US-6 | Designer | Hover over the annotated dots on the drag curve | I can read precise drag coefficient and speed values without counting grid lines |

---

## 4. Feature 1: Performance Table Overlay Expansion

### 4.1 Current state

The performance table in `WingDiagramChart` currently has two data rows:

| Label | Infinite AR | Wing |
|---|---|---|
| Cruise AoA | … | … |
| Landing AoA | … | … |

### 4.2 New rows

Three new rows are appended below the existing AoA rows. All three are evaluated at **cruise conditions** (the same cruise speed, altitude, and wing loading used for the AoA rows):

| Row label | Infinite AR column | Wing column |
|---|---|---|
| Base drag Cd | Airfoil Cd at cruise AoA | Same value as Infinite AR |
| Induced drag Cd | `0.000` (always zero) | Cd_i computed from WingAnalyser using the Oswald constant |
| Total drag Cd | Base drag Cd | Sum of base and induced Cd |

#### Drag coefficient definitions

- **Base drag coefficient (Cd₀):** the airfoil section drag coefficient interpolated from the polar at the cruise angle of attack. This value is identical for the infinite-aspect-ratio case and the finite wing because profile drag does not depend on aspect ratio.
- **Induced drag coefficient (Cd_i):** for the finite wing, `Cd_i = CL² / (π × e × AR)`, where `CL` is the cruise lift coefficient, `e` is the Oswald efficiency factor already used in `WingAnalyser`, and `AR` is the wing aspect ratio. For the infinite-AR column, induced drag is defined as zero.
- **Total drag coefficient (Cd_total):** `Cd₀ + Cd_i`.

#### Display format

- Drag coefficient values are displayed to three decimal places (e.g., `0.018`).
- Row labels use the same typographic style as existing rows.
- The three new rows are visually separated from the AoA rows by a thin horizontal rule or equivalent spacing to group them as "Drag at cruise".

### 4.3 Unavailable state

If any input required to compute drag is missing or invalid (wing geometry not fully defined, no airfoil selected, cruise conditions outside the polar range), the affected cells display `—` rather than a number. No error is thrown to the user for table-only display failures.

---

## 5. Feature 2: Wing Drag Curve Overlay

### 5.1 Toggle control

A labelled toggle button or checkbox is shown on or immediately below the wing diagram. Its label reads **"Show drag curve"** (or similar concise label). When inactive (default), the diagram shows only the planform. When active, the drag curve chart is rendered in place of (or overlaid on) the planform area.

The toggle is hidden when the wing geometry or airfoil data are insufficient to compute drag curves.

### 5.2 Chart layout

The drag curve chart uses the same container area as the wing planform diagram. Axes:

- **Y-axis:** drag coefficient (dimensionless). Label: `Cd`. Origin at 0. Upper bound is chosen automatically to accommodate the highest total drag value in the visible speed range, with a small margin.
- **X-axis:** aircraft speed in the active display unit (m/s or ft/s, consistent with the rest of the panel). Label: `Speed (<unit>)`. Origin at 0.

The chart includes a labelled title: **"Wing drag vs speed"**.

Gridlines are shown at regular intervals on both axes to aid reading.

### 5.3 Speed range

- The x-axis always starts at **0**.
- All three drag curves start at the **stall speed** — the speed at which the wing produces exactly enough lift to fly level at the stall lift coefficient (already computed by `WingAnalyser` / `AirfoilAnalyser`).
- The x-axis upper bound extends sufficiently past the cruise speed and the minimum-drag speed so that both vertical markers are fully visible, with a small margin.

### 5.4 The three curves

Three lines are drawn from stall speed to the x-axis upper bound:

| Curve | Description | Suggested visual style |
|---|---|---|
| Base drag | Airfoil Cd interpolated at the AoA corresponding to each speed | Dashed or lighter line |
| Induced drag | `CL(v)² / (π × e × AR)` at each speed | Dashed or lighter line |
| Total drag | Sum of base and induced Cd at each speed | Solid, heavier line |

A legend identifies all three curves by name and line style.

Below stall speed, no curve is drawn (the wing cannot sustain level flight in that region).

### 5.5 Cruise speed marker

A vertical line is drawn at the current cruise speed value. The line spans the full y-range of the chart. On each of the three curves, a filled dot is placed at the intersection with the vertical line.

**Hover interaction on each dot:**

When the user hovers over (or near) a dot, a tooltip displays:
- The curve name (e.g., "Total drag")
- The speed value (with unit)
- The drag coefficient value (three decimal places)

### 5.6 Minimum total drag speed marker

The speed at which the total drag curve reaches its minimum value is computed over the feasible speed range (stall speed to x-axis upper bound). A second vertical line is drawn at this speed, visually distinct from the cruise speed line (e.g., different colour or dash pattern), labelled **"Min drag"**.

The same dot-and-tooltip pattern described in §5.5 is applied at this marker for all three curves.

If the minimum total drag speed coincides with (or is within display resolution of) the cruise speed, the two markers are merged and labelled accordingly.

### 5.7 Unavailable state

If wing geometry or airfoil data are insufficient to render the drag curve, the toggle remains hidden and the chart area is not shown. No partial or empty chart is displayed.

---

## 6. Data Requirements

### 6.1 Inputs consumed

All inputs are already available in the current application state:

| Input | Source |
|---|---|
| Airfoil polar (Cd vs AoA) | `AirfoilAnalyser` for the selected airfoil |
| Cruise speed | App state (`cruisingSpeed`) |
| Wing loading | App state (`wingLoading`) |
| Altitude | App state (`altitude`) |
| Wing span, root chord, tip chord | App state (wing geometry) |
| Aspect ratio | Computed by `WingAnalyser` |
| Oswald efficiency constant (e) | Module constant in `WingAnalyser` |
| Stall lift coefficient | `AirfoilAnalyser.stallCl` |
| Stall speed | `WingAnalyser` / `AirfoilAnalyser` stall speed method |

### 6.2 Derived quantities

| Quantity | Formula |
|---|---|
| CL at speed v | `CL(v) = 2 × (W/S) / (ρ(alt) × v²)` |
| AoA at speed v | Inverse polar lookup: AoA such that the polar yields `CL(v)` |
| Base Cd at speed v | Polar interpolation at AoA(v) |
| Induced Cd at speed v | `CL(v)² / (π × e × AR)` |
| Total Cd at speed v | `base Cd(v) + induced Cd(v)` |
| Minimum total drag speed | Speed v in [v_stall, v_max] minimising total Cd(v) |

---

## 7. Acceptance Criteria

### Performance table

| ID | Criterion |
|----|-----------|
| AC-T1 | The table displays three new rows: "Base drag Cd", "Induced drag Cd", "Total drag Cd" |
| AC-T2 | The Infinite AR column shows the same base drag Cd value as the Wing column |
| AC-T3 | The Infinite AR induced drag cell always displays `0.000` |
| AC-T4 | The Wing total drag Cd equals base drag Cd + induced drag Cd to three decimal places |
| AC-T5 | All three drag coefficient values update when cruise speed, altitude, wing loading, or wing geometry changes |
| AC-T6 | Cells display `—` when computation is not possible (missing inputs, out-of-range conditions) |
| AC-T7 | The three new rows are visually grouped and distinguished from the AoA rows |

### Drag curve toggle

| ID | Criterion |
|----|-----------|
| AC-G1 | A "Show drag curve" toggle is visible on the Wing Definition panel when data is available |
| AC-G2 | By default the toggle is off and only the planform is shown |
| AC-G3 | Activating the toggle shows the drag curve chart; deactivating restores the planform |
| AC-G4 | The toggle is hidden when wing/airfoil data is insufficient |

### Drag curve chart

| ID | Criterion |
|----|-----------|
| AC-C1 | The chart renders three curves: base drag, induced drag, total drag |
| AC-C2 | All curves begin at the stall speed; no curve extends below stall speed |
| AC-C3 | The x-axis starts at 0 |
| AC-C4 | A vertical marker line is drawn at the cruise speed |
| AC-C5 | A vertical marker line is drawn at the minimum total drag speed, distinctly styled from the cruise marker |
| AC-C6 | Filled dots appear on all three curves at each vertical marker |
| AC-C7 | Hovering over a dot shows a tooltip with the curve name, speed (with unit), and Cd (three decimal places) |
| AC-C8 | The chart title, axis labels, and legend are legible and correctly named |
| AC-C9 | Speed values on the x-axis and in tooltips use the active unit system (SI or Imperial) |
| AC-C10 | The chart updates when cruise speed, altitude, wing loading, or wing geometry changes |
| AC-C11 | No chart is shown when data is insufficient; no partial/empty chart is rendered |

---

## 8. Edge Cases

| Scenario | Expected behaviour |
|---|---|
| No airfoil selected | Both the new table rows and the drag curve toggle are hidden or cells show `—` |
| Wing geometry fields are zero or incomplete | Drag quantities cannot be computed; cells show `—`; toggle hidden |
| Cruise speed is below stall speed | Cruise marker is not drawn (cruise speed is outside the valid range); a warning label may be shown inside the chart area |
| Cruise speed equals minimum drag speed | A single merged marker is shown; tooltip indicates both "Cruise" and "Min drag" |
| Polar does not cover the AoA range at very low speeds (high CL) | Curve terminates at the speed where polar coverage ends, even if that is above stall speed; the chart does not extrapolate beyond the polar |
| Very high aspect ratio (AR → large) | Induced drag Cd_i approaches zero but remains calculated; no special-casing needed |
| Unit system change (SI ↔ Imperial) | Speed axis and tooltip speed values update immediately; Cd values are dimensionless and unchanged |
| Stall speed and cruise speed very close together | Markers are still drawn distinctly at their respective x positions; tooltips are not merged |
