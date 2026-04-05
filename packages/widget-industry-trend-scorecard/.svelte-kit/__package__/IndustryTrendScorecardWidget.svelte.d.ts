import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const IndustryTrendScorecardWidget: import("svelte").Component<StandardWidgetProps<{
    quarters: string[];
    industries: {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }[];
    weights: {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    };
}>, {}, "">;
type IndustryTrendScorecardWidget = ReturnType<typeof IndustryTrendScorecardWidget>;
export default IndustryTrendScorecardWidget;
