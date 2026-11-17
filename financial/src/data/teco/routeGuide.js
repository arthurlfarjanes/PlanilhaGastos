/**
 * Guias curados por tela para o Teco Ajuda.
 * Conteúdo 100% local e declarativo (não consome cota de IA).
 */

export const ROUTE_GUIDES = {
  "/comparativo": {
    route: "/comparativo",
    title: "Dashboard (Visão Geral)",
    subtitle: "Seu termômetro mensal de receitas, despesas e saldo.",
    summary:
      "Aqui você acompanha rapidamente quanto entrou, quanto saiu e o resultado do período selecionado.",
    indicators: [
      { label: "Receitas", meaning: "Total de entradas registradas no período escolhido." },
      { label: "Despesas", meaning: "Soma dos gastos pagos e lançamentos no período." },
      { label: "Saldo", meaning: "Diferença entre receitas e despesas do período." },
    ],
    actions: [
      "Alterar o período para comparar meses anteriores.",
      "Personalizar ou ocultar cards em Configurações → Aparência.",
      "Identificar categorias com maior peso nos gráficos.",
    ],
    prerequisites: [
      "Ter lançamentos registrados em Transações ou Transações Fixas.",
    ],
    nextSteps: [
      { label: "Lançar ou editar transações", route: "/dashboard" },
      { label: "Conferir limites em Orçamentos", route: "/orcamentos" },
    ],
    recommendedTourId: "comparativo",
  },

  "/dashboard": {
    route: "/dashboard",
    title: "Transações",
    subtitle: "Registro diário de receitas e despesas.",
    summary:
      "Central para cadastrar lançamentos avulsos, parcelados ou importados e manter seu extrato em dia.",
    indicators: [
      { label: "Totais filtrados", meaning: "Refletem apenas os filtros de busca e datas aplicados." },
      { label: "Categorias", meaning: "Agrupam gastos parecidos para alimentar gráficos e orçamentos." },
    ],
    actions: [
      "Cadastrar nova receita ou despesa.",
      "Filtrar por categoria, tipo ou texto para revisar lançamentos.",
      "Editar ou remover lançamentos incorretos.",
    ],
    prerequisites: [
      "Definir categorias claras ajuda o Diagnóstico e a Classificação automática.",
    ],
    nextSteps: [
      { label: "Automatizar lançamentos recorrentes", route: "/gastos-fixos" },
      { label: "Ver impacto nos Orçamentos", route: "/orcamentos" },
    ],
    recommendedTourId: "dashboard",
  },

  "/gastos-fixos": {
    route: "/gastos-fixos",
    title: "Transações Fixas",
    subtitle: "Receitas e contas que se repetem todo mês.",
    summary:
      "Cadastre salários, aluguel, assinaturas e contas recorrentes para não precisar digitar todo mês.",
    indicators: [
      { label: "Comprometimento fixo", meaning: "Quanto da sua renda já tem destino mensal definido." },
      { label: "Vencimentos", meaning: "Dias de cobrança usados nos lembretes do painel." },
    ],
    actions: [
      "Adicionar contas mensais com dia de vencimento.",
      "Pausar ou ajustar valores quando houver reajuste.",
      "Acompanhar alertas de vencimento próximo no sino de Notificações.",
    ],
    prerequisites: [
      "Ativar lembretes em Configurações → Notificações para receber avisos.",
    ],
    nextSteps: [
      { label: "Simular meses futuros em Projeções", route: "/projecoes" },
      { label: "Revisar assinaturas em Otimização", route: "/otimizacao" },
    ],
    recommendedTourId: "gastos-fixos",
  },

  "/cartoes": {
    route: "/cartoes",
    title: "Cartões de Crédito",
    subtitle: "Faturas, fechamento, vencimento e limites.",
    summary:
      "Controle quanto já foi comprometido na fatura aberta e quando cada cartão fecha ou vence.",
    indicators: [
      { label: "Limite utilizado", meaning: "Percentual do limite ocupado por compras em aberto." },
      { label: "Fatura atual", meaning: "Valor acumulado até o próximo fechamento." },
    ],
    actions: [
      "Cadastrar seus cartões com melhor dia de compra e vencimento.",
      "Lançar compras à vista ou parceladas no cartão correto.",
      "Acompanhar faturas próximas do vencimento.",
    ],
    prerequisites: [
      "Informar corretamente os dias de fechamento e vencimento do cartão.",
    ],
    nextSteps: [
      { label: "Ver projeção de parcelas futuras", route: "/projecoes" },
      { label: "Avaliar juros e quitação em Dívidas", route: "/dividas" },
    ],
    recommendedTourId: "cartoes",
  },

  "/dividas": {
    route: "/dividas",
    title: "Dívidas",
    subtitle: "Empréstimos, financiamentos e plano de quitação.",
    summary:
      "Acompanhe saldo devedor, taxas de juros e priorize o que reduz mais rápido o custo financeiro.",
    indicators: [
      { label: "Saldo devedor", meaning: "Valor restante para encerrar cada contrato." },
      { label: "Parcela mensal", meaning: "Impacto recorrente no seu fluxo de caixa." },
    ],
    actions: [
      "Registrar dívidas com parcelas e taxa de juros.",
      "Marcar parcelas pagas para atualizar o saldo restante.",
      "Comparar quais dívidas têm juros mais altos.",
    ],
    prerequisites: [
      "Informar taxa mensal e número de parcelas traz projeções mais precisas.",
    ],
    nextSteps: [
      { label: "Simular economia em Otimização", route: "/otimizacao" },
      { label: "Planejar reserva em Objetivos", route: "/objetivos" },
    ],
    recommendedTourId: "dividas",
  },

  "/patrimonio": {
    route: "/patrimonio",
    title: "Patrimônio",
    subtitle: "Ativos, reservas e evolução do patrimônio líquido.",
    summary:
      "Consolide contas, investimentos e bens para visualizar seu patrimônio líquido ao longo do tempo.",
    indicators: [
      { label: "Ativos totais", meaning: "Soma de reservas, investimentos e bens cadastrados." },
      { label: "Patrimônio líquido", meaning: "Ativos descontando passivos/dívidas registradas." },
    ],
    actions: [
      "Registrar contas bancárias, reserva de emergência e investimentos.",
      "Atualizar saldos periodicamente para acompanhar evolução.",
    ],
    prerequisites: [
      "Manter Dívidas atualizadas deixa o patrimônio líquido real.",
    ],
    nextSteps: [
      { label: "Vincular reservas a Objetivos", route: "/objetivos" },
      { label: "Gerar relatório em Relatórios", route: "/relatorios" },
    ],
    recommendedTourId: "patrimonio",
  },

  "/orcamentos": {
    route: "/orcamentos",
    title: "Orçamentos",
    subtitle: "Tetos de gasto por categoria com alertas visuais.",
    summary:
      "Defina quanto pretende gastar em cada categoria por mês e receba avisos antes de estourar o limite.",
    indicators: [
      { label: "Consumido (%)", meaning: "Proporção do teto mensal já gasta na categoria." },
      { label: "Em alerta / Excedido", meaning: "Categorias próximas ou acima do limite definido." },
    ],
    actions: [
      "Criar limites para categorias variáveis (mercado, lazer, delivery).",
      "Acompanhar o semáforo verde, amarelo e vermelho durante o mês.",
    ],
    prerequisites: [
      "Lançar despesas com a mesma categoria configurada no orçamento.",
    ],
    nextSteps: [
      { label: "Ajustar lançamentos em Transações", route: "/dashboard" },
      { label: "Revisar diagnóstico mensal", route: "/diagnosticos" },
    ],
    recommendedTourId: "orcamentos",
  },

  "/objetivos": {
    route: "/objetivos",
    title: "Objetivos",
    subtitle: "Metas financeiras com acompanhamento de progresso.",
    summary:
      "Transforme planos (reserva de emergência, viagem, quitação) em metas mensuráveis com prazo.",
    indicators: [
      { label: "Progresso (%)", meaning: "Quanto já foi acumulado em relação ao valor alvo." },
      { label: "Aporte sugerido", meaning: "Ritmo mensal estimado para atingir o prazo." },
    ],
    actions: [
      "Criar uma meta com valor alvo e data desejada.",
      "Registrar novos aportes para atualizar a barra de progresso.",
    ],
    prerequisites: [
      "Definir um objetivo claro ajuda a priorizar sobras no orçamento.",
    ],
    nextSteps: [
      { label: "Testar capacidade de poupança em Projeções", route: "/projecoes" },
      { label: "Ver reservas em Patrimônio", route: "/patrimonio" },
    ],
    recommendedTourId: "objetivos",
  },

  "/projecoes": {
    route: "/projecoes",
    title: "Projeções",
    subtitle: "Simulação de caixa futuro e cenários.",
    summary:
      "Veja como suas contas fixas, parcelas e metas projetam seu saldo nos próximos meses.",
    indicators: [
      { label: "Saldo projetado", meaning: "Estimativa de sobra ou aperto nos próximos meses." },
      { label: "Cenário simulado", meaning: "Impacto de ajustes extras sem alterar seus dados reais." },
    ],
    actions: [
      "Alternar o horizonte de meses para enxergar o médio prazo.",
      "Simular cortes de gasto ou aumento de receita com segurança.",
    ],
    prerequisites: [
      "Transações Fixas e Cartões em dia deixam a projeção muito mais fiel.",
    ],
    nextSteps: [
      { label: "Aplicar cortes no Orçamento", route: "/orcamentos" },
      { label: "Pedir plano prático ao Teco", route: "/assistente" },
    ],
    recommendedTourId: "projecoes",
  },

  "/diagnosticos": {
    route: "/diagnosticos",
    title: "Diagnósticos",
    subtitle: "Saúde financeira automática baseada nos seus dados.",
    summary:
      "Analisa comprometimento de renda, equilíbrio entre fixos e variáveis e concentração de gastos.",
    indicators: [
      { label: "Pontuação / Indicadores", meaning: "Leitura objetiva da folga mensal e riscos." },
      { label: "Pontos de atenção", meaning: "Desvios que merecem revisão no mês atual." },
    ],
    actions: [
      "Consultar gargalos antes de assumir novas parcelas.",
      "Seguir os links sugeridos para corrigir categorias críticas.",
    ],
    prerequisites: [
      "Ter pelo menos um mês de receitas e despesas registradas.",
    ],
    nextSteps: [
      { label: "Simular economia em Otimização", route: "/otimizacao" },
      { label: "Ajustar tetos em Orçamentos", route: "/orcamentos" },
    ],
    recommendedTourId: "diagnosticos",
  },

  "/classificacao": {
    route: "/classificacao",
    title: "Classificação Inteligente",
    subtitle: "Regras e sugestões para categorizar lançamentos.",
    summary:
      "Padronize categorias de transações parecidas e reduza lançamentos sem classificação.",
    indicators: [
      { label: "Pendências", meaning: "Lançamentos sem categoria definida ou ambíguos." },
      { label: "Regras salvas", meaning: "Palavras-chave aplicadas automaticamente aos novos gastos." },
    ],
    actions: [
      "Criar regras simples por descrição (ex.: mercado, transporte).",
      "Revisar pendências em lote antes de gerar relatórios.",
    ],
    prerequisites: [
      "Ter transações lançadas no histórico.",
    ],
    nextSteps: [
      { label: "Conferir relatórios por categoria", route: "/relatorios" },
    ],
    recommendedTourId: "classificacao",
  },

  "/otimizacao": {
    route: "/otimizacao",
    title: "Otimização",
    subtitle: "Oportunidades para liberar caixa no mês.",
    summary:
      "Descubra quanto você pode economizar ajustando categorias elásticas ou priorizando dívidas.",
    indicators: [
      { label: "Potencial de economia", meaning: "Estimativa de caixa liberado com pequenos ajustes." },
    ],
    actions: [
      "Testar cenários de corte por categoria.",
      "Converter a economia estimada em aporte para Objetivos.",
    ],
    prerequisites: [
      "Histórico recente de gastos e dívidas cadastradas.",
    ],
    nextSteps: [
      { label: "Aplicar economia nas Metas", route: "/objetivos" },
      { label: "Projetar impacto futuro", route: "/projecoes" },
    ],
    recommendedTourId: "otimizacao",
  },

  "/relatorios": {
    route: "/relatorios",
    title: "Relatórios",
    subtitle: "Exportação consolidada em PDF e CSV.",
    summary:
      "Gere resumos completos por período para arquivo pessoal, declaração ou compartilhamento seguro.",
    indicators: [
      { label: "Resumo do período", meaning: "Totais consolidados antes de exportar." },
    ],
    actions: [
      "Escolher intervalo de datas para o relatório.",
      "Exportar CSV para planilhas ou PDF formatado para leitura.",
    ],
    prerequisites: [
      "Revisar lançamentos do período escolhido antes da exportação.",
    ],
    nextSteps: [
      { label: "Voltar ao Dashboard", route: "/comparativo" },
    ],
    recommendedTourId: "relatorios",
  },

  "/assistente": {
    route: "/assistente",
    title: "Teco · Assistente IA",
    subtitle: "Conversa com o Teco conectada às suas ferramentas financeiras.",
    summary:
      "Tire dúvidas específicas sobre seus números, peça resumos ou simule cenários usando IA gratuita.",
    indicators: [
      { label: "Cota transparente", meaning: "Uso gratuito gerenciado com segurança; ajuda/tours não gastam cota." },
    ],
    actions: [
      "Enviar perguntas em linguagem natural ou clicar em sugestões prontas.",
      "Revisar preferências de IA e privacidade em Configurações.",
    ],
    prerequisites: [
      "A IA funciona melhor com suas transações e orçamentos atualizados.",
    ],
    nextSteps: [
      { label: "Ajustar privacidade da IA", route: "/configuracoes?aba=ia" },
    ],
    recommendedTourId: "primeiros-passos",
  },

  "/configuracoes": {
    route: "/configuracoes",
    title: "Configurações e Privacidade",
    subtitle: "Aparência, moedas, notificações, IA, segurança e LGPD.",
    summary:
      "Personalize tema, cor de destaque, fuso horário, preferências de ajuda do Teco e exportação/exclusão de dados.",
    indicators: [
      { label: "Preferências sincronizadas", meaning: "Salvas na sua conta e aplicadas em qualquer dispositivo." },
    ],
    actions: [
      "Trocar tema, layout (Navbar/Sidebar) ou reduzir animações.",
      "Configurar fuso horário e dia inicial do período financeiro.",
      "Gerenciar privacidade LGPD, exportar dados ou reabrir tours.",
    ],
    prerequisites: [],
    nextSteps: [
      { label: "Voltar ao Dashboard", route: "/comparativo" },
    ],
    recommendedTourId: "configuracoes",
  },

  "/admin": {
    route: "/admin",
    title: "Painel Administrativo",
    subtitle: "Observabilidade operacional, usuários e integridade do sistema.",
    summary:
      "Área restrita para administradores acompanharem saúde do banco, logs e métricas agregadas sem expor finanças privadas.",
    indicators: [
      { label: "Status e logs", meaning: "Monitoramento com timezone configurada e mascaramento." },
    ],
    actions: [
      "Consultar logs recentes e filtrar por fuso horário.",
      "Verificar saúde dos serviços.",
    ],
    prerequisites: [
      "Conta com perfil administrador autenticado no backend.",
    ],
    nextSteps: [
      { label: "Ir para o Dashboard pessoal", route: "/comparativo" },
    ],
    recommendedTourId: "primeiros-passos",
  },
};

export const EXPLORE_FEATURE_GROUPS = [
  {
    id: "dia-a-dia",
    label: "Rotina Financeira",
    items: [
      { route: "/comparativo", title: "Dashboard", short: "Resumo mensal e gráficos principais" },
      { route: "/dashboard", title: "Transações", short: "Entradas e saídas do dia a dia" },
      { route: "/gastos-fixos", title: "Transações Fixas", short: "Contas e receitas recorrentes" },
      { route: "/cartoes", title: "Cartões", short: "Faturas, fechamento e limites" },
    ],
  },
  {
    id: "planejamento",
    label: "Planejamento e Metas",
    items: [
      { route: "/orcamentos", title: "Orçamentos", short: "Tetos de gasto por categoria" },
      { route: "/objetivos", title: "Objetivos", short: "Metas de curto e longo prazo" },
      { route: "/projecoes", title: "Projeções", short: "Simulação de fluxo futuro" },
      { route: "/dividas", title: "Dívidas", short: "Quitação e controle de juros" },
      { route: "/patrimonio", title: "Patrimônio", short: "Ativos, reservas e patrimônio líquido" },
    ],
  },
  {
    id: "inteligencia",
    label: "Inteligência e Relatórios",
    items: [
      { route: "/diagnosticos", title: "Diagnósticos", short: "Saúde financeira automática" },
      { route: "/classificacao", title: "Classificação", short: "Regras automáticas de categoria" },
      { route: "/otimizacao", title: "Otimização", short: "Onde liberar caixa no mês" },
      { route: "/relatorios", title: "Relatórios", short: "Exportação em PDF e CSV" },
      { route: "/assistente", title: "Teco · Assistente IA", short: "Análises conversacionais gratuitas" },
    ],
  },
  {
    id: "preferencias",
    label: "Conta e Personalização",
    items: [
      { route: "/configuracoes", title: "Configurações", short: "Tema, fuso horário, ajuda e LGPD" },
    ],
  },
];

export function getRouteGuide(pathname = "/comparativo") {
  const clean = (pathname || "/comparativo").replace(/\/+$/, "") || "/comparativo";
  return ROUTE_GUIDES[clean] || ROUTE_GUIDES["/comparativo"];
}
