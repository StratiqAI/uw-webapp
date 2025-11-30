# Universal Rendering Engine

The Universal Rendering Engine provides automatic UI generation based on schema definitions, enabling "Low Code" development where AI-generated schemas automatically get appropriate UIs.

## Architecture

### Components

1. **ComponentRegistry** (`$lib/stores/ComponentRegistry.ts`)
   - Maps schema IDs and topic patterns to Svelte components
   - Supports exact matches and regex pattern matching
   - Falls back to auto-generated UI when no custom component is registered

2. **UniversalWidget** (`$lib/components/UniversalWidget.svelte`)
   - Container component that resolves and renders the appropriate component
   - Connects to MapStore topics and resolves components based on schema metadata

3. **AutoDataView** (`$lib/components/auto/AutoDataView.svelte`)
   - Auto-generates UI from schema definitions
   - Recursively handles nested objects and arrays
   - Renders tables for arrays, description lists for objects

4. **JsonFallback** (`$lib/components/auto/JsonFallback.svelte`)
   - Fallback component for data without schemas
   - Displays raw JSON in a formatted view

## Usage

### Basic Usage

```svelte
<script>
  import UniversalWidget from '$lib/components/UniversalWidget.svelte';
</script>

<UniversalWidget topic="my:topic:name" />
```

### Registering Custom Components

```typescript
import { uiRegistry } from '$lib/stores/ComponentRegistry';
import MyCustomComponent from '$lib/components/custom/MyCustomComponent.svelte';

// Register for a specific schema ID
uiRegistry.register('my:schema-id', MyCustomComponent, {
  // Optional default props
  showActions: true,
  editable: false
});

// Register for a topic pattern (regex)
uiRegistry.registerPattern(/^sys:alert:/, AlertBanner, {
  dismissible: true
});
```

### Component Resolution Priority

1. **Exact Schema Match** - Highest priority
   - If `schemaId` matches a registered component, use it

2. **Pattern Match** - Second priority
   - If topic matches a registered regex pattern, use that component

3. **Auto-Generated UI** - Third priority
   - If schema exists but no custom component, use `AutoDataView`

4. **JSON Fallback** - Lowest priority
   - If no schema exists, use `JsonFallback` to show raw JSON

## AutoDataView Features

### Object Rendering
- Renders objects as a grid of key-value pairs
- Shows field names, types, and required indicators
- Recursively handles nested objects

### Array Rendering
- Renders arrays of objects as tables
- Uses field definitions as column headers
- Handles nested structures within array items

### Primitive Rendering
- Formats dates, numbers, booleans appropriately
- Shows enum values as-is
- Handles null/undefined values gracefully

## Example Workflow

1. **AI generates a new schema** (e.g., "Drone Survey Results")
2. **Schema is registered** via Schema Builder or programmatically
3. **Data is published** to a topic with the schema enforced
4. **UniversalWidget automatically renders** using AutoDataView
5. **No custom component code needed!**

## Testing

See `src/routes/(experiments)/(good)/admin/datatypes/universal-widget-demo/+page.svelte` for a complete demo.

## Integration with Dashboard

The UniversalWidget can be used in any dashboard grid system:

```svelte
<!-- In your dashboard grid -->
<div class="grid-item">
  <UniversalWidget topic="property:123" />
</div>
```

## Benefits

- **Zero-code UI generation** for new data types
- **Consistent rendering** across the application
- **Easy customization** via component registration
- **Type-safe** with schema validation
- **AI-ready** - new schemas get UIs automatically

