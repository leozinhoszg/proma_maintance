# Fila de atendimento, filtros e manual — Design (iteração 2)

**Data:** 2026-07-06 · **Status:** Aprovado em conversa

## Objetivo

Tornar a ordem de atendimento previsível e explicável, limpar a tela do painel
(separando concluídos e em atendimento da fila) e ensinar o uso da aplicação
dentro dela mesma.

## 1. Regra da fila (aprovada)

Ordenação em 3 níveis, aplicada aos chamados aguardando atendimento:

1. **Máquina parada** primeiro — produção interrompida é perda direta.
2. **Prioridade** — urgente → alta → média → baixa.
3. **Ordem de chegada (FIFO)** — em empate, quem abriu primeiro é atendido primeiro.

- Implementada como função pura `ordenarFila(chamados)` em `frontend/src/fila.ts`, com testes.
- O card mostra **tempo de espera** relativo ("aguardando há 2h 15min") via `tempoRelativo(iso, agora)`, atualizado a cada 30s.
- Na aba "Na fila", cada card mostra sua **posição na fila** (1º, 2º, …) — a regra fica visível.

## 2. Filtros por status (tabs)

Abaixo dos contadores andon, três abas com contagem:

| Aba | Conteúdo | Ordenação |
|---|---|---|
| **Na fila** (padrão) | status `aberto` | regra da fila |
| **Em atendimento** | status `em_atendimento` | regra da fila |
| **Concluídos** | status `concluido` | mais recente primeiro |

Estado vazio com mensagem própria por aba.

## 3. Lista em vez de grade

Cards full-width empilhados (uma coluna), leitura horizontal:
`posição → OS + máquina + tags → descrição (2 linhas máx.) → status + espera + ação`.
Em telas pequenas o card empilha verticalmente.

## 4. Manual — página "Como usar" (`/ajuda`)

Página estática no app, linkada no menu:
1. O que é o sistema (2 frases).
2. Abrir um chamado — passo a passo dos campos 01–07.
3. Acompanhar no painel — abas, LED ao vivo, contadores.
4. A regra da fila — os 3 níveis explicados.
5. Cores e status — legenda andon (vermelho/âmbar/verde).
6. Dúvidas comuns (ex.: "por que meu chamado não está no topo?").

## Fora de escopo

Backend inalterado (ordenação/filtragem são de exibição, no frontend).
