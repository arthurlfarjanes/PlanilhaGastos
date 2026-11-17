# 💳 MeFinance

> O **MeFinance** é uma aplicação web moderna e responsiva para gerenciamento de finanças pessoais. Ele permite controlar fluxo de caixa, contas fixas, orçamentos, cartões de crédito, dívidas, patrimônio, objetivos financeiros, diagnósticos, otimização, projeções, relatórios CSV/PDF e contar com o apoio do **Teco**, o assistente financeiro com IA gratuita, central de ajuda interativa, tours guiados e gamificação saudável integrados exclusivamente aos dados da sua conta.

---

## 🦉 Conheça o Teco — Assistente Financeiro e Guia do MeFinance

<p align="center">
  <img src="./financial/public/teco-avatar.jpg" alt="Teco — Mascote Coruja do MeFinance" width="160" />
</p>

O **Teco** é o mascote oficial e guia financeiro do **MeFinance**, presente em `/assistente` (área **Inteligência**), na central **Teco Ajuda** (`/ajuda`) e de forma contextual pelas telas da aplicação:

*   **Provedores 100% Gratuitos (sem cartão e sem fallback pago):** Suporta **Cloudflare Workers AI** (`Workers Free` — até 10.000 Neurons/dia) e **Groq Free Tier** como segunda opção gratuita, com alternância manual em dropdown e oferta automática de troca quando a cota diária de um provedor se esgota.
*   **Dados Reais, Zero Alucinação de Cálculo:** Consulta exclusivamente **ferramentas determinísticas somente leitura** da conta autenticada (`obter_resumo_financeiro`, `gastos_por_categoria`, `orcamentos_e_alertas`, `cartoes_dividas_objetivos`, `obter_diagnosticos_financeiros`, `obter_plano_otimizacao`, `obter_projecoes_base`), exibindo transparência das fontes consultadas e do modelo/provedor que gerou cada resposta (inclusive no histórico salvo).
*   **Teco Ajuda & Tours Guiados Multi-Rota (Zero Cota de IA):** Central de ajuda interativa (`/ajuda` e atalho rápido no cabeçalho) com **15 tours guiados versionados** (incluindo walkthrough de primeiros passos entre múltiplas rotas), respeitando `reduceMotion`, acessibilidade por teclado e navegação restrita apenas a rotas internas permitidas.
*   **Teco Contextual & Cards Seguros:** Explicadores inline (`TecoHint`), atalhos contextuais por rota para o `/assistente` (`?origem=...`), cards de ação segura (navegação/abertura de tour sem alterar dados financeiros automaticamente) e caixa de feedback (*"Foi útil?"* / *"Instrução desatualizada"*).
*   **Gamificação Saudável (*Teco Academy*):** Progressão de até **1.000 XP**, **5 níveis de maestria** (*Aprendiz* a *Mestre MeFinance*), **15 badges por tela**, **5 certificados por trilha**, **Certificado Ouro MeFinance**, **5 missões práticas reais** (contabilizadas a partir do marco de ativação no ambiente) e **bônus de até +10 consultas diárias gratuitas** no Teco Assistente (sobre a base de 20/dia, respeitando sempre o teto gratuito global dos provedores).
*   **Suporte a Markdown & Guarda de Escopo:** Mensagens com suporte completo a Markdown (GFM) e **guarda determinístico pré-LLM** (`scopeGuard`) contra *prompt injection* e assuntos fora do domínio MeFinance, sem desperdiçar tokens/Neurons ou cota diária.

---

## ✨ Funcionalidades Principais

*   **🔐 Autenticação Dupla e Segurança Reforçada:** Login tradicional (Bcrypt com mitigação de *timing attacks*), **Login com o Google** (OAuth 2.0), revogação imediata de sessões JWT via `token_version` ao trocar/resetar senha ou desativar conta, revalidação de sessão (`/me`), validação estrita de entradas, rate limiting, Helmet e CORS restrito.
*   **🛡️ Painel Administrativo Auditado (`/admin`):** Interface em **6 abas responsivas** (**Visão Geral**, **Usuários**, **Auditoria**, **Logs**, **IA & Teco** e **Saúde**), controle de timezone IANA com instantes UTC (`TIMESTAMPTZ`), paginação e filtros server-side, trilha dedicada `admin_audit_logs`, proteção ao último administrador ativo, bloqueio de auto-rebaixamento, confirmação obrigatória de senha em ações críticas e **privacidade garantida** (sem exposição de transações privadas ou mensagens do chat `ai_messages`).
*   **🦉 Teco — Assistente IA, Ajuda & Conquistas (`/assistente`, `/ajuda`):** Chat financeiro gratuito, central de ajuda com tours passo a passo sem consumo de IA, missões práticas, badges e transparência de limites em tempo real.
*   **💸 Gestão de Transações & Parcelas Vincendas (`/dashboard`):** Registro de receitas, despesas e **compras parceladas** com máscara monetária, sugestão automática de categoria, vínculo opcional a cartão de crédito, filtro para exibir parcelas subsequentes apenas na data de vencimento e aba dedicada de **Parcelas Vincendas**.
*   **📊 Dashboard, Indicadores Consolidados & Comparativos (`/comparativo`):** Resumo instantâneo no Dashboard (com widgets de **Próximos Vencimentos** e **Alertas de Orçamento**) e página de **Comparativo** com faixa de **4 indicadores consolidados** (**Taxa de Economia**, **Comprometimento Fixo**, **Patrimônio Líquido** e **Objetivos & Lembretes**) e gráficos interativos.
*   **🧠 Diagnósticos, Classificação & Otimização (`/diagnosticos`, `/classificacao`, `/otimizacao`):** Diagnóstico de saúde financeira e pontos de atenção, motor de regras automáticas de categorização de lançamentos (`contains`, `starts_with`, `exact`) e plano determinístico de otimização e quitação.
*   **📈 Projeções & Simulador de Cenários (`/projecoes`):** Projeção financeira baseada no histórico fechado e patrimônio ponderado, com simulação interativa de aportes extras, inflação, dívidas, parcelas futuras e eventos únicos.
*   **📄 Relatórios Inteligentes & Privacidade LGPD (`/relatorios`, `/configuracoes`):** Exportação de relatórios executivos em **PDF** (`PDFKit`) e planilhas **CSV** (UTF-8 BOM com neutralização contra *CSV Formula Injection*), além de aba de **Privacidade** com exportação completa de dados em JSON e exclusão atômica da conta.
*   **🏷️ Categorias Inteligentes:** Criação e edição de categorias personalizadas com seletor de cores dinâmicas.
*   **📅 Contas Fixas, Vencimentos e Assinaturas (`/gastos-fixos`):** Controle mensal de despesas/receitas fixas e assinaturas, baixa rápida, agendamento automático diário sem duplicidade e estorno por competência.
*   **🎯 Orçamentos por Categoria (`/orcamentos`):** Definição de limites mensais por categoria com acompanhamento de consumo em tempo real e alertas de proximidade/excesso.
*   **📉 Dívidas, Amortizações e Simulador (`/dividas`):** Cadastro inteligente (cálculo automático via Tabela Price), comparação entre estratégias **Avalanche** e **Bola de Neve**, alteração rápida de status, simulador de aporte extra e **estorno bidirecional** sincronizado com transações.
*   **💳 Cartões de Crédito & Faturas (`/cartoes`):** Gestão de cartões, despesas integradas às transações, faturas calculadas pelo dia de fechamento, liquidação/estorno sem duplicidade, barra de progresso segmentada e aviso visual para transações de cartões excluídos.
*   **🏦 Patrimônio & Patrimônio Líquido (`/patrimonio`):** Controle de ativos e reservas (liquidez imediata vs. demais ativos), projeção estimada de rendimento (`% do CDI`, `% a.a.` ou `% a.m.`), histórico de aportes/resgates/ajustes sincronizado com o extrato e cálculo do Patrimônio Líquido (`ativos - passivos`).
*   **🏁 Objetivos Financeiros (`/objetivos`):** Metas com prazo, prioridade e status rápido, vinculação opcional a itens de patrimônio (sincronizando movimentações automaticamente e projetando conclusão com juros compostos) e estorno bidirecional no extrato.
*   **🔔 Notificações & Navegação em 5 Áreas:** Organização da navegação em **Visão Geral**, **Gestão**, **Planejamento**, **Inteligência** e **Sistema** (Sidebar com dropdown de conta ou Navbar), além de alertas automáticos configuráveis para vencimentos, faturas, orçamentos e objetivos.
*   **⚙️ Configurações & Personalização (`/configuracoes`):** Preferências persistidas no servidor para **Perfil**, **Aparência** (modo Claro/Escuro, layout Navbar/Sidebar, cor de destaque e acessibilidade/`reduceMotion`), **Dashboard**, **Financeiro** (moeda, idioma, fuso horário IANA), **Notificações**, **Inteligência Artificial**, **Ajuda** e **Privacidade**.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
*   **React 19 + Vite (com lazy routes & code splitting):** Interface SPA rápida e modular.
*   **Tailwind CSS v4 + Motion + `@base-ui/react` / shadcn-style UI:** Estilização utilitária responsiva com temas Claro/Escuro e acessibilidade (`reduceMotion`, `AppTooltip`, `ConfirmDialog`).
*   **React Markdown + Remark GFM:** Renderização segura de mensagens em Markdown no chat do Teco.
*   **Recharts & Three.js (`@react-three/fiber` / `drei`):** Gráficos financeiros interativos e cena 3D.
*   **React Router DOM v7:** Roteamento protegido por sessão e função (`admin`).
*   **Lucide React & Google OAuth (`@react-oauth/google`):** Ícones e autenticação Google.

### Backend
*   **Node.js & Express 5:** API RESTful protegida por `helmet`, `cors`, `express-rate-limit` e confirmação por senha em mutações administrativas críticas.
*   **PostgreSQL (Neon):** Banco relacional com SSL estrito por padrão, queries parametrizadas, transações ACID (`pg`), instantes em `TIMESTAMPTZ` e migrations versionadas (`000` a `017`).
*   **JWT (`jsonwebtoken`) + `token_version` & Bcryptjs:** Autenticação com revogação imediata de sessões e hash seguro de senhas.
*   **Google Auth Library:** Validação de tokens OAuth no servidor.
*   **PDFKit & Node-cron:** Geração de relatórios executivos em PDF e agendamento diário automático de transações fixas.
*   **Camada Agnóstica de IA Gratuita:** Integração direta via `fetch` com **Cloudflare Workers AI** (`Workers Free`) e **Groq Free Tier**, além de guarda de escopo determinístico (`scopeGuard`) e ferramentas somente leitura.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
Antes de começar, você precisará ter instalado em sua máquina:
*   [Git](https://git-scm.com)
*   [Node.js](https://nodejs.org/en/)
*   [PostgreSQL](https://www.postgresql.org/) (ou banco Neon PostgreSQL)

### 1. Clonando o repositório
```bash
git clone https://github.com/SEU_USUARIO/PlanilhaGastos.git
cd PlanilhaGastos
```

### 2. Configurando o Backend
Navegue até a pasta do backend, instale as dependências e configure o ambiente:
```bash
cd financial-backend
npm install
```

Crie um arquivo `.env` em `financial-backend/` baseado no `.env.example`:
```env
PORT=3001
DATABASE_URL=sua_string_de_conexao_do_postgresql
DATABASE_URL_DIRECT=sua_string_direta_para_migrations
JWT_SECRET=uma_chave_secreta_muito_segura
FRONTEND_DEV_URL=http://localhost:5173
FRONTEND_PROD_URL=https://mefinance.netlify.app
GOOGLE_CLIENT_ID=seu_client_id_do_google.apps.googleusercontent.com

# IA gratuita opcional (sem cartão)
AI_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.1-8b-instruct-fast

# Segunda opção gratuita opcional (Groq Free Tier)
GROQ_API_KEY=
GROQ_AI_MODEL=llama-3.1-8b-instant

AI_USER_DAILY_LIMIT=20
```

Execute as migrations no banco PostgreSQL e inicie o servidor:
```bash
npm run migrate
npm start
```

Para executar a suíte de testes unitários do backend:
```bash
npm test
```

### 3. Configurando o Frontend
Abra um novo terminal, navegue até a pasta do frontend, instale as dependências e configure o ambiente:
```bash
cd financial
npm install
```

Crie um arquivo `.env` em `financial/` com as seguintes chaves:
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

A aplicação está configurada para CI/CD contínuo com as seguintes plataformas:
*   **Frontend:** Hospedado na [Netlify](https://www.netlify.com/).
*   **Backend:** Hospedado no [Render](https://render.com/).
*   **Banco de Dados:** PostgreSQL hospedado no [Neon](https://neon.tech/).

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
