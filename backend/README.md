# Backend — Cerimoniários (API)

Breve introdução

Este serviço fornece a API para gerir locais, usuários, templates de escala (recorrências), ocorrências expandidas e atribuições do coordenador. Foi escrito em Node.js + TypeScript + Express + Mongoose e pensado para rodar localmente durante o desenvolvimento e em serverless (Vercel) em produção.

Requisitos

- Node.js (recomendo v18+)
- MongoDB (local ou Atlas)

Configuração

1. Copie o exemplo de env e configure sua URI do Mongo:

   cp .env.example .env
   # editar .env e colocar MONGO_URI

2. Instalar dependências e iniciar em modo desenvolvimento (na raiz do monorepo ou dentro da pasta backend):

   cd backend
   npm install
   npm run dev

   O servidor por padrão escuta na porta 4000 (ou PORT definido em .env).

Rotas principais (HTTP)

- Locations (locais das missas)
  - POST /api/locations
    - Criar local
    - Exemplo:
      curl -sS -X POST 'http://localhost:4000/api/locations' -H 'Content-Type: application/json' -d '{"name":"Igreja Matriz","description":"Capela central"}'
  - GET /api/locations
    - Listar todos
    - Ex.: curl -i 'http://localhost:4000/api/locations'
  - GET /api/locations/:id
  - POST /api/locations/:id (atualiza)
  - DELETE /api/locations/:id
  - DELETE /api/locations?confirm=yes (apaga todos — precisa confirmação)

- Users (usuários: servos, admins)
  - POST /api/users
    - Criar usuário
    - Ex.: curl -sS -X POST 'http://localhost:4000/api/users' -H 'Content-Type: application/json' -d '{"name":"João","email":"joao@example.com"}'
  - GET /api/users
  - GET /api/users/:id
  - POST /api/users/:id (atualiza)
  - DELETE /api/users/:id
  - DELETE /api/users?confirm=yes (apaga todos — precisa confirmação)

- Shift Templates (modelos de escala)
  - POST /api/shift-templates
    - Criar template com `recurrence` (tipos: single, weekly, monthlyByWeekday, monthlyByMonthday)
    - Campos importantes: title, locationId, time.start, users (array de user IDs), recurrence.startDate
    - Exemplo (semanal às segundas, startDate = 2026-05-18):
      curl -sS -X POST 'http://localhost:4000/api/shift-templates' -H 'Content-Type: application/json' -d '{"title":"Missa Semanal","locationId":"<LOCATION_ID>","time":{"start":"10:00"},"users":["<USER_ID>"],"recurrence":{"type":"weekly","weekly":{"interval":1,"weekdays":[1]},"startDate":"2026-05-18T00:00:00.000Z"}}'
  - GET /api/shift-templates
  - GET /api/shift-templates/:id
  - POST /api/shift-templates/:id (atualiza)
  - DELETE /api/shift-templates/:id
  - DELETE /api/shift-templates?confirm=yes (apaga todos — precisa confirmação)

Dicas de desenvolvimento

- Para testar o fluxo completo: crie um location, crie um user, crie um shift-template usando esses IDs e depois solicite /api/occurrences para ver os eventos gerados.
- Se uma rota retornar 500, veja o log no terminal do backend — há mensagens de erro detalhadas.
- Há proteção em endpoints de "delete all" exigindo `?confirm=yes` ou header `X-Confirm-Delete: true`.