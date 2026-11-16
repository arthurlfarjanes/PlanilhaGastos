-- 012: Versionamento de token JWT para revogação imediata de sessões após troca/reset de senha ou alteração de acesso

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
