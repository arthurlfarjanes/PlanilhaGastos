/**
 * Runner de migrations (somente SQL aditivo em /migrations, ordem alfabética).
 * Usa DATABASE_URL_DIRECT (conexão direta Neon, sem -pooler) se existir; senão DATABASE_URL.
 * Uso: npm run migrate
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL_DIRECT (preferível) ou DATABASE_URL.");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const idType = await client.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'usuarios' AND column_name = 'id'`,
    );
    if (!idType.rows[0] || !["integer", "bigint"].includes(idType.rows[0].data_type)) {
      throw new Error(`usuarios.id inesperado (${idType.rows[0]?.data_type}). Ajuste a migration antes de aplicar.`);
    }

    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    );
    const dir = path.join(__dirname, "..", "migrations");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const done = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (done.rowCount) continue;
      console.log(`Aplicando ${file}...`);
      await client.query("BEGIN");
      try {
        await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
    console.log("Migrations em dia.");
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error("Falha na migration:", e.message);
  process.exit(1);
});

