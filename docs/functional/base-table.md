# Functional Specification: BaseTable Vue Component

## 1. Overview

Three existing components in the application render HTML tables with inconsistent header styling, row separation, and stripe logic. This feature introduces a shared `BaseTable` component to standardise table header rendering and structure, while leaving row content and row-level interaction entirely in the hands of each parent component.

## 2. Problem Statement

### 2.1 Current Inconsistencies

| Component | Header bg | Header font | Row separation | Stripes |
|-----------|-----------|-------------|---------------|---------|
| `AirfoilCoordTable.vue` | `bg-white` (sticky) | `font-mono` implied | None explicit | JS logic: `i % 2 === 0 ? 'bg-white' : 'bg-slate-50'` |
| `AirfoilPanel.vue` | `bg-slate-50` (sticky) | `tracking-wider font-semibold` | `border-b border-slate-100` | `bg-blue-50` for selected only |
| `WingDiagramChart.vue` | none | `font-medium` | None | None |

These inconsistencies make the UI feel unpolished and create maintenance burden when styling rules change.

### 2.2 Impact

- Visual inconsistency across panels within the same application
- Stripe logic duplicated in JavaScript when it could be handled by CSS
- Future table additions will likely introduce further drift

## 3. Goals

1. Provide a single `BaseTable` component that all three existing table-rendering components can adopt.
2. Standardise `<th>` styling across all tables.
3. Eliminate manual JavaScript-based stripe alternation in `AirfoilCoordTable.vue`.
4. Allow each parent component to retain full control over row content and row-level interaction (hover states, click handlers, selection highlighting).
5. Make adding future tables straightforward and consistent by default.

## 4. Out of Scope

- Sorting, filtering, or pagination within `BaseTable`
- Row click/hover handling within `BaseTable`
- Forcing stripes on all tables — parents opt in by adding Tailwind classes to their `<tr>` elements
- Changing the interactive behaviour of `AirfoilPanel.vue` rows (selected state, hover state remain as-is)
- Changes to any component not listed in Section 6

## 5. BaseTable Component

### 5.1 Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `Array` | Yes | Ordered list of column descriptors. Each entry is `{ key: String, label: String, align: 'left' \| 'right' \| 'center' }`. `align` defaults to `'left'` if omitted. |

### 5.2 Slots

| Slot | Description |
|------|-------------|
| default | Receives the full `<tbody>` content. The parent renders all `<tr>` and `<td>` elements. `BaseTable` renders only the `<table>`, `<thead>`, and `<tbody>` wrapper. |

### 5.3 Header Behaviour

- `BaseTable` renders one `<th>` per column descriptor in `columns`.
- Each `<th>` uses the standardised style: `font-semibold`, `tracking-wide`, `border-b border-slate-200`, consistent horizontal and vertical padding.
- Text alignment inside each `<th>` follows the column's `align` value.
- The `<thead>` uses a `sticky top-0` style with a white or near-white background so it remains visible when the table body scrolls.

### 5.4 Table Structure

`BaseTable` is responsible for rendering:

```
<table>
  <thead>
    <tr>
      <th> ... </th>  <!-- one per column -->
    </tr>
  </thead>
  <tbody>
    <slot />          <!-- parent provides all <tr> elements -->
  </tbody>
</table>
```

The parent is responsible for rendering `<tr>` and `<td>` elements inside the slot.

## 6. Adoption by Existing Components

### 6.1 AirfoilCoordTable.vue

**Change:** Replace the inline `<table>/<thead>/<tbody>` structure with `<BaseTable :columns="columns">`. Remove the JS stripe expression `i % 2 === 0 ? 'bg-white' : 'bg-slate-50'` from each `<tr>`. Add Tailwind classes `odd:bg-white even:bg-slate-50` directly to the `<tr>` elements.

**Unchanged:** Monospace font class on `<td>` elements, scroll container, sticky header behaviour (now handled by `BaseTable`).

### 6.2 AirfoilPanel.vue

**Change:** Replace the inline `<table>/<thead>/<tbody>` structure with `<BaseTable :columns="columns">`.

**Unchanged:** All row-level interaction — `@click` handlers, `:class` bindings for hover (`hover:bg-slate-100`) and selected (`bg-blue-50`) states, `border-b` separator classes on `<tr>` or `<td>` elements. The parent retains full control over these.

### 6.3 WingDiagramChart.vue

**Change:** Replace the inline table structure with `<BaseTable :columns="columns">`. Add `odd:bg-white even:bg-slate-50` stripe classes to `<tr>` elements.

**Unchanged:** Absolute positioning of the table overlay, data binding for cell values, overall layout.

## 7. Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | `BaseTable` renders a `<table>` containing a `<thead>` with one `<th>` per entry in `columns`. |
| AC-2 | Each `<th>` has `font-semibold`, `tracking-wide`, and `border-b border-slate-200` classes applied. |
| AC-3 | The `align` value in each column descriptor controls text alignment on the corresponding `<th>`. |
| AC-4 | The default slot is rendered inside a `<tbody>` element. |
| AC-5 | `AirfoilCoordTable.vue` uses `BaseTable` and no longer contains a JS ternary for row background colour. |
| AC-6 | `AirfoilCoordTable.vue` `<tr>` elements carry `odd:bg-white even:bg-slate-50` Tailwind classes. |
| AC-7 | `AirfoilPanel.vue` uses `BaseTable` and its row interaction (hover, selected) is visually unchanged. |
| AC-8 | `WingDiagramChart.vue` uses `BaseTable` and its `<tr>` elements carry `odd:bg-white even:bg-slate-50`. |
| AC-9 | All three adopting components pass their existing test suites without modification to test assertions. |
| AC-10 | `BaseTable` has its own unit tests covering: correct number of `<th>` elements, correct labels, alignment classes, and slot content rendering. |
| AC-11 | No sorting, filtering, pagination, or row-interaction logic is present inside `BaseTable`. |

## 8. User Experience Notes

- Visually, the tables should look more consistent after this change: the same header weight, spacing, and bottom border across all three panels.
- The AirfoilCoordTable stripes will remain visually identical to the current result — only the implementation changes from JS to CSS.
- AirfoilPanel selected-row highlight (`bg-blue-50`) takes visual precedence over any stripe class; this is standard CSS specificity behaviour and requires no special handling.
- WingDiagramChart gains alternating row stripes for the first time, making its data rows easier to scan.
