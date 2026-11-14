// Configuração de formatação regional. Atualizada pelo PreferencesContext
// com as preferências financeiras do usuário (persistidas no servidor).
let cfg = {
  currency: "BRL",
  locale: "pt-BR",
  dateFormat: "locale",
  timezone: "America/Sao_Paulo",
};

export const setFormatConfig = (next) => {
  cfg = { ...cfg, ...next };
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
 * Formata datas "somente dia" vindas da API (armazenadas sem fuso) no formato
 * preferido. Usa UTC para não deslocar o dia.
 */
export const formatDate = (value, { short = false } = {}) => {
  const d = new Date(value);
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
  return map[cfg.dateFormat];
};

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Data de hoje (YYYY-MM-DD) no fuso horário preferido. */
export const todayInTimezone = (timezone = cfg.timezone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
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
