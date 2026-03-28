# Dashboard & Widget Store Usage Analysis

## Summary

The dashboard and widgets use **multiple store systems**, creating inconsistency and complexity. Here's what each component uses:

## Store Usage by Component

### Dashboard Core Components

#### 1. `Dashboard.svelte`
**Stores Used:**
- ✅ `dashboard` (from `$lib/dashboard/stores/dashboard.svelte`) - **Svelte 5 runes store**
  - Manages widget layout, grid configuration, drag/resize state

**Status:** ✅ Good - Uses rune-based store

---

#### 2. `DashboardControls.svelte`
**Stores Used:**
- ✅ `dashboard` (from `$lib/dashboard/stores/dashboard.svelte`) - **Svelte 5 runes store**
- ⚠️ `mapStore` (from `$lib/stores/mapObjectStore`) - **Custom producer-consumer store**
  - Used for: Publishing paragraph widget content updates (line 84-135)

**Status:** ⚠️ Mixed - Uses both runes and mapObjectStore

**Issue:** Should use `mapStore` (from `MapStore.ts`) instead of `mapObjectStore.ts`

---

#### 3. `WidgetWrapper.svelte`
**Stores Used:**
- ✅ `dashboard` (from `$lib/dashboard/stores/dashboard.svelte`) - **Svelte 5 runes store**
- ✅ `mapStore` (from `$lib/stores/MapStore`) - **Topic-based store**
  - Used for: Getting available topics by schema, subscribing to preview data

**Status:** ✅ Good - Uses correct mapStore

---

### Widget Components

All widgets follow a similar pattern for data subscription:

#### Data Subscription Pattern
Most widgets use the `useTopic` hook which wraps `mapStore`:

```typescript
import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
import { mapStore } from '$lib/stores/MapStore';
```

#### Widget Store Usage:

1. **TitleWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `useReactiveTopic` hook

2. **ParagraphWidget.svelte**
   - ⚠️ `project` (from `appStateStore.ts`) - **Svelte store**
   - Uses project data for context

3. **TableWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `useTopic` hook

4. **ImageWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `useTopic` hook

5. **LineChartWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `useTopic` hook

6. **BarChartWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `useTopic` hook

7. **MetricWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `useTopic` hook

8. **MapWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `useTopic` hook

9. **SchemaWidget.svelte**
   - ✅ `mapStore` (from `MapStore.ts`)
   - ✅ `schemaRegistry` (from `SchemaRegistry.ts`)
   - ✅ `useTopic` hook

---

### Dashboard Store (`dashboard.svelte.ts`)

**Stores Used:**
- ⚠️ `mapStore` (from `$lib/stores/mapObjectStore`) - **Custom producer-consumer store**
  - Used for: Clearing data on reset (lines 396, 407)

**Status:** ⚠️ Should use `MapStore.ts` instead of `mapObjectStore.ts`

---

## Store Usage Summary

### ✅ Correctly Using:
1. **`dashboard.svelte.ts`** - Svelte 5 runes store (excellent pattern)
2. **Most widgets** - Using `mapStore` from `MapStore.ts` via `useTopic` hook
3. **SchemaRegistry** - Utility store (appropriate)

### ⚠️ Issues Found:

1. **Inconsistent mapStore imports:**
   - `DashboardControls.svelte` uses `mapObjectStore` ❌
   - `dashboard.svelte.ts` uses `mapObjectStore` ❌
   - Most widgets use `MapStore` ✅

2. **Mixed store patterns:**
   - `ParagraphWidget.svelte` uses `appStateStore` (Svelte store) instead of runes

3. **Storage utility:**
   - `storage.ts` uses `mapObjectStore` ❌

---

## Recommended Fixes

### Priority 1: Fix mapStore Inconsistency

**Files to update:**

1. **`DashboardControls.svelte`** (line 3)
   ```typescript
   // Change from:
   import { mapStore } from '$lib/stores/mapObjectStore';
   // To:
   import { mapStore } from '$lib/stores/MapStore';
   ```

2. **`dashboard.svelte.ts`** (line 10)
   ```typescript
   // Change from:
   import { mapStore } from '$lib/stores/mapObjectStore';
   // To:
   import { mapStore } from '$lib/stores/MapStore';
   ```

3. **`storage.ts`** (line 2)
   ```typescript
   // Change from:
   import { mapStore } from '$lib/stores/mapObjectStore';
   // To:
   import { mapStore } from '$lib/stores/MapStore';
   ```

**Note:** The API is slightly different:
- `mapObjectStore`: `registerProducer<T>(typeId, registrationId)`
- `MapStore`: `getPublisher(topic, producerId)`

### Priority 2: Migrate ParagraphWidget

**`ParagraphWidget.svelte`** currently uses:
```typescript
import { project as projectStore } from '$lib/stores/appStateStore';
```

**Recommendation:** 
- If project data is needed, consider using `mapStore` with a topic like `'project:current'`
- Or migrate `appStateStore` to runes-based `projectStore`

### Priority 3: Standardize on MapStore

After fixing imports, consider:
1. Deprecating `mapObjectStore.ts`
2. Migrating all remaining usages to `MapStore.ts`
3. Updating documentation

---

## Current Store Architecture

```
Dashboard System
├── dashboard.svelte.ts (✅ Runes)
│   └── Uses: mapObjectStore ❌ (should be MapStore)
│
├── DashboardControls.svelte
│   ├── Uses: dashboard ✅
│   └── Uses: mapObjectStore ❌ (should be MapStore)
│
├── WidgetWrapper.svelte
│   ├── Uses: dashboard ✅
│   └── Uses: MapStore ✅
│
└── Widgets/
    ├── TitleWidget → MapStore ✅
    ├── ParagraphWidget → appStateStore ⚠️
    ├── TableWidget → MapStore ✅
    ├── ImageWidget → MapStore ✅
    ├── LineChartWidget → MapStore ✅
    ├── BarChartWidget → MapStore ✅
    ├── MetricWidget → MapStore ✅
    ├── MapWidget → MapStore ✅
    └── SchemaWidget → MapStore + SchemaRegistry ✅
```

---

## Migration Checklist

- [ ] Update `DashboardControls.svelte` to use `MapStore` instead of `mapObjectStore`
- [ ] Update `dashboard.svelte.ts` to use `MapStore` instead of `mapObjectStore`
- [ ] Update `storage.ts` to use `MapStore` instead of `mapObjectStore`
- [ ] Test all dashboard functionality after migration
- [ ] Update `ParagraphWidget` to use consistent store pattern
- [ ] Document the migration in code comments
- [ ] Consider deprecating `mapObjectStore.ts` after migration

---

## Key Takeaways

1. **Dashboard store** (`dashboard.svelte.ts`) is well-designed using Svelte 5 runes ✅
2. **Most widgets** correctly use `MapStore` via `useTopic` hook ✅
3. **Inconsistency** exists with some components using `mapObjectStore` instead of `MapStore` ❌
4. **One widget** (`ParagraphWidget`) uses legacy `appStateStore` ⚠️

**Overall Assessment:** The dashboard system is mostly well-architected, but needs consistency fixes for the mapStore usage.
