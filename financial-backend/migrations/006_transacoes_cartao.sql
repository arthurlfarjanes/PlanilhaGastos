-- 006: Cartoes vinculados a transacoes (substitui o modelo de "compras" do cartao)
-- Migration aditiva e idempotente.
-- Regra de negocio: uma despesa pode ser atrelada a um cartao (transacoes.cartao_id).
-- A fatura passa a ser calculada a partir dessas transacoes (data + dia de fechamento).
-- O pagamento da fatura apenas liquida a fatura (NAO cria outra despesa).
-- Se o cartao for excluido, as transacoes permanecem (cartao_id vira NULL).
-- As tabelas cartoes_compras (005) deixam de ser usadas; nao sao removidas por seguranca.

ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS cartao_id INTEGER REFERENCES cartoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_cartao
  ON transacoes (cartao_id, data) WHERE cartao_id IS NOT NULL;

