import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatDateTimeInTimezone,
  dateKeyInTimezone,
  extractCivilDateISO,
  setFormatConfig,
  resolveSafeTimezone,
} from "./formatters.js";

describe("formatters — Datas civis vs Instantes em timezone IANA", () => {
  it("exibe instante UTC próximo à meia-noite corretamente em America/Sao_Paulo, UTC e Asia/Tokyo", () => {
    setFormatConfig({ locale: "pt-BR", dateFormat: "locale", timezone: "America/Sao_Paulo" });
    const instante = "2026-11-17T02:30:45.000Z";

    // Em São Paulo (-03:00), 02:30:45Z é dia 16/11/2026 às 23:30:45
    const sp = formatDateTimeInTimezone(instante, "America/Sao_Paulo", "pt-BR");
    assert.match(sp, /16\/11\/2026/);
    assert.match(sp, /23:30:45/);
    assert.equal(dateKeyInTimezone(instante, "America/Sao_Paulo"), "2026-11-16");

    // Em UTC, continua dia 17/11/2026 às 02:30:45
    const utc = formatDateTimeInTimezone(instante, "UTC", "pt-BR");
    assert.match(utc, /17\/11\/2026/);
    assert.match(utc, /02:30:45/);
    assert.equal(dateKeyInTimezone(instante, "UTC"), "2026-11-17");

    // Em Tóquio (+09:00), é dia 17/11/2026 às 11:30:45
    const tokyo = formatDateTimeInTimezone(instante, "Asia/Tokyo", "pt-BR");
    assert.match(tokyo, /17\/11\/2026/);
    assert.match(tokyo, /11:30:45/);
    assert.equal(dateKeyInTimezone(instante, "Asia/Tokyo"), "2026-11-17");
  });

  it("respeita dateFormat customizado (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY) com timezone IANA", () => {
    const instante = "2026-11-17T01:05:09.000Z";
    setFormatConfig({ locale: "pt-BR", dateFormat: "YYYY-MM-DD", timezone: "America/Sao_Paulo" });
    assert.equal(formatDateTimeInTimezone(instante, "America/Sao_Paulo"), "2026-11-16, 22:05:09");

    setFormatConfig({ locale: "pt-BR", dateFormat: "MM/DD/YYYY", timezone: "America/Sao_Paulo" });
    assert.equal(formatDateTimeInTimezone(instante, "America/Sao_Paulo"), "11/16/2026, 22:05:09");

    setFormatConfig({ locale: "pt-BR", dateFormat: "locale", timezone: "America/Sao_Paulo" });
  });

  it("preserva datas civis (YYYY-MM-DD) sem deslocar o dia ao formatar", () => {
    setFormatConfig({ locale: "pt-BR", dateFormat: "DD/MM/YYYY", timezone: "America/Sao_Paulo" });
    assert.equal(extractCivilDateISO("2026-11-17"), "2026-11-17");
    assert.equal(extractCivilDateISO("2026-11-17T00:00:00.000Z"), "2026-11-17");
    assert.equal(formatDate("2026-11-17"), "17/11/2026");
    assert.equal(formatDate("2026-11-17T00:00:00.000Z"), "17/11/2026");
  });

  it("faz fallback seguro para America/Sao_Paulo se timezone for inválida", () => {
    assert.equal(resolveSafeTimezone("Invalid/TZ"), "America/Sao_Paulo");
    assert.equal(resolveSafeTimezone("-03:00"), "America/Sao_Paulo");
    assert.equal(resolveSafeTimezone(""), "America/Sao_Paulo");
    assert.equal(resolveSafeTimezone("Europe/Lisbon"), "Europe/Lisbon");
  });
});
