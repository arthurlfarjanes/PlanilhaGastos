/**
 * Extrai cards de navegação seguros a partir da resposta e das ferramentas do Assistente.
 * Nunca executa ações financeiras nem gera URLs fora da allowlist interna.
 */

import { normalizeAllowedTecoRoute } from "./allowedRoutes.js";

const MODULE_RULES = [
  {
    route: "/orcamentos",
    label: "Abrir Orçamentos",
    description: "Ajustar limites por categoria",
    toolNames: ["obter_orcamentos"],
    keywords: /\borcament(o|os)\b/i,
  },
  {
    route: "/dividas",
    label: "Gerenciar Dívidas",
    description: "Consultar parcelas e amortizações",
    toolNames: ["obter_dividas"],
    keywords: /\b(divid(a|as)|amortiz(ar|acao)|quit(ar|acao))\b/i,
  },
  {
    route: "/cartoes",
    label: "Conferir Cartões",
    description: "Acompanhar faturas e limite",
    toolNames: ["obter_cartoes"],
    keywords: /\b(cart(ao|oes)|fatur(a|as))\b/i,
  },
  {
    route: "/projecoes",
    label: "Simular em Projeções",
    description: "Comparar cenários futuros",
    toolNames: ["obter_projecoes_base"],
    keywords: /\b(projec(ao|oes)|cenario(s)?|simulador)\b/i,
  },
  {
    route: "/diagnosticos",
    label: "Ver Diagnósticos",
    description: "Score e desvios por categoria",
    toolNames: ["obter_diagnosticos_financeiros"],
    keywords: /\b(diagnostico(s)?|score de saude)\b/i,
  },
  {
    route: "/otimizacao",
    label: "Abrir Otimização",
    description: "Plano prático de alocação e cortes",
    toolNames: ["obter_plano_otimizacao"],
    keywords: /\b(otimizac(ao|oes)|cortar gastos|economia mensal)\b/i,
  },
  {
    route: "/objetivos",
    label: "Acompanhar Objetivos",
    description: "Metas financeiras e aportes",
    toolNames: ["obter_objetivos"],
    keywords: /\b(objetiv(o|os)|meta(s)?)\b/i,
  },
  {
    route: "/patrimonio",
    label: "Ver Patrimônio",
    description: "Ativos e liquidez imediata",
    toolNames: ["obter_patrimonio"],
    keywords: /\b(patrimonio|reserva de emergencia|liquidez)\b/i,
  },
  {
    route: "/gastos-fixos",
    label: "Transações Fixas",
    description: "Contas recorrentes e assinaturas",
    toolNames: ["obter_contas_fixas"],
    keywords: /\b(conta(s)? fixa(s)?|assinatur(a|as)|recorren(te|cia))\b/i,
  },
  {
    route: "/relatorios",
    label: "Exportar Relatórios",
    description: "Gerar PDF executivo ou CSV",
    toolNames: [],
    keywords: /\b(relatorio(s)?|exportar pdf|csv)\b/i,
  },
  {
    route: "/configuracoes",
    label: "Configurações",
    description: "Preferências, IA e privacidade",
    toolNames: [],
    keywords: /\b(configurac(ao|oes)|privacidade|preferencia(s)?)\b/i,
  },
];

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function extractSafeActionCards(content = "", toolsUsed = [], options = {}) {
  const toolSet = new Set(
    Array.isArray(toolsUsed) ? toolsUsed.map((t) => String(t?.name || "").trim()) : []
  );
  const text = normalizeSearch(content);
  const scored = [];

  for (const rule of MODULE_RULES) {
    const allowed = normalizeAllowedTecoRoute(rule.route, options);
    if (!allowed) continue;

    let score = 0;
    if (rule.toolNames.some((n) => toolSet.has(n))) score += 2;
    if (text && rule.keywords.test(text)) score += 3;

    if (score > 0) {
      scored.push({
        route: allowed.full,
        label: rule.label,
        description: rule.description,
        score,
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ route, label, description }) => ({ route, label, description }));
}
