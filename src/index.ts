import { createServer, IncomingHttpHeaders } from "node:http";
import { request as createRequest } from "node:https";
import { resolve as resolvePath } from "node:path";
import logger from "./logger";
import { HTTPRequest, constructRawHTTPServerResponse, formatAddress } from "./network";
import { getAsJSON, getEnv, getEnvAsNumber } from "./environment";

const server = createServer({ IncomingMessage: HTTPRequest });
const serverLogger = logger.addTopics("Server");
const clientErrorLogger = serverLogger.addTopics(new logger.Logger.LogTopic("ClientError", logger.Logger.levelTopics.error));

server.on("error", error => serverLogger.error("Unexpected", error));

let totalSockets = 0;
server.on("connection", socket => {
	socket.id = ++totalSockets;
	socket.addressString = formatAddress(socket.address());

	serverLogger.debug("New connection established with", socket);

	const handler = (value: Buffer | Error) => Buffer.isBuffer(value) ?
		serverLogger.debug(socket, "sent", value) :
		serverLogger.debug("Unexpected", value, "on", socket);

	socket.on("data", handler).on("error", handler).once("close", hadError => {
		socket.off("data", handler).off("error", handler);
		serverLogger.debug("Connection with", socket, "has been closed - hadError:", hadError);
	});
});

server.on("clientError", (error, socket) => {
	socket.end(constructRawHTTPServerResponse(400)).destroy();
	clientErrorLogger.debug(error, "occured on", socket);
});

const { entries } = Object;
const ignoredHeaderNames = [...getAsJSON("EXCLUDED_HEADER_NAMES")].map(value => value.toLowerCase());
const requiredHeaders = { ...getAsJSON("REQUIRED_HEADERS") };

let totalProxyRequests = 0;
server.on("request", (request, response) => {
	serverLogger.debug(request, "->", server);
	response.once("close", () => serverLogger.debug(response, "->", request));

	const { url: urlString, method, headers } = request;

	if (urlString && urlString[0] === "/") {
		const urlObject = new URL(urlString, "https://roblox.com");
		const safePathname = resolvePath(urlObject.pathname);

		if (safePathname === "/")
			return response.writeHead(
				method === "GET" || method === "HEAD" ? 204 : 405,
				{ "Connection": "close" }
			).end();
		else {
			for (const [requiredHeaderName, requiredHeaderValue] of entries(requiredHeaders))
				if (headers[requiredHeaderName] !== requiredHeaderValue)
					return response.writeHead(401, { "Connection": "close" }).end();

			const pathnameSegments = safePathname.substring(1).split("/");
			urlObject.hostname = [pathnameSegments.shift(), urlObject.hostname].join(".");
			urlObject.pathname = resolvePath("/", ...pathnameSegments);

			const requestHeaders: IncomingHttpHeaders = {};

			for (const [headerName, headerValue] of entries(headers))
				if (!ignoredHeaderNames.includes(headerName))
					requestHeaders[headerName] = headerValue;
			
			// Doing this in a different loop so it can overwrite other headers
			for (const [headerName, headerValue] of entries(requestHeaders))
				if (headerName.length >= 2 && headerName[0] === "$") {
					requestHeaders[headerName.substring(1)] = headerValue;
					delete requestHeaders[headerName];
				}
			
			const requestId = ++totalProxyRequests;
			const proxyRequest = createRequest(urlObject, {
				method,
				headers: requestHeaders
			}, robloxResponse => {
				robloxResponse.id = requestId;
				serverLogger.debug(robloxResponse, "->", server);
				response.writeHead(robloxResponse.statusCode as number, robloxResponse.headers);
				robloxResponse.pipe(response);
			});

			proxyRequest.id = requestId;

			serverLogger.debug(server, "->", proxyRequest);

			const errorHandler = (error: Error) => {
				serverLogger.debug("An", error, "has occured on", proxyRequest);

				if (response.headersSent) response.destroy();
				else response.writeHead(502, { "Connection": "close" }).end();
			};

			proxyRequest.on("error", errorHandler).once("close", () => {
				serverLogger.debug(proxyRequest, "closed");
				proxyRequest.off("error", errorHandler);
			});

			request.pipe(proxyRequest);

			return;
		}
	} response.writeHead(400, { "Connection": "close" }).end();
});

server.on("upgrade", (request, socket) => {
	serverLogger.debug(request, "-(upgrade)->", server);
	serverLogger.debug("Rejected", request, "with status code 400 due to attempting to upgrade");
	socket.end(constructRawHTTPServerResponse(400)).destroy()
});

server.on("listening", () => {
	const addressString = formatAddress(server.address());
	server.addressString = addressString;
	serverLogger.info(server, "is currently listening on", addressString);
});

server.once("close", () => serverLogger.info(server, "closed"));
logger.info("Starting", server);

try {
	server.listen(getEnvAsNumber("PORT"), getEnv("HOST"));
} catch (error) {
	serverLogger.error("Unexpected", error, "while attempting to start", server);
}
