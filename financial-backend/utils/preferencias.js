/**
 * Definição, defaults e validação das preferências do usuário.
 * As preferências são armazenadas em JSONB (tabela user_preferences), mas
 * somente chaves e valores desta lista branca são aceitos.
 */

const DASHBOARD_CARDS = ["receitas", "despesas", "saldo"];

const DEFAULTS = Object.freeze({
  appearance: {
    theme: "dark", // comportamento atual do app
    accent: "emerald",
    density: "comfortable",
    reduceMotion: false,
    highContrast: false,
    fontScale: "normal",
    navLayout: "navbar",
  },
  dashboard: {
    defaultPeriod: "all", // comportamento atual: sem filtro de datas
    cardOrder: [...DASHBOARD_CARDS],
    hiddenCards: [],
  },
  financial: {
    currency: "BRL",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    dateFormat: "locale",
    periodStartDay: 1,
  },
  notifications: {
    enabled: true,
    daysAhead: 5,
    remindBills: true,
    remindCards: true,
    remindBudgets: true,
    remindGoals: true,
  },
  ai: {
    enabled: true,
    preferredProvider: "auto",
    responseStyle: "equilibrado",
    saveHistory: true,
    shareTransactionDetails: false,
  },
});

const oneOf = (list) => (v) => list.includes(v);
const isBool = (v) => typeof v === "boolean";

const isTimezone = (v) => {
  if (typeof v !== "string" || v.length > 64) return false;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: v });
    return true;
  } catch {
    return false;
  }
};

const isCardList = (v) =>
  Array.isArray(v) &&
  v.length <= DASHBOARD_CARDS.length &&
  v.every((c) => DASHBOARD_CARDS.includes(c)) &&
  new Set(v).size === v.length;

const isCardOrder = (v) => isCardList(v) && v.length === DASHBOARD_CARDS.length;

const SCHEMA = {
  appearance: {
    theme: oneOf(["dark", "light", "auto"]),
    accent: oneOf(["emerald", "blue", "violet", "amber", "rose"]),
    density: oneOf(["comfortable", "compact"]),
    reduceMotion: isBool,
    highContrast: isBool,
    fontScale: oneOf(["normal", "large", "xlarge"]),
    navLayout: oneOf(["navbar", "sidebar"]),
  },
  dashboard: {
    defaultPeriod: oneOf(["all", "current_month", "last_30_days"]),
    cardOrder: isCardOrder,
    hiddenCards: isCardList,
  },
  financial: {
    currency: oneOf(["BRL", "USD", "EUR"]),
    locale: oneOf(["pt-BR", "en-US", "es-ES"]),
    timezone: isTimezone,
    dateFormat: oneOf(["locale", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]),
    periodStartDay: (v) => Number.isInteger(v) && v >= 1 && v <= 28,
  },
  notifications: {
    enabled: isBool,
    daysAhead: (v) => Number.isInteger(v) && v >= 1 && v <= 30,
    remindBills: isBool,
    remindCards: isBool,
    remindBudgets: isBool,
    remindGoals: isBool,
  },
  ai: {
    enabled: isBool,
    preferredProvider: oneOf(["auto", "cloudflare", "groq"]),
    responseStyle: oneOf(["direto", "equilibrado", "detalhado"]),
    saveHistory: isBool,
    shareTransactionDetails: isBool,
  },
};

/**
 * Valida um patch parcial. Retorna { value } com o patch limpo ou { error }.
 */
function validatePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { error: "Corpo da requisição inválido." };
  }
  const clean = {};
  for (const [section, fields] of Object.entries(patch)) {
    if (!SCHEMA[section]) return { error: `Seção desconhecida: ${section}.` };
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return { error: `Seção inválida: ${section}.` };
    }
    clean[section] = {};
    for (const [key, val] of Object.entries(fields)) {
      const check = SCHEMA[section][key];
      if (!check) return { error: `Preferência desconhecida: ${section}.${key}.` };
      if (!check(val)) return { error: `Valor inválido para ${section}.${key}.` };
      clean[section][key] = val;
    }
  }
  return { value: clean };
}

/** Mescla preferências salvas sobre os defaults, ignorando lixo legado. */
function withDefaults(stored) {
  const out = {};
  for (const section of Object.keys(DEFAULTS)) {
    out[section] = { ...DEFAULTS[section] };
    const saved = stored && typeof stored[section] === "object" ? stored[section] : {};
    for (const [key, val] of Object.entries(saved || {})) {
      if (SCHEMA[section][key] && SCHEMA[section][key](val)) out[section][key] = val;
    }
  }
  return out;
}

module.exports = { DEFAULTS, DASHBOARD_CARDS, validatePatch, withDefaults };

