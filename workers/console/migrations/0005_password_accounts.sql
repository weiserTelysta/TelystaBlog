-- Existing accounts were created only after a successful email challenge.
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
UPDATE users SET email_verified_at=created_at;
ALTER TABLE users ADD COLUMN username TEXT COLLATE NOCASE
 CHECK(username IS NULL OR (length(username) BETWEEN 3 AND 24
  AND username=lower(username) AND substr(username,1,1) GLOB '[a-z]'
  AND username NOT GLOB '*[^a-z0-9_-]*'));
CREATE UNIQUE INDEX users_username ON users(username) WHERE username IS NOT NULL;
UPDATE users SET username='weiser' WHERE email='weiser@telysta.com' AND username IS NULL;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN verified_at INTEGER;
ALTER TABLE email_codes ADD COLUMN purpose TEXT NOT NULL DEFAULT 'login'
 CHECK(purpose IN ('login','register','reset'));
ALTER TABLE email_codes ADD COLUMN consumed_by TEXT;
ALTER TABLE email_codes ADD COLUMN digest_version INTEGER NOT NULL DEFAULT 0 CHECK(digest_version IN (0,1));
