-- 001: preferências do usuário (aditiva, idempotente, não destrutiva).
-- Pressupõe usuarios.id inteiro (SERIAL/INTEGER) — o runner valida antes de aplicar.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

