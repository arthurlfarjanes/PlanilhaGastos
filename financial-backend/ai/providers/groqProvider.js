/**
 * Provedor alternativo opcional Groq Free Tier (API gratuita, sem cartão de crédito).
 * Ativado somente se AI_PROVIDER=groq e GROQ_API_KEY estiver configurada. Nunca usa planos pagos.
 */
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

function createGroqProvider(config = {}) {
  const apiKey = (config.apiKey ?? process.env.GROQ_API_KEY ?? "").trim();
  const model = (config.model ?? process.env.GROQ_AI_MODEL ?? DEFAULT_GROQ_MODEL).trim() || DEFAULT_GROQ_MODEL;
  const fetchImpl = config.fetchImpl || fetch;
  const timeoutMs = Number(config.timeoutMs || 18000);

  return {
    id: "groq",
    name: "Groq Free Tier",
    model,
    freeTierInfo: {
      requiresCard: false,
      dailyNeuronsLimit: null,
      resetSchedule: "Janelas por minuto/dia (RPM/RPD/TPM/TPD)",
      summary: "Plano gratuito sem cartão sujeito a limites dinâmicos por minuto e por dia da organização.",
    },
    isConfigured() {
      return Boolean(apiKey);
    },
    async generateChat({ messages, maxTokens = 600, temperature = 0.2 }) {
      if (!apiKey) {
        return {
          ok: false,
          code: "NOT_CONFIGURED",
          error: "Chave do provedor gratuito Groq não configurada no servidor.",
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      try {
        const res = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        });

        const latencyMs = Date.now() - startedAt;
        const data = await res.json().catch(() => ({}));

        if (res.status === 429) {
          return {
            ok: false,
            code: "FREE_QUOTA_EXCEEDED",
            latencyMs,
            error: "O limite gratuito temporário do provedor foi atingido. Tente novamente mais tarde.",
          };
        }

        if (!res.ok) {
          return {
            ok: false,
            code: "PROVIDER_UNAVAILABLE",
            latencyMs,
            error: "O serviço gratuito de IA está temporariamente indisponível.",
            detail: data?.error?.message,
          };
        }

        const text = String(data?.choices?.[0]?.message?.content || "").trim();
        if (!text) {
          return {
            ok: false,
            code: "PROVIDER_UNAVAILABLE",
            latencyMs,
            error: "O provedor retornou uma resposta vazia.",
          };
        }

        const usage = data?.usage || {};
        return {
          ok: true,
          text,
          neurons: null,
          promptTokens: Number.isInteger(usage.prompt_tokens) ? usage.prompt_tokens : null,
          completionTokens: Number.isInteger(usage.completion_tokens) ? usage.completion_tokens : null,
          totalTokens: Number.isInteger(usage.total_tokens) ? usage.total_tokens : null,
          latencyMs,
        };
      } catch (err) {
        return {
          ok: false,
          code: "PROVIDER_UNAVAILABLE",
          latencyMs: Date.now() - startedAt,
          error:
            err?.name === "AbortError"
              ? "Tempo limite excedido ao consultar o serviço gratuito de IA."
              : "Não foi possível conectar ao provedor gratuito de IA no momento.",
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = {
  createGroqProvider,
  DEFAULT_GROQ_MODEL,
};
