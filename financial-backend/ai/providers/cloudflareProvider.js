/**
 * Provedor Cloudflare Workers AI (Workers Free — 10.000 Neurons/dia gratuitos, sem cartão).
 * Nunca utiliza endpoints ou fallbacks pagos. Ao atingir a cota (HTTP 429) ou ficar indisponível,
 * devolve código estruturado para suspensão graciosa no backend.
 */
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const FREE_DAILY_NEURONS_LIMIT = 10000;

function parseHeaderInt(headers, name) {
  if (!headers) return null;
  const raw = typeof headers.get === "function" ? headers.get(name) : headers[name];
  if (raw === null || raw === undefined || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}

function createCloudflareProvider(config = {}) {
  const accountId = (config.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const apiToken = (config.apiToken ?? process.env.CLOUDFLARE_API_TOKEN ?? "").trim();
  const model = (config.model ?? process.env.CLOUDFLARE_AI_MODEL ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const fetchImpl = config.fetchImpl || fetch;
  const timeoutMs = Number(config.timeoutMs || 18000);

  return {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    model,
    freeTierInfo: {
      requiresCard: false,
      dailyNeuronsLimit: FREE_DAILY_NEURONS_LIMIT,
      resetSchedule: "00:00 UTC",
      summary: "Plano Workers Free: até 10.000 Neurons gratuitos por dia (globais na conta), sem cobrança por excedente.",
    },
    isConfigured() {
      return Boolean(accountId && apiToken);
    },
    async generateChat({ messages, maxTokens = 600, temperature = 0.2 }) {
      if (!accountId || !apiToken) {
        return {
          ok: false,
          code: "NOT_CONFIGURED",
          error: "Credenciais do provedor gratuito Cloudflare Workers AI não configuradas no servidor.",
        };
      }

      const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        });

        const latencyMs = Date.now() - startedAt;
        const neurons = parseHeaderInt(res.headers, "cf-ai-neurons");
        const data = await res.json().catch(() => ({}));

        if (res.status === 429) {
          return {
            ok: false,
            code: "FREE_QUOTA_EXCEEDED",
            neurons,
            latencyMs,
            error: "A franquia gratuita diária do provedor foi atingida. As chamadas de IA foram pausadas temporariamente.",
          };
        }

        if (!res.ok || data?.success === false) {
          const msg =
            data?.errors?.[0]?.message ||
            data?.error ||
            `Falha HTTP ${res.status} no provedor de IA.`;
          const isQuotaMsg = /neuron|quota|rate limit|free allocation/i.test(String(msg));
          return {
            ok: false,
            code: isQuotaMsg ? "FREE_QUOTA_EXCEEDED" : "PROVIDER_UNAVAILABLE",
            neurons,
            latencyMs,
            error: isQuotaMsg
              ? "A franquia gratuita diária do provedor foi atingida."
              : "O serviço gratuito de IA está temporariamente indisponível.",
            detail: msg,
          };
        }

        const resultObj = data?.result || data || {};
        const text =
          typeof resultObj.response === "string"
            ? resultObj.response.trim()
            : typeof resultObj?.choices?.[0]?.message?.content === "string"
              ? resultObj.choices[0].message.content.trim()
              : "";

        if (!text) {
          return {
            ok: false,
            code: "PROVIDER_UNAVAILABLE",
            neurons,
            latencyMs,
            error: "O provedor retornou uma resposta vazia.",
          };
        }

        const usage = resultObj.usage || data?.usage || {};
        const promptTokens = Number.isInteger(usage.prompt_tokens) ? usage.prompt_tokens : null;
        const completionTokens = Number.isInteger(usage.completion_tokens)
          ? usage.completion_tokens
          : null;
        const totalTokens = Number.isInteger(usage.total_tokens)
          ? usage.total_tokens
          : promptTokens !== null && completionTokens !== null
            ? promptTokens + completionTokens
            : null;

        return {
          ok: true,
          text,
          neurons,
          promptTokens,
          completionTokens,
          totalTokens,
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
  createCloudflareProvider,
  FREE_DAILY_NEURONS_LIMIT,
  DEFAULT_MODEL,
};
