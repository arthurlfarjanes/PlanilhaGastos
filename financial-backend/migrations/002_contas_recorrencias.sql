-- 002: Fundação Financeira - Contas, Vencimentos, Assinaturas e Índice de Transações
-- Migration aditiva e idempotente.

-- Índice para acelerar consultas por usuário e período no extrato e cálculos de resumo
CREATE INDEX IF NOT EXISTS idx_transacoes_user_data
  ON transacoes (user_id, data DESC);

-- Evolução aditiva de gastos_fixos para suportar assinaturas, pausa e controle de geração automática
ALTER TABLE gastos_fixos
  ADD COLUMN IF NOT EXISTS is_assinatura BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS gerar_automatico BOOLEAN NOT NULL DEFAULT TRUE;

-- Controle de pagamentos/recebimentos efetivados por competência (evita duplicidade com transações)
CREATE TABLE IF NOT EXISTS gastos_fixos_pagamentos (
  id SERIAL PRIMARY KEY,
  gasto_fixo_id INTEGER NOT NULL REFERENCES gastos_fixos(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  competencia_ano SMALLINT NOT NULL CHECK (competencia_ano >= 2000 AND competencia_ano <= 2100),
  competencia_mes SMALLINT NOT NULL CHECK (competencia_mes >= 1 AND competencia_mes <= 12),
  valor_pago NUMERIC(10,2) NOT NULL CHECK (valor_pago > 0),
  data_pagamento DATE NOT NULL,
  transacao_id INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gasto_fixo_id, competencia_ano, competencia_mes)
);

CREATE INDEX IF NOT EXISTS idx_gfp_usuario_competencia
  ON gastos_fixos_pagamentos (usuario_id, competencia_ano, competencia_mes);

