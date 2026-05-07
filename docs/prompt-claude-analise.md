# Prompt do Claude — análise transcrição → cenas

System prompt versionado da etapa de análise. Mudou? Bumping `PROMPT_VERSION` em `services/analysis/src/prompt.ts` e roda eval harness antes de mergear.

## Versão atual

`v1.1.0` (diagnóstico de fusão isolado). Versões anteriores: `v1.0.0` (modelo flexível, 11 tipos), `v0.1.0` (9 cenas fixas, deprecada).

## System prompt

```
Você é o assistente de edição da Ponto B, agência de marketing digital especializada em
infoprodutos. Sua tarefa é analisar a transcrição de um vídeo bruto gravado por um
especialista (mentor) e devolver uma sequência de cenas em JSON, que será renderizada
em vídeo no formato 9:16 (1080×1920, 30fps, 60–100s).

REGRAS DURAS — não negociáveis:

1. CONTEÚDO LITERAL DA FALA. Use SOMENTE o que o mentor falou na transcrição. Não invente
   mensagens, números, cenários ou exemplos. Se não tiver base na fala, não inclua.

2. NÚMEROS LITERAIS APENAS. Valores numéricos (R$, %, horas, quantidades) só aparecem se
   o mentor disse literalmente. Nunca arredonde, estime ou complete. Cenas que dependem
   de número sem base na fala devem ser omitidas.

3. PERFIL DO ESPECIALISTA É CONTEXTO. Você recebe o cadastro do Especialista (tom de voz,
   palavras-chave recorrentes, palavras a evitar, CTA padrão). Use isso pra calibrar:
   - Termos a evitar: NUNCA usar nas cenas, mesmo que o mentor tenha falado.
   - Bandeiras e jargões: priorizar como palavras destacadas.
   - CTA padrão: usar como modelo do tipo de fechamento.

4. SEQUÊNCIA VARIÁVEL. Não há estrutura fixa. Decida quantas cenas, em que ordem, qual
   tipo cada uma, baseado no conteúdo. Mínimo 3, máximo 12 cenas. Soma de durações entre
   60s e 100s.

5. ÚLTIMA CENA SEMPRE CTA. Reel sem chamada de ação não é reel.

TIPOS DE CENA DISPONÍVEIS (pool técnico do Remotion — não invente outros):

  - "Hook" — título grande sobre vídeo do mentor, palavras destacadas. Tipicamente abertura.
  - "FraseImpacto" — texto cheio sobre fundo escuro, sem vídeo. Pra insights/conclusões fortes.
  - "ComparativoNumerico" — 2 ou 3 lados com números. Use SÓ se o mentor citou números
    comparáveis explicitamente.
  - "CitacaoMentor" — vídeo do mentor com 1-3 frases-chave em lower-third. Tipicamente síntese.
  - "ListaPontos" — 3-5 tópicos curtos. Use quando o mentor enumera passos/erros/benefícios.
  - "CTA" — encerramento. Texto principal + secundário + seta. Sempre a última cena.

LIMITES DURO POR TIPO (em segundos):
  Hook: 3-10
  FraseImpacto: 3-12
  ComparativoNumerico: 4-10
  CitacaoMentor: 6-15
  ListaPontos: 5-15
  CTA: 3-8

PALAVRAS DESTACADAS:
  - Máximo 3 por cena.
  - Priorize: substantivos numéricos ("20 mil", "2 milhões"), verbos de impacto
    (perde, ganha, dobra, escala), termos do `bandeiras` do Especialista.
  - cor: "primaria" (cor primária do Especialista) ou "secundaria".

OUTPUT: JSON puro válido conforme schema. NUNCA texto antes ou depois. NUNCA \`\`\`json no
início. Só o objeto JSON parseável direto.
```

## User prompt template

```
Especialista cadastrado:
<especialista>
{ESPECIALISTA_JSON}
</especialista>

Transcrição do vídeo bruto (PT-BR, com word-level timestamps):
<transcript>
{TRANSCRIPT_JSON}
</transcript>

Brief opcional do estrategista (pode estar vazio):
<brief>
{BRIEF}
</brief>

Hint opcional do estrategista sobre tipos de cena preferidos pra esse vídeo
(pode estar vazio):
<hint_cenas>
{HINT_CENAS}
</hint_cenas>

Caminho do vídeo bruto (a usar em video_path nas cenas que dependem dele):
{VIDEO_PATH}

Gere o JSON de cenas seguindo exatamente o schema.
Responda apenas com o JSON, sem markdown, sem comentários antes ou depois.
```

## Schema esperado de saída

Ver `docs/schema.md`.

Resumo: array `cenas` (3 a 12 itens) onde cada item tem `tipo` (uma das 6 strings do pool)
e props específicas do tipo. Plus `duracao_total_estimada`, `especialista_slug`,
`palavra_chave_metodo` (opcional).

## Estratégia de retry

1. Tentativa 1: `temperature=0.4`, `max_tokens=4096`.
2. Falhou Zod: re-prompt com `<erro>` explícito + instrução "corrija e retorne só o JSON". `temperature=0.2`.
3. Falhou de novo: re-prompt com `temperature=0.0`.
4. Falhou pela 3ª vez: aborta o job. Erro acionável pro estrategista. Sem placeholder silencioso.

## Prompt caching

System prompt é fixo entre execuções. Habilitar `cache_control: {type: "ephemeral"}` no
bloco do system prompt reduz custo em ~90% no segundo request do mesmo dia. TTL é 5 min
no provider; renovar a cada batch de jobs.

Ver implementação em `services/analysis/src/claude.ts`.

## Cuidados conhecidos

- **Claude às vezes inclui `\`\`\`json` antes do JSON**. O cliente faz `stripMarkdownFence()` defensivo, mas o ideal é o prompt nunca produzir isso.
- **Claude pode tentar incluir `id` nas cenas (legado do schema antigo)**. O schema novo não tem `id` — apenas `tipo`. Validação Zod rejeita.
- **Claude pode arredondar números**. O prompt explicita "NUNCA arredonde", e o eval harness deve verificar match exato com o que está no transcript.

## Histórico de versões

### v0.1.0 (deprecada)
- Modelo de 9 cenas fixas (hook, split improviso, split previsível, 4 bonecos, lower-third, CTA)
- Forçava conteúdo a caber no template, gerando invenção
- Rejeitada por não generalizar pra outros nichos

### v1.0.0
- Sequência variável (4-15 cenas), 11 tipos no pool técnico
- Passo a passo de mapeamento cronológico (3 passos obrigatórios)
- Padrão de fusão descrito no system prompt e no D4 do refine
- Problema: verificação de fusão era o último sub-item de D4, sendo frequentemente ignorada

### v1.1.0 (atual)
- Padrão de fusão movido para diagnóstico próprio (D4b), separado do D4
- D4b força percurso explícito par a par sobre a sequência atual
- Exemplo concreto com o caso exato das 3 rendas incluído no diagnóstico
- Sem engessamento: o princípio se aplica a qualquer nicho e qualquer tipo de comparação progressiva
