# Transformer Debugging Guide

## Problem: Validation Errors in Bridge

When you see validation errors like this:

```json
{
  "issues": [{
    "code": "invalid_type",
    "expected": "string",
    "received": "object",
    "path": ["content"],
    "message": "Expected string, received object"
  }]
}
```

This means the **transformer isn't correctly converting the job result** to the widget data format.

---

## Step 1: Inspect the Raw Job Result

The enhanced transformer now logs detailed information:

```
🔄 [AIJobParagraphExample] Transforming job result...
   Raw result type: string
   Raw result: {"output_parsed":{"content":{...},"title":"..."}}
   ✅ Parsed result: { output_parsed: { content: {...}, title: "..." } }
   Parsed type: object
   Parsed keys: ['output_parsed', 'status', 'metadata']
```

**Look for:**
1. `Raw result:` - The actual JSON structure from the job
2. `Parsed keys:` - The top-level keys in the response
3. The structure of nested objects

---

## Step 2: Identify the Response Structure

Common structures you might see:

### Structure A: Direct Match
```json
{
  "title": "My Title",
  "content": "My content",
  "markdown": false
}
```
**Fix:** Already handled ✅

---

### Structure B: Nested in output_parsed
```json
{
  "output_parsed": {
    "title": "My Title",
    "content": "My content",
    "markdown": false
  }
}
```
**Fix:** Already handled ✅

---

### Structure C: Content is an Object
```json
{
  "title": "My Title",
  "content": {
    "text": "My content",
    "metadata": {...}
  },
  "markdown": false
}
```
**Fix:** Already handled (stringifies object) ✅

---

### Structure D: Different Field Names
```json
{
  "heading": "My Title",
  "body": "My content",
  "isMarkdown": false
}
```
**Fix:** Need custom transformer (see below)

---

## Step 3: Check Console Logs

After clicking Submit Job, check the console for the transformer logs:

```
🔄 [AIJobParagraphExample] Transforming job result...
   Raw result: {...}
   Parsed result: {...}
   Parsed keys: ['key1', 'key2', ...]
```

**Copy the entire parsed result** and analyze its structure.

---

## Step 4: Create Custom Transformer

Based on the actual structure, create a custom transformer:

### Example: Handle Different Structure

```typescript
const bridge = createJobWidgetBridge({
  jobId: update.id,
  channel: WidgetChannels.paragraphContent,
  
  transformer: (result: string) => {
    const parsed = JSON.parse(result);
    console.log('Custom transformer - parsed:', parsed);
    
    // Handle YOUR specific structure
    return {
      title: parsed.heading || parsed.title || null,
      content: typeof parsed.body === 'string' 
        ? parsed.body 
        : typeof parsed.content === 'string'
          ? parsed.content
          : JSON.stringify(parsed.body || parsed.content),
      markdown: parsed.isMarkdown ?? parsed.markdown ?? false
    };
  }
});
```

---

## Common Issues & Solutions

### Issue 1: Content is Nested Object

**Example Response:**
```json
{
  "content": {
    "text": "The actual content",
    "format": "plain"
  }
}
```

**Solution:**
```typescript
transformer: (result: string) => {
  const parsed = JSON.parse(result);
  
  // Extract text from nested content object
  const content = typeof parsed.content === 'string'
    ? parsed.content
    : parsed.content?.text || JSON.stringify(parsed.content);
  
  return {
    title: parsed.title || null,
    content: content,
    markdown: false
  };
}
```

---

### Issue 2: Content in output_parsed

**Example Response:**
```json
{
  "output_parsed": {
    "title": "Title",
    "content": "Content"
  },
  "metadata": {...}
}
```

**Solution:** Already handled by the enhanced transformer ✅

```typescript
// The enhanced transformer checks for:
if (parsed.output_parsed?.content) {
  content = parsed.output_parsed.content;
}
```

---

### Issue 3: Array or Complex Object as Content

**Example Response:**
```json
{
  "content": {
    "paragraphs": ["Para 1", "Para 2", "Para 3"],
    "summary": "Summary text"
  }
}
```

**Solution:**
```typescript
transformer: (result: string) => {
  const parsed = JSON.parse(result);
  
  let content: string;
  if (typeof parsed.content === 'string') {
    content = parsed.content;
  } else if (Array.isArray(parsed.content?.paragraphs)) {
    // Join array into single string
    content = parsed.content.paragraphs.join('\n\n');
  } else if (parsed.content?.summary) {
    content = parsed.content.summary;
  } else {
    // Fallback: stringify the whole thing
    content = JSON.stringify(parsed.content, null, 2);
  }
  
  return {
    title: parsed.title || null,
    content: content,
    markdown: false
  };
}
```

---

## Enhanced Debugging

### Add More Detailed Logging

The current transformer now includes extensive logging. Check the console for:

```
🔄 [AIJobParagraphExample] Transforming job result...
   Raw result type: string
   Raw result: {...}
   ✅ Parsed result: {...}
   Parsed type: object
   Parsed keys: ['key1', 'key2', ...]
   ⚠️ Content is an object, converting to string  ← Important!
   ✅ Transformed to widget data: {...}
```

---

## Step-by-Step Debugging

### 1. Check the Parsed Result Structure

Look at the console log for `Parsed keys:` - this shows all available fields:

```
Parsed keys: ['output_parsed', 'metadata', 'status']
```

### 2. Expand the Parsed Object

Click on the logged object in console to expand it fully:

```javascript
{
  output_parsed: {
    title: "Some Title",
    content: {  // ← This is the problem!
      text: "The actual content"
    }
  }
}
```

### 3. Write a Specific Transformer

Based on what you see:

```typescript
transformer: (result: string) => {
  const parsed = JSON.parse(result);
  
  // Navigate to the actual content
  const actualContent = parsed.output_parsed?.content?.text 
    || parsed.content?.text
    || parsed.content
    || parsed.text;
  
  return {
    title: parsed.output_parsed?.title || parsed.title || null,
    content: typeof actualContent === 'string' 
      ? actualContent 
      : JSON.stringify(actualContent),
    markdown: false
  };
}
```

---

## Quick Fix: See Actual Structure

Add this temporary code to see the exact structure:

```typescript
transformer: (result: string) => {
  const parsed = JSON.parse(result);
  
  // Log EVERYTHING
  console.log('═══════ FULL JOB RESULT ═══════');
  console.log(JSON.stringify(parsed, null, 2));
  console.log('═══════════════════════════════');
  
  // Return something valid for now
  return {
    title: 'Debug Mode',
    content: JSON.stringify(parsed, null, 2),
    markdown: false
  };
}
```

Then:
1. Submit the job
2. Look at the console for `FULL JOB RESULT`
3. Copy the structure
4. Write a transformer based on that exact structure

---

## Common Backend Response Formats

### Format 1: Lambda with output_parsed
```json
{
  "output_parsed": {
    "title": "...",
    "content": "..."
  },
  "execution_time": 1234
}
```

### Format 2: Step Functions
```json
{
  "result": {
    "title": "...",
    "content": "..."
  },
  "status": "SUCCESS"
}
```

### Format 3: Direct OpenAI Response
```json
{
  "title": "...",
  "content": "...",
  "markdown": false
}
```

---

## Test Your Transformer

Create a test function:

```typescript
function testTransformer() {
  const sampleResults = [
    '{"title":"Test","content":"Content"}',
    '{"output_parsed":{"title":"Test","content":"Content"}}',
    '{"content":{"text":"Content"},"title":"Test"}'
  ];
  
  sampleResults.forEach((result, i) => {
    console.log(`\nTest ${i + 1}:`);
    try {
      const transformed = transformer(result);
      console.log('✅ Success:', transformed);
    } catch (error) {
      console.error('❌ Failed:', error);
    }
  });
}
```

---

## Updated Transformer Features

The enhanced transformer now handles:

1. ✅ Direct fields: `parsed.content`
2. ✅ Alternative names: `parsed.text`
3. ✅ Nested in output_parsed: `parsed.output_parsed.content`
4. ✅ Content as object: Converts to JSON string
5. ✅ Missing fields: Provides defaults
6. ✅ Error handling: Fallback to displaying raw JSON

---

## Next Steps

1. **Submit the job again** with the enhanced transformer
2. **Check console logs** for the detailed structure
3. **If still failing**, copy the `Raw result:` from console
4. **Share it** or analyze the structure
5. **Write a custom transformer** based on the exact structure

The enhanced transformer should handle most cases now, but if you need a custom one, the logs will show you exactly what structure to expect! 🔍

