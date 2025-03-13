// required modules
const fastify = require("fastify")({ logger: true }); // Require the framework and instantiate it

// Register the plugins
fastify.register(require("@fastify/websocket"));
fastify.register(require("./sqlite-connector"));

//subfiles for routes
fastify.register(require("./user_routes"));

// Declare a route
fastify.get("/", function handler(request, reply) {
	reply.send({ hello: "world" });
});

// Run the server!
fastify.listen({ port: 3000 }, (err) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
});
