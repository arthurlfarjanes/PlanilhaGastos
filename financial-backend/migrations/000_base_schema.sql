-- 000: Schema base idempotente para bootstrap de bancos novos (ex.: CI PostgreSQL)
-- Em bancos já existentes (Neon dev/prod), `CREATE TABLE IF NOT EXISTS` não altera dados nem estrutura.

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
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
