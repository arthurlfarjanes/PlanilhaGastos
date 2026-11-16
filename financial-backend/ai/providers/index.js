const { createCloudflareProvider } = require("./cloudflareProvider");
const { createGroqProvider } = require("./groqProvider");

const FREE_PROVIDER_FACTORIES = {
  cloudflare: createCloudflareProvider,
  groq: createGroqProvider,
};

function createDisabledProvider() {
  return {
    id: "disabled",
    name: "Desativado",
    model: null,
    freeTierInfo: {
      requiresCard: false,
      dailyNeuronsLimit: null,
      resetSchedule: null,
      summary: "Provedor de IA desativado por configuração do servidor.",
    },
    isConfigured: () => false,
    async generateChat() {
      return {
        ok: false,
        code: "PROVIDER_DISABLED",
        error: "O provedor de IA está desativado nas configurações do servidor.",
      };
    },
  };
}

/**
 * Seleciona o provedor gratuito solicitado (ou padrão de AI_PROVIDER).
 * Nunca faz fallback automático para provedores pagos.
 */
function getAiProvider(config = {}) {
  const mode = String(config.provider ?? process.env.AI_PROVIDER ?? "cloudflare")
    .trim()
    .toLowerCase();

  if (mode === "disabled" || mode === "none" || mode === "off") {
    return createDisabledProvider();
  }

  if (mode === "groq") {
    return createGroqProvider(config);
  }

  return createCloudflareProvider(config);
}

/**
 * Lista todos os provedores gratuitos suportados com seu estado de configuração no ambiente.
 */
function listFreeProviders(envConfigs = {}) {
  return Object.entries(FREE_PROVIDER_FACTORIES).map(([id, factory]) => {
    const instance = factory(envConfigs[id] || {});
    return {
      id: instance.id,
      name: instance.name,
      model: instance.model,
      configured: instance.isConfigured(),
      freeTierInfo: instance.freeTierInfo,
      instance,
    };
  });
}

/**
 * Resolve qual provedor gratuito usar para o usuário considerando a preferência explícita
 * ("auto" | "cloudflare" | "groq") e a disponibilidade de credenciais no servidor.
 */
function resolveUserProvider(preferredProvider = "auto", envConfigs = {}) {
  const defaultId = String(process.env.AI_PROVIDER ?? "cloudflare")
    .trim()
    .toLowerCase();
  if (defaultId === "disabled" || defaultId === "none" || defaultId === "off") {
    return createDisabledProvider();
  }

  const pref = String(preferredProvider || "auto").trim().toLowerCase();
  const all = listFreeProviders(envConfigs);

  if (pref !== "auto" && FREE_PROVIDER_FACTORIES[pref]) {
    const chosen = all.find((p) => p.id === pref);
    if (chosen && chosen.configured) {
      return chosen.instance;
    }
  }

  const defaultProvider = all.find((p) => p.id === defaultId);
  if (defaultProvider && defaultProvider.configured) {
    return defaultProvider.instance;
  }

  const firstConfigured = all.find((p) => p.configured);
  if (firstConfigured) {
    return firstConfigured.instance;
  }

  return (defaultProvider || all[0]).instance;
}

module.exports = {
  getAiProvider,
  listFreeProviders,
  resolveUserProvider,
};
