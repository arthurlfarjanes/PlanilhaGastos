-- 005: Fundacao Financeira - Cartoes de credito, compras parceladas e faturas
-- Migration aditiva e idempotente.
-- Decisao anti-duplicidade: compras no cartao NAO geram transacoes. Somente o
-- pagamento da fatura gera UMA transacao de despesa (opcional), vinculada em
-- cartoes_faturas_pagas. Excluir a transacao remove o pagamento (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS cartoes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(80) NOT NULL,
  bandeira VARCHAR(30),
  limite_total NUMERIC(12,2) NOT NULL CHECK (limite_total >= 0),
  dia_fechamento SMALLINT NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento SMALLINT NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cartoes_user ON cartoes (user_id, ativo);

CREATE TABLE IF NOT EXISTS cartoes_compras (
  id SERIAL PRIMARY KEY,
  cartao_id INTEGER NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descricao VARCHAR(120) NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total > 0),
  total_parcelas INTEGER NOT NULL DEFAULT 1 CHECK (total_parcelas BETWEEN 1 AND 60),
  data_compra DATE NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cartoes_compras_cartao ON cartoes_compras (cartao_id, data_compra);

CREATE TABLE IF NOT EXISTS cartoes_faturas_pagas (
  id SERIAL PRIMARY KEY,
  cartao_id INTEGER NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  competencia_ano SMALLINT NOT NULL,
  competencia_mes SMALLINT NOT NULL CHECK (competencia_mes BETWEEN 1 AND 12),
  valor_pago NUMERIC(12,2) NOT NULL CHECK (valor_pago >= 0),
  data_pagamento DATE NOT NULL,
  transacao_id INTEGER REFERENCES transacoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cartao_id, competencia_ano, competencia_mes)
);

