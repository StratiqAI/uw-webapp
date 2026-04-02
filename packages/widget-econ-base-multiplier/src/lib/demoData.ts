import type { EconBaseIndustry } from './schema.js';

export const DEMO_INDUSTRIES: EconBaseIndustry[] = [
	{ name: 'Finance & Insurance', naicsCode: '52', localEmp: 14200, nationalEmp: 6800000 },
	{ name: 'Professional Services', naicsCode: '54', localEmp: 22100, nationalEmp: 9200000 },
	{ name: 'Health Care', naicsCode: '62', localEmp: 31400, nationalEmp: 16800000 },
	{ name: 'Retail Trade', naicsCode: '44-45', localEmp: 18700, nationalEmp: 15400000 },
	{ name: 'Accommodation & Food', naicsCode: '72', localEmp: 21500, nationalEmp: 13200000 },
	{ name: 'Construction', naicsCode: '23', localEmp: 9800, nationalEmp: 7400000 },
	{ name: 'Manufacturing', naicsCode: '31-33', localEmp: 7200, nationalEmp: 12700000 },
	{ name: 'Information', naicsCode: '51', localEmp: 4100, nationalEmp: 3100000 }
];
