# Dashboard Widget System - Complete Documentation

## 🎯 Overview

A comprehensive, type-safe system for building dynamic dashboards with AI-powered widgets. Features include:

- ✅ **Type-safe widget data** with Zod schemas
- ✅ **AI job integration** with OpenAI structured outputs
- ✅ **Real-time updates** via mapObjectStore
- ✅ **Data persistence** to localStorage
- ✅ **Auto-save widget data** on every change (1s debounce)
- ✅ **Automatic validation** at every step
- ✅ **Debug tools** for development
- ✅ **Complete traceability** with console logging

---

## 📁 File Structure

```
src/lib/dashboard/
├── components/
│   ├── Dashboard.svelte                    # Main dashboard grid
│   ├── DashboardControls.svelte            # Save/Load/Clear controls
│   ├── MapStoreDebugPanel.svelte           # Debug buttons
│   └── widgets/
│       ├── ParagraphWidget.svelte          # Example: Updated with validation
│       └── ... (other widgets)
│
├── examples/
│   ├── AIJobParagraphExample.svelte        # Complete AI → Widget example
│   ├── WidgetJobIntegration.svelte         # Full integration demo
│   ├── QuickStartExample.svelte            # Minimal example
│   ├── README.md                           # Examples guide
│   └── README_AI_JOB_PRODUCER.md          # AI job producer guide
│
├── stores/
│   └── dashboard.svelte.ts                 # Dashboard state management
│
├── types/
│   ├── widget.ts                           # Widget type definitions
│   ├── widgetSchemas.ts                    # Zod schemas + OpenAI config
│   └── widgetBridge.ts                     # Bridge system implementation
│
├── utils/
│   ├── storage.ts                          # localStorage persistence
│   └── grid.ts                             # Grid positioning utils
│
└── Documentation:
    ├── README.md                           # This file
    ├── ARCHITECTURE_OVERVIEW.md            # System architecture
    ├── WIDGET_TYPE_SYSTEM.md               # Type system guide
    ├── WIDGET_DATA_PERSISTENCE.md          # Persistence feature
    ├── AUTO_SAVE_WIDGET_DATA.md            # Auto-save feature (NEW!)
    ├── OPENAI_TEXT_FORMAT_GUIDE.md         # OpenAI integration
    ├── OPENAI_SCHEMA_REQUIREMENTS.md       # Schema rules
    ├── EXECUTION_TRACE_GUIDE.md            # Debug with logs
    ├── CONSOLE_LOG_REFERENCE.md            # Log format reference
    ├── MAPSTORE_DEBUG_GUIDE.md             # Debug panel guide
    ├── PRODUCER_REGISTRATION_GUIDE.md      # Where to register
    ├── TRANSFORMER_DEBUGGING_GUIDE.md      # Fix transform errors
    ├── PERSISTENCE_TESTING_GUIDE.md        # Test persistence
    ├── MIGRATION_TO_TEXT_FORMAT.md         # Migration guide
    └── IMPLEMENTATION_SUMMARY.md           # What was built
```

---

## 🚀 Quick Start

### 1. Create an AI-Powered Widget

```typescript
import AIJobParagraphExample from '$lib/dashboard/examples/AIJobParagraphExample.svelte';

<AIJobParagraphExample 
  idToken={yourToken}
  prompt="Your AI prompt here"
  widgetId="my-widget"
/>
```

**That's it!** The widget:
- Submits AI job with structured output
- Creates producer automatically via bridge
- Validates all data with Zod
- Displays AI-generated content
- Persists data to localStorage

---

### 2. Use Debug Panel

```svelte
import MapStoreDebugPanel from '$lib/dashboard/components/MapStoreDebugPanel.svelte';

<MapStoreDebugPanel />
```

**Four buttons:**
- 📥 Log Consumers
- 📤 Log Producers
- 💾 Log Data
- 📊 Log All

---

### 3. Save & Load Dashboard

```typescript
import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';

// Save (includes widget data)
dashboard.save();

// Load (restores widget data)
dashboard.initialize();

// Clear (removes all data)
dashboard.clearSavedDashboard();
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI JOB SUBMISSION                        │
│  getWidgetTextFormat() → OpenAI structured output           │
└────────────────────────┬────────────────────────────────────┘
                         │ Job Result
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    JOB-WIDGET BRIDGE                        │
│  createJobWidgetBridge()                                    │
│    ├─ Creates ValidatedPublisher                           │
│    ├─ Subscribes to jobUpdateStore                         │
│    ├─ Transforms result                                     │
│    ├─ Validates with Zod                                    │
│    └─ Publishes to mapObjectStore                          │
└────────────────────────┬────────────────────────────────────┘
                         │ Validated Data
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    mapObjectStore                           │
│  Central state management for widget data                  │
│  Channels: paragraph-content, table-data, etc.             │
└────────────────────────┬────────────────────────────────────┘
                         │ Notify Subscribers
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    WIDGET COMPONENTS                        │
│  createWidgetConsumer()                                     │
│    ├─ Subscribes to channel                                │
│    ├─ Validates received data                              │
│    └─ Updates display                                       │
└────────────────────────┬────────────────────────────────────┘
                         │ Display
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER SEES CONTENT                        │
└─────────────────────────────────────────────────────────────┘
                         │ User saves
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    LOCALSTORAGE                             │
│  DashboardStorage.saveDashboard()                          │
│    ├─ Saves widget configurations                          │
│    ├─ Saves grid config                                     │
│    └─ Captures mapObjectStore data ← NEW!                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Concepts

### 1. Zod Schemas
**Single source of truth** for widget data structure:
```typescript
export const ParagraphWidgetDataSchema = z.object({
  title: z.string().nullable().optional(),
  content: z.string(),
  markdown: z.boolean().nullable().optional()
});
```

**Used for:**
- TypeScript type inference
- Runtime validation
- OpenAI structured output
- mapObjectStore validation

---

### 2. Widget Channels
**Communication channels** in mapObjectStore:
```typescript
WidgetChannels.paragraphContent  // 'paragraph-content'
WidgetChannels.tableData         // 'table-data'
WidgetChannels.metricData        // 'metric-data'
WidgetChannels.chartData         // 'chart-data'
```

**Each channel has:**
- Schema for validation
- Producers (data sources)
- Consumers (widgets)
- Current data value

---

### 3. Producers & Consumers

**Producers** (create data):
```typescript
const producer = createWidgetPublisher(
  WidgetChannels.paragraphContent,
  'my-producer'
);
producer.publish(data);  // Validates with Zod
```

**Consumers** (display data):
```typescript
const consumer = createWidgetConsumer(
  WidgetChannels.paragraphContent,
  'my-widget'
);
consumer.subscribe(data => {
  // Receive validated data
});
```

---

### 4. Job-Widget Bridge

**Automatic connection** from AI job to widget:
```typescript
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent
});
// Creates producer, validates, publishes automatically
```

---

### 5. Data Persistence

**Automatic save/restore:**
- Save: Captures all mapObjectStore data
- Load: Restores data to mapObjectStore
- Widgets automatically receive restored data

---

## 📊 Features

### Type Safety
- ✅ Zod schemas define structure
- ✅ TypeScript types inferred from schemas
- ✅ Runtime validation at every step
- ✅ Invalid data rejected automatically

### OpenAI Integration
- ✅ `zodTextFormat` for structured outputs
- ✅ AI responses match widget schemas
- ✅ Automatic validation of AI output
- ✅ Consistent with backend (bestSearch.js)

### Data Flow
- ✅ AI Job → Validation → mapStore → Widget
- ✅ Complete traceability with logs
- ✅ Error handling at every step
- ✅ Automatic cleanup

### Persistence
- ✅ Widget data saved to localStorage
- ✅ Automatic restore on page load
- ✅ Version tracking (v2.0.0)
- ✅ Export/import with data

### Debugging
- ✅ MapStore debug panel (4 buttons)
- ✅ Detailed console logging
- ✅ Execution trace guides
- ✅ Error visibility

---

## 📖 Documentation Index

| Guide | Purpose |
|-------|---------|
| **ARCHITECTURE_OVERVIEW.md** | System architecture and design |
| **WIDGET_TYPE_SYSTEM.md** | Complete type system guide |
| **OPENAI_TEXT_FORMAT_GUIDE.md** | Using OpenAI structured outputs |
| **OPENAI_SCHEMA_REQUIREMENTS.md** | Schema rules (.nullable().optional()) |
| **WIDGET_DATA_PERSISTENCE.md** | How persistence works |
| **PERSISTENCE_TESTING_GUIDE.md** | Test persistence feature |
| **EXECUTION_TRACE_GUIDE.md** | Follow execution with logs |
| **CONSOLE_LOG_REFERENCE.md** | Console log format guide |
| **MAPSTORE_DEBUG_GUIDE.md** | Using debug panel |
| **PRODUCER_REGISTRATION_GUIDE.md** | Where to register producers |
| **TRANSFORMER_DEBUGGING_GUIDE.md** | Fix transformer errors |
| **MIGRATION_TO_TEXT_FORMAT.md** | Migration from old format |

### Example Documentation
- **examples/README.md** - Examples overview
- **examples/README_AI_JOB_PRODUCER.md** - AI job guide

---

## 🎓 Learning Path

### Beginner (5 minutes)
1. Read **Quick Start** section above
2. Use `AIJobParagraphExample` component
3. Submit a job and see it work

### Intermediate (30 minutes)
1. Read **WIDGET_TYPE_SYSTEM.md**
2. Read **OPENAI_TEXT_FORMAT_GUIDE.md**
3. Create your own AI job → widget integration
4. Use debug panel to understand flow

### Advanced (2 hours)
1. Read **ARCHITECTURE_OVERVIEW.md**
2. Read **PRODUCER_REGISTRATION_GUIDE.md**
3. Create custom widget types
4. Build complex multi-widget flows
5. Extend the system

---

## 💡 Common Use Cases

### Use Case 1: AI-Generated Content
```typescript
// Get text format
const textFormat = getWidgetTextFormat('paragraph');

// Submit job
const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [{ role: 'system', content: 'Generate...' }],
    text: { format: textFormat }
  }),
  priority: 'HIGH'
};

// Bridge to widget
createJobWidgetBridge({ jobId, channel: WidgetChannels.paragraphContent });
```

### Use Case 2: API Data Display
```typescript
// In service
class DataService {
  producer = createWidgetPublisher(WidgetChannels.tableData, 'api-service');
  
  async fetchData() {
    const data = await fetch('/api/data');
    this.producer.publish(data);
  }
}
```

### Use Case 3: User Input to Widget
```typescript
// In form component
const producer = createWidgetPublisher(WidgetChannels.paragraphContent, 'user-form');

function handleSubmit(formData) {
  producer.publish({
    title: formData.title,
    content: formData.content,
    markdown: false
  });
}
```

---

## 🐛 Debugging

### Debug Panel Buttons

| Button | Shows | Use When |
|--------|-------|----------|
| 📥 Log Consumers | All data listeners | Widget not updating |
| 📤 Log Producers | All data publishers | Producer missing |
| 💾 Log Data | All stored data | Data not persisting |
| 📊 Log All | Complete state | General debugging |

### Console Log Icons

| Icon | Meaning |
|------|---------|
| 🔧 | Function called |
| 📥 | Data received |
| 📤 | Data sent |
| ✅ | Success |
| ❌ | Error |
| 🔄 | Transform |
| 🌉 | Bridge operation |
| 📝 | Widget operation |
| 💾 | Save operation |
| 📂 | Load operation |

### Tracing Issues

1. **Widget not updating?** → `EXECUTION_TRACE_GUIDE.md`
2. **Validation errors?** → `TRANSFORMER_DEBUGGING_GUIDE.md`
3. **Data not persisting?** → `PERSISTENCE_TESTING_GUIDE.md`
4. **OpenAI errors?** → `OPENAI_SCHEMA_REQUIREMENTS.md`
5. **Where to register?** → `PRODUCER_REGISTRATION_GUIDE.md`

---

## 🎨 Available Widget Types

All with Zod schemas and OpenAI support:

| Widget | Schema | Channel | Use For |
|--------|--------|---------|---------|
| Paragraph | `ParagraphWidgetDataSchema` | `paragraph-content` | Text content |
| Table | `TableWidgetDataSchema` | `table-data` | Tabular data |
| Metric | `MetricWidgetDataSchema` | `metric-data` | KPIs |
| Line Chart | `LineChartWidgetDataSchema` | `chart-data` | Time series |
| Bar Chart | `BarChartWidgetDataSchema` | `chart-data` | Comparisons |
| Title | `TitleWidgetDataSchema` | `title-data` | Headers |
| Image | `ImageWidgetDataSchema` | `image-data` | Images |
| Map | `MapWidgetDataSchema` | `map-data` | Geographic |

---

## 🔄 Complete Data Flow

```
1. User Action (Submit AI Job)
         ↓
2. JobSubmission with OpenAI text format
         ↓
3. AI generates structured response
         ↓
4. Job completes → handleJobComplete()
         ↓
5. createJobWidgetBridge()
   ├─ Creates ValidatedPublisher
   ├─ Registers in mapObjectStore
   └─ Subscribes to job updates
         ↓
6. Job update arrives
         ↓
7. Bridge validates & publishes
         ↓
8. mapObjectStore notifies consumers
         ↓
9. Widget receives validated data
         ↓
10. Widget displays content
         ↓
11. User saves dashboard
         ↓
12. Widget data captured from mapObjectStore
         ↓
13. Saved to localStorage
         ↓
14. Page refresh
         ↓
15. Dashboard loads
         ↓
16. Widget data restored to mapObjectStore
         ↓
17. Widget displays persisted content ✅
```

---

## 🎯 Key Features Explained

### Feature 1: Type-Safe Schema System

**Single Zod schema** defines:
- ✅ TypeScript types
- ✅ Runtime validation
- ✅ OpenAI output format
- ✅ mapObjectStore contract

```typescript
// Define once
const schema = ParagraphWidgetDataSchema;

// Use everywhere
type Data = z.infer<typeof schema>;           // TypeScript
const valid = schema.safeParse(data);         // Runtime
const format = zodTextFormat(schema, 'name'); // OpenAI
```

### Feature 2: Automatic Producer Creation

No manual producer setup needed:

```typescript
// Just create the bridge
const bridge = createJobWidgetBridge({
  jobId: 'job-123',
  channel: WidgetChannels.paragraphContent
});

// Producer created automatically as:
// ID: job-job-123-to-paragraph-content
// Channel: paragraph-content
// Type: ValidatedPublisher
```

### Feature 3: Data Persistence & Auto-Save

Automatic save/restore of dynamic data:

```typescript
// When data changes (NEW!)
producer.publish(data)
         ↓
Auto-save triggered (1s debounce)
         ↓
localStorage.setItem('dashboard_widget_data', JSON.stringify(data))

// When loading
localStorage.getItem('dashboard_widget_data')
         ↓
restoreWidgetData()  // Publishes to mapObjectStore
         ↓
Widgets receive restored data
```

**Key Feature:** Data auto-saves 1 second after any change. No manual save needed!

### Feature 4: Complete Traceability

Every function logs its execution:

```typescript
// Producer
🔧 [createWidgetPublisher] Called for channel: paragraph-content
[ValidatedPublisher] Constructor called
[ValidatedPublisher:...] publish() called with data: {...}
✅ Validation passed, publishing to mapStore

// Consumer
📝 [ParagraphWidget] Initializing widget
🔧 [createWidgetConsumer] Called for channel: paragraph-content
[ValidatedConsumer:...] 📥 Data received from mapStore
✅ Widget state updated
```

---

## 📦 What's Included

### Core System
- ✅ 8 widget types with Zod schemas
- ✅ ValidatedPublisher/Consumer classes
- ✅ Job-widget bridge system
- ✅ mapObjectStore integration
- ✅ localStorage persistence

### Tools & Debugging
- ✅ MapStore debug panel (4 buttons)
- ✅ Detailed console logging
- ✅ Type info inspection
- ✅ Data visualization

### Examples
- ✅ AI Job → Paragraph Widget (complete)
- ✅ Widget Job Integration (advanced)
- ✅ Quick Start (minimal)

### Documentation
- ✅ 13 comprehensive guides
- ✅ Step-by-step tutorials
- ✅ API reference
- ✅ Debugging workflows

---

## 🚦 Getting Started Checklist

- [ ] Read this README
- [ ] Review `ARCHITECTURE_OVERVIEW.md`
- [ ] Run `AIJobParagraphExample` on dashboard
- [ ] Submit an AI job
- [ ] Use debug panel to inspect state
- [ ] Save dashboard
- [ ] Refresh page
- [ ] Verify data persists
- [ ] Read relevant guides as needed

---

## 🏆 Best Practices

1. **Use Bridges for AI Jobs**
   - Don't create producers manually
   - Let bridge handle everything

2. **Schema First**
   - Define Zod schema
   - Infer TypeScript types
   - Generate OpenAI format

3. **Meaningful IDs**
   - Use descriptive channel IDs
   - Use descriptive producer/consumer IDs
   - Makes debugging easier

4. **Validate Early**
   - Use OpenAI structured output
   - Validate in bridge
   - Validate in consumer

5. **Log Everything (in dev)**
   - Console logs show data flow
   - Use debug panel frequently
   - Follow execution traces

6. **Clean Up**
   - Disconnect bridges on unmount
   - Clear producers when done
   - Unregister consumers

---

## 🎓 Advanced Topics

### Custom Widget Types
Create new widget schemas in `widgetSchemas.ts`:
```typescript
export const MyWidgetDataSchema = z.object({
  customField: z.string(),
  optionalField: z.string().nullable().optional()
});
```

### Multi-Widget Bridges
One job → multiple widgets:
```typescript
createJobMultiWidgetBridge(jobId, [
  { config: WidgetChannels.paragraphContent, transformer: ... },
  { config: WidgetChannels.metricData, transformer: ... }
]);
```

### Custom Transformers
Handle complex AI responses:
```typescript
transformer: (result) => {
  const parsed = JSON.parse(result);
  return {
    title: parsed.nested.deep.title,
    content: parsed.array.map(x => x.text).join('\n'),
    markdown: true
  };
}
```

---

## 🔧 Maintenance

### Adding New Widget Type

1. Define schema in `widgetSchemas.ts`
2. Add to `WidgetDataSchemas` registry
3. Add to `WidgetDataTypeMap`
4. Create channel config in `WidgetChannels`
5. Document in this README

### Updating Schemas

1. Update Zod schema
2. Test with `zodTextFormat`
3. Remember: `.nullable().optional()` for optional fields
4. Update documentation
5. Bump version if breaking change

---

## 🐞 Troubleshooting

### Issue: Widget not displaying AI content

**Debug steps:**
1. Check producer exists: **"📤 Log Producers"**
2. Check data in store: **"💾 Log Data"**
3. Check consumer exists: **"📥 Log Consumers"**
4. Check console for validation errors
5. Review `EXECUTION_TRACE_GUIDE.md`

### Issue: Data not persisting

**Debug steps:**
1. Check save was called: Look for `💾 Saving...` log
2. Check localStorage: `localStorage.getItem('dashboard_widget_data')`
3. Check restore was called: Look for `📤 Restoring...` log
4. Review `PERSISTENCE_TESTING_GUIDE.md`

### Issue: Validation errors

**Debug steps:**
1. Check transformer output
2. Verify schema matches data structure
3. Add detailed logging to transformer
4. Review `TRANSFORMER_DEBUGGING_GUIDE.md`

### Issue: OpenAI schema errors

**Debug steps:**
1. Verify optional fields use `.nullable().optional()`
2. Test schema with `zodTextFormat`
3. Review `OPENAI_SCHEMA_REQUIREMENTS.md`

---

## 📞 Support

For help:
1. **Check relevant documentation** (13 guides available)
2. **Use debug panel** to inspect state
3. **Check console logs** for detailed trace
4. **Review examples** for working code
5. **Test with examples** (`AIJobParagraphExample.svelte`)

---

## 🎉 Summary

You have a complete, production-ready system for:

- ✅ **Type-safe widgets** with Zod validation
- ✅ **AI-powered content** with OpenAI integration
- ✅ **Real-time updates** via mapObjectStore
- ✅ **Data persistence** to localStorage
- ✅ **Comprehensive debugging** tools
- ✅ **Full documentation** (13 guides)
- ✅ **Working examples** (3 complete examples)
- ✅ **Console traceability** (detailed logs)

**Everything you need for dynamic, AI-powered dashboards!** 🚀

---

## Version

**Current Version:** 2.0.0

**Changelog:**
- v2.0.0: Added widget data persistence, OpenAI text format, debug panel
- v1.0.0: Initial dashboard with basic widget support

