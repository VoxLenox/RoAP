const { min, max, floor } = Math;

export function clamp(value: number, minValue: number, maxValue: number, floorValue: boolean = false): number {
	const clampedValue = min(max(value, minValue), maxValue);
	return floorValue ? floor(clampedValue) : clampedValue;
}
