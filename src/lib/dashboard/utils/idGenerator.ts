export function generateWidgetId(): string {
	return `widget-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
