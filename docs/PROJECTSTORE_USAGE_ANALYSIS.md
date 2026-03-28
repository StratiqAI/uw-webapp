# ProjectStore Usage Analysis

## Current Status

### ✅ Migrated to `projectStore.svelte.ts`
- `src/routes/projects/workspace/[projectId]/+layout.svelte` - **Fully migrated**
  - Uses: `projectStore.entity`, `projectStore.set()`
  - Pattern: `let project = $derived(projectStore.entity);`

### ⚠️ Still Using Old `appStateStore.ts` (needs migration)

**Files importing from old store:**
1. `src/lib/dashboard/examples/AIJobParagraphExample.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`
   - Usage: `const currentProject = $derived($projectStore);`

2. `src/lib/dashboard/examples/AIJobParagraphExample copy.svelte`
   - Same as above

3. `src/lib/dashboard/components/widgets/ParagraphWidget.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`
   - Usage: `$projectStore`, `$projectStore?.vectorStoreId`

4. `src/lib/dashboard/components/widgets/BetterParagraphWidget.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`

5. `src/lib/components/Upload/UploadArea copy.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`

6. `src/lib/components/Upload/UploadArea copy 2.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`

7. `src/lib/components/Upload/claude.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`

8. `src/routes/projects/workspace/[projectId]/get-started/+page.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore.js';`

9. `src/routes/projects/workspace/[projectId]/document-analysis/+page.svelte`
   - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`
   - Usage: `let project = $derived($projectStore);`, `$projectStore`

10. `src/routes/projects/workspace/[projectId]/reports/+page.svelte`
    - Import: `import { project as projectStore } from '$lib/stores/appStateStore.js';`

11. `src/routes/projects/workspace/[projectId]/insights/+page.svelte`
    - Import: `import { project as projectStore } from '$lib/stores/appStateStore.js';`

12. `src/routes/projects/workspace/[projectId]/investment-analysis/+page.svelte`
    - Import: `import { project as projectStore } from '$lib/stores/appStateStore.js';`

13. `src/routes/projects/workspace/[projectId]/document-analysis/page-orig.svelte`
    - Import: `import { project as projectStore, documents as documentsStore } from '$lib/stores/appStateStore';`

14. `src/routes/projects/workspace/[projectId]/ai-data-labeling/+page.svelte`
    - Import: `import { project as projectStore } from '$lib/stores/appStateStore';`

## Usage Patterns

### Old Pattern (Svelte Store with `$` syntax)
```typescript
import { project as projectStore } from '$lib/stores/appStateStore';

// In component
let project = $derived($projectStore);
const currentProject = $projectStore;
const vectorStoreId = $projectStore?.vectorStoreId;
```

### New Pattern (Rune-based, direct access)
```typescript
import { projectStore } from '$lib/stores/projectStore.svelte';

// In component
let project = $derived(projectStore.entity);
const currentProject = projectStore.entity;
const vectorStoreId = projectStore.entity?.vectorStoreId;
```

## Migration Guide

### Step 1: Update Import
```typescript
// OLD
import { project as projectStore } from '$lib/stores/appStateStore';

// NEW
import { projectStore } from '$lib/stores/projectStore.svelte';
```

### Step 2: Update Usage
```typescript
// OLD - Svelte store syntax
let project = $derived($projectStore);
const currentProject = $projectStore;
const vectorStoreId = $projectStore?.vectorStoreId;

// NEW - Rune-based direct access
let project = $derived(projectStore.entity);
const currentProject = projectStore.entity;
const vectorStoreId = projectStore.entity?.vectorStoreId;
```

### Step 3: Update Method Calls
```typescript
// OLD
setProject(newProject);
updateProject(updates);
setDocuments(docs);
addDocument(doc);

// NEW (still works via backward compatibility, but prefer direct access)
projectStore.set(newProject);
projectStore.update(updates);
projectStore.setCollection(docs);
projectStore.addToCollection(doc);
```

## Files That Need Migration

### High Priority (Core Application)
1. ✅ `src/routes/projects/workspace/[projectId]/+layout.svelte` - **DONE**
2. `src/routes/projects/workspace/[projectId]/document-analysis/+page.svelte`
3. `src/routes/projects/workspace/[projectId]/get-started/+page.svelte`
4. `src/routes/projects/workspace/[projectId]/reports/+page.svelte`
5. `src/routes/projects/workspace/[projectId]/insights/+page.svelte`
6. `src/routes/projects/workspace/[projectId]/investment-analysis/+page.svelte`
7. `src/routes/projects/workspace/[projectId]/ai-data-labeling/+page.svelte`

### Medium Priority (Components)
8. `src/lib/dashboard/components/widgets/ParagraphWidget.svelte`
9. `src/lib/dashboard/components/widgets/BetterParagraphWidget.svelte`
10. `src/lib/components/Upload/claude.svelte`

### Low Priority (Examples/Copies)
11. `src/lib/dashboard/examples/AIJobParagraphExample.svelte`
12. `src/lib/dashboard/examples/AIJobParagraphExample copy.svelte`
13. `src/lib/components/Upload/UploadArea copy.svelte`
14. `src/lib/components/Upload/UploadArea copy 2.svelte`
15. `src/routes/projects/workspace/[projectId]/document-analysis/page-orig.svelte` (old page)

## Special Cases

### Documents Collection
Some files import `documents` separately:
```typescript
// OLD
import { documents as documentsStore } from '$lib/stores/appStateStore';
let documents = $derived($documentsStore);

// NEW
import { projectStore } from '$lib/stores/projectStore.svelte';
let documents = $derived(projectStore.collection);
```

### Helper Functions
Project-specific helper functions are available:
```typescript
import {
  addProjectDocumentLink,
  updateProjectDocumentLink,
  removeProjectDocumentLink,
  setProjectDocumentLinks
} from '$lib/stores/projectStore.svelte';
```

## Summary

- **Total files using project store:** 15
- **Migrated:** 1 (7%)
- **Needs migration:** 14 (93%)
- **Pattern:** Most use `$projectStore` syntax which needs to change to `projectStore.entity`

The migration is straightforward - update imports and change `$projectStore` to `projectStore.entity`.
