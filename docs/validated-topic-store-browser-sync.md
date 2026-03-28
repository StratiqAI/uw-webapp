# ValidatedTopicStore, schema registration, and browser sync

This document describes the **current client-side implementation** in the `uw-webapp` SvelteKit app. It is written so another system (for example, an AWS AppSync–backed sync layer) can mirror the same **semantic model** and **change events** without guessing behavior from code.

---

## 1. ValidatedTopicStore (conceptual model)

### 1.1 Role

`ValidatedTopicStore` is an **in-memory, hierarchical state container** keyed by **topic paths** (slash-separated strings, MQTT-style). Every **publish** can be **validated** against a **JSON Schema** bound to the topic via a **topic pattern** with wildcards.

The app uses a **singleton** instance:

- Module: `src/lib/stores/validatedTopicStore.svelte.ts`
- Export: `validatedTopicStore` (barrel: `src/lib/stores/validatedTopicStore.ts`)

### 1.2 Topic paths and tree shape

- Topics are normalized (leading/trailing slashes collapsed, empty segments removed), e.g. `widgets/metric/widget-1760034597055`.
- Storage mirrors the path as nested objects: `tree.widgets.metric['widget-1760034597055'] = value`.
- **Leaf values** are typically JSON-serializable objects (widget payloads). The tree can also hold intermediate objects when multiple levels exist.

### 1.3 Wildcards (schema patterns only)

Patterns use MQTT-like wildcards:


| Token | Meaning                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------ |
| `+`   | Exactly one path segment (non-empty, no `/`).                                                          |
| `#`   | Multi-level remainder (implementation allows `#` with regex fallbacks; MQTT convention is `#` at end). |


Patterns are converted to anchored regexes. `**+` must not be escaped as a regex metacharacter** (it is a wildcard, not “one or more” in regex).

### 1.4 Schema resolution (“best match”)

When multiple patterns match a topic, the store picks the **most specific** pattern using a numeric score (exact segments score higher than `+`, which scores higher than `#`). Results are **cached per topic** until schemas change.

### 1.5 Validation (AJV)

- Validator: **AJV** with `ajv-formats`, options including `allErrors`, `useDefaults`, `coerceTypes`, `strict: false`.
- If a **matching schema exists** and validation **fails**: the value is **not** written; errors are stored in a reactive map keyed by topic; `publish` returns `false`.
- If **no schema matches**: the value is **accepted** and stored (no validation).
- If validation **passes**: value is stored, errors for that topic cleared, subscribers notified, `**onChange` emits `publish`**.

### 1.6 Primary mutations


| API                              | Behavior                                                  | `onChange`                                                       |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| `publish(topic, value): boolean` | Validates when a schema matches; updates tree on success  | `{ type: 'publish', topic, value }` on success only              |
| `delete(topic)`                  | Removes leaf key; clears errors                           | `{ type: 'delete', topic }`                                      |
| `clearAllAt(path)`               | Deletes all topics equal to `path` or prefixed by `path/` | `{ type: 'clear', path }` (single event for the clear operation) |
| `registerSchema(...)`            | See §2                                                    | `{ type: 'register-schema', registration }` for object form      |


### 1.7 Reading and reactivity

- `tree` getter: reactive root (Svelte 5 `$state`).
- `at(topic)`: read leaf by path; used in effects for fine-grained reads.
- `schemaVersion`: increments when schemas register; UI can depend on it for schema lists.
- `subscribe(pattern, callback)`: imperative wildcard subscriptions (separate from `onChange`).
- `onChange(listener)`: returns unsubscribe; used by sync and dashboard persistence glue.

### 1.8 Type: `StoreChangeEvent`

```ts
type StoreChangeEvent =
  | { type: 'publish'; topic: string; value: unknown }
  | { type: 'delete'; topic: string }
  | { type: 'clear'; path: string }
  | { type: 'register-schema'; registration: SchemaRegistration };
```

This is the **canonical stream of mutations** for any **external sync adapter** (BroadcastChannel today; AppSync tomorrow).

---

## 2. Schema registration

### 2.1 `SchemaRegistration` (object form)

```ts
interface SchemaRegistration {
  id: string;
  name: string;
  description?: string;
  source?: 'ui' | 'code' | 'ai';
  topicPattern?: string;   // if omitted: catalog-only, not used for publish() validation
  jsonSchema: JsonSchemaDefinition;
}
```

- `**topicPattern` present**: pattern is compiled with AJV; `**publish` for matching topics** is validated against `jsonSchema`. Full registration is kept in an ID catalog and pattern→registration map.
- `**topicPattern` omitted**: schema is **catalog-only** (metadata / tooling / UI); **does not** validate publishes.

### 2.2 Legacy `registerSchema(pattern, jsonSchema)`

Two-argument form registers a pattern + schema **without** adding a `SchemaRegistration` catalog entry. Prefer the object form for anything that needs stable IDs or cloud sync of schema definitions.

### 2.3 Built-in widget schemas (code)

Module: `src/lib/dashboard/setup/widgetSchemaRegistration.ts`

- `initializeWidgetSchemas()` runs once (guarded by `schemasRegistered`).
- For each built-in `WidgetType`, registers e.g.  
`id: widget:{type}-v1`, `source: 'code'`,  
`topicPattern: widgets/{type}/+`,  
JSON Schema derived from Zod via `zod-to-json-schema` (cleaned).
- Package widgets: `getRegisteredManifests()` → `widgets/{kind}/+`,  
`id: widget:{kind}-{schemaVersion}`, `source: 'code'`.

### 2.4 Widget topic naming

- Default topic: `widgets/{widgetType}/{widgetId}` (`getWidgetTopic` in the same module).
- Schemas match **per-widget instances** with `+` as the last segment.

### 2.5 UI-authored schemas

Registrations with `source === 'ui'` are treated specially by **browser sync** (§3): they are persisted to `localStorage` and broadcast to other tabs. Code-defined schemas are **not** persisted by that mechanism (they come from the app bundle).

---

## 3. Browser window and tab synchronization (`TopicStoreSync`)

Module: `src/lib/stores/topicStoreSync.ts`  
Entry: `initTopicStoreSync(validatedTopicStore)` → returns **cleanup** (unsubscribe, close channel, flush persist).

### 3.1 Responsibilities

1. **Restore** persisted state on startup.
2. **Listen** to `store.onChange` and **mirror** mutations to other tabs and to `localStorage`.
3. **Apply** remote tab messages by calling the same store APIs (so validation rules apply identically everywhere).

### 3.2 `BroadcastChannel`

- **Name:** `vts-sync` (constant `CHANNEL`).
- **Origin:** same-origin tabs/windows only (browser API limitation).

### 3.3 Message shapes (all include `sender: string`)


| `kind`            | Payload          | Local handling                                                      |
| ----------------- | ---------------- | ------------------------------------------------------------------- |
| `publish`         | `topic`, `value` | `topicSnapshot.set`; `store.publish(topic, value)`; warn if `false` |
| `delete`          | `topic`          | `topicSnapshot.delete`; `store.delete(topic)`                       |
| `clear`           | `path`           | Remove matching keys from snapshot; `store.clearAllAt(path)`        |
| `register-schema` | `registration`   | `store.registerSchema(registration)`; persist UI schemas            |


**Echo suppression:** each tab generates `sender = crypto.randomUUID()`. Incoming messages where `msg.sender === tabId` are ignored.

**Re-entrancy guard:** while applying a remote message, `isSyncing = true` so the local `onChange` handler **does not** re-broadcast (avoids loops). After handling, `isSyncing` is cleared and `schedulePersist()` runs.

### 3.4 `localStorage` keys


| Key           | Content                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `vts:data`    | JSON object: **flat** map `{ [topic: string]: value }` for every topic that has been published through the sync layer’s snapshot (see below). |
| `vts:schemas` | JSON array of `SchemaRegistration` with `source === 'ui'` only.                                                                               |


### 3.5 In-memory snapshot

`topicSnapshot: Map<string, unknown>` mirrors topics for persistence. It is updated on:

- local `publish` / `delete` / `clear` (via `onChange`),
- remote messages (before/after store calls as appropriate).

### 3.6 Persistence timing

- **Debounced** write to `vts:data` (default **500 ms**) after changes.
- `**beforeunload`**: flush immediately so a fast reload does not lose the last edits.
- **Cleanup**: flush once more.

### 3.7 Restore order

On `initTopicStoreSync`:

1. `restoreSchemas(store)` from `vts:schemas` (UI schemas only).
2. `restoreTopics(store, topicSnapshot)` from `vts:data`: for each entry, `store.publish(topic, value)`; on success, snapshot updated; failures logged (`Restore rejected by validation`).

**Important for cloud sync:** remote clients must either ship **compatible JSON Schemas** before data arrives or tolerate **rejections**; the client today **drops** invalid restored entries.

---

## 4. Application startup order (why it matters)

Root layout: `src/routes/+layout.svelte`

In the **browser**, **synchronously** during layout initialization (not deferred to `onMount`):

1. `registerWidget(...)` for package widgets (e.g. metric).
2. `initializeWidgetSchemas()`.
3. `initTopicStoreSync(validatedTopicStore)` (restore + channel + `onChange` listener).
4. Optional glue: `validatedTopicStore.onChange` → `DashboardStorage.autoSaveWidgetData()` for `widgets/...` topics and clears; then `DashboardStorage.saveWidgetDataNow()`.

**Reason:** child routes (e.g. dashboard) run `onMount` **after** the parent; initializing sync **before** child `onMount` ensures **restored topic data is already in the store** when the dashboard reads it.

---

## 5. Second persistence layer: `DashboardStorage` (dashboard workspace)

Not a duplicate of `ValidatedTopicStore`, but **tightly coupled** for widget topics:

- **File:** `src/lib/dashboard/utils/storage.ts`
- Saves a **widget data snapshot** (topic → value under `widgets/...`) into dashboard workspace `localStorage` (project-scoped keys).
- `restoreWidgetDataSnapshot(widgetData, { force? })`: republishes saved widget topics; by default **skips** topics that already exist in the store so **fresh** `vts:data` restore is not overwritten by stale workspace data. Tab switches use `**force: true`** where the dashboard clears topics first.

For **AppSync**, treat `DashboardStorage` as **layout/workspace metadata**; the **topic/value truth** for sync design should align with `**StoreChangeEvent` + `vts:data` semantics** unless you explicitly merge workspace into the cloud model.

---

## 6. Implications for AWS AppSync (handoff notes)

Use this section as **requirements hints** for a cloud mirror; it is not implemented yet.

### 6.1 What to replicate

Minimal faithful mirror of client behavior:

1. **Topic-addressed JSON documents** (path as stable string key).
2. **Same validation rules** on write (or stricter server-side schemas); clients already assume **failed publishes do not apply**.
3. **Ordering / concurrency:** client has **last-write-wins** per topic via `publish`; multi-tab uses BroadcastChannel without vector clocks. Cloud should define **conflict policy** (e.g. per-topic version, `updatedAt`, owner).
4. **Deletes and clears:** model `delete` (single topic) vs `clear` (prefix wipe) explicitly.
5. **Schemas:**
  - **Code schemas** ship with the app; cloud may only need them for **server validation** or **admin tooling**, not necessarily sync per user.
  - **UI schemas** (`source === 'ui'`) are user-created; today persisted in `vts:schemas` and broadcast; cloud likely needs **per-tenant (or per-user) schema registry** if you want multi-device UI schema authoring.

### 6.2 Suggested mapping from `StoreChangeEvent`


| Event             | GraphQL / sync sketch                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `publish`         | Upsert `TopicValue` with `topic`, `value`, `updatedAt`, optional `schemaVersion` / etag     |
| `delete`          | Delete or tombstone `TopicValue`                                                            |
| `clear`           | Batch delete/tombstone all keys with prefix `path + '/'` and exact `path` if stored as leaf |
| `register-schema` | Upsert `SchemaRegistration` record (if you sync UI schemas)                                 |


### 6.3 Auth and tenancy

Current browser sync has **no auth**: same origin only. For AppSync, every mutation should be scoped by **tenant / user / project** (your product model). Topic strings might become e.g. `tenantId/projectId/widgets/metric/widget-1` **or** those dimensions live as **separate fields** with logical topic `widgets/metric/widget-1`.

### 6.4 Subscription direction

- **Today:** push between tabs via BroadcastChannel.
- **AppSync:** **Subscriptions** (or MQTT-style mapping) can push **remote** changes into the same code path as the BroadcastChannel handler: **set `isSyncing`-like flag** (or shared “remote origin” tag) and call `store.publish` / `delete` / `clearAllAt` / `registerSchema` so **one code path** applies validation and UI updates.

### 6.5 Initial load

Mirror `restoreTopics`: after network fetch, call `publish` for each topic (or batch internal API if you add one). Handle validation failures explicitly (log, skip, or surface UI).

---

## 7. File index


| Concern                             | Path                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Store implementation                | `src/lib/stores/validatedTopicStore.svelte.ts`                                                  |
| Public re-exports                   | `src/lib/stores/validatedTopicStore.ts`                                                         |
| Browser sync                        | `src/lib/stores/topicStoreSync.ts`                                                              |
| Widget schema registration          | `src/lib/dashboard/setup/widgetSchemaRegistration.ts`                                           |
| App entry (schemas + sync order)    | `src/routes/+layout.svelte`                                                                     |
| Dashboard storage / widget snapshot | `src/lib/dashboard/utils/storage.ts`                                                            |
| Widget publish helpers              | `src/lib/dashboard/utils/widgetPublisher.ts`, `src/lib/dashboard/setup/widgetDataPublishers.ts` |
| Package widget consumption          | `packages/dashboard-widget-sdk/src/lib/hooks.svelte.ts` (`useReactiveValidatedTopic`)           |


---

## 8. Glossary


| Term                       | Meaning                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| **Topic**                  | Slash-separated path string; key for a value in the store.                        |
| **Pattern**                | Topic template with `+` / `#` used for schema binding (and imperative subscribe). |
| **Publish**                | Validate (if schema matches) → assign value → emit `onChange`.                    |
| **TopicStoreSync**         | BroadcastChannel + `localStorage` adapter for the singleton store.                |
| **vts:data / vts:schemas** | Client persistence keys for topic flat map and UI schemas.                        |


---

*Last updated to match the codebase in the `uw-webapp` repository (ValidatedTopicStore, TopicStoreSync, layout initialization, DashboardStorage coordination).*