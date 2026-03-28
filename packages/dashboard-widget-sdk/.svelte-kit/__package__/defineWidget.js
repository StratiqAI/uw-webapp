/**
 * Factory for creating a type-safe widget manifest.
 *
 * Widget package authors call this once in their entry module and export
 * the result. The host dashboard imports it to register the widget.
 */
export function defineWidget(config) {
    return {
        schemaVersion: 'v1',
        defaultSize: { colSpan: 4, rowSpan: 2 },
        ...config
    };
}
