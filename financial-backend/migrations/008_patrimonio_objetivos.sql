-- 008: Fundacao Financeira - Patrimonio (ativos) e Objetivos financeiros
-- Migration aditiva e idempotente.
-- Todos os valores monetarios utilizam NUMERIC(12,2).
-- Passivos (dividas) sao integrados dinamicamente a partir da tabela dividas existente.

CREATE TABLE IF NOT EXISTS patrimonio_itens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'outro'
    CHECK (tipo IN (
      'conta_corrente',
      'poupanca',
      'reserva_emergencia',
      'renda_fixa',
      'renda_variavel',
      'previdencia',
      'imovel',
      'veiculo',
      'outro'
    )),
  instituicao VARCHAR(80) DEFAULT '',
  valor_atual NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_atual >= 0),
  valor_investido NUMERIC(12,2) CHECK (valor_investido IS NULL OR valor_investido >= 0),
  liquidez VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (liquidez IN ('imediata', 'media', 'baixa')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrimonio_user ON patrimonio_itens (user_id, ativo);

CREATE TABLE IF NOT EXISTS patrimonio_movimentacoes (
  id SERIAL PRIMARY KEY,
  patrimonio_id INTEGER NOT NULL REFERENCES patrimonio_itens(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('aporte', 'resgate', 'ajuste')),
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  saldo_anterior NUMERIC(12,2) NOT NULL CHECK (saldo_anterior >= 0),
  saldo_novo NUMERIC(12,2) NOT NULL CHECK (saldo_novo >= 0),
  data_movimentacao DATE NOT NULL,
  transacao_id INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
  observacao VARCHAR(200) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patrimonio_mov_item
  ON patrimonio_movimentacoes (patrimonio_id, data_movimentacao DESC, id DESC);

CREATE TABLE IF NOT EXISTS objetivos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  categoria VARCHAR(30) NOT NULL DEFAULT 'outro'
    CHECK (categoria IN (
      'reserva_emergencia',
      'viagem',
      'imovel',
      'veiculo',
      'aposentadoria',
      'educacao',
      'quitacao',
      'outro'
    )),
  valor_alvo NUMERIC(12,2) NOT NULL CHECK (valor_alvo > 0),
  valor_atual NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_atual >= 0),
  aporte_mensal_planejado NUMERIC(12,2) CHECK (aporte_mensal_planejado IS NULL OR aporte_mensal_planejado >= 0),
  prazo DATE,
  prioridade VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),
  patrimonio_id INTEGER REFERENCES patrimonio_itens(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'pausado')),
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objetivos_user_status ON objetivos (user_id, status);

CREATE TABLE IF NOT EXISTS objetivos_contribuicoes (
  id SERIAL PRIMARY KEY,
  objetivo_id INTEGER NOT NULL REFERENCES objetivos(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('aporte', 'resgate')),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  data_contribuicao DATE NOT NULL,
  transacao_id INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
  observacao VARCHAR(200) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objetivos_contrib_obj
  ON objetivos_contribuicoes (objetivo_id, data_contribuicao DESC, id DESC);
