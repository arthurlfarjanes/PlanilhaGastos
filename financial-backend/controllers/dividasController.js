const pool = require("../config/db");
const { toCents, fromCents, todayISO } = require("../utils/contasFixas");
const {
  enrichDivida,
  calcularResumoDividas,
  simularAmortizacao,
} = require("../utils/dividas");

const TIPOS_VALIDOS = ["emprestimo", "financiamento", "cartao_parcelado", "outro"];
const STATUS_VALIDOS = ["ativa", "quitada", "pausada"];
const AMORT_TIPOS = ["parcela", "amortizacao_extra", "quitacao"];
const isValidDateISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

exports.listarDividas = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT d.*, c.nome AS categoria_nome, c.cor AS categoria_cor
       FROM dividas d
       LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE d.user_id = $1
       ORDER BY (d.status = 'ativa') DESC, d.taxa_juros_mensal DESC, d.id DESC`,
      [userId],
    );

    const itens = result.rows.map(enrichDivida);
    const resumo = calcularResumoDividas(itens);
    res.json({ resumo, itens });
  } catch (err) {
    next(err);
  }
};

exports.criarDivida = async (req, res, next) => {
  const userId = req.user.userId;
  const {
    nome,
    credor = "",
    tipo = "emprestimo",
    valor_original,
    saldo_devedor,
    taxa_juros_mensal = 0,
    total_parcelas = null,
    parcelas_pagas = 0,
    valor_parcela = null,
    dia_vencimento = null,
    categoria_id = null,
    observacoes = "",
  } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome da dívida é obrigatório." });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de dívida inválido." });
  }

  const origCents = toCents(valor_original);
  if (origCents <= 0) {
    return res.status(400).json({ error: "O valor original deve ser positivo." });
  }

  const saldoCents =
    saldo_devedor !== undefined && saldo_devedor !== null && saldo_devedor !== ""
      ? toCents(saldo_devedor)
      : origCents;
  if (saldoCents < 0) {
    return res.status(400).json({ error: "O saldo devedor não pode ser negativo." });
  }

  const taxaNum = Number(taxa_juros_mensal || 0);
  if (!Number.isFinite(taxaNum) || taxaNum < 0) {
    return res.status(400).json({ error: "A taxa de juros mensal deve ser >= 0." });
  }

  const totParc = total_parcelas ? parseInt(total_parcelas, 10) : null;
  if (totParc !== null && (isNaN(totParc) || totParc < 1)) {
    return res.status(400).json({ error: "Total de parcelas inválido." });
  }

  const parcPagas = parseInt(parcelas_pagas || 0, 10);
  if (isNaN(parcPagas) || parcPagas < 0) {
    return res.status(400).json({ error: "Parcelas pagas inválido." });
  }

  const parcCents =
    valor_parcela !== undefined && valor_parcela !== null && valor_parcela !== ""
      ? toCents(valor_parcela)
      : null;
  if (parcCents !== null && parcCents <= 0) {
    return res.status(400).json({ error: "O valor da parcela deve ser positivo." });
  }

  const diaVenc = dia_vencimento ? parseInt(dia_vencimento, 10) : null;
  if (diaVenc !== null && (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31)) {
    return res.status(400).json({ error: "Dia de vencimento deve estar entre 1 e 31." });
  }

  let finalCatId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id, 10);
    if (isNaN(catIdNum)) return res.status(400).json({ error: "Categoria inválida." });
    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCatId = catIdNum;
  }

  const statusInicial = saldoCents === 0 ? "quitada" : "ativa";

  try {
    const result = await pool.query(
      `INSERT INTO dividas (
         user_id, nome, credor, tipo, valor_original, saldo_devedor,
         taxa_juros_mensal, total_parcelas, parcelas_pagas, valor_parcela,
         dia_vencimento, categoria_id, status, observacoes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        userId,
        nome.trim().substring(0, 120),
        String(credor || "").trim().substring(0, 120),
        tipo,
        fromCents(origCents),
        fromCents(saldoCents),
        Number(taxaNum.toFixed(3)),
        totParc,
        parcPagas,
        parcCents !== null ? fromCents(parcCents) : null,
        diaVenc,
        finalCatId,
        statusInicial,
        String(observacoes || "").trim().substring(0, 1000),
      ],
    );

    res.status(201).json(enrichDivida(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.atualizarDivida = async (req, res, next) => {
  const userId = req.user.userId;
  const dividaId = parseInt(req.params.id, 10);
  if (isNaN(dividaId)) return res.status(400).json({ error: "ID de dívida inválido." });

  const {
    nome,
    credor,
    tipo,
    valor_original,
    saldo_devedor,
    taxa_juros_mensal,
    total_parcelas,
    parcelas_pagas,
    valor_parcela,
    dia_vencimento,
    categoria_id,
    status,
    observacoes,
  } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome da dívida é obrigatório." });
  }
  if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de dívida inválido." });
  }
  if (status && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  let finalCatId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id, 10);
    if (isNaN(catIdNum)) return res.status(400).json({ error: "Categoria inválida." });
    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCatId = catIdNum;
  }

  const origCents =
    valor_original !== undefined && valor_original !== null && valor_original !== ""
      ? toCents(valor_original)
      : null;
  if (origCents !== null && origCents <= 0) {
    return res.status(400).json({ error: "O valor original deve ser positivo." });
  }

  const saldoCents =
    saldo_devedor !== undefined && saldo_devedor !== null && saldo_devedor !== ""
      ? toCents(saldo_devedor)
      : null;
  if (saldoCents !== null && saldoCents < 0) {
    return res.status(400).json({ error: "O saldo devedor não pode ser negativo." });
  }

  const parcPagas =
    parcelas_pagas !== undefined && parcelas_pagas !== null && parcelas_pagas !== ""
      ? parseInt(parcelas_pagas, 10)
      : null;
  if (parcPagas !== null && (isNaN(parcPagas) || parcPagas < 0)) {
    return res.status(400).json({ error: "Parcelas pagas inválido." });
  }

  const taxaNum =
    taxa_juros_mensal !== undefined ? Number(taxa_juros_mensal) : null;
  if (taxaNum !== null && (!Number.isFinite(taxaNum) || taxaNum < 0)) {
    return res.status(400).json({ error: "Taxa de juros inválida." });
  }

  const parcCents =
    valor_parcela !== undefined && valor_parcela !== null && valor_parcela !== ""
      ? toCents(valor_parcela)
      : null;

  const totParc = total_parcelas ? parseInt(total_parcelas, 10) : null;
  const diaVenc = dia_vencimento ? parseInt(dia_vencimento, 10) : null;

  const statusFinal =
    saldoCents === 0 && status !== "pausada"
      ? "quitada"
      : status || null;

  try {
    const result = await pool.query(
      `UPDATE dividas
       SET nome = $1,
           credor = COALESCE($2, credor),
           tipo = COALESCE($3, tipo),
           valor_original = COALESCE($4, valor_original),
           saldo_devedor = COALESCE($5, saldo_devedor),
           parcelas_pagas = COALESCE($6, parcelas_pagas),
           taxa_juros_mensal = COALESCE($7, taxa_juros_mensal),
           total_parcelas = $8,
           valor_parcela = $9,
           dia_vencimento = $10,
           categoria_id = $11,
           status = COALESCE($12, status),
           observacoes = COALESCE($13, observacoes),
           updated_at = NOW()
       WHERE id = $14 AND user_id = $15
       RETURNING *`,
      [
        nome.trim().substring(0, 120),
        credor !== undefined ? String(credor).trim().substring(0, 120) : null,
        tipo || null,
        origCents !== null ? fromCents(origCents) : null,
        saldoCents !== null ? fromCents(saldoCents) : null,
        parcPagas,
        taxaNum !== null ? Number(taxaNum.toFixed(3)) : null,
        totParc,
        parcCents !== null ? fromCents(parcCents) : null,
        diaVenc,
        finalCatId,
        statusFinal,
        observacoes !== undefined ? String(observacoes).trim().substring(0, 1000) : null,
        dividaId,
        userId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Dívida não encontrada." });
    }

    res.json(enrichDivida(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.deletarDivida = async (req, res, next) => {
  const userId = req.user.userId;
  const dividaId = parseInt(req.params.id, 10);
  if (isNaN(dividaId)) return res.status(400).json({ error: "ID de dívida inválido." });

  try {
    const result = await pool.query(
      "DELETE FROM dividas WHERE id = $1 AND user_id = $2 RETURNING id",
      [dividaId, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Dívida não encontrada." });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.listarAmortizacoes = async (req, res, next) => {
  const userId = req.user.userId;
  const dividaId = parseInt(req.params.id, 10);
  if (isNaN(dividaId)) return res.status(400).json({ error: "ID de dívida inválido." });

  try {
    const check = await pool.query(
      "SELECT id FROM dividas WHERE id = $1 AND user_id = $2",
      [dividaId, userId],
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Dívida não encontrada." });
    }

    const result = await pool.query(
      `SELECT id, divida_id, tipo, valor_pago, valor_juros, valor_amortizado,
              data_pagamento, transacao_id, observacao, created_at
       FROM dividas_amortizacoes
       WHERE divida_id = $1 AND user_id = $2
       ORDER BY data_pagamento DESC, id DESC`,
      [dividaId, userId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.registrarAmortizacao = async (req, res, next) => {
  const userId = req.user.userId;
  const dividaId = parseInt(req.params.id, 10);
  if (isNaN(dividaId)) return res.status(400).json({ error: "ID de dívida inválido." });

  const {
    tipo = "parcela",
    valor_pago,
    valor_juros = 0,
    data_pagamento,
    lancar_transacao = true,
    observacao = "",
  } = req.body || {};

  if (!AMORT_TIPOS.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de amortização inválido." });
  }

  const pagoCents = toCents(valor_pago);
  const jurosCents = Math.max(0, toCents(valor_juros));
  if (pagoCents <= 0) {
    return res.status(400).json({ error: "O valor pago deve ser positivo." });
  }
  if (jurosCents > pagoCents) {
    return res.status(400).json({ error: "Os juros não podem exceder o valor pago." });
  }

  const dataPgto = isValidDateISO(data_pagamento) ? data_pagamento : todayISO();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const divRes = await client.query(
      "SELECT * FROM dividas WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [dividaId, userId],
    );
    if (divRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Dívida não encontrada." });
    }
    const divida = divRes.rows[0];
    const saldoAtualCents = toCents(divida.saldo_devedor);

    if (saldoAtualCents === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Esta dívida já está quitada." });
    }

    const amortizadoBrutoCents = pagoCents - jurosCents;
    const amortizadoEfetivoCents = Math.min(saldoAtualCents, amortizadoBrutoCents);
    const novoSaldoCents = saldoAtualCents - amortizadoEfetivoCents;
    const novoStatus = novoSaldoCents === 0 ? "quitada" : "ativa";
    const incParcela = tipo === "parcela" ? 1 : 0;

    let transacaoId = null;
    if (lancar_transacao) {
      const descTx = `${tipo === "amortizacao_extra" ? "Amortização" : tipo === "quitacao" ? "Quitação" : "Parcela"} - ${divida.nome}`.substring(0, 100);
      const txRes = await client.query(
        `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
         VALUES ($1, $2, $3, 'despesa', $4, $5)
         RETURNING id`,
        [userId, descTx, fromCents(pagoCents), dataPgto, divida.categoria_id],
      );
      transacaoId = txRes.rows[0].id;
    }

    const amortRes = await client.query(
      `INSERT INTO dividas_amortizacoes (
         divida_id, user_id, tipo, valor_pago, valor_juros, valor_amortizado,
         data_pagamento, transacao_id, observacao
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        dividaId,
        userId,
        tipo,
        fromCents(pagoCents),
        fromCents(jurosCents),
        fromCents(amortizadoEfetivoCents),
        dataPgto,
        transacaoId,
        String(observacao || "").trim().substring(0, 200),
      ],
    );

    const divUpd = await client.query(
      `UPDATE dividas
       SET saldo_devedor = $1,
           parcelas_pagas = parcelas_pagas + $2,
           status = $3,
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [fromCents(novoSaldoCents), incParcela, novoStatus, dividaId, userId],
    );

    await client.query("COMMIT");
    res.status(201).json({
      amortizacao: amortRes.rows[0],
      divida: enrichDivida(divUpd.rows[0]),
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

async function reverterAmortizacaoNoBanco(client, amort, userId) {
  const divRes = await client.query(
    "SELECT * FROM dividas WHERE id = $1 AND user_id = $2 FOR UPDATE",
    [amort.divida_id, userId],
  );
  if (divRes.rows.length > 0) {
    const divida = divRes.rows[0];
    const tetoSaldoCents = Math.max(
      toCents(divida.valor_original),
      toCents(divida.saldo_devedor),
    );
    const saldoRestauradoCents = Math.min(
      tetoSaldoCents,
      toCents(divida.saldo_devedor) + toCents(amort.valor_amortizado),
    );
    const decParcela = amort.tipo === "parcela" && divida.parcelas_pagas > 0 ? 1 : 0;
    const novoStatus = saldoRestauradoCents > 0 ? "ativa" : "quitada";

    await client.query(
      `UPDATE dividas
       SET saldo_devedor = $1,
           parcelas_pagas = GREATEST(0, parcelas_pagas - $2),
           status = $3,
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [fromCents(saldoRestauradoCents), decParcela, novoStatus, amort.divida_id, userId],
    );
  }
}

exports.reverterAmortizacaoNoBanco = reverterAmortizacaoNoBanco;

exports.estornarAmortizacao = async (req, res, next) => {
  const userId = req.user.userId;
  const dividaId = parseInt(req.params.id, 10);
  const amortId = parseInt(req.params.amortId, 10);
  if (isNaN(dividaId) || isNaN(amortId)) {
    return res.status(400).json({ error: "Identificador inválido." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const delRes = await client.query(
      `DELETE FROM dividas_amortizacoes
       WHERE id = $1 AND divida_id = $2 AND user_id = $3
       RETURNING *`,
      [amortId, dividaId, userId],
    );
    if (delRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Amortização não encontrada." });
    }
    const amort = delRes.rows[0];

    await reverterAmortizacaoNoBanco(client, amort, userId);

    if (amort.transacao_id) {
      await client.query(
        "DELETE FROM transacoes WHERE id = $1 AND user_id = $2",
        [amort.transacao_id, userId],
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

exports.simularAmortizacaoDivida = async (req, res, next) => {
  const userId = req.user.userId;
  const dividaId = parseInt(req.params.id, 10);
  if (isNaN(dividaId)) return res.status(400).json({ error: "ID de dívida inválido." });

  const { aporte_extra = 0, valor_parcela } = req.body || {};

  try {
    const divRes = await pool.query(
      "SELECT * FROM dividas WHERE id = $1 AND user_id = $2",
      [dividaId, userId],
    );
    if (divRes.rows.length === 0) {
      return res.status(404).json({ error: "Dívida não encontrada." });
    }
    const divida = divRes.rows[0];

    const parcelaSimulacao =
      valor_parcela !== undefined && valor_parcela !== null && valor_parcela !== ""
        ? valor_parcela
        : divida.valor_parcela;

    const resultado = simularAmortizacao({
      saldo_devedor: divida.saldo_devedor,
      taxa_juros_mensal: divida.taxa_juros_mensal,
      valor_parcela: parcelaSimulacao,
      aporte_extra,
    });

    if (resultado.error) {
      return res.status(400).json({ error: resultado.error });
    }

    res.json(resultado);
  } catch (err) {
    next(err);
  }
};

