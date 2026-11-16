-- The owner identity is provisioned by the installation, not public registration.
INSERT INTO users(id,email,username,role,status,restricted_access,email_verified_at,created_at,updated_at)
VALUES('00000000-0000-4000-8000-000000000001','weiser@telysta.com','telysta','admin','active',1,unixepoch(),unixepoch(),unixepoch())
ON CONFLICT(email) DO NOTHING;
UPDATE users SET username='telysta' WHERE email='weiser@telysta.com' AND password_hash IS NULL AND (username IS NULL OR username='weiser');
CREATE TABLE owner_initialization (
 id TEXT PRIMARY KEY CHECK(id='owner'),
 token_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 used_at INTEGER
);
