# Sistema de Abertura de Chamados de Manutenção — Design

**Data:** 2026-07-06
**Status:** Aprovado (aguardando revisão do spec)

## 1. Objetivo

Permitir que o operador de fábrica abra um chamado de manutenção para uma máquina, e
que a equipe de manutenção acompanhe e atenda esses chamados em tempo real, sem
recarregar a página. O tempo real é entregue via **Server-Sent Events (SSE)**.

## 2. Escopo (MVP)

Incluído:
- Operador abre chamado (formulário).
- Painel da manutenção lista os chamados ao vivo (SSE).
- Contador de chamados abertos/urgentes atualizando ao vivo.
- Fluxo de status em 3 estados: `aberto → em_atendimento → concluido`.
- Migrations e seeds automáticas para MySQL.

Fora de escopo (por enquanto):
- Login / autenticação (operador apenas digita nome/matrícula).
- Técnico responsável nomeado e observação de solução.
- Cancelamento de chamados.
- Notificações por e-mail/push.

## 3. Arquitetura

Monorepo com duas pastas independentes:

```
/backend    → Node.js + TypeScript + Express + Knex + MySQL
/frontend   → React + Vite + TypeScript
```

As duas partes se comunicam por HTTP:
- REST para criar/listar/atualizar chamados.
- Um endpoint SSE (`GET /api/events`) para o fluxo de eventos em tempo real.

### 3.1 Decisões de tecnologia

- **Knex.js** como camada de dados: query builder com CLI de migrations e seeds de
  primeira classe (`knex migrate:latest`, `knex seed:run`). Escolhido por atender
  diretamente o pedido de "migrations e seeds automáticas" com pouca cerimônia.
- **Express** para HTTP + SSE.
- **EventSource** nativo do navegador no frontend (sem biblioteca extra para SSE).
- Credenciais do banco em `.env` (não versionado); um `.env.example` documenta as chaves.

## 4. Backend

### 4.1 Módulos (isolados, uma responsabilidade cada)

- `db/` — configuração do Knex (conexão MySQL, `knexfile`).
- `chamados/` — `chamados.service.ts` (regras + acesso ao banco) e
  `chamados.routes.ts` (endpoints REST).
- `sse/` — `sse.broker.ts` (mantém as conexões abertas e faz broadcast) e
  `sse.routes.ts` (endpoint `GET /api/events`).
- `app.ts` — monta o Express, middlewares (JSON, CORS), rotas.
- `server.ts` — sobe o servidor HTTP.

### 4.2 Broker SSE (em memória)

- Mantém um array de respostas HTTP (`res`) das conexões abertas.
- `subscribe(res)` — adiciona a conexão, envia headers SSE, remove no `close`.
- `broadcast(evento, dados)` — escreve `event:` + `data:` (JSON) em todas as conexões.
- Eventos emitidos:
  - `chamado:criado` — payload é o chamado recém-criado.
  - `chamado:atualizado` — payload é o chamado com o novo status.
- Envia um comentário `:keep-alive` periódico (a cada ~25s) para evitar que proxies
  fechem a conexão ociosa.

Limitação aceita no MVP: o broker é em memória e funciona para **uma** instância do
servidor. Escalar para múltiplas instâncias exigiria um pub/sub (ex.: Redis) — fora
de escopo.

### 4.3 API REST

| Método | Rota | Descrição | Efeito SSE |
|---|---|---|---|
| `POST` | `/api/chamados` | Cria um chamado | emite `chamado:criado` |
| `GET` | `/api/chamados` | Lista chamados (filtro opcional `?status=`) | — |
| `PATCH` | `/api/chamados/:id/status` | Altera o status | emite `chamado:atualizado` |
| `GET` | `/api/events` | Stream SSE | mantém conexão aberta |

Validação: `POST` valida campos obrigatórios e valores de enum; retorna `400` com
mensagem em caso de erro. `PATCH` valida a transição de status permitida.

Transições de status válidas:
- `aberto → em_atendimento`
- `em_atendimento → concluido`

## 5. Modelo de dados

### Tabela `chamados`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `maquina` | VARCHAR(120) | nome/código/tag da máquina |
| `setor` | VARCHAR(120) | setor/linha da fábrica |
| `tipo_problema` | ENUM(`eletrico`,`mecanico`,`hidraulico`,`software`,`outro`) | |
| `prioridade` | ENUM(`baixa`,`media`,`alta`,`urgente`) | |
| `descricao` | TEXT | descrição livre do problema |
| `operador` | VARCHAR(120) | nome/matrícula de quem abriu |
| `maquina_parada` | BOOLEAN | produção interrompida? |
| `status` | ENUM(`aberto`,`em_atendimento`,`concluido`) | default `aberto` |
| `criado_em` | TIMESTAMP | default now |
| `atualizado_em` | TIMESTAMP | atualiza on update |

### Migrations e seeds

- **Migration** `001_create_chamados` cria a tabela acima.
- **Seed** `seed_chamados` insere alguns chamados de exemplo (máquinas/setores
  variados, prioridades e status diferentes) para o painel já iniciar populado.

## 6. Frontend (React + Vite + TypeScript)

### 6.1 Telas

1. **Abrir Chamado** (`/`)
   - Formulário com: máquina, setor, tipo de problema (select), prioridade (select),
     descrição (textarea), operador, "máquina parada?" (checkbox).
   - Ao enviar: `POST /api/chamados`; mostra confirmação e limpa o formulário.

2. **Painel Manutenção** (`/painel`)
   - Topo: contadores ao vivo — total de abertos, em atendimento, e urgentes.
   - Lista/cards de chamados ordenados (urgentes e parados primeiro).
   - Cada card: dados do chamado + botões contextuais:
     - status `aberto` → botão **Assumir** (`PATCH .../status` para `em_atendimento`).
     - status `em_atendimento` → botão **Concluir** (`PATCH .../status` para `concluido`).
   - Destaque visual para `maquina_parada` e prioridade `urgente`.

### 6.2 Tempo real

- Hook `useSSE` abre um `EventSource('/api/events')`.
- Ao receber `chamado:criado` → adiciona o chamado à lista e atualiza contadores.
- Ao receber `chamado:atualizado` → substitui o chamado na lista pelo novo estado.
- Reconecta automaticamente (comportamento nativo do `EventSource`).

### 6.3 Comunicação com o backend

- Vite configurado com **proxy** de `/api` para o backend (evita problema de CORS em dev).
- Camada `api.ts` centraliza as chamadas `fetch`.

## 7. Tratamento de erros

- Backend: respostas de erro padronizadas `{ error: string }` com status HTTP
  apropriado (`400` validação, `404` chamado inexistente, `500` erro interno).
- SSE: `keep-alive` periódico; limpeza da conexão no evento `close`.
- Frontend: mensagens de erro no formulário; se o `EventSource` cair, o navegador
  reconecta sozinho.

## 8. Testes

- Backend: testes do `chamados.service` (criação e transições de status válidas/
  inválidas) e do `sse.broker` (subscribe/broadcast). Ferramenta: Vitest.
- Frontend: teste do hook `useSSE` reagindo a eventos e um teste de render do
  formulário. Ferramenta: Vitest + Testing Library.

## 9. Como rodar (visão geral)

1. `backend`: configurar `.env` (conexão MySQL), `npm install`,
   `npm run migrate`, `npm run seed`, `npm run dev`.
2. `frontend`: `npm install`, `npm run dev`.
3. Abrir o Vite no navegador; usar `/` para abrir chamados e `/painel` para acompanhar.
