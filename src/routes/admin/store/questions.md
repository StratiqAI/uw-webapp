# Questions

## 1. `registerSchema()` Overloads

> The `registerSchema()` function is now overloaded to accept either a `SchemaRegistration` object or the legacy `(pattern, schema)` signature.
>
> **Question:**  
> What parts of the codebase still depend on the legacy `(pattern, schema)` signature?

---

## 2. `getSchemaById()` vs `getJsonSchemaById()`

> **Question:**  
> What is the functional difference between `getSchemaById()` and `getJsonSchemaById()`?  
> When should each be used?

---

## 3. Barrel Export Update in `validatedTopicStore.ts`

> **Statement:**  
> The barrel re-export in `validatedTopicStore.ts` was updated to also export the type and fix the `.svelte.ts` extension issue.
>
> **Question:**  
> What effects does this change have? What is the `.svelte.ts` extension issue referring to?