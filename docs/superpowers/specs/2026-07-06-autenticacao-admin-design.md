# Autenticação, perfis e administração — Design (iteração 3)

**Data:** 2026-07-06 · **Status:** Aprovado em conversa

## Objetivo

Autenticar usuários (login/reset por e-mail), vincular chamados ao usuário logado,
introduzir 3 perfis (Solicitante, Atendente, Admin), tornar as configurações do
sistema dinâmicas (banco, sem hardcode) e endurecer a segurança da aplicação.

## Decisões aprovadas

- **Sessão + cookie httpOnly** (token opaco, hash SHA-256 no banco, revogável).
- **Só admin cria usuários** — não há registro público. Admin cadastra nome/e-mail/
  perfil e o sistema envia **convite por e-mail** com link para definir a senha
  (mesmo mecanismo do reset; senha nunca circula).
- **SMTP corporativo Proma** — credenciais entram pela tela de configurações do
  admin (banco). Sem SMTP configurado, e-mails são simulados no console (dev).
- **Recomeço limpo** — tabela `chamados` refeita com FKs de usuário.

## Modelo de dados (migration 002)

| Tabela | Campos principais |
|---|---|
| `perfis` | nome único, `pode_abrir`, `pode_atender`, `pode_administrar` (bool). Seeds: Solicitante (abrir), Atendente (abrir+atender), Admin (tudo) |
| `usuarios` | nome, e-mail único, `senha_hash` (bcrypt, nulo até aceitar convite), `perfil_id` FK, `ativo` |
| `sessoes` | `usuario_id`, `token_hash` (sha256, único), `expira_em`, ip, user_agent |
| `tokens_senha` | `usuario_id`, `token_hash`, tipo (`convite`/`reset`), `expira_em`, `usado_em` |
| `configuracoes` | chave (PK), valor, descrição, `secreta` (mascara na API) |
| `chamados` | refeita: `solicitante_id` FK, `atendente_id` FK nulo, sem campo texto `operador` |

### Configurações dinâmicas (seeds)

`smtp_host`, `smtp_porta`, `smtp_usuario`, `smtp_senha` (secreta), `smtp_remetente`,
`app_url`, `sessao_duracao_horas` (12), `reset_validade_min` (30),
`convite_validade_horas` (168), `senha_min_tamanho` (8).
Lidas do banco a cada uso — mudanças valem sem restart.

## API

### Auth (`/api/auth`)
- `POST /login` {email, senha} → cookie `proma_sessao` + usuário. Erro genérico
  "credenciais inválidas" (sem enumeração). Rate-limited.
- `POST /logout` → apaga sessão + cookie.
- `GET /eu` → usuário logado com permissões do perfil.
- `POST /esqueci-senha` {email} → **sempre 200**; se existir, envia e-mail. Rate-limited.
- `POST /redefinir-senha` {token, senha} → valida token (uso único, validade),
  aplica política de senha, troca hash e **derruba todas as sessões** do usuário.
  Atende reset e convite.

### Chamados (mudanças)
- `POST /chamados` exige `pode_abrir`; `solicitante_id` = usuário logado (sem campo operador no payload).
- `GET /chamados` exige autenticação (todos veem a fila).
- `PATCH /chamados/:id/status` exige `pode_atender`; "assumir" grava `atendente_id`.
- `GET /events` (SSE) exige autenticação (cookie).
- Respostas incluem `solicitante_nome` e `atendente_nome` (join).

### Admin (`pode_administrar`)
- `GET/POST/PATCH /api/usuarios` — criar envia convite; desativar em vez de excluir;
  `POST /:id/reenviar-convite`.
- `GET/POST/PATCH/DELETE /api/perfis` — excluir só se sem usuários.
- `GET/PATCH /api/configuracoes` — secretas mascaradas na leitura;
  `POST /api/configuracoes/testar-email` envia e-mail de teste.

## E-mail

`nodemailer`; transporter montado das configurações a cada envio. Templates HTML
(funções TS, estilos inline, identidade PROMA industrial em fundo claro para
compatibilidade com clientes de e-mail): **convite** e **redefinição**.
Links usam `app_url` + rota `/redefinir-senha?token=…`.

## Frontend

- **AuthContext**: `GET /auth/eu` na carga; expõe usuário/permissões; login/logout.
- **Login** — página cheia fora do shell, mesmo design system (grafite + âmbar,
  Chakra Petch/Barlow/Plex Mono), GearCanvas ao fundo, entrada orquestrada
  (framer-motion), erro como placa estampada. Awwwards.
- **Esqueci/Redefinir senha** — mesmo layout de cartão central; redefinir lê `?token=`.
- **Rotas protegidas** por permissão; nav condicional; header com usuário + sair.
- **Abrir Chamado**: campo Operador removido (usa o usuário logado).
- **Painel**: botões Assumir/Concluir só para `pode_atender`; mostra quem abriu/atende.
- **Admin** (`/admin`): abas Usuários (CRUD + convite), Perfis (CRUD + permissões),
  Configurações (edição inline + teste de SMTP).

## Segurança (revisão geral)

- `helmet` (headers), `express-rate-limit` (login 10/15min, reset 5/15min por IP),
  `express.json({limit:'100kb'})`.
- Cookie `httpOnly + SameSite=Lax` (+ `secure` via env em produção) — bloqueia XSS
  de token e CSRF de formulário.
- bcrypt custo 12; tokens aleatórios (32 bytes) guardados só como hash.
- Sem CORS aberto (o dev usa proxy same-origin do Vite; cross-origin é negado).
- Handler global de erros (500 genérico, detalhe só no log do servidor).
- Knex parametrizado (SQLi) e React com escape padrão (XSS).
- Admin inicial via seed lendo `ADMIN_NOME/ADMIN_EMAIL/ADMIN_SENHA` do `.env`.

## Fases

A) migrations+seeds → B) auth core TDD → C) e-mail/templates → D) chamados+permissões
→ E) API admin → F) frontend (login/reset/contexto/admin) → G) hardening + e2e.
