feat: Add AI Request Builder with OpenAI Responses API integration

This commit introduces a comprehensive AI Request Builder component system
with full OpenAI Responses API integration, improved UI/UX, and enhanced
functionality.

## New Features

### AI Request Builder Component System
- Created modular component architecture in `src/lib/components/AIRequestBuilder/`
- Implemented reusable components: Configuration, Messages, VectorStores,
  SchemaProperties, Output, Actions, ApiResult, Notification
- Added state management with localStorage persistence for form inputs
- Migrated to Svelte 5 runes syntax throughout

### OpenAI Responses API Integration
- Created server-side API route `/api/openai-responses` using OpenAI SDK
- Implemented proper error handling with OpenAI APIError types
- Added request/response handling with validation

### UI/UX Improvements
- Implemented tabbed interface for "Generated JSON" and "API Response" panels
- Added full-height layout with proper scrolling constraints
- Created beautiful, distinct input widgets with enhanced visual hierarchy
- Added card-style form groups with shadows and gradients
- Improved responsive design for mobile and desktop

### Performance & Monitoring
- Added elapsed time measurement for API requests using performance.now()
- Display timing information in API response panel and notifications
- Smart time formatting (ms for <1s, seconds for longer requests)

### State Persistence
- Implemented localStorage persistence for all form inputs
- Form state survives browser refreshes
- Includes: model, schema name, strict mode, messages, vector store IDs,
  and all JSON schema properties

## Technical Changes

### Component Updates
- Updated Actions.svelte to use Svelte 5 runes with callback props
- Updated Output.svelte to use modern event handlers (onclick)
- Refactored ApiResult.svelte to display in tabbed interface
- Enhanced all components with Tailwind CSS utility classes

### Layout Improvements
- Constrained page to viewport height (h-screen) to prevent page scrolling
- Implemented internal scrolling for content areas only
- Fixed header and footer with flexible content area
- Proper flex layout with min-h-0 for correct overflow handling

### File Structure
- New route: `src/routes/(experiments)/ai2/` - Main AI Request Builder page
- New route: `src/routes/api/openai-responses/` - Server-side API handler
- New components: `src/lib/components/AIRequestBuilder/lib/` - Component library
- Supporting files: state management, schema builders, API client

## Breaking Changes
- Moved AI-related routes to `(experiments)` directory
- Removed old `/ai` and `/api-builder` routes (replaced by new system)

## Migration Notes
- Old routes have been moved/deleted
- New component system uses Svelte 5 runes exclusively
- API endpoint changed from custom fetch to OpenAI SDK integration

