PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','member','superuser','admin')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 last_login_at INTEGER,
 CHECK(role != 'admin' OR email = 'weiser@telysta.com')
);
CREATE TABLE IF NOT EXISTS email_codes (
 email TEXT PRIMARY KEY COLLATE NOCASE,
 challenge_id TEXT NOT NULL,
 digest TEXT NOT NULL,
 sent_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 used_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS documents (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('post','ebook','gallery','score','config')),
 title TEXT NOT NULL,
 source_path TEXT,
 source TEXT NOT NULL,
 owner_id TEXT REFERENCES users(id),
 access TEXT NOT NULL DEFAULT 'public' CHECK(access IN ('public','protected')),
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','published')),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL,
 imported_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS documents_kind ON documents(kind,updated_at,id);
CREATE TABLE IF NOT EXISTS document_revisions (
 document_id TEXT NOT NULL REFERENCES documents(id),
 revision INTEGER NOT NULL,
 source TEXT NOT NULL,
 actor_id TEXT NOT NULL REFERENCES users(id),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(document_id,revision)
);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY,
 actor_id TEXT REFERENCES users(id),
 action TEXT NOT NULL,
 target_id TEXT,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_time ON audit_events(created_at);
CREATE TABLE IF NOT EXISTS auth_limits (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS uploads (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('ebook','image')),
 filename TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL,
 bytes INTEGER NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ready','failed')),
 review_state TEXT NOT NULL DEFAULT 'pending' CHECK(review_state IN ('pending','approved','rejected')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS uploads_owner ON uploads(owner_id,created_at);
CREATE TABLE IF NOT EXISTS upload_limits (
 key TEXT PRIMARY KEY,
 bytes INTEGER NOT NULL,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
ALTER TABLE uploads ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';
