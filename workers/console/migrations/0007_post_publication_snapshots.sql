CREATE TABLE post_publication_snapshots (
 document_id TEXT NOT NULL REFERENCES documents(id),
 revision INTEGER NOT NULL CHECK(revision > 0),
 source_path TEXT NOT NULL,
 source TEXT NOT NULL,
 base_hash TEXT,
 source_hash TEXT NOT NULL,
 author_id TEXT NOT NULL REFERENCES users(id),
 author_name TEXT NOT NULL,
 author_username TEXT,
 prepared_by TEXT NOT NULL REFERENCES users(id),
 prepared_at INTEGER NOT NULL,
 PRIMARY KEY(document_id, revision)
);
