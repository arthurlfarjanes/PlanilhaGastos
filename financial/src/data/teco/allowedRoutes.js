/**
 * Allowlist estrita de rotas internas que o Teco pode abrir.
 * Impede navegação para URLs externas, protocolos inseguros ou rotas administrativas sem permissão.
 */

export const ALLOWED_TECO_ROUTES = Object.freeze([
  "/comparativo",
  "/dashboard",
  "/gastos-fixos",
  "/cartoes",
  "/dividas",
  "/patrimonio",
  "/orcamentos",
  "/objetivos",
  "/projecoes",
  "/diagnosticos",
  "/classificacao",
  "/otimizacao",
  "/relatorios",
  "/assistente",
  "/configuracoes",
  "/admin",
]);

const ALLOWED_SET = new Set(ALLOWED_TECO_ROUTES);
const ALLOWED_QUERY_KEYS = new Set(["aba", "origem", "topico"]);

/**
 * Valida e normaliza uma rota interna permitida.
 * Retorna `{ pathname, search, full }` ou `null` se bloqueada.
 */
export function normalizeAllowedTecoRoute(target, options = {}) {
  if (typeof target !== "string") return null;
  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\r\n\0]/.test(trimmed)) return null;

  let parsed;
  try {
    parsed = new URL(trimmed, "https://mefinance.local");
  } catch {
    return null;
  }

  if (parsed.origin !== "https://mefinance.local") return null;

  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  if (!ALLOWED_SET.has(pathname)) return null;
  if (pathname === "/admin" && options.role !== "admin") return null;

  const cleanParams = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (ALLOWED_QUERY_KEYS.has(key) && value && value.length <= 64) {
      cleanParams.set(key, value);
    }
  }

  const queryString = cleanParams.toString();
  const search = queryString ? `?${queryString}` : "";
  return {
    pathname,
    search,
    full: `${pathname}${search}`,
  };
}

export function isAllowedTecoRoute(target, options = {}) {
  return normalizeAllowedTecoRoute(target, options) !== null;
}
