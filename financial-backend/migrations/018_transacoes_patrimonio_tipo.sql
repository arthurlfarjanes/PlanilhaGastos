-- 018: Garante largura suficiente e CHECK atualizado em transacoes.tipo, e separa
-- aportes/resgates de patrimônio ('aporte_patrimonio' / 'resgate_patrimonio')
-- para não contabilizar como saída (despesa) nem entrada (receita), descontando
-- apenas do saldo disponível.
-- Migration aditiva e idempotente.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transacoes'
      AND column_name = 'tipo'
      AND character_maximum_length IS NOT NULL
      AND character_maximum_length < 32
  ) THEN
    ALTER TABLE transacoes
      ALTER COLUMN tipo TYPE VARCHAR(32);
  END IF;
END $$;

ALTER TABLE transacoes
  DROP CONSTRAINT IF EXISTS transacoes_tipo_check;

ALTER TABLE transacoes
  ADD CONSTRAINT transacoes_tipo_check
  CHECK (tipo IN ('receita', 'despesa', 'aporte_patrimonio', 'resgate_patrimonio'));

UPDATE transacoes t
SET tipo = CASE
      WHEN pm.tipo = 'aporte' THEN 'aporte_patrimonio'
      WHEN pm.tipo = 'resgate' THEN 'resgate_patrimonio'
      ELSE t.tipo
    END,
    categoria_id = NULL
FROM patrimonio_movimentacoes pm
WHERE pm.transacao_id = t.id
  AND t.user_id = pm.user_id
  AND pm.tipo IN ('aporte', 'resgate')
  AND t.tipo IN ('despesa', 'receita');
