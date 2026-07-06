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
npm install
npm run migrate        # cria a tabela chamados
npm run seed           # popula com chamados de exemplo
npm run dev            # http://localhost:3001
```

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
