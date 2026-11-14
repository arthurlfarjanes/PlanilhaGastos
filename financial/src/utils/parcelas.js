const PARCELA_REGEX = /\((\d{1,3})\/(\d{1,3})\)$/;

export function parseParcelaInfo(descricao) {
  if (typeof descricao !== "string") return null;
  const match = descricao.trim().match(PARCELA_REGEX);
  if (!match) return null;
  const numero = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (!Number.isInteger(numero) || !Number.isInteger(total)) return null;
  if (total < 2 || numero < 1 || numero > total) return null;
  return { numero, total };
}

export function isParcelaSubsequenteFutura(transacao, dataRef) {
  if (!transacao || transacao.tipo !== "despesa") return false;
  const info = parseParcelaInfo(transacao.descricao);
  if (!info || info.numero < 2) return false;
  const dataStr = String(transacao.data || "").slice(0, 10);
  return Boolean(dataStr && dataRef && dataStr > dataRef);
}

export function isParcelaVincenda(transacao, dataRef) {
  if (!transacao || transacao.tipo !== "despesa") return false;
  const info = parseParcelaInfo(transacao.descricao);
  if (!info) return false;
  const dataStr = String(transacao.data || "").slice(0, 10);
  return Boolean(dataStr && dataRef && dataStr > dataRef);
}

