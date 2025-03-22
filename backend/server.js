const secret = "superSecretStringForJWT"; // move to .env file

// required modules
const fastify = require("fastify")({ logger: true }); // Require the framework and instantiate it
const path = require("node:path");

// Register the plugins
fastify.register(require("@fastify/websocket"));
fastify.register(require("./plugins/sqlite-connector"));
fastify.register(require("@fastify/jwt"), {
	secret: secret,
});
fastify.register(require("./plugins/authenticate_jwt"));
fastify.register(require("@fastify/static"), {
	root: path.join(__dirname, "..", "frontend"),
	//prefix: "/public/", // optional: default '/'
});
fastify.register(require("@fastify/formbody")); // parse x-www-form-urlencoded bodies

//subfiles for routes
fastify.register(require("./user_routes"));

// Declare a route
/*fastify.get("/", function handler(request, reply) {
	reply.send({ hello: "world" });
});*/

// websocket route
fastify.register(async function (fastify) {
	fastify.get(
		"/ws",
		{ websocket: true /*, onRequest: [fastify.authenticate]*/ },
		(socket, req) => {
			socket.on("message", (message) => {
				console.log("ws message: ", message.toString());
			});
			console.log("ws connection established");
			let id = setInterval(() => {
				socket.send(Date.now());
			}, 5000);
			socket.on("close", () => {
				clearInterval(id);
				console.log("ws connection closed");
			});
		}
	);
});

// websocket chat route
const chatClients = new Set();
fastify.register(async function (fastify) {
	fastify.get(
		"/chat",
		{ websocket: true /*onRequest: [fastify.authenticate]*/ },
		(socket, req) => {
			socket.on("message", (message) => {
				console.log("chat message: ", message.toString());
				for (const client of chatClients) {
					if (client.readyState === WebSocket.OPEN) {
						client.send(message.toString());
					}
				}
			});
			chatClients.add(socket);
			console.log("client connected to chat");
			socket.on("close", () => {
				chatClients.delete(socket);
				console.log("client disconnected from chat");
			});
		}
	);
});

// Run the server!
fastify.listen({ port: 3000 }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
