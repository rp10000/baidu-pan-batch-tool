PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  extraction_code TEXT,
  note TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'running', 'success', 'failed', 'manual_required', 'skipped')
  ),
  target_path TEXT,
  category TEXT,
  new_share_link TEXT,
  error_redacted TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_normalized_url ON tasks(normalized_url);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  event_type TEXT NOT NULL,
  message_redacted TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scan_reports (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  detector TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high')),
  page_or_frame TEXT,
  x REAL,
  y REAL,
  width REAL,
  height REAL,
  confidence REAL,
  rule_name TEXT,
  finding_redacted TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
