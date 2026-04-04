# Migration to OpenAI Text Format - Summary

## What Changed?

The codebase has been updated to use OpenAI's **recommended text format** approach for structured outputs instead of the deprecated `response_format` method.

---

## Quick Comparison

### ❌ Before (Deprecated)

```typescript
import { getWidgetOpenAIConfig } from '$lib/dashboard/types/widgetSchemas';

const openAIConfig = getWidgetOpenAIConfig('paragraph');

const jobInput = {
  request: JSON.stringify({
    prompt: 'Generate content',
    response_format: openAIConfig
  }),
  priority: 'HIGH'
};
```

### ✅ After (Current)

```typescript
import { getWidgetTextFormat } from '$lib/dashboard/types/widgetSchemas';

const textFormat = getWidgetTextFormat('paragraph');

const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: 'Generate content' }
    ],
    text: { format: textFormat }
  }),
  priority: 'HIGH'
};
```

---

## Files Modified

### 1. **widgetSchemas.ts**
- ✅ Added `import { zodTextFormat } from 'openai/helpers/zod'`
- ✅ Added `OpenAITextFormatConfig` interface
- ✅ Added `getWidgetTextFormat()` function (new recommended method)
- ⚠️ Deprecated `getWidgetOpenAIConfig()` (still available for backward compatibility)

### 2. **AIJobParagraphExample.svelte**
- ✅ Changed to use `getWidgetTextFormat()`
- ✅ Updated job input structure to use `text: { format }`
- ✅ Added `model` field
- ✅ Changed `input` to message array format

### 3. **WidgetJobIntegration.svelte**
- ✅ Changed to use `getWidgetTextFormat()`
- ✅ Updated job input structure
- ✅ Updated comments to reflect new approach

### 4. **QuickStartExample.svelte**
- ✅ Changed to use `getWidgetTextFormat()`
- ✅ Updated job input structure

### 5. **README_AI_JOB_PRODUCER.md**
- ✅ Updated all examples to show text format
- ✅ Updated step-by-step guide
- ✅ Updated summary section

### 6. **New Documentation**
- ✅ Created `OPENAI_TEXT_FORMAT_GUIDE.md` - Complete guide with examples
- ✅ Created `MIGRATION_TO_TEXT_FORMAT.md` - This file

---

## Key Changes

### 1. Import Change

```typescript
// Old
import { getWidgetOpenAIConfig } from '$lib/dashboard/types/widgetSchemas';

// New
import { getWidgetTextFormat } from '$lib/dashboard/types/widgetSchemas';
```

### 2. Format Generation

```typescript
// Old
const openAIConfig = getWidgetOpenAIConfig('paragraph', 'Name', 'Description');

// New
const textFormat = getWidgetTextFormat('paragraph', 'Name');
```

### 3. Job Input Structure

```typescript
// Old
const jobInput = {
  request: JSON.stringify({
    prompt: 'Your prompt',
    instructions: 'Your instructions',
    response_format: openAIConfig
  }),
  priority: 'HIGH'
};

// New
const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: 'Your instructions' },
      { role: 'user', content: 'Your prompt' }
    ],
    text: {
      format: textFormat
    }
  }),
  priority: 'HIGH'
};
```

---

## Output Format Difference

### Old Format (response_format)

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "ParagraphContent",
    "description": "...",
    "schema": {
      "$ref": "#/definitions/ParagraphContent",
      "definitions": {
        "ParagraphContent": {
          "type": "object",
          "properties": { ... }
        }
      }
    }
  }
}
```

### New Format (text.format)

```json
{
  "type": "json_schema",
  "name": "ParagraphContent",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "content": { "type": "string" },
      "markdown": { "type": "boolean" }
    },
    "required": ["content"],
    "additionalProperties": false
  }
}
```

**Key differences:**
- ❌ No nested `$ref` and `definitions`
- ✅ Flatter, cleaner structure
- ✅ Matches OpenAI's official recommendation
- ✅ Automatic `strict: true`

---

## Benefits of New Approach

1. **✅ Official OpenAI Recommendation**
   - Uses `zodTextFormat` from OpenAI SDK
   - Follows best practices from OpenAI docs

2. **✅ Cleaner Schema Structure**
   - No nested references
   - Easier to debug
   - More readable

3. **✅ Better Type Safety**
   - Automatic strict mode
   - Reliable structured outputs
   - Reduced parsing errors

4. **✅ Consistent with Backend**
   - Matches pattern used in `bestSearch.js`
   - Same approach across frontend and backend

5. **✅ Future Proof**
   - Aligned with OpenAI's direction
   - Less likely to need changes

---

## Backward Compatibility

The old `getWidgetOpenAIConfig()` function is still available but deprecated:

```typescript
/**
 * @deprecated Use getWidgetTextFormat() instead for proper OpenAI text format
 */
export function getWidgetOpenAIConfig<T extends WidgetType>(...) {
  console.log('⚠️  DEPRECATED: Use getWidgetTextFormat() instead');
  // ... still works but logs warning
}
```

This means existing code won't break, but you'll see deprecation warnings in the console.

---

## Migration Steps for Existing Code

If you have code using the old approach:

1. **Update Import**
   ```typescript
   // Change this:
   import { getWidgetOpenAIConfig } from '$lib/dashboard/types/widgetSchemas';
   
   // To this:
   import { getWidgetTextFormat } from '$lib/dashboard/types/widgetSchemas';
   ```

2. **Update Format Generation**
   ```typescript
   // Change this:
   const openAIConfig = getWidgetOpenAIConfig('paragraph', 'Name', 'Desc');
   
   // To this:
   const textFormat = getWidgetTextFormat('paragraph', 'Name');
   ```

3. **Update Job Input Structure**
   ```typescript
   // Change this:
   const jobInput = {
     request: JSON.stringify({
       prompt: 'Your prompt',
       response_format: openAIConfig
     }),
     priority: 'HIGH'
   };
   
   // To this:
   const jobInput = {
     request: JSON.stringify({
       model: 'gpt-4o-mini',
       input: [{ role: 'system', content: 'Your prompt' }],
       text: { format: textFormat }
     }),
     priority: 'HIGH'
   };
   ```

4. **Test**
   - Submit a job
   - Verify AI returns structured data
   - Check widget receives and displays data correctly

---

## Example Migration

### Before

```svelte
<script lang="ts">
import { getWidgetOpenAIConfig } from '$lib/dashboard/types/widgetSchemas';
import { createJobWidgetBridge } from '$lib/dashboard/types/widgetBridge';

const openAIConfig = getWidgetOpenAIConfig('paragraph');

const jobInput = {
  request: JSON.stringify({
    prompt: 'Write about AI',
    response_format: openAIConfig
  }),
  priority: 'HIGH'
};

function handleJobComplete(update: any) {
  bridge = createJobWidgetBridge({
    jobId: update.id,
    channel: WidgetChannels.paragraphContent
  });
}
</script>
```

### After

```svelte
<script lang="ts">
import { getWidgetTextFormat } from '$lib/dashboard/types/widgetSchemas';
import { createJobWidgetBridge } from '$lib/dashboard/types/widgetBridge';

const textFormat = getWidgetTextFormat('paragraph');

const jobInput = {
  request: JSON.stringify({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: 'Write about AI' }
    ],
    text: { format: textFormat }
  }),
  priority: 'HIGH'
};

function handleJobComplete(update: any) {
  bridge = createJobWidgetBridge({
    jobId: update.id,
    channel: WidgetChannels.paragraphContent
  });
}
</script>
```

---

## Testing

After migration, verify:

- [ ] AI jobs submit successfully
- [ ] AI returns structured data matching schema
- [ ] Bridge validates and publishes data
- [ ] Widget receives and displays data
- [ ] No validation errors in console
- [ ] Debug panel shows producer registered correctly

---

## References

- **Complete Guide**: `OPENAI_TEXT_FORMAT_GUIDE.md`
- **AI Job Producer Guide**: `README_AI_JOB_PRODUCER.md`
- **OpenAI Docs**: https://platform.openai.com/docs/guides/structured-outputs
- **Backend Example**: `uw-aws-infrastructure/functions/src/events/.../bestSearch.js`

---

## Support

If you encounter issues after migration:

1. Check console logs for deprecation warnings
2. Verify job input structure matches new format
3. Use MapStore Debug Panel to verify producer registration
4. Check AI response format in console
5. Review `OPENAI_TEXT_FORMAT_GUIDE.md` for troubleshooting

---

## Summary

✅ **Migration Complete**
- All examples updated to use `getWidgetTextFormat()`
- Documentation updated
- Backward compatibility maintained
- Following OpenAI best practices

**Action Required:**
- Update any custom code to use new format
- Test existing AI jobs
- Remove deprecated function calls when convenient

**No Breaking Changes:**
- Old function still works (with deprecation warning)
- Migrate at your own pace
- All examples show new approach

