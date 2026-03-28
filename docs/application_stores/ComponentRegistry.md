# Component Registry - Usage Documentation

This document describes how `ComponentRegistry` is currently used throughout the application. The registry provides a flexible component resolution system that maps schema IDs and topic patterns to Svelte components, enabling automatic UI generation with fallback mechanisms.

## Architecture Overview

The `ComponentRegistry` provides:
- **Schema-Based Component Mapping** - Maps specific schema IDs to custom Svelte components
- **Pattern-Based Matching** - Uses regex patterns to match topics to components
- **Automatic Fallback System** - Falls back to auto-generated UI or JSON display when no custom component exists
- **Priority-Based Resolution** - Resolves components in a specific order of precedence
- **Default Props Support** - Allows passing default props to registered components

The registry is central to the Universal Rendering Engine, which enables "Low Code" development where AI-generated schemas automatically get appropriate UIs.

## Component Resolution Priority

The registry resolves components in the following order (highest to lowest priority):

1. **Exact Schema ID Match** - If a component is registered for the exact schema ID
2. **Topic Pattern Match** - If the topic matches a registered regex pattern
3. **Auto-Generated UI** - If a schema exists but no custom component is registered, uses `AutoDataView`
4. **JSON Fallback** - If no schema exists, uses `JsonFallback` to display raw JSON

## Current Usage Patterns

### 1. Basic Component Registration

Register a custom component for a specific schema ID:

```typescript
import { uiRegistry } from '$lib/stores/ComponentRegistry';
import PropertyCard from '$lib/components/custom/PropertyCard.svelte';

// Register with default props
uiRegistry.register('cre:property', PropertyCard, {
  showActions: true,
  editable: false,
  compact: false
});
```

**Real Examples:**
- `src/lib/components/auto/registry-examples.ts` (lines 20-23)
  - Example registration for property and financial schemas
  - Shows how to pass default options/props

### 2. Pattern-Based Registration

Register components for topic patterns using regular expressions:

```typescript
import { uiRegistry } from '$lib/stores/ComponentRegistry';
import AlertBanner from '$lib/components/custom/AlertBanner.svelte';

// Register for all topics starting with 'sys:alert:'
uiRegistry.registerPattern(/^sys:alert:/, AlertBanner, {
  dismissible: true,
  autoHide: false
});

// Register for numeric property IDs
uiRegistry.registerPattern(/^prop:\d+$/, PropertyCard, {
  showActions: false
});
```

**Real Examples:**
- `src/lib/components/auto/registry-examples.ts` (lines 32-40)
  - Example pattern registrations for system alerts and property patterns
- `src/routes/(experiments)/(good)/admin/datatypes/universal-rendering/pattern-matching/+page.svelte` (lines 148-166)
  - Demonstrates pattern matching with multiple regex patterns

### 3. Component Resolution in UniversalWidget

The `UniversalWidget` component uses the registry to resolve which component to render:

```typescript
import { uiRegistry } from '$lib/stores/ComponentRegistry';

// Get metadata from MapStore
const meta = mapStore.getMetadata(topic);

// Resolve component based on schemaId and topic
const entry = uiRegistry.resolve(meta?.schemaId, topic);
const RenderComponent = entry.component;

// Render with resolved component
<RenderComponent
  data={currentData}
  {topic}
  schemaId={meta?.schemaId}
  {...entry.options}
/>
```

**Real Examples:**
- `src/lib/components/UniversalWidget.svelte` (lines 29-62)
  - Resolves component using `uiRegistry.resolve()`
  - Passes data, topic, schemaId, and default options to the resolved component
  - Handles loading states when data is not yet available

### 4. Checking Registration Status

Query the registry to see what's registered:

```typescript
import { uiRegistry } from '$lib/stores/ComponentRegistry';

// Check if a schema has a registered component
if (uiRegistry.has('cre:property')) {
  console.log('Property component is registered');
}

// Get all registered schema IDs
const registeredSchemas = uiRegistry.getRegisteredSchemas();
console.log('Registered schemas:', registeredSchemas);
```

**Real Examples:**
- `src/routes/(experiments)/(good)/admin/datatypes/universal-rendering/custom-components/+page.svelte` (line 49)
  - Displays all registered schemas in the UI
  - Shows registration status to users

### 5. Initialization Pattern

Register components during app initialization:

```typescript
import { uiRegistry } from '$lib/stores/ComponentRegistry';
import { initializeComponentRegistry } from '$lib/components/auto/registry-examples';

// Initialize during app startup
export function initializeComponentRegistry() {
  // Register custom components
  uiRegistry.register('cre:property', PropertyCard, { /* options */ });
  uiRegistry.register('cre:financials', ProFormaEditor, { /* options */ });
  
  // Register pattern-based components
  uiRegistry.registerPattern(/^sys:alert:/, AlertBanner, { /* options */ });
  
  console.log('[ComponentRegistry] Registered schemas:', uiRegistry.getRegisteredSchemas());
}
```

**Real Examples:**
- `src/lib/components/auto/registry-examples.ts` (lines 47-50)
  - Provides initialization function for component registration
  - Logs registered schemas for debugging

## Available Methods

### Registration Methods
- `register(schemaId: string, component: Component<any>, options?: Record<string, any>)` - Register a component for a specific schema ID with optional default props
- `registerPattern(pattern: RegExp, component: Component<any>, options?: Record<string, any>)` - Register a component for a topic pattern (regex) with optional default props

### Resolution Methods
- `resolve(schemaId?: string, topic?: string): RegistryEntry` - Resolves the appropriate component based on schemaId and topic, following priority order
  - Returns a `RegistryEntry` with `component` and `options` properties

### Query Methods
- `has(schemaId: string): boolean` - Check if a schema has a registered component
- `getRegisteredSchemas(): string[]` - Get all registered schema IDs

## RegistryEntry Interface

```typescript
interface RegistryEntry {
  component: Component<any>;      // The Svelte component to render
  options?: Record<string, any>;   // Default props to pass to the component
}
```

## Integration with Universal Rendering Engine

The ComponentRegistry is a core part of the Universal Rendering Engine architecture:

1. **Schema Registration** - Schemas are registered via Schema Builder or programmatically
2. **Component Registration** - Custom components are registered via ComponentRegistry
3. **Data Publishing** - Data is published to MapStore topics with schema enforcement
4. **Automatic Resolution** - UniversalWidget resolves components using the registry
5. **Fallback Rendering** - If no custom component exists, AutoDataView or JsonFallback is used

## Best Practices

1. **Register components early** - Register components during app initialization, not in component lifecycle:
   ```typescript
   // Good: In initialization file
   uiRegistry.register('my:schema', MyComponent);
   
   // Bad: In component onMount
   onMount(() => {
     uiRegistry.register('my:schema', MyComponent); // Too late!
   });
   ```

2. **Use descriptive schema IDs** - Use namespaced schema IDs for clarity:
   ```typescript
   // Good
   uiRegistry.register('cre:property', PropertyCard);
   uiRegistry.register('cre:financials', FinancialEditor);
   
   // Bad
   uiRegistry.register('property', PropertyCard); // Too generic
   ```

3. **Leverage pattern matching for system components**:
   ```typescript
   // Register system-wide components with patterns
   uiRegistry.registerPattern(/^sys:alert:/, AlertBanner);
   uiRegistry.registerPattern(/^sys:error:/, ErrorDisplay);
   uiRegistry.registerPattern(/^metrics:/, MetricWidget);
   ```

4. **Provide default options** - Use the options parameter to set sensible defaults:
   ```typescript
   uiRegistry.register('cre:property', PropertyCard, {
     showActions: true,
     editable: false,
     compact: false
   });
   ```

5. **Handle missing registrations gracefully** - The registry automatically falls back to AutoDataView or JsonFallback, so components should handle these cases.

## Component Usage Summary

**Core Components:**
- `UniversalWidget.svelte` - Main consumer of the registry
  - Resolves components using `uiRegistry.resolve()`
  - Renders resolved components with data and options

**Auto-Generated Components:**
- `AutoDataView.svelte` - Fallback component that auto-generates UI from schemas
- `JsonFallback.svelte` - Fallback component for data without schemas

**Example/Demo Components:**
- `routes/(experiments)/(good)/admin/datatypes/universal-rendering/custom-components/+page.svelte` - Demonstrates custom component registration
- `routes/(experiments)/(good)/admin/datatypes/universal-rendering/pattern-matching/+page.svelte` - Demonstrates pattern-based registration

**Initialization:**
- `lib/components/auto/registry-examples.ts` - Example registration patterns and initialization function

## Resolution Flow Example

Here's how the resolution works in practice:

```typescript
// 1. Data is published to a topic with schema enforcement
mapStore.enforceTopicSchema('property:123', 'cre:property');
const pub = mapStore.getPublisher('property:123', 'source');
pub.publish(propertyData);

// 2. UniversalWidget resolves the component
const meta = mapStore.getMetadata('property:123'); // Returns { schemaId: 'cre:property' }
const entry = uiRegistry.resolve(meta?.schemaId, 'property:123');

// 3. Resolution logic:
//    - Checks if 'cre:property' is registered → Yes, returns PropertyCard
//    - If not, checks patterns → /^prop:\d+$/ matches → Returns PropertyCard
//    - If no match, checks if schema exists → Yes → Returns AutoDataView
//    - If no schema → Returns JsonFallback

// 4. Component is rendered with data and options
<entry.component data={propertyData} {...entry.options} />
```

## Fallback Behavior

### AutoDataView Fallback
When a schema exists but no custom component is registered:
- `AutoDataView` automatically generates a UI from the schema definition
- Renders objects as key-value grids
- Renders arrays as tables
- Handles nested structures recursively
- Formats primitives appropriately (dates, numbers, booleans)

### JsonFallback Fallback
When no schema exists:
- `JsonFallback` displays raw JSON in a formatted view
- Useful for debugging or displaying unstructured data
- Provides basic JSON formatting and syntax highlighting

## Advanced Patterns

### Dynamic Registration
Components can be registered dynamically based on runtime conditions:

```typescript
// Register components based on feature flags
if (featureFlags.enableAdvancedPropertyEditor) {
  uiRegistry.register('cre:property', AdvancedPropertyEditor);
} else {
  uiRegistry.register('cre:property', BasicPropertyCard);
}
```

### Conditional Pattern Matching
Use patterns for flexible matching:

```typescript
// Match all property IDs
uiRegistry.registerPattern(/^prop:\d+$/, PropertyCard);

// Match all system alerts
uiRegistry.registerPattern(/^sys:alert:/, AlertBanner);

// Match metrics with specific format
uiRegistry.registerPattern(/^metrics:[a-z]+$/, MetricWidget);
```

## Future Enhancements

Potential improvements:
- Support for async component loading (code splitting)
- Component versioning for schema evolution
- Hot-reloading of registered components in development
- Component dependency management
- Performance metrics for resolution time
- Support for component factories/functions instead of just components
