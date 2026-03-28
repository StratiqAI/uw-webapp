# Creating a Dashboard Widget Package

This guide walks through building a new widget as a standalone npm package that installs into the StratiqAI dashboard. The `@stratiqai/widget-metric` package is the reference implementation — follow its structure exactly.

---

## Prerequisites

- Familiarity with **Svelte 5 runes** (`$props`, `$derived`, `$effect`)
- Familiarity with **Zod** for schema validation
- The `uw-webapp` repo checked out (widgets live in `packages/` as npm workspaces)

---

## Concepts

### How widgets receive data

The dashboard uses a **ValidatedTopicStore** — a reactive key-value store keyed by topic paths like `widgets/metric/widget-abc`. Each widget instance subscribes to its own topic and re-renders whenever new data is published to that topic.

The `topicOverride` prop lets a widget subscribe to a *different* topic than its default, enabling multiple widgets to share the same data source.

### The host context

Because your widget package cannot `import` app-internal modules, the dashboard injects its services (the store, topic resolver) into **Svelte context** at startup. Your widget reads them back via `getDashboardWidgetHost()` from the SDK.

### The manifest

A `WidgetManifest` is a plain object that describes everything the dashboard needs to know about your widget at registration time: its `kind` string, Zod schema, Svelte component, default data, and default grid size. You create one with `defineWidget()`.

---

## Step 1 — Create the package directory

Inside `uw-webapp/packages/`, create a folder for your widget. Use the naming convention `widget-{name}`:

```
packages/
└── widget-status/          ← your new package
    ├── package.json
    ├── svelte.config.js
    ├── tsconfig.json
    └── src/lib/
        ├── schema.ts
        ├── StatusWidget.svelte
        └── index.ts
```

---

## Step 2 — `package.json`

Copy this template and replace every `status` / `Status` with your widget name:

```json
{
  "name": "@stratiqai/widget-status",
  "version": "0.1.0",
  "type": "module",
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "svelte-package -i src/lib -o dist",
    "dev":   "svelte-package -i src/lib -o dist --watch"
  },
  "peerDependencies": {
    "svelte": "^5.0.0",
    "zod":    "^3.0.0",
    "@stratiqai/dashboard-widget-sdk": "^0.1.0"
  },
  "devDependencies": {
    "@sveltejs/package": "^2.0.0",
    "@stratiqai/dashboard-widget-sdk": "^0.1.0",
    "svelte":     "^5.0.0",
    "typescript": "^5.0.0",
    "zod":        "^3.0.0"
  }
}
```

Key points:
- `"svelte"` and `"exports"` point at the **compiled** `dist/` output, not `src/`.
- `@stratiqai/dashboard-widget-sdk` is a **peer dependency** — the host app provides the single shared copy.

---

## Step 3 — `svelte.config.js` and `tsconfig.json`

These are identical for every widget. Copy them from `packages/widget-metric/`.

**`svelte.config.js`**
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = { preprocess: vitePreprocess() };
export default config;
```

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist"
  },
  "include": ["src/lib"]
}
```

---

## Step 4 — `src/lib/schema.ts` (data contract)

Define exactly what data your widget displays using Zod. This schema is the **single source of truth** — it drives runtime validation, TypeScript types, and the data your Svelte component receives.

```typescript
// src/lib/schema.ts
import { z } from 'zod';

export const statusWidgetDataSchema = z.object({
  label:  z.string(),
  status: z.enum(['ok', 'warning', 'error']),
  detail: z.string().optional()
});

export type StatusWidgetData = z.infer<typeof statusWidgetDataSchema>;
```

Rules:
- Use `.nullable().optional()` (not just `.optional()`) for fields that may be absent or explicitly null, since the store round-trips through JSON.
- Keep the schema flat where possible — complex nested schemas increase validation overhead.
- Do **not** include layout fields (`colSpan`, `gridColumn`, etc.) — those live on the dashboard `Widget` model, not here.

---

## Step 5 — `src/lib/StatusWidget.svelte` (the component)

Your component must accept the four standard props. Import your data type from `schema.ts` and SDK hooks from `@stratiqai/dashboard-widget-sdk` — never from `$lib/...`.

```svelte
<script lang="ts">
  import type { StatusWidgetData } from './schema.js';
  import { useReactiveValidatedTopic, getDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';

  interface Props {
    data:           StatusWidgetData;  // required — initial/fallback data
    widgetId?:      string;            // instance ID set by the dashboard
    topicOverride?: string;            // optional alternative data source topic
    darkMode?:      boolean;           // passed down by the dashboard shell
  }

  let { data, widgetId = 'status-widget-default', topicOverride, darkMode = false }: Props = $props();

  // 1. Resolve which topic this instance subscribes to
  const host  = getDashboardWidgetHost();
  const topic = $derived(host.getWidgetTopic('status', widgetId, topicOverride));

  // 2. Subscribe reactively — re-renders whenever the store publishes new data
  const dataStream = useReactiveValidatedTopic<StatusWidgetData>(() => topic);

  // 3. Fall back to the prop data if the store has nothing yet
  let widgetData = $derived<StatusWidgetData>(dataStream.current || data);
</script>

<div class="h-full flex items-center gap-2 p-4">
  <span class="
    w-3 h-3 rounded-full
    {widgetData.status === 'ok'      ? 'bg-green-500' : ''}
    {widgetData.status === 'warning' ? 'bg-yellow-500' : ''}
    {widgetData.status === 'error'   ? 'bg-red-500' : ''}
  "></span>
  <span class="{darkMode ? 'text-slate-200' : 'text-slate-800'} font-medium">
    {widgetData.label}
  </span>
  {#if widgetData.detail}
    <span class="{darkMode ? 'text-slate-400' : 'text-slate-500'} text-sm">
      — {widgetData.detail}
    </span>
  {/if}
</div>
```

Important rules:
- **Never** import from `$lib/...` — that path only works inside the host app.
- Pass `'status'` (your `kind`) as the first argument to `host.getWidgetTopic()`.
- Always use `dataStream.current || data` as the fallback pattern so the widget renders immediately with prop data before the store delivers live updates.
- Tailwind classes work because the host app compiles the Svelte files from `node_modules` via the `ssr.noExternal` Vite setting.

---

## Step 6 — `src/lib/index.ts` (the manifest)

This is the package's public API. It exports the manifest (which the host app imports to register the widget) plus re-exports the schema types so consuming code can be typed correctly.

```typescript
// src/lib/index.ts
import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { statusWidgetDataSchema } from './schema.js';
import StatusWidget from './StatusWidget.svelte';

export const statusWidget = defineWidget({
  kind:        'status',              // unique string — must be lowercase, no spaces
  displayName: 'Status Widget',       // shown in the UI
  zodSchema:   statusWidgetDataSchema,
  component:   StatusWidget,
  defaultData: { label: 'Status', status: 'ok' },  // valid per your schema
  defaultSize: { colSpan: 3, rowSpan: 1 }           // grid cells (max 12 cols)
});

export { statusWidgetDataSchema, type StatusWidgetData } from './schema.js';
export { default as StatusWidget } from './StatusWidget.svelte';
```

`kind` is the key identifier used everywhere — topic paths, schema IDs, the `WidgetType` union. Choose it carefully; changing it later is a breaking change.

---

## Step 7 — Build the package

From inside your package directory:

```bash
npm run build
```

This runs `svelte-package`, which compiles `.svelte` files and TypeScript into `dist/`. You must rebuild after any source change before the host app sees the updates. For active development, use `npm run dev` to watch for changes.

---

## Step 8 — Register the widget in the host app

Open `src/routes/+layout.svelte` in `uw-webapp` and add two lines alongside the existing metric widget registration:

```svelte
<script lang="ts">
  // ... existing imports ...
  import { registerWidget } from '$lib/dashboard/setup/widgetRegistry';
  import { metricWidget } from '@stratiqai/widget-metric';
  import { statusWidget } from '@stratiqai/widget-status';  // ← add this

  registerWidget(metricWidget);
  registerWidget(statusWidget);   // ← add this
  // ...
</script>
```

This must run at module level (not in `onMount`) so the widget is registered before `initializeWidgetSchemas()` runs.

---

## Step 9 — Add to the `WidgetType` union (Phase 1)

While the dashboard `WidgetType` union is still closed, add your `kind` to it in `src/lib/dashboard/types/widget.ts`:

```typescript
// widget.ts
import type { MetricWidgetData } from '@stratiqai/widget-metric';
import type { StatusWidgetData } from '@stratiqai/widget-status';  // ← add

export type WidgetType =
  | 'metric'
  | 'status'          // ← add your kind
  | 'table'
  // ...

export interface StatusWidget extends BaseWidget {
  type: 'status';
  data: StatusWidgetData;   // ← import from the package, not redefined here
}

export type Widget =
  | MetricWidget
  | StatusWidget    // ← add to the union
  // ...
```

> **Phase 2 note:** A future update will open the union to arbitrary string kinds, removing this step. Check the plan for current status.

---

## Step 10 — Vite config

If your package name is not already covered, add it to `ssr.noExternal` in `vite.config.ts`:

```typescript
ssr: {
  noExternal: [
    '@stratiqai/dashboard-widget-sdk',
    '@stratiqai/widget-metric',
    '@stratiqai/widget-status'   // ← add
  ]
}
```

This is required so Vite compiles Svelte files found inside `node_modules/@stratiqai/` during SSR, rather than treating them as pre-built externals.

---

## Reference: SDK exports

Everything a widget package needs comes from `@stratiqai/dashboard-widget-sdk`:

| Export | Description |
|--------|-------------|
| `defineWidget(config)` | Creates a typed `WidgetManifest`. Call once in `index.ts`. |
| `getDashboardWidgetHost()` | Returns the host context (store + topic resolver). Call in component script. |
| `useReactiveValidatedTopic<T>(topicFn)` | Reactive hook. Returns `{ current: T \| undefined }`. |
| `setDashboardWidgetHost(host)` | Called by the dashboard — widget authors do not use this. |
| `StandardWidgetProps<TData>` | Interface for the four standard props. Your Props interface should match it. |
| `WidgetManifest<TData>` | Type of the object returned by `defineWidget()`. |

---

## Checklist

- [ ] `packages/widget-{name}/` created with `package.json`, `svelte.config.js`, `tsconfig.json`
- [ ] `schema.ts` — Zod schema + inferred `TypeName` type exported
- [ ] `YourWidget.svelte` — accepts four standard props, uses `getDashboardWidgetHost()` + `useReactiveValidatedTopic()`
- [ ] `index.ts` — exports manifest via `defineWidget()`, re-exports schema type and component
- [ ] `npm run build` succeeds from the package directory
- [ ] `registerWidget(yourWidget)` added to `+layout.svelte` (module level)
- [ ] `'your-kind'` added to `WidgetType` union in `widget.ts`
- [ ] `YourWidget` interface added to `widget.ts` with `data: YourWidgetData`
- [ ] Union member added to `Widget` type in `widget.ts`
- [ ] Package added to `ssr.noExternal` in `vite.config.ts`
- [ ] `npm run check` in `uw-webapp` passes with no new errors
