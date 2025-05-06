const fastify = require('fastify')({ logger: true });
const WebSocket = require('ws');

// ...existing code...

const chatClients = required('./user_routes').chatClients; // import the chatClients set from user_routes.js
fastify.register(async function (fastify) {
    fastify.get('/chat', { websocket: true }, (connection, req) => {
        connection.socket.on('message', async (wsmessage) => {
            try {
                const parsedMessage = JSON.parse(wsmessage);
                const userId = parsedMessage.userId;
                const content = parsedMessage.message;

                if (userId === 0) {
                    // Handle live chat message
                    broadcastToLiveChat(content);
                } else {
                    // Handle direct message
                    const destinationUser = await findUserById(destinationId);
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
            client.send(JSON.stringify({ message: '[' + socket.user.username + "]: " + content }));
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

function sendDirectMessage(user, content) {
    // ...existing code to send a direct message to a specific user...
}

// ...existing code...

fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    fastify.log.info(`Server listening at ${address}`);
});
