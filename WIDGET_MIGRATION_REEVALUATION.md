# Widget Schema Migration: Reevaluation with JSON Schema + Zod Implementation

## Executive Summary

**Status**: Migration is now **significantly simpler** than originally planned.

**Key Insight**: Since `SchemaRegistry` now has `registerZodSchema()`, we can register widget Zod schemas **directly** without any conversion. The registry handles Zod → JSON Schema conversion automatically for storage, while using Zod for runtime validation.

**Migration Complexity**: Reduced from **10 phases** to **4 phases** (60% reduction).

---

## What Changed Since Original Plan

### ✅ **Major Simplification: Direct Zod Registration**

**Before (Original Plan):**
```
Zod Schema → Convert to FieldDefinition → Convert to JSON Schema → Compile to Zod
```

**Now (Actual Implementation):**
```
Zod Schema → registerZodSchema() → Auto-converts to JSON Schema (for storage) → Uses Zod (for validation)
```

The `SchemaRegistry.registerZodSchema()` method:
- Accepts Zod schemas directly
- Converts to JSON Schema automatically using `zodToJsonSchema()`
- Stores both formats (JSON Schema for storage/AI, Zod for validation)
- No manual conversion needed!

---

## Revised Migration Plan

### **Phase 1: Schema Registration** (Simplified)

**Goal**: Register all 8 widget Zod schemas with SchemaRegistry.

#### 1.1 Create Widget Schema Registration Function

**Location**: `src/lib/dashboard/types/widgetSchemas.ts` or new file `src/lib/dashboard/setup/widgetSchemaRegistration.ts`

**What to do:**
- Create `registerWidgetSchemas()` function
- Use `schemaRegistry.registerZodSchema()` for each widget type
- Map widget types to schema IDs: `widget:${type}-v1`
- Call during app initialization (before widgets load)

**Example:**
```typescript
import { schemaRegistry } from '$lib/stores/SchemaRegistry';
import { WidgetDataSchemas } from './widgetSchemas';

export function registerWidgetSchemas() {
  // Register all widget schemas
  schemaRegistry.registerZodSchema(
    'widget:paragraph-v1',
    WidgetDataSchemas.paragraph,
    { name: 'Paragraph Widget', description: 'Content for paragraph widgets' }
  );
  
  schemaRegistry.registerZodSchema(
    'widget:table-v1',
    WidgetDataSchemas.table,
    { name: 'Table Widget', description: 'Data for table widgets' }
  );
  
  // ... repeat for all 8 widget types
}
```

**Complexity**: ⭐ Low (30 minutes)
- No conversion needed
- Just 8 function calls
- Already have Zod schemas

#### 1.2 Call Registration at App Startup

**Location**: `src/routes/+layout.svelte` or `src/app.ts` (if exists)

**What to do:**
- Import `registerWidgetSchemas()`
- Call in `onMount` or module initialization
- Ensure it runs before any widgets try to use schemas

**Complexity**: ⭐ Low (5 minutes)

---

### **Phase 2: MapStore Migration** (Core Change)

**Goal**: Replace `mapObjectStore` with `MapStore` throughout widget system.

#### 2.1 Update Store Imports

**Files to update** (24 files found):
- `src/lib/dashboard/utils/storage.ts`
- `src/lib/dashboard/stores/dashboard.svelte.ts`
- `src/lib/dashboard/components/widgets/*.svelte` (8 widget components)
- `src/lib/dashboard/services/widget-bridge.ts`
- `src/lib/dashboard/services/widget-ai-service.ts`
- `src/lib/dashboard/types/widgetBridge.ts`
- Other example/test files

**What to change:**
```typescript
// OLD
import { mapStore } from '$lib/stores/mapObjectStore';

// NEW
import { mapStore } from '$lib/stores/MapStore';
```

**Complexity**: ⭐⭐ Medium (1-2 hours)
- Find/replace across 24 files
- Verify imports are correct

#### 2.2 Update Publisher Pattern

**Current Pattern:**
```typescript
const producer = mapStore.registerProducer<T>(channelId, producerId);
producer.publish(data);
```

**New Pattern:**
```typescript
const publisher = mapStore.getPublisher(topic, producerId);
publisher.publish(data);
publisher.dispose(); // When done
```

**Files affected:**
- `src/lib/dashboard/utils/storage.ts` (line 234)
- `src/lib/dashboard/services/widget-bridge.ts` (multiple locations)
- `src/lib/dashboard/types/widgetBridge.ts` (line 126)
- `src/lib/dashboard/components/DashboardControls.svelte` (line 84)

**Complexity**: ⭐⭐⭐ Medium-High (2-3 hours)
- Need to update function signatures
- Update all call sites
- Add proper cleanup with `dispose()`

#### 2.3 Update Consumer Pattern

**Current Pattern:**
```typescript
const consumer = mapStore.registerConsumer<T>(channelId, consumerId);
consumer.subscribe((data) => { ... });
```

**New Pattern:**
```typescript
// Option A: Direct subscription
const stream = mapStore.getStream(topic);
stream.subscribe((data) => { ... });

// Option B: Use Svelte hook (recommended)
import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
const data = useTopic(topic);
// Access via data.current
```

**Files affected:**
- All 8 widget components (`*.svelte`)
- `src/lib/dashboard/services/widget-bridge.ts`

**Complexity**: ⭐⭐⭐ Medium-High (3-4 hours)
- Update all widget components
- Choose between direct subscription or `useTopic()` hook
- Ensure proper cleanup

#### 2.4 Topic Naming Convention

**Current**: Uses `channelId` (e.g., `'paragraph-content'`)

**New**: Use topic naming convention: `widget:${type}:${widgetId}`

**Example:**
- Old: `'paragraph-content'`
- New: `'widget:paragraph:abc123'` (where `abc123` is widget ID)

**What to do:**
- Update `WidgetChannelConfig` to use `topic` instead of `channelId`
- Update all topic references
- Ensure consistency across codebase

**Complexity**: ⭐⭐ Medium (1-2 hours)
- Update type definitions
- Update all references
- Ensure widget IDs are available

#### 2.5 Schema Enforcement

**What to do:**
- Create helper: `enforceWidgetSchema(widgetType: WidgetType, topic: string)`
- Map widget types to schema IDs: `widget:${type}-v1`
- Call `mapStore.enforceTopicSchema(topic, schemaId)` when widget initializes

**Example:**
```typescript
function enforceWidgetSchema(widgetType: WidgetType, topic: string) {
  const schemaId = `widget:${widgetType}-v1`;
  mapStore.enforceTopicSchema(topic, schemaId);
}
```

**Where to call:**
- In widget component initialization
- Or in `createWidgetPublisher()` function

**Complexity**: ⭐ Low (30 minutes)
- Simple mapping function
- One call per widget initialization

---

### **Phase 3: Widget Component Updates** (Simplified)

**Goal**: Update widget components to use new MapStore API.

#### 3.1 Update Widget Components

**Files to update** (8 widgets):
- `ParagraphWidget.svelte`
- `TableWidget.svelte`
- `TitleWidget.svelte`
- `ImageWidget.svelte`
- `LineChartWidget.svelte`
- `BarChartWidget.svelte`
- `MetricWidget.svelte`
- `MapWidget.svelte`

**Changes needed per widget:**
1. Update import: `mapObjectStore` → `MapStore`
2. Replace `registerConsumer()` with `useTopic()` hook
3. Update data access: `consumer.get()` → `data.current`
4. Add schema enforcement on mount

**Example transformation:**
```typescript
// OLD
import { mapStore } from '$lib/stores/mapObjectStore';
let consumer = mapStore.registerConsumer<ParagraphWidget['data']>(channelId, 'paragraph-widget');
let widgetData = $derived(consumer.get());

// NEW
import { mapStore } from '$lib/stores/MapStore';
import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
import { onMount } from 'svelte';

let widgetData = useTopic(channelId);

onMount(() => {
  mapStore.enforceTopicSchema(channelId, 'widget:paragraph-v1');
});
```

**Complexity**: ⭐⭐ Medium (2-3 hours)
- 8 files to update
- Similar pattern for each
- Straightforward transformation

#### 3.2 Update Widget Bridge Service

**File**: `src/lib/dashboard/services/widget-bridge.ts`

**What to update:**
- `createWidgetPublisher()` function
- `createWidgetConsumer()` function
- Update all internal `mapStore` calls
- Add schema enforcement to publishers

**Complexity**: ⭐⭐⭐ Medium-High (2-3 hours)
- Core service file
- Multiple functions to update
- Need to maintain backward compatibility during transition

---

### **Phase 4: Testing & Cleanup** (Standard)

**Goal**: Verify migration works, remove old code.

#### 4.1 Testing

**What to test:**
- [ ] Each widget type loads correctly
- [ ] Data publishing works (AI jobs → widgets)
- [ ] Data subscription works (widgets receive updates)
- [ ] Schema validation rejects invalid data
- [ ] Multi-tab sync works (if applicable)
- [ ] Widget persistence works (if applicable)

**Complexity**: ⭐⭐⭐ Medium (2-3 hours)
- Manual testing of 8 widget types
- Test various data scenarios
- Verify error handling

#### 4.2 Remove Old Code

**What to remove:**
- `src/lib/stores/mapObjectStore.ts` (if no longer used)
- Old `WidgetChannelConfig` properties (if changed)
- Deprecated functions

**Complexity**: ⭐ Low (30 minutes)
- Verify nothing else uses old code
- Remove unused files

---

## Comparison: Original vs. Revised Plan

| Aspect | Original Plan | Revised Plan | Improvement |
|--------|--------------|--------------|-------------|
| **Phases** | 10 phases | 4 phases | 60% reduction |
| **Schema Conversion** | Manual Zod → FieldDefinition → JSON Schema | Direct Zod registration | 100% automated |
| **Estimated Time** | 20-30 hours | 10-15 hours | 50% faster |
| **Complexity** | High (conversion logic) | Medium (API changes) | Significantly simpler |
| **Risk** | Medium (conversion bugs) | Low (straightforward API changes) | Lower risk |

---

## Key Benefits of New Approach

### ✅ **No Conversion Needed**
- Widget schemas are already Zod schemas
- `registerZodSchema()` handles everything automatically
- No manual conversion logic required

### ✅ **Type Safety Maintained**
- TypeScript types from Zod schemas still work
- `z.infer<typeof Schema>` still valid
- No type changes needed

### ✅ **Backward Compatible**
- Can migrate widgets incrementally
- Old and new systems can coexist
- No breaking changes to widget APIs

### ✅ **Unified Validation**
- All schemas use same validation system
- Consistent error messages
- Same validation logic everywhere

---

## Migration Strategy

### **Recommended Approach: Incremental Migration**

1. **Phase 1**: Register schemas (no breaking changes)
2. **Phase 2**: Migrate one widget type as proof of concept
   - Start with simplest widget (e.g., `TitleWidget`)
   - Verify end-to-end flow works
   - Use as template for others
3. **Phase 3**: Migrate remaining widgets one by one
4. **Phase 4**: Remove old code once all migrated

### **Risk Mitigation**

- **Feature Flag**: Add flag to enable/disable new system
- **Parallel Systems**: Keep both systems running during migration
- **Gradual Rollout**: Migrate widgets incrementally
- **Testing**: Test each widget type thoroughly before moving to next

---

## Estimated Timeline

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|----------------|--------------|
| **Phase 1** | Schema registration | 30 minutes | None |
| **Phase 2** | MapStore migration | 6-8 hours | Phase 1 |
| **Phase 3** | Widget updates | 4-6 hours | Phase 2 |
| **Phase 4** | Testing & cleanup | 2-3 hours | Phase 3 |
| **Total** | | **12-18 hours** | |

---

## Critical Considerations

### ⚠️ **Topic Naming**
- Need to decide on topic naming convention
- Current: `channelId` (e.g., `'paragraph-content'`)
- Proposed: `widget:${type}:${widgetId}`
- **Decision needed**: Keep current names or migrate to new convention?

### ⚠️ **Widget IDs**
- New topic convention requires widget IDs
- Need to ensure widget IDs are available when creating topics
- May need to update widget creation logic

### ⚠️ **Backward Compatibility**
- `WidgetChannelConfig` interface may need updates
- Factory functions (`WidgetChannels.paragraph()`) may need changes
- Need to maintain API compatibility during transition

### ⚠️ **Storage/Persistence**
- If widgets persist data, need to verify persistence still works
- May need to update storage keys if topic names change

---

## Next Steps

1. **Decision**: Choose topic naming convention
2. **Start Phase 1**: Register widget schemas
3. **Proof of Concept**: Migrate one widget type (e.g., `TitleWidget`)
4. **Iterate**: Migrate remaining widgets based on learnings
5. **Cleanup**: Remove old code once all migrated

---

## Summary

The migration is now **much simpler** than originally planned:

- ✅ **No schema conversion needed** - Direct Zod registration
- ✅ **Straightforward API changes** - Replace `registerProducer/Consumer` with `getPublisher/Stream`
- ✅ **Incremental migration possible** - Can migrate one widget at a time
- ✅ **Lower risk** - No complex conversion logic

**Estimated effort**: 12-18 hours (down from 20-30 hours originally estimated)

**Recommended approach**: Start with Phase 1 (schema registration), then migrate one widget as proof of concept before proceeding with the rest.

