const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const path = require("node:path");
const fs = require("node:fs/promises");
const mime = require("mime");

async function routes(fastify, options) {
	fastify.get(
		"/user/:id",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			try {
				const result = await fastify.sqlite.get(
					"SELECT users.id, users.username, users.email, users.created_at, users.updated_at, users.friends, users.avatar FROM users WHERE id = ?",
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
		}
	);

	fastify.get(
		"/currentuser",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			try {
				const result = await fastify.sqlite.get(
					"SELECT users.id, users.username, users.email, users.created_at, users.updated_at, users.blocked_users, users.friends, users.avatar FROM users WHERE id = ?",
					[request.user.id]
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
		}
	);

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

	// update user information (username, avatar, blocked_users, friends)
	// email cannot be updated at the moment
	// password cannot be updated with this api
	fastify.put(
		"/user",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.body.username) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			const username = request.body.username;
			const avatar = request.body.avatar || null;
			const updated_at = new Date()
				.toISOString()
				.slice(0, 19)
				.replace("T", " ");
			let blocked_users = request.body.blocked_users || null;
			let friends = request.body.friends || null;
			if (
				blocked_users &&
				!(typeof blocked_users === "string" || blocked_users instanceof String)
			) {
				blocked_users = JSON.stringify(blocked_users);
			}
			if (
				friends &&
				!(typeof friends === "string" || friends instanceof String)
			) {
				friends = JSON.stringify(friends);
			}
			try {
				const result = await fastify.sqlite.run(
					"UPDATE users SET username = ?, avatar = ?, blocked_users = ?, friends = ?, updated_at = ? WHERE id = ?",
					[
						username,
						avatar,
						blocked_users,
						friends,
						updated_at,
						request.user.id,
					]
				);
				console.log(result);
				if (result.changes === 0) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				reply.statusCode = 204; // no content
				return;
			} catch (error) {
				console.error("Error updating user: " + error.message);
				reply.statusCode = 500;
				return { error: "Error updating user" };
			}
		}
	);

	// add friend
	fastify.post(
		"/friend",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.body.friendId) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			try {
				const result = await fastify.sqlite.get(
					"SELECT friends FROM users WHERE id = ?",
					[request.user.id]
				);
				if (!result) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				let friends = result.friends ? JSON.parse(result.friends) : [];
				const friendId = request.body.friendId.toString();
				if (friends.includes(friendId)) {
					reply.statusCode = 409;
					return { error: "Friend already added", friends: friends };
				}
				friends.push(friendId);
				const updated_at = new Date()
					.toISOString()
					.slice(0, 19)
					.replace("T", " ");
				const updateResult = await fastify.sqlite.run(
					"UPDATE users SET friends = ?, updated_at = ? WHERE id = ?",
					[JSON.stringify(friends), updated_at, request.user.id]
				);
				if (updateResult.changes === 0) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				return { friends: friends };
			} catch (error) {
				console.error("Error adding friend: " + error.message);
				reply.statusCode = 500;
				return { error: "Error adding friend" };
			}
		}
	);

	// remove friend
	fastify.delete(
		"/friend",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.body.friendId) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			try {
				const result = await fastify.sqlite.get(
					"SELECT friends FROM users WHERE id = ?",
					[request.user.id]
				);
				if (!result) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				let friends = result.friends ? JSON.parse(result.friends) : [];
				const friendId = request.body.friendId.toString();
				if (!friends.includes(friendId)) {
					reply.statusCode = 409;
					return { error: "Friend not found", friends: friends };
				}
				friends = friends.filter((id) => id !== friendId);
				const updated_at = new Date()
					.toISOString()
					.slice(0, 19)
					.replace("T", " ");
				const updateResult = await fastify.sqlite.run(
					"UPDATE users SET friends = ?, updated_at = ? WHERE id = ?",
					[JSON.stringify(friends), updated_at, request.user.id]
				);
				if (updateResult.changes === 0) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				return { friends: friends };
			} catch (error) {
				console.error("Error removing friend: " + error.message);
				reply.statusCode = 500;
				return { error: "Error removing friend" };
			}
		}
	);

	// block user
	fastify.post(
		"/block",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.body.userId) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			try {
				const result = await fastify.sqlite.get(
					"SELECT blocked_users FROM users WHERE id = ?",
					[request.user.id]
				);
				if (!result) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				let blocked_users = result.blocked_users
					? JSON.parse(result.blocked_users)
					: [];
				const userId = request.body.userId.toString();
				if (blocked_users.includes(userId)) {
					reply.statusCode = 409;
					return {
						error: "User already blocked",
						blocked_users: blocked_users,
					};
				}
				blocked_users.push(userId);
				const updated_at = new Date()
					.toISOString()
					.slice(0, 19)
					.replace("T", " ");
				const updateResult = await fastify.sqlite.run(
					"UPDATE users SET blocked_users = ?, updated_at = ? WHERE id = ?",
					[JSON.stringify(blocked_users), updated_at, request.user.id]
				);
				if (updateResult.changes === 0) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				return { blocked_users: blocked_users };
			} catch (error) {
				console.error("Error blocking user: " + error.message);
				reply.statusCode = 500;
				return { error: "Error blocking user" };
			}
		}
	);

	// unblock user
	fastify.delete(
		"/block",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.body.userId) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			try {
				const result = await fastify.sqlite.get(
					"SELECT blocked_users FROM users WHERE id = ?",
					[request.user.id]
				);
				if (!result) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				let blocked_users = result.blocked_users
					? JSON.parse(result.blocked_users)
					: [];
				const userId = request.body.userId.toString();
				if (!blocked_users.includes(userId)) {
					reply.statusCode = 409;
					return {
						error: "User not blocked",
						blocked_users: blocked_users,
					};
				}
				blocked_users = blocked_users.filter((id) => id !== userId);
				const updated_at = new Date()
					.toISOString()
					.slice(0, 19)
					.replace("T", " ");
				const updateResult = await fastify.sqlite.run(
					"UPDATE users SET blocked_users = ?, updated_at = ? WHERE id = ?",
					[JSON.stringify(blocked_users), updated_at, request.user.id]
				);
				if (updateResult.changes === 0) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				return { blocked_users: blocked_users };
			} catch (error) {
				console.error("Error unblocking user: " + error.message);
				reply.statusCode = 500;
				return { error: "Error unblocking user" };
			}
		}
	);

	// search user by username
	fastify.get(
		"/search/:username",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.params.username) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			try {
				const result = await fastify.sqlite.all(
					"SELECT id, username, email FROM users WHERE username LIKE ?",
					["%" + request.params.username + "%"]
				);
				if (!result) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				return result;
			} catch (error) {
				reply.statusCode = 500;
				console.error("Error searching user: " + error.message);
				return { error: "Error searching user" };
			}
		}
	);

	// avatar (picture upload)
	fastify.post(
		"/avatar",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			const options = { limits: { fileSize: 5 * 1024 * 1024 } };
			const data = await request.file(options); // this gets the first file only
			const buffer = await data.toBuffer();
			if (!data) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			// check if the file is an image
			const mimeTypes = ["image/jpeg", "image/png", "image/gif"];
			if (!mimeTypes.includes(data.mimetype)) {
				reply.statusCode = 400;
				return { error: "Invalid file type" };
			}
			try {
				const uploadDir = path.join(__dirname, "uploads");
				// check if the directory exists, if not create it
				try {
					await fs.stat(uploadDir);
				} catch {
					console.log("Creating upload directory: " + uploadDir);
					await fs.mkdir(uploadDir);
				}
				const filename = request.user.id + "." + data.mimetype.split("/")[1]; // create a filename based on user id
				const filePath = path.join(uploadDir, filename);
				await fs.writeFile(filePath, buffer);
				// update the user avatar in the database
				const updated_at = new Date()
					.toISOString()
					.slice(0, 19)
					.replace("T", " ");
				const result = await fastify.sqlite.run(
					"UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?",
					[filename, updated_at, request.user.id]
				);
				if (result.changes === 0) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				// return the filename to the client
				reply.statusCode = 201; // created
				return { filename: filename };
			} catch (error) {
				console.error("Error uploading avatar: " + error.message);
				reply.statusCode = 500;
				return { error: "Error uploading avatar" };
			}
		}
	);

	// get avatar picture
	fastify.get(
		"/avatar/:id",
		{
			onRequest: [fastify.authenticate],
		},
		async (request, reply) => {
			if (!request.params.id) {
				reply.statusCode = 400;
				return { error: "Missing required fields" };
			}
			try {
				const result = await fastify.sqlite.get(
					"SELECT avatar FROM users WHERE id = ?",
					[request.params.id]
				);
				if (!result) {
					reply.statusCode = 404;
					return { error: "User not found" };
				}
				if (!result.avatar) {
					reply.statusCode = 404;
					return { error: "Avatar not found" };
				}
				const filePath = path.join(__dirname, "uploads", result.avatar);
				try {
					const file = await fs.readFile(filePath);
					const mimeType = mime.getType(filePath) || "application/octet-stream";
					reply.type(mimeType);
					return reply.send(file);
				} catch (error) {
					console.error("Error reading avatar file: " + error.message);
					reply.statusCode = 404;
					return { error: "Avatar not found" };
				}
			} catch (error) {
				console.error("Error getting avatar: " + error.message);
				reply.statusCode = 500;
				return { error: "Error getting avatar" };
			}
		}
	);
}

module.exports = routes;
