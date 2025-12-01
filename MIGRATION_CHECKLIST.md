# Migration Checklist: Unifying Widget Schemas with Dynamic Schema Registry

## Overview
This checklist tracks the migration of dashboard widget schemas from the legacy `mapObjectStore` + Zod schemas system to the new `MapStore` + `SchemaRegistry` dynamic schema system.

**Goal**: Migrate all 8 widget types (paragraph, table, title, image, lineChart, barChart, metric, map) to use the unified schema registry and MapStore.

---

## Phase 1: Schema Conversion & Registration

### 1.1 Schema Conversion
- [ ] Create `zodSchemaToDynamicSchema()` utility function
  - [ ] Handle primitive types (string, number, boolean)
  - [ ] Handle nullable/optional fields
  - [ ] Handle enum types with options
  - [ ] Handle nested objects (recursive conversion)
  - [ ] Handle arrays (with itemType detection)
  - [ ] Handle unions (z.union([z.string(), z.number()]))
  - [ ] Preserve constraints (min, max, required)
  - [ ] Preserve descriptions/metadata

### 1.2 Convert Widget Schemas
- [ ] Convert `ParagraphWidgetDataSchema` → `widget:paragraph-v1`
- [ ] Convert `TableWidgetDataSchema` → `widget:table-v1`
- [ ] Convert `TitleWidgetDataSchema` → `widget:title-v1`
- [ ] Convert `ImageWidgetDataSchema` → `widget:image-v1`
- [ ] Convert `LineChartWidgetDataSchema` → `widget:lineChart-v1`
  - [ ] Handle nested `datasets` array with objects
  - [ ] Handle nested `options` object
- [ ] Convert `BarChartWidgetDataSchema` → `widget:barChart-v1`
  - [ ] Handle nested `datasets` array with objects
- [ ] Convert `MetricWidgetDataSchema` → `widget:metric-v1`
  - [ ] Handle union type (z.union([z.string(), z.number()]))
- [ ] Convert `MapWidgetDataSchema` → `widget:map-v1`
  - [ ] Handle enum constraints (mapType)

### 1.3 Schema Registration
- [ ] Create `registerWidgetSchemas()` initialization function
- [ ] Register all 8 widget schemas at app startup
- [ ] Ensure schemas registered before widgets load
- [ ] Add error handling for registration failures
- [ ] Add logging for successful registrations

---

## Phase 2: MapStore Migration

### 2.1 Update Imports
- [ ] Find all `mapObjectStore` imports
- [ ] Replace with `MapStore` imports
- [ ] Update import paths in:
  - [ ] `src/lib/dashboard/utils/storage.ts`
  - [ ] `src/lib/dashboard/stores/dashboard.svelte.ts`
  - [ ] `src/lib/dashboard/components/widgets/*.svelte`
  - [ ] Any other files using `mapObjectStore`

### 2.2 Update Publisher Pattern
- [ ] Replace `mapStore.registerProducer()` calls
- [ ] Use `mapStore.getPublisher(topic, producerId)` instead
- [ ] Update publish calls: `producer.publish(data)` → `publisher.publish(data)`
- [ ] Add proper cleanup with `publisher.dispose()`

### 2.3 Update Consumer Pattern
- [ ] Replace `mapStore.registerConsumer()` calls
- [ ] Use `mapStore.getStream(topic)` or `useTopic()` hook instead
- [ ] Update subscription patterns
- [ ] Ensure proper cleanup with `onDestroy`

### 2.4 Topic Naming Convention
- [ ] Define topic naming convention (e.g., `widget:${type}:${widgetId}`)
- [ ] Update all topic references to use new convention
- [ ] Ensure topic names are consistent across codebase

### 2.5 Schema Enforcement
- [ ] Create helper function: `enforceWidgetSchema(widgetType, topic)`
- [ ] Map widget types to schema IDs
- [ ] Call `mapStore.enforceTopicSchema()` for each widget on init
- [ ] Ensure validation happens automatically on publish

---

## Phase 3: Widget Component Updates

### 3.1 Update Widget Components
- [ ] Update `ParagraphWidget.svelte`
  - [ ] Replace `mapObjectStore` with `useTopic()` hook
  - [ ] Replace publisher with `usePublisher()` hook
  - [ ] Add schema enforcement
- [ ] Update `TableWidget.svelte`
- [ ] Update `TitleWidget.svelte`
- [ ] Update `ImageWidget.svelte`
- [ ] Update `LineChartWidget.svelte`
- [ ] Update `BarChartWidget.svelte`
- [ ] Update `MetricWidget.svelte`
- [ ] Update `MapWidget.svelte`

### 3.2 Update Widget Hooks
- [ ] Review `useTopic()` usage in widgets
- [ ] Review `usePublisher()` usage in widgets
- [ ] Ensure proper cleanup in all widgets
- [ ] Test reactivity in all widgets

---

## Phase 4: Channel Configuration Migration

### 4.1 Update WidgetChannelConfig Interface
- [ ] Change `schema: z.ZodSchema` → `schemaId: string`
- [ ] Keep `channelId` and `widgetType` for compatibility
- [ ] Update TypeScript types

### 4.2 Update Factory Functions
- [ ] Update `WidgetChannels.paragraph()` to return schema ID
- [ ] Update `WidgetChannels.table()` to return schema ID
- [ ] Update `WidgetChannels.title()` to return schema ID
- [ ] Update `WidgetChannels.image()` to return schema ID
- [ ] Update `WidgetChannels.lineChart()` to return schema ID
- [ ] Update `WidgetChannels.barChart()` to return schema ID
- [ ] Update `WidgetChannels.metric()` to return schema ID
- [ ] Update `WidgetChannels.map()` to return schema ID

### 4.3 Update Widget Data Bridge
- [ ] Update `WidgetDataBridgeConfig` interface
- [ ] Modify `widget-bridge.ts` to use schema IDs
- [ ] Ensure AI job results validated against schemas
- [ ] Update transformer functions if needed

---

## Phase 5: Type Safety & Compatibility

### 5.1 Maintain TypeScript Types
- [ ] Keep existing type exports (`ParagraphWidgetData`, etc.)
- [ ] Ensure types still inferred from Zod schemas
- [ ] Document that types are compile-time, schemas are runtime

### 5.2 Dual-Mode Support (Transition)
- [ ] Add feature flag for migration
- [ ] Allow widgets to work with both systems temporarily
- [ ] Create migration helper functions
- [ ] Document migration process

---

## Phase 6: OpenAI Integration

### 6.1 Update OpenAI Text Format
- [ ] Modify `getWidgetTextFormat()` to work with schema IDs
- [ ] Fetch schema from `SchemaRegistry`
- [ ] Convert DynamicSchemaDefinition → Zod → OpenAI format
- [ ] Or maintain Zod schemas separately for OpenAI
- [ ] Test OpenAI structured output generation

### 6.2 Schema Versioning
- [ ] Define versioning strategy (v1, v2, etc.)
- [ ] Handle schema evolution
- [ ] Support multiple versions if needed
- [ ] Document versioning approach

---

## Phase 7: Component Registry Integration

### 7.1 Register Widget Components
- [ ] Register `ParagraphWidget` with `widget:paragraph-v1`
- [ ] Register `TableWidget` with `widget:table-v1`
- [ ] Register `TitleWidget` with `widget:title-v1`
- [ ] Register `ImageWidget` with `widget:image-v1`
- [ ] Register `LineChartWidget` with `widget:lineChart-v1`
- [ ] Register `BarChartWidget` with `widget:barChart-v1`
- [ ] Register `MetricWidget` with `widget:metric-v1`
- [ ] Register `MapWidget` with `widget:map-v1`

### 7.2 Universal Rendering (Optional)
- [ ] Test `UniversalWidget` with widget schemas
- [ ] Decide if widgets use custom components or auto-rendering
- [ ] Document rendering strategy

---

## Phase 8: Validation Functions Update

### 8.1 Update Validation Helpers
- [ ] Update `validateWidgetData()` to use schema IDs
- [ ] Update `parseWidgetData()` to use schema IDs
- [ ] Update error messages to reference schema IDs
- [ ] Maintain backward compatibility if needed

---

## Phase 9: Testing & Validation

### 9.1 Unit Tests
- [ ] Test schema conversion utility
- [ ] Test schema registration
- [ ] Test validation with each widget type
- [ ] Test error handling

### 9.2 Integration Tests
- [ ] Test data flow: AI Job → MapStore → Widget
- [ ] Test each widget type individually
- [ ] Test multi-tab sync with widgets
- [ ] Test schema enforcement rejects invalid data
- [ ] Test widget updates in real-time

### 9.3 Migration Testing
- [ ] Test one widget type end-to-end (proof of concept)
- [ ] Verify no regressions in existing functionality
- [ ] Test backward compatibility during transition
- [ ] Performance testing

---

## Phase 10: Cleanup & Documentation

### 10.1 Remove Old System
- [ ] Remove `mapObjectStore` implementation
- [ ] Remove old channel configuration presets
- [ ] Remove deprecated functions
- [ ] Clean up unused imports

### 10.2 Documentation
- [ ] Document new schema-based approach
- [ ] Update widget development guide
- [ ] Add migration guide for existing widgets
- [ ] Document schema versioning strategy
- [ ] Update API documentation

---

## Key Challenges & Solutions

### Challenge 1: Type Safety
**Solution**: Keep Zod schemas for TypeScript types, use DynamicSchemaDefinition for runtime validation

### Challenge 2: Nested Structures
**Solution**: Recursive conversion utility handles nested objects/arrays

### Challenge 3: Backward Compatibility
**Solution**: Dual-mode support with feature flags during migration

### Challenge 4: Schema Evolution
**Solution**: Versioned schema IDs (`widget:paragraph-v1`, `widget:paragraph-v2`)

### Challenge 5: Performance
**Solution**: Compile schemas once at registration, cache validators

### Challenge 6: OpenAI Integration
**Solution**: Convert DynamicSchemaDefinition back to Zod when needed, or maintain both

---

## Migration Strategy

### Recommended Approach: Hybrid Model
- ✅ Keep Zod schemas in code for TypeScript types and OpenAI integration
- ✅ Convert to DynamicSchemaDefinition at runtime for MapStore validation
- ✅ Register both formats (Zod for types, DynamicSchemaDefinition for validation)
- ✅ Provides compile-time safety + runtime flexibility

### Migration Order
1. **Proof of Concept**: Start with one widget type (e.g., `paragraph`)
2. **Create Utilities**: Build conversion utilities
3. **Incremental Migration**: Migrate widgets one by one
4. **Thorough Testing**: Test each migration before proceeding
5. **Full Rollout**: Complete migration for all widgets
6. **Cleanup**: Remove old system once all widgets migrated

---

## Notes

- **Widget Types to Migrate**: 8 total
  - paragraph, table, title, image, lineChart, barChart, metric, map

- **Schema ID Convention**: `widget:${type}-v1`
  - Example: `widget:paragraph-v1`, `widget:table-v1`

- **Topic Naming Convention**: `widget:${type}:${widgetId}`
  - Example: `widget:paragraph:abc123`, `widget:table:def456`

- **Priority**: Start with simpler widgets (paragraph, title) before complex ones (charts)

---

## Status Tracking

**Last Updated**: [Date]
**Current Phase**: Phase 1 - Schema Conversion & Registration
**Progress**: 0% Complete

**Completed Items**: 0 / [Total Items]
**In Progress**: 0
**Blocked**: 0

