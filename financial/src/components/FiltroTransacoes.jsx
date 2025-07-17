import React from "react";

function FiltroTransacoes({ filtros, setFiltros, categorias }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      descricao: "",
      tipo: "",
      categoriaId: "",
      dataInicio: "",
      dataFim: "",
    });
  };

  return (
    <div className="filtro-container">
      <h3>Filtrar Transações</h3>
      <div className="filtro-grid">
        <input
          type="text"
          name="descricao"
          placeholder="Pesquisar por descrição..."
          value={filtros.descricao}
          onChange={handleInputChange}
          className="filtro-item"
        />
        <select
          name="tipo"
          value={filtros.tipo}
          onChange={handleInputChange}
          className="filtro-item"
        >
          <option value="">Todos os Tipos</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <select
          name="categoriaId"
          value={filtros.categoriaId}
          onChange={handleInputChange}
          disabled={filtros.tipo === "receita"}
          className="filtro-item"
        >
          <option value="">Todas as Categorias</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nome}
            </option>
          ))}
        </select>
        <div className="filtro-item">
          <label>De:</label>
          <input
            type="date"
            name="dataInicio"
            value={filtros.dataInicio}
            onChange={handleInputChange}
          />
        </div>
        <div className="filtro-item">
          <label>Até:</label>
          <input
            type="date"
            name="dataFim"
            value={filtros.dataFim}
            onChange={handleInputChange}
          />
        </div>
        <button onClick={limparFiltros} className="filtro-btn-limpar">
          Limpar Filtros
        </button>
      </div>
    </div>
  );
}

export default FiltroTransacoes;
