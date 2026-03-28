# MapStore Debug Panel Guide

## Overview

The MapStore Debug Panel provides three buttons to inspect the state of the `mapObjectStore` in real-time. The panel is located at the top of the dashboard page.

## Buttons

### 📥 Log Consumers

**What it does:**
- Lists all registered consumers (data listeners) across all channels
- Groups consumers by channel/typeId
- Shows consumer ID, channel name, and role (consumer or both)

**Console Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║  MapStore Debug: ALL CONSUMERS                                ║
╚═══════════════════════════════════════════════════════════════╝

Total Consumers: 3

📥 Channel: paragraph-content
   Consumers: 2
   1. paragraph-widget (consumer)
   2. another-consumer (both)

📥 Channel: table-data
   Consumers: 1
   1. table-widget (consumer)

[Table view showing all consumers]
```

**Use cases:**
- Check which widgets are listening to a channel
- Verify consumer registration
- Debug missing updates (if consumer not listed, it's not registered)

---

### 📤 Log Producers

**What it does:**
- Lists all registered producers (data publishers) across all channels
- Groups producers by channel/typeId
- Shows producer ID, channel name, and role (producer or both)

**Console Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║  MapStore Debug: ALL PRODUCERS                                ║
╚═══════════════════════════════════════════════════════════════╝

Total Producers: 2

📤 Channel: paragraph-content
   Producers: 1
   1. job-abc123-to-paragraph-content (producer)

📤 Channel: table-data
   Producers: 1
   1. data-fetcher (producer)

[Table view showing all producers]
```

**Use cases:**
- Check which components/jobs are publishing to a channel
- Verify bridge creation
- Debug duplicate publishers
- Trace data sources

---

### 💾 Log Data

**What it does:**
- Shows all data currently stored in the mapObjectStore
- Lists channels, producer/consumer counts, and actual data values
- Displays full data objects for inspection

**Console Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║  MapStore Debug: ALL DATA                                     ║
╚═══════════════════════════════════════════════════════════════╝

Total Channels: 2

1. Channel: paragraph-content
   Producers: 1 | Consumers: 2
   Has Data: ✅
   Value:
   {
     title: "AI Summary",
     content: "This is the content...",
     markdown: true
   }

2. Channel: table-data
   Producers: 1 | Consumers: 1
   Has Data: ❌

[Summary table]
[Detailed data for each channel]
```

**Use cases:**
- Check what data is currently stored
- Verify data structure
- Debug why widget isn't displaying (check if channel has data)
- Inspect actual values being passed

---

### 📊 Log All

**What it does:**
- Combines all three logs above
- Shows complete state of mapObjectStore
- Provides summary statistics first, then detailed logs

**Console Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║  MapStore Debug: COMPLETE STATE                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 Summary:
   Channels: 2
   Producers: 2
   Consumers: 3
   Channels with data: 1

[Followed by all three detailed logs]
```

**Use cases:**
- Get complete overview
- Document current state
- Compare states before/after changes
- Share state with team for debugging

---

## How to Use

### Basic Usage

1. **Open Dashboard**
   - Navigate to `/dashboard` route
   - Debug panel appears at the top

2. **Open Browser Console**
   - Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
   - Switch to Console tab

3. **Click Button**
   - Click any of the four debug buttons
   - Watch formatted output appear in console

### Reading the Output

#### Tables
Console.table() is used for easy scanning:
```
┌─────────┬──────────────────┬──────────────────┬──────────┐
│ (index) │   Consumer ID    │     Channel      │   Role   │
├─────────┼──────────────────┼──────────────────┼──────────┤
│    0    │ 'paragraph-wid…' │ 'paragraph-con…' │ 'consu…' │
│    1    │ 'table-widget'   │ 'table-data'     │ 'consu…' │
└─────────┴──────────────────┴──────────────────┴──────────┘
```

#### Grouped Lists
Channels are grouped with their registrations:
```
📥 Channel: paragraph-content
   Consumers: 2
   1. paragraph-widget (consumer)
   2. another-consumer (both)
```

#### Data Objects
Full objects are logged for inspection:
```
paragraph-content:
{
  title: "AI Summary",
  content: "This is the content...",
  markdown: true
}
```

---

## Debugging Workflows

### Widget Not Updating

1. **Click "Log Consumers"**
   - Verify widget is registered as consumer
   - Check channel name matches expected

2. **Click "Log Producers"**
   - Verify producer exists for that channel
   - Check bridge was created (look for job-xxx-to-channel pattern)

3. **Click "Log Data"**
   - Check if channel has data (✅ vs ❌)
   - If no data, producer hasn't published yet
   - If has data, verify structure matches widget expectations

### Bridge Not Working

1. **Click "Log All"**
   - Get complete picture

2. **Check Producers section**
   - Look for bridge producer: `job-{jobId}-to-{channelId}`
   - If missing, bridge wasn't created

3. **Check Data section**
   - If bridge exists but no data, job hasn't completed or validation failed
   - Check main console for validation errors

### Multiple Publishers/Consumers

**Click "Log Producers" or "Log Consumers"**
- Count registrations per channel
- Multiple producers might cause conflicts
- Multiple consumers are usually fine

---

## Console Filter Tips

To focus on specific output:

| What to See | Filter in Console |
|-------------|-------------------|
| Only consumers | `MapStore Debug: ALL CONSUMERS` |
| Only producers | `MapStore Debug: ALL PRODUCERS` |
| Only data | `MapStore Debug: ALL DATA` |
| Channel-specific | `paragraph-content` |
| Summary only | `📊 Summary` |

---

## API Reference

The debug panel uses these mapObjectStore methods:

```typescript
// Get all consumers
mapStore.getAllConsumers(): Array<{
  registrationId: string;
  typeId: string;
  role: 'consumer' | 'both';
}>

// Get all producers
mapStore.getAllProducers(): Array<{
  registrationId: string;
  typeId: string;
  role: 'producer' | 'both';
}>

// Get all stored data
mapStore.getAllData(): Array<{
  typeId: string;
  value: any;
  producerCount: number;
  consumerCount: number;
}>

// Get type info (channel info)
mapStore.getTypeInfo(): Array<{
  typeId: string;
  producerCount: number;
  consumerCount: number;
  hasValue: boolean;
}>

// Get registrations for specific type
mapStore.getTypeRegistrations(typeId: string): {
  producers: string[];
  consumers: string[];
}
```

---

## Common Issues & Solutions

### Issue: No output in console

**Solution:**
- Check browser console is open (F12)
- Check console is on "Console" tab, not "Network" or other
- Check console filter isn't hiding logs

### Issue: "No consumers/producers registered"

**Solutions:**
- Wait for components to mount
- Check if widgets are rendered
- Check if bridges are created (after job completion)

### Issue: Channel has no data (❌)

**Solutions:**
- Producer hasn't published yet
- Validation failed (check main console for validation errors)
- Job hasn't completed
- Filter function rejecting updates

### Issue: Too much output

**Solution:**
- Use individual buttons instead of "Log All"
- Use console filter to focus on specific channels
- Clear console before clicking button

---

## Performance Note

The debug panel uses console.log/console.table which have minimal performance impact. Safe to use frequently during development.

In production, you can:
- Remove the debug panel component from the page
- Hide it with conditional rendering: `{#if import.meta.env.DEV}<MapStoreDebugPanel />{/if}`

---

## Example Workflow

**Scenario: Widget not showing AI-generated content**

```
Step 1: Click "📥 Log Consumers"
→ Verify: "paragraph-widget" is registered for "paragraph-content" ✅

Step 2: Click "📤 Log Producers"
→ Verify: "job-abc123-to-paragraph-content" exists ✅

Step 3: Click "💾 Log Data"
→ Check: "paragraph-content" has data? 
   → If ❌: Job hasn't completed or validation failed
      → Check main console for errors
      → Check job status in JobSubmission component
   → If ✅: Data exists
      → Check data structure matches widget expectations
      → Check widget component is actually using the consumer

Step 4: If all checks pass but widget not updating
→ Check widget subscription callback is being called
→ Add logs to widget component's subscribe callback
→ Check widget state is updating ($state reactivity)
```

---

## Tips

1. **Use before and after**: Click button before action, perform action, click again to see changes

2. **Compare channels**: Look for patterns across channels to identify issues

3. **Screenshot output**: Right-click console → Save as... for documentation

4. **Share state**: Copy console output to share exact state with team

5. **Regular checks**: Click during development to verify assumptions

6. **Combine with trace logs**: Use with execution trace logs (from EXECUTION_TRACE_GUIDE.md) for complete picture

