const crypto = require("crypto");

const SENSITIVE_PATTERNS = [
  [/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, "Bearer [REDACTED]"],
  [/eyJ[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}/g, "[JWT_REDACTED]"],
  [/(password|senha|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]"],
];

function sanitizeLogMessage(message) {
  let out = String(message || "");
  for (const [re, replacement] of SENSITIVE_PATTERNS) {
    out = out.replace(re, replacement);
  }
  return out;
}

function hashClientIp(rawIp) {
  if (!rawIp || typeof rawIp !== "string") return null;
  const secret = process.env.JWT_SECRET || "mefinance-audit-salt";
  return crypto.createHmac("sha256", secret).update(rawIp.trim()).digest("hex").slice(0, 24);
}

function extractRequestId(req) {
  const hdr = req?.headers?.["x-request-id"] || req?.headers?.["cf-ray"];
  if (typeof hdr === "string" && hdr.trim()) {
    return hdr.trim().slice(0, 64);
  }
  return null;
}

async function recordAdminAudit(
  { actorUserId, action, targetType = "user", targetId = null, metadata = {}, req = null },
  db = null,
) {
  const conn = db || require("../config/db");
  try {
    const cleanMeta =
      metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
    await conn.query(
      `INSERT INTO admin_audit_logs
         (actor_user_id, action, target_type, target_id, metadata_sanitized, ip_hash, request_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        actorUserId || null,
        String(action || "unknown").slice(0, 64),
        String(targetType || "system").slice(0, 32),
        Number.isInteger(targetId) ? targetId : null,
        JSON.stringify(cleanMeta),
        hashClientIp(req?.ip || req?.socket?.remoteAddress || null),
        extractRequestId(req),
      ],
    );
  } catch (err) {
    console.error("[AUDIT] Falha ao gravar admin_audit_logs:", err.message);
  }
}

module.exports = {
  sanitizeLogMessage,
  hashClientIp,
  extractRequestId,
  recordAdminAudit,
};
