/**
 * Helpers determinísticos para identificação e filtragem de compras parceladas.
 * O padrão de parcelamento do sistema usa o sufixo "(k/N)" na descrição.
 */

const PARCELA_REGEX = /\((\d{1,3})\/(\d{1,3})\)$/;

function parseParcelaInfo(descricao) {
  if (typeof descricao !== "string") return null;
  const match = descricao.trim().match(PARCELA_REGEX);
  if (!match) return null;
  const numero = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (!Number.isInteger(numero) || !Number.isInteger(total)) return null;
  if (total < 2 || numero < 1 || numero > total) return null;
  return { numero, total };
}

function isParcelaSubsequenteFutura(transacao, dataRef) {
  if (!transacao || transacao.tipo !== "despesa") return false;
  const info = parseParcelaInfo(transacao.descricao);
  if (!info || info.numero < 2) return false;
  const dataStr = String(transacao.data || "").slice(0, 10);
  return Boolean(dataStr && dataRef && dataStr > dataRef);
}

function isParcelaVincenda(transacao, dataRef) {
  if (!transacao || transacao.tipo !== "despesa") return false;
  const info = parseParcelaInfo(transacao.descricao);
  if (!info) return false;
  const dataStr = String(transacao.data || "").slice(0, 10);
  return Boolean(dataStr && dataRef && dataStr > dataRef);
}

const SQL_CASE_PARCELA = `(
  t.tipo = 'despesa'
  AND CASE
    WHEN t.descricao ~ '\\([0-9]{1,3}/[0-9]{1,3}\\)$' THEN
      substring(t.descricao from '\\(([0-9]{1,3})/[0-9]{1,3}\\)$')::int >= 1
      AND substring(t.descricao from '\\([0-9]{1,3}/([0-9]{1,3})\\)$')::int >= 2
      AND substring(t.descricao from '\\(([0-9]{1,3})/[0-9]{1,3}\\)$')::int <= substring(t.descricao from '\\([0-9]{1,3}/([0-9]{1,3})\\)$')::int
    ELSE false
  END
)`;

const SQL_CASE_PARCELA_SUBSEQUENTE = `(
  t.tipo = 'despesa'
  AND CASE
    WHEN t.descricao ~ '\\([0-9]{1,3}/[0-9]{1,3}\\)$' THEN
      substring(t.descricao from '\\(([0-9]{1,3})/[0-9]{1,3}\\)$')::int >= 2
      AND substring(t.descricao from '\\([0-9]{1,3}/([0-9]{1,3})\\)$')::int >= 2
      AND substring(t.descricao from '\\(([0-9]{1,3})/[0-9]{1,3}\\)$')::int <= substring(t.descricao from '\\([0-9]{1,3}/([0-9]{1,3})\\)$')::int
    ELSE false
  END
)`;

module.exports = {
  parseParcelaInfo,
  isParcelaSubsequenteFutura,
  isParcelaVincenda,
  SQL_CASE_PARCELA,
  SQL_CASE_PARCELA_SUBSEQUENTE,
};

