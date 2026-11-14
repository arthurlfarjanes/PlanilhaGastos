-- 007: Preserva o nome do cartão nas transações quando o cartão é excluído
-- Migration aditiva e idempotente.
-- Permite exibir feedback visual no extrato e nas parcelas vincendas de que
-- a transação foi lançada em um cartão que não está mais cadastrado.

ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS cartao_excluido_nome VARCHAR(120) DEFAULT NULL;

