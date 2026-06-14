# Functional Specification: URL Query String Synchronisation — Index Page

## Overview

The index page (aircraft design tool) currently holds all user-configurable state in memory only. Refreshing the browser or sharing a link always returns the user to the default state. This feature adds bidirectional synchronisation between the index page's application state and the browser's URL query string, matching the behaviour already implemented on the airfoil analysis page.

## Goals

- Any meaningful state the user configures on the index page is reflected in the URL.
- Sharing or bookmarking a URL returns the recipient to exactly the same view and parameter values.
- Default values are omitted from the URL to keep links short and human-readable.
- The URL is updated in-place (no new history entries) as the user changes parameters.
- On page load, any query parameters present in the URL are used to restore state before the UI renders.

## Non-goals

- No server-side routing or server-side rendering.
- No support for deep-linking into a specific airfoil profile tab (that is handled by the airfoil page).
- No backwards-compatibility obligation for URLs generated before this feature ships (no prior URL format exists).

---

## Parameters and URL keys

Each state field maps to a short, lowercase URL key. The table below defines the key, the type of value stored, the default value (which is omitted from the URL), and example serialised values.

| State field      | URL key   | Type                          | Default         | Example URL value      |
|------------------|-----------|-------------------------------|-----------------|------------------------|
| `units`          | `units`   | `'SI'` \| `'Imperial'`        | `'SI'`          | `units=Imperial`       |
| `siteAltitude`   | `alt`     | number (integer, metres or feet) | `0`          | `alt=1500`             |
| `wingLoading`    | `wl`      | number (decimal, 2 dp)        | `50`            | `wl=65.40`             |
| `cruisingSpeed`  | `spd`     | number (decimal, 2 dp)        | `25`            | `spd=32.50`            |
| `planeType`      | `type`    | string enum                   | `'trainer'`     | `type=sport`           |
| `airfoilProfile` | `foil`    | string \| absent (null)       | `null`          | `foil=NACA+2412`       |
| `wingSpan`       | `span`    | number (decimal, 2 dp)        | `1.5`           | `span=2.00`            |
| `rootChord`      | `rc`      | number (decimal, 2 dp)        | `0.3`           | `rc=0.35`              |
| `tipChord`       | `tc`      | number (decimal, 2 dp)        | `0.2`           | `tc=0.18`              |
| `sweepAngle`     | `sweep`   | number (decimal, 2 dp)        | `0`             | `sweep=5.00`           |
| `activePanel`    | `panel`   | `'general'` \| `'wing-definition'` | `'general'` | `panel=wing-definition` |

### Numeric precision

Numbers are serialised to at most two decimal places. Trailing zeros are preserved to signal precision (e.g. `span=2.00` communicates a deliberate value, not approximation). Integer values with no fractional part may omit the decimal point (e.g. `alt=1500`).

### Unit-aware storage

All numeric fields are serialised in the **current display unit** — the same unit in which the user entered them. The `units` key, if present, is therefore always written before numeric fields in the URL, and on load it is always parsed first, so that the application restores the correct unit system before interpreting numeric values.

### Null / absent fields

`airfoilProfile` is absent from the URL when no profile has been selected (the null default). When a profile is selected its name is URL-encoded (spaces become `+`, consistent with `application/x-www-form-urlencoded`).

---

## Behaviour

### On page load

1. The application reads the current URL query string.
2. If `units` is present and valid (`'SI'` or `'Imperial'`), the unit system is set first.
3. Each remaining recognised key is validated:
   - Numeric keys: parsed as a floating-point number. If the result is `NaN` or outside a plausible range (see "Validation" below), the field is ignored and its default is used.
   - Enum keys (`planeType`, `activePanel`): accepted only if the value is a member of the known set; otherwise the default is used.
   - `airfoilProfile`: accepted only if the value (after URL-decoding) matches a known airfoil name; otherwise treated as null.
4. Any key in the query string that is not in the recognised set is silently ignored.
5. Unrecognised or missing keys fall back to their default values.
6. State is applied in one atomic update so that unit-dependent fields are converted correctly (consistent with the existing `setState` contract in `useAppState`).

### On state change

Whenever any watched state field changes after initial load, the URL is updated via `history.replaceState` — no new history entry is pushed. The full set of non-default parameters is written; fields currently equal to their defaults are omitted.

The update is synchronous with the state change (no debounce required, as `replaceState` is cheap and Vue watchers coalesce within a tick).

### URL ordering

Keys are written in the order listed in the parameters table. This keeps URLs deterministic and makes them easier to read and compare.

---

## Validation

The following plausible-range checks are applied on load. Values outside the range are silently replaced with the field's default.

| Field            | Min     | Max      | Notes                              |
|------------------|---------|----------|------------------------------------|
| `siteAltitude`   | 0       | 9000     | metres (SI) or feet (Imperial); 9000 m ≈ Everest summit |
| `wingLoading`    | 1       | 500      | display units                      |
| `cruisingSpeed`  | 1       | 500      | display units                      |
| `wingSpan`       | 0.01    | 100      | display units                      |
| `rootChord`      | 0.01    | 20       | display units                      |
| `tipChord`       | 0       | 20       | display units; 0 is a valid delta wing |
| `sweepAngle`     | -89     | 89       | degrees; ±90 would be degenerate   |

---

## Example URLs

Default state — empty query string:
```
https://example.com/
```

Imperial, high-altitude, custom wing:
```
https://example.com/?units=Imperial&alt=5000&wl=48.00&spd=45.00&type=sport&foil=NACA+2412&span=6.56&rc=1.15&tc=0.82&sweep=3.00&panel=wing-definition
```

SI, custom loading and airfoil only (all other fields are default):
```
https://example.com/?wl=62.50&foil=Clark+Y
```

---

## Acceptance criteria

1. Navigating to a URL with valid query parameters restores the index page to exactly the state those parameters describe.
2. Changing any parameter on the page updates the URL within the same browser tick, using `replaceState` (browser back button is not affected).
3. A URL produced by this feature, when shared and opened in a fresh tab, produces an identical UI state.
4. Default-valued fields are never written to the URL.
5. An invalid numeric value in the URL (e.g. `wl=banana`, `sweep=999`) is silently ignored; the page loads with that field's default and the URL is corrected on the next state write.
6. An unrecognised query key (e.g. `foo=bar`) is silently ignored and does not cause any error.
7. The `units` parameter, when present, is applied before all other parameters so that numeric values are interpreted in the correct unit system.
8. `airfoilProfile=null` is never written to the URL; absence of `foil` is the canonical representation of no selected profile.
9. Switching between SI and Imperial via the UI updates the URL's `units` key (or removes it when reverting to SI) and re-serialises all numeric values in the new display unit.
10. The feature is additive — no existing behaviour of the index page changes for users who arrive without query parameters.
