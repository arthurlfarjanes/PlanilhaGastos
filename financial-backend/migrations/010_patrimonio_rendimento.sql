-- 010: Adiciona configuracao opcional de taxa de rendimento / % do CDI em patrimonio_itens

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
