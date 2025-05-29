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
const chatClients = require('./user_routes').chatClients; // import the chatClients set from user_routes.js
fastify.register(async function (fastify) {
	fastify.get('/chat', { websocket: true }, (socket, req) => {
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
		if (!socket.user) return;
		chatClients.add(socket);
		console.log("Client connected to chat");
		socket.on('message', async (wsmessage) => {
			try {
				const parsedMessage = JSON.parse(wsmessage);
				const destId = parsedMessage.destId;
				const content = parsedMessage.message;

				if (destId === 0) {
					// Handle live chat message
					broadcastToLiveChat(content, socket);

				} else {
					// Handle direct message
					const destinationUser = await findUserById(destId);
					if (!destinationUser) {
						socket.send(JSON.stringify({ error: 'User is offline.' }));
						return;
					}
					sendDirectMessage(destinationUser, content, socket);
				}
			} catch (e) {
				socket.send(JSON.stringify({ message: '[Server]: Invalid message format.' }));
			}
		});
		socket.on('close', () => {
			chatClients.delete(socket);
			console.log("Client disconnected from chat");
		});
	});
});

// Helper functions
function broadcastToLiveChat(content, socket) {
	for (const client of chatClients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify({ message: '[' + socket.user.username + "]: " + content.toString(), type: "public" }));
		}
	}
}

async function findUserById(userId) {
	for (const client of chatClients) {
		if (parseInt(client.user.id) === parseInt(userId) && client.readyState === WebSocket.OPEN) {
			return client;
		}
	}
}

function sendDirectMessage(client, content, socket) {
	client.send(JSON.stringify({ sendId: socket.user.id, message: "[" + socket.user.username + "]: " + content.toString(), type: "private"}));
	socket.send(JSON.stringify({ sendId: client.user.id, message: "[" + socket.user.username + "]: " + content.toString(), type: "private"}));
}

// game websocket route
fastify.register(require("./game_management"));

// Fallback to index.html for unknown routes (SPA support)
fastify.setNotFoundHandler((req, reply) => {
	return reply.sendFile('index.html');
  });

// Run the server!
fastify.listen({ port: 3000 /*host: "0.0.0.0"*/ }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
