const test = require("node:test");
const assert = require("node:assert");
const {
  parseStrictPositiveInt,
  isValidUsername,
  isValidEmail,
  isValidPassword,
  isValidRole,
  isISODate,
} = require("../utils/validation");
const errorHandler = require("../middlewares/errorHandler");
const authenticateToken = require("../middlewares/authMiddleware");
const { resolvePgSslConfig } = require("../config/ssl");

test("validation helpers rejeitam IDs malformados, roles arbitrárias e credenciais fracas", () => {
  assert.strictEqual(parseStrictPositiveInt("42"), 42);
  assert.strictEqual(parseStrictPositiveInt(7), 7);
  assert.strictEqual(parseStrictPositiveInt("12abc"), null);
  assert.strictEqual(parseStrictPositiveInt("0"), null);
  assert.strictEqual(parseStrictPositiveInt("-5"), null);

  assert.strictEqual(isValidUsername("arthur_dev-1"), true);
  assert.strictEqual(isValidUsername("ab"), false);
  assert.strictEqual(isValidUsername("user name!"), false);

  assert.strictEqual(isValidEmail("user@example.com"), true);
  assert.strictEqual(isValidEmail("invalid-email"), false);

  assert.strictEqual(isValidPassword("12345678"), true);
  assert.strictEqual(isValidPassword("1234567"), false);
  assert.strictEqual(isValidPassword("a".repeat(73)), false);

  assert.strictEqual(isValidRole("user"), true);
  assert.strictEqual(isValidRole("admin"), true);
  assert.strictEqual(isValidRole("superadmin"), false);

  assert.strictEqual(isISODate("2026-11-17"), true);
  assert.strictEqual(isISODate("2026-02-29"), false);
  assert.strictEqual(isISODate("2026-13-01"), false);
  assert.strictEqual(isISODate("17/11/2026"), false);
});

test("errorHandler nunca expõe stack trace nem details internos na resposta HTTP", async () => {
  let capturedStatus = null;
  let capturedBody = null;
  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(payload) {
      capturedBody = payload;
      return this;
    },
  };
  const mockReq = { originalUrl: "/rota-teste", user: { userId: null } };
  const fakeError = new Error("SELECT * FROM segredo_interno falhou");

  await errorHandler(fakeError, mockReq, mockRes, () => {});

  assert.strictEqual(capturedStatus, 500);
  assert.strictEqual(capturedBody.status, "error");
  assert.strictEqual(capturedBody.stack, undefined);
  assert.strictEqual(capturedBody.details, undefined);
});

test("authenticateToken exige estritamente esquema Bearer", async () => {
  let statusCode = null;
  let payload = null;
  const res = {
    status(c) {
      statusCode = c;
      return this;
    },
    json(b) {
      payload = b;
      return this;
    },
  };

  await authenticateToken(
    { headers: { authorization: "Basic abc123" }, originalUrl: "/preferencias" },
    res,
    () => {
      throw new Error("Não deveria chamar next() para esquema Basic");
    },
  );
  assert.strictEqual(statusCode, 401);
  assert.ok(payload.error);
});

test("resolvePgSslConfig aplica SSL estrito por padrão para hosts remotos", () => {
  const prevSsl = process.env.DB_SSL;
  const prevReject = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  try {
    delete process.env.DB_SSL;
    delete process.env.DB_SSL_REJECT_UNAUTHORIZED;

    assert.deepStrictEqual(
      resolvePgSslConfig("postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require"),
      { rejectUnauthorized: true },
    );
    assert.strictEqual(
      resolvePgSslConfig("postgresql://postgres:postgres@localhost:5432/mefinance"),
      false,
    );

    process.env.DB_SSL_REJECT_UNAUTHORIZED = "false";
    assert.deepStrictEqual(
      resolvePgSslConfig("postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require"),
      { rejectUnauthorized: false },
    );
  } finally {
    if (prevSsl === undefined) delete process.env.DB_SSL;
    else process.env.DB_SSL = prevSsl;
    if (prevReject === undefined) delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
    else process.env.DB_SSL_REJECT_UNAUTHORIZED = prevReject;
  }
});
