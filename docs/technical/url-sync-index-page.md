# Technical Specification: URL Query String Synchronisation — Index Page

## Overview

Bidirectional synchronisation between the index page's application state and the browser URL
query string. On page load, URL parameters restore state. On any state change, the URL is
updated in-place via `history.replaceState`. Follows the pattern already established in
`www/src/pages/airfoil/App.vue`.

---

## Architecture

### Implementation location

All URL sync logic lives directly in `www/src/pages/index/App.vue`, mirroring the approach
used in the airfoil page. No new composable is introduced. The airfoil page precedent uses
`onMounted` for load-time parsing and `watch` for write-back; the index page follows the
same structure.

### Why no new composable

The logic is straightforward (parse → validate → setState, then watch → serialize →
replaceState). Extracting it into a composable would add indirection without simplifying any
consumer, since `App.vue` is the only site that needs it.

---

## State defaults alignment

The functional spec defines URL-omission defaults that differ from the current `useAppState.js`
initialisation values. **The state defaults in `useAppState.js` must be updated** as part of
this implementation so that the round-trip invariant holds (a page loaded with no query params
produces the same state as the defaults, and those defaults are omitted from the URL).

Fields requiring updates in `useAppState.js`:

| Field          | Current default | New default |
|----------------|-----------------|-------------|
| `wingLoading`  | `0`             | `50`        |
| `cruisingSpeed`| `0`             | `25`        |
| `wingSpan`     | `0`             | `1.5`       |
| `rootChord`    | `0`             | `0.3`       |
| `tipChord`     | `0`             | `0.2`       |

`sweepAngle` (already `0`), `siteAltitude` (already `0`), `planeType` (already `'Trainer'`),
`airfoilProfile` (already `null`), and `units` (already `'SI'`) need no change.

---

## URL parameter definitions

Defined as a module-level constant in `App.vue` to drive both serialisation and validation:

```js
const URL_DEFAULTS = {
  units:          'SI',
  siteAltitude:   0,
  wingLoading:    50,
  cruisingSpeed:  25,
  planeType:      'Trainer',
  airfoilProfile: null,
  wingSpan:       1.5,
  rootChord:      0.3,
  tipChord:       0.2,
  sweepAngle:     0,
  activePanel:    'general',
}
```

Parameter table (determines key names and write order):

| State field      | URL key  | Type     | Serialiser                  | Validator                          |
|------------------|----------|----------|-----------------------------|-------------------------------------|
| `units`          | `units`  | enum     | identity                    | `['SI', 'Imperial']` membership     |
| `siteAltitude`   | `alt`    | integer  | `String(Math.round(v))`     | `parseFloat`, range `[0, 9000]`     |
| `wingLoading`    | `wl`     | decimal  | `v.toFixed(2)`              | `parseFloat`, range `[1, 500]`      |
| `cruisingSpeed`  | `spd`    | decimal  | `v.toFixed(2)`              | `parseFloat`, range `[1, 500]`      |
| `planeType`      | `type`   | enum     | identity                    | `PLANE_TYPES` value membership      |
| `airfoilProfile` | `foil`   | string   | identity (URL-encoded)      | airfoil name membership or null     |
| `wingSpan`       | `span`   | decimal  | `v.toFixed(2)`              | `parseFloat`, range `[0.01, 100]`   |
| `rootChord`      | `rc`     | decimal  | `v.toFixed(2)`              | `parseFloat`, range `[0.01, 20]`    |
| `tipChord`       | `tc`     | decimal  | `v.toFixed(2)`              | `parseFloat`, range `[0, 20]`       |
| `sweepAngle`     | `sweep`  | decimal  | `v.toFixed(2)`              | `parseFloat`, range `[-89, 89]`     |
| `activePanel`    | `panel`  | enum     | identity                    | `['general', 'wing-definition']` membership |

`planeType` URL values are the exact `PLANE_TYPES[].value` strings (`'Trainer'`, `'Glider'`,
`'Acrobatic'`). The functional spec's examples use lowercase, but the canonical values are
title-case as defined in `useAppState.js`.

---

## Parsing (load-time)

Add an `onMounted` hook in `App.vue`. Import: add `onMounted` to the existing `vue` import.

```
onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.search)

    // 1. units first — required before interpreting any numeric field
    const unitsParam = params.get('units')
    const units = unitsParam === 'Imperial' ? 'Imperial' : 'SI'

    // 2. numeric fields — parseFloat + range guard
    function parseNum(key, min, max, fallback) {
      const raw = params.get(key)
      if (raw === null) return fallback
      const v = parseFloat(raw)
      return !isNaN(v) && v >= min && v <= max ? v : fallback
    }

    const siteAltitude  = parseNum('alt',   0,    9000, URL_DEFAULTS.siteAltitude)
    const wingLoading   = parseNum('wl',    1,    500,  URL_DEFAULTS.wingLoading)
    const cruisingSpeed = parseNum('spd',   1,    500,  URL_DEFAULTS.cruisingSpeed)
    const wingSpan      = parseNum('span',  0.01, 100,  URL_DEFAULTS.wingSpan)
    const rootChord     = parseNum('rc',    0.01, 20,   URL_DEFAULTS.rootChord)
    const tipChord      = parseNum('tc',    0,    20,   URL_DEFAULTS.tipChord)
    const sweepAngle    = parseNum('sweep', -89,  89,   URL_DEFAULTS.sweepAngle)

    // 3. planeType enum
    const typeParam = params.get('type')
    const planeType = PLANE_TYPES.map(p => p.value).includes(typeParam)
      ? typeParam
      : URL_DEFAULTS.planeType

    // 4. airfoilProfile — validate against known names
    const foilParam = params.get('foil')
    const airfoilProfile = foilParam !== null && airfoils.some(a => a.profileName === foilParam)
      ? foilParam
      : URL_DEFAULTS.airfoilProfile

    // 5. activePanel enum
    const panelParam = params.get('panel')
    const newActivePanel = ['general', 'wing-definition'].includes(panelParam)
      ? panelParam
      : URL_DEFAULTS.activePanel

    // 6. single atomic update
    setState({ units, siteAltitude, wingLoading, cruisingSpeed, planeType, airfoilProfile,
               wingSpan, rootChord, tipChord, sweepAngle })
    activePanel.value = newActivePanel
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
})
```

`airfoils` is the return value of `useAirfoils()`. Since `App.vue` already calls
`useAirfoils()` and provides the result, store it in a local `const airfoils = useAirfoils()`
before the `provide` call.

---

## Serialisation (state-change write-back)

Add a deep `watch` in `App.vue`. Import: add `watch` to the existing `vue` import.

```
watch([() => getState(), activePanel], ([s, panel]) => {
  try {
    const params = new URLSearchParams()

    // Keys are set in table order for deterministic, human-readable URLs.
    if (s.units !== URL_DEFAULTS.units)
      params.set('units', s.units)
    if (s.siteAltitude !== URL_DEFAULTS.siteAltitude)
      params.set('alt', String(Math.round(s.siteAltitude)))
    if (s.wingLoading !== URL_DEFAULTS.wingLoading)
      params.set('wl', s.wingLoading.toFixed(2))
    if (s.cruisingSpeed !== URL_DEFAULTS.cruisingSpeed)
      params.set('spd', s.cruisingSpeed.toFixed(2))
    if (s.planeType !== URL_DEFAULTS.planeType)
      params.set('type', s.planeType)
    if (s.airfoilProfile !== URL_DEFAULTS.airfoilProfile)
      params.set('foil', s.airfoilProfile)
    if (s.wingSpan !== URL_DEFAULTS.wingSpan)
      params.set('span', s.wingSpan.toFixed(2))
    if (s.rootChord !== URL_DEFAULTS.rootChord)
      params.set('rc', s.rootChord.toFixed(2))
    if (s.tipChord !== URL_DEFAULTS.tipChord)
      params.set('tc', s.tipChord.toFixed(2))
    if (s.sweepAngle !== URL_DEFAULTS.sweepAngle)
      params.set('sweep', s.sweepAngle.toFixed(2))
    if (panel !== URL_DEFAULTS.activePanel)
      params.set('panel', panel)

    const qs = params.toString()
    history.replaceState(null, '', qs ? '?' + qs : window.location.pathname)
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
  }
}, { deep: true })
```

`getState()` returns a readonly snapshot. The watcher source is a getter function
`() => getState()` so Vue can detect deep changes to the state ref through the composable's
accessor.

### URL clearing when all fields are default

When `params` is empty, `history.replaceState` is called with `window.location.pathname`
(no query string), matching the functional spec's "empty query string for default state"
example.

---

## `useAirfoils` integration

`App.vue` currently calls `useAirfoils()` and provides it:

```js
provide(AIRFOILS_KEY, useAirfoils())
```

Change this to store the result before providing, so it can be referenced in `onMounted`:

```js
const airfoils = useAirfoils()
provide(AIRFOILS_KEY, airfoils)
```

`useAirfoils()` is documented as returning the same module-level array on every call, so this
change is safe.

---

## `App.vue` import additions

Add to the `vue` destructure: `onMounted`, `watch`.

No other new imports are required — `PLANE_TYPES` is already exported from
`useAppState.js` and imported in `App.vue`'s indirect dependencies; add the explicit import
to `App.vue`'s script block.

---

## Files changed

| File | Change |
|------|--------|
| `www/src/pages/index/App.vue` | Add `URL_DEFAULTS` constant; add `onMounted` (parse); add `watch` (serialize); store `airfoils` ref; add `onMounted`, `watch` to `vue` import; add `PLANE_TYPES` import |
| `www/src/pages/index/composables/useAppState.js` | Update defaults: `wingLoading→50`, `cruisingSpeed→25`, `wingSpan→1.5`, `rootChord→0.3`, `tipChord→0.2` |
| `www/src/pages/index/App.test.js` | New test file (see below) |
| `www/src/pages/index/composables/useAppState.test.js` | Update any tests that assert the old zero defaults |

---

## Tests

New file: `www/src/pages/index/App.test.js`

Uses Vitest + Vue Test Utils. The component is mounted with all required provides stubbed
(same pattern used in existing component tests in this repo: stub `SET_ERROR_KEY`, `APP_STATE_KEY`,
`FOCUSED_PARAM_KEY`, `AIRFOILS_KEY`).

To test URL sync in isolation without mounting the full component tree, the recommended
approach is to test the parse and serialise logic through the component's behaviour:
mock `window.location.search` before mounting, then assert that the mocked `setState` was
called with the expected partial; mock `history.replaceState` and assert its arguments after
triggering a state change.

### Required test cases

**Parsing — on mount**

1. All valid params → `setState` called with correct values; `activePanel` set correctly.
2. `units=Imperial` parsed before numerics; all numerics accepted in Imperial range.
3. Unknown key (`foo=bar`) → silently ignored; `setState` not called with that key.
4. Invalid numeric (`wl=banana`) → field falls back to its default.
5. Out-of-range numeric (`sweep=999`) → field falls back to its default.
6. Unrecognised `type` value → `planeType` falls back to `'Trainer'`.
7. `foil` value matching no known airfoil → `airfoilProfile` stays `null`.
8. `foil` absent from URL → `airfoilProfile` is `null`.
9. Partial URL (only `wl` and `foil`) → unspecified fields use defaults.
10. Empty query string → all fields use defaults; `activePanel` is `'general'`.

**Serialisation — on state change**

11. Default state → `history.replaceState` called with `window.location.pathname` (no `?`).
12. Non-default `units=Imperial` → written first in URL.
13. `airfoilProfile=null` → `foil` key absent from URL.
14. Non-default numeric → serialised with `toFixed(2)` (decimals) or `Math.round` (alt).
15. `siteAltitude` is an integer → serialised without decimal point.
16. Non-default `activePanel` → `panel` key written.
17. Switching units via setState → URL `units` key appears/disappears; numeric values
    re-serialised in new display unit.
18. All fields set to defaults → URL is `window.location.pathname` (clean).

**Acceptance criteria mapping**

| AC | Test(s) |
|----|---------|
| 1. Valid params restore state | 1 |
| 2. replaceState, not pushState | 11–18 |
| 3. Shared URL produces identical state | 1, 2 |
| 4. Defaults never written | 11, 18 |
| 5. Invalid numeric ignored | 4, 5 |
| 6. Unrecognised key ignored | 3 |
| 7. `units` parsed first | 2 |
| 8. `foil` absent when null | 8, 13 |
| 9. Unit switch updates URL | 17 |
| 10. No-params behaviour unchanged | 10 |

---

## Scope evaluation

| Dimension | Count |
|-----------|-------|
| Modules modified | 2 (`App.vue`, `useAppState.js`) |
| Modules created | 1 (`App.test.js`) |
| New endpoints | 0 |
| New entities | 0 |
| Integrations | 2 (`onMounted` browser API, `watch` + `history.replaceState`) |
| Acceptance criteria | 10 |
| **Total** | **15** |

Split into **2 implementation chunks**:

**Chunk 1** — foundations: update `useAppState.js` defaults; update `useAppState.test.js`
to reflect new defaults; add `URL_DEFAULTS` constant, `onMounted` parse block, and
`watch` serialise block to `App.vue`.

**Chunk 2** — tests: write `App.test.js` with all 18 test cases; verify full test suite
(currently 366 tests) still passes.
