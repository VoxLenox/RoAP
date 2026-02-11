import { resolve as resolvePath } from "node:path";
import { env } from "node:process";

const { parse: decodeJSON } = JSON;
const { NODE_ENV } = env;
export const isDevelopment = NODE_ENV === "development";
export const isProduction = NODE_ENV === "production";

export function getEnv(variableName: string): string | undefined {
	return env[variableName];
}

export function getEnvAsFilePath(variableName: string): string | undefined {
	const rawValue = getEnv(variableName);
	if (rawValue != null) return resolvePath("./", rawValue);
}

export function getEnvAsNumber(variableName: string): number | undefined {
	const rawValue = getEnv(variableName);
	if (rawValue != null) return Number(rawValue);
}

export function getEnvAsBoolean(variableName: string, autoValue?: boolean,): boolean {
	switch (getEnv(variableName)?.toLowerCase()) {
		case "auto": return autoValue ?? false;
		case "true": return true;
		default: return false;
	}
}

export function getAsJSON(variableName: string): any {
	try {
		return decodeJSON(getEnv(variableName) as string);
	} catch (error) {
		return;
	}
}
