import type { Widget } from '$lib/dashboard/types/widget';

export const dashboardWidgets: Widget[] = [
	{
		id: 'widget-1',
		type: 'title',
		gridColumn: 1,
		gridRow: 1,
		colSpan: 12,
		rowSpan: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-4',
		type: 'table',
		gridColumn: 9,
		gridRow: 2,
		colSpan: 4,
		rowSpan: 4,
		minHeight: 2,
		data: {} as any // Data is published via MapStore topic
	},
	// {
	// 	id: 'widget-5',
	// 	type: 'image',
	// 	gridColumn: 1,
	// 	gridRow: 2,
	// 	colSpan: 8,
	// 	rowSpan: 4,
	// 	minWidth: 3,
	// 	minHeight: 2,
	// 	data: {
	// 		src: 'https://pti-demo-web-assets.s3.us-west-2.amazonaws.com/images/aaronmap.png',
	// 		alt: 'Image',
	// 		objectFit: 'cover'
	// 	}
	// },
	{
		id: 'widget-5',
		type: 'map',
		gridColumn: 1,
		gridRow: 2,
		colSpan: 8,
		rowSpan: 4,
		minWidth: 3,
		minHeight: 2,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-6',
		type: 'paragraph',
		gridColumn: 1,
		gridRow: 6,
		colSpan: 12,
		rowSpan: 2,
		minWidth: 2,
		minHeight: 2,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-8',
		type: 'metric',
		gridColumn: 1,
		gridRow: 8,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034441135',
		type: 'metric',
		gridColumn: 3,
		gridRow: 8,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034444139',
		type: 'metric',
		gridColumn: 5,
		gridRow: 8,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034594067',
		type: 'metric',
		gridColumn: 7,
		gridRow: 8,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034597055',
		type: 'metric',
		gridColumn: 9,
		gridRow: 8,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034608731',
		type: 'metric',
		gridColumn: 11,
		gridRow: 8,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034608732',
		type: 'metric',
		gridColumn: 11,
		gridRow: 9,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034605935',
		type: 'metric',
		gridColumn: 1,
		gridRow: 9,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034612393',
		type: 'metric',
		gridColumn: 3,
		gridRow: 9,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034618243',
		type: 'metric',
		gridColumn: 5,
		gridRow: 9,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034621635',
		type: 'metric',
		gridColumn: 7,
		gridRow: 9,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-1760034624211',
		type: 'metric',
		gridColumn: 9,
		gridRow: 9,
		colSpan: 2,
		rowSpan: 1,
		minWidth: 1,
		minHeight: 1,
		data: {} as any // Data is published via MapStore topic
	},
	{
		id: 'widget-barchart-1',
		type: 'barChart',
		gridColumn: 1,
		gridRow: 10,
		colSpan: 6,
		rowSpan: 3,
		minWidth: 3,
		minHeight: 2,
		data: {} as any // Data is published via MapStore topic
	}
];
