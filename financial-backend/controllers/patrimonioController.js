const pool = require("../config/db");
const { toCents, fromCents, todayISO } = require("../utils/contasFixas");
const {
  TIPOS_PATRIMONIO,
  LIQUIDEZ_VALIDA,
  RENDIMENTO_TIPOS,
  DEFAULT_CDI_ANUAL,
  enrichPatrimonioItem,
  calcularResumoPatrimonio,
} = require("../utils/patrimonio");
const { enrichObjetivo } = require("../utils/objetivos");
const { reverterContribuicaoNoBanco } = require("./objetivosController");

const MOV_TIPOS = ["aporte", "resgate", "ajuste"];
const isValidDateISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function parseId(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Reverte uma movimentação de patrimônio no banco (usado tanto no estorno direto
 * quanto ao excluir a transação vinculada em /transacoes/:id).
 */
async function reverterMovPatrimonioNoBanco(client, mov, userId) {
  const itemRes = await client.query(
    "SELECT * FROM patrimonio_itens WHERE id = $1 AND user_id = $2 FOR UPDATE",
    [mov.patrimonio_id, userId],
  );
  if (itemRes.rowCount === 0) return;

  const item = itemRes.rows[0];
  const atualCents = toCents(item.valor_atual);
  const valCents = toCents(mov.valor);
  let novoAtualCents = atualCents;
  let novoInvestidoCents =
    item.valor_investido !== null && item.valor_investido !== undefined
      ? toCents(item.valor_investido)
      : null;

  if (mov.tipo === "aporte") {
    novoAtualCents = Math.max(0, atualCents - valCents);
    if (novoInvestidoCents !== null) {
      novoInvestidoCents = Math.max(0, novoInvestidoCents - valCents);
    }
  } else if (mov.tipo === "resgate") {
    novoAtualCents = atualCents + valCents;
  } else if (mov.tipo === "ajuste") {
    const delta = toCents(mov.saldo_novo) - toCents(mov.saldo_anterior);
    novoAtualCents = Math.max(0, atualCents - delta);
  }

  await client.query(
    `UPDATE patrimonio_itens
     SET valor_atual = $1, valor_investido = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4`,
    [
      fromCents(novoAtualCents),
      novoInvestidoCents !== null ? fromCents(novoInvestidoCents) : null,
      item.id,
      userId,
    ],
  );
}

exports.reverterMovPatrimonioNoBanco = reverterMovPatrimonioNoBanco;

/**
 * Reverte contribuições em objetivos que foram geradas automaticamente
 * a partir de uma ou mais movimentações de patrimônio.
 * Deve ser chamada ANTES de deletar as linhas em patrimonio_movimentacoes
 * para não perder a referência (FK ON DELETE SET NULL).
 */
async function reverterObjetivosDaMovPatrimonio(client, movIds, userId) {
  const ids = (Array.isArray(movIds) ? movIds : [movIds])
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return;

  const contribRes = await client.query(
    `DELETE FROM objetivos_contribuicoes
     WHERE patrimonio_movimentacao_id = ANY($1::int[]) AND user_id = $2
     RETURNING *`,
    [ids, userId],
  );
  for (const contrib of contribRes.rows) {
    await reverterContribuicaoNoBanco(client, contrib, userId);
  }
}

exports.reverterObjetivosDaMovPatrimonio = reverterObjetivosDaMovPatrimonio;

exports.listarPatrimonio = async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const [itensRes, dividasRes, objRes] = await Promise.all([
      pool.query(
        `SELECT * FROM patrimonio_itens
         WHERE user_id = $1
         ORDER BY ativo DESC, valor_atual DESC, id DESC`,
        [userId],
      ),
      pool.query(
        `SELECT COALESCE(SUM(saldo_devedor), 0) AS total_passivos
         FROM dividas
         WHERE user_id = $1 AND status <> 'quitada'`,
        [userId],
      ),
      pool.query(
        `SELECT id, patrimonio_id, nome, status
         FROM objetivos
         WHERE user_id = $1 AND patrimonio_id IS NOT NULL
         ORDER BY id ASC`,
        [userId],
      ),
    ]);

    const objPorPatrimonio = new Map();
    for (const o of objRes.rows) {
      if (!objPorPatrimonio.has(o.patrimonio_id)) {
        objPorPatrimonio.set(o.patrimonio_id, []);
      }
      objPorPatrimonio.get(o.patrimonio_id).push({
        id: o.id,
        nome: o.nome,
        status: o.status,
      });
    }

    const itens = itensRes.rows.map((row) => ({
      ...enrichPatrimonioItem(row),
      objetivos_vinculados: objPorPatrimonio.get(row.id) || [],
    }));
    const totalPassivos = Number(dividasRes.rows[0]?.total_passivos || 0);
    const resumo = calcularResumoPatrimonio(itens, totalPassivos);
    res.json({ resumo, itens });
  } catch (err) {
    next(err);
  }
};

function parseRendimentoPayload(body, prev = {}) {
  const tipo =
    body.rendimento_tipo !== undefined
      ? body.rendimento_tipo
      : prev.rendimento_tipo || "nenhum";

  if (!RENDIMENTO_TIPOS.includes(tipo)) {
    return { error: "Tipo de rendimento inválido." };
  }
  if (tipo === "nenhum") {
    return { rendimento_tipo: "nenhum", rendimento_valor: null, cdi_referencia: null };
  }

  const rawValor =
    body.rendimento_valor !== undefined ? body.rendimento_valor : prev.rendimento_valor;
  if (rawValor === null || rawValor === undefined || rawValor === "") {
    return { error: "Informe a taxa de rendimento para o tipo selecionado." };
  }
  const valNum = Number(rawValor);
  if (!Number.isFinite(valNum) || valNum < 0) {
    return { error: "A taxa de rendimento deve ser um número >= 0." };
  }

  let cdiRef = null;
  if (tipo === "cdi_percentual") {
    const rawCdi =
      body.cdi_referencia !== undefined ? body.cdi_referencia : prev.cdi_referencia;
    if (rawCdi !== null && rawCdi !== undefined && rawCdi !== "") {
      const cdiNum = Number(rawCdi);
      if (!Number.isFinite(cdiNum) || cdiNum < 0) {
        return { error: "O CDI anual de referência deve ser >= 0." };
      }
      cdiRef = Math.round(cdiNum * 1000) / 1000;
    } else {
      cdiRef = DEFAULT_CDI_ANUAL;
    }
  }

  return {
    rendimento_tipo: tipo,
    rendimento_valor: Math.round(valNum * 1000) / 1000,
    cdi_referencia: cdiRef,
  };
}

exports.criarPatrimonio = async (req, res, next) => {
  const userId = req.user.userId;
  const {
    nome,
    tipo = "outro",
    instituicao = "",
    valor_atual = 0,
    valor_investido = null,
    liquidez = "media",
    ativo = true,
    observacoes = "",
  } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome do ativo/patrimônio é obrigatório." });
  }
  if (!TIPOS_PATRIMONIO.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de patrimônio inválido." });
  }
  if (!LIQUIDEZ_VALIDA.includes(liquidez)) {
    return res.status(400).json({ error: "Nível de liquidez inválido." });
  }

  const rendParsed = parseRendimentoPayload(req.body);
  if (rendParsed.error) {
    return res.status(400).json({ error: rendParsed.error });
  }

  const atualCents = toCents(valor_atual);
  if (atualCents < 0) {
    return res.status(400).json({ error: "O valor atual não pode ser negativo." });
  }

  let investidoNum = null;
  if (valor_investido !== null && valor_investido !== undefined && valor_investido !== "") {
    const invCents = toCents(valor_investido);
    if (invCents < 0) {
      return res.status(400).json({ error: "O valor investido não pode ser negativo." });
    }
    investidoNum = fromCents(invCents);
  }

  try {
    const result = await pool.query(
      `INSERT INTO patrimonio_itens
        (user_id, nome, tipo, instituicao, valor_atual, valor_investido,
         rendimento_tipo, rendimento_valor, cdi_referencia, liquidez, ativo, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        userId,
        nome.trim().substring(0, 120),
        tipo,
        String(instituicao || "").trim().substring(0, 80),
        fromCents(atualCents),
        investidoNum,
        rendParsed.rendimento_tipo,
        rendParsed.rendimento_valor,
        rendParsed.cdi_referencia,
        liquidez,
        Boolean(ativo),
        String(observacoes || "").trim().substring(0, 500),
      ],
    );
    res.status(201).json(enrichPatrimonioItem(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.atualizarPatrimonio = async (req, res, next) => {
  const userId = req.user.userId;
  const itemId = parseId(req.params.id);
  if (!itemId) return res.status(400).json({ error: "ID de patrimônio inválido." });

  const {
    nome,
    tipo,
    instituicao,
    valor_atual,
    valor_investido,
    liquidez,
    ativo,
    observacoes,
  } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome do ativo/patrimônio é obrigatório." });
  }
  if (tipo && !TIPOS_PATRIMONIO.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de patrimônio inválido." });
  }
  if (liquidez && !LIQUIDEZ_VALIDA.includes(liquidez)) {
    return res.status(400).json({ error: "Nível de liquidez inválido." });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM patrimonio_itens WHERE id = $1 AND user_id = $2",
      [itemId, userId],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Item de patrimônio não encontrado." });
    }
    const prev = existing.rows[0];

    const rendParsed = parseRendimentoPayload(req.body, prev);
    if (rendParsed.error) {
      return res.status(400).json({ error: rendParsed.error });
    }

    const atualCents =
      valor_atual !== undefined ? toCents(valor_atual) : toCents(prev.valor_atual);
    if (atualCents < 0) {
      return res.status(400).json({ error: "O valor atual não pode ser negativo." });
    }

    let finalInvestido = prev.valor_investido;
    if (valor_investido !== undefined) {
      if (valor_investido === null || valor_investido === "") {
        finalInvestido = null;
      } else {
        const invCents = toCents(valor_investido);
        if (invCents < 0) {
          return res.status(400).json({ error: "O valor investido não pode ser negativo." });
        }
        finalInvestido = fromCents(invCents);
      }
    }

    const updated = await pool.query(
      `UPDATE patrimonio_itens
       SET nome = $1, tipo = $2, instituicao = $3, valor_atual = $4, valor_investido = $5,
           rendimento_tipo = $6, rendimento_valor = $7, cdi_referencia = $8,
           liquidez = $9, ativo = $10, observacoes = $11, updated_at = NOW()
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        nome.trim().substring(0, 120),
        tipo || prev.tipo,
        instituicao !== undefined ? String(instituicao).trim().substring(0, 80) : prev.instituicao,
        fromCents(atualCents),
        finalInvestido,
        rendParsed.rendimento_tipo,
        rendParsed.rendimento_valor,
        rendParsed.cdi_referencia,
        liquidez || prev.liquidez,
        ativo !== undefined ? Boolean(ativo) : prev.ativo,
        observacoes !== undefined ? String(observacoes).trim().substring(0, 500) : prev.observacoes,
        itemId,
        userId,
      ],
    );
    res.json(enrichPatrimonioItem(updated.rows[0]));
  } catch (err) {
    next(err);
  }
};

exports.deletarPatrimonio = async (req, res, next) => {
  const userId = req.user.userId;
  const itemId = parseId(req.params.id);
  if (!itemId) return res.status(400).json({ error: "ID de patrimônio inválido." });

  try {
    const result = await pool.query(
      "DELETE FROM patrimonio_itens WHERE id = $1 AND user_id = $2 RETURNING id",
      [itemId, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item de patrimônio não encontrado." });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.listarMovimentacoes = async (req, res, next) => {
  const userId = req.user.userId;
  const itemId = parseId(req.params.id);
  if (!itemId) return res.status(400).json({ error: "ID de patrimônio inválido." });

  try {
    const owner = await pool.query(
      "SELECT id FROM patrimonio_itens WHERE id = $1 AND user_id = $2",
      [itemId, userId],
    );
    if (owner.rowCount === 0) {
      return res.status(404).json({ error: "Item de patrimônio não encontrado." });
    }

    const result = await pool.query(
      `SELECT id, patrimonio_id, tipo, valor, saldo_anterior, saldo_novo,
              to_char(data_movimentacao, 'YYYY-MM-DD') AS data_movimentacao,
              transacao_id, observacao, created_at
       FROM patrimonio_movimentacoes
       WHERE patrimonio_id = $1 AND user_id = $2
       ORDER BY data_movimentacao DESC, id DESC`,
      [itemId, userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.registrarMovimentacao = async (req, res, next) => {
  const userId = req.user.userId;
  const itemId = parseId(req.params.id);
  if (!itemId) return res.status(400).json({ error: "ID de patrimônio inválido." });

  const {
    tipo = "aporte",
    valor,
    novo_saldo,
    data_movimentacao = todayISO(),
    lancar_transacao = false,
    observacao = "",
  } = req.body;

  if (!MOV_TIPOS.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de movimentação inválido." });
  }
  if (!isValidDateISO(data_movimentacao)) {
    return res.status(400).json({ error: "Data inválida. Use AAAA-MM-DD." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const itemRes = await client.query(
      "SELECT * FROM patrimonio_itens WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [itemId, userId],
    );
    if (itemRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Item de patrimônio não encontrado." });
    }
    const item = itemRes.rows[0];
    const saldoAnteriorCents = toCents(item.valor_atual);

    let movValorCents = 0;
    let saldoNovoCents = saldoAnteriorCents;
    let novoInvestidoCents =
      item.valor_investido !== null && item.valor_investido !== undefined
        ? toCents(item.valor_investido)
        : null;

    if (tipo === "ajuste") {
      const targetRaw = novo_saldo !== undefined ? novo_saldo : valor;
      if (targetRaw === undefined || targetRaw === null || targetRaw === "") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Informe o novo saldo para o ajuste." });
      }
      saldoNovoCents = toCents(targetRaw);
      if (saldoNovoCents < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "O novo saldo não pode ser negativo." });
      }
      movValorCents = Math.abs(saldoNovoCents - saldoAnteriorCents);
    } else {
      movValorCents = toCents(valor);
      if (movValorCents <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "O valor da movimentação deve ser positivo." });
      }
      if (tipo === "aporte") {
        saldoNovoCents = saldoAnteriorCents + movValorCents;
        if (novoInvestidoCents !== null) novoInvestidoCents += movValorCents;
      } else {
        if (movValorCents > saldoAnteriorCents) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "O valor do resgate excede o saldo atual deste patrimônio.",
          });
        }
        saldoNovoCents = saldoAnteriorCents - movValorCents;
      }
    }

    let transacaoId = null;
    if (lancar_transacao && tipo !== "ajuste") {
      if (tipo === "aporte") {
        const tx = await client.query(
          `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
           VALUES ($1,$2,$3,'aporte_patrimonio',$4,NULL) RETURNING id`,
          [
            userId,
            `Aporte patrimônio: ${item.nome}`.substring(0, 150),
            fromCents(movValorCents),
            data_movimentacao,
          ],
        );
        transacaoId = tx.rows[0].id;
      } else {
        const tx = await client.query(
          `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
           VALUES ($1,$2,$3,'resgate_patrimonio',$4,NULL) RETURNING id`,
          [
            userId,
            `Resgate patrimônio: ${item.nome}`.substring(0, 150),
            fromCents(movValorCents),
            data_movimentacao,
          ],
        );
        transacaoId = tx.rows[0].id;
      }
    }

    const updatedItem = await client.query(
      `UPDATE patrimonio_itens
       SET valor_atual = $1, valor_investido = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [
        fromCents(saldoNovoCents),
        novoInvestidoCents !== null ? fromCents(novoInvestidoCents) : null,
        itemId,
        userId,
      ],
    );

    const movRes = await client.query(
      `INSERT INTO patrimonio_movimentacoes
        (patrimonio_id, user_id, tipo, valor, saldo_anterior, saldo_novo, data_movimentacao, transacao_id, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, patrimonio_id, tipo, valor, saldo_anterior, saldo_novo,
                 to_char(data_movimentacao, 'YYYY-MM-DD') AS data_movimentacao,
                 transacao_id, observacao, created_at`,
      [
        itemId,
        userId,
        tipo,
        fromCents(movValorCents),
        fromCents(saldoAnteriorCents),
        fromCents(saldoNovoCents),
        data_movimentacao,
        transacaoId,
        String(observacao || "").trim().substring(0, 200),
      ],
    );

    const movCriada = movRes.rows[0];
    const deltaCents = saldoNovoCents - saldoAnteriorCents;
    const objetivosAtualizados = [];

    if (deltaCents !== 0) {
      const objVincRes = await client.query(
        `SELECT * FROM objetivos
         WHERE patrimonio_id = $1 AND user_id = $2 AND status <> 'pausado'
         ORDER BY id ASC
         FOR UPDATE`,
        [itemId, userId],
      );

      for (const obj of objVincRes.rows) {
        const atualObjCents = toCents(obj.valor_atual);
        const alvoObjCents = toCents(obj.valor_alvo);
        const contribTipo = deltaCents > 0 ? "aporte" : "resgate";
        const contribValCents =
          deltaCents > 0 ? deltaCents : Math.min(atualObjCents, Math.abs(deltaCents));

        if (contribValCents <= 0) continue;

        const novoObjAtualCents =
          contribTipo === "aporte"
            ? atualObjCents + contribValCents
            : Math.max(0, atualObjCents - contribValCents);

        let novoStatusObj = obj.status;
        if (novoObjAtualCents >= alvoObjCents) novoStatusObj = "concluido";
        else if (obj.status === "concluido" && novoObjAtualCents < alvoObjCents) {
          novoStatusObj = "ativo";
        }

        const updObjRes = await client.query(
          `UPDATE objetivos
           SET valor_atual = $1, status = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4
           RETURNING *`,
          [fromCents(novoObjAtualCents), novoStatusObj, obj.id, userId],
        );

        const obsSync = (
          `Via patrimônio ${item.nome}` + (observacao ? `: ${String(observacao).trim()}` : "")
        ).substring(0, 200);

        await client.query(
          `INSERT INTO objetivos_contribuicoes
            (objetivo_id, user_id, tipo, valor, data_contribuicao, transacao_id, patrimonio_movimentacao_id, observacao)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$7)`,
          [
            obj.id,
            userId,
            contribTipo,
            fromCents(contribValCents),
            data_movimentacao,
            movCriada.id,
            obsSync,
          ],
        );

        objetivosAtualizados.push(
          enrichObjetivo({
            ...updObjRes.rows[0],
            patrimonio_nome: item.nome,
            patrimonio_rendimento_tipo: item.rendimento_tipo,
            patrimonio_rendimento_valor: item.rendimento_valor,
            patrimonio_cdi_referencia: item.cdi_referencia,
          }),
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      item: enrichPatrimonioItem(updatedItem.rows[0]),
      movimentacao: movCriada,
      objetivos_atualizados: objetivosAtualizados,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.estornarMovimentacao = async (req, res, next) => {
  const userId = req.user.userId;
  const itemId = parseId(req.params.id);
  const movId = parseId(req.params.movId);
  if (!itemId || !movId) return res.status(400).json({ error: "Identificador inválido." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const checkMov = await client.query(
      `SELECT id FROM patrimonio_movimentacoes
       WHERE id = $1 AND patrimonio_id = $2 AND user_id = $3
       FOR UPDATE`,
      [movId, itemId, userId],
    );
    if (checkMov.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Movimentação não encontrada." });
    }

    // Reverte contribuições de objetivos vinculadas ANTES de deletar a movimentação de patrimônio
    await reverterObjetivosDaMovPatrimonio(client, [movId], userId);

    const delRes = await client.query(
      `DELETE FROM patrimonio_movimentacoes
       WHERE id = $1 AND patrimonio_id = $2 AND user_id = $3
       RETURNING *`,
      [movId, itemId, userId],
    );
    const mov = delRes.rows[0];

    await reverterMovPatrimonioNoBanco(client, mov, userId);

    if (mov.transacao_id) {
      await client.query("DELETE FROM transacoes WHERE id = $1 AND user_id = $2", [
        mov.transacao_id,
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
