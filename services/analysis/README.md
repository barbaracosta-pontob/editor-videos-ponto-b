# Serviço de Análise

Recebe `transcript.json` (saída do `faster-whisper`) + `especialista.json` (perfil cadastrado) + brief opcional, devolve `scenes.json` validado pra alimentar o Remotion.

## O que ele faz

1. Carrega transcrição + perfil do Especialista + brief.
2. Monta prompt com tudo isso (system + user, conforme `docs/prompt-claude-analise.md`).
3. Chama Claude Sonnet 4.6 com prompt-caching habilitado.
4. Parseia JSON, valida com Zod (`@pontob/schema`).
5. Se inválido, re-prompta com o erro até 3x (temperatura caindo: 0.4 → 0.2 → 0.0).
6. Falha explícita se nada bater. Sem placeholder silencioso.

## Setup

```bash
cd services/analysis
npm install
```

`.env` na raiz do projeto com `ANTHROPIC_API_KEY=sk-ant-...`.

## Uso (planejado pós-refactor)

```bash
npm run analyze -- \
  --transcript ../../jobs/teste01/transcript.json \
  --especialista ../../especialistas/mateus-castro.json \
  --output ../../jobs/teste01/scenes.json \
  --brief "vídeo de captação pra Maratona Dividendos Turbinados" \
  --hint-cenas "Hook, ComparativoNumerico, CTA" \
  --video-path "../../jobs/teste01/input.mp4"
```

Saída no stderr:

```
[cli] analisando ../../jobs/teste01/transcript.json...
[cli] concluído em 6.4s
[cli] tentativas: 1
[cli] tokens: input=2832 output=1104 cache_read=0
[cli] cenas geradas: 6 (Hook, ComparativoNumerico, FraseImpacto, CitacaoMentor, ListaPontos, CTA)
[cli] duração total: 49s
[cli] salvo em ../../jobs/teste01/scenes.json
```

## Custos esperados

- Input típico: ~3500 tokens (system prompt + transcrição de 60s + perfil do Especialista)
- Output típico: ~1200 tokens (JSON com 5-7 cenas)
- Custo Sonnet 4.6 (cache cold): ~US$ 0,03 por análise
- Custo com prompt caching ativo: ~US$ 0,005 por análise (>5 análises seguidas no mesmo dia)

## Estado do código

⚠️ Modelo antigo de 9 cenas fixas. Refator pendente:
- `src/prompt.ts` — system prompt amarrado em 9 cenas, precisa virar `v0.2.0` conforme `docs/prompt-claude-analise.md`
- `src/cli.ts` — não aceita `--especialista`, `--hint-cenas`, `--video-path`. Adicionar.
- `src/claude.ts` — estrutura OK (retry, validação, caching). Só atualizar imports do prompt.

## Falhas comuns

| Sintoma | Causa provável | Mitigação |
|---|---|---|
| `JSON inválido` em todas as tentativas | Modelo respondeu com markdown ou texto antes do JSON | `stripMarkdownFence` já cobre; se persistir, ajustar prompt |
| `palavras_destacadas: máximo 3` | Modelo tentou destacar palavras demais | Prompt já limita; cai em retry |
| `duração soma não bate ±5s` | Modelo estimou cenas com duração inconsistente | Refine final-check no prompt |
| `última cena não é CTA` | Modelo esqueceu de fechar com CTA | Hard-coded no prompt agora; se acontecer, retry |
| `tipo "X" não está no pool` | Modelo inventou um tipo (ex: "GraficoAnimado") | Lista de tipos é fixa no prompt; cai em retry |

## Versionamento de prompt

Toda mudança no `src/prompt.ts` exige bumping de `PROMPT_VERSION` e roda em eval harness antes de subir. Histórico legível em `docs/prompt-claude-analise.md`.
