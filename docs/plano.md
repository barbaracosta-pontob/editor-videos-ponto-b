# Plano operacional

> Este é o plano de execução vivo. Decisões consolidadas + roadmap. Para o contexto compacto da sessão atual, ver `docs/HANDOFF.md`.

## 1. Diagnóstico do problema

A produção de reels de oferta para clientes de infoproduto passa hoje por gargalo previsível: estrategista escreve copy, editor recebe brief, edita manualmente, volta pra revisão, ajusta, exporta. Ciclo de 1 a 3 dias úteis por peça.

O problema não é o tempo de edição em si — é a **dependência sequencial entre quem entende de oferta (estrategista) e quem executa visualmente (editor)**. A ferramenta corta esse handoff: estrategista grava, sobe, recebe MP4 pronto.

## 2. Premissas e decisões travadas

| Item | Decisão |
|---|---|
| Tipo | Ferramenta interna (sem multi-tenant, sem billing) |
| Operador | Estrategista/gestor |
| Stack | Whisper (faster-whisper local) + Claude Sonnet 4.6 + Remotion |
| Formato saída | MP4, 9:16, 1080×1920, 30fps, 60–100s |
| Estrutura do reel | **Variável** — Claude monta sequência baseada no conteúdo da fala + perfil do Especialista |
| Conteúdo | **Só do que o mentor falou na transcrição**. Zero invenção de cenários, mensagens ou números |
| Infra | Roda local na máquina do estrategista |
| Eval | Harness com banco de 15–20 vídeos rotulados (futuro) |

## 3. Componentes do sistema

### 3.1. Especialista (cadastro)

Cada especialista da Ponto B (mentor que aparece no vídeo) tem cadastro próprio. Antes de gerar um reel, o estrategista escolhe qual Especialista é o autor do vídeo. O cadastro informa contexto pro Claude: tom de voz, jargão técnico, palavras a evitar, formato de CTA padrão.

Detalhes do schema em `docs/especialista.md`. **Campos pendentes de validação final com Artur.**

### 3.2. Pool de tipos de cena (componentes Remotion)

Cada tipo de cena é um componente React parametrizável escrito uma vez. O Claude **não escreve código** — ele escolhe da paleta disponível e popula com texto/dados.

Pool inicial proposto:

- `Hook` — título grande sobre vídeo do mentor cortado, palavras destacadas
- `FraseImpacto` — texto cheio sobre fundo escuro, sem vídeo
- `ComparativoNumerico` — dois ou três lados com números (visualização: barras, bonecos, ou só números grandes)
- `CitacaoMentor` — vídeo do mentor com 3 frases-chave em lower-third
- `ListaPontos` — 3–5 tópicos curtos animados em sequência
- `CTA` — encerramento full navy com chamada de ação

Detalhes (props, animações, casos de uso) em `docs/cenas-componentes.md`. **Lista pendente de validação final.**

### 3.3. Pipeline de execução

```
1. Upload vídeo bruto (.mp4) + seleção de Especialista cadastrado + brief opcional
   ↓
2. FFmpeg extrai áudio (16kHz mono WAV)
   ↓
3. faster-whisper transcreve → transcript.json (segments + word-level timestamps)
   ↓
4. Claude Sonnet 4.6 recebe (transcript + Especialista + brief), retorna scenes.json
   (sequência variável de cenas tipadas, validada por Zod)
   ↓
5. Estrategista revisa scenes.json em UI mínima, regenera se quiser
   ↓
6. Remotion bundla, abre Chrome headless, gera 2400 PNGs (frame por frame)
   ↓
7. FFmpeg compila PNGs + áudio → reel_final.mp4
```

## 4. Fases de entrega

### Fase 0 — Setup (concluída)
- Estrutura monorepo
- Schema Zod inicial (em modelo antigo, pendente de refatoração)
- Script Python de transcrição funcional
- Cliente Claude com retry+validação (em modelo antigo, pendente)
- Remotion básico com 2 componentes reais (Hook, CTA) e placeholder genérico

### Fase 1 — Refatoração para modelo flexível (atual)
- Reescrever `packages/schema/scenes.ts` como array de cenas tipadas (discriminated union)
- Reescrever `services/analysis/src/prompt.ts` sem amarrar a 9 cenas
- Reescrever `apps/remotion/src/compositions/Reel.tsx` pra aceitar array variável
- Implementar cadastro de Especialista (formato JSON em `especialistas/<nome>.json`)
- Smoke test do pipeline ponta-a-ponta com 1 vídeo real (VID AD 01)

### Fase 2 — Pool completo de componentes
- Implementar todos os componentes do pool aprovado em `docs/cenas-componentes.md`
- Cada componente parametrizável (cor, animação, layout)
- Visual aprovado pelo Artur antes de avançar

### Fase 3 — UI mínima (Next.js)
- Tela de upload
- Tela de cadastro/seleção de Especialista
- Tela de revisão de cenas (cards com thumbs)
- Tela de download do MP4 final

### Fase 4 — Hardening
- Retomada de jobs em caso de falha
- Eval harness com banco rotulado (15–20 vídeos)
- Métricas de uso (tempo médio, custo Claude por vídeo, taxa de retry)
- Documentação operacional pra próximo membro da equipe

## 5. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Áudio bruto ruim (eco, ruído) atrapalha transcrição | Validar SNR antes de transcrever; rejeitar com mensagem clara |
| Claude alucina números não ditos | Prompt explícito + eval harness + validação Zod com `palavras_destaque` rastreáveis ao transcript |
| Variedade de nichos exige muitos componentes | Componentes altamente parametrizáveis; novos só quando padrão recorrente surgir |
| Estrategista não confia na saída automática | Tela de revisão obrigatória + comparação paralela com fluxo manual nas 2 primeiras semanas |
| Render lento em CPU pura | Aceitar 3–4min por reel no MVP; avaliar GPU/Lambda só se virar gargalo real |
| Drift entre código antigo e doc nova | Refator forçado na Fase 1; HANDOFF.md sinaliza o gap explicitamente |

## 6. Definição de pronto do MVP

A ferramenta está pronta para uso interno quando:

1. Estrategista cadastra Especialista pela UI ou JSON.
2. Sobe vídeo bruto de 1–5 min via interface local.
3. Pipeline completa em **menos de 10 minutos** para vídeo de até 3 minutos.
4. Sequência de cenas reflete fielmente o que o mentor falou (≥90% dos vídeos de teste passam validação manual).
5. Tela de revisão permite regerar análise sem refazer transcrição (cache).
6. Falha em qualquer etapa retorna mensagem acionável e permite retry.
7. Custo médio por vídeo abaixo de R$ 1,50.
8. Documentação interna existe e segundo membro consegue subir e usar em ≤ 30 min.
