import { AddressInfo } from "node:net";
import {
	OutgoingHttpHeaders,
	STATUS_CODES,
	validateHeaderName,
	validateHeaderValue,
	IncomingMessage
} from "node:http";

const { entries } = Object;
const { byteLength } = Buffer;

export class HTTPRequest extends IncomingMessage {
	public static totalRequests = 0;
	public readonly id = ++HTTPRequest.totalRequests;
}

export function formatAddress(addressData: AddressInfo | {} | string | null): string {
	const { family, address, port } = addressData as AddressInfo;
	return `${family}://${address}:${port}`;
}

export function constructRawHTTPServerResponse(
	statusCode: keyof typeof STATUS_CODES,
	headers: OutgoingHttpHeaders = {},
	body: string = ""
): string {
	const headerStrings: string[] = [];

	for (const [headerName, headerValue] of entries({
		"Date": (new Date()).toUTCString(),
		"Connection": "close",
		"Content-Length": byteLength(body),
		...headers
	})) {
		if (headerValue != null) {
			validateHeaderName(headerName);

			if (Array.isArray(headerValue))
				for (const subHeaderValue of headerValue) {
					const stringifiedHeaderValue = String(subHeaderValue);
					validateHeaderValue(headerName, stringifiedHeaderValue);
					headerStrings.push(`${headerName}: ${stringifiedHeaderValue}`);
				}
			else {
				const stringifiedHeaderValue = String(headerValue);
				validateHeaderValue(headerName, stringifiedHeaderValue);
				headerStrings.push(`${headerName}: ${stringifiedHeaderValue}`);
			}
		}
	}

	return [
		`HTTP/1.1 ${statusCode} ${STATUS_CODES[statusCode]}`,
		...headerStrings, "", body
	].join("\r\n");
}
