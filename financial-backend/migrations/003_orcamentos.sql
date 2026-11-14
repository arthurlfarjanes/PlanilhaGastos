-- 003: Fundação Financeira - Orçamentos por Categoria
-- Migration aditiva e idempotente.

CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  valor_limite NUMERIC(10,2) NOT NULL CHECK (valor_limite > 0),
  alerta_percentual SMALLINT NOT NULL DEFAULT 80 CHECK (alerta_percentual >= 1 AND alerta_percentual <= 100),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, categoria_id)
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_user_ativo
  ON orcamentos (user_id, ativo);

