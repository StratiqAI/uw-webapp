# Auto-Save Widget Data Feature

## Overview

Widget data now **automatically saves to localStorage** whenever it changes. You no longer need to manually click "Save" to preserve AI-generated content or dynamic widget updates.

---

## How It Works

### Automatic Save on Data Change

```
Widget Consumer receives new data
         ↓
ValidatedPublisher.publish(data)
         ↓
Data published to mapObjectStore
         ↓
Auto-save triggered (debounced)
         ↓
Wait 1 second for more changes
         ↓
Save widget data to localStorage
         ↓
✅ Data preserved!
```

**Key Point:** Every time a producer publishes data, it triggers an auto-save (debounced to 1 second).

---

## Benefits

### Before (Manual Save Required)

```
1. AI job completes
2. Widget displays content
3. User forgets to click "Save"
4. User refreshes page
5. ❌ AI content is lost!
```

### After (Automatic Save)

```
1. AI job completes
2. Widget displays content
3. Auto-save triggers automatically
4. User refreshes page
5. ✅ AI content is preserved!
```

**No manual save needed!**

---

## Debouncing

To avoid excessive localStorage writes, auto-save is **debounced by 1 second**:

```
Data change 1 → Start 1s timer
         ↓
Data change 2 (0.5s later) → Restart 1s timer
         ↓
Data change 3 (0.3s later) → Restart 1s timer
         ↓
No more changes for 1 second
         ↓
Save to localStorage (single write)
```

**Result:** Multiple rapid updates = single localStorage write

---

## Console Logs

### When Auto-Save Triggers

```
[ValidatedPublisher:paragraph-content:...] ✅ Validation passed, publishing to mapStore
[ValidatedPublisher:paragraph-content:...] 💾 Triggering auto-save to localStorage...
💾 [DashboardStorage] Auto-saving widget data...
   ✅ Auto-saved 3 channels
```

### What Gets Auto-Saved

Only **widget data from mapObjectStore**, not the full dashboard:

```
Auto-Save:
✅ paragraph-content data
✅ table-data data
✅ metric-data data
✅ Any channel with data

NOT Auto-Saved:
❌ Widget positions (requires manual save)
❌ Grid configuration (requires manual save)
```

**Why?** Widget data changes frequently (AI updates, user input), but widget layout changes rarely.

---

## Configuration

### Enable/Disable Auto-Save

```typescript
import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';

// Disable auto-save
dashboard.setAutoSaveWidgetData(false);

// Enable auto-save
dashboard.setAutoSaveWidgetData(true);
```

### Check Auto-Save Status

```typescript
console.log('Auto-save enabled:', dashboard.autoSaveWidgetData);
```

---

## Use Cases

### Use Case 1: AI Content Preservation

```
User submits AI job
         ↓
AI generates summary
         ↓
Bridge publishes to mapObjectStore
         ↓
Auto-save triggered
         ↓
User refreshes browser
         ↓
AI content still there! ✅
```

**No manual save required!**

### Use Case 2: Real-time Data Updates

```
WebSocket receives market data every second
         ↓
Producer publishes updates
         ↓
Auto-save debounces (waits for quiet period)
         ↓
After 1 second of no updates, saves
         ↓
Latest data preserved ✅
```

### Use Case 3: Form Input

```
User types into form
         ↓
Producer publishes on blur/change
         ↓
Auto-save triggered
         ↓
User accidentally closes tab
         ↓
Reopens → form data still there! ✅
```

---

## Storage Strategy

### What Saves When

| Action | Widget Data | Dashboard Config |
|--------|-------------|------------------|
| Data published to mapStore | ✅ Auto-saved | ❌ Not saved |
| Widget moved | ❌ Not saved | ⏳ Manual/auto-save |
| Widget resized | ❌ Not saved | ⏳ Manual/auto-save |
| Click "Save" button | ✅ Saved | ✅ Saved |
| Auto-save timer | ❌ Not saved | ✅ Saved |

**Two separate auto-save mechanisms:**
1. **Widget data auto-save** - Triggered by data changes (new!)
2. **Dashboard auto-save** - Triggered by layout changes (existing)

---

## Performance

### Write Frequency

With debouncing:
- **Without debounce:** 100 updates/min = 100 writes/min 🔥
- **With 1s debounce:** 100 updates/min = ~10 writes/min ✅

### Storage Impact

Typical sizes:
- **Paragraph widget:** ~1-5 KB
- **Table widget:** ~5-20 KB
- **Metric widget:** ~0.5 KB
- **All channels:** ~10-50 KB total

LocalStorage limit: 5-10 MB (plenty of room)

### Optimization

```typescript
// If you have very frequent updates, increase debounce
// In storage.ts:
const AUTO_SAVE_DELAY = 3000; // 3 seconds

// Or disable auto-save for specific scenarios
dashboard.setAutoSaveWidgetData(false);
// ... do many updates
dashboard.setAutoSaveWidgetData(true);
```

---

## Testing Auto-Save

### Test 1: Basic Auto-Save

**Steps:**
1. Open `/dashboard`
2. Submit AI job
3. Wait for content to display
4. **Don't click "Save"**
5. Watch console for auto-save logs
6. Refresh page (F5)
7. ✅ Verify content persists

**Expected Console:**
```
[ValidatedPublisher:...] ✅ Validation passed, publishing to mapStore
[ValidatedPublisher:...] 💾 Triggering auto-save to localStorage...
💾 [DashboardStorage] Auto-saving widget data...
   ✅ Auto-saved 1 channels
```

### Test 2: Debouncing

**Steps:**
1. Trigger multiple rapid updates
2. Watch console - should see:
   - Multiple "Triggering auto-save" messages
   - Single "Auto-saving widget data" message (debounced)

**Expected:**
```
[ValidatedPublisher:...] 💾 Triggering auto-save to localStorage...
[ValidatedPublisher:...] 💾 Triggering auto-save to localStorage...
[ValidatedPublisher:...] 💾 Triggering auto-save to localStorage...
... (wait 1 second)
💾 [DashboardStorage] Auto-saving widget data...
   ✅ Auto-saved 3 channels
```

### Test 3: Disable Auto-Save

```typescript
// In browser console
dashboard.setAutoSaveWidgetData(false);

// Submit AI job
// No auto-save should occur

// Re-enable
dashboard.setAutoSaveWidgetData(true);
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Producer publishes data                                     │
│   createWidgetPublisher().publish(data)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ValidatedPublisher validates                                │
│   ├─ Zod validation                                         │
│   ├─ Publish to mapStore                                    │
│   └─ Trigger auto-save ← NEW!                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ DashboardStorage.autoSaveWidgetData()                      │
│   ├─ Debounce (wait 1s)                                     │
│   ├─ Capture mapStore.getAllData()                          │
│   └─ Save to localStorage                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ localStorage updated                                        │
│   Key: 'dashboard_widget_data'                             │
│   Value: { "paragraph-content": {...}, ... }               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓ (on page refresh)
┌─────────────────────────────────────────────────────────────┐
│ Data restored automatically                                 │
│   Widgets display persisted content                         │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### DashboardStorage Methods

```typescript
// Auto-save widget data (debounced)
DashboardStorage.autoSaveWidgetData(): void

// Enable/disable auto-save
DashboardStorage.setAutoSaveWidgetData(enabled: boolean): void
```

### Dashboard Store Methods

```typescript
// Control auto-save from dashboard store
dashboard.setAutoSaveWidgetData(enabled: boolean): void

// Check if auto-save is enabled
dashboard.autoSaveWidgetData  // true or false
```

---

## Best Practices

### ✅ DO

1. **Keep auto-save enabled (default)**
   ```typescript
   // Auto-save is enabled by default
   // No action needed!
   ```

2. **Rely on auto-save for data**
   ```typescript
   // After publishing, data is automatically saved
   producer.publish(data);
   // No need to call dashboard.save()
   ```

3. **Still manually save for layout changes**
   ```typescript
   // When user moves/resizes widgets
   dashboard.save();  // Saves layout + data
   ```

4. **Monitor console in development**
   ```typescript
   // Watch for auto-save logs
   // Verify data is being saved
   ```

### ❌ DON'T

1. **Don't disable without reason**
   ```typescript
   // ❌ Unless you have a specific reason
   dashboard.setAutoSaveWidgetData(false);
   ```

2. **Don't manually save data repeatedly**
   ```typescript
   // ❌ Unnecessary
   producer.publish(data);
   DashboardStorage.saveWidgetDataOnly();  // Auto happens!
   ```

3. **Don't bypass the publisher**
   ```typescript
   // ❌ This won't trigger auto-save
   mapStore.registerProducer(...).publish(data);
   
   // ✅ This triggers auto-save
   createWidgetPublisher(...).publish(data);
   ```

---

## Advanced Configuration

### Adjust Debounce Delay

If you need different debounce timing:

```typescript
// In storage.ts
const AUTO_SAVE_DELAY = 3000; // 3 seconds for slower saves
// or
const AUTO_SAVE_DELAY = 100;  // 100ms for faster saves
```

### Conditional Auto-Save

```typescript
// Disable during bulk operations
dashboard.setAutoSaveWidgetData(false);

// Perform many updates
for (let i = 0; i < 100; i++) {
  producer.publish(data);
}

// Re-enable and save once
dashboard.setAutoSaveWidgetData(true);
DashboardStorage.autoSaveWidgetData();
```

---

## Comparison: Before vs After

### Before

```
User: Submits AI job
AI: Generates content
Widget: Displays content
... time passes ...
User: Refreshes page
Widget: Shows old/default content ❌
User: "Where did my AI content go?!"
```

**Problem:** Data not preserved without manual save.

### After

```
User: Submits AI job
AI: Generates content
Widget: Displays content
System: Auto-saves to localStorage (1s debounce)
... time passes ...
User: Refreshes page
Widget: Shows AI content ✅
User: "Perfect, it's still here!"
```

**Solution:** Data automatically preserved!

---

## Edge Cases

### Multiple Rapid Updates

```
Update 1 (t=0ms)   → Trigger auto-save, start 1s timer
Update 2 (t=200ms) → Restart 1s timer
Update 3 (t=500ms) → Restart 1s timer
... quiet for 1 second ...
Save (t=1500ms)    → Single localStorage write
```

**Result:** Efficient batching of updates

### Clear Operation

```
producer.clear()
         ↓
Data removed from mapStore
         ↓
Auto-save triggered
         ↓
Empty channel removed from localStorage
```

**Result:** Cleared data doesn't persist

### Page Close Before Save

```
Producer publishes data
         ↓
Auto-save timer starts (1s)
         ↓
User closes page at 0.5s
         ↓
❌ Data not saved (timer didn't complete)
```

**Solution:** Use browser's `beforeunload` for critical data:
```typescript
window.addEventListener('beforeunload', () => {
  DashboardStorage.saveWidgetDataOnly(); // Force immediate save
});
```

---

## Monitoring Auto-Save

### Console Logs

Watch for these patterns:

**Data published:**
```
[ValidatedPublisher:paragraph-content:...] ✅ Validation passed, publishing to mapStore
[ValidatedPublisher:paragraph-content:...] 💾 Triggering auto-save to localStorage...
```

**Auto-save executes:**
```
💾 [DashboardStorage] Auto-saving widget data...
   ✅ Auto-saved 3 channels
```

### Debug Panel

After auto-save completes:
1. Click **"💾 Log Data"**
2. Verify channels show `Has Data: ✅`
3. Refresh page
4. Click **"💾 Log Data"** again
5. Verify same data persists

---

## Configuration Options

### Enable/Disable

```typescript
// Disable
dashboard.setAutoSaveWidgetData(false);

// Enable
dashboard.setAutoSaveWidgetData(true);
```

### Check Status

```typescript
console.log('Auto-save enabled:', dashboard.autoSaveWidgetData);
```

### Development Mode

Auto-save respects dev mode:

```typescript
dashboard.setDevMode(true);  // Disables ALL persistence
dashboard.setDevMode(false); // Enables persistence
```

---

## Example Scenarios

### Scenario 1: AI Content

```typescript
// Component
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent
});

// AI completes → Bridge publishes → Auto-save triggered
// User refreshes → Content still there! ✅
```

### Scenario 2: User Input

```typescript
// Form component
const producer = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'user-form'
);

function handleSubmit(formData) {
  producer.publish(formData);
  // Auto-save triggered automatically
}

// User refreshes → Form data still there! ✅
```

### Scenario 3: API Data

```typescript
// Service
class DataService {
  async fetchData() {
    const data = await fetch('/api/data');
    this.producer.publish(data);
    // Auto-save triggered automatically
  }
}

// User refreshes → API data still there! ✅
```

---

## When to Manually Save

You still need manual save for:

### 1. Widget Layout Changes

```typescript
// User moves widget
dashboard.moveWidget(id, newPosition);

// User clicks "Save" button
dashboard.save(); // Saves layout + data
```

### 2. Grid Configuration Changes

```typescript
// Change grid size
dashboard.updateGridConfig({ gridColumns: 8 });

// Manually save
dashboard.save();
```

### 3. Widget Add/Remove

```typescript
// Add widget
dashboard.addWidget(newWidget);

// Auto-save will trigger, but good to manually save too
dashboard.save();
```

---

## Troubleshooting

### Issue: Auto-save not triggering

**Check:**
1. Auto-save enabled?
   ```typescript
   console.log(dashboard.autoSaveWidgetData); // Should be true
   ```

2. Using ValidatedPublisher?
   ```typescript
   // ✅ Triggers auto-save
   const producer = createWidgetPublisher(...);
   
   // ❌ Doesn't trigger auto-save
   const producer = mapStore.registerProducer(...);
   ```

3. Data actually changing?
   ```typescript
   // Check console for publish logs
   ```

### Issue: Too many localStorage writes

**Solution:** Increase debounce delay:
```typescript
// In storage.ts
const AUTO_SAVE_DELAY = 5000; // 5 seconds
```

### Issue: Data lost on quick refresh

**Cause:** Auto-save delay not completed

**Solution:** Add immediate save on page unload:
```typescript
// In dashboard +page.svelte
window.addEventListener('beforeunload', () => {
  // Force immediate save, bypass debounce
  const data = mapStore.getAllData();
  const snapshot = {};
  data.forEach(d => { if (d.value) snapshot[d.typeId] = d.value; });
  localStorage.setItem('dashboard_widget_data', JSON.stringify(snapshot));
});
```

---

## Summary

✅ **Automatic**: No manual save needed for widget data  
✅ **Debounced**: Efficient localStorage writes  
✅ **Selective**: Only widget data, not full dashboard  
✅ **Configurable**: Can enable/disable  
✅ **Logged**: Full visibility in console  
✅ **Fast**: 1 second debounce default  

**Your AI-generated content and dynamic widget data now persists automatically!** 🎉

---

## Related Documentation

- **WIDGET_DATA_PERSISTENCE.md** - Overall persistence system
- **PERSISTENCE_TESTING_GUIDE.md** - Test persistence features
- **EXECUTION_TRACE_GUIDE.md** - Trace save operations

---

## Quick Reference

```typescript
// Auto-save is enabled by default
dashboard.autoSaveWidgetData  // true

// Disable if needed
dashboard.setAutoSaveWidgetData(false);

// Re-enable
dashboard.setAutoSaveWidgetData(true);

// Data auto-saves 1 second after last change
// No manual action required!
```

