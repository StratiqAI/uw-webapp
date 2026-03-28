# Widget Data Persistence - Testing Guide

## Quick Test: Verify Persistence Works

### Test 1: AI Content Persistence

**Steps:**
1. Open `/dashboard`
2. Click **"Submit Job"** in AI Job → Paragraph Widget section
3. Wait for AI to generate content
4. Verify content appears in widget
5. Click **"Save"** button in Dashboard Controls
6. Check console for save logs
7. **Refresh the page** (F5)
8. **Verify AI content is still there** ✅

**Expected Result:**
- AI-generated content persists after refresh
- Widget displays same content immediately

**Console Logs to Look For:**

On Save:
```
💾 [DashboardStorage] Saving dashboard to localStorage...
   ✅ Captured data for channel: paragraph-content
✅ [DashboardStorage] Dashboard saved successfully
```

On Load (after refresh):
```
📂 [DashboardStorage] Loading dashboard from localStorage...
   ✅ Loaded 8 widgets
   ✅ Loaded 1 widget data channels

📤 [DashboardStorage] Restoring widget data to mapObjectStore...
   ✅ Restored data for channel: paragraph-content
✅ [DashboardStorage] Widget data restoration complete
```

---

### Test 2: Multiple Channel Persistence

**Steps:**
1. Have multiple widgets with dynamic data (paragraph, table, metric)
2. Use debug panel: Click **"💾 Log Data"**
3. Note how many channels have data
4. Click **"Save"**
5. **Refresh page**
6. Click **"💾 Log Data"** again
7. **Verify same channels have data** ✅

**Expected:**
- All channels with data before save should have data after load
- Data values should match

---

### Test 3: Clear Functionality

**Steps:**
1. Have dashboard with AI-generated content
2. Click **"Clear"** in Dashboard Controls
3. Check console logs
4. Use debug panel: Click **"💾 Log Data"**
5. **Verify no data in any channels** ✅
6. **Refresh page**
7. **Verify fresh dashboard loads** ✅

**Expected:**
- mapObjectStore cleared
- localStorage cleared
- Fresh dashboard on reload

**Console Logs:**
```
🧹 [DashboardStore] Clearing saved dashboard...
   Clearing mapObjectStore data...
✅ [DashboardStore] Dashboard and widget data cleared from localStorage

🗑️  [DashboardStorage] Clearing dashboard from localStorage...
✅ [DashboardStorage] Dashboard cleared
```

---

### Test 4: Export/Import with Data

**Steps:**
1. Create dashboard with AI content
2. Click **"Save"**
3. Click **"Export"** → Save JSON file
4. Click **"Clear"**
5. Click **"Import"** → Load JSON file
6. **Verify AI content restored** ✅

**Expected:**
- Exported JSON includes `widgetData` field
- Import restores both widgets and data
- AI content appears after import

---

## Debugging Tests

### Test 5: Check LocalStorage Directly

**In browser console:**

```javascript
// Check what's saved
const widgetData = localStorage.getItem('dashboard_widget_data');
console.log('Saved data:', JSON.parse(widgetData));

// Check version
const version = localStorage.getItem('dashboard_version');
console.log('Version:', version);  // Should be "2.0.0"

// Check size
const size = new Blob([widgetData]).size;
console.log(`Size: ${(size / 1024).toFixed(2)} KB`);
```

---

### Test 6: Verify MapStore State

**Using Debug Panel:**

1. Before save: Click **"💾 Log Data"**
   - Note channels and values

2. Click **"Save"**

3. After save: Click **"💾 Log Data"** again
   - Should be identical

4. Refresh page

5. After load: Click **"💾 Log Data"**
   - Should match before save ✅

---

### Test 7: Version Migration

**Steps:**
1. Set old version in localStorage:
   ```javascript
   localStorage.setItem('dashboard_version', '1.0.0');
   ```
2. Refresh page
3. Check console for version mismatch message
4. Verify old data was cleared
5. Create new dashboard
6. Save - should use v2.0.0

**Expected Console:**
```
📂 [DashboardStorage] Loading dashboard from localStorage...
   Version mismatch (stored: 1.0.0, current: 2.0.0), clearing old data
🗑️  [DashboardStorage] Clearing dashboard from localStorage...
```

---

## Edge Case Tests

### Test 8: Large Dataset

**Test with large data:**
```javascript
// Create large dataset
const largeData = {
  title: 'Large Content',
  content: 'X'.repeat(100000), // 100KB of text
  markdown: false
};

// Publish to channel
const producer = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'test'
);
producer.publish(largeData);

// Save
dashboard.save();

// Check size
const saved = localStorage.getItem('dashboard_widget_data');
console.log('Size:', (new Blob([saved]).size / 1024).toFixed(2), 'KB');

// Refresh and verify it loads
```

---

### Test 9: Invalid Data Handling

**Test with corrupted data:**
```javascript
// Corrupt the saved data
localStorage.setItem('dashboard_widget_data', 'invalid json{');

// Refresh page
// Should handle gracefully without crashing
```

**Expected:**
- Error logged to console
- Dashboard still loads (with no widget data)
- No crash

---

### Test 10: Multiple Windows

**Test cross-window behavior:**
1. Open dashboard in Window A
2. Submit AI job and save
3. Open dashboard in Window B (new tab)
4. Verify AI content appears in Window B ✅
5. Modify data in Window B and save
6. Refresh Window A
7. Verify Window A shows Window B's changes ✅

---

## Performance Tests

### Test 11: Save Performance

**Measure save time:**
```javascript
console.time('Dashboard Save');
dashboard.save();
console.timeEnd('Dashboard Save');
// Should be < 50ms for typical dashboard
```

### Test 12: Load Performance

**Measure load time:**
```javascript
console.time('Dashboard Load');
const state = DashboardStorage.loadDashboard();
console.timeEnd('Dashboard Load');
// Should be < 100ms for typical dashboard
```

---

## Automated Test Suite (Future)

```typescript
describe('Widget Data Persistence', () => {
  test('saves widget data to localStorage', () => {
    // Setup widget with data
    // Save dashboard
    // Check localStorage contains widgetData
  });

  test('restores widget data from localStorage', () => {
    // Save dashboard with data
    // Clear mapStore
    // Load dashboard
    // Verify data restored to mapStore
  });

  test('clears widget data on dashboard clear', () => {
    // Save dashboard with data
    // Clear dashboard
    // Verify localStorage empty
    // Verify mapStore empty
  });

  test('handles version migration', () => {
    // Set old version
    // Load dashboard
    // Verify old data cleared
  });
});
```

---

## Common Issues & Solutions

### Issue: Data not persisting

**Check:**
1. ✅ Data exists in mapStore before save
   - Use debug panel: **"💾 Log Data"**
2. ✅ Save was called
   - Look for `💾 [DashboardStorage] Saving...` log
3. ✅ Data was captured
   - Look for `✅ Captured data for channel: ...` logs
4. ✅ LocalStorage not disabled
   - Check browser settings

---

### Issue: Data not restoring

**Check:**
1. ✅ Data exists in localStorage
   - `localStorage.getItem('dashboard_widget_data')`
2. ✅ Version matches
   - Should be `2.0.0`
3. ✅ Restore was called
   - Look for `📤 Restoring widget data...` log
4. ✅ Widget consumers registered
   - Use debug panel: **"📥 Log Consumers"**

---

### Issue: Old content showing after new AI job

**Cause:** Saved data overriding new data

**Solution:**
1. Don't auto-restore on every save
2. New data from AI job overrides saved data (already handled)
3. Latest data always wins

---

## Success Criteria

✅ AI-generated content persists after page refresh  
✅ Save captures all mapObjectStore channels  
✅ Load restores data to correct channels  
✅ Widgets display restored data  
✅ Clear removes all data  
✅ Export includes widget data  
✅ Import restores widget data  
✅ Console logs show detailed flow  
✅ Debug panel shows correct state  

---

## Next Steps

1. **Run Test 1** to verify basic persistence
2. **Monitor console logs** to see the flow
3. **Use debug panel** to inspect state
4. **Report any issues** with console output

Happy testing! 🧪

