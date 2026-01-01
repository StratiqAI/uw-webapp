export type ConnectionSide = 'top' | 'right' | 'bottom' | 'left';

export type Connection = {
	id: string;
	from: string; // element id
	to: string; // element id
	fromSide: ConnectionSide;
	toSide: ConnectionSide;
};

export type ConnectionPoint = {
	x: number;
	y: number;
	elementId: string;
	side: ConnectionSide;
};
