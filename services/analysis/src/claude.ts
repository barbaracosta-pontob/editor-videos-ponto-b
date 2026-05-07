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
      const scenesNormalizados = {
        ...validation.data,
        duracao_total_estimada: Math.round(somaReal * 10) / 10,
      };

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
      const somaReal = validation.data.cenas.reduce((acc, c) => acc + c.duracao_segundos, 0);
      return {
        scenes: { ...validation.data, duracao_total_estimada: Math.round(somaReal * 10) / 10 },
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
