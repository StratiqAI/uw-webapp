export const WIDGET_TITLE_BAR_CONTEXT = 'stratiqai:widgetTitleBar';

export type AiConnectionState = 'Researching' | 'Ready' | 'Complete';

export type WidgetTitleBarContext = {
	setAiConnectionState: (v: AiConnectionState | null) => void;
};
