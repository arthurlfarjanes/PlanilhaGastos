const pool = require("../config/db");

exports.listarTransacoes = async (req, res) => {
  const userId = req.user.userId;
  const { tipo, categoriaId, dataInicio, dataFim, descricao } = req.query;

  let query = `
    SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, t.categoria_id, c.nome as categoria_nome, c.cor as categoria_cor
    FROM transacoes t
    LEFT JOIN categorias c ON t.categoria_id = c.id
    WHERE t.user_id = $1
  `;
  const params = [userId];
  let paramIndex = 2;

  if (tipo) {
    query += ` AND t.tipo = $${paramIndex++}`;
    params.push(tipo);
  }
  if (categoriaId) {
    query += ` AND t.categoria_id = $${paramIndex++}`;
    params.push(categoriaId);
  }
  if (dataInicio) {
    query += ` AND t.data >= $${paramIndex++}`;
    params.push(dataInicio);
  }
  if (dataFim) {
    query += ` AND t.data <= $${paramIndex++}`;
    params.push(dataFim);
  }
  if (descricao) {
    query += ` AND t.descricao ILIKE $${paramIndex++}`;
    params.push(`%${descricao}%`);
  }

  query += " ORDER BY t.data DESC, t.id DESC";

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar transações:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

exports.criarTransacao = async (req, res) => {
  const { descricao, valor, tipo, data, categoria_id } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !tipo || !data) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  if (tipo === "despesa" && !categoria_id) {
    return res
      .status(400)
      .json({ error: "Categoria é obrigatória para despesas." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        userId,
        descricao,
        parseFloat(valor),
        tipo,
        data,
        tipo === "despesa" ? categoria_id : null,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao adicionar transação:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

exports.criarTransacaoParcelada = async (req, res) => {
  const { descricao, valor, categoria_id, data, parcelas } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !categoria_id || !data || !parcelas) {
    return res
      .status(400)
      .json({
        error: "Todos os campos são obrigatórios para compra parcelada.",
      });
  }
  if (isNaN(parseInt(parcelas)) || parseInt(parcelas) <= 1) {
    return res
      .status(400)
      .json({ error: "O número de parcelas deve ser maior que 1." });
  }

  const valorParcela = parseFloat(valor) / parseInt(parcelas);
  const dataInicial = new Date(data + "T00:00:00Z");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertedTransactions = [];
    for (let i = 1; i <= parcelas; i++) {
      const dataParcela = new Date(dataInicial);
      dataParcela.setUTCMonth(dataInicial.getUTCMonth() + (i - 1));
      const descricaoParcela = `${descricao} (${i}/${parcelas})`;

      const result = await client.query(
        "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          userId,
          descricaoParcela,
          valorParcela.toFixed(2),
          "despesa",
          dataParcela.toISOString().split("T")[0],
          categoria_id,
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
    await client.query("ROLLBACK");
    console.error("Erro ao adicionar compra parcelada:", err);
    res
      .status(500)
      .json({
        error: "Erro interno do servidor ao adicionar compra parcelada.",
      });
  } finally {
    client.release();
  }
};

exports.editarTransacao = async (req, res) => {
  const { id } = req.params;
  const { descricao, valor, tipo, data, categoria_id } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !tipo || !data) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    await pool.query(
      `UPDATE transacoes SET descricao = $1, valor = $2, tipo = $3, data = $4, categoria_id = $5 WHERE id = $6 AND user_id = $7`,
      [
        descricao,
        parseFloat(valor),
        tipo,
        data,
        tipo === "despesa" ? categoria_id : null,
        id,
        userId,
      ],
    );

    const updatedResult = await pool.query(
      `SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, t.categoria_id, c.nome as categoria_nome, c.cor as categoria_cor
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id
       WHERE t.id = $1`,
      [id],
    );

    if (updatedResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Transação não encontrada ou não autorizada." });
    }
    res.json(updatedResult.rows[0]);
  } catch (err) {
    console.error("Erro ao editar transação:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao editar transação." });
  }
};

exports.deletarTransacao = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      "DELETE FROM transacoes WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        error:
          "Transação não encontrada ou você não tem permissão para deletá-la.",
      });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Erro ao deletar transação:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

exports.obterComparativo = async (req, res) => {
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

  if (dataInicio && dataFim) {
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

    const totalReceitas = parseFloat(
      receitasResult.rows[0].total_receitas || 0,
    );
    const totalDespesas = parseFloat(
      despesasResult.rows[0].total_despesas || 0,
    );
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
    console.error("Erro ao obter comparativo:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao obter comparativo." });
  }
};
