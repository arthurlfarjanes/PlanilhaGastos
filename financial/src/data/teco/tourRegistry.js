/**
 * Catálogo declarativo de tours versionados do Teco Ajuda.
 * 100% local — não realiza chamadas de rede nem consome cota de IA.
 */

export const TECO_TOURS = [
  {
    id: "primeiros-passos",
    version: 1,
    featured: true,
    title: "Primeiros passos no MeFinance",
    subtitle: "Tour guiado completo pelas 5 áreas principais (multi-tela)",
    estimatedMinutes: 2,
    entryRoute: "/comparativo",
    steps: [
      {
        id: "intro-comparativo",
        route: "/comparativo",
        target: '[data-tour="comparativo-header"]',
        title: "Olá! Eu sou o Teco, seu guia no MeFinance",
        description:
          "No Dashboard você acompanha o resumo do período. Use os filtros no topo para comparar meses e ver seu saldo.",
        placement: "bottom",
        mood: "greeting",
      },
      {
        id: "comparativo-cards",
        route: "/comparativo",
        target: '[data-tour="comparativo-cards"]',
        title: "Seus cartões de resumo",
        description:
          "Receitas, Despesas e Saldo mostram o balanço rápido do mês. Você pode reordenar ou ocultar cards em Configurações.",
        placement: "bottom",
        mood: "explaining",
        optional: true,
        fallbackHint:
          "Os cards de resumo podem estar ocultos nas suas preferências de Aparência — você pode reexibi-los a qualquer momento.",
      },
      {
        id: "transacoes-form",
        route: "/dashboard",
        target: '[data-tour="transacoes-form"]',
        title: "Registre entradas e gastos",
        description:
          "Na aba Transações você lança receitas, despesas e compras parceladas. Categorizar bem melhora gráficos e alertas.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "orcamentos-lista",
        route: "/orcamentos",
        target: '[data-tour="orcamentos-lista"]',
        title: "Defina limites em Orçamentos",
        description:
          "Estipule tetos mensais por categoria. O sistema avisa visualmente quando você se aproxima do limite.",
        placement: "top",
        mood: "explaining",
      },
      {
        id: "projecoes-grafico",
        route: "/projecoes",
        target: '[data-tour="projecoes-grafico"]',
        title: "Antecipe o futuro em Projeções",
        description:
          "Veja a estimativa de saldo para os próximos meses somando fixos, faturas e metas.",
        placement: "top",
        mood: "explaining",
      },
      {
        id: "assistente-chat",
        route: "/assistente",
        target: '[data-tour="assistente-chat"]',
        title: "Conte comigo no Assistente!",
        description:
          "Quando quiser tirar dúvidas sobre seus números reais ou simular ideias, converse comigo aqui (100% gratuito). Você concluiu o tour inicial!",
        placement: "top",
        mood: "celebrating",
      },
    ],
  },

  {
    id: "comparativo",
    version: 1,
    title: "Dashboard (Visão Geral)",
    subtitle: "Entenda filtros, cards de saldo e gráficos de categorias",
    estimatedMinutes: 1,
    entryRoute: "/comparativo",
    steps: [
      {
        id: "comp-header",
        route: "/comparativo",
        target: '[data-tour="comparativo-header"]',
        title: "Período de análise",
        description:
          "Selecione mês, intervalo personalizado ou visão geral para recalcular todos os indicadores desta página.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "comp-cards",
        route: "/comparativo",
        target: '[data-tour="comparativo-cards"]',
        title: "Receitas, Despesas e Saldo",
        description:
          "Mostram o fluxo líquido do intervalo ativo. Se preferir, personalize ordem e visibilidade em Configurações.",
        placement: "bottom",
        mood: "explaining",
        optional: true,
      },
      {
        id: "comp-graficos",
        route: "/comparativo",
        target: '[data-tour="comparativo-graficos"]',
        title: "Evolução e distribuição",
        description:
          "Compare receitas versus despesas mês a mês e veja onde seu dinheiro está mais concentrado.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "dashboard",
    version: 1,
    title: "Transações",
    subtitle: "Cadastro rápido, busca e conferência de extrato",
    estimatedMinutes: 1,
    entryRoute: "/dashboard",
    steps: [
      {
        id: "tx-form",
        route: "/dashboard",
        target: '[data-tour="transacoes-form"]',
        title: "Novo lançamento",
        description:
          "Adicione receitas ou despesas informando descrição, valor, categoria e forma de pagamento.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "tx-filtros",
        route: "/dashboard",
        target: '[data-tour="transacoes-filtros"]',
        title: "Filtros e pesquisa",
        description:
          "Combine busca por texto, período e categoria para encontrar rapidamente qualquer movimentação.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "tx-lista",
        route: "/dashboard",
        target: '[data-tour="transacoes-lista"]',
        title: "Histórico detalhado",
        description:
          "Edite valores, corrija categorias ou remova duplicidades diretamente na tabela.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "gastos-fixos",
    version: 1,
    title: "Transações Fixas",
    subtitle: "Automatize contas e receitas recorrentes",
    estimatedMinutes: 1,
    entryRoute: "/gastos-fixos",
    steps: [
      {
        id: "fix-form",
        route: "/gastos-fixos",
        target: '[data-tour="fixas-form"]',
        title: "Cadastre recorrências",
        description:
          "Informe salário, aluguel, internet ou assinaturas com o dia de vencimento mensal.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "fix-lista",
        route: "/gastos-fixos",
        target: '[data-tour="fixas-lista"]',
        title: "Controle mensal e alertas",
        description:
          "Esses itens alimentam seus lembretes de vencimento e melhoram a precisão das Projeções.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "cartoes",
    version: 1,
    title: "Cartões de Crédito",
    subtitle: "Acompanhe faturas, limites e vencimentos",
    estimatedMinutes: 1,
    entryRoute: "/cartoes",
    steps: [
      {
        id: "card-resumo",
        route: "/cartoes",
        target: '[data-tour="cartoes-resumo"]',
        title: "Visão consolidada de cartões",
        description:
          "Veja rapidamente quanto limite está comprometido e os próximos fechamentos.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "card-lista",
        route: "/cartoes",
        target: '[data-tour="cartoes-lista"]',
        title: "Faturas por cartão",
        description:
          "Gerencie cartões, consulte lançamentos da fatura atual e evite surpresas no vencimento.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "dividas",
    version: 1,
    title: "Dívidas",
    subtitle: "Organize parcelas, juros e quitação",
    estimatedMinutes: 1,
    entryRoute: "/dividas",
    steps: [
      {
        id: "div-resumo",
        route: "/dividas",
        target: '[data-tour="dividas-resumo"]',
        title: "Panorama do saldo devedor",
        description:
          "Acompanhe o total restante e o peso das parcelas no seu orçamento mensal.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "div-lista",
        route: "/dividas",
        target: '[data-tour="dividas-lista"]',
        title: "Contratos e pagamentos",
        description:
          "Atualize parcelas pagas e priorize contratos com juros mais altos.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "patrimonio",
    version: 1,
    title: "Patrimônio",
    subtitle: "Monitore reservas, investimentos e bens",
    estimatedMinutes: 1,
    entryRoute: "/patrimonio",
    steps: [
      {
        id: "pat-resumo",
        route: "/patrimonio",
        target: '[data-tour="patrimonio-resumo"]',
        title: "Patrimônio líquido",
        description:
          "Compara o total dos seus ativos com eventuais dívidas cadastradas no app.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "pat-lista",
        route: "/patrimonio",
        target: '[data-tour="patrimonio-lista"]',
        title: "Contas e ativos",
        description:
          "Mantenha saldos de contas e reservas atualizados para acompanhar seu crescimento.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "orcamentos",
    version: 1,
    title: "Orçamentos",
    subtitle: "Crie tetos por categoria com alertas visuais",
    estimatedMinutes: 1,
    entryRoute: "/orcamentos",
    steps: [
      {
        id: "orc-resumo",
        route: "/orcamentos",
        target: '[data-tour="orcamentos-resumo"]',
        title: "Semáforo do mês",
        description:
          "Veja de imediato quantas categorias estão saudáveis, em alerta ou acima do teto.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "orc-lista",
        route: "/orcamentos",
        target: '[data-tour="orcamentos-lista"]',
        title: "Limites por categoria",
        description:
          "Ajuste metas de gasto e compare o realizado versus planejado em tempo real.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "objetivos",
    version: 1,
    title: "Objetivos",
    subtitle: "Planeje metas com prazo e aportes",
    estimatedMinutes: 1,
    entryRoute: "/objetivos",
    steps: [
      {
        id: "obj-resumo",
        route: "/objetivos",
        target: '[data-tour="objetivos-resumo"]',
        title: "Progresso das metas",
        description:
          "Visualize quanto já foi poupado e quanto falta para alcançar seus planos.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "obj-lista",
        route: "/objetivos",
        target: '[data-tour="objetivos-lista"]',
        title: "Aportes e prazos",
        description:
          "Crie novos objetivos e registre aportes sempre que guardar um valor.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "projecoes",
    version: 1,
    title: "Projeções",
    subtitle: "Simule seu fluxo futuro com segurança",
    estimatedMinutes: 1,
    entryRoute: "/projecoes",
    steps: [
      {
        id: "proj-controles",
        route: "/projecoes",
        target: '[data-tour="projecoes-controles"]',
        title: "Ajuste o horizonte",
        description:
          "Escolha quantos meses deseja simular e teste mudanças sem afetar seu histórico real.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "proj-grafico",
        route: "/projecoes",
        target: '[data-tour="projecoes-grafico"]',
        title: "Curva projetada",
        description:
          "Antecipe meses mais apertados e planeje aportes ou cortes antes que o problema aconteça.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "diagnosticos",
    version: 1,
    title: "Diagnósticos",
    subtitle: "Leitura automática da sua saúde financeira",
    estimatedMinutes: 1,
    entryRoute: "/diagnosticos",
    steps: [
      {
        id: "diag-score",
        route: "/diagnosticos",
        target: '[data-tour="diagnosticos-score"]',
        title: "Indicadores-chave",
        description:
          "Resume comprometimento da renda, margem livre e equilíbrio entre fixos e variáveis.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "diag-alertas",
        route: "/diagnosticos",
        target: '[data-tour="diagnosticos-alertas"]',
        title: "Recomendações acionáveis",
        description:
          "Cada apontamento mostra onde vale atuar primeiro no seu mês.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "classificacao",
    version: 1,
    title: "Classificação",
    subtitle: "Regras automáticas para categorizar gastos",
    estimatedMinutes: 1,
    entryRoute: "/classificacao",
    steps: [
      {
        id: "cls-regras",
        route: "/classificacao",
        target: '[data-tour="classificacao-regras"]',
        title: "Regras por palavra-chave",
        description:
          "Automatize categorias para descrições recorrentes e economize tempo nos lançamentos.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "cls-pend",
        route: "/classificacao",
        target: '[data-tour="classificacao-pendencias"]',
        title: "Revisão rápida",
        description:
          "Corrija lançamentos sem categoria para deixar relatórios e orçamentos sempre confiáveis.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "otimizacao",
    version: 1,
    title: "Otimização",
    subtitle: "Encontre oportunidades de economia",
    estimatedMinutes: 1,
    entryRoute: "/otimizacao",
    steps: [
      {
        id: "otm-sim",
        route: "/otimizacao",
        target: '[data-tour="otimizacao-simulador"]',
        title: "Simule cortes inteligentes",
        description:
          "Veja quanto sobra por mês reduzindo pequenos percentuais em categorias flexíveis.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "otm-sug",
        route: "/otimizacao",
        target: '[data-tour="otimizacao-sugestoes"]',
        title: "Ações de maior impacto",
        description:
          "Priorize ajustes que trazem mais alívio rápido no seu orçamento.",
        placement: "top",
        mood: "success",
      },
    ],
  },

  {
    id: "relatorios",
    version: 1,
    title: "Relatórios",
    subtitle: "Exporte seus resumos em PDF ou CSV",
    estimatedMinutes: 1,
    entryRoute: "/relatorios",
    steps: [
      {
        id: "rel-filtros",
        route: "/relatorios",
        target: '[data-tour="relatorios-filtros"]',
        title: "Escolha o período",
        description:
          "Defina data inicial e final para gerar a prévia consolidada do intervalo.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "rel-export",
        route: "/relatorios",
        target: '[data-tour="relatorios-export"]',
        title: "Exportação PDF e CSV",
        description:
          "Baixe em PDF pronto para compartilhar ou em CSV para analisar em planilhas.",
        placement: "bottom",
        mood: "success",
      },
    ],
  },

  {
    id: "configuracoes",
    version: 1,
    title: "Configurações e Privacidade",
    subtitle: "Personalize tema, moeda, fuso, Teco e LGPD",
    estimatedMinutes: 1,
    entryRoute: "/configuracoes",
    steps: [
      {
        id: "cfg-tabs",
        route: "/configuracoes",
        target: '[data-tour="configuracoes-tabs"]',
        title: "Abas de preferência",
        description:
          "Navegue entre Perfil, Aparência, Financeiro, Notificações, IA, Segurança e Privacidade.",
        placement: "bottom",
        mood: "explaining",
      },
      {
        id: "cfg-aparencia",
        route: "/configuracoes",
        target: '[data-tour="configuracoes-aparencia"]',
        title: "Aparência e acessibilidade",
        description:
          "Alterne entre Navbar e Sidebar, ajuste tema e ative redução de movimento quando preferir.",
        placement: "top",
        mood: "success",
      },
    ],
  },
];

const TOUR_MAP = new Map(TECO_TOURS.map((t) => [t.id, t]));

export function getTourById(id) {
  return TOUR_MAP.get(id) || null;
}

export function getTourStatus(tour, helpPrefs = {}) {
  const completedList = Array.isArray(helpPrefs?.completedTours) ? helpPrefs.completedTours : [];
  const versionMap =
    helpPrefs?.tourVersion && typeof helpPrefs.tourVersion === "object"
      ? helpPrefs.tourVersion
      : {};

  const completed = completedList.includes(tour.id);
  const savedVersion = Number(versionMap[tour.id] || 0);
  const outdated = completed && savedVersion > 0 && savedVersion < tour.version;
  const completedCurrent = completed && savedVersion >= tour.version;

  return {
    completed,
    completedCurrent,
    outdated,
    savedVersion,
  };
}

export function getRecommendedTourForRoute(pathname = "/comparativo") {
  const clean = (pathname || "/comparativo").replace(/\/+$/, "") || "/comparativo";
  const byEntry = TECO_TOURS.find((t) => t.id !== "primeiros-passos" && t.entryRoute === clean);
  return byEntry || getTourById("primeiros-passos");
}
