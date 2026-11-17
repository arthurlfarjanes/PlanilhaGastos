/**
 * Motor determinístico de classificação inteligente de despesas e regras automáticas.
 * Nenhuma alteração é aplicada sem aprovação explícita do usuário.
 */

const MATCH_TIPOS = Object.freeze(["contains", "starts_with", "exact"]);

const GENERIC_CATEGORY_NAMES = new Set([
  "outros",
  "outro",
  "geral",
  "diversos",
  "variados",
  "sem categoria",
  "nao categorizado",
]);

/**
 * Grupos semânticos em PT-BR para sugerir categorias já cadastradas pelo usuário
 * quando ainda não houver regra explícita nem histórico idêntico.
 */
const SEMANTIC_GROUPS = [
  {
    key: "alimentacao",
    categoryHints: ["alimentacao", "comida", "mercado", "supermercado", "restaurante", "refeicao"],
    keywords: [
      "ifood",
      "rappi",
      "ze delivery",
      "supermercado",
      "mercado",
      "atacadao",
      "assai",
      "carrefour",
      "extra",
      "pao de acucar",
      "padaria",
      "acougue",
      "hortifruti",
      "restaurante",
      "lanchonete",
      "hamburguer",
      "pizza",
      "sushi",
      "cafe",
      "almoço",
      "almoco",
      "jantar",
      "marmita",
    ],
  },
  {
    key: "transporte",
    categoryHints: ["transporte", "mobilidade", "carro", "veiculo", "combustivel", "viagem"],
    keywords: [
      "uber",
      "99app",
      "99pop",
      "99 ",
      "cabify",
      "posto",
      "gasolina",
      "etanol",
      "combustivel",
      "shell",
      "ipiranga",
      "petrobras",
      "estacionamento",
      "pedagio",
      "sem parar",
      "veloe",
      "bilhete unico",
      "metro",
      "onibus",
      "passagem",
      "oficina",
      "mecanico",
      "lava rapido",
    ],
  },
  {
    key: "moradia",
    categoryHints: ["moradia", "casa", "habitacao", "residencia", "contas", "utilidades"],
    keywords: [
      "aluguel",
      "condominio",
      "iptu",
      "enel",
      "cemig",
      "cpfl",
      "light",
      "copel",
      "celesc",
      "energia",
      "conta de luz",
      "sabesp",
      "sanepar",
      "copasa",
      "cedae",
      "agua",
      "gas",
      "ultragaz",
      "comgas",
      "internet",
      "fibra",
      "vivo",
      "claro",
      "tim",
      "oi fibra",
    ],
  },
  {
    key: "saude",
    categoryHints: ["saude", "farmacia", "medico", "bem estar", "bem-estar"],
    keywords: [
      "farmacia",
      "drogaria",
      "droga raia",
      "drogasil",
      "pacheco",
      "panvel",
      "pague menos",
      "consulta",
      "medico",
      "clinica",
      "hospital",
      "exame",
      "laboratorio",
      "dentista",
      "odonto",
      "psicologo",
      "terapia",
      "unimed",
      "amil",
      "sulamerica",
      "bradesco saude",
      "plano de saude",
    ],
  },
  {
    key: "lazer",
    categoryHints: ["lazer", "entretenimento", "assinaturas", "streaming", "diversao"],
    keywords: [
      "netflix",
      "spotify",
      "disney",
      "prime video",
      "amazon prime",
      "hbo",
      "max ",
      "youtube",
      "apple tv",
      "globoplay",
      "cinema",
      "ingresso",
      "teatro",
      "show",
      "steam",
      "playstation",
      "xbox",
      "nintendo",
      "bar ",
      "balada",
      "cerveja",
    ],
  },
  {
    key: "educacao",
    categoryHints: ["educacao", "estudos", "cursos", "livros", "escola", "faculdade"],
    keywords: [
      "faculdade",
      "universidade",
      "mensalidade escolar",
      "escola",
      "creche",
      "curso",
      "udemy",
      "alura",
      "coursera",
      "rocketseat",
      "ingles",
      "livraria",
      "livro",
      "papelaria",
      "kindle",
    ],
  },
  {
    key: "vestuario",
    categoryHints: ["vestuario", "roupas", "moda", "beleza", "cuidados pessoais"],
    keywords: [
      "renner",
      "riachuelo",
      "c&a",
      "zara",
      "shein",
      "centauro",
      "netshoes",
      "calcados",
      "sapato",
      "tenis",
      "roupa",
      "camisa",
      "barbearia",
      "salao",
      "cabeleireiro",
      "perfumaria",
      "boticario",
    ],
  },
  {
    key: "compras",
    categoryHints: ["compras", "casa", "eletronicos", "tecnologia", "servicos"],
    keywords: [
      "mercado livre",
      "mercadolivre",
      "amazon",
      "shopee",
      "magalu",
      "magazine luiza",
      "americanas",
      "casas bahia",
      "kalunga",
      "leroy merlin",
    ],
  },
];

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function limparSufixoParcela(descricaoNorm) {
  return descricaoNorm.replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/, "").trim();
}

function matchRegra(descricaoNorm, regra) {
  const padraoNorm = normalizarTexto(regra?.padrao);
  if (!padraoNorm || !descricaoNorm) return false;
  const tipo = regra.tipo_match || "contains";
  if (tipo === "exact") return descricaoNorm === padraoNorm || limparSufixoParcela(descricaoNorm) === padraoNorm;
  if (tipo === "starts_with") return descricaoNorm.startsWith(padraoNorm);
  return descricaoNorm.includes(padraoNorm);
}

/**
 * Constroi mapa de frequência histórica para descrições já categorizadas.
 */
function buildHistoricoCategorias(transacoes = []) {
  const countsByDesc = new Map();
  for (const t of transacoes) {
    if (t.tipo !== "despesa" || !t.categoria_id) continue;
    const catNorm = normalizarTexto(t.categoria_nome);
    if (catNorm && GENERIC_CATEGORY_NAMES.has(catNorm)) continue;

    const baseDesc = limparSufixoParcela(normalizarTexto(t.descricao));
    if (baseDesc.length < 3) continue;

    if (!countsByDesc.has(baseDesc)) countsByDesc.set(baseDesc, new Map());
    const catMap = countsByDesc.get(baseDesc);
    const cur = catMap.get(t.categoria_id) || {
      categoria_id: t.categoria_id,
      categoria_nome: t.categoria_nome || "",
      categoria_cor: t.categoria_cor || "#10b981",
      count: 0,
    };
    cur.count += 1;
    catMap.set(t.categoria_id, cur);
  }

  const bestByDesc = new Map();
  for (const [desc, catMap] of countsByDesc.entries()) {
    let total = 0;
    let best = null;
    for (const entry of catMap.values()) {
      total += entry.count;
      if (!best || entry.count > best.count) best = entry;
    }
    if (best && total > 0) {
      const ratio = best.count / total;
      if (best.count >= 2 && ratio >= 0.7) {
        bestByDesc.set(desc, {
          ...best,
          total,
          ratio,
        });
      }
    }
  }
  return bestByDesc;
}

function findSemanticCategory(descricaoNorm, categorias = []) {
  if (!descricaoNorm || categorias.length === 0) return null;

  const catIndex = categorias.map((c) => ({
    ...c,
    norm: normalizarTexto(c.nome),
  }));

  for (const group of SEMANTIC_GROUPS) {
    const matchedKw = group.keywords.find((kw) => {
      const kwNorm = kw.trim();
      return kwNorm && descricaoNorm.includes(kwNorm);
    });
    if (!matchedKw) continue;

    // Procura categoria do usuário cujo nome corresponda aos hints semânticos do grupo
    const matchedCat = catIndex.find((c) =>
      group.categoryHints.some((hint) => c.norm.includes(hint) || hint.includes(c.norm)),
    );
    if (matchedCat) {
      return {
        categoria_id: matchedCat.id,
        categoria_nome: matchedCat.nome,
        categoria_cor: matchedCat.cor || "#10b981",
        confianca: 0.78,
        origem: "heuristica_semantica",
        motivo: `Termo "${matchedKw.trim()}" associado à categoria ${matchedCat.nome}`,
        regra_id: null,
      };
    }
  }

  // Fallback leve: nome da própria categoria aparece literalmente na descrição (>= 4 chars)
  const sortedCats = [...catIndex]
    .filter((c) => c.norm.length >= 4 && !GENERIC_CATEGORY_NAMES.has(c.norm))
    .sort((a, b) => b.norm.length - a.norm.length);
  for (const cat of sortedCats) {
    if (descricaoNorm.includes(cat.norm)) {
      return {
        categoria_id: cat.id,
        categoria_nome: cat.nome,
        categoria_cor: cat.cor || "#10b981",
        confianca: 0.72,
        origem: "heuristica_semantica",
        motivo: `Descrição menciona "${cat.nome}"`,
        regra_id: null,
      };
    }
  }

  return null;
}

/**
 * Classifica uma descrição de despesa com base em:
 * 1) Regras ativas do usuário
 * 2) Histórico consistente do próprio usuário
 * 3) Heurística semântica nas categorias existentes do usuário
 */
function classificarDescricao({
  descricao,
  regras = [],
  categorias = [],
  historicoPorDescricao = null,
}) {
  const descNorm = normalizarTexto(descricao);
  if (descNorm.length < 2) return null;

  // 1) Regras do usuário (ativas, ordenadas por prioridade DESC, especificidade DESC)
  const rankTipo = { exact: 3, starts_with: 2, contains: 1 };
  const activeRules = regras
    .filter((r) => r.ativo !== false)
    .sort((a, b) => {
      const pDiff = Number(b.prioridade || 0) - Number(a.prioridade || 0);
      if (pDiff !== 0) return pDiff;
      const tDiff = (rankTipo[b.tipo_match] || 0) - (rankTipo[a.tipo_match] || 0);
      if (tDiff !== 0) return tDiff;
      return String(b.padrao || "").length - String(a.padrao || "").length;
    });

  const catById = new Map(categorias.map((c) => [c.id, c]));
  for (const regra of activeRules) {
    if (matchRegra(descNorm, regra)) {
      const cat = catById.get(regra.categoria_id);
      if (!cat) continue;
      return {
        categoria_id: cat.id,
        categoria_nome: cat.nome,
        categoria_cor: cat.cor || "#10b981",
        confianca: 0.96,
        origem: "regra_usuario",
        motivo: `Regra "${regra.padrao}" (${regra.tipo_match})`,
        regra_id: regra.id || null,
      };
    }
  }

  // 2) Histórico consistente do próprio usuário
  if (historicoPorDescricao && historicoPorDescricao.size > 0) {
    const cleanKey = limparSufixoParcela(descNorm);
    const exactHist = historicoPorDescricao.get(cleanKey);
    if (exactHist && catById.has(exactHist.categoria_id)) {
      const cat = catById.get(exactHist.categoria_id);
      const confianca = Math.min(0.92, Number((0.75 + exactHist.ratio * 0.17).toFixed(2)));
      return {
        categoria_id: cat.id,
        categoria_nome: cat.nome,
        categoria_cor: cat.cor || "#10b981",
        confianca,
        origem: "historico_usuario",
        motivo: `Usada em ${exactHist.count}/${exactHist.total} lançamentos similares`,
        regra_id: null,
      };
    }
  }

  // 3) Heurística semântica PT-BR contra categorias existentes do usuário
  return findSemanticCategory(descNorm, categorias);
}

/**
 * Gera sugestões de classificação / revisão para aprovação explícita do usuário.
 */
function gerarSugestoesRevisao({ transacoes = [], regras = [], categorias = [], limit = 30 }) {
  const historico = buildHistoricoCategorias(transacoes);
  const sugestoes = [];
  let semCategoria = 0;
  let genericas = 0;

  for (const t of transacoes) {
    if (t.tipo !== "despesa") continue;
    const catNorm = normalizarTexto(t.categoria_nome);
    const isSemCat = !t.categoria_id;
    const isGenerica = Boolean(t.categoria_id && GENERIC_CATEGORY_NAMES.has(catNorm));
    if (isSemCat) semCategoria += 1;
    if (isGenerica) genericas += 1;

    const pred = classificarDescricao({
      descricao: t.descricao,
      regras,
      categorias,
      historicoPorDescricao: historico,
    });
    if (!pred) continue;

    // Só sugere se:
    // - está sem categoria
    // - está em categoria genérica ("Outros"/"Geral") e há outra categoria melhor
    // - existe regra explícita do usuário apontando outra categoria diferente da atual
    const deveSugerir =
      isSemCat ||
      (isGenerica && pred.categoria_id !== t.categoria_id) ||
      (pred.origem === "regra_usuario" && pred.categoria_id !== t.categoria_id);

    if (!deveSugerir) continue;

    sugestoes.push({
      transacao_id: t.id,
      descricao: t.descricao,
      valor: Number(t.valor),
      data: t.data,
      categoria_atual_id: t.categoria_id || null,
      categoria_atual_nome: t.categoria_nome || "Sem categoria",
      categoria_sugerida_id: pred.categoria_id,
      categoria_sugerida_nome: pred.categoria_nome,
      categoria_sugerida_cor: pred.categoria_cor,
      confianca: pred.confianca,
      origem: pred.origem,
      motivo: pred.motivo,
      regra_id: pred.regra_id,
    });
  }

  sugestoes.sort((a, b) => {
    if (b.confianca !== a.confianca) return b.confianca - a.confianca;
    return String(b.data).localeCompare(String(a.data));
  });

  const totalDespesas = transacoes.filter((t) => t.tipo === "despesa").length;
  return {
    sugestoes: sugestoes.slice(0, limit),
    total_sugestoes: sugestoes.length,
    estatisticas: {
      total_despesas_analisadas: totalDespesas,
      sem_categoria: semCategoria,
      em_categoria_generica: genericas,
      cobertura_percentual:
        totalDespesas > 0
          ? Math.round(((totalDespesas - semCategoria - genericas) * 1000) / totalDespesas) / 10
          : 100,
    },
  };
}

module.exports = {
  MATCH_TIPOS,
  GENERIC_CATEGORY_NAMES,
  normalizarTexto,
  limparSufixoParcela,
  matchRegra,
  buildHistoricoCategorias,
  classificarDescricao,
  gerarSugestoesRevisao,
};
