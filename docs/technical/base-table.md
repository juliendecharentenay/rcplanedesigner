# Technical Specification: BaseTable Vue Component

## 1. Architecture Plan

### 1.1 Design Approach

`BaseTable` is a thin structural wrapper component. It owns the `<table>`, `<thead>`, `<tr>`, and `<th>` elements and renders them consistently. The `<tbody>` content is delegated entirely to the parent via Vue's default slot. No logic beyond header rendering lives inside `BaseTable`.

This follows the same "Base component" pattern already established by `BaseInput.vue`, `BaseSelect.vue`, and `BaseAnchor.vue` in `www/src/components/`.

**No provide/inject, no state, no computed properties, no watchers.** The component is a pure presentational wrapper.

### 1.2 Technology Choices

- **Vue 3 `<script setup>`** — consistent with the rest of the codebase
- **TailwindCSS** — all styling via utility classes; no scoped CSS required for `BaseTable` itself (no `@apply` needed, so no `@reference` directive needed)
- **No external imports** — `BaseTable` has zero dependencies beyond Vue

### 1.3 Error Handling

`BaseTable` has no fallible logic (no computed properties, no method bodies that access external data). It does not need to inject `SET_ERROR_KEY`. The adopting components already inject `SET_ERROR_KEY` and will continue to do so.

---

## 2. File Locations

| File | Action |
|------|--------|
| `www/src/components/BaseTable.vue` | **Create** — new shared component |
| `www/src/components/BaseTable.test.js` | **Create** — unit tests |
| `www/src/pages/airfoil/components/AirfoilCoordTable.vue` | **Modify** — adopt BaseTable |
| `www/src/pages/airfoil/components/AirfoilCoordTable.test.js` | **Modify** — update/extend tests |
| `www/src/pages/index/components/AirfoilPanel.vue` | **Modify** — adopt BaseTable |
| `www/src/pages/index/components/AirfoilPanel.test.js` | **Modify** — update/extend tests |
| `www/src/pages/index/components/WingDiagramChart.vue` | **Modify** — adopt BaseTable |
| `www/src/pages/index/components/WingDiagramChart.test.js` | **Modify** — update/extend tests |

---

## 3. BaseTable Component Specification

### 3.1 Props

```js
const props = defineProps({
  columns: {
    type: Array,
    required: true,
    // Each element: { key: String, label: String, align?: 'left' | 'right' | 'center' }
  },
})
```

`align` defaults to `'left'` when absent or undefined.

### 3.2 Slots

| Slot | Content |
|------|---------|
| `default` | All `<tr>` elements for the table body. `BaseTable` wraps them in `<tbody>`. |

### 3.3 Template Structure

```html
<table class="w-full border-collapse">
  <thead>
    <tr>
      <th
        v-for="col in columns"
        :key="col.key"
        :class="[
          'sticky top-0 z-10',
          'px-3 py-2',
          'text-slate-500 text-xs font-semibold uppercase tracking-wide',
          'border-b border-slate-200',
          'bg-white',
          alignClass(col.align),
        ]"
      >
        {{ col.label }}
      </th>
    </tr>
  </thead>
  <tbody>
    <slot />
  </tbody>
</table>
```

### 3.4 Alignment Helper

```js
function alignClass(align) {
  if (align === 'right')  return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}
```

### 3.5 Standardised `<th>` Class Set

| Class | Purpose |
|-------|---------|
| `sticky top-0 z-10` | Keeps header visible when table body scrolls |
| `px-3 py-2` | Consistent horizontal and vertical padding |
| `text-slate-500` | Muted header colour |
| `text-xs` | Small text to match existing tables |
| `font-semibold` | Weight standardisation (replaces `font-medium` in WingDiagramChart) |
| `uppercase` | Consistent with existing tables |
| `tracking-wide` | Consistent spacing (replaces `tracking-wider` in AirfoilPanel; visually near-identical) |
| `border-b border-slate-200` | Bottom separator, standardised colour |
| `bg-white` | Solid background for sticky header over scrolling rows |

**Rationale for `tracking-wide` vs `tracking-wider`:** `AirfoilPanel` currently uses `tracking-wider`. Standardising to `tracking-wide` is a minimal visual change that unifies the value across all three tables and avoids `BaseTable` needing to accept a tracking prop for such a minor difference.

**Rationale for `bg-white`:** `AirfoilCoordTable` uses `bg-white` (sticky on the `<thead>` element), `AirfoilPanel` uses `bg-slate-50` (on each `<th>`). Standardising to `bg-white` on `<th>` is consistent with the majority and removes the need for a prop.

---

## 4. Adoption Details

### 4.1 AirfoilCoordTable.vue

**Columns definition:**

```js
const columns = [
  { key: 'x', label: 'X', align: 'left' },
  { key: 'y', label: 'Y', align: 'left' },
]
```

**Template change:**

```html
<!-- Before -->
<table class="w-full text-xs font-mono border-collapse">
  <thead class="sticky top-0 bg-white z-10">
    <tr>
      <th class="text-left px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-200">X</th>
      <th class="text-left px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wide border-b border-slate-200">Y</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="(c, i) in coords" :key="i" :class="i % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
      ...
    </tr>
  </tbody>
</table>

<!-- After -->
<BaseTable :columns="columns" class="w-full text-xs font-mono">
  <tr
    v-for="(c, i) in coords"
    :key="i"
    class="odd:bg-white even:bg-slate-50"
  >
    <td class="px-3 py-1 text-slate-600">{{ c.x.toFixed(2) }}</td>
    <td class="px-3 py-1 text-slate-600">{{ c.y.toFixed(2) }}</td>
  </tr>
</BaseTable>
```

Note: `font-mono` remains on the `<BaseTable>` wrapper or on individual `<td>` elements — it is not a `BaseTable` responsibility. Adding `font-mono` as a class on `<BaseTable>` will inherit into the slot content.

Note: The outer `<div class="overflow-y-auto h-full">` scroll container is unchanged.

### 4.2 AirfoilPanel.vue

**Columns definition:**

```js
const columns = [
  { key: 'profile',     label: 'Profile',       align: 'left'  },
  { key: 'zeroLiftAoA', label: 'Zero Lift AoA', align: 'right' },
  { key: 'stallAoa',    label: 'Stall AoA',     align: 'right' },
  { key: 'stallCl',     label: 'Stall Cl',      align: 'right' },
]
```

**Template change:**

```html
<!-- Replaces the inner <table>...</table> -->
<BaseTable :columns="columns">
  <tr
    v-for="airfoil in airfoils"
    :key="airfoil.profileName"
    :class="[
      'border-b border-slate-100 transition-colors cursor-pointer',
      airfoil.profileName === selectedProfile
        ? 'bg-sky-50 text-sky-900'
        : 'text-slate-700 hover:bg-slate-50',
    ]"
    @click="setState({ airfoilProfile: airfoil.profileName })"
  >
    <td class="px-3 py-1.5 font-medium">{{ airfoil.profileName }}</td>
    <td class="px-3 py-1.5 text-right tabular-nums">
      {{ airfoil.zeroLiftAoA ? `${airfoil.zeroLiftAoA.toFixed(2)}°` : '-' }}
    </td>
    <td class="px-3 py-1.5 text-right tabular-nums">{{ airfoil.stallAoa ? `${airfoil.stallAoa}°` : '-' }}</td>
    <td class="px-3 py-1.5 text-right tabular-nums">{{ airfoil.stallCl ? airfoil.stallCl.toFixed(3) : '-' }}</td>
  </tr>
</BaseTable>
```

The surrounding `<div class="overflow-y-auto flex-1">` scroll container is unchanged. Row interaction classes (`cursor-pointer`, `hover:bg-slate-50`, `bg-sky-50`) are all on `<tr>` inside the slot — BaseTable does not touch them.

### 4.3 WingDiagramChart.vue

**Columns definition:**

```js
const tableColumns = [
  { key: 'label',      label: '',           align: 'left'   },
  { key: 'infiniteAr', label: 'Infinite AR', align: 'center' },
  { key: 'wing',       label: 'Wing',        align: 'center' },
]
```

**Template change:**

```html
<!-- Replaces the inner <table>...</table> in the overlay div -->
<BaseTable :columns="tableColumns">
  <tr class="odd:bg-white even:bg-slate-50">
    <td class="px-2 py-1 text-slate-600">Cruise AoA</td>
    <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.cruiseAoaInfinite) }}</td>
    <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.cruiseAoaWing) }}</td>
  </tr>
  <tr class="odd:bg-white even:bg-slate-50">
    <td class="px-2 py-1 text-slate-600">Landing AoA</td>
    <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.landingAoaInfinite) }}</td>
    <td class="px-2 py-1 text-center font-mono text-slate-800">{{ fmtAoa(performanceData.landingAoaWing) }}</td>
  </tr>
</BaseTable>
```

The outer `<div class="absolute top-0 right-0 ...">` overlay container is unchanged.

---

## 5. Test Specification

### 5.1 BaseTable.test.js

| Test ID | Description |
|---------|-------------|
| BT-1 | Renders a `<table>` element |
| BT-2 | Renders exactly N `<th>` elements when given N columns |
| BT-3 | Each `<th>` contains the correct label text |
| BT-4 | `<th>` with `align: 'right'` has `text-right` class |
| BT-5 | `<th>` with `align: 'center'` has `text-center` class |
| BT-6 | `<th>` with `align: 'left'` (or omitted) has `text-left` class |
| BT-7 | All `<th>` elements have `font-semibold`, `tracking-wide`, `border-b`, `border-slate-200` classes |
| BT-8 | All `<th>` elements have `sticky` and `top-0` classes |
| BT-9 | Default slot content is rendered inside `<tbody>` |
| BT-10 | Slot content with a `<tr>` containing `<td>` elements is accessible via wrapper queries |

### 5.2 AirfoilCoordTable.test.js — additions

| Test ID | Description |
|---------|-------------|
| AC-1 | No `<tr>` element in the rendered output has an inline `:class` expression that computes `'bg-white'` or `'bg-slate-50'` via JS ternary (existing row stripe test is replaced) |
| AC-2 | `<tr>` elements have `odd:bg-white` and `even:bg-slate-50` classes |
| AC-3 | `BaseTable` is used (rendered output contains a `<table>` with `<thead>` and `<th>` elements) |

### 5.3 AirfoilPanel.test.js — additions

| Test ID | Description |
|---------|-------------|
| AP-1 | `BaseTable` is used — `<thead>` and `<th>` elements are present |
| AP-2 | Row click/selected state interaction is unchanged (existing tests must still pass) |

### 5.4 WingDiagramChart.test.js — additions

| Test ID | Description |
|---------|-------------|
| WD-1 | `BaseTable` is used — `<thead>` and `<th>` elements are present in the performance table |
| WD-2 | `<tr>` elements in the performance table have `odd:bg-white even:bg-slate-50` classes |

---

## 6. Import Pattern

In each adopting component, add at the top of `<script setup>`:

```js
import BaseTable from '@/components/BaseTable.vue'
```

---

## 7. Acceptance Criteria Traceability

| Functional AC | Technical implementation |
|---------------|-------------------------|
| AC-1 | Section 3 — `<table>`, `<thead>`, one `<th>` per column |
| AC-2 | Section 3.5 — `font-semibold`, `tracking-wide`, `border-b border-slate-200` on all `<th>` |
| AC-3 | Section 3.4 — `alignClass()` helper drives `text-left/right/center` |
| AC-4 | Section 3.3 — `<slot />` inside `<tbody>` |
| AC-5 | Section 4.1 — `AirfoilCoordTable` uses `BaseTable` |
| AC-6 | Section 4.1 — `odd:bg-white even:bg-slate-50` on `<tr>` |
| AC-7 | Section 4.2 — `AirfoilPanel` uses `BaseTable`; row interaction classes unchanged |
| AC-8 | Section 4.3 — `WingDiagramChart` uses `BaseTable` with stripe classes |
| AC-9 | All existing tests pass; no test assertions modified except stripe-class checks |
| AC-10 | Section 5.1 — 10 BaseTable tests |
| AC-11 | Section 3 — no sort/filter/pagination/row-interaction logic in `BaseTable` |

---

## 8. Scope Evaluation Pre-Assessment

For the Project Manager's scoring:
- **Modules/components:** 4 (1 new + 3 adopting)
- **API endpoints/events:** 0
- **Distinct data entities:** 1 (column descriptor shape)
- **Integration points:** 3 (one per adopting component)
- **Acceptance criteria:** 11

Suggested chunking: the work naturally fits a single chunk — `BaseTable` creation and all three adoptions are tightly coupled (you cannot test adoption without the component existing). Total scope is modest.
