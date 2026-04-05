import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const EconBaseMultiplierWidget: import("svelte").Component<StandardWidgetProps<{
    industries: {
        name: string;
        naicsCode: string;
        localEmp: number;
        nationalEmp: number;
    }[];
    regionLabel?: string | undefined;
}>, {}, "">;
type EconBaseMultiplierWidget = ReturnType<typeof EconBaseMultiplierWidget>;
export default EconBaseMultiplierWidget;
