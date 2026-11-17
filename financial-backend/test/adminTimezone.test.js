const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();
const { isValidTimezone, DEFAULT_TIMEZONE } = require("../utils/validation");
const adminController = require("../controllers/adminController");

const hasDb = Boolean(process.env.DATABASE_URL);

describe("Admin Timezone & Instantes (TIMESTAMPTZ)", () => {
  it("valida timezones IANA válidas e rejeita strings/offsets inválidos", () => {
    assert.equal(DEFAULT_TIMEZONE, "America/Sao_Paulo");
    assert.equal(isValidTimezone("America/Sao_Paulo"), true);
    assert.equal(isValidTimezone("UTC"), true);
    assert.equal(isValidTimezone("Europe/Lisbon"), true);
    assert.equal(isValidTimezone("Asia/Tokyo"), true);
    assert.equal(isValidTimezone("Mars/Olympus"), false);
    assert.equal(isValidTimezone("-03:00"), false);
    assert.equal(isValidTimezone(""), false);
  });

  it("getSystemLogs rejeita timezone inválido com HTTP 400", async () => {
    let statusCode = null;
    let payload = null;
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        payload = body;
        return this;
      },
    };

    await adminController.getSystemLogs(
      { query: { startDate: "2026-11-17", timezone: "Invalid/Zone" } },
      mockRes,
      (err) => {
        throw err;
      },
    );

    assert.equal(statusCode, 400);
    assert.match(payload.error, /timezone/i);
  });

  it("preserva instante UTC exato em TIMESTAMPTZ e filtra fronteira de meia-noite por timezone IANA", { skip: !hasDb }, async () => {
    const pool = require("../config/db");
    const marker = `[test_tz_${Date.now()}]`;
    const instantUtc = "2026-11-17T02:30:00.000Z"; // 16/11 23:30:00 em America/Sao_Paulo
    let logId = null;

    try {
      const ins = await pool.query(
        `INSERT INTO system_logs (level, message, route, created_at)
         VALUES ('info', $1, '/test-tz', $2::timestamptz)
         RETURNING id, created_at`,
        [marker, instantUtc],
      );
      logId = ins.rows[0].id;
      assert.equal(ins.rows[0].created_at.toISOString(), instantUtc);

      const runQuery = async (query) => {
        let body = null;
        await adminController.getSystemLogs(
          { query },
          {
            set() {},
            status() {
              return this;
            },
            json(payload) {
              body = payload;
              return this;
            },
          },
          (err) => {
            throw err;
          },
        );
        return body;
      };

      const spDia16 = await runQuery({
        startDate: "2026-11-16",
        endDate: "2026-11-16",
        timezone: "America/Sao_Paulo",
        route: "/test-tz",
        limit: 100,
      });
      const found16 = spDia16.items.find((r) => r.id === logId);
      assert.ok(found16, "02:30Z deve pertencer ao dia 16/11 em America/Sao_Paulo");
      assert.equal(found16.created_at, instantUtc);

      const spDia17 = await runQuery({
        startDate: "2026-11-17",
        endDate: "2026-11-17",
        timezone: "America/Sao_Paulo",
        route: "/test-tz",
        limit: 100,
      });
      assert.equal(
        spDia17.items.some((r) => r.id === logId),
        false,
        "02:30Z não deve pertencer ao dia 17/11 em America/Sao_Paulo",
      );

      const utcDia17 = await runQuery({
        startDate: "2026-11-17",
        endDate: "2026-11-17",
        timezone: "UTC",
        route: "/test-tz",
        limit: 100,
      });
      assert.ok(
        utcDia17.items.some((r) => r.id === logId),
        "02:30Z deve pertencer ao dia 17/11 em UTC",
      );
    } finally {
      if (logId) {
        await pool.query("DELETE FROM system_logs WHERE id = $1", [logId]).catch(() => {});
      }
    }
  });
});
