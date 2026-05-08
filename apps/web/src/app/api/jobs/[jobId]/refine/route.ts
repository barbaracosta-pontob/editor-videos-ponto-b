/**
 * POST /api/jobs/[jobId]/refine
 *
 * Lê a transcrição e as cenas atuais do job, envia ao Claude com o
 * prompt de refinamento e devolve a sequência de cenas melhorada.
 * Também persiste o resultado em scenes.json.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { refine, AnalysisError } from "../../../../../services/analysis-bridge";
import { getEspecialistaOrGenerico } from "../../../../../lib/db";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const JOBS_DIR = process.env.JOBS_DIR
  ? path.resolve(REPO_ROOT, process.env.JOBS_DIR)
  : path.join(REPO_ROOT, "jobs");

export async function POST(
  _req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;
  const jobDir = path.join(JOBS_DIR, jobId);

  if (!existsSync(jobDir)) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }

  const transcriptPath = path.join(jobDir, "transcript.json");
  if (!existsSync(transcriptPath)) {
    return NextResponse.json({ error: "Transcrição não encontrada" }, { status: 404 });
  }
  const transcript = JSON.parse(await readFile(transcriptPath, "utf-8"));

  const scenesPath = path.join(jobDir, "scenes.json");
  if (!existsSync(scenesPath)) {
    return NextResponse.json({ error: "Cenas não encontradas" }, { status: 404 });
  }
  const cenasAtuais = JSON.parse(await readFile(scenesPath, "utf-8"));

  const especialistaSlug = cenasAtuais.especialista_slug ?? "generico";
  const rawEsp = getEspecialistaOrGenerico(especialistaSlug);

  const especialista = {
    nome: rawEsp.nome || "Especialista",
    cargo: rawEsp.cargo || "",
    area_atuacao: rawEsp.nicho || undefined,
    identidade_visual: {
      cor_destaque_primaria: rawEsp.cor_primaria,
      cor_destaque_secundaria: rawEsp.cor_secundaria,
    },
    observacoes: rawEsp.brief_padrao || undefined,
  };

  try {
    const result = await refine({
      transcript,
      videoOriginalPath: cenasAtuais.video_original_path,
      cenasAtuais,
      especialista,
    });

    // Preserva cores e metadados do especialista — o Claude não os devolve no JSON de cenas
    const scenesRefinadas = {
      ...result.scenes,
      especialista_slug: especialistaSlug,
      cor_primaria: rawEsp.cor_primaria || undefined,
      cor_secundaria: rawEsp.cor_secundaria || undefined,
      fonte_url: rawEsp.fonte_url || undefined,
      fonte_familia: rawEsp.fonte_familia || undefined,
    };
    await writeFile(scenesPath, JSON.stringify(scenesRefinadas, null, 2), "utf-8");

    return NextResponse.json({
      scenes: scenesRefinadas,
      metadata: result.metadata,
    });
  } catch (err) {
    console.error("[refine] erro:", err);

    if (err instanceof AnalysisError) {
      return NextResponse.json(
        {
          error: err.message,
          tentativas: err.tentativas,
          detalhe: err.zodError
            ? err.zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
            : undefined,
        },
        { status: 422 },
      );
    }

    // Erros da API Anthropic (saldo, rate limit, etc.)
    const message = err instanceof Error ? err.message : String(err);
    const isCredits = message.includes("credit balance");
    const isTruncated = message.includes("max_tokens") || message.includes("length");

    return NextResponse.json(
      {
        error: isCredits
          ? "Saldo insuficiente na API Anthropic. Acesse platform.claude.com/settings/billing para adicionar créditos."
          : isTruncated
          ? "Resposta truncada pelo limite de tokens. Tente novamente."
          : `Erro inesperado: ${message}`,
      },
      { status: 500 },
    );
  }
}
