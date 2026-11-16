ALTER TABLE users ADD COLUMN restricted_access INTEGER NOT NULL DEFAULT 0 CHECK(restricted_access IN (0,1));
ALTER TABLE users ADD COLUMN display_name TEXT;
UPDATE users SET restricted_access=1 WHERE role IN ('member','superuser','admin');
CREATE TABLE comments (
 id TEXT PRIMARY KEY,
 document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 author_id TEXT NOT NULL REFERENCES users(id),
 parent_id TEXT REFERENCES comments(id),
 body TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'visible' CHECK(state IN ('visible','hidden','deleted')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 CHECK(length(body)<=4000 AND (state='deleted' OR length(body)>0))
);
CREATE INDEX comments_document_time ON comments(document_id,state,created_at DESC,id DESC);
CREATE INDEX comments_author ON comments(author_id,created_at DESC);
CREATE TABLE comment_limits (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 timestamps TEXT NOT NULL
);
