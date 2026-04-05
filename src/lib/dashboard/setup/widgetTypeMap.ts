import type { Component } from 'svelte';
import { getWidgetComponent } from '$lib/dashboard/setup/widgetRegistry';
import ParagraphWidget from '$lib/dashboard/widgets/ParagraphWidget.svelte';
import ImageWidget from '$lib/dashboard/widgets/ImageWidget.svelte';
import LineChartWidget from '$lib/dashboard/widgets/LineChartWidget.svelte';
import BarChartWidget from '$lib/dashboard/widgets/BarChartWidget.svelte';
import DonutChartWidget from '$lib/dashboard/widgets/DonutChartWidget.svelte';
import AreaChartWidget from '$lib/dashboard/widgets/AreaChartWidget.svelte';
import GaugeWidget from '$lib/dashboard/widgets/GaugeWidget.svelte';
import SparklineWidget from '$lib/dashboard/widgets/SparklineWidget.svelte';
import HeatmapWidget from '$lib/dashboard/widgets/HeatmapWidget.svelte';
import DivergingBarChartWidget from '$lib/dashboard/widgets/DivergingBarChartWidget.svelte';
import MapWidget from '$lib/dashboard/widgets/MapWidget.svelte';
import SchemaWidget from '$lib/dashboard/widgets/SchemaWidget.svelte';
import LocationQuotientWidget from '$lib/dashboard/widgets/LocationQuotientWidget.svelte';

const BUILTIN_WIDGETS: Record<string, Component<any>> = {
	paragraph: ParagraphWidget,
	image: ImageWidget,
	lineChart: LineChartWidget,
	barChart: BarChartWidget,
	donutChart: DonutChartWidget,
	areaChart: AreaChartWidget,
	gauge: GaugeWidget,
	sparkline: SparklineWidget,
	heatmap: HeatmapWidget,
	divergingBarChart: DivergingBarChartWidget,
	map: MapWidget,
	schema: SchemaWidget,
	locationQuotient: LocationQuotientWidget,
};

export function resolveWidgetComponent(type: string): Component<any> | undefined {
	return getWidgetComponent(type) ?? BUILTIN_WIDGETS[type];
}
