# Widget Spec: `lqAnalysis`

Reference: `docs/WIDGET_PACKAGE_ARCHITECTURE.md`

---

## 1. Identity

| Field            | Value |
|------------------|-------|
| `kind`           | `lqAnalysis` |
| npm package      | `@stratiqai/widget-lq-analysis` |
| `displayName`    | `LQ Analysis` |
| `schemaVersion`  | `v1` |
| Bump policy      | Increment when input or output JsonSchema changes in a breaking way |
| Palette icon     | 📍 |
| Palette category | `financial` |

---

## 2. Input JsonSchema -- subscribe

The shape of payloads this widget **consumes** from the topic store. This is the
narrow "trigger" shape -- other widgets or AI prompts publish a city/state pair
and the LQ widget reacts by loading data for that location.

**Schema id**: `widget:lqAnalysis-v1`

**Topic pattern**: `widgets/lqAnalysis/+`

**Fields**:

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `city`  | string | yes      | City name, e.g. "Portland" |
| `state` | string | yes      | Two-letter state abbreviation, e.g. "OR" |
| `zip`   | string | no       | ZIP code -- optional additional hint for FIPS resolution |

**Does `inputSchema` differ from the full widget config?**

Yes -- `inputSchema` is a narrow subset of only the location fields (`city`,
`state`, `zip`). The full config (`zodSchema`) adds display/analysis settings
that only the widget itself manages:

- `areaFips` -- manual FIPS override
- `year` -- data year
- `regionLabel` -- display label
- `sortOrder` -- how the sector list is sorted
- `exportBaseThreshold` -- LQ cutoff for "export base" classification
- `localBandLow` / `localBandHigh` -- LQ range for "meets local" classification

---

## 3. Output JsonSchema -- publish

**Publishes?** No -- this widget is subscribe-only.

None -- this widget is subscribe-only. It consumes a city/state input, fetches
LQ data from Supabase, and renders results. It does not publish data for other
widgets or agents to consume.

---

## 4. Topic / stream contract -- bidirectional

### Inbound (subscribe)

| Key               | Value |
|-------------------|-------|
| Default topic     | `widgets/lqAnalysis/<widgetId>` |
| Schema id         | `widget:lqAnalysis-v1` |
| Stream-compatible | Yes -- an AI prompt stream can target this widget by publishing `{ city, state }` |

### Outbound (publish)

| Key               | Value |
|-------------------|-------|
| Output topic      | N/A |
| Schema id         | N/A |

---

## 5. UI behavior

| Aspect            | Description |
|-------------------|-------------|
| Readonly / editable | **Readonly display** with configurable parameters. The user does not edit sector data directly -- they configure which region/year to analyze. |
| Configure flow    | **Flip-card.** Uses `onConfigureReady` to register a toggle. Clicking "Configure" flips the card to show a form with city, state, preset MSA, custom FIPS, year, sort order, export base threshold, and local band range. "Apply" saves; "Cancel" discards. |
| External data     | **Yes** -- uses `useExternalData` with the Supabase host service. Calls `resolveAreaFips()` to look up the MSA FIPS code from city/state, then `loadLocationQuotientData()` to fetch QCEW sector data via Supabase RPC. |
| Theming           | Yes -- responds to `darkMode` prop. All text, backgrounds, borders, and bar colors adapt between light and dark palettes. |
| Publish triggers  | N/A (subscribe-only) |

**Front face shows:**
- Header with region label and BLS QCEW attribution
- Region preset dropdown and sort-order dropdown
- Four summary metric cards: Base industries count, Avg export LQ, Top sector name, Total local employment
- Scrollable bar chart of all NAICS sectors with diverging bars centered on LQ = 1.0
- Color-coded badges: green "Export base", blue "Meets local", amber "Import dependent"
- Legend and methodology footnote

**Back face (configure) shows:**
- City / State text fields
- Preset MSA dropdown (auto-fills city, state, FIPS, label)
- Custom FIPS code override field
- Year selector
- Region display label
- Sort order dropdown
- Export base threshold, local band low, local band high numeric fields
- Cancel / Apply buttons

---

## 6. Layout

| Field          | Value |
|----------------|-------|
| `defaultSize`  | `{ colSpan: 12, rowSpan: 4 }` |
| `minWidth`     | 1 (shared base) |
| `minHeight`    | 1 (shared base); CSS `min-h-[320px]` on the flip container |
| `maxWidth`     | -- |
| `maxHeight`    | -- |

This widget is designed to span the full width of the dashboard (12 columns)
with 4 rows of height to accommodate the summary cards and sector bar chart.

---

## 7. Host integration checklist

- [x] Add `@stratiqai/widget-lq-analysis` as a workspace dependency
- [x] `src/routes/+layout.svelte` -- import manifest, call `registerWidget(lqAnalysisWidget)`
- [x] `src/lib/dashboard/types/widget.ts` -- `'lqAnalysis'` in `WidgetType`; `LqAnalysisWidgetDef` interface; added to `Widget` union
- [x] `src/lib/dashboard/components/DashboardControls.svelte` -- palette entry and `createDefaultWidget` switch branch
- [x] `src/lib/dashboard/setup/defaultDashboardValues.ts` -- default data and size entries
- [ ] **(If output schema exists)** N/A -- no output schema
- [x] **(If AI structured output)** Input schema added to `widgetSchemas.ts` `WidgetDataSchemas` map and `WidgetDataTypeMap`
- [x] `getWidgetSchemaId` / `WidgetWrapper` resolve this kind via `getWidgetManifest`

### Done-when criteria

- [x] `npm run build` succeeds in `packages/widget-lq-analysis`
- [x] `npm run check` succeeds in `uw-webapp` root
- [x] Widget appears in the "Add Widget" palette and renders with default data
- [x] Topic store subscribe works (widget reacts to published `{ city, state }` input)
- [ ] **(If output)** N/A -- subscribe-only

---

## 8. Out of scope

- No new GraphQL types required
- No backend Lambda -- data comes from Supabase RPC directly
- No output publishing to other widgets

---

## 9. Default data

```json
{
  "city": "Portland",
  "state": "OR",
  "year": 2025,
  "regionLabel": "Portland-Vancouver-Hillsboro, OR-WA",
  "sortOrder": "lq_desc",
  "exportBaseThreshold": 1.08,
  "localBandLow": 0.92,
  "localBandHigh": 1.08
}
```

---

## 10. Capabilities / host services

| Service name | Purpose |
|-------------|---------|
| `supabase`  | Resolve city/state to MSA FIPS code via `resolveAreaFips()`, then fetch QCEW location quotient sector data via `loadLocationQuotientData()` Supabase RPC |
