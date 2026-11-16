const pool = require("../config/db");
const { toCents, fromCents, todayISO } = require("../utils/contasFixas");
const {
  CATEGORIAS_OBJETIVO,
  PRIORIDADES_OBJETIVO,
  STATUS_OBJETIVO,
  enrichObjetivo,
  calcularResumoObjetivos,
} = require("../utils/objetivos");

const CONTRIB_TIPOS = ["aporte", "resgate"];
const isValidDateISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function parseId(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Reverte uma contribuição de objetivo no banco (usado tanto no estorno direto
 * quanto ao excluir a transação vinculada em /transacoes/:id).
 */
async function reverterContribuicaoNoBanco(client, contrib, userId) {
  const objRes = await client.query(
    "SELECT * FROM objetivos WHERE id = $1 AND user_id = $2 FOR UPDATE",
    [contrib.objetivo_id, userId],
  );
  if (objRes.rowCount === 0) return;

  const obj = objRes.rows[0];
  const atualCents = toCents(obj.valor_atual);
  const alvoCents = toCents(obj.valor_alvo);
  const valCents = toCents(contrib.valor);

  const novoAtualCents =
    contrib.tipo === "aporte"
      ? Math.max(0, atualCents - valCents)
      : atualCents + valCents;

  let novoStatus = obj.status;
  if (obj.status === "concluido" && novoAtualCents < alvoCents) {
    novoStatus = "ativo";
  } else if (obj.status === "ativo" && novoAtualCents >= alvoCents) {
    novoStatus = "concluido";
  }

  await client.query(
    `UPDATE objetivos
     SET valor_atual = $1, status = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4`,
    [fromCents(novoAtualCents), novoStatus, obj.id, userId],
  );
}

exports.reverterContribuicaoNoBanco = reverterContribuicaoNoBanco;

async function validarPatrimonioOpcional(patrimonioIdRaw, userId, db = pool) {
  if (patrimonioIdRaw === undefined || patrimonioIdRaw === null || patrimonioIdRaw === "") {
    return { id: null };
  }
  const id = parseId(patrimonioIdRaw);
  if (!id) return { error: "ID de patrimônio inválido.", status: 400 };
  const r = await db.query(
    "SELECT id FROM patrimonio_itens WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  if (r.rowCount === 0) {
    return { error: "Patrimônio vinculado inválido ou não autorizado.", status: 403 };
  }
  return { id };
}

exports.listarObjetivos = async (req, res, next) => {
  const userId = req.user.userId;
  const refDate = isValidDateISO(req.query?.refDate) ? req.query.refDate : todayISO();

  try {
    const result = await pool.query(
      `SELECT o.*,
              p.nome AS patrimonio_nome,
              p.rendimento_tipo AS patrimonio_rendimento_tipo,
              p.rendimento_valor AS patrimonio_rendimento_valor,
              p.cdi_referencia AS patrimonio_cdi_referencia
       FROM objetivos o
       LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
       WHERE o.user_id = $1
       ORDER BY (o.status = 'ativo') DESC,
                CASE o.prioridade WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END ASC,
                o.id DESC`,
      [userId],
    );

    const itens = result.rows.map((r) => enrichObjetivo(r, refDate));
    const resumo = calcularResumoObjetivos(itens);
    res.json({ resumo, itens });
  } catch (err) {
    next(err);
  }
};

exports.criarObjetivo = async (req, res, next) => {
  const userId = req.user.userId;
  const {
    nome,
    categoria = "outro",
    valor_alvo,
    valor_atual = 0,
    aporte_mensal_planejado = null,
    prazo = null,
    prioridade = "media",
    patrimonio_id = null,
    observacoes = "",
  } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome do objetivo é obrigatório." });
  }
  if (!CATEGORIAS_OBJETIVO.includes(categoria)) {
    return res.status(400).json({ error: "Categoria de objetivo inválida." });
  }
  if (!PRIORIDADES_OBJETIVO.includes(prioridade)) {
    return res.status(400).json({ error: "Prioridade inválida." });
  }

  const alvoCents = toCents(valor_alvo);
  if (alvoCents <= 0) {
    return res.status(400).json({ error: "O valor da meta deve ser positivo." });
  }

  const atualCents = toCents(valor_atual);
  if (atualCents < 0) {
    return res.status(400).json({ error: "O valor atual não pode ser negativo." });
  }

  let aportePlanejado = null;
  if (
    aporte_mensal_planejado !== null &&
    aporte_mensal_planejado !== undefined &&
    aporte_mensal_planejado !== ""
  ) {
    const apCents = toCents(aporte_mensal_planejado);
    if (apCents < 0) {
      return res.status(400).json({ error: "O aporte mensal planejado deve ser >= 0." });
    }
    aportePlanejado = fromCents(apCents);
  }

  let prazoVal = null;
  if (prazo !== null && prazo !== undefined && prazo !== "") {
    if (!isValidDateISO(prazo)) {
      return res.status(400).json({ error: "Prazo inválido. Use AAAA-MM-DD." });
    }
    prazoVal = prazo;
  }

  try {
    const patRes = await validarPatrimonioOpcional(patrimonio_id, userId);
    if (patRes.error) return res.status(patRes.status).json({ error: patRes.error });

    const initialStatus = atualCents >= alvoCents ? "concluido" : "ativo";
    const ins = await pool.query(
      `INSERT INTO objetivos
        (user_id, nome, categoria, valor_alvo, valor_atual, aporte_mensal_planejado, prazo, prioridade, patrimonio_id, status, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        userId,
        nome.trim().substring(0, 120),
        categoria,
        fromCents(alvoCents),
        fromCents(atualCents),
        aportePlanejado,
        prazoVal,
        prioridade,
        patRes.id,
        initialStatus,
        String(observacoes || "").trim().substring(0, 500),
      ],
    );
    const full = await pool.query(
      `SELECT o.*,
              p.nome AS patrimonio_nome,
              p.rendimento_tipo AS patrimonio_rendimento_tipo,
              p.rendimento_valor AS patrimonio_rendimento_valor,
              p.cdi_referencia AS patrimonio_cdi_referencia
       FROM objetivos o
       LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [ins.rows[0].id, userId],
    );
    res.status(201).json(enrichObjetivo(full.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.atualizarObjetivo = async (req, res, next) => {
  const userId = req.user.userId;
  const objId = parseId(req.params.id);
  if (!objId) return res.status(400).json({ error: "ID de objetivo inválido." });

  const {
    nome,
    categoria,
    valor_alvo,
    valor_atual,
    aporte_mensal_planejado,
    prazo,
    prioridade,
    patrimonio_id,
    status,
    observacoes,
  } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome do objetivo é obrigatório." });
  }
  if (categoria && !CATEGORIAS_OBJETIVO.includes(categoria)) {
    return res.status(400).json({ error: "Categoria de objetivo inválida." });
  }
  if (prioridade && !PRIORIDADES_OBJETIVO.includes(prioridade)) {
    return res.status(400).json({ error: "Prioridade inválida." });
  }
  if (status && !STATUS_OBJETIVO.includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM objetivos WHERE id = $1 AND user_id = $2",
      [objId, userId],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Objetivo não encontrado." });
    }
    const prev = existing.rows[0];

    const alvoCents =
      valor_alvo !== undefined ? toCents(valor_alvo) : toCents(prev.valor_alvo);
    if (alvoCents <= 0) {
      return res.status(400).json({ error: "O valor da meta deve ser positivo." });
    }

    const atualCents =
      valor_atual !== undefined ? toCents(valor_atual) : toCents(prev.valor_atual);
    if (atualCents < 0) {
      return res.status(400).json({ error: "O valor atual não pode ser negativo." });
    }

    let finalAporte = prev.aporte_mensal_planejado;
    if (aporte_mensal_planejado !== undefined) {
      if (aporte_mensal_planejado === null || aporte_mensal_planejado === "") {
        finalAporte = null;
      } else {
        const apCents = toCents(aporte_mensal_planejado);
        if (apCents < 0) {
          return res.status(400).json({ error: "O aporte mensal planejado deve ser >= 0." });
        }
        finalAporte = fromCents(apCents);
      }
    }

    let finalPrazo = prev.prazo;
    if (prazo !== undefined) {
      if (prazo === null || prazo === "") {
        finalPrazo = null;
      } else if (!isValidDateISO(prazo)) {
        return res.status(400).json({ error: "Prazo inválido. Use AAAA-MM-DD." });
      } else {
        finalPrazo = prazo;
      }
    }

    let finalPatId = prev.patrimonio_id;
    if (patrimonio_id !== undefined) {
      const patRes = await validarPatrimonioOpcional(patrimonio_id, userId);
      if (patRes.error) return res.status(patRes.status).json({ error: patRes.error });
      finalPatId = patRes.id;
    }

    let finalStatus = status || prev.status;
    if (!status) {
      if (atualCents >= alvoCents) finalStatus = "concluido";
      else if (prev.status === "concluido" && atualCents < alvoCents) finalStatus = "ativo";
    }

    await pool.query(
      `UPDATE objetivos
       SET nome = $1, categoria = $2, valor_alvo = $3, valor_atual = $4,
           aporte_mensal_planejado = $5, prazo = $6, prioridade = $7,
           patrimonio_id = $8, status = $9, observacoes = $10, updated_at = NOW()
       WHERE id = $11 AND user_id = $12`,
      [
        nome.trim().substring(0, 120),
        categoria || prev.categoria,
        fromCents(alvoCents),
        fromCents(atualCents),
        finalAporte,
        finalPrazo,
        prioridade || prev.prioridade,
        finalPatId,
        finalStatus,
        observacoes !== undefined ? String(observacoes).trim().substring(0, 500) : prev.observacoes,
        objId,
        userId,
      ],
    );

    const full = await pool.query(
      `SELECT o.*,
              p.nome AS patrimonio_nome,
              p.rendimento_tipo AS patrimonio_rendimento_tipo,
              p.rendimento_valor AS patrimonio_rendimento_valor,
              p.cdi_referencia AS patrimonio_cdi_referencia
       FROM objetivos o
       LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [objId, userId],
    );
    res.json(enrichObjetivo(full.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.alterarStatusObjetivo = async (req, res, next) => {
  const userId = req.user.userId;
  const objId = parseId(req.params.id);
  if (!objId) return res.status(400).json({ error: "ID de objetivo inválido." });

  const { status } = req.body;
  if (!STATUS_OBJETIVO.includes(status)) {
    return res.status(400).json({ error: "Status inválido. Use ativo, concluido ou pausado." });
  }

  try {
    const upd = await pool.query(
      `UPDATE objetivos
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id`,
      [status, objId, userId],
    );
    if (upd.rowCount === 0) {
      return res.status(404).json({ error: "Objetivo não encontrado." });
    }

    const full = await pool.query(
      `SELECT o.*,
              p.nome AS patrimonio_nome,
              p.rendimento_tipo AS patrimonio_rendimento_tipo,
              p.rendimento_valor AS patrimonio_rendimento_valor,
              p.cdi_referencia AS patrimonio_cdi_referencia
       FROM objetivos o
       LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [objId, userId],
    );
    res.json(enrichObjetivo(full.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.deletarObjetivo = async (req, res, next) => {
  const userId = req.user.userId;
  const objId = parseId(req.params.id);
  if (!objId) return res.status(400).json({ error: "ID de objetivo inválido." });

  try {
    const result = await pool.query(
      "DELETE FROM objetivos WHERE id = $1 AND user_id = $2 RETURNING id",
      [objId, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Objetivo não encontrado." });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.listarContribuicoes = async (req, res, next) => {
  const userId = req.user.userId;
  const objId = parseId(req.params.id);
  if (!objId) return res.status(400).json({ error: "ID de objetivo inválido." });

  try {
    const owner = await pool.query(
      "SELECT id FROM objetivos WHERE id = $1 AND user_id = $2",
      [objId, userId],
    );
    if (owner.rowCount === 0) {
      return res.status(404).json({ error: "Objetivo não encontrado." });
    }

    const result = await pool.query(
      `SELECT id, objetivo_id, tipo, valor,
              to_char(data_contribuicao, 'YYYY-MM-DD') AS data_contribuicao,
              transacao_id, patrimonio_movimentacao_id, observacao, created_at
       FROM objetivos_contribuicoes
       WHERE objetivo_id = $1 AND user_id = $2
       ORDER BY data_contribuicao DESC, id DESC`,
      [objId, userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.registrarContribuicao = async (req, res, next) => {
  const userId = req.user.userId;
  const objId = parseId(req.params.id);
  if (!objId) return res.status(400).json({ error: "ID de objetivo inválido." });

  const {
    tipo = "aporte",
    valor,
    data_contribuicao = todayISO(),
    lancar_transacao = false,
    categoria_id = null,
    observacao = "",
  } = req.body;

  if (!CONTRIB_TIPOS.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de contribuição inválido." });
  }
  if (!isValidDateISO(data_contribuicao)) {
    return res.status(400).json({ error: "Data inválida. Use AAAA-MM-DD." });
  }
  const valCents = toCents(valor);
  if (valCents <= 0) {
    return res.status(400).json({ error: "O valor da contribuição deve ser positivo." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const objRes = await client.query(
      "SELECT * FROM objetivos WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [objId, userId],
    );
    if (objRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Objetivo não encontrado." });
    }
    const obj = objRes.rows[0];
    const atualCents = toCents(obj.valor_atual);
    const alvoCents = toCents(obj.valor_alvo);

    let novoAtualCents = atualCents;
    if (tipo === "aporte") {
      novoAtualCents = atualCents + valCents;
    } else {
      if (valCents > atualCents) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "O valor do resgate excede o valor acumulado neste objetivo.",
        });
      }
      novoAtualCents = atualCents - valCents;
    }

    let novoStatus = obj.status;
    if (novoAtualCents >= alvoCents) novoStatus = "concluido";
    else if (obj.status === "concluido" && novoAtualCents < alvoCents) novoStatus = "ativo";

    let transacaoId = null;
    if (lancar_transacao) {
      if (tipo === "aporte") {
        if (!categoria_id) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: "Selecione uma categoria de despesa para lançar o aporte no extrato.",
          });
        }
        const catIdNum = parseInt(categoria_id, 10);
        const catCheck = await client.query(
          "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
          [catIdNum, userId],
        );
        if (catCheck.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
        }
        const tx = await client.query(
          `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
           VALUES ($1,$2,$3,'despesa',$4,$5) RETURNING id`,
          [
            userId,
            `Aporte objetivo: ${obj.nome}`.substring(0, 150),
            fromCents(valCents),
            data_contribuicao,
            catIdNum,
          ],
        );
        transacaoId = tx.rows[0].id;
      } else {
        const tx = await client.query(
          `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
           VALUES ($1,$2,$3,'receita',$4,NULL) RETURNING id`,
          [
            userId,
            `Resgate objetivo: ${obj.nome}`.substring(0, 150),
            fromCents(valCents),
            data_contribuicao,
          ],
        );
        transacaoId = tx.rows[0].id;
      }
    }

    await client.query(
      `UPDATE objetivos
       SET valor_atual = $1, status = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [fromCents(novoAtualCents), novoStatus, objId, userId],
    );

    const contribRes = await client.query(
      `INSERT INTO objetivos_contribuicoes
        (objetivo_id, user_id, tipo, valor, data_contribuicao, transacao_id, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, objetivo_id, tipo, valor,
                 to_char(data_contribuicao, 'YYYY-MM-DD') AS data_contribuicao,
                 transacao_id, observacao, created_at`,
      [
        objId,
        userId,
        tipo,
        fromCents(valCents),
        data_contribuicao,
        transacaoId,
        String(observacao || "").trim().substring(0, 200),
      ],
    );

    const full = await client.query(
      `SELECT o.*,
              p.nome AS patrimonio_nome,
              p.rendimento_tipo AS patrimonio_rendimento_tipo,
              p.rendimento_valor AS patrimonio_rendimento_valor,
              p.cdi_referencia AS patrimonio_cdi_referencia
       FROM objetivos o
       LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [objId, userId],
    );

    await client.query("COMMIT");
    res.status(201).json({
      objetivo: enrichObjetivo(full.rows[0]),
      contribuicao: contribRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.estornarContribuicao = async (req, res, next) => {
  const userId = req.user.userId;
  const objId = parseId(req.params.id);
  const contribId = parseId(req.params.contribId);
  if (!objId || !contribId) return res.status(400).json({ error: "Identificador inválido." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const delRes = await client.query(
      `DELETE FROM objetivos_contribuicoes
       WHERE id = $1 AND objetivo_id = $2 AND user_id = $3
       RETURNING *`,
      [contribId, objId, userId],
    );
    if (delRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Contribuição não encontrada." });
    }
    const contrib = delRes.rows[0];

    await reverterContribuicaoNoBanco(client, contrib, userId);

    if (contrib.transacao_id) {
      await client.query("DELETE FROM transacoes WHERE id = $1 AND user_id = $2", [
        contrib.transacao_id,
        userId,
      ]);
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
