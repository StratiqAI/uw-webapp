# Widget Spec: `<kind>`

Fill in every section below before writing code. Sections marked **(required)**
must be completed; sections marked **(if applicable)** may be set to "N/A".

Reference: `docs/WIDGET_PACKAGE_ARCHITECTURE.md`

---

## 1. Identity (required)

| Field            | Value |
|------------------|-------|
| `kind`           | `<!-- camelCase, e.g. myWidget -->` |
| npm package      | `@stratiqai/widget-<kind>` |
| `displayName`    | `<!-- Human-readable, e.g. "My Widget" -->` |
| `schemaVersion`  | `v1` |
| Bump policy      | Increment when input or output JsonSchema changes in a breaking way |
| Palette icon     | `<!-- emoji or icon key, e.g. 📊 -->` |
| Palette category | `<!-- e.g. charts, data, content, financial -->` |

---

## 2. Input JsonSchema — subscribe (required)

The shape of payloads this widget **consumes** from `ValidatedTopicStore`.

**Schema id**: `widget:<kind>-<schemaVersion>` (e.g. `widget:myWidget-v1`)

**Topic pattern**: `widgets/<kind>/+` (default) or custom override.

**Zod definition** (paste the schema that will live in `src/lib/schema.ts`):

```typescript
import { z } from 'zod';

export const myWidgetInputSchema = z.object({
  // field: z.string(),
});

export type MyWidgetInput = z.infer<typeof myWidgetInputSchema>;
```

**Equivalent JSON Schema** (generated via `zodToJsonSchema`; include for
cross-system reference — OpenAI structured output, stream catalog, etc.):

```json
{
  "type": "object",
  "properties": {
  },
  "required": []
}
```

**Does `inputSchema` differ from `zodSchema` (full widget config)?**

- [ ] Yes — `inputSchema` is a narrow subset; `zodSchema` includes additional
  persisted config fields. Describe the mapping below.
- [ ] No — `inputSchema` and `zodSchema` are the same shape.

If yes, describe which fields are input-only vs config-only:

> <!-- e.g. "inputSchema has city/state/zip; zodSchema adds year, sortOrder" -->

---

## 3. Output JsonSchema — publish (required; set to "None" if subscribe-only)

The shape of payloads this widget **produces** (publishes to `ValidatedTopicStore`).

**Publishes?**  [ ] Yes  [ ] No (subscribe-only)

If No, write "None — this widget is subscribe-only" and skip to section 4.

If Yes:

**Schema id**: `widget:<kind>-out-<schemaVersion>` (e.g. `widget:myWidget-out-v1`)

**Output topic pattern**: `widgets/<kind>/<widgetId>/out` (default) or custom.

**Write mode**:  [ ] `publish` (full document replace)  [ ] `patch` (merge into existing)

If `patch`, describe the merge shape:

> <!-- e.g. "Patches { selectedRows: string[] } into the existing topic value" -->

**Zod definition**:

```typescript
export const myWidgetOutputSchema = z.object({
  // outputField: z.string(),
});

export type MyWidgetOutput = z.infer<typeof myWidgetOutputSchema>;
```

**Equivalent JSON Schema**:

```json
{
  "type": "object",
  "properties": {
  },
  "required": []
}
```

**When does the widget publish?**

> <!-- e.g. "On user row-selection change", "Continuously as data loads", "On explicit 'Apply' button click" -->

**Intended consumers** (who subscribes to this widget's output?):

> <!-- e.g. "Other widgets filtering by this widget's selection", "AI agent reading user choices" -->

---

## 4. Topic / stream contract — bidirectional (required)

### Inbound (subscribe)

| Key               | Value |
|-------------------|-------|
| Default topic     | `widgets/<kind>/<widgetId>` |
| Schema id         | `widget:<kind>-<schemaVersion>` |
| Stream-compatible | <!-- Can AI prompt streams target this widget? Yes/No --> |

If stream-compatible, the `SendToDashboardModal` checks schema compatibility
via `checkSchemaCompatibility('widget:<kind>-v1', stream.schemaId)`.

### Outbound (publish)

| Key               | Value |
|-------------------|-------|
| Output topic      | `widgets/<kind>/<widgetId>/out` or N/A |
| Schema id         | `widget:<kind>-out-<schemaVersion>` or N/A |

Describe which other widgets or agents may subscribe to this output and how
they discover it (schema id lookup in the catalog):

> <!-- e.g. "The LQ Analysis widget reads this widget's output to filter sectors" -->

---

## 5. UI behavior (required)

| Aspect            | Description |
|-------------------|-------------|
| Readonly / editable | <!-- Does the user edit data directly in the widget? --> |
| Configure flow    | <!-- Uses onConfigureReady? Flip-card? Modal? --> |
| External data     | <!-- Uses useExternalData? Which host services (Supabase, fetch)? --> |
| Theming           | <!-- Responds to darkMode / theme prop? --> |
| Publish triggers  | <!-- Which user actions cause a publish to output topic? --> |

---

## 6. Layout (required)

| Field          | Value |
|----------------|-------|
| `defaultSize`  | `{ colSpan: ?, rowSpan: ? }` |
| `minWidth`     | <!-- grid units or omit --> |
| `minHeight`    | <!-- grid units or omit --> |
| `maxWidth`     | <!-- grid units or omit --> |
| `maxHeight`    | <!-- grid units or omit --> |

---

## 7. Host integration checklist (required)

After building the widget package, complete these host-side steps:

- [ ] Add `@stratiqai/widget-<kind>` as a workspace dependency
- [ ] `src/routes/+layout.svelte` — import manifest, call `registerWidget(...)`
- [ ] `src/lib/dashboard/types/widget.ts` — add `'<kind>'` to `WidgetType`; add
  discriminated interface extending `BaseWidget`; add to `Widget` union
- [ ] `src/lib/dashboard/components/DashboardControls.svelte` — add entry to
  `widgetTypes` array and `createDefaultWidget` switch branch
- [ ] `src/lib/dashboard/setup/defaultDashboardValues.ts` — add default data
  and size entries (or verify manifest defaults are sufficient)
- [ ] **(If output schema exists)** Register output schema in
  `initializeWidgetSchemas()` with id `widget:<kind>-out-<schemaVersion>` and
  topic pattern for publish path
- [ ] **(If AI structured output)** Add input schema to
  `src/lib/dashboard/types/widgetSchemas.ts` `WidgetDataSchemas` map and
  extend `WidgetDataTypeMap`
- [ ] Verify `getWidgetSchemaId` / `WidgetWrapper` resolve this kind via
  `getWidgetManifest` (no try/catch fallthrough to `null`)

### Done-when criteria

- [ ] `npm run build` succeeds in `packages/widget-<kind>`
- [ ] `npm run check` succeeds in `uw-webapp` root
- [ ] Widget appears in the "Add Widget" palette and renders with default data
- [ ] Topic store subscribe works (widget reacts to published input)
- [ ] **(If output)** Publish smoke test: output topic receives validated data

---

## 8. Out of scope (if applicable)

List anything explicitly excluded from this widget:

> <!-- e.g. "No new GraphQL types", "No Supabase RPC", "No backend Lambda" -->

---

## 9. Default data (required)

Paste the `defaultData` value that `defineWidget()` will use. It must pass the
`zodSchema` validation:

```typescript
const defaultData = {
  // ...
};
```

---

## 10. Capabilities / host services (if applicable)

List host services this widget requires at runtime:

| Service name | Purpose |
|-------------|---------|
| <!-- e.g. `supabase` --> | <!-- e.g. "Query QCEW data via RPC" --> |
