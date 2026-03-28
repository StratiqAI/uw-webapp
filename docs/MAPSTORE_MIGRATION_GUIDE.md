# MapStore Migration Guide

## Overview

This document describes the migration from `mapObjectStore.ts` to `mapStore.ts` (MapStore). All components have been migrated to use the unified `MapStore` system.

## Migration Status: ✅ COMPLETE

All components have been successfully migrated from `mapObjectStore` to `MapStore`.

**✅ `mapObjectStore.ts` has been removed from the codebase.**

## What Changed

### 1. Store Consolidation

**Before:** Two separate store systems
- `mapObjectStore.ts` - Producer-consumer pattern with type registry
- `mapStore.ts` - Topic-based with multi-tab sync and schema validation

**After:** Single unified store system
- `mapStore.ts` - Topic-based with all features:
  - ✅ Multi-tab synchronization (BroadcastChannel)
  - ✅ Schema validation (via SchemaRegistry)
  - ✅ Topic-based organization
  - ✅ Producer/consumer tracking
  - ✅ Introspection methods

### 2. API Changes

#### Producer/Publisher Pattern

**Before (mapObjectStore):**
```typescript
import { mapStore } from '$lib/stores/mapObjectStore';

const producer = mapStore.registerProducer<T>('channel-id', 'producer-id');
producer.publish(data);
producer.clear();
```

**After (MapStore):**
```typescript
import { mapStore } from '$lib/stores/MapStore';

const publisher = mapStore.getPublisher('topic-name', 'producer-id');
publisher.publish(data);
publisher.clear(); // Now available!
publisher.dispose(); // Cleanup
```

#### Consumer/Stream Pattern

**Before (mapObjectStore):**
```typescript
const consumer = mapStore.registerConsumer<T>('channel-id', 'consumer-id');
consumer.subscribe(data => { ... });
const value = consumer.get();
```

**After (MapStore):**
```typescript
const stream = mapStore.getStream('topic-name', 'consumer-id');
stream.subscribe(data => { ... });
const value = stream.get();
```

### 3. New Features in MapStore

#### Schema Enforcement
```typescript
// Enforce schema on a topic (validates all publishes)
mapStore.enforceTopicSchema('my-topic', 'my:schema-v1');
```

#### Multi-Tab Sync
```typescript
// Automatically syncs across browser tabs via BroadcastChannel
// No code changes needed - works automatically!
```

#### Enhanced Introspection
```typescript
// Get all topics with a specific schema
const topics = mapStore.getTopicsBySchema('widget:paragraph-v1');

// Get metadata for a topic
const metadata = mapStore.getMetadata('my-topic');

// Dump all state to console
mapStore.dump();
```

## Migrated Components

### ✅ DashboardControls.svelte
- Changed: `registerProducer` → `getPublisher`
- Impact: Minimal - just API change

### ✅ dashboard.svelte.ts
- Changed: Import path only
- Impact: None - uses `clearData()` which was added to MapStore

### ✅ storage.ts
- Changed: `registerProducer` → `getPublisher` for restoration
- Changed: `getAllData()` now uses MapStore's implementation
- Impact: Low - data persistence works the same

### ✅ widgetBridge.ts
- Changed: `registerProducer` → `getPublisher` with adapter
- Changed: `registerConsumer` → `getStream` with adapter
- Impact: Medium - adapter layer maintains compatibility

### ✅ MapStoreDebugWidget.svelte
- Changed: Import path only
- Impact: None - introspection methods work the same

## Compatibility Methods Added

To ease migration, MapStore now includes compatibility methods that match `mapObjectStore` API:

```typescript
// These methods work the same as mapObjectStore
mapStore.clearData();           // Clear all topic data
mapStore.getAllData();          // Get all topics with data
mapStore.getAllProducers();     // Get all producers
mapStore.getAllConsumers();     // Get all consumers
mapStore.getTypeInfo();         // Get topic information
```

**Note:** These methods use `typeId` in their return types for compatibility, but internally they work with topics.

## Key Differences

| Feature | mapObjectStore | MapStore |
|---------|----------------|----------|
| **Naming** | Type-based (`typeId`) | Topic-based (`topic`) |
| **Schema Validation** | ❌ No | ✅ Yes (via SchemaRegistry) |
| **Multi-tab Sync** | ❌ No | ✅ Yes (BroadcastChannel) |
| **Producer API** | `registerProducer()` | `getPublisher()` |
| **Consumer API** | `registerConsumer()` | `getStream()` |
| **Clear Method** | ✅ Yes | ✅ Yes (added) |
| **Introspection** | ✅ Rich API | ✅ Enhanced API |

## Best Practices

### 1. Use Topics, Not Types

**Good:**
```typescript
const topic = 'widget:paragraph:abc123';
mapStore.getPublisher(topic, 'producer-id');
```

**Avoid:**
```typescript
// Don't think of it as a "type" - think of it as a "topic"
const typeId = 'paragraph-content'; // Less descriptive
```

### 2. Enforce Schemas

Always enforce schemas when setting up topics:

```typescript
const topic = 'widget:paragraph:abc123';
const schemaId = 'widget:paragraph-v1';

// Enforce schema (validates all publishes)
mapStore.enforceTopicSchema(topic, schemaId);

// Now all publishes are validated
const publisher = mapStore.getPublisher(topic, 'producer-id');
publisher.publish(data); // ✅ Validated automatically
```

### 3. Use Descriptive Topic Names

**Good:**
```typescript
'widget:paragraph:abc123'
'project:current:xyz789'
'user:preferences:main'
```

**Avoid:**
```typescript
'data'
'content'
'info'
```

### 4. Clean Up Publishers

Always dispose publishers when done:

```typescript
const publisher = mapStore.getPublisher(topic, 'producer-id');

// ... use publisher ...

// Clean up
publisher.dispose();
```

## Migration Checklist for New Code

When creating new components that need pub/sub:

- [ ] Import from `$lib/stores/MapStore` (not `mapObjectStore`)
- [ ] Use `getPublisher()` instead of `registerProducer()`
- [ ] Use `getStream()` instead of `registerConsumer()`
- [ ] Use descriptive topic names
- [ ] Enforce schemas when appropriate
- [ ] Dispose publishers when done
- [ ] Test multi-tab sync if needed

## Troubleshooting

### Issue: "Topic not found"
**Solution:** Topics are created automatically when you use `getPublisher()` or `getStream()`. No need to pre-register.

### Issue: "Validation failed"
**Solution:** Make sure you've enforced a schema on the topic and the data matches the schema:
```typescript
mapStore.enforceTopicSchema(topic, schemaId);
```

### Issue: "Data not syncing across tabs"
**Solution:** 
- Check that BroadcastChannel is supported in your browser
- Ensure data is JSON-serializable (no functions/classes)
- Check browser console for errors

### Issue: "getAllData() returns empty"
**Solution:** `getAllData()` only returns topics that have been used (have publishers/consumers) and have data. Make sure you've published data to the topic.

## Next Steps

1. ✅ All components migrated
2. ✅ Compatibility methods added
3. ✅ Documentation updated
4. ⏳ **Remove `mapObjectStore.ts`** (after verification period)

## Removing mapObjectStore.ts

**Status:** Ready for removal

**Before removing:**
1. Verify all tests pass
2. Check for any remaining imports (should be none)
3. Search codebase for `mapObjectStore` references
4. Update any remaining documentation

**After removal:**
- Update imports in any test files
- Remove from package exports if applicable
- Update this guide to mark as complete

## Summary

✅ **Migration Complete!** All components now use the unified `MapStore` system with:
- Schema validation
- Multi-tab synchronization
- Enhanced introspection
- Better architecture

The codebase is now more consistent and maintainable with a single store system for pub/sub patterns.
