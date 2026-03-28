# mapObjectStore Removal Checklist

## Status: ✅ Ready for Removal

All production code has been migrated from `mapObjectStore` to `MapStore`. The remaining references are in demo/example files and documentation.

## Remaining References Analysis

### ✅ Production Code (src/lib) - ALL MIGRATED
- ✅ `DashboardControls.svelte` - Migrated
- ✅ `dashboard.svelte.ts` - Migrated
- ✅ `storage.ts` - Migrated
- ✅ `widgetBridge.ts` - Migrated
- ✅ `MapStoreDebugWidget.svelte` - Migrated

### ⚠️ Demo/Example Scripts (scripts/) - NOT USED IN PRODUCTION
These are standalone demo files that can be:
1. **Migrated** to use MapStore (if you want to keep them)
2. **Deleted** (if they're just examples)
3. **Left as-is** (if they're for reference only)

Files:
- `scripts/mapObjectStoreDemo.ts` - Demo file
- `scripts/msoDemo.ts` - Demo file
- `scripts/paragraphWidgetDemo.ts` - Demo file
- `scripts/aiwidgetPC.ts` - Demo file
- `scripts/mapObjectStore.ts` - Local copy (not used)

**Note:** These scripts are NOT imported by the application. They're standalone demo files.

### 📝 Documentation/Comments - SAFE TO UPDATE
These are just references in comments or documentation:
- `src/lib/stores/mapObjectStore.md` - Documentation file
- Various `.md` files mentioning mapObjectStore in examples
- Comments in code files

## Removal Steps

### Step 1: Verify No Production Imports
```bash
# Search for actual imports in production code
grep -r "from.*mapObjectStore" src/lib/
grep -r "import.*mapObjectStore" src/lib/
```

**Expected Result:** Should find NO matches (all migrated)

### Step 2: Handle Demo Scripts (Optional)
You have three options:

**Option A: Delete Demo Scripts** (Recommended if not needed)
```bash
rm scripts/mapObjectStoreDemo.ts
rm scripts/msoDemo.ts
rm scripts/paragraphWidgetDemo.ts
rm scripts/aiwidgetPC.ts
rm scripts/mapObjectStore.ts
```

**Option B: Migrate Demo Scripts** (If you want to keep them)
Update imports in these files to use `MapStore` instead.

**Option C: Leave As-Is** (If they're for reference)
Keep them but note they're outdated examples.

### Step 3: Remove mapObjectStore.ts
```bash
rm src/lib/stores/mapObjectStore.ts
```

### Step 4: Update Documentation
- Update `mapObjectStore.md` to note it's deprecated
- Or delete it if no longer needed
- Update any other docs that reference it

### Step 5: Update Comments
Search and update any remaining comments that mention mapObjectStore:
```bash
# Find comments mentioning mapObjectStore
grep -r "mapObjectStore" src/ --include="*.ts" --include="*.svelte"
```

## Verification Checklist

Before removing:
- [ ] Run application and verify everything works
- [ ] Check browser console for errors
- [ ] Test dashboard functionality
- [ ] Test widget data flow
- [ ] Verify storage/restore works
- [ ] Check multi-tab sync (if applicable)

After removing:
- [ ] Run `npm run build` - should succeed
- [ ] Run `npm run check` - should pass
- [ ] Search for any remaining references
- [ ] Update this checklist to mark complete

## Current Status

✅ **Production Code:** 100% migrated  
⚠️ **Demo Scripts:** 4 files still reference (not used in production)  
📝 **Documentation:** References exist but don't affect runtime

## Recommendation

**Safe to remove `src/lib/stores/mapObjectStore.ts` immediately.**

The demo scripts in `scripts/` can be:
- Deleted if not needed
- Left as-is if they're just examples
- Migrated later if you want to update them

## Files to Remove

### Required (Production Code)
- ✅ `src/lib/stores/mapObjectStore.ts` - **SAFE TO DELETE**

### Optional (Demo Scripts)
- `scripts/mapObjectStoreDemo.ts` - Demo only
- `scripts/msoDemo.ts` - Demo only
- `scripts/paragraphWidgetDemo.ts` - Demo only
- `scripts/aiwidgetPC.ts` - Demo only
- `scripts/mapObjectStore.ts` - Local copy, not used

### Documentation
- `src/lib/stores/mapObjectStore.md` - Can be archived or deleted

## Summary

**Answer:** Yes, `mapObjectStore.ts` can be safely removed from production code. The only remaining references are in:
1. Demo/example scripts (not used in production)
2. Documentation files (don't affect runtime)
3. Comments (don't affect runtime)

**Action:** Delete `src/lib/stores/mapObjectStore.ts` now. Handle demo scripts separately based on your needs.
