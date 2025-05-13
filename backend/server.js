const secret = "superSecretStringForJWT"; // move to .env file

// required modules
const fastify = require("fastify")({ logger: true }); // Require the framework and instantiate it
const path = require("node:path");
const jwt = require("jsonwebtoken");
const WebSocket = require('ws');

const pong_server = require("./pong_server");

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
fastify.register(require("@fastify/multipart")); // parse multipart/form-data bodies (picture upload)

//subfiles for routes
fastify.register(require("./user_routes").routes);

// Declare a route
/*fastify.get("/", function handler(request, reply) {
	reply.send({ hello: "world" });
});*/

// websocket route
fastify.register(async function (fastify) {
	fastify.get("/ws", { websocket: true }, (socket, req) => {
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
	});
});

// websocket chat route
const chatClients = require("./user_routes").chatClients; // import the chatClients set from user_routes.js
fastify.register(async function (fastify) {
	fastify.get("/chat", { websocket: true }, (socket, req) => {
		// authenticate the user
		const token = req.query.token;
		if (!token) {
			socket.close(4000, "No token provided");
			return;
		}
		jwt.verify(token, secret, (err, decoded) => {
			if (err) {
				socket.close(4001, "Invalid token");
				return;
			}
			socket.user = decoded;
		});
		if (!socket.user) {
			return;
		}
		// add the socket to the chat clients set
		chatClients.add(socket);
		console.log("client connected to chat");
		// handle events
		socket.on("message", (wsMessage) => {
			try {
				const messageObject = JSON.parse(wsMessage);
				const message = messageObject.message;
				const userId = messageObject.userId;
				console.log("chat message: ", message.toString());
				if (userId) {
					// send the message to the specific user
					let found = false;
					for (const client of chatClients) {
						if (
							parseInt(client.user.id) === parseInt(userId) &&
							client.readyState === WebSocket.OPEN
						) {
							found = true;
							client.send(
								JSON.stringify({
									message:
										"[" + socket.user.username + "]: " + message.toString(),
									type: "private",
								})
							);
						}
					}
					// send a message back to the sender
					if (found) {
						socket.send(
							JSON.stringify({
								message:
									"[" + socket.user.username + "]: " + message.toString(),
								type: "private",
							})
						);
					} else {
						// send a message back to the sender that the user is not found
						socket.send(
							JSON.stringify({
								message: "[Server]: User not found",
								type: "server",
							})
						);
					}
				} else {
					// send the message to all clients
					for (const client of chatClients) {
						if (client.readyState === WebSocket.OPEN) {
							client.send(
								JSON.stringify({
									message:
										"[" + socket.user.username + "]: " + message.toString(),
									type: "public",
								})
							);
						}
					}
				}
			} catch (e) {
				socket.send(
					JSON.stringify({
						message: "[Server]: Invalid message format",
						type: "server",
					})
				);
				console.log("Invalid message format: ", e);
			}
		});
		socket.on("close", () => {
			chatClients.delete(socket);
			console.log("client disconnected from chat");
		});
	});
});

// game websocket route
fastify.register(async function (fastify) {
	fastify.get("/game", { websocket: true }, (socket, req) => {
		// authenticate the user
		const token = req.query.token;
		if (!token) {
			socket.close(4000, "No token provided");
			return;
		}
		jwt.verify(token, secret, (err, decoded) => {
			if (err) {
				socket.close(4001, "Invalid token");
				return;
			}
			socket.user = decoded;
			socket.user.type = "both"; // testing
		});
		if (!socket.user) {
			return;
		}
		pong_server.game.addSocket(socket);
		console.log("client connected to game");
	});
});

// Run the server!
fastify.listen({ port: 3000 /*host: "0.0.0.0"*/ }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
