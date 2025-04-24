const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("db.sqlite", (err) => {
	if (err) {
		console.error(err.message);
		process.exit(1);
	}
});

db.run(
	`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
	google_sign_in BOOLEAN DEFAULT FALSE,
	two_factor_auth	BOOLEAN DEFAULT FALSE,
	blocked_users TEXT DEFAULT NULL,
	friends TEXT DEFAULT NULL,
	avatar TEXT DEFAULT NULL
	)`,
	(err) => {
		if (err) {
			console.error(err.message);
		}
	}
);

db.close((err) => {
	if (err) {
		console.error(err.message);
	}
});
