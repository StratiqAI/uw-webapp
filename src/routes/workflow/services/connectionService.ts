import type { GridElement } from '../types/workflow';
import type { Connection, ConnectionSide } from '../types/connection';

export function getConnectionPointPos(
	element: GridElement,
	side: ConnectionSide
): { x: number; y: number } {
	const centerX = element.x + element.width / 2;
	const centerY = element.y + element.height / 2;

	switch (side) {
		case 'top':
			return { x: centerX, y: element.y };
		case 'right':
			return { x: element.x + element.width, y: centerY };
		case 'bottom':
			return { x: centerX, y: element.y + element.height };
		case 'left':
			return { x: element.x, y: centerY };
	}
}
