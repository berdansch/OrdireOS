-- OrdireOS — Migração de segurança: tabela de revogação de refresh tokens
-- Rodar no SQL Editor do Neon (console.neon.tech)
-- Necessária para o logout revogar de fato o refresh token (item 4 do pentest)

CREATE TABLE IF NOT EXISTS revoked_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);

SELECT 'revoked_tokens criada com sucesso' AS status;
