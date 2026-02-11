import { Console } from "node:console";
import {
	console as debuggerConsole,
	url as getDebuggerUrl
} from "node:inspector";
import { stdout, stderr } from "node:process";
import { inspect } from "node:util";
import {
	IncomingMessage, ClientRequest,
	ServerResponse as HTTPResponse
} from "node:http";
import { Socket, Server } from "node:net";
import { HTTPRequest } from "./network";
import { getEnvAsBoolean } from "./environment";
import {
	foreground as fg,
	background as bg,
	getColorBrightness,
	rgbToHexDecimal,
	styles
} from "./asciiFormatting";

const { imul } = Math;
const { custom: customInspectSymbol } = inspect;
const { prototype: bufferPrototype } = Buffer;
const defaultBufferInspectFunction = bufferPrototype[customInspectSymbol];

const DEBUGGER_ONLINE = getDebuggerUrl() != null;

const LOGGER_FORMATTING_ENABLED = getEnvAsBoolean("LOGGER_FORMATTING_ENABLED");
const LOGGER_SHOW_DEBUG_LOGS = getEnvAsBoolean("LOGGER_SHOW_DEBUG_LOGS");
const DEBUGGER_FORMATTING_ENABLED = getEnvAsBoolean("DEBUGGER_FORMATTING_ENABLED", LOGGER_FORMATTING_ENABLED);
const DEBUGGER_SHOW_DEBUG_LOGS = getEnvAsBoolean("DEBUGGER_SHOW_DEBUG_LOGS", LOGGER_SHOW_DEBUG_LOGS);

// @ts-expect-error
bufferPrototype[customInspectSymbol] = function(recurseTimes, ctx) {
	if (ctx?.depth < 0) {
		const returnString = `[Buffer: ${this.length} bytes]`
		return ctx.colors ? ctx.stylize(returnString, "special") : returnString;
	} return defaultBufferInspectFunction.call(this, recurseTimes, ctx);
}

// @ts-expect-error
Error.prototype[customInspectSymbol] = function(_, ctx) {
	if (ctx?.depth < 0) {
		// @ts-expect-error
		const { code } = this;
		const returnString = `[${this.name}${code == null ? "" : `: ${code}`}]`;
		return ctx.colors ? ctx.stylize(returnString, "regexp") : returnString;
	} return inspect(this, { ...ctx, customInspect: false });
}

// @ts-expect-error
Socket.prototype[customInspectSymbol] = function(_, ctx) {
	const { id } = this;
	if (ctx?.depth < 0 && id) {
		const returnString = `[Socket: ${id}]`;
		return ctx.colors ? ctx.stylize(returnString, "special") : returnString;
	} return inspect(this, { ...ctx, customInspect: false });
}

// @ts-expect-error
Server.prototype[customInspectSymbol] = function(_, ctx) {
	if (ctx?.depth < 0) {
		const returnString = "[Server]";
		return ctx.colors ? ctx.stylize(returnString, "special") : returnString;
	} return inspect(this, { ...ctx, customInspect: false });
}

// @ts-expect-error
HTTPRequest.prototype[customInspectSymbol] = function(_, ctx) {
	const { id, method } = this;
	if (ctx?.depth < 0 && id && method) {
		const returnString = `[Request(${method.toUpperCase()}): ${id}]`;
		return ctx.colors ? ctx.stylize(returnString, "special") : returnString;
	} return inspect(this, { ...ctx, customInspect: false });
}

// @ts-expect-error
HTTPResponse.prototype[customInspectSymbol] = function(_, ctx) {
	if (ctx?.depth < 0) {
		const returnString = `[Response: ${this.statusCode}]`;
		return ctx.colors ? ctx.stylize(returnString, "special") : returnString;
	} return inspect(this, { ...ctx, customInspect: false });
}

// @ts-expect-error
ClientRequest.prototype[customInspectSymbol] = function(_, ctx) {
	const { id, method } = this;
	if (ctx?.depth < 0 && id && method) {
		const returnString = `[ClientRequest(${method.toUpperCase()}): ${id}]`;
		return ctx.colors ? ctx.stylize(returnString, "special") : returnString;
	} return inspect(this, { ...ctx, customInspect: false });
}

// @ts-expect-error
IncomingMessage.prototype[customInspectSymbol] = function(_, ctx) {
	const { id, statusCode } = this;
	if (ctx?.depth < 0 && id && statusCode) {
		const returnString = `[IncomingMessage(${statusCode}): ${id}]`;
		return ctx.colors ? ctx.stylize(returnString, "special") : returnString;
	} return inspect(this, { ...ctx, customInspect: false });
}

const customConsole = new Console({
	stdout, stderr,
	inspectOptions: {
		colors: LOGGER_FORMATTING_ENABLED,
		depth: -1
	}
});

class LogTopic {
	public readonly text: string;
	public readonly background: number;
	public readonly foreground: number;

	public static getColorForString(inputString: string): number {
		let hash = 0x811c9dc5;
		for (let index = 0; index < inputString.length; index++)
			hash = imul(hash ^ inputString.charCodeAt(index), 0x01000193);
		return (hash >>> 0) % 0x1000000;
	}

	public static getColorOptions(text: string, colors: LogTopicColorOptions = {}): Required<LogTopicColorOptions> {
		let { background, foreground } = colors;

		background ??= LogTopic.getColorForString(text);
		foreground ??= getColorBrightness(background) > 128 ? 0x000000 : 0xffffff;

		return { background, foreground };
	}

	public static formatHeaderString(text: string, colors?: LogTopicColorOptions): string {
		const rawHeaderString = ` ${text} `;

		if (colors) {
			const colorOptions = LogTopic.getColorOptions(text, colors);
			return [
				bg(colorOptions.background),
				fg(colorOptions.foreground),
				styles.bright,
				rawHeaderString,
				styles.noBright,
				fg.default,
				bg.default
			].join("");
		} return rawHeaderString;
	}

	public constructor(text: string, colors: LogTopicColorOptions = {}) {
		this.text = text;

		const colorOptions = LogTopic.getColorOptions(text, colors);
		this.background = colorOptions.background;
		this.foreground = colorOptions.foreground;
	}

	public toString(format: boolean = LOGGER_FORMATTING_ENABLED) {
		return LogTopic.formatHeaderString(this.text, format ? {
			background: this.background,
			foreground: this.foreground
		} : undefined);
	}
}

class Logger {
	public static readonly LogTopic = LogTopic;
	public static readonly rootLogger = new Logger();
	public static readonly levelTopics = {
		debug: new LogTopic("DEBUG", { background: rgbToHexDecimal(75, 75, 75) }),
		log: new LogTopic("LOG", { background: rgbToHexDecimal(175, 175, 175) }),
		info: new LogTopic("INFO", { background: rgbToHexDecimal(0, 150, 0) }),
		warn: new LogTopic("WARN", { background: rgbToHexDecimal(220, 220, 0) }),
		error: new LogTopic("ERROR", { background: rgbToHexDecimal(220, 0, 0) })
	};

	public static dateFormatColorOptions?: LogTopicColorOptions = { background: rgbToHexDecimal(100, 100, 255) };

	public static formatOutputHeaderString(date: Date = new Date(), level: LogLevel, topics: LogTopic[], format: boolean = LOGGER_FORMATTING_ENABLED): string {
		return [
			LogTopic.formatHeaderString(date.toISOString(), format ? Logger.dateFormatColorOptions : undefined),
			Logger.levelTopics[level].toString(format),
			...topics.map(value => value.toString(format))
		].join("");
	}

	public static escapeArguments(data: any[]): any[] {
		return data.map((value, index) => index <= 0 && data.length > 1 && typeof value === "string" ? value.replace(/%/g, "%%") : value);
	}

	public readonly Logger = Logger;
	public readonly topics: LogTopic[];

	public constructor(topics: LogTopic[] = []) {
		this.topics = topics;
	}

	public addTopics(...topics: (string | LogTopic)[]): Logger {
		return new Logger([
			...this.topics,
			...topics.map(value => {
				let logTopic = value;
				if (typeof value === "string") {
					logTopic = new LogTopic(value);
				} return logTopic as LogTopic;
			})
		]);
	}

	public output(level: LogLevel, ...data: any[]): Logger {
		const currentDate = new Date();
		const isNormalOutput = level !== "debug";
		const { topics } = this;

		data = Logger.escapeArguments(data);

		let headerString = Logger.formatOutputHeaderString(currentDate, level, topics);
		if (isNormalOutput || LOGGER_SHOW_DEBUG_LOGS)
			customConsole[level](headerString, ...data);

		if (DEBUGGER_ONLINE) {
			if (LOGGER_FORMATTING_ENABLED !== DEBUGGER_FORMATTING_ENABLED)
				headerString = Logger.formatOutputHeaderString(currentDate, level, topics, DEBUGGER_FORMATTING_ENABLED);
			if (isNormalOutput || DEBUGGER_SHOW_DEBUG_LOGS)
				debuggerConsole[level](headerString, ...data);
		}

		return this;
	}

	public debug(...data: any[]): Logger {
		return this.output("debug", ...data);
	}

	public log(...data: any[]): Logger {
		return this.output("log", ...data);
	}

	public info(...data: any[]): Logger {
		return this.output("info", ...data);
	}

	public warn(...data: any[]): Logger {
		return this.output("warn", ...data);
	}

	public error(...data: any[]): Logger {
		return this.output("error", ...data);
	}
}

export type LogLevel = keyof (Logger) & keyof (Console);
export interface LogTopicColorOptions {
	background?: number,
	foreground?: number
}

export default Logger.rootLogger;
