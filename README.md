# Sistema de Chamados de Manutenção (SSE)

O operador de fábrica abre chamados de manutenção para máquinas; a equipe de
manutenção acompanha e atende em **tempo real** via Server-Sent Events (SSE).

Com **autenticação** (sessão httpOnly), **3 perfis** (Solicitante, Atendente,
Admin), convite/reset de senha por **e-mail SMTP** e **configurações dinâmicas**
gerenciadas pelo admin — sem hardcode e sem restart.

## Acesso inicial (dev)

O seed cria três contas (defina `ADMIN_*` no `.env` para trocar o admin):

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `admin@proma.local` | `admin1234` |
| Atendente | `ana.souza@proma.local` | `atendente1234` |
| Solicitante | `carlos.silva@proma.local` | `solicitante1234` |

> Troque essas senhas em qualquer ambiente que não seja de desenvolvimento.
> SMTP: configure host/porta/credenciais em **Admin → Configurações** — sem SMTP,
> os e-mails (convite/reset) são simulados no console do backend.

## Requisitos
- Node.js 20+
- MySQL rodando

## Backend
```bash
cd backend
cp .env.example .env   # ajuste as credenciais do MySQL
# crie o banco (ajuste usuário se necessário):
#   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS chamados;"
npm ci
npm run migrate        # aplica todas as migrations
npm run seed           # DEV ONLY: apaga dados e carrega exemplos
npm run dev            # http://localhost:3001
```

## Atualização de banco existente

Pare o backend e confirme um backup restaurável antes de executar:

```bash
cd backend
npm run migrate
```

A migration 002 preserva os chamados criados pelo schema 001. Cada valor
distinto de `operador` é convertido em um usuário inativo, sem senha e com
e-mail local não entregável. Esses usuários devem ser reconciliados com contas
reais pelo administrador.

Não execute `npm run seed` em um banco com dados. O seed é exclusivo para
desenvolvimento e limpa as tabelas antes de inserir os exemplos.

Para desfazer somente a última migration:

```bash
npm run migrate:down
```

O rollback restaura o campo `operador`, mas remove as tabelas de autenticação
introduzidas pela migration 002. Faça backup antes de qualquer rollback.

## Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Abra **`/`** para abrir chamados e **`/painel`** para acompanhar em tempo real.
Deixe o painel aberto numa aba e abra um chamado em outra — ele aparece
instantaneamente, sem recarregar.

## Testes
```bash
cd backend  && npm test
cd frontend && npm test
```

### Integração com MySQL

O usuário configurado no ambiente precisa poder criar e remover databases de
teste. A suíte cria somente databases temporários com prefixo
`proma_migration_test_`.

```bash
cd backend
npm run test:integration
```

## Como o SSE funciona aqui
- O backend expõe `GET /api/events` (um stream SSE).
- Um *broker* em memória mantém as conexões abertas e faz `broadcast` dos eventos
  `chamado:criado` e `chamado:atualizado` sempre que um chamado é criado ou tem o
  status alterado.
- O frontend usa o hook `useSSE` (baseado no `EventSource` nativo) para atualizar
  a lista e os contadores em tempo real.

## Endpoints REST
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/chamados` | Cria um chamado |
| `GET` | `/api/chamados` | Lista chamados (filtro `?status=`) |
| `PATCH` | `/api/chamados/:id/status` | Altera o status |
| `GET` | `/api/events` | Stream SSE |

Fluxo de status: `aberto → em_atendimento → concluido`.
