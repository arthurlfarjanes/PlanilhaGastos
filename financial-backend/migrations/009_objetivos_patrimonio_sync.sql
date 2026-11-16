-- 009: Sincronizacao automatica entre movimentacoes de patrimonio e contribuicoes de objetivos

ALTER TABLE objetivos_contribuicoes
  ADD COLUMN IF NOT EXISTS patrimonio_movimentacao_id INTEGER REFERENCES patrimonio_movimentacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_objetivos_contrib_pat_mov
  ON objetivos_contribuicoes (patrimonio_movimentacao_id);
