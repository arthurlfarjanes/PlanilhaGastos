# 💳 MeFinance

> O **MeFinance** é uma aplicação web moderna e responsiva para gerenciamento de finanças pessoais. Ele permite que os usuários registrem suas receitas e despesas, gerenciem categorias personalizadas com cores dinâmicas e visualizem o fluxo de caixa através de painéis e gráficos interativos.

---

## ✨ Funcionalidades Principais

*   **🔐 Autenticação Dupla:** Suporte para login tradicional (usuário e senha criptografada) e **Login com o Google** (OAuth 2.0).
*   **📊 Dashboard Interativo:** Gráficos responsivos (Pizza, Barras e Área) para análise de Receitas vs. Despesas, Top 5 Gastos e Fluxo Diário.
*   **💸 Gestão de Transações:** Registro de receitas, despesas e suporte nativo para **compras parceladas**.
*   **🏷️ Categorias Inteligentes:** Criação de categorias personalizadas com seletor de cores e algoritmo de sorteio de cores (para facilitar a visualização nos gráficos).
*   **🔍 Filtros em Tempo Real:** Tabela de extrato com filtros avançados no lado do cliente (por descrição, tipo e categoria) garantindo máxima performance sem recarregar a página.
*   **📱 Design Responsivo:** Interface "Mobile-First" construída com Tailwind CSS para funcionar perfeitamente em celulares, tablets e desktops.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
*   **React (Vite):** Biblioteca principal para construção da interface.
*   **Tailwind CSS:** Framework de estilização utilitária para um design moderno e responsivo.
*   **Recharts:** Biblioteca para renderização dos gráficos financeiros.
*   **React Router DOM:** Para navegação SPA (Single Page Application).
*   **Lucide React:** Biblioteca de ícones elegantes.
*   **React OAuth/Google:** Integração com o Google Sign-In.

### Backend
*   **Node.js & Express:** Servidor da API RESTful.
*   **PostgreSQL:** Banco de dados relacional (via biblioteca `pg`).
*   **JWT (JSON Web Token):** Para autenticação e proteção de rotas.
*   **Bcryptjs:** Para hash e segurança das senhas no banco.
*   **Google Auth Library:** Para validação segura dos tokens do Google no servidor.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
Antes de começar, você precisará ter instalado em sua máquina as seguintes ferramentas:
*   [Git](https://git-scm.com)
*   [Node.js](https://nodejs.org/en/)
*   [PostgreSQL](https://www.postgresql.org/)

### 1. Clonando o repositório
```bash
git clone [https://github.com/SEU_USUARIO/PlanilhaGastos.git](https://github.com/SEU_USUARIO/PlanilhaGastos.git)
cd PlanilhaGastos
```

### 2. Configurando o Backend
Navegue até a pasta do backend, instale as dependências e configure o ambiente:
```bash
cd financial-backend
npm install
```

Crie um arquivo `.env` na raiz da pasta `financial-backend` com as seguintes chaves:
```env
PORT=3001
DATABASE_URL=sua_string_de_conexao_do_postgresql
JWT_SECRET=uma_chave_secreta_muito_segura
FRONTEND_DEV_URL=http://localhost:5173
FRONTEND_PROD_URL=[https://mefinance.netlify.app](https://mefinance.netlify.app)
GOOGLE_CLIENT_ID=seu_client_id_do_google.apps.googleusercontent.com
```

Inicie o servidor:
```bash
npm run dev # ou node server.js
```

### 3. Configurando o Frontend
Abra um novo terminal, navegue até a pasta do frontend, instale as dependências e configure o ambiente:
```bash
cd financial
npm install
```

Crie um arquivo `.env` na raiz da pasta `financial` com as seguintes chaves:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=seu_client_id_do_google.apps.googleusercontent.com
```

Inicie a aplicação:
```bash
npm run dev
```
A aplicação estará disponível em `http://localhost:5173`.

---

## ☁️ Deploy

A aplicação está configurada para CI/CD continuo com as seguintes plataformas de hospedagem gratuitas:
*   **Frontend:** Hospedado na [Netlify](https://www.netlify.com/).
*   **Backend:** Hospedado no [Render](https://render.com/).
*   **Banco de Dados:** PostgreSQL hospedado em nuvem.

---

## 🤝 Contribuição

Contribuições são sempre bem-vindas! Se você tem alguma sugestão para melhorar o MeFinance, sinta-se à vontade para fazer um *fork* do repositório e abrir um *Pull Request*.

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/NovaFuncionalidade`)
3. Faça o Commit de suas alterações (`git commit -m 'Add: Nova Funcionalidade'`)
4. Faça o Push para a Branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

---

📝 **Licença**

Este projeto é de código aberto e está disponível sob os termos da licença MIT.
