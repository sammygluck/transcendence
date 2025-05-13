const fastify = require('fastify')({ logger: true });
const WebSocket = require('ws');

// ...existing code...

const chatClients = required('./user_routes').chatClients; // import the chatClients set from user_routes.js
fastify.register(async function (fastify) {
    fastify.get('/chat', { websocket: true }, (connection, req) => {
        connection.socket.on('message', async (wsmessage) => {
            try {
                const parsedMessage = JSON.parse(wsmessage);
                const destId = parsedMessage.destId;
                const content = parsedMessage.message;

                if (destId === 0) {
                    // Handle live chat message
                    broadcastToLiveChat(content);
                } else {
                    // Handle direct message
                    const destinationUser = await findUserById(destId);
                    if (!destinationUser) {
                        connection.socket.send(JSON.stringify({ error: 'User is offline.' }));
                        return;
                    }
                    sendDirectMessage(destinationUser, content);
                }
            } catch (err) {
                connection.socket.send(JSON.stringify({ error: 'Invalid message format.' }));
            }
        });
    });
});

// Helper functions
function broadcastToLiveChat(content) {
    for (const client of chatClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ message: '[' + socket.user.username + "]: " + content, type: "public" }));
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

function sendDirectMessage(client, content) {
    client.send(JSON.stringify({ sendId: socket.user.id, message: "[" + socket.user.username + "]: " + content, type: "private"}));
    socket.send(JSON.stringify({ sendId: client.user.id, message: "[" + socket.user.username + "]: " + content, type: "private"}));
}

fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    fastify.log.info(`Server listening at ${address}`);
});
