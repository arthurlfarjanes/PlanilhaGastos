import React from "react";

// Função para formatar os valores em Reais (R$)
const formatCurrency = (value) => {
  const numberValue = parseFloat(value);
  if (isNaN(numberValue)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
};

function ListaTransacoes({ transacoes, onEdit, onDelete }) {
  if (transacoes.length === 0) {
    return (
      <p className="nenhuma-transacao">
        Nenhuma transação encontrada para os filtros selecionados.
      </p>
    );
  }

  return (
    <div className="lista-transacoes">
      <ul>
        {transacoes.map((transacao) => (
          <li key={transacao.id} className={`transacao-item ${transacao.tipo}`}>
            <div className="transacao-info">
              <span className="transacao-descricao">{transacao.descricao}</span>
              <span className="transacao-categoria">
                {transacao.tipo === "despesa"
                  ? transacao.categoria_nome || "Sem Categoria"
                  : "Receita"}
              </span>
              <span className="transacao-data">
                {new Date(transacao.data).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}
              </span>
            </div>
            <div className="transacao-valor-acoes">
              {/* ** APLICA A FORMATAÇÃO DE MOEDA AQUI ** */}
              <span className={`transacao-valor ${transacao.tipo}`}>
                {formatCurrency(transacao.valor)}
              </span>
              <div className="transacao-acoes">
                <button
                  className="btn-editar"
                  onClick={() => onEdit(transacao)}
                >
                  Editar
                </button>
                <button
                  className="btn-excluir"
                  onClick={() => onDelete(transacao.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ListaTransacoes;
