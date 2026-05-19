import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";

import { ReelPropsSchema, type ReelProps } from "@pontob/schema";
import { SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT, buildUserPrompt, buildRefinePrompt, PROMPT_VERSION } from "./prompt";

const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const MAX_TOKENS_REFINE = 8192; // refine escreve bloco <diagnostico> antes do JSON

export type AnalyzeParams = {
  transcript: object;
  videoOriginalPath: string;
  especialista: {
    nome: string;
    cargo: string;
    area_atuacao?: string;
    publico_alvo?: string;
    tom_de_voz?: string;
    vocabulario_prioritario?: Array<{ termo: string; tipo: "bandeira" | "jargao" }>;
    palavras_a_evitar?: string[];
    cta_padrao?: {
      formato: string;
      palavra_ou_evento?: string;
      texto_secundario?: string;
    };
    identidade_visual?: {
      cor_destaque_primaria?: string;
      cor_destaque_secundaria?: string;
    };
    metricas_referencia?: Array<{ nome: string; unidade: string; contexto?: string }>;
    observacoes?: string;
  };
  brief?: string;
};

export type AnalyzeResult = {
  scenes: ReelProps;
  metadata: {
    promptVersion: string;
    model: string;
    tentativas: number;
    tokens: {
      input: number;
      output: number;
      cacheRead: number;
      cacheCreation: number;
    };
  };
};

/** Remove markdown fence caso Claude envolva o JSON em ```json ... ``` */
function stripMarkdownFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/**
 * Remove blocos de analise/diagnostico (<analise> ou <diagnostico>) que o Claude
 * escreve antes do JSON quando instruido a pensar em voz alta.
 * Retorna apenas o JSON.
 */
function stripAnalysisBlock(text: string): string {
  const stripped = text
    .replace(/<analise>[\s\S]*?<\/analise>/gi, "")
    .replace(/<diagnostico>[\s\S]*?<\/diagnostico>/gi, "")
    .trim();
  const jsonStart = stripped.indexOf("{");
  if (jsonStart === -1) return stripped;
  return stripped.slice(jsonStart);
}

// ── Cobertura do CTA até o fim da última fala ────────────────────────────────
// Garante que o reel nunca encerre antes do mentor parar de falar.
// Usa o end do último segmento do transcript como referência — não a duração
// total do arquivo, que pode ter silêncio/respiro após a fala.
//
// Lógica: calcula a posição de início do CTA (soma das durações anteriores
// + start_segundos da cena com vídeo que inicia o "relógio"), depois verifica
// se startCTA + duracaoCTA cobre fimUltimaFala + buffer.

type SegLike = { start: number; end: number };

function corrigirCoberturaCta(scenes: ReelProps, transcript: object): ReelProps {
  const t = transcript as Record<string, unknown>;
  const segs = Array.isArray(t.segments) ? (t.segments as SegLike[]) : [];
  if (!segs.length) return scenes;

  const fimUltimaFala = segs[segs.length - 1].end;
  const buffer = 0.5;

  const scenesRaw = scenes as Record<string, unknown>;
  const videoStart: number = typeof scenesRaw.video_start_segundos === "number"
    ? scenesRaw.video_start_segundos as number
    : 0;

  const cenas = [...scenes.cenas];
  const ultimaIdx = cenas.length - 1;
  const ultima = cenas[ultimaIdx];
  if (ultima.tipo !== "CTA") return scenes;

  // Detecta início da fala do CTA: último segmento de fala que NÃO é encerramento puro
  // ("Eu te vejo lá", "Até lá") — queremos o start do bloco do CTA completo
  const falaCtaIdx = (() => {
    // Procura o segmento mais cedo que contém palavras típicas de CTA
    const ctaKeywords = ["clique", "coment", "garanta", "acesse", "inscreva", "aperte", "arrasta", "link"];
    for (let i = 0; i < segs.length; i++) {
      const text = segs[i].text.toLowerCase();
      if (ctaKeywords.some(k => text.includes(k))) return i;
    }
    // fallback: dois últimos segmentos
    return Math.max(0, segs.length - 2);
  })();

  const startFalaCta = segs[falaCtaIdx].start;
  const fimNecessario = fimUltimaFala + buffer;

  // pos_CTA atual = videoStart + soma das durações antes do CTA
  const somaAnteCTA = cenas.slice(0, ultimaIdx).reduce((acc, c) => acc + c.duracao_segundos, 0);
  const posCTAAtual = videoStart + somaAnteCTA;

  // Gap entre onde o CTA começa e onde deveria começar
  const gap = startFalaCta - posCTAAtual; // positivo = CTA começa cedo demais

  const duracaoCtaCorreta = Math.max(4, Math.round((fimNecessario - startFalaCta) * 10) / 10);

  if (Math.abs(gap) < 1 && Math.abs(ultima.duracao_segundos - duracaoCtaCorreta) < 1) {
    return scenes; // tudo ok
  }

  console.log(`[corrigirCoberturaCta] startFalaCta=${startFalaCta.toFixed(2)}s posCTA=${posCTAAtual.toFixed(2)}s gap=${gap.toFixed(2)}s | CTA: ${ultima.duracao_segundos}s -> ${duracaoCtaCorreta}s`);

  // Ajusta a última cena ANTES do CTA para preencher o gap
  // (tipicamente ConviteEvento ou último overlay)
  if (Math.abs(gap) >= 1 && ultimaIdx > 0) {
    const penultimaIdx = ultimaIdx - 1;
    const penultima = cenas[penultimaIdx];
    const novaDuracaoPenultima = Math.max(1, Math.round((penultima.duracao_segundos + gap) * 10) / 10);
    console.log(`[corrigirCoberturaCta] expandindo cena ${penultimaIdx + 1} (${penultima.tipo}): ${penultima.duracao_segundos}s -> ${novaDuracaoPenultima}s`);
    cenas[penultimaIdx] = { ...penultima, duracao_segundos: novaDuracaoPenultima };
  }

  // Corrige duração do CTA
  cenas[ultimaIdx] = { ...ultima, duracao_segundos: duracaoCtaCorreta };

  const novaSoma = cenas.reduce((acc, c) => acc + c.duracao_segundos, 0);
  return {
    ...scenes,
    cenas,
    duracao_total_estimada: Math.round(novaSoma * 10) / 10,
  };
}

// ── Defaults de SFX por tipo de cena ─────────────────────────────────────────
// Aplicados programaticamente após validação Zod — não dependem do Claude decidir.

const SFX_DEFAULT: Record<string, string> = {
  Hook:               "sfx/whoosh.mp3",
  FraseImpacto:       "sfx/transition.mp3",
  ComparativoNumerico:"sfx/ding.mp3",
  GraficoBarra:       "sfx/slide.mp3",
  GraficoLinha:       "sfx/slide.mp3",
  VideoCitacao:       "sfx/slide.mp3",
  ListaPontos:        "sfx/pop.mp3",
  MiniCaso:           "sfx/ding.mp3",
  TransicaoTexto:     "sfx/transition.mp3",
  ConviteEvento:      "sfx/slide.mp3",
  CTA:                "sfx/transition.mp3",
};

function aplicarSfxDefaults(scenes: ReelProps): ReelProps {
  return {
    ...scenes,
    cenas: scenes.cenas.map((cena) => {
      if (cena.sfx) return cena; // já tem sfx — respeita a escolha
      const path = SFX_DEFAULT[cena.tipo];
      if (!path) return cena;
      return { ...cena, sfx: { path, volume: 2 } } as typeof cena;
    }),
  };
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly tentativas: number,
    public readonly ultimaResposta?: string,
    public readonly zodError?: ZodError,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

/**
 * Roda analise da transcricao com Claude e retorna JSON validado.
 * 3 tentativas, temperatura caindo (0.4 -> 0.2 -> 0.0).
 */
export async function analyze(
  params: AnalyzeParams,
  options: { model?: string; apiKey?: string } = {},
): Promise<AnalyzeResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY nao definido. Passe via env ou options.apiKey");
  }

  const client = new Anthropic({ apiKey });
  const model = options.model ?? DEFAULT_MODEL;
  const userPrompt = buildUserPrompt({
    transcript: params.transcript,
    videoOriginalPath: params.videoOriginalPath,
    especialista: params.especialista,
    brief: params.brief,
  });

  const tokensAcumulados = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheCreation: 0,
  };

  const temperaturas = [0.4, 0.2, 0.0];
  let ultimaResposta = "";
  let ultimoErroZod: ZodError | undefined;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const temperature = temperaturas[tentativa - 1];

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: userPrompt,
      },
    ];

    if (tentativa > 1 && ultimoErroZod) {
      messages.push({
        role: "assistant",
        content: ultimaResposta,
      });
      messages.push({
        role: "user",
        content: `O JSON anterior falhou na validacao Zod com este erro:\n\n${ultimoErroZod.errors
          .map((e) => `- ${e.path.join(".")}: ${e.message}`)
          .join("\n")}\n\nCorrija e retorne apenas o JSON valido.`,
      });
    }

    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    tokensAcumulados.input += response.usage.input_tokens;
    tokensAcumulados.output += response.usage.output_tokens;
    tokensAcumulados.cacheRead += response.usage.cache_read_input_tokens ?? 0;
    tokensAcumulados.cacheCreation += response.usage.cache_creation_input_tokens ?? 0;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new AnalysisError(
        "Resposta do Claude nao tem bloco de texto",
        tentativa,
      );
    }
    ultimaResposta = textBlock.text;

    // Remove bloco <analise> (chain-of-thought) e markdown, extrai JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripMarkdownFence(stripAnalysisBlock(ultimaResposta)));
    } catch (err) {
      console.error(
        `[analyze] tentativa ${tentativa}: JSON invalido, retentando...`,
      );
      continue;
    }

    const validation = ReelPropsSchema.safeParse(parsed);
    if (validation.success) {
      const somaReal = validation.data.cenas.reduce(
        (acc, cena) => acc + cena.duracao_segundos,
        0,
      );
      const scenesComSfx = aplicarSfxDefaults({
        ...validation.data,
        duracao_total_estimada: Math.round(somaReal * 10) / 10,
      });
      const scenesNormalizados = corrigirCoberturaCta(scenesComSfx, params.transcript);

      return {
        scenes: scenesNormalizados,
        metadata: {
          promptVersion: PROMPT_VERSION,
          model,
          tentativas: tentativa,
          tokens: tokensAcumulados,
        },
      };
    }

    console.error(
      `[analyze] tentativa ${tentativa}: schema invalido (${validation.error.errors.length} erros), retentando...`,
    );
    ultimoErroZod = validation.error;
  }

  throw new AnalysisError(
    `Falha apos 3 tentativas. Ultimo erro Zod: ${
      ultimoErroZod?.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ") ?? "desconhecido"
    }`,
    3,
    ultimaResposta,
    ultimoErroZod,
  );
}

// Refinamento

export type RefineParams = {
  transcript: object;
  videoOriginalPath: string;
  cenasAtuais: object;
  brief?: string;
  especialista: {
    nome: string;
    cargo: string;
    area_atuacao?: string;
    identidade_visual?: {
      cor_destaque_primaria?: string;
      cor_destaque_secundaria?: string;
    };
    observacoes?: string;
  };
};

/**
 * Avalia a sequencia de cenas atual + transcricao e devolve uma versao melhorada.
 */
export async function refine(
  params: RefineParams,
  options: { model?: string; apiKey?: string } = {},
): Promise<AnalyzeResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY nao definido.");

  const client = new Anthropic({ apiKey });
  const model = options.model ?? DEFAULT_MODEL;

  const userPrompt = buildRefinePrompt({
    transcript: params.transcript,
    videoOriginalPath: params.videoOriginalPath,
    cenatAtual: params.cenasAtuais,
    especialista: params.especialista,
    brief: params.brief,
  });

  const tokensAcumulados = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  const temperaturas = [0.3, 0.1, 0.0];
  let ultimaResposta = "";
  let ultimoErroZod: ZodError | undefined;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];

    if (tentativa > 1 && ultimoErroZod) {
      messages.push({ role: "assistant", content: ultimaResposta });
      messages.push({
        role: "user",
        content: `O JSON anterior falhou na validacao:\n\n${ultimoErroZod.errors
          .map((e) => `- ${e.path.join(".")}: ${e.message}`)
          .join("\n")}\n\nCorrija e retorne apenas o JSON valido.`,
      });
    }

    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS_REFINE,
      temperature: temperaturas[tentativa - 1],
      system: [{ type: "text", text: REFINE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages,
    });

    tokensAcumulados.input += response.usage.input_tokens;
    tokensAcumulados.output += response.usage.output_tokens;
    tokensAcumulados.cacheRead += response.usage.cache_read_input_tokens ?? 0;
    tokensAcumulados.cacheCreation += response.usage.cache_creation_input_tokens ?? 0;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new AnalysisError("Resposta sem texto", tentativa);
    ultimaResposta = textBlock.text;

    // Remove bloco <diagnostico> (chain-of-thought) e extrai JSON
    const jsonText = stripAnalysisBlock(ultimaResposta);

    let parsed: unknown;
    try { parsed = JSON.parse(stripMarkdownFence(jsonText)); }
    catch { console.error(`[refine] tentativa ${tentativa}: JSON invalido`); continue; }

    const validation = ReelPropsSchema.safeParse(parsed);
    if (validation.success) {
      // Duração do player = janela de trim (end - start), não soma dos overlays.
      // Se o agente preservou video_start/end do JSON de entrada, usamos esses valores.
      // Caso contrário, cai na soma dos overlays como fallback.
      const data = validation.data;
      const trimStart = typeof (data as Record<string, unknown>).video_start_segundos === "number"
        ? (data as Record<string, unknown>).video_start_segundos as number
        : 0;
      const trimEnd = typeof (data as Record<string, unknown>).video_end_segundos === "number"
        ? (data as Record<string, unknown>).video_end_segundos as number
        : null;
      const somaReal = data.cenas.reduce((acc, c) => acc + c.duracao_segundos, 0);
      const duracaoTotal = trimEnd !== null && trimEnd > trimStart
        ? Math.round((trimEnd - trimStart) * 10) / 10
        : Math.round(somaReal * 10) / 10;
      const scenesComSfxR = aplicarSfxDefaults({ ...data, duracao_total_estimada: duracaoTotal });
      return {
        scenes: corrigirCoberturaCta(scenesComSfxR, params.transcript),
        metadata: { promptVersion: PROMPT_VERSION, model, tentativas: tentativa, tokens: tokensAcumulados },
      };
    }

    console.error(`[refine] tentativa ${tentativa}: schema invalido, retentando...`);
    ultimoErroZod = validation.error;
  }

  throw new AnalysisError(
    `Refine falhou apos 3 tentativas: ${ultimoErroZod?.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ") ?? "desconhecido"}`,
    3, ultimaResposta, ultimoErroZod,
  );
}
