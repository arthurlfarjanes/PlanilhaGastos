/**
 * Ferramentas SOMENTE LEITURA autorizadas para o Assistente Financeiro.
 * Todas as consultas exigem userId validado via JWT e utilizam os motores
 * determinísticos do backend como única fonte de cálculo.
 */
const pool = require("../../config/db");
const { toCents, fromCents, todayISO, enrichContaCompetencia, calcularResumoContas } = require("../../utils/contasFixas");
const { monthDateBounds, enrichOrcamento, calcularResumoOrcamentos } = require("../../utils/orcamentos");
const { enrichDivida, calcularResumoDividas } = require("../../utils/dividas");
const { calcularFatura, calcularLimite } = require("../../utils/cartoes");
const { enrichPatrimonioItem, calcularResumoPatrimonio } = require("../../utils/patrimonio");
const { enrichObjetivo, calcularResumoObjetivos } = require("../../utils/objetivos");
const { calcularIndicadoresFinanceiros } = require("../../utils/indicadores");
const { gerarLembretesFinanceiros } = require("../../utils/notificacoes");
const {
  computeUserDiagnostics,
  computeUserOptimization,
} = require("../../services/diagnosticosService");

const TOOL_CATALOG = {
  obter_resumo_financeiro: {
    name: "obter_resumo_financeiro",
    label: "Indicadores e fluxo do mês atual",
    async run(userId, { refDate }) {
      const [ano, mes] = refDate.split("-").map(Number);
      const { start, endExclusive } = monthDateBounds(ano, mes);

      const [txRes, fixasRes, divRes, patRes, objRes, cartoesRes, lancCartaoRes, pagCartaoRes] =
        await Promise.all([
          pool.query(
            `SELECT
               COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS receitas,
               COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS despesas,
               COUNT(*) AS quantidade
             FROM transacoes
             WHERE user_id = $1 AND data >= $2::date AND data < $3::date`,
            [userId, start, endExclusive],
          ),
          pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS total_fixas
             FROM gastos_fixos
             WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'despesa'`,
            [userId],
          ),
          pool.query("SELECT * FROM dividas WHERE user_id = $1", [userId]),
          pool.query("SELECT * FROM patrimonio_itens WHERE user_id = $1", [userId]),
          pool.query(
            `SELECT o.*, p.nome AS patrimonio_nome,
                    p.rendimento_tipo AS patrimonio_rendimento_tipo,
                    p.rendimento_valor AS patrimonio_rendimento_valor,
                    p.cdi_referencia AS patrimonio_cdi_referencia
             FROM objetivos o
             LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
             WHERE o.user_id = $1`,
            [userId],
          ),
          pool.query("SELECT * FROM cartoes WHERE user_id = $1 AND ativo = TRUE", [userId]),
          pool.query(
            `SELECT id, descricao, valor, data::text AS data, categoria_id, cartao_id
             FROM transacoes
             WHERE user_id = $1 AND cartao_id IS NOT NULL AND tipo = 'despesa'`,
            [userId],
          ),
          pool.query(
            `SELECT id, cartao_id, competencia_ano, competencia_mes, valor_pago,
                    to_char(data_pagamento, 'YYYY-MM-DD') AS data_pagamento
             FROM cartoes_faturas_pagas WHERE user_id = $1`,
            [userId],
          ),
        ]);

      const divResumo = calcularResumoDividas(divRes.rows.map(enrichDivida));
      const patResumo = calcularResumoPatrimonio(
        patRes.rows.map(enrichPatrimonioItem),
        divResumo.total_saldo_devedor,
      );
      const objResumo = calcularResumoObjetivos(objRes.rows.map((r) => enrichObjetivo(r, refDate)));

      let faturasMesCents = 0;
      for (const c of cartoesRes.rows) {
        const lancs = lancCartaoRes.rows.filter((l) => l.cartao_id === c.id);
        const pag = pagCartaoRes.rows.find(
          (p) => p.cartao_id === c.id && Number(p.competencia_ano) === ano && Number(p.competencia_mes) === mes,
        );
        const fat = calcularFatura(c, lancs, ano, mes, pag || null, refDate);
        if (fat.status !== "paga") faturasMesCents += toCents(fat.total);
      }

      const indicadores = calcularIndicadoresFinanceiros({
        receitas: txRes.rows[0]?.receitas || 0,
        despesas: txRes.rows[0]?.despesas || 0,
        contasFixasDespesas: fixasRes.rows[0]?.total_fixas || 0,
        dividasMensais: divResumo.comprometimento_mensal || 0,
        faturasMesAtual: fromCents(faturasMesCents),
        patrimonioResumo: patResumo,
        objetivosResumo: objResumo,
      });

      return {
        competencia: `${String(mes).padStart(2, "0")}/${ano}`,
        transacoes_no_mes: Number(txRes.rows[0]?.quantidade || 0),
        indicadores,
      };
    },
  },

  gastos_por_categoria: {
    name: "gastos_por_categoria",
    label: "Gastos por categoria no mês atual",
    async run(userId, { refDate, shareTransactionDetails = false }) {
      const [ano, mes] = refDate.split("-").map(Number);
      const { start, endExclusive } = monthDateBounds(ano, mes);

      const catRes = await pool.query(
        `SELECT COALESCE(c.nome, 'Sem categoria') AS categoria,
                SUM(t.valor) AS total,
                COUNT(*) AS qtd
         FROM transacoes t
         LEFT JOIN categorias c ON t.categoria_id = c.id
         WHERE t.user_id = $1 AND t.tipo = 'despesa' AND t.data >= $2::date AND t.data < $3::date
         GROUP BY COALESCE(c.nome, 'Sem categoria')
         ORDER BY total DESC
         LIMIT 8`,
        [userId, start, endExclusive],
      );

      let recentes = [];
      if (shareTransactionDetails) {
        const recRes = await pool.query(
          `SELECT t.descricao, t.valor, t.tipo, to_char(t.data, 'YYYY-MM-DD') AS data,
                  COALESCE(c.nome, 'Sem categoria') AS categoria
           FROM transacoes t
           LEFT JOIN categorias c ON t.categoria_id = c.id
           WHERE t.user_id = $1 AND t.data >= $2::date AND t.data < $3::date
           ORDER BY t.data DESC, t.id DESC
           LIMIT 12`,
          [userId, start, endExclusive],
        );
        recentes = recRes.rows.map((r) => ({
          descricao: r.descricao,
          valor: Number(r.valor),
          tipo: r.tipo,
          data: r.data,
          categoria: r.categoria,
        }));
      }

      return {
        top_categorias_despesa: catRes.rows.map((r) => ({
          categoria: r.categoria,
          total: Number(r.total),
          lancamentos: Number(r.qtd),
        })),
        transacoes_recentes: shareTransactionDetails ? recentes : "ocultas por preferência de privacidade",
      };
    },
  },

  orcamentos_e_alertas: {
    name: "orcamentos_e_alertas",
    label: "Orçamentos e lembretes ativos",
    async run(userId, { refDate, notificationsPrefs }) {
      const [ano, mes] = refDate.split("-").map(Number);
      const { start, endExclusive } = monthDateBounds(ano, mes);

      const [orcRes, contasRes] = await Promise.all([
        pool.query(
          `SELECT o.id, o.categoria_id, o.valor_limite, o.alerta_percentual, o.ativo,
                  c.nome AS categoria_nome,
                  COALESCE(g.total_gasto, 0) AS gasto_realizado
           FROM orcamentos o
           JOIN categorias c ON o.categoria_id = c.id
           LEFT JOIN (
             SELECT categoria_id, SUM(valor) AS total_gasto
             FROM transacoes
             WHERE user_id = $1 AND tipo = 'despesa'
               AND data >= $2::date AND data < $3::date AND categoria_id IS NOT NULL
             GROUP BY categoria_id
           ) g ON g.categoria_id = o.categoria_id
           WHERE o.user_id = $1 AND o.ativo = TRUE`,
          [userId, start, endExclusive],
        ),
        pool.query(
          `SELECT gf.*, gfp.id AS pagamento_id, gfp.valor_pago, gfp.data_pagamento, gfp.transacao_id
           FROM gastos_fixos gf
           LEFT JOIN gastos_fixos_pagamentos gfp
             ON gfp.gasto_fixo_id = gf.id AND gfp.competencia_ano = $2 AND gfp.competencia_mes = $3
           WHERE gf.usuario_id = $1 AND gf.ativo = TRUE`,
          [userId, ano, mes],
        ),
      ]);

      const orcamentos = orcRes.rows.map((r) => enrichOrcamento(r, ano, mes));
      const contas = contasRes.rows.map((r) => enrichContaCompetencia(r, ano, mes, refDate));
      const lembretesOut = gerarLembretesFinanceiros({
        contas,
        orcamentos,
        prefs: notificationsPrefs || {},
        refTodayISO: refDate,
      });

      return {
        resumo_orcamentos: calcularResumoOrcamentos(orcamentos),
        orcamentos_em_atencao: orcamentos
          .filter((o) => o.status !== "ok")
          .map((o) => ({
            categoria: o.categoria_nome,
            status: o.status,
            gasto: o.gasto_realizado,
            limite: o.valor_limite,
            percentual: o.percentual_consumido,
          })),
        contas_fixas_resumo: calcularResumoContas(contas),
        lembretes_ativos: lembretesOut.lembretes.slice(0, 6),
      };
    },
  },

  cartoes_dividas_objetivos: {
    name: "cartoes_dividas_objetivos",
    label: "Cartões, dívidas, patrimônio e objetivos",
    async run(userId, { refDate }) {
      const [ano, mes] = refDate.split("-").map(Number);
      const [divRes, objRes, patRes, cartRes, lancRes, pagRes] = await Promise.all([
        pool.query("SELECT * FROM dividas WHERE user_id = $1 AND status = 'ativa'", [userId]),
        pool.query(
          `SELECT o.*, p.nome AS patrimonio_nome,
                  p.rendimento_tipo AS patrimonio_rendimento_tipo,
                  p.rendimento_valor AS patrimonio_rendimento_valor,
                  p.cdi_referencia AS patrimonio_cdi_referencia
           FROM objetivos o
           LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
           WHERE o.user_id = $1 AND o.status <> 'pausado'`,
          [userId],
        ),
        pool.query("SELECT * FROM patrimonio_itens WHERE user_id = $1 AND ativo = TRUE", [userId]),
        pool.query("SELECT * FROM cartoes WHERE user_id = $1 AND ativo = TRUE", [userId]),
        pool.query(
          `SELECT id, descricao, valor, data::text AS data, categoria_id, cartao_id
           FROM transacoes WHERE user_id = $1 AND cartao_id IS NOT NULL AND tipo = 'despesa'`,
          [userId],
        ),
        pool.query(
          `SELECT id, cartao_id, competencia_ano, competencia_mes, valor_pago,
                  to_char(data_pagamento, 'YYYY-MM-DD') AS data_pagamento
           FROM cartoes_faturas_pagas WHERE user_id = $1`,
          [userId],
        ),
      ]);

      const dividas = divRes.rows.map(enrichDivida);
      const divResumo = calcularResumoDividas(dividas);
      const patItens = patRes.rows.map(enrichPatrimonioItem);
      const objItens = objRes.rows.map((r) => enrichObjetivo(r, refDate));

      const cartoes = cartRes.rows.map((c) => {
        const lancs = lancRes.rows.filter((l) => l.cartao_id === c.id);
        const pags = pagRes.rows.filter((p) => p.cartao_id === c.id);
        const lim = calcularLimite(c, lancs, pags, { ano, mes });
        const pagMes = pags.find((p) => Number(p.competencia_ano) === ano && Number(p.competencia_mes) === mes);
        const fat = calcularFatura(c, lancs, ano, mes, pagMes || null, refDate);
        return {
          nome: c.nome,
          limite_total: Number(c.limite_total),
          limite_disponivel: lim.limite_disponivel,
          fatura_mes_atual: fat.total,
          status_fatura: fat.status,
          vencimento: fat.vencimento,
        };
      });

      return {
        dividas_ativas: dividas.slice(0, 6).map((d) => ({
          nome: d.nome,
          saldo_devedor: d.saldo_devedor,
          taxa_juros_mensal: d.taxa_juros_mensal,
          valor_parcela: d.valor_parcela,
          parcelas_restantes: d.parcelas_restantes,
        })),
        estrategia_dividas: divResumo.estrategias,
        patrimonio_ativos: patItens.slice(0, 8).map((p) => ({
          nome: p.nome,
          tipo: p.tipo,
          valor_atual: p.valor_atual,
          liquidez: p.liquidez,
          rendimento_mensal_estimado: p.rendimento_mensal_estimado,
        })),
        objetivos: objItens.slice(0, 8).map((o) => ({
          nome: o.nome,
          status: o.status,
          valor_atual: o.valor_atual,
          valor_alvo: o.valor_alvo,
          percentual_concluido: o.percentual_concluido,
          prazo: o.prazo,
          situacao_prazo: o.situacao_prazo,
          meses_estimados: o.meses_estimados,
        })),
        cartoes,
      };
    },
  },
  obter_diagnosticos_financeiros: {
    name: "obter_diagnosticos_financeiros",
    label: "Score de saúde e diagnósticos determinísticos",
    async run(userId, { refDate }) {
      const diag = await computeUserDiagnostics(userId, refDate);
      return {
        saude_financeira: diag.saude_financeira,
        diagnosticos_principais: diag.diagnosticos.slice(0, 6).map((d) => ({
          severidade: d.severidade,
          area: d.area,
          titulo: d.titulo,
          descricao: d.descricao,
          acao_sugerida: d.acao_sugerida,
        })),
        anomalias_categorias: diag.anomalias_categorias
          .filter((a) => a.status !== "normal")
          .slice(0, 5),
        recorrencias_detectadas: diag.recorrencias_nao_cadastradas.slice(0, 4),
      };
    },
  },
  obter_plano_otimizacao: {
    name: "obter_plano_otimizacao",
    label: "Plano determinístico de otimização e prioridades",
    async run(userId, { refDate }) {
      const opt = await computeUserOptimization(userId, { refDate });
      return {
        parametros: opt.parametros,
        resumo: opt.resumo,
        plano_alocacao: opt.plano_alocacao.slice(0, 4),
        oportunidades_corte: opt.oportunidades_corte.slice(0, 4),
      };
    },
  },
};

/**
 * Seleciona quais ferramentas somente-leitura executar para responder à pergunta,
 * evitando enviar payload desnecessário ao modelo gratuito.
 */
function selectToolsForPrompt(message) {
  const txt = String(message || "").toLowerCase();
  const chosen = new Set(["obter_resumo_financeiro"]);

  if (/categori|gast|despes|onde|maior|extrato|compra|economi/.test(txt)) {
    chosen.add("gastos_por_categoria");
  }
  if (/or[çc]ament|limite|alerta|conta|venc|assinatura|fixa|lembret/.test(txt)) {
    chosen.add("orcamentos_e_alertas");
  }
  if (/d[íi]vid|juro|parcela|cart[ãa]o|fatura|patrim[ôo]nio|reserva|objetivo|meta|invest/.test(txt)) {
    chosen.add("cartoes_dividas_objetivos");
  }
  if (/sa[úu]de|score|diagn[óo]st|anomal|at[íi]pic|fora do normal|melhor|pior/.test(txt)) {
    chosen.add("obter_diagnosticos_financeiros");
  }
  if (/otimiz|prioriz|aloc|sobra|amortiz|cortar|economizar mais|onde colocar|onde investir/.test(txt)) {
    chosen.add("obter_plano_otimizacao");
  }

  // Pergunta genérica/panorâmica -> inclui categorias, metas/dívidas e diagnósticos para dar boa visão
  if (chosen.size === 1) {
    chosen.add("gastos_por_categoria");
    chosen.add("orcamentos_e_alertas");
    chosen.add("cartoes_dividas_objetivos");
    chosen.add("obter_diagnosticos_financeiros");
  }

  return Array.from(chosen);
}

async function gatherFinanceContext(userId, { message, refDate = todayISO(), shareTransactionDetails = false, notificationsPrefs = {} }) {
  const toolNames = selectToolsForPrompt(message);
  const results = {};
  const toolsUsed = [];

  await Promise.all(
    toolNames.map(async (name) => {
      const tool = TOOL_CATALOG[name];
      if (!tool) return;
      results[name] = await tool.run(userId, { refDate, shareTransactionDetails, notificationsPrefs });
      toolsUsed.push({ name: tool.name, label: tool.label });
    }),
  );

  return { toolsUsed, contextData: results };
}

module.exports = {
  TOOL_CATALOG,
  selectToolsForPrompt,
  gatherFinanceContext,
};
