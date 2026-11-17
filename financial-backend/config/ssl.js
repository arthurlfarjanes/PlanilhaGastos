/**
 * Resolve a configuração de SSL do PostgreSQL com validação estrita por padrão.
 * - Conexões remotas (ex.: Neon) exigem `rejectUnauthorized: true` por padrão.
 * - Conexões locais (localhost / 127.0.0.1) em dev/CI usam `ssl: false` automaticamente
 *   quando `sslmode=require` e `DB_SSL=true` não foram solicitados.
 * - `DB_SSL_REJECT_UNAUTHORIZED=false` permite desabilitar verificação apenas por opt-in explícito.
 */
function resolvePgSslConfig(connectionString) {
  const rawUrl = String(connectionString || "").trim();
  const isLocalHost = /^postgres(ql)?:\/\/[^/]*@(localhost|127\.0\.0\.1|::1)(:|\/)/i.test(rawUrl);

  if (
    process.env.DB_SSL === "false" ||
    (isLocalHost && !/sslmode=require/i.test(rawUrl) && process.env.DB_SSL !== "true")
  ) {
    return false;
  }

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";
  const ssl = { rejectUnauthorized };

  if (process.env.DB_SSL_CA) {
    ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
  }

  return ssl;
}

module.exports = { resolvePgSslConfig };
