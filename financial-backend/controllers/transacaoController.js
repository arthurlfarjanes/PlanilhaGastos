const pool = require("../config/db");

// Função auxiliar para escapar caracteres especiais de LIKE/ILIKE no PostgreSQL
const escapeLikeString = (str) => {
  return str.replace(/([%_\\])/g, "\\$1");
};

// Validação de formato de data YYYY-MM-DD
const isValidDateString = (dateStr) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

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

  query += " ORDER BY t.data DESC, t.id DESC";

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar transações:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao buscar transações." });
  }
};

exports.criarTransacao = async (req, res) => {
  const { descricao, valor, tipo, data, categoria_id } = req.body;
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
    const result = await pool.query(
      "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        userId,
        descricao.toString().trim().substring(0, 150),
        numValor,
        tipo,
        data,
        finalCategoriaId,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao adicionar transação:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao adicionar transação." });
  }
};

exports.criarTransacaoParcelada = async (req, res) => {
  const { descricao, valor, categoria_id, data, parcelas } = req.body;
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
    await client.query("BEGIN");
    const insertedTransactions = [];
    for (let i = 1; i <= numParcelas; i++) {
      const dataParcela = new Date(dataInicial);
      dataParcela.setUTCMonth(dataInicial.getUTCMonth() + (i - 1));
      const descricaoParcela = `${cleanDescricao} (${i}/${numParcelas})`;

      const result = await client.query(
        "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          userId,
          descricaoParcela,
          valorParcela,
          "despesa",
          dataParcela.toISOString().split("T")[0],
          catIdNum,
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
    console.error("Erro ao adicionar compra parcelada:", err.message);
    res.status(500).json({
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
    // 1. UPDATE estritamente isolado pelo user_id autenticado
    const updateResult = await pool.query(
      `UPDATE transacoes 
       SET descricao = $1, valor = $2, tipo = $3, data = $4, categoria_id = $5 
       WHERE id = $6 AND user_id = $7 
       RETURNING id`,
      [
        descricao.toString().trim().substring(0, 150),
        numValor,
        tipo,
        data,
        finalCategoriaId,
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
      `SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, t.categoria_id, c.nome as categoria_nome, c.cor as categoria_cor
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [transacaoId, userId],
    );

    res.json(updatedResult.rows[0]);
  } catch (err) {
    console.error("Erro ao editar transação:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao editar transação." });
  }
};

exports.deletarTransacao = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const transacaoId = parseInt(id);
  if (isNaN(transacaoId)) {
    return res.status(400).json({ error: "ID de transação inválido." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM transacoes WHERE id = $1 AND user_id = $2 RETURNING id",
      [transacaoId, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Transação não encontrada ou você não tem permissão para deletá-la.",
      });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Erro ao deletar transação:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao deletar transação." });
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
    console.error("Erro ao obter comparativo:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao obter comparativo." });
  }
};
