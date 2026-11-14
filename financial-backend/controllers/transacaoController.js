const pool = require("../config/db");
const { reverterAmortizacaoNoBanco } = require("./dividasController");
const { validarCartaoParaTransacao, faturaPaga, obterCartao } = require("./cartoesController");
const { todayISO } = require("../utils/contasFixas");
const { SQL_CASE_PARCELA, SQL_CASE_PARCELA_SUBSEQUENTE } = require("../utils/parcelas");

const MSG_FATURA_PAGA =
  "Esta transação pertence a uma fatura de cartão já paga. Estorne o pagamento da fatura antes de alterá-la.";

// Resolve o cartão informado (opcional) para uma despesa. Retorna { cartaoId, cartao } ou { error, status }.
async function resolverCartao(db, userId, tipo, cartaoIdRaw) {
  if (cartaoIdRaw === undefined || cartaoIdRaw === null || cartaoIdRaw === "") {
    return { cartaoId: null, cartao: null };
  }
  if (tipo !== "despesa") {
    return { error: "Apenas despesas podem ser atreladas a um cartão.", status: 400 };
  }
  const v = await validarCartaoParaTransacao(db, userId, cartaoIdRaw);
  if (v.error) return v;
  return { cartaoId: v.cartao.id, cartao: v.cartao };
}

// Função auxiliar para escapar caracteres especiais de LIKE/ILIKE no PostgreSQL
const escapeLikeString = (str) => {
  return str.replace(/([%_\\])/g, "\\$1");
};

// Validação de formato de data YYYY-MM-DD
const isValidDateString = (dateStr) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

exports.listarTransacoes = async (req, res, next) => {
  const userId = req.user.userId;
  const {
    tipo,
    categoriaId,
    dataInicio,
    dataFim,
    descricao,
    ocultarParcelasFuturas,
    apenasParcelasVincendas,
    dataRef,
  } = req.query;

  const refDate = isValidDateString(dataRef) ? dataRef : todayISO();
  const flagOcultarFuturas = ocultarParcelasFuturas === "true" || ocultarParcelasFuturas === "1";
  const flagApenasVincendas = apenasParcelasVincendas === "true" || apenasParcelasVincendas === "1";

  let query = `
    SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, t.categoria_id, c.nome as categoria_nome, c.cor as categoria_cor,
           t.cartao_id, ca.nome as cartao_nome, t.cartao_excluido_nome
    FROM transacoes t
    LEFT JOIN categorias c ON t.categoria_id = c.id
    LEFT JOIN cartoes ca ON t.cartao_id = ca.id AND ca.user_id = t.user_id
    WHERE t.user_id = $1
  `;
  const params = [userId];
  let paramIndex = 2;

  if (tipo && (tipo === "receita" || tipo === "despesa")) {
    query += ` AND t.tipo = $${paramIndex++}`;
    params.push(tipo);
  }

  if (categoriaId && !isNaN(parseInt(categoriaId))) {
    query += ` AND t.categoria_id = $${paramIndex++}`;
    params.push(parseInt(categoriaId));
  }

  if (dataInicio && isValidDateString(dataInicio)) {
    query += ` AND t.data >= $${paramIndex++}`;
    params.push(dataInicio);
  }

  if (dataFim && isValidDateString(dataFim)) {
    query += ` AND t.data <= $${paramIndex++}`;
    params.push(dataFim);
  }

  if (descricao && typeof descricao === "string" && descricao.trim()) {
    query += ` AND t.descricao ILIKE $${paramIndex++}`;
    params.push(`%${escapeLikeString(descricao.trim().substring(0, 100))}%`);
  }

  if (flagApenasVincendas) {
    query += ` AND ${SQL_CASE_PARCELA} AND t.data > $${paramIndex++}`;
    params.push(refDate);
    query += " ORDER BY t.data ASC, t.id ASC";
  } else {
    if (flagOcultarFuturas) {
      query += ` AND NOT (${SQL_CASE_PARCELA_SUBSEQUENTE} AND t.data > $${paramIndex++})`;
      params.push(refDate);
    }
    query += " ORDER BY t.data DESC, t.id DESC";
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.criarTransacao = async (req, res, next) => {
  const { descricao, valor, tipo, data, categoria_id, cartao_id: cartao_id_in } = req.body;
  const userId = req.user.userId;

  if (!descricao || valor === undefined || !tipo || !data) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res.status(400).json({ error: "O valor da transação deve ser um número positivo." });
  }

  if (tipo !== "receita" && tipo !== "despesa") {
    return res.status(400).json({ error: "Tipo de transação inválido." });
  }

  if (!isValidDateString(data)) {
    return res.status(400).json({ error: "Formato de data inválido. Use AAAA-MM-DD." });
  }

  let finalCategoriaId = null;
  if (tipo === "despesa") {
    if (!categoria_id) {
      return res.status(400).json({ error: "Categoria é obrigatória para despesas." });
    }
    const catIdNum = parseInt(categoria_id);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    // Validação de posse: Garante isolamento multilocatário (Cross-Tenant)
    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    const cartaoRes = await resolverCartao(pool, userId, tipo, cartao_id_in);
    if (cartaoRes.error) return res.status(cartaoRes.status).json({ error: cartaoRes.error });
    if (cartaoRes.cartao && (await faturaPaga(pool, userId, cartaoRes.cartao, data))) {
      return res.status(409).json({
        error: "A fatura deste cartão referente a esta data já está paga. Estorne o pagamento antes de lançar novas compras nela.",
      });
    }

    const result = await pool.query(
      "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id, cartao_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        userId,
        descricao.toString().trim().substring(0, 150),
        numValor,
        tipo,
        data,
        finalCategoriaId,
        cartaoRes.cartaoId,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.criarTransacaoParcelada = async (req, res, next) => {
  const { descricao, valor, categoria_id, data, parcelas, cartao_id: cartao_id_in } = req.body;
  const userId = req.user.userId;

  if (!descricao || valor === undefined || !categoria_id || !data || !parcelas) {
    return res.status(400).json({
      error: "Todos os campos são obrigatórios para compra parcelada.",
    });
  }

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res.status(400).json({ error: "O valor total deve ser um número positivo." });
  }

  const numParcelas = parseInt(parcelas);
  // Defesa contra DoS: Teto máximo de 72 parcelas
  if (isNaN(numParcelas) || numParcelas <= 1 || numParcelas > 72) {
    return res.status(400).json({
      error: "O número de parcelas deve ser um número entre 2 e 72.",
    });
  }

  if (!isValidDateString(data)) {
    return res.status(400).json({ error: "Formato de data inválido. Use AAAA-MM-DD." });
  }

  const catIdNum = parseInt(categoria_id);
  if (isNaN(catIdNum)) {
    return res.status(400).json({ error: "ID de categoria inválido." });
  }

  // Validação de posse da categoria
  const catCheck = await pool.query(
    "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
    [catIdNum, userId],
  );
  if (catCheck.rows.length === 0) {
    return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
  }

  const valorParcela = (numValor / numParcelas).toFixed(2);
  const dataInicial = new Date(data + "T00:00:00Z");
  const cleanDescricao = descricao.toString().trim().substring(0, 100);

  const client = await pool.connect();
  try {
    const cartaoRes = await resolverCartao(client, userId, "despesa", cartao_id_in);
    if (cartaoRes.error) {
      return res.status(cartaoRes.status).json({ error: cartaoRes.error });
    }
    if (cartaoRes.cartao) {
      for (let i = 0; i < numParcelas; i++) {
        const d = new Date(dataInicial);
        d.setUTCMonth(dataInicial.getUTCMonth() + i);
        if (await faturaPaga(client, userId, cartaoRes.cartao, d.toISOString().split("T")[0])) {
          return res.status(409).json({
            error: "Alguma parcela cairia em uma fatura de cartão já paga. Estorne o pagamento dessa fatura antes.",
          });
        }
      }
    }

    await client.query("BEGIN");
    const insertedTransactions = [];
    for (let i = 1; i <= numParcelas; i++) {
      const dataParcela = new Date(dataInicial);
      dataParcela.setUTCMonth(dataInicial.getUTCMonth() + (i - 1));
      const descricaoParcela = `${cleanDescricao} (${i}/${numParcelas})`;

      const result = await client.query(
        "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id, cartao_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          userId,
          descricaoParcela,
          valorParcela,
          "despesa",
          dataParcela.toISOString().split("T")[0],
          catIdNum,
          cartaoRes.cartaoId,
        ],
      );
      insertedTransactions.push(result.rows[0]);
    }
    await client.query("COMMIT");
    res.status(201).json({
      message: "Compra parcelada registrada com sucesso!",
      transacoes: insertedTransactions,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.editarTransacao = async (req, res, next) => {
  const { id } = req.params;
  const { descricao, valor, tipo, data, categoria_id } = req.body;
  const userId = req.user.userId;

  const transacaoId = parseInt(id);
  if (isNaN(transacaoId)) {
    return res.status(400).json({ error: "ID de transação inválido." });
  }

  if (!descricao || valor === undefined || !tipo || !data) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res.status(400).json({ error: "O valor deve ser um número positivo." });
  }

  if (tipo !== "receita" && tipo !== "despesa") {
    return res.status(400).json({ error: "Tipo de transação inválido." });
  }

  if (!isValidDateString(data)) {
    return res.status(400).json({ error: "Formato de data inválido." });
  }

  let finalCategoriaId = null;
  if (tipo === "despesa") {
    if (!categoria_id) {
      return res.status(400).json({ error: "Categoria é obrigatória para despesas." });
    }
    const catIdNum = parseInt(categoria_id);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    // Estado atual (isolado por usuário) para validar consistência com faturas de cartão
    const atualRes = await pool.query(
      "SELECT valor, tipo, data::text AS data, cartao_id FROM transacoes WHERE id = $1 AND user_id = $2",
      [transacaoId, userId],
    );
    if (atualRes.rowCount === 0) {
      return res.status(404).json({ error: "Transação não encontrada ou não autorizada." });
    }
    const atual = atualRes.rows[0];

    // cartao_id ausente no corpo mantém o vínculo atual; null/"" remove; id vincula.
    const cartaoInformado = Object.prototype.hasOwnProperty.call(req.body, "cartao_id");
    const cartaoRes = cartaoInformado
      ? await resolverCartao(pool, userId, tipo, req.body.cartao_id)
      : { cartaoId: tipo === "despesa" ? atual.cartao_id : null, cartao: null };
    if (cartaoRes.error) return res.status(cartaoRes.status).json({ error: cartaoRes.error });

    // Transação em fatura paga não pode ter valor, data, tipo ou cartão alterados.
    if (atual.cartao_id) {
      const cartaoAtual = await obterCartao(atual.cartao_id, userId, pool);
      const mudouFinanceiro =
        Math.round(Number(atual.valor) * 100) !== Math.round(numValor * 100) ||
        atual.data.slice(0, 10) !== data ||
        atual.tipo !== tipo ||
        atual.cartao_id !== cartaoRes.cartaoId;
      if (cartaoAtual && mudouFinanceiro && (await faturaPaga(pool, userId, cartaoAtual, atual.data))) {
        return res.status(409).json({ error: MSG_FATURA_PAGA });
      }
    }
    if (cartaoRes.cartaoId && cartaoRes.cartaoId !== atual.cartao_id) {
      const novo = cartaoRes.cartao || (await obterCartao(cartaoRes.cartaoId, userId, pool));
      if (novo && (await faturaPaga(pool, userId, novo, data))) {
        return res.status(409).json({
          error: "A fatura deste cartão referente a esta data já está paga. Estorne o pagamento antes.",
        });
      }
    } else if (cartaoRes.cartaoId && cartaoRes.cartaoId === atual.cartao_id && atual.data.slice(0, 10) !== data) {
      const mesmo = await obterCartao(cartaoRes.cartaoId, userId, pool);
      if (mesmo && (await faturaPaga(pool, userId, mesmo, data))) {
        return res.status(409).json({
          error: "A nova data cai em uma fatura de cartão já paga. Estorne o pagamento antes.",
        });
      }
    }

    const limparCartaoExcluido =
      tipo !== "despesa" ||
      Boolean(cartaoRes.cartaoId) ||
      req.body.limpar_cartao_excluido === true;

    // 1. UPDATE estritamente isolado pelo user_id autenticado
    const updateResult = await pool.query(
      `UPDATE transacoes 
       SET descricao = $1, valor = $2, tipo = $3, data = $4, categoria_id = $5, cartao_id = $6,
           cartao_excluido_nome = CASE WHEN $7::boolean THEN NULL ELSE cartao_excluido_nome END
       WHERE id = $8 AND user_id = $9 
       RETURNING id`,
      [
        descricao.toString().trim().substring(0, 150),
        numValor,
        tipo,
        data,
        finalCategoriaId,
        cartaoRes.cartaoId,
        limparCartaoExcluido,
        transacaoId,
        userId,
      ],
    );

    // Se nenhuma linha foi afetada, a transação não existe ou pertence a outro usuário
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Transação não encontrada ou não autorizada." });
    }

    // 2. Consulta de retorno COM FILTRO OBRIGATÓRIO DE USER_ID (Elimina falha BOLA / IDOR)
    const updatedResult = await pool.query(
      `SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, t.categoria_id, c.nome as categoria_nome, c.cor as categoria_cor,
              t.cartao_id, ca.nome as cartao_nome, t.cartao_excluido_nome
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id
       LEFT JOIN cartoes ca ON t.cartao_id = ca.id AND ca.user_id = t.user_id
       WHERE t.id = $1 AND t.user_id = $2`,
      [transacaoId, userId],
    );

    res.json(updatedResult.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deletarTransacao = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const transacaoId = parseInt(id);
  if (isNaN(transacaoId)) {
    return res.status(400).json({ error: "ID de transação inválido." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Transação de cartão em fatura já paga não pode ser removida sem estornar a fatura.
    const txRes = await client.query(
      "SELECT cartao_id, data::text AS data FROM transacoes WHERE id = $1 AND user_id = $2",
      [transacaoId, userId],
    );
    if (txRes.rows[0] && txRes.rows[0].cartao_id) {
      const cartao = await obterCartao(txRes.rows[0].cartao_id, userId, client);
      if (cartao && (await faturaPaga(client, userId, cartao, txRes.rows[0].data))) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: MSG_FATURA_PAGA });
      }
    }

    const amortRes = await client.query(
      "DELETE FROM dividas_amortizacoes WHERE transacao_id = $1 AND user_id = $2 RETURNING *",
      [transacaoId, userId],
    );
    for (const amort of amortRes.rows) {
      await reverterAmortizacaoNoBanco(client, amort, userId);
    }

    const result = await client.query(
      "DELETE FROM transacoes WHERE id = $1 AND user_id = $2 RETURNING id",
      [transacaoId, userId],
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Transação não encontrada ou você não tem permissão para deletá-la.",
      });
    }

    await client.query("COMMIT");
    res.status(204).send();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.obterComparativo = async (req, res, next) => {
  const userId = req.user.userId;
  const { dataInicio, dataFim } = req.query;

  let queryReceitas =
    "SELECT SUM(valor) AS total_receitas FROM transacoes WHERE user_id = $1 AND tipo = 'receita'";
  let queryDespesas =
    "SELECT SUM(valor) AS total_despesas FROM transacoes WHERE user_id = $1 AND tipo = 'despesa'";
  let queryCategorias = `
    SELECT c.nome, c.cor, SUM(t.valor) as total
    FROM transacoes t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE t.user_id = $1 AND t.tipo = 'despesa'
  `;

  const params = [userId];
  let paramIndex = 2;

  if (dataInicio && dataFim && isValidDateString(dataInicio) && isValidDateString(dataFim)) {
    const dateFilter = ` AND data BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    queryReceitas += dateFilter;
    queryDespesas += dateFilter;
    queryCategorias += dateFilter;
    params.push(dataInicio, dataFim);
  }

  queryCategorias += " GROUP BY c.nome, c.cor";

  try {
    const receitasResult = await pool.query(queryReceitas, params);
    const despesasResult = await pool.query(queryDespesas, params);
    const categoriasResult = await pool.query(queryCategorias, params);

    const totalReceitas = parseFloat(receitasResult.rows[0].total_receitas || 0);
    const totalDespesas = parseFloat(despesasResult.rows[0].total_despesas || 0);
    const balanco = totalReceitas - totalDespesas;

    res.json({
      totalReceitas: totalReceitas.toFixed(2),
      totalDespesas: totalDespesas.toFixed(2),
      balanco: balanco.toFixed(2),
      gastosPorCategoria: categoriasResult.rows.map((row) => ({
        name: row.nome,
        value: parseFloat(row.total),
        cor: row.cor || "#10b981",
      })),
    });
  } catch (err) {
    next(err);
  }
};
