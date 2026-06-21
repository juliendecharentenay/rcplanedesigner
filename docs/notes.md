# Project Notes

## Development Status

| Feature | Functional spec | Technical spec | Status |
|---------|----------------|----------------|--------|
| AirfoilAnalyser class | docs/functional/airfoil-analyser.md | docs/technical/airfoil-analyser.md | Complete |
| UI refactor to AirfoilAnalyser | docs/functional/airfoil-analyser-refactor.md | docs/technical/airfoil-analyser-refactor.md | Complete |
| Error handling propagation | docs/functional/error-handling-propagation.md | docs/technical/error-handling-propagation.md | Complete |
| Wing Definition Panel | docs/functional/wing-definition-panel.md | docs/technical/wing-definition-panel.md | Complete |
| URL sync — index page | docs/functional/url-sync-index-page.md | docs/technical/url-sync-index-page.md | Complete |
| URL Query String Sync (index page) | docs/functional/url-sync-index-page.md | docs/technical/url-sync-index-page.md | Technical spec written |
| Wing Performance Table | docs/functional/wing-performance-table.md | docs/technical/wing-performance-table.md | Complete |
| WingAnalyser class + refactor | docs/functional/wing-analyser.md | docs/technical/wing-analyser.md | Complete |

---

## Architectural Decisions

### AirfoilAnalyser — plain ES2020 class, self-contained

`www/src/js/AirfoilAnalyser.js` is the single file for all aerodynamic analysis of one airfoil entry. It has no Vue dependency and no imports from other project utility files — all helper logic (interpolation, stall/landing computation, CL/speed formulae) is inlined as private module-level functions. The only external import is `atmosphere.js`.

**Fixed properties** (zero-lift, stall, landing) are computed once at construction time. **Variable queries** (cruise conditions, speeds) are exposed as methods because they depend on extrinsic flight parameters (wing loading, speed, altitude).

Public API:
- Properties: `profileName`, `polar`, `zeroLiftAoA/Cl/Cd/Cm`, `stallAoa/Cl/Cd/Cm`, `landingCl/Aoa/Cd/Cm`
- Methods: `atAoA(aoa)`, `getCruiseConditions(wl, spd, alt)`, `getCruiseSpeed(wl, cl, alt)`, `getStallSpeed(wl, alt)`, `getLandingSpeed(wl, alt)`

### AirfoilAnalyser[] as the data currency across the UI

`useAirfoils.js` constructs a module-level `AirfoilAnalyser[]` from `airfoils.json` once and returns the same array reference on every call. All components consume analyser instances — no component imports raw JSON or the former utility files directly.

### cruiseAoa threaded as a prop

`airfoil/App.vue` computes `cruiseAoa` from `getCruiseConditions()` and passes it down through `PolarChart → LiftCurveChart / LiftDragPolarChart` and `AirfoilViewerTab → AirfoilProfileChart`. Chart components do not perform AoA interpolation themselves.

### atAoA returns { cd, cm }, not { cl, cd, cm }

`interpolateAtAoA` (inlined in `AirfoilAnalyser`) returns `{ cd, cm }` because the polar data does not independently store CL at each AoA — CL is the lookup key, not the result. `atAoA()` follows the same contract.

### Error propagation pattern — 2026-06-13

**Context:** Seven components had unguarded fallible logic in `draw()` functions and `computed()` bodies. Any uncaught exception would crash the component tree rather than route to the ErrorDialog.

**Decision:** Wrap all fallible component logic in try/catch blocks that call `inject(SET_ERROR_KEY)` and return a typed safe fallback. Draw functions use `setError(e); return`. Computed properties use `setError(e); return <fallback>`. The pattern is documented in `www/CLAUDE.md` under "Error handling in components".

**Rationale:** Consistent with the existing pattern in `AirfoilCoordTable.vue`. Keeps error reporting centralised through the single `ErrorDialog` rather than scattered try/catch with local state. Safe fallbacks (`[]`, `[-1, 2]`) allow the rest of the UI to remain functional after a partial failure.

**Consequences:** Non-enumerable property getters must be used in test fixtures that trigger errors, because Vue Test Utils' `deeplyCheckForRef` traverses enumerable props before mounting. This is a test-only concern and does not affect production behaviour.

---

## Implementation Log

### WingAnalyser class + refactor — 2026-06-13

**Chunk 1 of 3:** WingAnalyser class implementation + test suite

**Files created/modified:**
- `www/src/js/WingAnalyser.js` — replaced stub with full implementation: taperRatio, wingArea, aspectRatio, mac, macSpanPosition, xTipLE, macLeadingEdgeOffset getters; rootReynolds, tipReynolds, inducedAoaDeg, cruiseAoaWing, landingAoaWing methods; OSWALD_E=0.85 module constant
- `www/src/js/WingAnalyser.test.js` — (new) 33 tests covering all getters and methods with valid inputs, boundary cases (zero, null, negative), and known numeric results

**Tests written:** 33 — all passing; full suite 449 passing

**Spec items not implemented:** none

**Next chunk:** Chunk 2 — refactor WingDefinitionPanel.vue

---

**Chunk 2 of 3:** Refactor WingDefinitionPanel.vue to use WingAnalyser

**Files created/modified:**
- `www/src/pages/index/components/ParameterPanel/WingDefinitionPanel.vue` — replaced inline taperRatio, wingArea, aspectRatio, reynoldsNumbers computeds with `analyser` computed (WingAnalyser instance); added `import { WingAnalyser }` and `import { convertDistance, convertSpeed }`; removed `import { atmosphere }` (now handled inside WingAnalyser)

**Tests written:** 0 new — all 22 existing panel tests pass unchanged; full suite 449 passing

**Spec items not implemented:** none

**Next chunk:** Chunk 3 — refactor WingDiagramChart.vue

---

**Chunk 3 of 3:** Refactor WingDiagramChart.vue to use WingAnalyser

**Files created/modified:**
- `www/src/pages/index/components/WingDiagramChart.vue` — added `import { WingAnalyser }`; added `wingAnalyser` computed (WingAnalyser instance from geometry); replaced inline `OSWALD_E` constant and `inducedAoaDeg` function with `wingAnalyser.value.cruiseAoaWing()` / `landingAoaWing()` in `performanceData`; replaced inline MAC, macSpanPosition, macLeadingEdgeOffset, xTipLE calculations in `draw()` with `wa.mac`, `wa.macSpanPosition`, `wa.macLeadingEdgeOffset`, `wa.xTipLE`; fallbacks via nullish coalescing guard against null analyser

**Tests written:** 0 new — all 16 existing chart tests pass unchanged; full suite 449 passing

**Spec items not implemented:** none

**Adjacent issues flagged:** none

**Next chunk:** none — feature complete

---

### Architectural Decisions

#### WingAnalyser class — 2026-06-13

**Context:** Wing aerodynamic and geometric calculations were duplicated (with subtle differences) across WingDefinitionPanel.vue and WingDiagramChart.vue. A stub class existed at `www/src/js/WingAnalyser.js`.

**Decision:** Implement `WingAnalyser` as a plain ES2020 class mirroring the `AirfoilAnalyser` pattern. All properties are getters with null-propagation semantics. Methods accept extrinsic parameters (speed, altitude, airfoil AoA). The Oswald efficiency factor is a module-level constant (OSWALD_E = 0.85). Both components construct a `WingAnalyser` instance in a `computed()` and delegate all calculations to it.

**Rationale:** Eliminates duplicated arithmetic, makes wing physics independently testable without mounting any Vue component, and follows the established AirfoilAnalyser precedent.

**Consequences:** `WingDiagramChart.vue` retains fallback inline calculations behind nullish coalescing (`wa?.mac ?? ...`) to guard against the case where `wingAnalyser` computed returns null on error. This is defensive but does not affect normal operation.

---

### Scope evaluation — WingAnalyser — 2026-06-13

**Score:** Modules 2 + Endpoints 1 + Entities 1 + Integrations 2 + Criteria 3 = 9. Split into 3 chunks.

**Chunk 1:** WingAnalyser.js implementation + WingAnalyser.test.js (33 tests). Pure class, no Vue.
**Chunk 2:** Refactor WingDefinitionPanel.vue — `analyser` computed replaces 4 inline computeds.
**Chunk 3:** Refactor WingDiagramChart.vue — `wingAnalyser` computed replaces OSWALD_E, inducedAoaDeg, inline MAC geometry.

---

### Wing Performance Table — 2026-06-13

**Chunk 1 of 1:** Full implementation — performanceData computed, HTML table overlay, extended tests

**Files created/modified:**
- `www/src/pages/index/components/WingDiagramChart.vue` — added `AIRFOILS_KEY` inject, `AirfoilAnalyser` import, `convertWingLoading`/`convertSpeed` imports, `OSWALD_E` constant, `inducedAoaDeg` helper, `fmtAoa` helper, `performanceData` computed, HTML table overlay in template
- `www/src/pages/index/components/WingDiagramChart.test.js` — updated `mountChart`/`mountChartWithDraw` helpers to accept `airfoils` parameter and provide `AIRFOILS_KEY`; added `MOCK_ANALYSER` fixture; 8 new tests (T1–T8)

**Tests written:** 8 new — all passing; 16 total in file; full suite 416 passing

**Spec items not implemented:** none

**Adjacent issues flagged:** Pre-existing tests needed `AIRFOILS_KEY` added to `global.provide` — handled by extending the mount helpers rather than modifying individual tests.

**Next chunk:** none — feature complete

---

### Error handling propagation — 2026-06-13

**Chunk 1 of 2:** draw() guards + CLAUDE.md documentation

**Files created/modified:**
- `www/src/pages/airfoil/components/AirfoilProfileChart.vue` — added SET_ERROR_KEY inject; wrapped draw() body in try/catch
- `www/src/pages/airfoil/components/LiftCurveChart.vue` — added SET_ERROR_KEY inject; wrapped draw() body in try/catch
- `www/src/pages/airfoil/components/LiftDragPolarChart.vue` — added SET_ERROR_KEY inject; wrapped draw() body in try/catch
- `www/src/pages/airfoil/components/ComparisonChart.vue` — added SET_ERROR_KEY inject; wrapped draw() body in try/catch
- `www/CLAUDE.md` — added "Error handling in components" section after existing "Error handling" section
- `www/src/pages/airfoil/components/AirfoilProfileChart.test.js` — added setError guard test
- `www/src/pages/airfoil/components/LiftCurveChart.test.js` — added setError guard test
- `www/src/pages/airfoil/components/LiftDragPolarChart.test.js` — added setError guard test
- `www/src/pages/airfoil/components/ComparisonChart.test.js` — added setError guard test (uses non-enumerable getter to bypass Vue Test Utils traversal)

**Tests written:** 4 new tests — all passing

**Spec items not implemented:** none

**Adjacent issues flagged:** Vue Test Utils' `deeplyCheckForRef` traverses enumerable prop object properties before mounting; throwing getters must be non-enumerable in test fixtures.

**Next chunk:** Chunk 2 — computed guards + safeAirfoils

---

**Chunk 2 of 2:** computed guards + safeAirfoils

**Files created/modified:**
- `www/src/pages/airfoil/components/PolarChart.vue` — added SET_ERROR_KEY inject; wrapped sharedYDomain computed in try/catch with [-1, 2] fallback
- `www/src/pages/airfoil/components/ComparisonTab.vue` — added SET_ERROR_KEY inject; wrapped chartData computed in try/catch with [] fallback
- `www/src/pages/index/components/AirfoilPanel.vue` — added SET_ERROR_KEY inject; added safeAirfoils computed wrapping airfoils array check; template updated to use safeAirfoils
- `www/src/pages/airfoil/components/PolarChart.test.js` — added setError + fallback domain test
- `www/src/pages/airfoil/components/ComparisonTab.test.js` — added SET_ERROR_KEY provide + setError test using mockImplementationOnce
- `www/src/pages/index/components/AirfoilPanel.test.js` — added SET_ERROR_KEY provide + safeAirfoils null-guard tests

**Tests written:** 4 new tests — all passing

**Spec items not implemented:** none

**Adjacent issues flagged:** none

**Next chunk:** none — feature complete

---

## Implementation Log

### Wing Definition Panel — 2026-06-13

**Chunk 1 of 2:** Foundations — units, state, ParameterPanel shell, WingDefinitionPanel

**Files created/modified:**
- `www/src/units/units.js` — added `getAreaUnit`, `convertArea` using derived `M_TO_FT²`
- `www/src/pages/index/composables/useUnits.js` — added `areaUnit` computed ref, re-exported `convertArea`
- `www/src/pages/index/composables/useAppState.js` — added 4 new fields (wingSpan, rootChord, tipChord, sweepAngle); distance fields reconverted on unit change
- `www/src/pages/index/App.vue` — added `activePanel` ref, wired `:active-panel` and `@navigate` to ParameterPanel and `:active-panel` to SvgPanel
- `www/src/pages/index/components/ParameterPanel.vue` — navigation shell: clickable header, dropdown, canNavigateToWing guard, conditional rendering
- `www/src/pages/index/components/WingDefinitionPanel.vue` — (new) 4 editable inputs, 5 computed outputs, formatReynolds helper, back button
- `www/src/units/units.test.js` — (new) 5 tests for getAreaUnit/convertArea
- `www/src/pages/index/composables/useUnits.test.js` — 3 new tests for areaUnit reactive ref
- `www/src/pages/index/composables/useAppState.test.js` — 7 new tests for new fields + conversions
- `www/src/pages/index/components/ParameterPanel.test.js` — renamed 'Parameters'→'General'; 13 new tests
- `www/src/pages/index/components/WingDefinitionPanel.test.js` — (new) 22 tests

**Tests written:** 50 new — all 355 passing

**Spec items not implemented:** WingDiagramChart.vue, SvgPanel.vue changes (deferred to Chunk 2)

**Adjacent issues flagged:** none

**Next chunk:** Chunk 2 — WingDiagramChart.vue (D3 planform), SvgPanel.vue activePanel wiring

---

**Chunk 2 of 2:** WingDiagramChart + SvgPanel activePanel wiring

**Files created/modified:**
- `www/src/pages/index/components/WingDiagramChart.vue` — (new) D3-driven top-view planform; draws wing outline, quarter-chord line, MAC dashed line, quarter-MAC quartered-circle marker; geometry computed wrapped in try/catch
- `www/src/pages/index/components/SvgPanel.vue` — added `activePanel` prop (String, default 'general'); conditionally renders TrainerSideView vs WingDiagramChart
- `www/src/pages/index/components/WingDiagramChart.test.js` — (new) 8 tests: svg renders, blank when zero dims, polygon/lines/dashed line/circle for valid geometry, setError guard
- `www/src/pages/index/components/SvgPanel.test.js` — 3 new tests for activePanel='general' / 'wing-definition' switching

**Tests written:** 11 new — all 366 passing

**Spec items not implemented:** none

**Adjacent issues flagged:** Vue computed bodies that throw propagate the error before draw() is called, so `geometry` computed also needs a try/catch guard (not just draw()). Fixed by wrapping geometry computed in try/catch returning safe zero defaults.

**Next chunk:** none — feature complete

---

## Architectural Decisions

### Wing Performance Table — HTML overlay, not D3 — 2026-06-13

**Context:** A performance data table (cruise AoA, landing AoA, two columns) needed to be added to the WingDiagramChart, which is otherwise a pure D3 SVG component.

**Decision:** Render the table as an HTML `<div>` positioned `absolute top-0 right-0` inside the component's existing `relative` container, alongside the `<svg>` element. Data is derived in a `performanceData` computed property. D3 is not involved.

**Rationale:** HTML tables are simpler to style with Tailwind, trivially testable with `@vue/test-utils` DOM queries, and cleanly separate tabular data concerns from D3 geometry drawing concerns. No need to draw text elements inside SVG.

**Consequences:** `WingDiagramChart.vue` now injects `AIRFOILS_KEY` (previously only injected by `AirfoilPanel.vue`). The Oswald efficiency factor is hardcoded at 0.85 as a module-level constant — making it user-configurable is explicitly out of scope.

### Scope evaluation — Wing Performance Table — 2026-06-13

**Score:** Modules 1 + Endpoints 1 + Entities 1 + Integrations 2 + Criteria 2 = 7. Single developer invocation, no chunking required.

---

### Wing Definition Panel navigation — 2026-06-13

**Context:** A second panel view ("Wing Definition") was added to the existing ParameterPanel, requiring a navigation mechanism and SVG canvas switching.

**Decision:** `App.vue` owns `activePanel` ref (`'general' | 'wing-definition'`) and passes it as a prop to both `ParameterPanel` and `SvgPanel`. `ParameterPanel` emits `navigate` events upward. Panel body is conditionally rendered inside `ParameterPanel` using `v-if` on `activePanel` prop.

**Rationale:** Single source of truth for active panel in the nearest common ancestor. Avoids provide/inject for a simple string value. Consistent with how other state is surfaced (e.g., `activePanel` does not need reactivity across deeply nested components).

**Consequences:** `SvgPanel` requires an `activePanel` prop to switch between `TrainerSideView` and `WingDiagramChart`. Both components are tested with stub mocks for the other panel's component.

### Wing area computed in display units — 2026-06-13

**Context:** Wing span, root chord, and tip chord are all stored in the display unit (metres or feet). Wing area formula is `(rc + tc) / 2 * span`.

**Decision:** Since all three operands are in the same unit (the display unit), the product is already in the square of that unit (m² or ft²). No intermediate SI conversion is needed for wing area display. Aspect ratio, however, must use SI values to remain dimensionless regardless of unit system.

**Rationale:** Avoids double-conversion (state stores display values after unit change). Consistent with how wingLoading is stored.

**Consequences:** `areaUnit` computed ref in `useUnits.js` tracks the correct label. Aspect ratio computed uses `convertDistance` on each operand before dividing.

### Scope evaluation — Wing Definition Panel — 2026-06-13

**Score:** Modules 3 + Endpoints 1 + Entities 2 + Integrations 2 + Criteria 3 = 11. Split into 2 chunks.

**Chunk 1** (Foundations): units.js, useUnits.js, useAppState.js, App.vue wiring, ParameterPanel.vue shell + navigation, WingDefinitionPanel.vue. Test files: units.test.js, useUnits.test.js, useAppState.test.js, ParameterPanel.test.js, WingDefinitionPanel.test.js.

**Chunk 2** (SVG diagram): WingDiagramChart.vue, SvgPanel.vue. Test files: WingDiagramChart.test.js, SvgPanel.test.js.

---

### URL sync — index page — 2026-06-13

**Context:** The index page had no URL synchronisation, making it impossible to bookmark or share a specific aircraft configuration.

**Decision:** Implement URL sync directly in `www/src/pages/index/App.vue` using `onMounted` for load-time parsing and `watch` for write-back — no new composable. Follows the identical pattern used in `www/src/pages/airfoil/App.vue`. A `URL_DEFAULTS` constant drives both serialisation (omit-if-default) and validation. State defaults in `useAppState.js` were aligned to the URL defaults so the round-trip invariant holds.

**Rationale:** The logic is simple enough (parse → validate → setState; watch → serialize → replaceState) that a composable would add indirection without benefit, since `App.vue` is the only consumer. Mirrors the established airfoil page precedent.

**Consequences:** `useAppState.js` non-zero defaults (`wingLoading: 50`, `cruisingSpeed: 25`, `wingSpan: 1.5`, `rootChord: 0.3`, `tipChord: 0.2`) now represent realistic starter values rather than zero. Two-call `setState` pattern in `onMounted`: first `setState({ units })` to fire unit conversion of existing defaults, then `setState({ ...parsedValues })` with values already in the target unit system. A single merged call would overwrite parsed values with converted old defaults.

---

## Implementation Log

### URL sync — index page — 2026-06-13

**Chunk 1 of 1:** Full implementation — useAppState defaults, App.vue URL sync, tests

**Files created/modified:**
- `www/src/pages/index/composables/useAppState.js` — updated 5 defaults: wingLoading 0→50, cruisingSpeed 0→25, wingSpan 0→1.5, rootChord 0→0.3, tipChord 0→0.2
- `www/src/pages/index/composables/useAppState.test.js` — updated 5 test assertions to match new defaults
- `www/src/pages/index/App.vue` — added URL_DEFAULTS constant; onMounted parse block; watch serialise block; stored useAirfoils() result; added PLANE_TYPES import and onMounted/watch to vue imports
- `www/src/pages/index/App.test.js` — (new) 18 test cases covering all parsing and serialisation scenarios

**Tests written:** 18 new — all 384 passing

**Spec items not implemented:** none

**Adjacent issues flagged:** Two-call setState pattern required in onMounted: unit must be applied first so conversion fires on existing defaults, then parsed numeric values (already in new unit system) applied second. A single combined call would overwrite parsed values with converted defaults.

**Next chunk:** none — feature complete

---

## Development Status Update — 2026-06-14

| Feature | Functional spec | Technical spec | Status |
|---------|----------------|----------------|--------|
| BaseTable Vue Component | docs/functional/base-table.md | docs/technical/base-table.md | Complete |

---

## Scope evaluation — BaseTable Vue Component — 2026-06-14

**Score:** Modules 2 + Endpoints 1 + Entities 1 + Integrations 2 + Criteria 2 = 8. Split into 2 chunks.

**Chunk 1:** Create `BaseTable.vue` + `BaseTable.test.js`; adopt in `AirfoilCoordTable.vue` + update `AirfoilCoordTable.test.js`. Precondition: nothing. Output: working BaseTable component with 10 tests; AirfoilCoordTable using it with JS stripe removed. Covers spec Sections 3, 4.1, 5.1, 5.2.

**Chunk 2:** Adopt `BaseTable` in `AirfoilPanel.vue` + update `AirfoilPanel.test.js`; adopt in `WingDiagramChart.vue` + update `WingDiagramChart.test.js`. Precondition: BaseTable exists at `@/components/BaseTable.vue`. Output: all three consumers using BaseTable; stripe classes on WingDiagramChart rows. Covers spec Sections 4.2, 4.3, 5.3, 5.4.

---

## Implementation Log

### BaseTable Vue Component — 2026-06-14

**Chunk 1 of 2:** Create BaseTable.vue + BaseTable.test.js; adopt in AirfoilCoordTable.vue

**Files created/modified:**
- `www/src/components/BaseTable.vue` — new shared component; renders `<table>`, `<thead>`, `<th>` per column, `<tbody>` with default slot; `alignClass()` helper for text-left/right/center; standardised `th` classes: sticky top-0 z-10, px-3 py-2, font-semibold, uppercase, tracking-wide, border-b border-slate-200, bg-white
- `www/src/components/BaseTable.test.js` — new; 11 tests (BT-1 through BT-10 plus BT-6b) covering table structure, th count, labels, alignment classes, required classes, sticky, slot rendering
- `www/src/pages/airfoil/components/AirfoilCoordTable.vue` — imports and uses BaseTable; columns defined as const; JS stripe ternary removed; tr elements carry odd:bg-white even:bg-slate-50 classes
- `www/src/pages/airfoil/components/AirfoilCoordTable.test.js` — added AC-2 (Tailwind stripe classes on tr) and AC-3 (thead/th via BaseTable) tests; all prior tests unchanged

**Tests written:** 11 new (BaseTable) + 2 new (AirfoilCoordTable) = 13 — all passing. Full suite: 462 passing.

**Spec items not implemented:** none

**Adjacent issues flagged:** Pre-existing Vue warning "injection Symbol(setError) not found" in AirfoilCoordTable tests — this is a pre-existing condition in those tests (no SET_ERROR_KEY stub), not introduced by this change.

**Next chunk:** Chunk 2 — adopt BaseTable in AirfoilPanel.vue and WingDiagramChart.vue

---

**Chunk 2 of 2:** Adopt BaseTable in AirfoilPanel.vue and WingDiagramChart.vue

**Files created/modified:**
- `www/src/pages/index/components/AirfoilPanel.vue` — imports BaseTable; replaces inline table/thead/tbody with BaseTable; columns const defined; safeAirfoils computed retained; all row interaction classes (cursor-pointer, bg-sky-50, hover:bg-slate-50) unchanged on tr elements
- `www/src/pages/index/components/AirfoilPanel.test.js` — added AP-1 test (BaseTable used, thead/th present with correct classes); AP-2 covered by existing row interaction tests
- `www/src/pages/index/components/WingDiagramChart.vue` — imports BaseTable; adds tableColumns const; replaces inline performance table with BaseTable; tr elements carry odd:bg-white even:bg-slate-50 stripe classes
- `www/src/pages/index/components/WingDiagramChart.test.js` — added WD-1 (BaseTable used, thead/th present) and WD-2 (stripe classes on tr) tests

**Tests written:** 1 new (AirfoilPanel AP-1) + 2 new (WingDiagramChart WD-1, WD-2) = 3 — all passing. Full suite: 465 passing.

**Spec items not implemented:** none

**Adjacent issues flagged:** none

**Next chunk:** none — feature complete

---

## Development Status Update — 2026-06-20

| Feature | Functional spec | Technical spec | Status |
|---------|----------------|----------------|--------|
| Wing Drag Evaluation Expansion | docs/functional/wing-drag-evaluation.md | docs/technical/wing-drag-evaluation.md | In progress |

---

## Scope evaluation — Wing Drag Evaluation Expansion — 2026-06-20

**Score:** Modules 2 + Endpoints 1 + Entities 2 + Integrations 3 + Criteria 3 = 11. Split into 2 chunks.

**Chunk 1 (Table expansion):** Add `inducedCd(cl)` method to `WingAnalyser.js`. Extend `performanceData` computed in `WingDiagramChart.vue` to include `baseCdCruise`, `inducedCdWing`, `totalCdWing`. Add three new drag rows + `<hr>` separator to the template table. Add `fmtCd()` formatter. Covers spec Sections 3.1–3.6. Precondition: existing WingAnalyser and WingDiagramChart in place. Output: 3 new table rows rendering at cruise; 11 new tests passing.

**Chunk 2 (Drag curve overlay):** Add `showDragCurve` ref, `dragCurveAvailable` and `dragCurveData` computeds to `WingDiagramChart.vue`. Update watch. Add toggle button and `WingDragCurveChart` to template. Create new `WingDragCurveChart.vue` component with D3 rendering, 3 curves, 2 vertical markers, dot-and-tooltip hover. Covers spec Sections 4.1–4.7. Precondition: Chunk 1 complete. Output: toggleable drag curve overlay; 15 new tests passing.

---

## Implementation Log

### Wing Drag Evaluation Expansion — 2026-06-20

**Chunk 1 of 2:** Performance table expansion — WingAnalyser.inducedCd(), performanceData extension, 3 drag rows

**Files created/modified:**
- `www/src/js/WingAnalyser.js` — added `inducedCd(cl)` method: `(cl²)/(π × OSWALD_E × AR)`, mirrors `inducedAoaDeg` null-guard semantics
- `www/src/pages/index/components/WingDiagramChart.vue` — extended `nullResult` with 3 new fields; extended `getCruiseConditions` destructuring to capture `cruiseCd`; added drag coefficient computation block; added `fmtCd()` formatter; added `<hr>` separator row + 3 drag coefficient rows to template tbody
- `www/src/js/WingAnalyser.test.js` — 4 new tests (T31–T34) for `inducedCd`
- `www/src/pages/index/components/WingDiagramChart.test.js` — 7 new drag tests (T-drag-1 through T-drag-7); updated MOCK_ANALYSER to return `cruiseCd`

**Tests written:** 11 new — all passing; full suite 460 passing

**Spec items not implemented:** Sections 4.x (drag curve) — deferred to Chunk 2

**Next chunk:** Chunk 2 — drag curve overlay (WingDragCurveChart.vue new component + WingDiagramChart.vue additions)

---

**Chunk 2 of 2:** Drag curve overlay — WingDragCurveChart.vue (new) + WingDiagramChart.vue additions

**Files created/modified:**
- `www/src/pages/index/components/WingDragCurveChart.vue` — new D3 chart component: ResizeObserver pattern, 100-point speed loop from stall speed, 3 curves (base drag dashed slate, induced drag dashed sky, total drag solid blue), legend, cruise vertical line (red), min-drag vertical line (amber dashed), filled dots at intersections, Vue reactive tooltip, merged-marker logic when speeds within 0.5 m/s, SET_ERROR_KEY error handling
- `www/src/pages/index/components/WingDragCurveChart.test.js` — new; 11 tests DC-1 through DC-11
- `www/src/pages/index/components/WingDiagramChart.vue` — added WingDragCurveChart import; added showDragCurve ref, dragCurveAvailable and dragCurveData computeds; updated watch to include showDragCurve and guard draw(); template: v-show on SVG, v-if WingDragCurveChart, toggle button
- `www/src/pages/index/components/WingDiagramChart.test.js` — 4 new toggle tests G-1 through G-4

**Tests written:** 15 new — all passing; full suite 475 passing (31 test files)

**Spec items not implemented:** none

**Adjacent issues flagged:** none

**Next chunk:** none — feature complete

---

## Development Status Update — 2026-06-20 (final)

| Feature | Functional spec | Technical spec | Implementation | Status |
|---------|----------------|----------------|----------------|--------|
| Wing Drag Evaluation Expansion | docs/functional/wing-drag-evaluation.md | docs/technical/wing-drag-evaluation.md | Chunk 1/2 + Chunk 2/2 complete | Complete |

---

## Implementation Log

### Fuselage and Tail Definition — 2026-06-21

**Chunk 1 of 2:** FuselageAnalyser class; WingPlanformLayer shared SVG component; useAppState 6 new fields; FuselageDefinitionPanel; ParameterPanel extensions

**Files created/modified:**
- `www/src/js/FuselageAnalyser.js` — new plain ES2020 class: static defaults (defaultFrontLength, defaultRearLength, defaultTailSpan, defaultTailChord), getters (tailArea, tailMomentArm, tailAspectRatio), SVG geometry helpers (wingGeometry, fuselageGeometry, tailGeometry)
- `www/src/js/FuselageAnalyser.test.js` — new; 32 tests
- `www/src/pages/index/components/WingPlanformLayer.vue` — new prop-driven SVG `<g>` fragment rendering wing planform (polygon, quarter-chord, MAC line, quarter-MAC marker, dimension lines); no state injection
- `www/src/pages/index/components/WingPlanformLayer.test.js` — new; 12 tests
- `www/src/pages/index/composables/useAppState.js` — added 6 new fields to STATE_DEFAULTS (fuselageWidth, frontFuselage, rearFuselage, tailSpan, tailChord, tailAirfoil); 5 unit-conversion lines in setState
- `www/src/pages/index/composables/useAppState.test.js` — updated default snapshot test; 10 new tests for fuselage/tail fields
- `www/src/pages/index/components/ParameterPanel/FuselageDefinitionPanel.vue` — new panel: 5 number inputs + 1 select; effectiveFrontLength/RearLength/TailSpan/TailChord computeds resolving sentinel zeros; FuselageAnalyser computed; tailArea/tailMomentArm outputs; navigate emit to 'wing-definition'
- `www/src/pages/index/components/ParameterPanel/FuselageDefinitionPanel.test.js` — new; 22 tests
- `www/src/pages/index/components/ParameterPanel.vue` — added FuselageDefinitionPanel import; canNavigateToFuselage computed; 'fuselage-definition' nav entry in dropdown; 'Fuselage & Tail' header label case; FuselageDefinitionPanel conditional render
- `www/src/pages/index/components/ParameterPanel.test.js` — added FuselageDefinitionPanel mock stub; 5 new nav tests

**Tests written:** 81 new — all 557 passing (was 476)

**Spec items not implemented:** Sections 6, 8, 9 (FuselageDiagramChart, SvgPanel, App.vue URL sync) — deferred to Chunk 2

**Adjacent issues flagged:** none

**Next chunk:** Chunk 2 — FuselageDiagramChart, WingDiagramChart refactor to use WingPlanformLayer, SvgPanel extension, App.vue URL sync

---

**Chunk 2 of 2:** FuselageDiagramChart; WingDiagramChart refactored to WingPlanformLayer; SvgPanel + App.vue extensions

**Files created/modified:**
- `www/src/pages/index/components/FuselageDiagramChart.vue` — new D3-free reactive SVG component: centreline, fuselage body path (Bézier nose oval → rectangular body → tapered tail), WingPlanformLayer for wing, horizontal tail rectangular polygon + ¼-chord line, vertical tail schematic ellipse, two dimension lines with arrow markers; SET_ERROR_KEY guards on all computeds
- `www/src/pages/index/components/FuselageDiagramChart.test.js` — new; 13 tests
- `www/src/pages/index/components/WingDiagramChart.vue` — refactored: D3 draw() function removed; svgLayout computed replaced; WingPlanformLayer used for wing rendering; reactive SVG template with v-if; performance table + drag curve unchanged; all 26 existing tests still pass
- `www/src/pages/index/components/SvgPanel.vue` — added FuselageDiagramChart import + v-else-if conditional
- `www/src/pages/index/components/SvgPanel.test.js` — 2 new tests for fuselage-definition panel rendering
- `www/src/pages/index/App.vue` — 6 new URL params (fw, ff, rf, ts, tch, tfoil) parsed in onMounted; serialised in watch; fuselage-definition added to activePanel valid set
- `www/src/pages/index/App.test.js` — 8 new tests (test 22–29) covering fuselage/tail URL sync

**Tests written:** 23 new (13 FuselageDiagramChart + 2 SvgPanel + 8 App.test.js) — all 580 tests passing (was 557)

**Spec items not implemented:** none

**Adjacent issues flagged:** WingDiagramChart refactor from D3 imperative draw to reactive SVG required converting the D3 `toSvg()` coordinate helper into a prop-driven system. Arrow marker defs now rendered as SVG `<defs>` in the template. The `v-if="svgLayout"` guard handles the "zero geometry" case that previously relied on D3's `selectAll('*').remove()`.

**Next chunk:** none — feature complete

---

## Architectural Decisions

### WingPlanformLayer — shared prop-driven SVG fragment — 2026-06-21

**Context:** Both WingDiagramChart and FuselageDiagramChart need to render the wing planform. Duplicating the geometry code would create a maintenance burden.

**Decision:** Extract wing planform rendering into `WingPlanformLayer.vue`, a prop-driven `<g>` SVG fragment that accepts centreX, topY, scale, and all wing geometry values as props. It injects no application state.

**Rationale:** Props-driven means the component is reusable in any future SVG canvas (e.g. Centre-of-Gravity panel) without pulling in provide/inject chains. Matches the `FuselageAnalyser` framework-free pattern for the non-Vue layer.

**Consequences:** WingDiagramChart.vue was refactored from D3 imperative drawing to reactive SVG. The D3 `draw()` function was removed entirely, replaced by a `svgLayout` computed and template-driven rendering. All 26 existing tests continue to pass unchanged.

### Zero-means-default sentinel for fuselage/tail state fields — 2026-06-21

**Context:** frontFuselage, rearFuselage, tailSpan, and tailChord have dynamically computed defaults (dependent on MAC and wingArea). The defaults change when wing geometry changes.

**Decision:** Store `0` as the sentinel meaning "use computed default". `FuselageAnalyser.defaultXxx()` is called at render time when the stored value is 0. Non-zero values are stored directly from user input.

**Rationale:** Avoids eagerly writing computed defaults to state on navigation (which would require watching wing geometry changes to keep tail defaults in sync). `convertDistance(0, from, to) = 0`, so unit conversions preserve the sentinel without special-casing.

**Consequences:** Panel inputs always show the resolved effective value. There is no explicit "Reset to default" affordance — the user can type 0 to restore the sentinel, which will re-show the computed default.

---

## Development Status Update — 2026-06-21

| Feature | Functional spec | Technical spec | Implementation | Status |
|---------|----------------|----------------|----------------|--------|
| Fuselage and Tail Definition | docs/functional/2026-06-21-fuselage-tail-definition.md | docs/technical/2026-06-21-fuselage-tail-definition.md | Chunk 1/2 + Chunk 2/2 complete | Complete |

---

## Scope evaluation — Fuselage and Tail Definition — 2026-06-21

**Score:** Modules 3 + Endpoints 1 + Entities 2 + Integrations 2 + Criteria 3 = 11. Split into 2 chunks.

**Chunk 1 (Foundations):** `FuselageAnalyser.js` + test (pure class); `WingPlanformLayer.vue` + test (shared wing SVG fragment, prop-driven); `useAppState.js` (6 new fields + unit conversion); `FuselageDefinitionPanel.vue` + test; `ParameterPanel.vue` + test additions (new nav entry). Precondition: existing codebase. Output: all foundations with ≥52 new tests passing. Covers spec Sections 2, 3, 4, 5.

**Chunk 2 (SVG Diagram + URL Sync):** `FuselageDiagramChart.vue` + test; `WingDiagramChart.vue` refactored to use `WingPlanformLayer`; `SvgPanel.vue` + test additions; `App.vue` URL sync for 6 new fields + fuselage-definition in activePanel enum + `App.test.js` additions. Precondition: Chunk 1 complete. Output: full fuselage diagram visible; URL sync working; ≥26 new tests passing. Covers spec Sections 6, 7, 8, 9.

---
