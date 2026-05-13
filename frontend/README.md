# Frontend — Cerimoniários PNSG

Este repositório contém a aplicação frontend (Vite + React + TypeScript) usada para gerenciar Locais, Usuários e Escalas.

Sumário rápido
- Tech: React 18, Vite, TypeScript, Axios.
- Estrutura principal: `src/App.tsx` (shell SPA), `src/pages/*` (páginas), `src/components/*` (formularios e componentes), `src/styles.css` (estilos globais).

Instalação e execução
1. Instale dependências:

   ```bash
   cd frontend
   npm install
   ```

2. Rodar em desenvolvimento (Vite):

   ```bash
   npm run dev
   ```

3. Build de produção:

   ```bash
   npm run build
   npm run preview
   ```

Configuração de API
- A base da API é definida em `src/App.tsx` com:
  - `http://localhost:4000/api` no ambiente de desenvolvimento (quando `import.meta.env.DEV` é `true`)
  - `/api` em produção (proxy reverso esperado em produção).
- Endpoints usados:
  - `GET /locations` — lista de locais
  - `POST /locations` — cria local
  - `GET /locations/:id`, `POST /locations/:id`, `DELETE /locations/:id`
  - `GET /users`, `POST /users`, `GET /users/:id`, `POST /users/:id`, `DELETE /users/:id`
  - `GET /shift-templates` e `GET /occurrences` (back-end já implementado mas UI ainda em construção)

Roteamento e navegação
- A aplicação usa History API (pushState / popstate) em `App.tsx` — não usa react-router.
- Rotas suportadas atualmente:
  - `/` — dashboard
  - `/locations` — lista de locais
  - `/locations/new` — criador de local (página/editor)
  - `/locations/:id` — editor do local
  - `/users`, `/users/new`, `/users/:id`
  - `/templates` — placeholder (em breve)

UX importantes
- Botão de adicionar: botão flutuante (FAB) no canto inferior direito (`.fab`) — abre a página/rota de criação.
- Listas: `Locations` e `Users` usam uma tabela (`.data-table`) dentro de um container rolável (`.table-wrap`). A rolagem horizontal é limitada ao container da tabela para manter a página responsiva.
- Coluna de ações: a coluna com ações (apagar) foi implementada para ficar fixa (sticky) dentro do container para facilitar o uso em telas pequenas. Se quiser alterar esse comportamento, edite `src/styles.css` procurando por `.actions-col` / `.td-actions`.
- Editor: edição/criação abre uma tela editor (`src/pages/LocationEditor.tsx`, `src/pages/UserEditor.tsx`) — contém Salvar, Limpar, Fechar e Apagar.

Como contribuir / ajustar estilos
- Arquivo de estilos principal: `src/styles.css`. Pontos comuns para customizar:
  - FAB: `.fab`
  - Tabela: `.table-wrap`, `.data-table`, `.actions-col`, `.td-actions`
  - Formulários: `.form-card`, `.input`, `.btn`

Depuração rápida
- Se o frontend mostrar erro `vite: command not found` — execute `npm install` em `frontend`.
- Verifique a URL da API em `src/App.tsx` se ocorrer `Network Error` ou `ECONNREFUSED`.
- Use DevTools → Elements para checar se o `.fab` está visível (z-index / display).

Testes manuais recomendados
- Verifique CRUD de Locais/Usuários:
  - Criar via FAB → preencher formulário → salvar.
  - Editar ao clicar na linha → alterar campos → salvar.
  - Apagar usando o botão de lixeira (confirmação do browser).
- No mobile viewport: confirmar que a página não faz scroll horizontal, apenas a tabela (`.table-wrap`) quando necessário.

Notas finais
- O frontend foi desenhado para ser minimal e funcionar com a API local em `http://localhost:4000/api` durante desenvolvimento. Ajustes extra (ícones SVG, modais animados, toast notifications) podem ser adicionados conforme necessidade.

Se quiser, eu: 
- Converto os editores para modais estilizados em vez de páginas, ou
- Troco emojis por SVGs e adiciono toasts para confirmações (mais profissional).

