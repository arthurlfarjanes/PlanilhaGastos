/**
 * Catálogo curado e local do Teco Contextual:
 * - Explicações por indicador
 * - Atalhos guiados ("Como eu faço...?")
 * - Sugestões contextuais por tela de origem no Assistente
 * Não realiza chamadas à IA nem consome cota.
 */

export const INDICATOR_EXPLANATIONS = {
  taxa_economia: {
    id: "taxa_economia",
    title: "Taxa de Economia",
    formula: "(Receitas − Despesas) ÷ Receitas",
    explanation:
      "Mede qual porcentagem do que entrou no período realmente sobrou após pagar suas despesas.",
    healthyRef: "Referência saudável: poupar 20% ou mais; positivo já indica superávit.",
    nextRoute: "/orcamentos",
    nextLabel: "Ajustar tetos em Orçamentos",
    suggestedQuestion: "Como posso melhorar minha taxa de economia sem cortar o essencial?",
  },
  comprometimento_fixo: {
    id: "comprometimento_fixo",
    title: "Comprometimento Fixo",
    formula: "(Contas fixas + Parcelas de dívidas) ÷ Renda",
    explanation:
      "Indica quanto da sua renda mensal já nasce comprometido antes mesmo dos gastos variáveis do dia a dia.",
    healthyRef: "Ideal abaixo de 50% para manter folga diante de imprevistos.",
    nextRoute: "/gastos-fixos",
    nextLabel: "Revisar Transações Fixas",
    suggestedQuestion: "Meu comprometimento fixo atual está saudável ou arriscado?",
  },
  patrimonio_liquido: {
    id: "patrimonio_liquido",
    title: "Patrimônio Líquido",
    formula: "Total de Ativos − Total de Passivos (Dívidas)",
    explanation:
      "Representa seu saldo patrimonial real: soma reservas, investimentos e bens descontando dívidas ativas.",
    healthyRef: "O crescimento constante mensal importa mais do que oscilações isoladas.",
    nextRoute: "/patrimonio",
    nextLabel: "Abrir Patrimônio",
    suggestedQuestion: "Qual o melhor equilíbrio entre aumentar reservas e abater dívidas hoje?",
  },
  objetivos_progresso: {
    id: "objetivos_progresso",
    title: "Progresso dos Objetivos",
    formula: "Acumulado nas metas ÷ Valor alvo total",
    explanation:
      "Acompanha o ritmo de evolução em direção às metas financeiras cadastradas e estima prazos.",
    healthyRef: "Aportes mensais regulares aceleram juros compostos a seu favor.",
    nextRoute: "/objetivos",
    nextLabel: "Ver Objetivos",
    suggestedQuestion: "Qual meta financeira devo priorizar com o meu saldo atual?",
  },
  limite_usado: {
    id: "limite_usado",
    title: "Limite Utilizado do Cartão",
    formula: "Fatura do mês + Parcelas futuras em aberto",
    explanation:
      "Considera tudo que ainda não foi pago no cartão, incluindo compras parceladas de meses seguintes.",
    healthyRef: "Evite passar de 30%–50% do limite para preservar flexibilidade.",
    nextRoute: "/cartoes",
    nextLabel: "Conferir faturas em Cartões",
    suggestedQuestion: "Minhas faturas futuras do cartão estão pesando no próximo mês?",
  },
  faturas_aberto: {
    id: "faturas_aberto",
    title: "Faturas em Aberto no Mês",
    formula: "Lançamentos entre fechamentos do ciclo atual",
    explanation:
      "Soma compras à vista e parcelas que vencem especificamente na competência selecionada.",
    healthyRef: "Conferir antes do fechamento ajuda a frear gastos na segunda quinzena.",
    nextRoute: "/projecoes",
    nextLabel: "Ver impacto em Projeções",
    suggestedQuestion: "Quanto das minhas próximas receitas já está comprometido com faturas?",
  },
  saldo_devedor: {
    id: "saldo_devedor",
    title: "Saldo Devedor Total",
    formula: "Soma do principal restante em dívidas ativas",
    explanation:
      "Mostra quanto falta para quitar seus contratos hoje, antes de considerar futuras amortizações.",
    healthyRef: "Priorizar juros mais altos (Avalanche) reduz o custo total pago.",
    nextRoute: "/otimizacao",
    nextLabel: "Simular quitação em Otimização",
    suggestedQuestion: "Qual dívida compensa amortizar primeiro no meu cenário atual?",
  },
  divida_comprometimento: {
    id: "divida_comprometimento",
    title: "Comprometimento Mensal com Dívidas",
    formula: "Soma das parcelas mensais ativas",
    explanation:
      "Parcela fixa do seu caixa mensal destinada exclusivamente ao pagamento de dívidas.",
    healthyRef: "Manter abaixo de 20%–30% da renda evita efeito bola de neve.",
    nextRoute: "/dividas",
    nextLabel: "Gerenciar Dívidas",
    suggestedQuestion: "Se eu fizer uma amortização extra, quantos meses economizo?",
  },
  liquidez_imediata: {
    id: "liquidez_imediata",
    title: "Liquidez Imediata",
    formula: "Ativos disponíveis para resgate rápido",
    explanation:
      "Recursos que podem ser sacados no curto prazo sem perda relevante — base da sua reserva de emergência.",
    healthyRef: "Meta clássica: 3 a 6 meses do seu custo mensal essencial.",
    nextRoute: "/diagnosticos",
    nextLabel: "Conferir reserva em Diagnósticos",
    suggestedQuestion: "Minha reserva de liquidez imediata cobre quantos meses de gastos?",
  },
  orcamento_consumido: {
    id: "orcamento_consumido",
    title: "Percentual Consumido do Orçamento",
    formula: "Gasto real na categoria ÷ Teto mensal definido",
    explanation:
      "Compara em tempo real o que já foi lançado no extrato contra o limite estipulado para o mês.",
    healthyRef: "Acompanhe o ritmo semanal: 50% até o dia 15 indica bom equilíbrio.",
    nextRoute: "/dashboard",
    nextLabel: "Revisar Transações",
    suggestedQuestion: "Quais categorias estão mais próximas de estourar meu orçamento este mês?",
  },
  orcamento_alerta: {
    id: "orcamento_alerta",
    title: "Categorias em Alerta",
    formula: "Categorias acima do percentual de aviso configurado",
    explanation:
      "Sinaliza antecipadamente limites que atingiram a zona amarela ou ultrapassaram o teto definido.",
    healthyRef: "Ajustar pequenos gastos no meio do mês evita déficit no fechamento.",
    nextRoute: "/otimizacao",
    nextLabel: "Buscar cortes em Otimização",
    suggestedQuestion: "Onde posso reduzir gastos neste mês para cumprir meus orçamentos?",
  },
  diagnostico_score: {
    id: "diagnostico_score",
    title: "Score de Saúde Financeira",
    formula: "Soma ponderada de 6 pilares determinísticos (0 a 100)",
    explanation:
      "Avalia taxa de poupança, comprometimento fixo, reserva de liquidez, orçamentos, dívidas e equilíbrio mensal.",
    healthyRef: "Acima de 70 pontos: saudável; 40–69: atenção; abaixo de 40: risco elevado.",
    nextRoute: "/otimizacao",
    nextLabel: "Gerar plano em Otimização",
    suggestedQuestion: "Qual dos 6 pilares do meu score mais derrubou minha nota este mês?",
  },
  projecao_patrimonio: {
    id: "projecao_patrimonio",
    title: "Patrimônio Líquido Projetado",
    formula: "Fluxo mensal simulado + rendimento composto − amortizações",
    explanation:
      "Estima onde seu patrimônio líquido estará ao fim do horizonte mantendo as premissas do cenário simulado.",
    healthyRef: "Compare o valor real (deflacionado) para enxergar ganho de poder de compra.",
    nextRoute: "/objetivos",
    nextLabel: "Alinhar com Objetivos",
    suggestedQuestion: "Com essa projeção, consigo alcançar meus objetivos no prazo?",
  },
  projecao_fluxo: {
    id: "projecao_fluxo",
    title: "Fluxo Líquido Mensal Médio",
    formula: "Média mensal de (Receitas − Despesas − Parcelas) no horizonte",
    explanation:
      "Mostra se a tendência dos próximos meses é de acúmulo positivo ou consumo de reservas.",
    healthyRef: "Fluxo médio positivo garante fôlego para aportes contínuos.",
    nextRoute: "/projecoes",
    nextLabel: "Testar outro cenário",
    suggestedQuestion: "O que acontece com meu fluxo projetado se eu cortar 15% das despesas variáveis?",
  },
};

export const GUIDED_SHORTCUTS = [
  {
    id: "shortcut-orcamento",
    question: "Como crio um orçamento por categoria?",
    summary: "Defina tetos mensais e ative alertas antes de estourar limites.",
    tourId: "orcamentos",
    route: "/orcamentos",
  },
  {
    id: "shortcut-amortizacao",
    question: "Como registro uma amortização ou quito dívidas?",
    summary: "Veja saldo devedor, compare juros e lance amortizações com segurança.",
    tourId: "dividas",
    route: "/dividas",
  },
  {
    id: "shortcut-cenarios",
    question: "Como comparo cenários futuros em Projeções?",
    summary: "Teste cortes de despesas, aportes extras e inflação sem mudar seus dados.",
    tourId: "projecoes",
    route: "/projecoes",
  },
  {
    id: "shortcut-fatura",
    question: "Como controlo faturas e limites do cartão?",
    summary: "Entenda data de fechamento, vencimento e parcelas em aberto.",
    tourId: "cartoes",
    route: "/cartoes",
  },
  {
    id: "shortcut-recorrentes",
    question: "Como automatizo contas fixas e assinaturas?",
    summary: "Cadastre vencimentos recorrentes e receba lembretes antecipados.",
    tourId: "gastos-fixos",
    route: "/gastos-fixos",
  },
  {
    id: "shortcut-relatorio",
    question: "Como gero um relatório em PDF ou CSV?",
    summary: "Escolha o período e exporte resumo executivo ou extrato completo.",
    tourId: "relatorios",
    route: "/relatorios",
  },
  {
    id: "shortcut-config",
    question: "Como ajusto tema, Sidebar, fuso horário e LGPD?",
    summary: "Personalize a interface e gerencie privacidade ou exportação de dados.",
    tourId: "configuracoes",
    route: "/configuracoes",
  },
];

export const CONTEXT_PROMPTS_BY_ROUTE = {
  "/comparativo": [
    "Resumo da minha taxa de economia e comprometimento fixo neste mês",
    "Por que meu saldo ficou assim neste período?",
    "Quais categorias mais pesaram nas minhas despesas?",
  ],
  "/dashboard": [
    "Quais gastos recentes merecem atenção para não pesar no mês?",
    "Tenho muitas parcelas futuras vencendo nos próximos meses?",
  ],
  "/gastos-fixos": [
    "Quanto da minha renda já está comprometido com contas fixas e assinaturas?",
    "Há espaço para revisar assinaturas ou reduzir custos recorrentes?",
  ],
  "/cartoes": [
    "Como está o uso do limite e o peso das faturas futuras no meu orçamento?",
    "Qual cartão está com maior comprometimento este mês?",
  ],
  "/dividas": [
    "Qual dívida devo priorizar para economizar mais juros?",
    "Quanto meu orçamento melhora se eu quitar uma dívida menor primeiro?",
  ],
  "/patrimonio": [
    "Minha reserva de liquidez imediata está adequada para meus gastos atuais?",
    "Como está a relação entre meus ativos e minhas dívidas?",
  ],
  "/orcamentos": [
    "Quais categorias já estão em alerta ou perto de exceder o orçamento?",
    "Que ajustes práticos posso fazer até o fim do mês?",
  ],
  "/objetivos": [
    "Estou no ritmo certo para atingir meus objetivos no prazo?",
    "Quanto preciso aportar por mês considerando minhas sobras atuais?",
  ],
  "/projecoes": [
    "Minha projeção dos próximos meses mostra folga ou risco de déficit?",
    "Quanto uma economia mensal de 15% muda meu patrimônio projetado?",
  ],
  "/diagnosticos": [
    "Explique o que mais puxou meu score de saúde financeira para cima ou para baixo",
    "Por qual ponto crítico do diagnóstico devo começar hoje?",
  ],
  "/classificacao": [
    "Por que manter categorias específicas melhora meus diagnósticos e orçamentos?",
  ],
  "/otimizacao": [
    "Onde uma pequena redução mensal traz maior alívio no meu caixa?",
    "Vale mais direcionar minha sobra atual para dívidas ou reserva?",
  ],
  "/relatorios": [
    "Faça um resumo executivo dos meus principais números deste mês",
  ],
  "/configuracoes": [
    "Quais dados meus o Assistente consulta quando respondo por aqui?",
  ],
};

export function getIndicatorExplanation(metricId) {
  return INDICATOR_EXPLANATIONS[metricId] || null;
}

export function getContextPromptsForRoute(pathname) {
  const clean = (pathname || "").replace(/\/+$/, "");
  return CONTEXT_PROMPTS_BY_ROUTE[clean] || null;
}
