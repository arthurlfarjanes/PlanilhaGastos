-- 015: Registro mínimo de feedback do Teco Ajuda ("Foi útil?" / "Instrução desatualizada")
CREATE TABLE IF NOT EXISTS help_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  topic_id VARCHAR(64) NOT NULL,
  route VARCHAR(64) NOT NULL,
  helpful BOOLEAN NOT NULL,
  reason VARCHAR(32) NOT NULL DEFAULT 'helpful',
  note VARCHAR(280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_help_feedback_user_created
  ON help_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_help_feedback_topic
  ON help_feedback (topic_id, reason);
