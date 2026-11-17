-- 016: Marco temporal de ativação da gamificação (Teco Academy)
-- Garante que missões práticas contabilizem apenas ações criadas após a entrada em vigor neste ambiente.
CREATE TABLE IF NOT EXISTS app_feature_epochs (
  feature_key VARCHAR(64) PRIMARY KEY,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_feature_epochs (feature_key, activated_at)
VALUES ('teco_gamification_v1', NOW())
ON CONFLICT (feature_key) DO NOTHING;
