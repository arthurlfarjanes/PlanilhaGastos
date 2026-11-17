-- ============================================================================
-- MeFinance v3.0 (Pré-Fases 5 e 6) — Script Único de Migrations para Produção
-- Inclui: 000_base_schema.sql até 017_admin_audit_trail.sql
-- Características: aditivo, idempotente e encapsulado em transação (BEGIN/COMMIT).
-- Seguro para rodar em produção com dados existentes: usa IF NOT EXISTS,
-- blocos DO $$ ... $$ e ON CONFLICT DO NOTHING, registrando tudo em
-- schema_migrations para manter compatibilidade com `npm run migrate` e /admin/health.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 000_base_schema.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(20) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  token_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cor VARCHAR(20) DEFAULT '#10b981'
);

CREATE TABLE IF NOT EXISTS gastos_fixos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  dia_vencimento INTEGER NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(20) NOT NULL DEFAULT 'despesa',
  is_assinatura BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  gerar_automatico BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS transacoes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transacoes_user_data
  ON transacoes (user_id, data);

CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20) DEFAULT 'error',
  message TEXT NOT NULL,
  stack TEXT,
  route VARCHAR(255),
  user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (name)
VALUES ('000_base_schema.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 001_user_preferences.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (name)
VALUES ('001_user_preferences.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 002_contas_recorrencias.sql
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transacoes_user_data
  ON transacoes (user_id, data DESC);

ALTER TABLE gastos_fixos
  ADD COLUMN IF NOT EXISTS is_assinatura BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS gerar_automatico BOOLEAN NOT NULL DEFAULT TRUE;

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

INSERT INTO schema_migrations (name)
VALUES ('002_contas_recorrencias.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 003_orcamentos.sql
-- ============================================================================
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

INSERT INTO schema_migrations (name)
VALUES ('003_orcamentos.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 004_dividas.sql
-- ============================================================================
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

INSERT INTO schema_migrations (name)
VALUES ('004_dividas.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 005_cartoes.sql
-- ============================================================================
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

INSERT INTO schema_migrations (name)
VALUES ('005_cartoes.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 006_transacoes_cartao.sql
-- ============================================================================
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS cartao_id INTEGER REFERENCES cartoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_cartao
  ON transacoes (cartao_id, data) WHERE cartao_id IS NOT NULL;

INSERT INTO schema_migrations (name)
VALUES ('006_transacoes_cartao.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 007_transacoes_cartao_excluido.sql
-- ============================================================================
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS cartao_excluido_nome VARCHAR(120) DEFAULT NULL;

INSERT INTO schema_migrations (name)
VALUES ('007_transacoes_cartao_excluido.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 008_patrimonio_objetivos.sql
-- ============================================================================
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

INSERT INTO schema_migrations (name)
VALUES ('008_patrimonio_objetivos.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 009_objetivos_patrimonio_sync.sql
-- ============================================================================
ALTER TABLE objetivos_contribuicoes
  ADD COLUMN IF NOT EXISTS patrimonio_movimentacao_id INTEGER REFERENCES patrimonio_movimentacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_objetivos_contrib_pat_mov
  ON objetivos_contribuicoes (patrimonio_movimentacao_id);

INSERT INTO schema_migrations (name)
VALUES ('009_objetivos_patrimonio_sync.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 010_patrimonio_rendimento.sql
-- ============================================================================
ALTER TABLE patrimonio_itens
  ADD COLUMN IF NOT EXISTS rendimento_tipo VARCHAR(20) NOT NULL DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS rendimento_valor NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS cdi_referencia NUMERIC(6,3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patrimonio_rendimento_tipo'
  ) THEN
    ALTER TABLE patrimonio_itens
      ADD CONSTRAINT chk_patrimonio_rendimento_tipo
      CHECK (rendimento_tipo IN ('nenhum', 'cdi_percentual', 'anual', 'mensal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patrimonio_rendimento_valor'
  ) THEN
    ALTER TABLE patrimonio_itens
      ADD CONSTRAINT chk_patrimonio_rendimento_valor
      CHECK (rendimento_valor IS NULL OR rendimento_valor >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patrimonio_cdi_referencia'
  ) THEN
    ALTER TABLE patrimonio_itens
      ADD CONSTRAINT chk_patrimonio_cdi_referencia
      CHECK (cdi_referencia IS NULL OR cdi_referencia >= 0);
  END IF;
END $$;

INSERT INTO schema_migrations (name)
VALUES ('010_patrimonio_rendimento.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 011_ai_usage_logs.sql
-- ============================================================================
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

INSERT INTO schema_migrations (name)
VALUES ('011_ai_usage_logs.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 012_user_token_version.sql
-- ============================================================================
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

INSERT INTO schema_migrations (name)
VALUES ('012_user_token_version.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 013_classificacao_regras.sql
-- ============================================================================
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

INSERT INTO schema_migrations (name)
VALUES ('013_classificacao_regras.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 014_system_logs_timestamptz.sql
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_logs'
      AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE system_logs
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;

ALTER TABLE system_logs
  ALTER COLUMN created_at SET DEFAULT NOW();

INSERT INTO schema_migrations (name)
VALUES ('014_system_logs_timestamptz.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 015_help_feedback.sql
-- ============================================================================
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

INSERT INTO schema_migrations (name)
VALUES ('015_help_feedback.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 016_gamification_epoch.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_feature_epochs (
  feature_key VARCHAR(64) PRIMARY KEY,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_feature_epochs (feature_key, activated_at)
VALUES ('teco_gamification_v1', NOW())
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO schema_migrations (name)
VALUES ('016_gamification_epoch.sql')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 017_admin_audit_trail.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id INTEGER,
  metadata_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash VARCHAR(64),
  request_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at
  ON admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor
  ON admin_audit_logs (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_action
  ON admin_audit_logs (action, created_at DESC);

INSERT INTO schema_migrations (name)
VALUES ('017_admin_audit_trail.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;
