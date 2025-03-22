const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

async function routes(fastify, options) {
	fastify.get("/user/:id", async (request, reply) => {
		try {
			const result = await fastify.sqlite.get(
				"SELECT users.id, users.username, users.email, users.created_at, users.updated_at FROM users WHERE id = ?",
				[request.params.id]
			);
			if (!result) {
				reply.statusCode = 404;
				return { error: "User not found" };
			}
			return result;
		} catch (error) {
			reply.statusCode = 500;
			console.error("Error getting user: " + error.message);
			return { error: "Error getting user" };
		}
	});

	fastify.post("/user", async (request, reply) => {
		if (
			!request.body.username ||
			!request.body.email ||
			!request.body.password
		) {
			reply.statusCode = 400;
			return { error: "Missing required fields" };
		}
		// verify email format
		const atIndex = request.body.email.indexOf("@");
		const dotIndex = request.body.email.lastIndexOf(".");
		if (
			atIndex < 1 ||
			dotIndex < atIndex + 2 ||
			dotIndex + 2 >= request.body.email.length
		) {
			reply.statusCode = 400;
			return { error: "Invalid email format" };
		}
		//verify password length
		if (request.body.password.length < 4) {
			reply.statusCode = 400;
			return { error: "Password must be at least 4 characters long" };
		}
		try {
			const salt = await bcrypt.genSalt();
			const hash = await bcrypt.hash(request.body.password, salt);
			const result = await fastify.sqlite.run(
				"INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
				[request.body.username, request.body.email, hash]
			);
			reply.statusCode = 201; // created
			return { id: result.lastID };
		} catch (error) {
			console.error("Error creating user: " + error.message);
			if (error.message.includes("UNIQUE constraint failed")) {
				reply.statusCode = 409;
				return { error: "User already exists" };
			}
			reply.statusCode = 500;
			return { error: "Error creating user" };
		}
	});

	fastify.post("/login", async (request, reply) => {
		if (!request.body.email || !request.body.password) {
			reply.statusCode = 400;
			return { error: "Missing required fields" };
		}
		try {
			const result = await fastify.sqlite.get(
				"SELECT id, password_hash, username, blocked_users, friends FROM users WHERE email = ?",
				[request.body.email]
			);
			if (!result) {
				reply.statusCode = 404;
				return { error: "User not found" };
			}
			const match = await bcrypt.compare(
				request.body.password,
				result.password_hash
			);
			if (!match) {
				reply.statusCode = 401;
				return { error: "Invalid password" };
			}
			const token = fastify.jwt.sign(
				{
					id: result.id,
					email: request.body.email,
					username: result.username,
				},
				{ expiresIn: "8h" }
			);
			return {
				id: result.id,
				token: token,
				blocked_users: result.blocked_users,
				friends: result.friends,
			};
		} catch (error) {
			reply.statusCode = 500;
			console.error("Error logging in: " + error.message);
			return { error: "Error logging in" };
		}
	});

	fastify.get(
		"/protectedroute",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			return {
				id: request.user.id,
				email: request.user.email,
				username: request.user.username,
			};
		}
	);

	// google auth
	async function verifyGoogleToken(token) {
		const GOOGLE_PUBLIC_KEY_URL = "https://www.googleapis.com/oauth2/v1/certs";
		const GOOGLE_APP_CLIENT_ID =
			"244561649148-pbll9pc66oig5mcul4ivjp9igql4emef.apps.googleusercontent.com";
		try {
			// Fetch Google's public keys
			const response = await fetch(GOOGLE_PUBLIC_KEY_URL);
			const keys = await response.json();

			// Find the matching key for this token
			const decodedHeader = JSON.parse(
				Buffer.from(token.split(".")[0], "base64").toString()
			);

			const key = keys[decodedHeader.kid];
			if (!key) throw new Error("Invalid key ID");

			// Verify the token
			const verifiedToken = jwt.verify(token, key, { algorithms: ["RS256"] });
			if (verifiedToken.aud !== GOOGLE_APP_CLIENT_ID) {
				throw new Error("Invalid client ID");
			}
			if (
				verifiedToken.iss !== "accounts.google.com" &&
				verifiedToken.iss !== "https://accounts.google.com"
			) {
				throw new Error("Invalid issuer");
			}
			return verifiedToken;
		} catch (error) {
			console.error("Google token verification failed:", error);
			return null;
		}
	}

	fastify.post("/googleauth", async (request, reply) => {
		const credential = request.body.credential;
		if (!credential) {
			reply.statusCode = 400;
			return { error: "Missing required fields" };
		}
		const verifiedToken = await verifyGoogleToken(credential);
		if (!verifiedToken) {
			reply.statusCode = 401;
			return { error: "Invalid token" };
		}
		console.log("Google auth succes: ", verifiedToken);
		try {
			const result = await fastify.sqlite.get(
				"SELECT id, google_sign_in, username, blocked_users, friends FROM users WHERE email = ?",
				[verifiedToken.email]
			);
			if (result) {
				if (!result.google_sign_in) {
					reply.statusCode = 409;
					return { error: "User already exists" };
				} else {
					const token = fastify.jwt.sign(
						{
							id: result.id,
							email: verifiedToken.email,
							username: result.username,
						},
						{ expiresIn: "8h" }
					);
					return {
						id: result.id,
						token: token,
						blocked_users: result.blocked_users,
						friends: result.friends,
					};
				}
			} else {
				// user does not exist -> create user in db
				const result = await fastify.sqlite.run(
					"INSERT INTO users (username, email, google_sign_in) VALUES (?, ?, ?)",
					[
						verifiedToken.name || verifiedToken.given_name,
						verifiedToken.email,
						1,
					]
				);
				const token = fastify.jwt.sign(
					{
						id: result.lastID,
						email: verifiedToken.email,
						username: verifiedToken.name || verifiedToken.given_name,
					},
					{ expiresIn: "8h" }
				);
				reply.statusCode = 201; // created
				return {
					id: result.lastID,
					token: token,
					blocked_users: null,
					friends: null,
				};
			}
		} catch (error) {
			console.error("Error google sign in: " + error.message);
			reply.statusCode = 500;
			return { error: "Error logging in" };
		}
	});
}

module.exports = routes;
