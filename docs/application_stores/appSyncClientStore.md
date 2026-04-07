# AppSync Client Store

This page is superseded by the consolidated guide:

**[AppSync realtime & ValidatedTopicStore](../AppSync-realtime-and-ValidatedTopicStore.md)**

That document covers:

- `appSyncClientStore` (`ensureConnection`, `addSubscription`, `removeSubscription`, …)
- Both `AppSyncWsClient` implementations and when to use each
- `SubscriptionSpec`, `TAppSyncWsClient`, and types from `websocket/types.ts`
- How subscription handlers feed **`ValidatedTopicStore`**
- Ontology Graph subscription wiring (`onInstanceUpdated`, topic conventions)

The sections below are **deprecated**; they remain as a quick orientation only.

---

## Deprecated summary

`appSyncClientStore` provides a **singleton** [`AppSyncWsClient`](../../src/lib/services/realtime/websocket/AppSyncWsClient.ts) using `PUBLIC_GRAPHQL_HTTP_ENDPOINT` and Cognito `idToken`. Prefer importing from `$lib/stores/appSyncClientStore` rather than instantiating the client directly.

**Typical usage:** `await ensureConnection(idToken)` → `await addSubscription(idToken, spec)` → on unmount `removeSubscription(spec)` with the **same spec reference**.

See the [consolidated doc §5](../AppSync-realtime-and-ValidatedTopicStore.md#5-appsyncclientstore-recommended-entry-point) for the full API table and examples.
