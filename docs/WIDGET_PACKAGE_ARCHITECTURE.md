# Widget Package Architecture

Single source of truth for how dashboard widgets are authored, packaged, and
integrated into the host app. Reference this document (not `services/widget-system.ts`)
when building or modifying widgets.

## SDK contract (`@stratiqai/dashboard-widget-sdk`)

Source: `packages/dashboard-widget-sdk/src/lib/`

### `defineWidget<TData>(config) → WidgetManifest<TData>`

Factory that every widget package calls once to declare its manifest:

| Field            | Type                              | Required | Notes                                                         |
|------------------|-----------------------------------|----------|---------------------------------------------------------------|
| `kind`           | `string`                          | yes      | Stable camelCase identifier (e.g. `metric`, `brokerCard`)     |
| `displayName`    | `string`                          | yes      | Human-readable label                                          |
| `schemaVersion`  | `string`                          | no       | Defaults to `v1`                                              |
| `zodSchema`      | `z.ZodSchema<TData>`              | yes      | Full widget config shape; validates `widget.data`             |
| `inputSchema`    | `z.ZodSchema`                     | no       | Narrow shape for topic store validation (subscribe path)      |
| `outputSchema`   | `z.ZodSchema`                     | no       | Shape for payloads the widget publishes (see "Bidirectional") |
| `component`      | `Component<StandardWidgetProps>`  | yes      | The Svelte 5 component                                        |
| `defaultData`    | `TData`                           | yes      | Seed data for new widget instances                            |
| `defaultSize`    | `{ colSpan, rowSpan }`            | no       | Defaults to `{ colSpan: 4, rowSpan: 2 }`                     |
| `capabilities`   | `string[]`                        | no       | Host services the widget requires (informational)             |

### `StandardWidgetProps<TData>`

Props the host passes to every widget component:

| Prop               | Type                        | Notes                                              |
|--------------------|-----------------------------|----------------------------------------------------|
| `data`             | `TData`                     | Current config / data for this widget              |
| `widgetId`         | `string?`                   | Unique widget instance id                          |
| `topicOverride`    | `string?`                   | Subscribe to a custom topic instead of default     |
| `darkMode`         | `boolean?`                  | Legacy dark-mode flag                              |
| `theme`            | `'light' \| 'dark' \| 'warm'?` | Fine-grained theme token                       |
| `refreshSignal`    | `number?`                   | Incrementing triggers refetch in `useExternalData` |
| `onUpdateConfig`   | `(data: TData) => void`    | Persist config changes back to dashboard store     |
| `onConfigureReady` | `(toggleFn) => void`       | Register a Configure/Edit toggle for the host      |

### `DashboardWidgetHost` (Svelte context)

Injected by the host via `setDashboardWidgetHost()`; consumed via `getDashboardWidgetHost()`.

```typescript
interface DashboardWidgetHost {
  validatedTopicStore: {
    readonly tree: unknown;
    at<T>(topic: string): T | undefined;
    publish(topic: string, data: unknown): boolean;
    patch(topic: string, partial: Record<string, unknown>): boolean;
    registerSchema(topicPattern: string, jsonSchema: unknown): void;
  };
  getWidgetTopic(kind: string, widgetId: string, topicOverride?: string): string;
  services?: ServiceAccessor;
}
```

### SDK hooks

| Export                      | Purpose                                                          |
|-----------------------------|------------------------------------------------------------------|
| `useReactiveValidatedTopic` | Reactive subscribe to a `ValidatedTopicStore` topic via context  |
| `useExternalData`           | Dual-source reactive fetch: topic store input + widget config    |
| `useHostService<T>(name)`   | Retrieve a named service from the host registry                  |
| `HostServices`              | Well-known service name constants (`SUPABASE`, `FETCH`, `MCP`)   |

## Widget package layout

Every widget lives as a workspace package under `packages/widget-<kind>`:

```
packages/widget-<kind>/
├── package.json            # @stratiqai/widget-<kind>, peers: svelte, zod, SDK
├── svelte.config.js        # vitePreprocess
├── tsconfig.json
├── widget.manifest.json    # declarative sidecar (see docs/WIDGET_MANIFEST_SCHEMA.json)
└── src/lib/
    ├── schema.ts           # Zod: input shape + optional output shape
    ├── <Name>Widget.svelte # StandardWidgetProps<TData>
    └── index.ts            # defineWidget({...}) + re-exports
```

**Build**: `svelte-package -i src/lib -o dist`

**Exports** in `package.json`:

```json
{
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

**Peer dependencies**: `svelte ^5`, `zod ^3`, `@stratiqai/dashboard-widget-sdk ^0.1.0`

## Example: `@stratiqai/widget-metric`

`src/lib/schema.ts`:

```typescript
import { z } from 'zod';

export const metricWidgetDataSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  change: z.number().nullable().optional(),
  changeType: z.enum(['increase', 'decrease']).nullable().optional(),
  unit: z.string().nullable().optional()
});

export type MetricWidgetData = z.infer<typeof metricWidgetDataSchema>;
```

`src/lib/index.ts`:

```typescript
import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { metricWidgetDataSchema } from './schema.js';
import MetricWidget from './MetricWidget.svelte';

export const metricWidget = defineWidget({
  kind: 'metric',
  displayName: 'Metric Widget',
  zodSchema: metricWidgetDataSchema,
  component: MetricWidget,
  defaultData: { label: '—', value: '—' },
  defaultSize: { colSpan: 2, rowSpan: 1 }
});

export { metricWidgetDataSchema, type MetricWidgetData } from './schema.js';
export { default as MetricWidget } from './MetricWidget.svelte';
```

## Host integration touchpoints

These are the files in `uw-webapp` that must be updated when adding a new widget:

| File | What to change |
|------|----------------|
| `src/routes/+layout.svelte` | `import` the manifest; call `registerWidget(manifest)` |
| `src/lib/dashboard/types/widget.ts` | Add to `WidgetType` union and `Widget` discriminated union |
| `src/lib/dashboard/components/DashboardControls.svelte` | Add to `widgetTypes` palette array + `createDefaultWidget` switch |
| `src/lib/dashboard/setup/widgetSchemaRegistration.ts` | Only if built-in (not package-based); packages register via manifest |
| `src/lib/dashboard/types/widgetSchemas.ts` | Only if widget participates in AI structured output / `WidgetDataTypeMap` |
| `src/lib/dashboard/setup/defaultDashboardValues.ts` | Only if defaults cannot be read from manifest |

### Runtime wiring flow

1. `+layout.svelte` calls `registerWidget(manifest)` at app startup.
2. `widgetRegistry.ts` stores `kind → manifest` in a `Map`.
3. `initializeWidgetSchemas()` iterates registered manifests and calls
   `validatedTopicStore.registerSchema()` with `id = widget:${kind}-${schemaVersion}`,
   `topicPattern = widgets/${kind}/+`, and the JSON Schema derived from
   `manifest.inputSchema ?? manifest.zodSchema` via `zodToJsonSchema`.
   If `manifest.outputSchema` is present, a second registration is created
   with `id = widget:${kind}-out-${schemaVersion}` and
   `topicPattern = widgets/${kind}/+/out`.
4. `WidgetWrapper.svelte` calls `getWidgetComponent(widget.type)` to resolve the
   Svelte component from the registry; passes `StandardWidgetProps` down.
5. Widgets read data from `ValidatedTopicStore` via `useReactiveValidatedTopic`.
6. Widgets publish to output topics via `publishWidgetOutput(kind, widgetId, data)`
   (SDK helper) or directly via `host.publishWidgetOutput(kind, widgetId, data)`.

### Schema id helpers (`widgetSchemaRegistration.ts`)

| Function | Returns |
|----------|---------|
| `getWidgetSchemaId(type)` | Input schema id. Checks manifest registry first, then falls back to `widget:${type}-v1`. |
| `getWidgetOutputSchemaId(type)` | Output schema id, or `null` if the widget does not publish. |

## Bidirectional topic contract (input + output)

Widgets can both subscribe and publish to `ValidatedTopicStore`:

- **Input (subscribe)**: topic `widgets/<kind>/<widgetId>` (or `topicOverride`),
  validated against `inputSchema` (or `zodSchema` if no narrow input).
  Schema id: `widget:<kind>-<schemaVersion>`.

- **Output (publish)**: topic `widgets/<kind>/<widgetId>/out` (or custom pattern),
  validated against `outputSchema` when present.
  Schema id: `widget:<kind>-out-<schemaVersion>`.

Widgets that only consume data set `outputSchema` to `undefined` / omit it.
Widgets that produce data for other consumers (widgets, prompts, agents)
declare the output Zod schema in `defineWidget({ outputSchema })` and
describe the publish behavior in their Widget Spec.

## Related files (avoid)

- `src/lib/dashboard/services/widget-system.ts` — Legacy parallel model with
  duplicate Zod schemas and type definitions. Do not use as a reference for
  new widget development; the canonical path is `types/widget.ts` +
  `types/widgetSchemas.ts` + `@stratiqai/dashboard-widget-sdk`.
