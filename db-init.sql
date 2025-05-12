-- db-init.sql
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT NOT NULL UNIQUE,
  alias       TEXT,
  full_name   TEXT,
  email       TEXT NOT NULL UNIQUE,
  avatar      TEXT DEFAULT NULL,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (username, alias, full_name, email)
VALUES 
  ('johndoe', 'Johnny', 'John Doe', 'john@example.com'),
  ('janedoe', 'Janie',  'Jane Doe', 'jane@example.com');