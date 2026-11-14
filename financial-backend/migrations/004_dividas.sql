-- 004: Fundação Financeira - Dívidas, Parcelas e Amortizações
-- Migration aditiva e idempotente.

CREATE TABLE IF NOT EXISTS dividas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  credor VARCHAR(120),
  tipo VARCHAR(30) NOT NULL DEFAULT 'emprestimo'
    CHECK (tipo IN ('emprestimo', 'financiamento', 'cartao_parcelado', 'outro')),
  valor_original NUMERIC(12,2) NOT NULL CHECK (valor_original > 0),
  saldo_devedor NUMERIC(12,2) NOT NULL CHECK (saldo_devedor >= 0),
  taxa_juros_mensal NUMERIC(6,3) NOT NULL DEFAULT 0 CHECK (taxa_juros_mensal >= 0),
  total_parcelas INTEGER CHECK (total_parcelas IS NULL OR total_parcelas >= 1),
  parcelas_pagas INTEGER NOT NULL DEFAULT 0 CHECK (parcelas_pagas >= 0),
  valor_parcela NUMERIC(12,2) CHECK (valor_parcela IS NULL OR valor_parcela > 0),
  dia_vencimento SMALLINT CHECK (dia_vencimento IS NULL OR (dia_vencimento >= 1 AND dia_vencimento <= 31)),
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'quitada', 'pausada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dividas_user_status
  ON dividas (user_id, status);

CREATE TABLE IF NOT EXISTS dividas_amortizacoes (
  id SERIAL PRIMARY KEY,
  divida_id INTEGER NOT NULL REFERENCES dividas(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'parcela'
    CHECK (tipo IN ('parcela', 'amortizacao_extra', 'quitacao')),
  valor_pago NUMERIC(12,2) NOT NULL CHECK (valor_pago > 0),
  valor_juros NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_juros >= 0),
  valor_amortizado NUMERIC(12,2) NOT NULL CHECK (valor_amortizado >= 0),
  data_pagamento DATE NOT NULL,
  transacao_id INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
  observacao VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dividas_amort_divida
  ON dividas_amortizacoes (divida_id, data_pagamento DESC);

