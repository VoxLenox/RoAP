import { clamp } from "./utils";

function background(hex: number): string;
function background(r: number, g: number, b: number): string;
function background(a: number, b?: number, c?: number): string {
	return b == null ?
		background((a & 0xff0000) >> 16, (a & 0x00ff00) >> 8, a & 0x0000ff) :
		("\x1B[48;2;" + [a, b, c].map(value => clamp(value as number, 0, 255, true)).join(";") + "m");
} background.default = "\x1B[49m";

function foreground(hex: number): string;
function foreground(red: number, green: number, blue: number): string;
function foreground(a: number, b?: number, c?: number): string {
	return b == null ?
		foreground((a & 0xff0000) >> 16, (a & 0x00ff00) >> 8, a & 0x0000ff) :
		("\x1B[38;2;" + [a, b, c].map(value => clamp(value as number, 0, 255, true)).join(";") + "m");
} foreground.default = "\x1B[39m";

export { background, foreground };

export function rgbToHexDecimal(red: number = 0, green: number = 0, blue: number = 0): number {
	return (clamp(red, 0, 255, true) << 16) +
		(clamp(green, 0, 255, true) << 8) +
		clamp(blue, 0, 255, true);
}

// Returns float in range [0, 255]
export function getColorBrightness(hex: number): number {
	return (
		(((hex >> 16) & 0xff) * 299) +
		(((hex >> 8) & 0xff) * 587) +
		((hex & 0xff) * 114)
	) / 1000;
}

export enum styles {
	reset = "\x1B[0m",

	bright = "\x1B[1m",
	noBright = "\x1B[22m",

	italic = "\x1B[3m",
	noItalic = "\x1B[23m",

	underline = "\x1B[4m",
	doubleUnderline = "\x1B[21m",
	noUnderline = "\x1B[24m",

	inverse = "\x1B[7m",
	noInverse = "\x1B[27m",

	hidden = "\x1B[8m",
	noHidden = "\x1B[28m",

	strikethrough = "\x1B[9m",
	noStrikethrough = "\x1B[29m"
}
