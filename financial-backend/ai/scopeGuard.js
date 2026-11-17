/**
 * Guarda determinístico de escopo do Teco (MeFinance).
 * Impede que o assistente seja usado para fins fora do domínio do aplicativo
 * (programação, receitas culinárias, redações, curiosidades gerais, jailbreak)
 * antes mesmo de consumir cota ou chamar provedores externos de IA.
 */

const PROMPT_INJECTION_PATTERNS = [
  /(ignore|desconsidere|esqueca|anule|override|bypass)\s+(todas?\s+)?(as\s+|suas\s+)?(regras|instrucoes|diretrizes|restricoes|prompts?|sistema|escopo)/,
  /\b(jailbreak|developer mode|dan mode|sem restricoes|finja ser|aja como outro|act as|ignore previous)\b/,
  /\b(system prompt|mostre seu prompt|revele suas instrucoes)\b/,
];

const OFF_TOPIC_PATTERNS = [
  // Programação / TI genérica (sem vínculo com finanças)
  /\b(python|javascript|typescript|java|c\+\+|c#|php|ruby|rust|golang|html|css|sql|algoritmo|regex|codigo fonte|leetcode|docker|kubernetes|faca um site|crie um codigo|escreva um script)\b/,
  // Culinária (cuidado: "receita" sozinha também é termo financeiro no MeFinance!)
  /\b(receita de (bolo|pao|pizza|massa|torta|brigadeiro|lasanha|arroz|feijao|frango|carne|sobremesa|biscoito|pudim|panqueca|drink|cafe)|modo de preparo|colher de sopa|pre-?aquec|ingredientes da receita)\b/,
  // Literatura, entretenimento, esportes, esoterismo
  /\b(poema|poesia|conto de fadas|historia de ficcao|letra de musica|me conte uma piada|conte uma piada|charada|horoscopo|signo|tarot|novela|anime|manga|brasileirao|copa do mundo|escalacao)\b/,
  // Escolar / cultura geral / tradução
  /\b(fotossintese|mitocondria|tabela periodica|segunda guerra|revolucao francesa|capital d[aeo]|biologia|quimica organica|faca uma redacao|escreva uma redacao|redacao do enem|traduza este texto|traducao para ingles|quem descobriu)\b/,
  // Saúde / clima
  /\b(previsao do tempo|vai chover|receita medica|bula de remedio|sintomas de|dor de cabeca|treino de hipertrofia)\b/,
];

const FINANCE_APP_PATTERNS = [
  /\b(mefinance|teco|aplicativo|app|sistema|plataforma|dashboard|comparativo|extrato|configuracoes|notificac(ao|oes)|lembrete|alerta|provedor|cloudflare|groq|privacidade)\b/,
  /\b(financas?|financeir[ao]s?|economi(a|as|zar|zei|zou)|poup(ar|ei|anca)|gast(o|os|ar|ei|ou|ando)|despes(a|as)|receit(a|as)|sald(o|os)|balanco|rend(a|as|imento|imentos)|salari(o|os)|dinheiro|reais|real|r\$)\b/,
  /\b(pag(ar|o|uei|amento|amentos)|venc(er|e|endo|imento|imentos)|conta fixa|contas fixas|assinatur(a|as)|recorren(te|tes|cia)|orcament(o|os)|categori(a|as))\b/,
  /\b(cart(ao|oes)|fatur(a|as)|limite|parcel(a|as|amento|ar|ei|ado)|divid(a|as)|emprestim(o|os)|financiament(o|os)|juros|amortiz(ar|acao|ei|ando)|quit(ar|acao|ei)|dev(o|endo|er))\b/,
  /\b(patrimoni(o|os)|invest(ir|i|imento|imentos)|aplicac(ao|oes)|cdb|cdi|selic|ipca|tesouro|fundo|fii|acoes|rentabilidade|liquidez|reserv(a|as)|emergencia)\b/,
  /\b(objetiv(o|os)|met(a|as)|aport(e|es|ar)|resgat(e|es|ar)|fluxo|taxa de economia|comprometimento|indicador(es)?|projec(ao|oes)|simulador|simular|cenario(s)?|inflacao|futuro|ritmo|diagnostico(s)?|classificac(ao|oes)|reclassificac(ao|oes)|otimizac(ao|oes)|otimizar|alocar|anomalia(s)?|saude financeira|score financeiro|resumo|lancament(o|os)|transac(ao|oes)|estorn(o|os)|reembols(o|os))\b/,
  /\b(pix|boleto|debito|credito|imposto|irpf|mensal|mes|anual|fatura|compra|compras|mercado|supermercado|aluguel|agua|luz|energia|internet)\b/,
];

const GREETING_PATTERNS = [
  /^(oi+|ola+|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|como vai|obrigad[ao]|valeu)([,!.\s]+(oi+|ola+|bom dia|boa tarde|boa noite|tudo bem|como vai|obrigad[ao]|valeu|teco|pela ajuda|amigo))*[!.?\s]*$/,
  /\b(quem e voce|o que voce faz|como voce funciona|como pode me ajudar|me ajude no mefinance)\b/,
];

const SHORT_FOLLOWUP_PATTERNS = [
  /^(sim|nao|ok|entendi|certo|pode ser|detalhe|detalhe mais|explique melhor|por que\??|como assim\??|me de um exemplo|resuma|e agora\??|qual priorizar\??)[!.?\s]*$/,
  /\b(nesse caso|sobre isso|com esses dados|desses valores|dessas opcoes|proximo mes|esse mes|neste mes|melhorar isso)\b/,
];

const REFUSAL_MESSAGE = [
  "Sou o **Teco**, assistente financeiro exclusivo do **MeFinance**.",
  "",
  "Posso ajudar apenas com assuntos relacionados ao aplicativo e às suas finanças pessoais — como **gastos, receitas, orçamentos, cartões, faturas, dívidas, patrimônio, objetivos, indicadores** ou **como usar os recursos do MeFinance**.",
].join("\n");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function evaluateMeFinanceScope(message, { hasRecentFinanceHistory = false } = {}) {
  const norm = normalizeText(message);
  if (!norm) {
    return { inScope: false, reason: "empty", refusalMessage: REFUSAL_MESSAGE };
  }

  if (PROMPT_INJECTION_PATTERNS.some((re) => re.test(norm))) {
    return { inScope: false, reason: "prompt_injection", refusalMessage: REFUSAL_MESSAGE };
  }

  if (OFF_TOPIC_PATTERNS.some((re) => re.test(norm))) {
    return { inScope: false, reason: "off_topic", refusalMessage: REFUSAL_MESSAGE };
  }

  if (FINANCE_APP_PATTERNS.some((re) => re.test(norm))) {
    return { inScope: true, reason: "finance_or_app_domain" };
  }

  if (GREETING_PATTERNS.some((re) => re.test(norm))) {
    return { inScope: true, reason: "greeting" };
  }

  if (
    hasRecentFinanceHistory &&
    norm.length <= 140 &&
    SHORT_FOLLOWUP_PATTERNS.some((re) => re.test(norm))
  ) {
    return { inScope: true, reason: "contextual_followup" };
  }

  return { inScope: false, reason: "unrelated_domain", refusalMessage: REFUSAL_MESSAGE };
}

module.exports = {
  evaluateMeFinanceScope,
  REFUSAL_MESSAGE,
};
