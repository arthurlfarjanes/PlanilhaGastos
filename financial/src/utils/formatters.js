// Configuração de formatação regional. Atualizada pelo PreferencesContext
// com as preferências financeiras do usuário (persistidas no servidor).
let cfg = {
  currency: "BRL",
  locale: "pt-BR",
  dateFormat: "locale",
  timezone: "America/Sao_Paulo",
};

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const setFormatConfig = (next) => {
  cfg = { ...cfg, ...next };
};

export const resolveSafeTimezone = (timezone = cfg.timezone) => {
  const candidate = typeof timezone === "string" ? timezone.trim() : "";
  const isIanaShape =
    candidate === "UTC" ||
    /^[A-Za-z_]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$/.test(candidate);
  if (!isIanaShape) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    value = 0;
  }
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Extrai data civil (YYYY-MM-DD) sem conversão de fuso horário local.
 */
export const extractCivilDateISO = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
};

/**
 * Formata datas civis ("somente dia" armazenadas sem fuso) no formato
 * preferido. Preserva YYYY-MM-DD usando UTC para não deslocar o dia.
 */
export const formatDate = (value, { short = false } = {}) => {
  if (!value) return "";
  const civil = extractCivilDateISO(value);
  const d = civil
    ? (() => {
        const [y, m, day] = civil.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, day));
      })()
    : new Date(value);
  if (isNaN(d)) return "";
  if (cfg.dateFormat === "locale") {
    return d.toLocaleDateString(
      cfg.locale,
      short
        ? { timeZone: "UTC", day: "2-digit", month: "2-digit" }
        : { timeZone: "UTC" },
    );
  }
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const map = {
    "DD/MM/YYYY": short ? `${dd}/${mm}` : `${dd}/${mm}/${yyyy}`,
    "MM/DD/YYYY": short ? `${mm}/${dd}` : `${mm}/${dd}/${yyyy}`,
    "YYYY-MM-DD": short ? `${mm}-${dd}` : `${yyyy}-${mm}-${dd}`,
  };
  return map[cfg.dateFormat] || `${dd}/${mm}/${yyyy}`;
};

/**
 * Retorna YYYY-MM-DD correspondente a um instante (ISO 8601 / Date) no fuso IANA informado.
 */
export const dateKeyInTimezone = (value, timezone = cfg.timezone) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return "";
  const tz = resolveSafeTimezone(timezone);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

/**
 * Formata um instante real (TIMESTAMPTZ / ISO 8601) usando fuso horário IANA,
 * sem aplicação de offset fixo.
 */
export const formatDateTimeInTimezone = (
  value,
  timezone = cfg.timezone,
  locale = cfg.locale,
) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return "";
  const tz = resolveSafeTimezone(timezone);

  if (cfg.dateFormat === "locale") {
    return new Intl.DateTimeFormat(locale || "pt-BR", {
      timeZone: tz,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const datePart =
    cfg.dateFormat === "MM/DD/YYYY"
      ? `${byType.month}/${byType.day}/${byType.year}`
      : cfg.dateFormat === "YYYY-MM-DD"
        ? `${byType.year}-${byType.month}-${byType.day}`
        : `${byType.day}/${byType.month}/${byType.year}`;
  return `${datePart}, ${byType.hour}:${byType.minute}:${byType.second}`;
};

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Data de hoje (YYYY-MM-DD) no fuso horário preferido. */
export const todayInTimezone = (timezone = cfg.timezone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveSafeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/**
 * Intervalo { dataInicio, dataFim } (YYYY-MM-DD) do período padrão do dashboard.
 * "current_month" respeita o dia de início do período financeiro.
 */
export const getPeriodRange = (period, startDay = 1, timezone = cfg.timezone) => {
  if (period !== "current_month" && period !== "last_30_days") {
    return { dataInicio: "", dataFim: "" };
  }
  const [y, m, d] = todayInTimezone(timezone).split("-").map(Number);
  const today = Date.UTC(y, m - 1, d);
  if (period === "last_30_days") {
    return { dataInicio: iso(today - 29 * 86400000), dataFim: iso(today) };
  }
  const startMonth = d >= startDay ? m - 1 : m - 2;
  const start = Date.UTC(y, startMonth, startDay);
  const nextStart = Date.UTC(y, startMonth + 1, startDay);
  return { dataInicio: iso(start), dataFim: iso(nextStart - 86400000) };
};
