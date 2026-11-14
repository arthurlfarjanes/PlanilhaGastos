const pool = require("../config/db");
const {
  todayISO,
  parseCompetencia,
  enrichContaCompetencia,
  calcularResumoContas,
} = require("../utils/contasFixas");

const isValidDateISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function fetchContasComPagamento(userId, ano, mes) {
  const query = `
    SELECT gf.id, gf.descricao, gf.valor, gf.dia_vencimento, gf.categoria_id, gf.tipo,
           gf.is_assinatura, gf.ativo, gf.gerar_automatico,
           c.nome AS categoria_nome, c.cor AS categoria_cor,
           gfp.id AS pagamento_id, gfp.valor_pago, gfp.data_pagamento, gfp.transacao_id
    FROM gastos_fixos gf
    LEFT JOIN categorias c ON gf.categoria_id = c.id
    LEFT JOIN gastos_fixos_pagamentos gfp
      ON gfp.gasto_fixo_id = gf.id
     AND gfp.competencia_ano = $2
     AND gfp.competencia_mes = $3
    WHERE gf.usuario_id = $1
    ORDER BY gf.ativo DESC, gf.dia_vencimento ASC, gf.id ASC;
  `;
  const result = await pool.query(query, [userId, ano, mes]);
  const refHoje = todayISO();
  return result.rows.map((row) => enrichContaCompetencia(row, ano, mes, refHoje));
}

exports.criarGastoFixo = async (req, res, next) => {
  const {
    descricao,
    valor,
    dia_vencimento,
    categoria_id,
    tipo,
    is_assinatura = false,
    ativo = true,
    gerar_automatico = true,
  } = req.body;
  const userId = req.user.userId;

  if (!descricao || valor === undefined || dia_vencimento === undefined) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  const tipoTransacao = tipo === "receita" ? "receita" : "despesa";

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res
      .status(400)
      .json({ error: "O valor deve ser um número positivo." });
  }

  const diaVenc = parseInt(dia_vencimento, 10);
  if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
    return res
      .status(400)
      .json({ error: "O dia de vencimento deve estar entre 1 e 31." });
  }

  let finalCategoriaId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id, 10);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    const query = `
      INSERT INTO gastos_fixos
        (usuario_id, descricao, valor, dia_vencimento, categoria_id, tipo, is_assinatura, ativo, gerar_automatico)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const valores = [
      userId,
      descricao.toString().trim().substring(0, 100),
      Number(numValor.toFixed(2)),
      diaVenc,
      finalCategoriaId,
      tipoTransacao,
      Boolean(is_assinatura),
      Boolean(ativo),
      Boolean(gerar_automatico),
    ];

    const result = await pool.query(query, valores);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.listarGastosFixos = async (req, res, next) => {
  const userId = req.user.userId;
  const { ano, mes } = parseCompetencia(req.query);

  try {
    const itens = await fetchContasComPagamento(userId, ano, mes);
    res.json(itens);
  } catch (err) {
    next(err);
  }
};

exports.resumoGastosFixos = async (req, res, next) => {
  const userId = req.user.userId;
  const { ano, mes } = parseCompetencia(req.query);

  try {
    const itens = await fetchContasComPagamento(userId, ano, mes);
    const resumo = calcularResumoContas(itens);
    res.json({
      competencia_ano: ano,
      competencia_mes: mes,
      ...resumo,
    });
  } catch (err) {
    next(err);
  }
};

exports.deletarGastoFixo = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const gastoId = parseInt(id, 10);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de transação fixa inválido." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM gastos_fixos WHERE id = $1 AND usuario_id = $2 RETURNING id",
      [gastoId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Transação fixa não encontrada ou sem permissão para excluir.",
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.atualizarGastoFixo = async (req, res, next) => {
  const { id } = req.params;
  const {
    descricao,
    valor,
    dia_vencimento,
    categoria_id,
    tipo,
    is_assinatura,
    ativo,
    gerar_automatico,
  } = req.body;
  const userId = req.user.userId;

  const gastoId = parseInt(id, 10);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de transação fixa inválido." });
  }

  if (!descricao || valor === undefined || dia_vencimento === undefined) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  const tipoTransacao = tipo === "receita" ? "receita" : "despesa";

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res
      .status(400)
      .json({ error: "O valor deve ser um número positivo." });
  }

  const diaVenc = parseInt(dia_vencimento, 10);
  if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
    return res
      .status(400)
      .json({ error: "O dia de vencimento deve estar entre 1 e 31." });
  }

  let finalCategoriaId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id, 10);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    const query = `
      UPDATE gastos_fixos
      SET descricao = $1,
          valor = $2,
          dia_vencimento = $3,
          categoria_id = $4,
          tipo = $5,
          is_assinatura = COALESCE($6, is_assinatura),
          ativo = COALESCE($7, ativo),
          gerar_automatico = COALESCE($8, gerar_automatico)
      WHERE id = $9 AND usuario_id = $10
      RETURNING *;
    `;
    const valores = [
      descricao.toString().trim().substring(0, 100),
      Number(numValor.toFixed(2)),
      diaVenc,
      finalCategoriaId,
      tipoTransacao,
      typeof is_assinatura === "boolean" ? is_assinatura : null,
      typeof ativo === "boolean" ? ativo : null,
      typeof gerar_automatico === "boolean" ? gerar_automatico : null,
      gastoId,
      userId,
    ];

    const result = await pool.query(query, valores);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Transação fixa não encontrada ou sem permissão para editar.",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.marcarComoPago = async (req, res, next) => {
  const userId = req.user.userId;
  const gastoId = parseInt(req.params.id, 10);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de transação fixa inválido." });
  }

  const { ano, mes } = parseCompetencia(req.body);
  const {
    valor_pago,
    data_pagamento,
    lancar_transacao = true,
  } = req.body || {};

  const dataPgto = isValidDateISO(data_pagamento) ? data_pagamento : todayISO();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const gfRes = await client.query(
      "SELECT * FROM gastos_fixos WHERE id = $1 AND usuario_id = $2 FOR UPDATE",
      [gastoId, userId],
    );
    if (gfRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Conta ou recorrência não encontrada." });
    }
    const gasto = gfRes.rows[0];

    const valorFinal =
      valor_pago !== undefined && valor_pago !== null && valor_pago !== ""
        ? parseFloat(valor_pago)
        : parseFloat(gasto.valor);
    if (isNaN(valorFinal) || valorFinal <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "O valor pago deve ser positivo." });
    }

    const existente = await client.query(
      `SELECT id FROM gastos_fixos_pagamentos
       WHERE gasto_fixo_id = $1 AND competencia_ano = $2 AND competencia_mes = $3`,
      [gastoId, ano, mes],
    );
    if (existente.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Esta conta já foi marcada como paga nesta competência.",
      });
    }

    let transacaoId = null;
    if (lancar_transacao) {
      const transRes = await client.query(
        `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          userId,
          gasto.descricao,
          Number(valorFinal.toFixed(2)),
          gasto.tipo || "despesa",
          dataPgto,
          gasto.categoria_id,
        ],
      );
      transacaoId = transRes.rows[0].id;
    }

    const pgtoRes = await client.query(
      `INSERT INTO gastos_fixos_pagamentos
         (gasto_fixo_id, usuario_id, competencia_ano, competencia_mes, valor_pago, data_pagamento, transacao_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [gastoId, userId, ano, mes, Number(valorFinal.toFixed(2)), dataPgto, transacaoId],
    );

    await client.query("COMMIT");
    res.status(201).json(pgtoRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.desfazerPagamento = async (req, res, next) => {
  const userId = req.user.userId;
  const gastoId = parseInt(req.params.id, 10);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de transação fixa inválido." });
  }

  const { ano, mes } = parseCompetencia({
    ano: req.query.ano ?? req.body?.ano,
    mes: req.query.mes ?? req.body?.mes,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const delPgto = await client.query(
      `DELETE FROM gastos_fixos_pagamentos
       WHERE gasto_fixo_id = $1 AND usuario_id = $2
         AND competencia_ano = $3 AND competencia_mes = $4
       RETURNING id, transacao_id`,
      [gastoId, userId, ano, mes],
    );

    if (delPgto.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Pagamento não encontrado para esta competência.",
      });
    }

    const transacaoId = delPgto.rows[0].transacao_id;
    if (transacaoId) {
      await client.query(
        "DELETE FROM transacoes WHERE id = $1 AND user_id = $2",
        [transacaoId, userId],
      );
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
