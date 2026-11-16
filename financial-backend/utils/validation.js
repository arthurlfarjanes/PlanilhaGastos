/**
 * Helpers compartilhados de validação de entrada e identidade.
 */

const VALID_ROLES = Object.freeze(["user", "admin"]);

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

module.exports = {
  VALID_ROLES,
  parseStrictPositiveInt,
  isValidUsername,
  isValidEmail,
  isValidPassword,
  isValidRole,
};
