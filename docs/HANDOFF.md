# Handoff — Estado atual do projeto

> Documento de transição entre sessões de agente. Leia isso primeiro.

## Contexto de negócio

- **Empresa**: Ponto B — agência de marketing digital de infoprodutos.
- **Objetivo do projeto**: ferramenta interna que recebe vídeo bruto gravado por um especialista e devolve um reel curto (9:16, 60–100s) editado automaticamente.
- **Stack travada**: Whisper (faster-whisper local) + Claude Sonnet 4.6 + Remotion.
- **Operador esperado**: estrategista/gestor da Ponto B (não editor técnico).
- **Quem coda**: Claude (esse projeto está sendo construído pela LLM com supervisão do Artur).

## O que está consolidado

1. **Projeto monorepo** em `C:\Users\Rafael\source\repos\pontob-video-editor` na máquina do Artur. Estrutura:
   - `apps/remotion/` — Remotion (React) renderiza o vídeo final.
   - `services/transcription/` — Python + faster-whisper, gera transcript com word-level timestamps.
   - `services/analysis/` — Node + Anthropic SDK, traduz transcript em sequência de cenas via Claude.
   - `packages/schema/` — schema Zod compartilhado entre Remotion e analysis.
   - `docs/` — documentação (este folder).

2. **Pipeline confirmado**:
   ```
   vídeo bruto → faster-whisper (local) → transcript.json
   transcript + perfil do Especialista + brief opcional → Claude → scenes.json
   scenes.json + vídeo bruto → Remotion → reel_final.mp4
   ```

3. **Decisões travadas com Artur** (irreversíveis sem reabrir conversa):
   - Uso interno (sem multi-tenant, sem billing).
   - Operador é estrategista, não editor.
   - Roda local na máquina do estrategista.
   - Stack Whisper + Claude + Remotion (sem alternativas).
   - Conteúdo das cenas vem **só do que o mentor falou na transcrição**. **Zero invenção.**

## Pivô de arquitetura ocorrido

Inicialmente o plano replicava 1:1 o vídeo de referência (9 cenas fixas: hook → split improviso → split previsível → 4 bonecos comparativos → mentor lower-third → CTA). **Esse modelo foi rejeitado** porque assume contexto específico (caso "atendimento de clínica") que não generaliza pra outros nichos (investimentos, educação, coaching).

**Modelo novo (atual)**:

- **Sequência de cenas é variável**: Claude decide quantidade e ordem com base no conteúdo.
- **Pool técnico de componentes Remotion** (modulares, parametrizáveis, agnósticos de nicho). Existe lista preliminar em `docs/cenas-componentes.md`.
- **Cadastro de Especialista** (DB simples, JSON em arquivo) informa contexto pro Claude: tom, jargão, palavras a evitar, CTA padrão. Schema preliminar em `docs/especialista.md` — **campos exatos pendentes de validação com Artur**.
- **Estrategista pode dar input opcional**: ex.: "nesse vídeo, foca em comparativos numéricos". Hint, não obrigação.

## Estado do código vs estado da documentação

✅ **Código e documentação sincronizados** (refatoração concluída em 05/05/2026).

| Arquivo | Estado |
|---|---|
| `packages/schema/scenes.ts` | ✅ Modelo novo — `z.array(CenaUnion)` discriminada por `tipo`, 8 tipos, refines de ordem e duração |
| `apps/remotion/src/compositions/Reel.tsx` | ✅ Itera array variável, switch exaustivo nos 8 tipos |
| `apps/remotion/src/scenes/HookScene.tsx` | ✅ Refatorado pro schema novo |
| `apps/remotion/src/scenes/CtaScene.tsx` | ✅ Novo (substitui CtaFullNavyScene) |
| `apps/remotion/src/scenes/FraseImpactoScene.tsx` | ✅ Implementado |
| `apps/remotion/src/scenes/ComparativoNumericoScene.tsx` | ✅ Implementado |
| `apps/remotion/src/scenes/VideoCitacaoScene.tsx` | ✅ Implementado |
| `apps/remotion/src/scenes/ListaPontosScene.tsx` | ✅ Implementado |
| `apps/remotion/src/scenes/MiniCasoScene.tsx` | ✅ Implementado |
| `apps/remotion/src/scenes/TransicaoTextoScene.tsx` | ✅ Implementado |
| `apps/remotion/src/scenes/CtaFullNavyScene.tsx` | ⚠️ Arquivo morto (modelo antigo, não importado). Deletar manualmente. |
| `services/analysis/src/prompt.ts` | ✅ Reescrito — prompt v0.2.0, sequência variável, 8 tipos documentados |
| `services/analysis/src/claude.ts` | ✅ Assinatura `AnalyzeParams` atualizada — recebe `especialista` e `videoOriginalPath` |
| `services/transcription/run.py` | ✅ Sem mudança necessária |
| `apps/remotion/src/theme.ts` | ✅ `corDestaque` atualizado pra `"primaria" \| "secundaria" \| "branco"` |

## Decisões pendentes

1. **Campos do cadastro de Especialista** — proposta revisada feita pelo Claude (05/05/2026): adicionar `nicho_secundario`, `formato_predominante_de_conteudo`, `metricas_referencia`, `personagens_recorrentes`, `restricoes_visuais`, `historico_ctas`; unificar `bandeiras` + `palavras_chave_recorrentes` em `vocabulario_prioritario`. Schema em `docs/especialista.md`. **Validação final pendente com Artur antes de codar a UI de cadastro.**

2. **Pool de componentes** — validado e expandido (05/05/2026): 8 tipos (Hook, FraseImpacto, ComparativoNumerico, VideoCitacao, ListaPontos, MiniCaso, TransicaoTexto, CTA). Todos implementados. `docs/cenas-componentes.md` ainda descreve 6 tipos — **atualizar o doc pra refletir os 8**.

3. **Como o estrategista dá hint do tipo de cena pra um vídeo específico**. UI, formato, obrigatoriedade — não definido.

## Dados disponíveis pra teste

- 4 vídeos brutos do Artur estão em `C:\caminho\aos\videos\` na máquina dele (paths exatos não documentados aqui — ele upou no chat). São anúncios de aquisição, 1920×1080, 30fps, ~22–56s cada, alta qualidade de áudio.
- 1 transcrição gerada com sucesso (faster-whisper large-v3 em CPU): `transcript.json` do **VID AD 01 CAP DIV_MAR_26.mp4** (47s, sobre Maratona Dividendos Turbinados, investimentos com opções). Está em `jobs/teste01/transcript.json` na máquina do Artur.

## Ambiente Cowork (limitações)

O agente Claude que está construindo isso roda em sandbox com **rede restrita**:
- ✅ Permitido: npmjs.org, pypi.org, github.com, anthropic.com
- ❌ Bloqueado: huggingface.co (modelos Whisper), remotion.dev (docs), e basicamente qualquer outro host

Implicações:
- Não dá pra testar transcrição no sandbox (modelo não baixa). **Artur valida na máquina dele.**
- Não dá pra ler doc oficial Remotion AI agents direto (https://www.remotion.dev/docs/ai/coding-agents bloqueado). Conhecimento do Remotion vem do treinamento + experimentação.
- API Claude funciona — pode chamar análise direto do sandbox.

## Próximos passos sugeridos pra retomar

1. ~~Refatorar schema, prompt e Remotion pro modelo flexível~~ ✅ Concluído.
2. ~~Construir componentes faltantes~~ ✅ Todos os 8 tipos implementados.
3. ~~Construir app web Next.js~~ ✅ Estrutura completa em `apps/web/`.
4. Deletar manualmente `apps/remotion/src/scenes/CtaFullNavyScene.tsx` (arquivo morto, não importado).
5. Rodar `npm install` na raiz pra instalar deps do `@pontob/web`.
6. Criar especialista de teste: `especialistas/mateus-castro.json` (pegar base em `docs/especialista.md`).
7. **Smoke test end-to-end**: `npm run dev` → subir vídeo → ver cenas geradas → renderizar.
8. Validar campos do Especialista e atualizar `docs/especialista.md` após o smoke test.
9. Construir tela de cadastro de Especialistas na web UI.
