-- 013: Fase 4 - Regras de classificacao automatica de transacoes (aditivo)

CREATE TABLE IF NOT EXISTS classificacao_regras (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  padrao VARCHAR(100) NOT NULL,
  tipo_match VARCHAR(20) NOT NULL DEFAULT 'contains'
    CHECK (tipo_match IN ('contains', 'starts_with', 'exact')),
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  prioridade INTEGER NOT NULL DEFAULT 10,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  acertos INTEGER NOT NULL DEFAULT 0 CHECK (acertos >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, padrao, tipo_match)
);

CREATE INDEX IF NOT EXISTS idx_classificacao_regras_user_ativo
  ON classificacao_regras (user_id, ativo, prioridade DESC, id ASC);
