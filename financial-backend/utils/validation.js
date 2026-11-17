/**
 * Helpers compartilhados de validação de entrada e identidade.
 */

const VALID_ROLES = Object.freeze(["user", "admin"]);
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function parseStrictPositiveInt(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function isValidUsername(username) {
  if (typeof username !== "string") return false;
  const trimmed = username.trim();
  return trimmed.length >= 3 && trimmed.length <= 30 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  return trimmed.length >= 5 && trimmed.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 72;
}

function isValidRole(role) {
  return typeof role === "string" && VALID_ROLES.includes(role);
}

function isISODate(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === m &&
    dt.getUTCDate() === d
  );
}

function isValidTimezone(tz) {
  if (typeof tz !== "string" || tz.length > 64) return false;
  const trimmed = tz.trim();
  if (!trimmed) return false;
  const isIanaShape =
    trimmed === "UTC" ||
    /^[A-Za-z_]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$/.test(trimmed);
  if (!isIanaShape) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  VALID_ROLES,
  DEFAULT_TIMEZONE,
  parseStrictPositiveInt,
  isValidUsername,
  isValidEmail,
  isValidPassword,
  isValidRole,
  isISODate,
  isValidTimezone,
};
