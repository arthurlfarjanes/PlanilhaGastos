const pool = require("../config/db");
const { toCents, fromCents, parseCompetencia, todayISO } = require("../utils/contasFixas");
const { calcularFatura, calcularLimite, dataEmFaturaPaga } = require("../utils/cartoes");

const LANC_COLS = `id, descricao, valor, data::text AS data, categoria_id, cartao_id`;
const PAG_COLS = `id, cartao_id, competencia_ano, competencia_mes, valor_pago,
  to_char(data_pagamento, 'YYYY-MM-DD') AS data_pagamento`;

const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function parseId(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function validarCartao(body) {
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  if (!nome) return { error: "O nome do cartão é obrigatório." };
  if (body.limite_total === undefined || body.limite_total === "" || toCents(body.limite_total) < 0) {
    return { error: "Informe um limite total válido (>= 0)." };
  }
  const fech = parseInt(body.dia_fechamento, 10);
  const venc = parseInt(body.dia_vencimento, 10);
  if (!Number.isInteger(fech) || fech < 1 || fech > 31) {
    return { error: "Dia de fechamento deve estar entre 1 e 31." };
  }
  if (!Number.isInteger(venc) || venc < 1 || venc > 31) {
    return { error: "Dia de vencimento deve estar entre 1 e 31." };
  }
  return {
    value: {
      nome: nome.substring(0, 80),
      bandeira: body.bandeira ? String(body.bandeira).trim().substring(0, 30) : null,
      limite: fromCents(toCents(body.limite_total)),
      fech,
      venc,
      ativo: body.ativo === undefined ? true : Boolean(body.ativo),
    },
  };
}

async function obterCartao(cartaoId, userId, db = pool) {
  const r = await db.query("SELECT * FROM cartoes WHERE id = $1 AND user_id = $2", [cartaoId, userId]);
  return r.rows[0] || null;
}

async function lancamentosDoCartao(db, userId, cartaoId) {
  const r = await db.query(
    `SELECT ${LANC_COLS} FROM transacoes
     WHERE user_id = $1 AND cartao_id = $2 AND tipo = 'despesa'`,
    [userId, cartaoId],
  );
  return r.rows;
}

async function pagamentosDoCartao(db, userId, cartaoId) {
  const r = await db.query(
    `SELECT ${PAG_COLS} FROM cartoes_faturas_pagas WHERE user_id = $1 AND cartao_id = $2`,
    [userId, cartaoId],
  );
  return r.rows;
}

/**
 * Helpers usados pelo transacaoController para manter transações e faturas consistentes.
 * validarCartaoParaTransacao: devolve { cartao } (do usuário e ativo) ou { error, status }.
 * faturaPaga: true se a data cair em uma fatura já paga do cartão.
 */
async function validarCartaoParaTransacao(db, userId, cartaoId) {
  const id = parseId(cartaoId);
  if (id === null) return { error: "Cartão inválido.", status: 400 };
  const cartao = await obterCartao(id, userId, db);
  if (!cartao) return { error: "Cartão inválido ou não autorizado.", status: 403 };
  if (!cartao.ativo) return { error: "Este cartão está inativo.", status: 409 };
  return { cartao };
}

async function faturaPaga(db, userId, cartao, dataISO) {
  const pagamentos = await pagamentosDoCartao(db, userId, cartao.id);
  return dataEmFaturaPaga(cartao, dataISO, pagamentos);
}

exports.validarCartaoParaTransacao = validarCartaoParaTransacao;
exports.faturaPaga = faturaPaga;
exports.obterCartao = obterCartao;

exports.listarCartoes = async (req, res, next) => {
  const userId = req.user.userId;
  const { ano, mes } = parseCompetencia(req.query);
  try {
    const cartoes = await pool.query(
      "SELECT * FROM cartoes WHERE user_id = $1 ORDER BY ativo DESC, nome ASC",
      [userId],
    );
    const lanc = await pool.query(
      `SELECT ${LANC_COLS} FROM transacoes
       WHERE user_id = $1 AND cartao_id IS NOT NULL AND tipo = 'despesa'`,
      [userId],
    );
    const pagas = await pool.query(
      `SELECT ${PAG_COLS} FROM cartoes_faturas_pagas WHERE user_id = $1`,
      [userId],
    );

    const itens = cartoes.rows.map((c) => {
      const lancC = lanc.rows.filter((x) => x.cartao_id === c.id);
      const pagasC = pagas.rows.filter((x) => x.cartao_id === c.id);
      const pag = pagasC.find(
        (p) => Number(p.competencia_ano) === ano && Number(p.competencia_mes) === mes,
      );
      const fatura = calcularFatura(c, lancC, ano, mes, pag || null);
      return {
        id: c.id,
        nome: c.nome,
        bandeira: c.bandeira || "",
        dia_fechamento: c.dia_fechamento,
        dia_vencimento: c.dia_vencimento,
        categoria_id: c.categoria_id,
        ativo: c.ativo,
        ...calcularLimite(c, lancC, pagasC, { ano, mes }),
        fatura: { ...fatura, itens: undefined, quantidade_itens: fatura.itens.length },
      };
    });

    const ativos = itens.filter((i) => i.ativo);
    const somaCents = (campo) => ativos.reduce((a, i) => a + toCents(i[campo]), 0);
    if (typeof res.set === "function") {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    res.json({
      competencia_ano: ano,
      competencia_mes: mes,
      resumo: {
        quantidade: ativos.length,
        limite_total: fromCents(somaCents("limite_total")),
        limite_usado: fromCents(somaCents("limite_usado")),
        limite_usado_mes: fromCents(somaCents("limite_usado_mes")),
        limite_usado_outras: fromCents(somaCents("limite_usado_outras")),
        limite_disponivel: fromCents(somaCents("limite_disponivel")),
        faturas_do_mes_em_aberto: fromCents(
          ativos
            .filter((i) => i.fatura.status !== "paga")
            .reduce((a, i) => a + toCents(i.fatura.total), 0),
        ),
      },
      itens,
    });
  } catch (err) {
    next(err);
  }
};

async function validarCategoriaOpcional(categoriaId, userId) {
  if (categoriaId === undefined || categoriaId === null || categoriaId === "") return { id: null };
  const id = parseInt(categoriaId, 10);
  if (isNaN(id)) return { error: "Categoria inválida.", status: 400 };
  const r = await pool.query("SELECT id FROM categorias WHERE id = $1 AND user_id = $2", [id, userId]);
  if (r.rows.length === 0) return { error: "Categoria inválida ou não autorizada.", status: 403 };
  return { id };
}

exports.criarCartao = async (req, res, next) => {
  const userId = req.user.userId;
  const v = validarCartao(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const cat = await validarCategoriaOpcional(req.body.categoria_id, userId);
    if (cat.error) return res.status(cat.status).json({ error: cat.error });
    const r = await pool.query(
      `INSERT INTO cartoes (user_id, nome, bandeira, limite_total, dia_fechamento, dia_vencimento, categoria_id, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, v.value.nome, v.value.bandeira, v.value.limite, v.value.fech, v.value.venc, cat.id, v.value.ativo],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.atualizarCartao = async (req, res, next) => {
  const userId = req.user.userId;
  const cartaoId = parseId(req.params.id);
  if (cartaoId === null) return res.status(400).json({ error: "ID de cartão inválido." });
  const v = validarCartao(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const atual = await obterCartao(cartaoId, userId);
    if (!atual) return res.status(404).json({ error: "Cartão não encontrado." });
    if (atual.dia_fechamento !== v.value.fech) {
      const pagos = await pagamentosDoCartao(pool, userId, cartaoId);
      if (pagos.length > 0) {
        return res.status(409).json({
          error: "Não é possível alterar o dia de fechamento de um cartão com faturas pagas. Estorne os pagamentos antes.",
        });
      }
    }
    const cat = await validarCategoriaOpcional(req.body.categoria_id, userId);
    if (cat.error) return res.status(cat.status).json({ error: cat.error });
    const r = await pool.query(
      `UPDATE cartoes
       SET nome = $1, bandeira = $2, limite_total = $3, dia_fechamento = $4,
           dia_vencimento = $5, categoria_id = $6, ativo = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [v.value.nome, v.value.bandeira, v.value.limite, v.value.fech, v.value.venc, cat.id, v.value.ativo, cartaoId, userId],
    );
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deletarCartao = async (req, res, next) => {
  const userId = req.user.userId;
  const cartaoId = parseId(req.params.id);
  if (cartaoId === null) return res.status(400).json({ error: "ID de cartão inválido." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cartaoRes = await client.query(
      "SELECT id, nome FROM cartoes WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [cartaoId, userId],
    );
    if (cartaoRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Cartão não encontrado." });
    }
    const nomeCartao = String(cartaoRes.rows[0].nome || "Cartão").slice(0, 120);

    // Preserva a origem nas transações existentes antes do ON DELETE SET NULL zerar cartao_id.
    await client.query(
      "UPDATE transacoes SET cartao_excluido_nome = $1 WHERE cartao_id = $2 AND user_id = $3",
      [nomeCartao, cartaoId, userId],
    );
    await client.query("DELETE FROM cartoes WHERE id = $1 AND user_id = $2", [cartaoId, userId]);
    await client.query("COMMIT");
    res.status(204).send();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.obterFatura = async (req, res, next) => {
  const userId = req.user.userId;
  const cartaoId = parseId(req.params.id);
  if (cartaoId === null) return res.status(400).json({ error: "ID de cartão inválido." });
  const { ano, mes } = parseCompetencia(req.query);
  try {
    const cartao = await obterCartao(cartaoId, userId);
    if (!cartao) return res.status(404).json({ error: "Cartão não encontrado." });
    const lanc = await lancamentosDoCartao(pool, userId, cartaoId);
    const pagos = await pagamentosDoCartao(pool, userId, cartaoId);
    const pag = pagos.find((p) => Number(p.competencia_ano) === ano && Number(p.competencia_mes) === mes);
    if (typeof res.set === "function") {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    res.json(calcularFatura(cartao, lanc, ano, mes, pag || null));
  } catch (err) {
    next(err);
  }
};

exports.pagarFatura = async (req, res, next) => {
  const userId = req.user.userId;
  const cartaoId = parseId(req.params.id);
  if (cartaoId === null) return res.status(400).json({ error: "ID de cartão inválido." });
  const { ano, mes } = parseCompetencia(req.body);
  const dataPgto = req.body.data_pagamento || todayISO();
  if (!isISODate(dataPgto)) return res.status(400).json({ error: "Data de pagamento inválida." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cartao = (
      await client.query("SELECT * FROM cartoes WHERE id = $1 AND user_id = $2 FOR UPDATE", [cartaoId, userId])
    ).rows[0];
    if (!cartao) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Cartão não encontrado." });
    }
    const pagos = await pagamentosDoCartao(client, userId, cartaoId);
    if (pagos.some((p) => Number(p.competencia_ano) === ano && Number(p.competencia_mes) === mes)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Esta fatura já foi paga." });
    }
    const lanc = await lancamentosDoCartao(client, userId, cartaoId);
    const fatura = calcularFatura(cartao, lanc, ano, mes, null);
    const totalCents = toCents(fatura.total);
    if (totalCents <= 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Esta fatura não possui lançamentos para pagar." });
    }
    const ins = await client.query(
      `INSERT INTO cartoes_faturas_pagas
         (cartao_id, user_id, competencia_ano, competencia_mes, valor_pago, data_pagamento)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING ${PAG_COLS}`,
      [cartaoId, userId, ano, mes, fromCents(totalCents), dataPgto],
    );
    await client.query("COMMIT");
    res.status(201).json({
      pagamento: ins.rows[0],
      fatura: calcularFatura(cartao, lanc, ano, mes, ins.rows[0]),
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505") return res.status(409).json({ error: "Esta fatura já foi paga." });
    next(err);
  } finally {
    client.release();
  }
};

exports.estornarPagamentoFatura = async (req, res, next) => {
  const userId = req.user.userId;
  const cartaoId = parseId(req.params.id);
  const ano = parseId(req.params.ano);
  const mes = parseId(req.params.mes);
  if (cartaoId === null || ano === null || mes === null || mes < 1 || mes > 12) {
    return res.status(400).json({ error: "Identificador inválido." });
  }
  try {
    const del = await pool.query(
      `DELETE FROM cartoes_faturas_pagas
       WHERE cartao_id = $1 AND user_id = $2 AND competencia_ano = $3 AND competencia_mes = $4
       RETURNING id`,
      [cartaoId, userId, ano, mes],
    );
    if (del.rowCount === 0) return res.status(404).json({ error: "Pagamento de fatura não encontrado." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
