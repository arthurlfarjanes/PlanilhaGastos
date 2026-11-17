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
  help: {
    completedTours: [],
    activeTour: null,
    dismissedHints: [],
    tipsEnabled: true,
    tourVersion: {},
  },
});

const isSlug = (max = 48) => (v) =>
  typeof v === "string" && v.length >= 1 && v.length <= max && /^[a-z0-9-]+$/.test(v);

const isSlugList = (maxItems = 50, maxLen = 48) => {
  const checkItem = isSlug(maxLen);
  return (v) =>
    Array.isArray(v) &&
    v.length <= maxItems &&
    v.every(checkItem) &&
    new Set(v).size === v.length;
};

const isActiveTour = (v) => {
  if (v === null) return true;
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  if (keys.some((k) => !["id", "step", "version"].includes(k))) return false;
  return (
    isSlug(48)(v.id) &&
    Number.isInteger(v.step) &&
    v.step >= 0 &&
    v.step <= 50 &&
    Number.isInteger(v.version) &&
    v.version >= 1 &&
    v.version <= 999
  );
};

const isTourVersionMap = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const entries = Object.entries(v);
  if (entries.length > 50) return false;
  const checkKey = isSlug(48);
  return entries.every(
    ([k, ver]) => checkKey(k) && Number.isInteger(ver) && ver >= 1 && ver <= 999
  );
};

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
  help: {
    completedTours: isSlugList(50, 48),
    activeTour: isActiveTour,
    dismissedHints: isSlugList(100, 64),
    tipsEnabled: isBool,
    tourVersion: isTourVersionMap,
  },
};

const cloneValue = (val) => {
  if (Array.isArray(val)) return [...val];
  if (val && typeof val === "object") return { ...val };
  return val;
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
    out[section] = {};
    for (const [key, defVal] of Object.entries(DEFAULTS[section])) {
      out[section][key] = cloneValue(defVal);
    }
    const saved = stored && typeof stored[section] === "object" ? stored[section] : {};
    for (const [key, val] of Object.entries(saved || {})) {
      if (SCHEMA[section][key] && SCHEMA[section][key](val)) {
        out[section][key] = cloneValue(val);
      }
    }
  }
  return out;
}

module.exports = { DEFAULTS, DASHBOARD_CARDS, validatePatch, withDefaults, validateHelpFeedback };

function validateHelpFeedback(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Corpo de feedback inválido." };
  }
  const topicId = typeof body.topicId === "string" ? body.topicId.trim() : "";
  const route = typeof body.route === "string" ? body.route.trim() : "";
  const helpful = body.helpful;
  const reason = typeof body.reason === "string" ? body.reason.trim() : helpful ? "helpful" : "not_helpful";
  const rawNote = body.note == null ? null : typeof body.note === "string" ? body.note.trim() : null;

  if (!/^[a-z0-9_-]{1,64}$/.test(topicId)) {
    return { error: "Identificador de tópico inválido." };
  }
  if (!/^\/[a-z0-9-]{0,60}$/.test(route)) {
    return { error: "Rota inválida." };
  }
  if (typeof helpful !== "boolean") {
    return { error: "Campo helpful deve ser booleano." };
  }
  if (!["helpful", "not_helpful", "outdated"].includes(reason)) {
    return { error: "Motivo de feedback inválido." };
  }
  if (rawNote && rawNote.length > 240) {
    return { error: "Observação deve ter no máximo 240 caracteres." };
  }

  return {
    value: {
      topicId,
      route,
      helpful,
      reason,
      note: rawNote ? rawNote.slice(0, 240) : null,
    },
  };
}

