# Widget Migration: Proof of Concept - TitleWidget

## ✅ Completed: Phase 1 & 2 (TitleWidget Migration)

### What Was Done

#### 1. **Schema Registration System** ✅
- Created `src/lib/dashboard/setup/widgetSchemaRegistration.ts`
- Function: `registerWidgetSchemas()` - Registers all 8 widget Zod schemas
- Helper functions:
  - `getWidgetSchemaId(widgetType)` - Returns schema ID (e.g., `'widget:title-v1'`)
  - `getWidgetTopic(widgetType, widgetId)` - Returns topic name (e.g., `'widget:title:abc123'`)
- Registered at app startup in `src/routes/+layout.svelte`

#### 2. **TitleWidget Migration** ✅
- **File**: `src/lib/dashboard/components/widgets/TitleWidget.svelte`
- **Changes**:
  - ✅ Replaced `mapObjectStore` import with `MapStore`
  - ✅ Replaced `registerConsumer()` with `useTopic()` hook
  - ✅ Added `widgetId` prop for topic naming
  - ✅ Added schema enforcement on mount
  - ✅ Uses topic naming convention: `widget:title:${widgetId}`

#### 3. **WidgetWrapper Update** ✅
- Updated to pass `widget.id` to `TitleWidget` component
- Ensures each widget instance has unique topic

#### 4. **Helper Utilities** ✅
- Created `src/lib/dashboard/utils/widgetPublisher.ts`
- Functions:
  - `createWidgetPublisher()` - Creates publisher with schema enforcement
  - `getWidgetStream()` - Gets stream for widget topic

---

## How It Works

### Topic Naming Convention
```
widget:${type}:${widgetId}
```

**Example:**
- Widget type: `'title'`
- Widget ID: `'abc123'`
- Topic: `'widget:title:abc123'`

### Schema Registration
```typescript
// At app startup
registerWidgetSchemas();
// Registers: widget:title-v1, widget:paragraph-v1, etc.
```

### Widget Component (TitleWidget)
```typescript
// Gets topic name
const topic = getWidgetTopic('title', widgetId); // 'widget:title:abc123'

// Subscribes to data
const dataStream = useTopic(topic);
let widgetData = $derived(dataStream.current || data);

// Enforces schema on mount
onMount(() => {
  mapStore.enforceTopicSchema(topic, 'widget:title-v1');
});
```

### Publishing Data (New Pattern)
```typescript
import { createWidgetPublisher } from '$lib/dashboard/utils/widgetPublisher';

// Create publisher
const publisher = createWidgetPublisher('title', 'widget-123', 'my-service');

// Publish data (automatically validated)
publisher.publish({
  title: 'Hello World',
  subtitle: 'This is a subtitle',
  alignment: 'center'
});

// Cleanup when done
publisher.dispose();
```

---

## Testing the Migration

### Test 1: Verify Schema Registration
1. Open browser console
2. Check for: `✅ [Widget Schema Registration] All widget schemas registered successfully`
3. Verify: `widget:title-v1` is registered

### Test 2: Verify TitleWidget Works
1. Create a TitleWidget in the dashboard
2. Check console for: `🏷️ TitleWidget:${widgetId} - Schema enforced`
3. Widget should display initial data from props

### Test 3: Verify Data Publishing
```typescript
// In browser console or test file
import { createWidgetPublisher } from '$lib/dashboard/utils/widgetPublisher';

const publisher = createWidgetPublisher('title', 'your-widget-id', 'test-publisher');
publisher.publish({
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  alignment: 'center'
});
// Widget should update automatically
```

### Test 4: Verify Schema Validation
```typescript
// Try publishing invalid data
publisher.publish({
  title: 123, // Invalid: should be string
  invalidField: 'test' // Invalid: not in schema
});
// Should be rejected, check console for validation errors
```

---

## Next Steps: Migrate Remaining Widgets

### Pattern to Follow (for each widget):

1. **Update Widget Component**:
   ```typescript
   // OLD
   import { mapStore } from '$lib/stores/mapObjectStore';
   let consumer = mapStore.registerConsumer<T>(channelId, consumerId);
   consumer.subscribe((data) => { ... });

   // NEW
   import { mapStore } from '$lib/stores/MapStore';
   import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
   import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
   
   const topic = $derived(getWidgetTopic(widgetType, widgetId));
   const dataStream = useTopic(topic);
   let widgetData = $derived(dataStream.current || data);
   
   onMount(() => {
     mapStore.enforceTopicSchema(topic, getWidgetSchemaId(widgetType));
   });
   ```

2. **Update WidgetWrapper**:
   ```svelte
   <WidgetComponent data={widget.data} widgetId={widget.id} {darkMode} />
   ```

3. **Update Publishers** (if any):
   ```typescript
   // OLD
   const producer = mapStore.registerProducer<T>(channelId, producerId);
   producer.publish(data);

   // NEW
   const publisher = createWidgetPublisher(widgetType, widgetId, producerId);
   publisher.publish(data);
   ```

---

## Remaining Widgets to Migrate

- [ ] ParagraphWidget
- [ ] TableWidget
- [ ] ImageWidget
- [ ] LineChartWidget
- [ ] BarChartWidget
- [ ] MetricWidget
- [ ] MapWidget

---

## Benefits Achieved

✅ **Schema Validation**: All data is validated against Zod schemas  
✅ **Type Safety**: TypeScript types maintained  
✅ **Multi-tab Sync**: Automatic via BroadcastChannel  
✅ **Standard Format**: JSON Schema for storage/AI compatibility  
✅ **Unified System**: All widgets use same validation system  

---

## Notes

- **Backward Compatibility**: Old `mapObjectStore` code still exists for other widgets
- **Incremental Migration**: Can migrate widgets one at a time
- **No Breaking Changes**: TitleWidget migration doesn't affect other widgets
- **Topic Names**: Each widget instance has unique topic based on widget ID

