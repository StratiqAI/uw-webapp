# OpenAI Responses Builder Component

A comprehensive Svelte component for building OpenAI Responses Parse API configurations with an intuitive UI.

## Features

- **Model Selection**: Choose from various OpenAI models (gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.)
- **Input Messages**: Add system and user messages with an easy-to-use interface
- **Vector Store IDs**: Configure file search tools with multiple vector stores
- **JSON Schema Builder**: The core feature that allows you to:
  - Add properties with various data types (string, number, integer, boolean, object, array)
  - Create nested objects
  - Define arrays with custom item types (including arrays of objects)
  - Mark fields as required
  - Add descriptions to properties

## Usage

```svelte
<script lang="ts">
  import OpenAIResponsesBuilder from '$lib/components/OpenAIResponsesBuilder.svelte';

  function handleGenerate(event: CustomEvent) {
    const config = event.detail;
    console.log('Generated Configuration:', config);
    
    // Send to your API endpoint
    await fetch('/api/openai-responses', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
</script>

<OpenAIResponsesBuilder on:generate={handleGenerate} />
```

## Output Format

The component generates a configuration object in the following format:

```json
{
  "model": "gpt-4o",
  "input": [
    {
      "role": "system",
      "content": "Extract the details from the file"
    }
  ],
  "tools": [
    {
      "type": "file_search",
      "vector_store_ids": ["vs_68da2c6862088191a5b51b8b4566b300"]
    }
  ],
  "tool_choice": "auto",
  "text": {
    "format": {
      "type": "json_schema",
      "name": "responseSchema",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          // Your defined properties
        },
        "required": ["field1", "field2"],
        "additionalProperties": false,
        "$schema": "http://json-schema.org/draft-07/schema#"
      }
    }
  }
}
```

## Events

### `generate`

Dispatched when the user clicks the "Generate" button. The event detail contains the complete configuration object.

```typescript
event.detail: {
  model: string;
  input: Array<{ role: 'system' | 'user'; content: string }>;
  tools: Array<{ type: 'file_search'; vector_store_ids: string[] }>;
  tool_choice: 'auto';
  text: {
    format: {
      type: 'json_schema';
      name: string;
      strict: boolean;
      schema: object;
    };
  };
}
```

## Schema Builder Examples

### Simple String Properties

Create properties like `name`, `email`, `description` by adding properties and selecting the "String" type.

### Nested Objects

1. Add a property and name it (e.g., `address`)
2. Select type "Object"
3. Click "Add Nested Property" to add properties inside the object
4. Add properties like `street`, `city`, `state`, `zip`

### Arrays

1. Add a property and name it (e.g., `tags`)
2. Select type "Array"
3. Choose the array item type (string, number, object, etc.)

### Arrays of Objects

1. Add a property and name it (e.g., `items`)
2. Select type "Array"
3. Select item type "Object"
4. Click "Add Item Property" to define the structure of each object in the array

## Styling

The component comes with built-in styling but can be customized through CSS variables or by modifying the component's style block.

## Notes

- All property names are validated when building the schema (empty names are skipped)
- Required fields are automatically added to the schema's `required` array
- The schema always uses `additionalProperties: false` for strict validation
- The preview feature allows you to inspect the generated JSON before using it

