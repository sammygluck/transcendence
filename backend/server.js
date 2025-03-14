const secret = "superSecretStringForJWT"; // move to .env file

// required modules
const fastify = require("fastify")({ logger: true }); // Require the framework and instantiate it

// Register the plugins
fastify.register(require("@fastify/websocket"));
fastify.register(require("./plugins/sqlite-connector"));
fastify.register(require("@fastify/jwt"), {
	secret: secret,
});
fastify.register(require("./plugins/authenticate_jwt"));

//subfiles for routes
fastify.register(require("./user_routes"));

// Declare a route
fastify.get("/", function handler(request, reply) {
	reply.send({ hello: "world" });
});

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

// Run the server!
fastify.listen({ port: 3000 }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
