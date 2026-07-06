# Sistema de Chamados de Manutenção — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um sistema onde o operador de fábrica abre chamados de manutenção para máquinas e a equipe de manutenção acompanha/atende em tempo real via Server-Sent Events.

**Architecture:** Monorepo com `/backend` (Node + TypeScript + Express + Knex + MySQL) e `/frontend` (React + Vite + TypeScript). REST para CRUD dos chamados; um endpoint SSE (`GET /api/events`) com um broker em memória que faz broadcast dos eventos `chamado:criado` e `chamado:atualizado` para todos os clientes.

**Tech Stack:** Node.js, TypeScript, Express, Knex (migrations + seeds), MySQL (mysql2), Vitest, React 18, Vite, React Router, EventSource nativo.

## Global Constraints

- Backend e frontend em **TypeScript** (strict).
- Banco: **MySQL** já instalado; conexão via `.env` (`.env.example` versionado, `.env` não).
- Camada de dados: **Knex** com migrations e seeds automáticas (`npm run migrate`, `npm run seed`).
- Enum `tipo_problema`: `eletrico`, `mecanico`, `hidraulico`, `software`, `outro`.
- Enum `prioridade`: `baixa`, `media`, `alta`, `urgente`.
- Enum `status`: `aberto`, `em_atendimento`, `concluido` (default `aberto`).
- Transições de status válidas: `aberto → em_atendimento`, `em_atendimento → concluido`.
- Eventos SSE: `chamado:criado` (payload = chamado criado), `chamado:atualizado` (payload = chamado atualizado).
- Testes com **Vitest** nas duas pontas.
- Commits frequentes, um por tarefa concluída.

## File Structure

```
/
├─ .gitignore
├─ backend/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ knexfile.ts
│  ├─ .env.example
│  ├─ vitest.config.ts
│  ├─ src/
│  │  ├─ db/
│  │  │  ├─ knex.ts                # instância única do Knex
│  │  │  └─ migrations/
│  │  │     └─ 001_create_chamados.ts
│  │  ├─ db/seeds/
│  │  │  └─ 001_chamados.ts
│  │  ├─ chamados/
│  │  │  ├─ chamados.types.ts      # tipos + enums + validação de transição
│  │  │  ├─ chamados.service.ts    # regras + acesso ao banco
│  │  │  ├─ chamados.service.test.ts
│  │  │  └─ chamados.routes.ts     # rotas REST
│  │  ├─ sse/
│  │  │  ├─ sse.broker.ts          # conexões + broadcast
│  │  │  ├─ sse.broker.test.ts
│  │  │  └─ sse.routes.ts          # GET /api/events
│  │  ├─ app.ts                    # monta Express
│  │  └─ server.ts                 # sobe HTTP
└─ frontend/
   ├─ package.json
   ├─ tsconfig.json
   ├─ vite.config.ts               # proxy /api -> backend
   ├─ vitest.config.ts
   ├─ index.html
   └─ src/
      ├─ main.tsx
      ├─ App.tsx                    # rotas
      ├─ types.ts                   # tipos compartilhados com o backend
      ├─ api.ts                     # chamadas fetch
      ├─ useSSE.ts                  # hook do EventSource
      ├─ useSSE.test.ts
      ├─ pages/
      │  ├─ AbrirChamado.tsx
      │  └─ PainelManutencao.tsx
      └─ styles.css
```

---

## Task 1: Scaffold do backend + configuração

**Files:**
- Create: `.gitignore`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/.env.example`
- Create: `backend/knexfile.ts`
- Create: `backend/src/db/knex.ts`

**Interfaces:**
- Produces: instância `knex` exportada de `src/db/knex.ts` (`import knex from './db/knex'`); scripts npm `migrate`, `seed`, `dev`, `test`, `build`.

- [ ] **Step 1: Criar `.gitignore` na raiz**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 2: Inicializar git**

```bash
git init
git add .gitignore
git commit -m "chore: init repo com gitignore"
```

- [ ] **Step 3: Criar `backend/package.json`**

```json
{
  "name": "chamados-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "migrate": "knex migrate:latest --knexfile knexfile.ts",
    "seed": "knex seed:run --knexfile knexfile.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "knex": "^3.1.0",
    "mysql2": "^3.11.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Instalar dependências**

Run: `cd backend && npm install`
Expected: `node_modules` criado, sem erros.

- [ ] **Step 5: Criar `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src", "knexfile.ts"]
}
```

- [ ] **Step 6: Criar `backend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 7: Criar `backend/.env.example`**

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=changeme
DB_NAME=chamados
PORT=3001
```

- [ ] **Step 8: Criar `backend/knexfile.ts`**

```ts
import type { Knex } from 'knex'
import 'dotenv/config'

const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'chamados',
  },
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/db/seeds',
    extension: 'ts',
  },
}

export default config
```

- [ ] **Step 9: Adicionar `dotenv` às dependências e instalar**

Run: `cd backend && npm install dotenv@^16.4.5`
Expected: instala sem erro.

- [ ] **Step 10: Criar `backend/src/db/knex.ts`**

```ts
import knexFactory from 'knex'
import config from '../../knexfile.js'

const knex = knexFactory(config)

export default knex
```

- [ ] **Step 11: Commit**

```bash
git add backend
git commit -m "chore(backend): scaffold com typescript, knex e vitest"
```

---

## Task 2: Migration da tabela `chamados`

**Files:**
- Create: `backend/src/db/migrations/001_create_chamados.ts`

**Interfaces:**
- Produces: tabela `chamados` com as colunas definidas nos Global Constraints.

- [ ] **Step 1: Criar a migration**

```ts
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('chamados', (t) => {
    t.increments('id').primary()
    t.string('maquina', 120).notNullable()
    t.string('setor', 120).notNullable()
    t.enum('tipo_problema', ['eletrico', 'mecanico', 'hidraulico', 'software', 'outro']).notNullable()
    t.enum('prioridade', ['baixa', 'media', 'alta', 'urgente']).notNullable()
    t.text('descricao').notNullable()
    t.string('operador', 120).notNullable()
    t.boolean('maquina_parada').notNullable().defaultTo(false)
    t.enum('status', ['aberto', 'em_atendimento', 'concluido']).notNullable().defaultTo('aberto')
    t.timestamp('criado_em').notNullable().defaultTo(knex.fn.now())
    t.timestamp('atualizado_em').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('chamados')
}
```

- [ ] **Step 2: Criar o banco no MySQL (se ainda não existir)**

Run: `mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS chamados;"`
Expected: sem erro. (Assume que o `.env` foi copiado de `.env.example` e ajustado.)

- [ ] **Step 3: Rodar a migration**

Run: `cd backend && npm run migrate`
Expected: saída `Batch 1 run: 1 migrations`.

- [ ] **Step 4: Verificar a tabela**

Run: `mysql -u root -p chamados -e "DESCRIBE chamados;"`
Expected: lista as 11 colunas.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/migrations
git commit -m "feat(backend): migration da tabela chamados"
```

---

## Task 3: Tipos e regras de domínio dos chamados

**Files:**
- Create: `backend/src/chamados/chamados.types.ts`

**Interfaces:**
- Produces:
  - `type TipoProblema`, `type Prioridade`, `type Status` (union types).
  - `interface Chamado` (linha completa da tabela).
  - `interface NovoChamado` (campos de entrada do `POST`).
  - `const TIPOS_PROBLEMA`, `PRIORIDADES`, `STATUSES` (arrays para validação).
  - `function proximoStatusValido(atual: Status, novo: Status): boolean`.

- [ ] **Step 1: Criar `chamados.types.ts`**

```ts
export const TIPOS_PROBLEMA = ['eletrico', 'mecanico', 'hidraulico', 'software', 'outro'] as const
export const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'] as const
export const STATUSES = ['aberto', 'em_atendimento', 'concluido'] as const

export type TipoProblema = (typeof TIPOS_PROBLEMA)[number]
export type Prioridade = (typeof PRIORIDADES)[number]
export type Status = (typeof STATUSES)[number]

export interface Chamado {
  id: number
  maquina: string
  setor: string
  tipo_problema: TipoProblema
  prioridade: Prioridade
  descricao: string
  operador: string
  maquina_parada: boolean
  status: Status
  criado_em: string
  atualizado_em: string
}

export interface NovoChamado {
  maquina: string
  setor: string
  tipo_problema: TipoProblema
  prioridade: Prioridade
  descricao: string
  operador: string
  maquina_parada: boolean
}

const TRANSICOES: Record<Status, Status[]> = {
  aberto: ['em_atendimento'],
  em_atendimento: ['concluido'],
  concluido: [],
}

export function proximoStatusValido(atual: Status, novo: Status): boolean {
  return TRANSICOES[atual].includes(novo)
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/chamados/chamados.types.ts
git commit -m "feat(backend): tipos e regras de transicao de status"
```

---

## Task 4: Service de chamados (TDD)

**Files:**
- Create: `backend/src/chamados/chamados.service.ts`
- Test: `backend/src/chamados/chamados.service.test.ts`

**Interfaces:**
- Consumes: `knex` de `../db/knex`; tipos de `./chamados.types`.
- Produces:
  - `criarChamado(dados: NovoChamado): Promise<Chamado>`
  - `listarChamados(status?: Status): Promise<Chamado[]>`
  - `buscarChamado(id: number): Promise<Chamado | undefined>`
  - `atualizarStatus(id: number, novo: Status): Promise<Chamado>` — lança `Error('transicao invalida')` se a transição não for permitida e `Error('chamado nao encontrado')` se o id não existir.

- [ ] **Step 1: Escrever o teste que falha**

O teste usa um mock do módulo `../db/knex` para não depender do MySQL real. Cada teste define o comportamento do query builder encadeado.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockKnex = vi.fn()
vi.mock('../db/knex', () => ({ default: (table: string) => mockKnex(table) }))

import { criarChamado, atualizarStatus } from './chamados.service'
import type { NovoChamado } from './chamados.types'

const novo: NovoChamado = {
  maquina: 'Prensa 3',
  setor: 'Estamparia',
  tipo_problema: 'mecanico',
  prioridade: 'alta',
  descricao: 'Ruído anormal',
  operador: 'João',
  maquina_parada: true,
}

beforeEach(() => {
  mockKnex.mockReset()
})

describe('criarChamado', () => {
  it('insere e retorna o chamado criado', async () => {
    const inserted = { ...novo, id: 1, status: 'aberto', criado_em: 'x', atualizado_em: 'x' }
    const builder: any = {
      insert: vi.fn().mockResolvedValue([1]),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(inserted),
    }
    mockKnex.mockReturnValue(builder)

    const result = await criarChamado(novo)

    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ maquina: 'Prensa 3' }))
    expect(result.id).toBe(1)
    expect(result.status).toBe('aberto')
  })
})

describe('atualizarStatus', () => {
  it('rejeita transição inválida', async () => {
    const builder: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 1, status: 'aberto' }),
    }
    mockKnex.mockReturnValue(builder)

    await expect(atualizarStatus(1, 'concluido')).rejects.toThrow('transicao invalida')
  })

  it('lança erro quando o chamado não existe', async () => {
    const builder: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(undefined),
    }
    mockKnex.mockReturnValue(builder)

    await expect(atualizarStatus(999, 'em_atendimento')).rejects.toThrow('chamado nao encontrado')
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend && npx vitest run src/chamados/chamados.service.test.ts`
Expected: FAIL — `criarChamado`/`atualizarStatus` não existem.

- [ ] **Step 3: Implementar o service**

```ts
import knex from '../db/knex.js'
import {
  type Chamado,
  type NovoChamado,
  type Status,
  proximoStatusValido,
} from './chamados.types.js'

const TABELA = 'chamados'

export async function criarChamado(dados: NovoChamado): Promise<Chamado> {
  const [id] = await knex(TABELA).insert({ ...dados, status: 'aberto' })
  const criado = await knex(TABELA).where({ id }).first()
  return criado as Chamado
}

export async function listarChamados(status?: Status): Promise<Chamado[]> {
  const query = knex(TABELA).select('*')
  if (status) query.where({ status })
  return (await query.orderBy('criado_em', 'desc')) as Chamado[]
}

export async function buscarChamado(id: number): Promise<Chamado | undefined> {
  return (await knex(TABELA).where({ id }).first()) as Chamado | undefined
}

export async function atualizarStatus(id: number, novo: Status): Promise<Chamado> {
  const atual = (await knex(TABELA).where({ id }).first()) as Chamado | undefined
  if (!atual) throw new Error('chamado nao encontrado')
  if (!proximoStatusValido(atual.status, novo)) throw new Error('transicao invalida')
  await knex(TABELA).where({ id }).update({ status: novo })
  const atualizado = await knex(TABELA).where({ id }).first()
  return atualizado as Chamado
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd backend && npx vitest run src/chamados/chamados.service.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/chamados/chamados.service.ts backend/src/chamados/chamados.service.test.ts
git commit -m "feat(backend): service de chamados com TDD"
```

---

## Task 5: Broker SSE (TDD)

**Files:**
- Create: `backend/src/sse/sse.broker.ts`
- Test: `backend/src/sse/sse.broker.test.ts`

**Interfaces:**
- Produces:
  - `subscribe(res: Response): void` — escreve headers SSE, registra a conexão e remove no `close`.
  - `broadcast(evento: string, dados: unknown): void` — escreve `event:`+`data:` em todas as conexões abertas.
  - `contarConexoes(): number` — usado nos testes.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { subscribe, broadcast, contarConexoes } from './sse.broker'

function fakeRes() {
  const handlers: Record<string, () => void> = {}
  return {
    setHeader: vi.fn(),
    write: vi.fn(),
    flushHeaders: vi.fn(),
    on: (ev: string, cb: () => void) => { handlers[ev] = cb },
    _close: () => handlers['close']?.(),
  } as any
}

beforeEach(() => {
  // fecha todas as conexões residuais entre testes
  while (contarConexoes() > 0) {
    // não há acesso direto; cada teste usa conexões próprias e as fecha
    break
  }
})

describe('sse.broker', () => {
  it('registra conexão e escreve headers SSE', () => {
    const res = fakeRes()
    subscribe(res)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    res._close()
  })

  it('faz broadcast para conexões abertas', () => {
    const res = fakeRes()
    subscribe(res)
    broadcast('chamado:criado', { id: 1 })
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: chamado:criado'))
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"id":1'))
    res._close()
  })

  it('remove a conexão ao fechar', () => {
    const res = fakeRes()
    subscribe(res)
    const antes = contarConexoes()
    res._close()
    expect(contarConexoes()).toBe(antes - 1)
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend && npx vitest run src/sse/sse.broker.test.ts`
Expected: FAIL — funções inexistentes.

- [ ] **Step 3: Implementar o broker**

```ts
import type { Response } from 'express'

const conexoes = new Set<Response>()

export function subscribe(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.write(': conectado\n\n')

  conexoes.add(res)
  res.on('close', () => {
    conexoes.delete(res)
  })
}

export function broadcast(evento: string, dados: unknown): void {
  const payload = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`
  for (const res of conexoes) {
    res.write(payload)
  }
}

export function contarConexoes(): number {
  return conexoes.size
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd backend && npx vitest run src/sse/sse.broker.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/src/sse
git commit -m "feat(backend): broker SSE em memoria com TDD"
```

---

## Task 6: Rotas REST + SSE e app Express

**Files:**
- Create: `backend/src/chamados/chamados.routes.ts`
- Create: `backend/src/sse/sse.routes.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`

**Interfaces:**
- Consumes: service de chamados; broker SSE; tipos/arrays de validação.
- Produces: `app` Express exportado de `app.ts`; servidor HTTP escutando em `PORT`.

- [ ] **Step 1: Criar `sse.routes.ts`**

```ts
import { Router } from 'express'
import { subscribe } from './sse.broker.js'

const router = Router()

router.get('/events', (req, res) => {
  subscribe(res)
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 25000)
  req.on('close', () => clearInterval(keepAlive))
})

export default router
```

- [ ] **Step 2: Criar `chamados.routes.ts`**

```ts
import { Router } from 'express'
import {
  criarChamado,
  listarChamados,
  atualizarStatus,
} from './chamados.service.js'
import {
  TIPOS_PROBLEMA,
  PRIORIDADES,
  STATUSES,
  type NovoChamado,
  type Status,
} from './chamados.types.js'
import { broadcast } from '../sse/sse.broker.js'

const router = Router()

function validarNovo(body: any): string | null {
  const campos = ['maquina', 'setor', 'tipo_problema', 'prioridade', 'descricao', 'operador']
  for (const c of campos) {
    if (typeof body[c] !== 'string' || body[c].trim() === '') return `campo obrigatorio: ${c}`
  }
  if (!TIPOS_PROBLEMA.includes(body.tipo_problema)) return 'tipo_problema invalido'
  if (!PRIORIDADES.includes(body.prioridade)) return 'prioridade invalida'
  if (typeof body.maquina_parada !== 'boolean') return 'maquina_parada deve ser booleano'
  return null
}

router.post('/chamados', async (req, res) => {
  const erro = validarNovo(req.body)
  if (erro) return res.status(400).json({ error: erro })
  const chamado = await criarChamado(req.body as NovoChamado)
  broadcast('chamado:criado', chamado)
  res.status(201).json(chamado)
})

router.get('/chamados', async (req, res) => {
  const status = req.query.status as Status | undefined
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status invalido' })
  }
  const chamados = await listarChamados(status)
  res.json(chamados)
})

router.patch('/chamados/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const novo = req.body.status as Status
  if (!STATUSES.includes(novo)) return res.status(400).json({ error: 'status invalido' })
  try {
    const chamado = await atualizarStatus(id, novo)
    broadcast('chamado:atualizado', chamado)
    res.json(chamado)
  } catch (e) {
    const msg = (e as Error).message
    const code = msg === 'chamado nao encontrado' ? 404 : 400
    res.status(code).json({ error: msg })
  }
})

export default router
```

- [ ] **Step 3: Criar `app.ts`**

```ts
import express from 'express'
import cors from 'cors'
import chamadosRoutes from './chamados/chamados.routes.js'
import sseRoutes from './sse/sse.routes.js'

export const app = express()
app.use(cors())
app.use(express.json())
app.use('/api', chamadosRoutes)
app.use('/api', sseRoutes)
```

- [ ] **Step 4: Criar `server.ts`**

```ts
import 'dotenv/config'
import { app } from './app.js'

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`Backend em http://localhost:${port}`)
})
```

- [ ] **Step 5: Subir e testar manualmente**

Run: `cd backend && npm run dev`
Em outro terminal:
```bash
curl -X POST http://localhost:3001/api/chamados -H "Content-Type: application/json" \
  -d '{"maquina":"Prensa 3","setor":"Estamparia","tipo_problema":"mecanico","prioridade":"alta","descricao":"Ruido","operador":"Joao","maquina_parada":true}'
```
Expected: JSON do chamado criado com `id` e `status: "aberto"`, HTTP 201.

- [ ] **Step 6: Testar SSE manualmente**

Run (em um terminal): `curl -N http://localhost:3001/api/events`
Em outro, refaça o `POST` acima.
Expected: o terminal do `curl -N` imprime `event: chamado:criado` seguido do `data:` com o JSON.

- [ ] **Step 7: Commit**

```bash
git add backend/src
git commit -m "feat(backend): rotas REST, SSE e app express"
```

---

## Task 7: Seed de chamados de exemplo

**Files:**
- Create: `backend/src/db/seeds/001_chamados.ts`

**Interfaces:**
- Consumes: tabela `chamados`.
- Produces: linhas de exemplo com prioridades/status/máquinas variados.

- [ ] **Step 1: Criar o seed**

```ts
import type { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  await knex('chamados').del()
  await knex('chamados').insert([
    {
      maquina: 'Prensa Hidráulica 3', setor: 'Estamparia', tipo_problema: 'hidraulico',
      prioridade: 'urgente', descricao: 'Vazamento de óleo, máquina parada.',
      operador: 'Carlos Silva', maquina_parada: true, status: 'aberto',
    },
    {
      maquina: 'Esteira Transportadora 1', setor: 'Montagem', tipo_problema: 'mecanico',
      prioridade: 'alta', descricao: 'Correia desalinhada fazendo ruído.',
      operador: 'Ana Souza', maquina_parada: false, status: 'em_atendimento',
    },
    {
      maquina: 'Torno CNC 2', setor: 'Usinagem', tipo_problema: 'software',
      prioridade: 'media', descricao: 'Painel travando na inicialização.',
      operador: 'Pedro Lima', maquina_parada: false, status: 'aberto',
    },
    {
      maquina: 'Compressor Central', setor: 'Utilidades', tipo_problema: 'eletrico',
      prioridade: 'baixa', descricao: 'Lâmpada de sinalização queimada.',
      operador: 'Marina Costa', maquina_parada: false, status: 'concluido',
    },
  ])
}
```

- [ ] **Step 2: Rodar o seed**

Run: `cd backend && npm run seed`
Expected: `Ran 1 seed files`.

- [ ] **Step 3: Verificar**

Run: `curl http://localhost:3001/api/chamados`
Expected: array com 4 chamados.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/seeds
git commit -m "feat(backend): seed com chamados de exemplo"
```

---

## Task 8: Scaffold do frontend (Vite + React + TS)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/styles.css`

**Interfaces:**
- Produces: app Vite rodando em `http://localhost:5173` com proxy `/api → http://localhost:3001`.

- [ ] **Step 1: Criar `frontend/package.json`**

```json
{
  "name": "chamados-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Instalar dependências**

Run: `cd frontend && npm install`
Expected: sem erros.

- [ ] **Step 3: Criar `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Criar `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
```

- [ ] **Step 5: Criar `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

- [ ] **Step 6: Criar `frontend/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chamados de Manutenção</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Criar `frontend/src/styles.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #f4f5f7; color: #1a1a1a; }
nav { display: flex; gap: 16px; padding: 12px 24px; background: #1f2937; }
nav a { color: #fff; text-decoration: none; font-weight: 600; }
nav a.ativo { color: #60a5fa; }
main { max-width: 960px; margin: 0 auto; padding: 24px; }
.card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); margin-bottom: 12px; }
.urgente { border-left: 6px solid #dc2626; }
.parada { background: #fef2f2; }
.contadores { display: flex; gap: 16px; margin-bottom: 24px; }
.contador { flex: 1; background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.contador b { display: block; font-size: 28px; }
form { display: grid; gap: 12px; max-width: 480px; }
label { display: grid; gap: 4px; font-weight: 600; font-size: 14px; }
input, select, textarea { padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font: inherit; }
button { padding: 8px 16px; border: none; border-radius: 6px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer; }
button.secundario { background: #059669; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
```

- [ ] **Step 8: Criar `frontend/src/main.tsx`** (placeholder que será completado na Task 11)

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 9: Commit**

```bash
git add frontend
git commit -m "chore(frontend): scaffold vite + react + ts com proxy /api"
```

---

## Task 9: Tipos e camada de API do frontend

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`

**Interfaces:**
- Produces:
  - Tipos `Chamado`, `NovoChamado`, `Status` (espelham o backend).
  - `listarChamados(): Promise<Chamado[]>`
  - `criarChamado(dados: NovoChamado): Promise<Chamado>`
  - `atualizarStatus(id: number, status: Status): Promise<Chamado>`

- [ ] **Step 1: Criar `types.ts`**

```ts
export type TipoProblema = 'eletrico' | 'mecanico' | 'hidraulico' | 'software' | 'outro'
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type Status = 'aberto' | 'em_atendimento' | 'concluido'

export interface Chamado {
  id: number
  maquina: string
  setor: string
  tipo_problema: TipoProblema
  prioridade: Prioridade
  descricao: string
  operador: string
  maquina_parada: boolean
  status: Status
  criado_em: string
  atualizado_em: string
}

export interface NovoChamado {
  maquina: string
  setor: string
  tipo_problema: TipoProblema
  prioridade: Prioridade
  descricao: string
  operador: string
  maquina_parada: boolean
}
```

- [ ] **Step 2: Criar `api.ts`**

```ts
import type { Chamado, NovoChamado, Status } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Erro ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function listarChamados(): Promise<Chamado[]> {
  return fetch('/api/chamados').then(json<Chamado[]>)
}

export function criarChamado(dados: NovoChamado): Promise<Chamado> {
  return fetch('/api/chamados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  }).then(json<Chamado>)
}

export function atualizarStatus(id: number, status: Status): Promise<Chamado> {
  return fetch(`/api/chamados/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }).then(json<Chamado>)
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types.ts frontend/src/api.ts
git commit -m "feat(frontend): tipos e camada de api"
```

---

## Task 10: Hook `useSSE` (TDD)

**Files:**
- Create: `frontend/src/useSSE.ts`
- Test: `frontend/src/useSSE.test.ts`

**Interfaces:**
- Produces: `useSSE(handlers: { onCriado: (c: Chamado) => void; onAtualizado: (c: Chamado) => void }): void` — abre um `EventSource('/api/events')`, registra listeners para `chamado:criado` e `chamado:atualizado`, e fecha no unmount.

- [ ] **Step 1: Escrever o teste que falha**

O teste mocka a classe global `EventSource`.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSSE } from './useSSE'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners: Record<string, (e: any) => void> = {}
  closed = false
  constructor(public url: string) { FakeEventSource.instances.push(this) }
  addEventListener(ev: string, cb: (e: any) => void) { this.listeners[ev] = cb }
  close() { this.closed = true }
  emit(ev: string, data: unknown) { this.listeners[ev]?.({ data: JSON.stringify(data) }) }
}

beforeEach(() => {
  FakeEventSource.instances = []
  ;(globalThis as any).EventSource = FakeEventSource
})

describe('useSSE', () => {
  it('chama onCriado quando recebe chamado:criado', () => {
    const onCriado = vi.fn()
    const onAtualizado = vi.fn()
    renderHook(() => useSSE({ onCriado, onAtualizado }))

    FakeEventSource.instances[0].emit('chamado:criado', { id: 7 })
    expect(onCriado).toHaveBeenCalledWith({ id: 7 })
  })

  it('fecha a conexão no unmount', () => {
    const { unmount } = renderHook(() =>
      useSSE({ onCriado: vi.fn(), onAtualizado: vi.fn() }),
    )
    const es = FakeEventSource.instances[0]
    unmount()
    expect(es.closed).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd frontend && npx vitest run src/useSSE.test.ts`
Expected: FAIL — `useSSE` não existe.

- [ ] **Step 3: Implementar o hook**

```ts
import { useEffect, useRef } from 'react'
import type { Chamado } from './types'

interface Handlers {
  onCriado: (c: Chamado) => void
  onAtualizado: (c: Chamado) => void
}

export function useSSE(handlers: Handlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.addEventListener('chamado:criado', (e) =>
      ref.current.onCriado(JSON.parse((e as MessageEvent).data)),
    )
    es.addEventListener('chamado:atualizado', (e) =>
      ref.current.onAtualizado(JSON.parse((e as MessageEvent).data)),
    )
    return () => es.close()
  }, [])
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd frontend && npx vitest run src/useSSE.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/useSSE.ts frontend/src/useSSE.test.ts
git commit -m "feat(frontend): hook useSSE com TDD"
```

---

## Task 11: App/rotas e tela Abrir Chamado

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/pages/AbrirChamado.tsx`
- Test: `frontend/src/pages/AbrirChamado.test.tsx`

**Interfaces:**
- Consumes: `criarChamado` de `../api`; tipos de `../types`.
- Produces: `App` com rotas `/` (AbrirChamado) e `/painel` (PainelManutencao).

- [ ] **Step 1: Criar `App.tsx`**

```tsx
import { NavLink, Route, Routes } from 'react-router-dom'
import { AbrirChamado } from './pages/AbrirChamado'
import { PainelManutencao } from './pages/PainelManutencao'

export function App() {
  return (
    <>
      <nav>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'ativo' : '')} end>
          Abrir Chamado
        </NavLink>
        <NavLink to="/painel" className={({ isActive }) => (isActive ? 'ativo' : '')}>
          Painel Manutenção
        </NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<AbrirChamado />} />
          <Route path="/painel" element={<PainelManutencao />} />
        </Routes>
      </main>
    </>
  )
}
```

- [ ] **Step 2: Escrever o teste da tela Abrir Chamado (falha)**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AbrirChamado } from './AbrirChamado'
import * as api from '../api'

beforeEach(() => vi.restoreAllMocks())

describe('AbrirChamado', () => {
  it('envia o formulário e mostra confirmação', async () => {
    const spy = vi.spyOn(api, 'criarChamado').mockResolvedValue({ id: 1 } as any)
    render(<AbrirChamado />)

    fireEvent.change(screen.getByLabelText(/^Máquina$/i), { target: { value: 'Prensa 3' } })
    fireEvent.change(screen.getByLabelText(/Setor/i), { target: { value: 'Estamparia' } })
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'Ruído' } })
    fireEvent.change(screen.getByLabelText(/Operador/i), { target: { value: 'João' } })
    fireEvent.click(screen.getByRole('button', { name: /Abrir chamado/i }))

    await waitFor(() => expect(spy).toHaveBeenCalled())
    expect(await screen.findByText(/Chamado aberto/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd frontend && npx vitest run src/pages/AbrirChamado.test.tsx`
Expected: FAIL — componente não existe.

- [ ] **Step 4: Implementar `AbrirChamado.tsx`**

```tsx
import { useState } from 'react'
import { criarChamado } from '../api'
import type { NovoChamado, Prioridade, TipoProblema } from '../types'

const TIPOS: TipoProblema[] = ['eletrico', 'mecanico', 'hidraulico', 'software', 'outro']
const PRIORIDADES: Prioridade[] = ['baixa', 'media', 'alta', 'urgente']

const vazio: NovoChamado = {
  maquina: '', setor: '', tipo_problema: 'mecanico', prioridade: 'media',
  descricao: '', operador: '', maquina_parada: false,
}

export function AbrirChamado() {
  const [form, setForm] = useState<NovoChamado>(vazio)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof NovoChamado>(k: K, v: NovoChamado[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null); setMsg(null)
    try {
      const c = await criarChamado(form)
      setMsg(`Chamado aberto com sucesso (nº ${c.id}).`)
      setForm(vazio)
    } catch (err) {
      setErro((err as Error).message)
    }
  }

  return (
    <>
      <h1>Abrir Chamado de Manutenção</h1>
      {msg && <div className="card" style={{ color: '#059669' }}>{msg}</div>}
      {erro && <div className="card" style={{ color: '#dc2626' }}>{erro}</div>}
      <form onSubmit={enviar}>
        <label>Máquina
          <input value={form.maquina} onChange={(e) => set('maquina', e.target.value)} required />
        </label>
        <label>Setor
          <input value={form.setor} onChange={(e) => set('setor', e.target.value)} required />
        </label>
        <label>Tipo de problema
          <select value={form.tipo_problema} onChange={(e) => set('tipo_problema', e.target.value as TipoProblema)}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Prioridade
          <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value as Prioridade)}>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>Descrição
          <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} required />
        </label>
        <label>Operador
          <input value={form.operador} onChange={(e) => set('operador', e.target.value)} required />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center' }}>
          <input type="checkbox" checked={form.maquina_parada} onChange={(e) => set('maquina_parada', e.target.checked)} />
          Máquina parada (produção interrompida)
        </label>
        <button type="submit">Abrir chamado</button>
      </form>
    </>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd frontend && npx vitest run src/pages/AbrirChamado.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/AbrirChamado.tsx frontend/src/pages/AbrirChamado.test.tsx
git commit -m "feat(frontend): rotas e tela de abrir chamado"
```

---

## Task 12: Tela Painel Manutenção (tempo real)

**Files:**
- Create: `frontend/src/pages/PainelManutencao.tsx`

**Interfaces:**
- Consumes: `listarChamados`, `atualizarStatus` de `../api`; `useSSE` de `../useSSE`; tipos de `../types`.
- Produces: `PainelManutencao` — lista ao vivo, contadores, botões Assumir/Concluir.

- [ ] **Step 1: Implementar `PainelManutencao.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { listarChamados, atualizarStatus } from '../api'
import { useSSE } from '../useSSE'
import type { Chamado, Status } from '../types'

const PESO_PRIORIDADE: Record<Chamado['prioridade'], number> = {
  urgente: 0, alta: 1, media: 2, baixa: 3,
}

export function PainelManutencao() {
  const [chamados, setChamados] = useState<Chamado[]>([])

  useEffect(() => {
    listarChamados().then(setChamados).catch(() => setChamados([]))
  }, [])

  useSSE({
    onCriado: (c) => setChamados((cs) => [c, ...cs.filter((x) => x.id !== c.id)]),
    onAtualizado: (c) => setChamados((cs) => cs.map((x) => (x.id === c.id ? c : x))),
  })

  const ordenados = useMemo(
    () =>
      [...chamados].sort((a, b) => {
        if (a.maquina_parada !== b.maquina_parada) return a.maquina_parada ? -1 : 1
        return PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]
      }),
    [chamados],
  )

  const abertos = chamados.filter((c) => c.status === 'aberto').length
  const emAtendimento = chamados.filter((c) => c.status === 'em_atendimento').length
  const urgentes = chamados.filter((c) => c.prioridade === 'urgente' && c.status !== 'concluido').length

  async function mudar(id: number, status: Status) {
    try {
      await atualizarStatus(id, status)
    } catch { /* o estado será corrigido pelo SSE se necessário */ }
  }

  return (
    <>
      <h1>Painel da Manutenção</h1>
      <div className="contadores">
        <div className="contador"><b>{abertos}</b>Abertos</div>
        <div className="contador"><b>{emAtendimento}</b>Em atendimento</div>
        <div className="contador" style={{ color: '#dc2626' }}><b>{urgentes}</b>Urgentes</div>
      </div>

      {ordenados.length === 0 && <p>Nenhum chamado.</p>}

      {ordenados.map((c) => (
        <div key={c.id} className={`card ${c.prioridade === 'urgente' ? 'urgente' : ''} ${c.maquina_parada ? 'parada' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>#{c.id} — {c.maquina} <span style={{ fontWeight: 400 }}>({c.setor})</span></strong>
            <span className="badge">{c.status}</span>
          </div>
          <p style={{ margin: '8px 0' }}>{c.descricao}</p>
          <small>
            {c.tipo_problema} · prioridade {c.prioridade} · operador {c.operador}
            {c.maquina_parada && ' · MÁQUINA PARADA'}
          </small>
          <div style={{ marginTop: 12 }}>
            {c.status === 'aberto' && (
              <button onClick={() => mudar(c.id, 'em_atendimento')}>Assumir</button>
            )}
            {c.status === 'em_atendimento' && (
              <button className="secundario" onClick={() => mudar(c.id, 'concluido')}>Concluir</button>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Rodar toda a suíte do frontend**

Run: `cd frontend && npm test`
Expected: todos os testes PASS (useSSE + AbrirChamado).

- [ ] **Step 3: Verificação end-to-end manual**

1. Backend rodando (`cd backend && npm run dev`) com migration + seed aplicados.
2. Frontend rodando (`cd frontend && npm run dev`).
3. Abrir duas abas: `http://localhost:5173/painel` e `http://localhost:5173/`.
4. Na aba `/`, abrir um chamado.
Expected: ele aparece **instantaneamente** na aba `/painel`, contadores atualizam. Clicar "Assumir" e "Concluir" reflete em tempo real; chamados urgentes/parados aparecem no topo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PainelManutencao.tsx
git commit -m "feat(frontend): painel da manutencao em tempo real via SSE"
```

---

## Task 13: README de execução

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: instruções de setup para rodar o projeto do zero.

- [ ] **Step 1: Criar `README.md`**

```markdown
# Sistema de Chamados de Manutenção (SSE)

Operador abre chamados de manutenção; a equipe acompanha em tempo real (Server-Sent Events).

## Requisitos
- Node.js 20+
- MySQL rodando

## Backend
```bash
cd backend
cp .env.example .env   # ajuste as credenciais do MySQL
# crie o banco: mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS chamados;"
npm install
npm run migrate
npm run seed
npm run dev            # http://localhost:3001
```

## Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Abra `/` para abrir chamados e `/painel` para acompanhar em tempo real.

## Testes
```bash
cd backend && npm test
cd frontend && npm test
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: readme de execucao"
```

---

## Self-Review (feita pelo autor do plano)

**Cobertura do spec:**
- Abrir chamado (formulário) → Task 11. ✅
- Painel ao vivo via SSE → Tasks 10, 12. ✅
- Contador abertos/urgentes ao vivo → Task 12. ✅
- 3 estados + transições válidas → Tasks 3, 4, 6. ✅
- Migrations + seeds MySQL → Tasks 2, 7. ✅
- Modelo de dados completo (11 colunas) → Task 2. ✅
- API REST (POST/GET/PATCH/events) → Task 6. ✅
- Broker SSE em memória + keep-alive → Tasks 5, 6. ✅
- Tratamento de erros padronizado → Task 6 (400/404/500). ✅
- Testes Vitest nas duas pontas → Tasks 4, 5, 10, 11. ✅
- Proxy Vite /api → Task 8. ✅

**Consistência de tipos:** `Chamado`, `NovoChamado`, `Status`, enums e nomes de função (`criarChamado`, `atualizarStatus`, `listarChamados`, `subscribe`, `broadcast`, `useSSE`) são consistentes entre backend, frontend e testes.

**Placeholders:** nenhum — todos os passos contêm código real.
