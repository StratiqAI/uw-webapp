import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const ImageWidget: import("svelte").Component<StandardWidgetProps<{
    src: string;
    alt: string;
    title?: string | null | undefined;
    objectFit?: "cover" | "contain" | "fill" | null | undefined;
}>, {}, "">;
type ImageWidget = ReturnType<typeof ImageWidget>;
export default ImageWidget;
