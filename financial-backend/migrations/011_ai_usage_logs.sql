-- 011: Contabilizacao de uso/limites gratuitos de IA e historico opcional de conversas

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  model VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('ok', 'quota_excedida', 'indisponivel', 'erro')),
  prompt_tokens INTEGER CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens INTEGER CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),
  neurons INTEGER CHECK (neurons IS NULL OR neurons >= 0),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  usage_date_utc DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'UTC')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date
  ON ai_usage_logs (user_id, usage_date_utc, status);

CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_date
  ON ai_usage_logs (provider, usage_date_utc, status);

CREATE TABLE IF NOT EXISTS ai_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tools_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider VARCHAR(30),
  model VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_user_created
  ON ai_messages (user_id, created_at DESC, id DESC);
