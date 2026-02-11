export declare module "node:net" {
	interface Socket {
		id?: number;
		addressString?: string;
	}

	interface Server {
		addressString?: string;
	}
}

export declare module "node:http" {
	interface ClientRequest {
		id?: number;
	}

	interface IncomingMessage {
		id?: number;
	}
}
