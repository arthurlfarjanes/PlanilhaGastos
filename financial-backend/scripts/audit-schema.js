// Auditoria somente-leitura do schema (usa DATABASE_URL_DIRECT/DATABASE_URL do .env).
require("dotenv").config();
const { Client } = require("pg");
const { resolvePgSslConfig } = require("../config/ssl");
(async () => {
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  const c = new Client({ connectionString: url, ssl: resolvePgSslConfig(url) });
  await c.connect();
  const cols = await c.query(`SELECT table_name, column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`);
  const cons = await c.query(`SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY 1,2`);
  const idx = await c.query(`SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY 1,2`);
  const cnt = {};
  for (const t of [...new Set(cols.rows.map((r) => r.table_name))]) cnt[t] = (await c.query(`SELECT COUNT(*)::int n FROM "${t}"`)).rows[0].n;
  console.log(JSON.stringify({ cols: cols.rows, cons: cons.rows, idx: idx.rows, cnt }, null, 1));
  await c.end();
})();

