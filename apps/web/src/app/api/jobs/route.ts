/**
 * POST /api/jobs
 * Recebe o vídeo + brief + especialista_slug.
 * Roda: transcrição (Python) → análise (Claude) → retorna Job com cenas prontas.
 */

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { analyze } from "../../../services/analysis-bridge";
import { getEspecialistaOrGenerico } from "../../../lib/db";

const execFileAsync = promisify(execFile);

// Raiz do monorepo — 3 níveis acima de apps/web/src/app/api/jobs
const REPO_ROOT = path.resolve(process.cwd(), "../..");

// JOBS_DIR: respeita variável de ambiente se definida, senão usa ./jobs na raiz do monorepo
const JOBS_DIR = process.env.JOBS_DIR
  ? path.resolve(REPO_ROOT, process.env.JOBS_DIR)
  : path.join(REPO_ROOT, "jobs");
const PYTHON = path.join(
  REPO_ROOT,
  process.platform === "win32"
    ? "services/transcription/.venv/Scripts/python.exe"
    : "services/transcription/.venv/bin/python"
);
const TRANSCRIBE_SCRIPT = path.join(REPO_ROOT, "services/transcription/run.py");

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const videoFile = form.get("video") as File | null;
    const brief = (form.get("brief") as string) ?? "";
    const especialistaSlug = (form.get("especialista_slug") as string) ?? "generico";

    if (!videoFile) return NextResponse.json({ error: "Vídeo não enviado" }, { status: 400 });

    // Cria pasta do job
    const jobId = crypto.randomUUID().slice(0, 8);
    const jobDir = path.join(JOBS_DIR, jobId);
    await mkdir(jobDir, { recursive: true });

    // Salva o vídeo
    const videoPath = path.join(jobDir, videoFile.name);
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    await writeFile(videoPath, videoBuffer);

    // --- ETAPA 1: Transcrição ---
    const transcriptPath = path.join(jobDir, "transcript.json");
    const pythonBin = existsSync(PYTHON) ? PYTHON : "python3";

    await execFileAsync(pythonBin, [
      TRANSCRIBE_SCRIPT,
      "--input", videoPath,
      "--output", transcriptPath,
      "--model", process.env.WHISPER_MODEL ?? "large-v3",
      "--device", process.env.WHISPER_DEVICE ?? "auto",
    ]);

    const transcript = JSON.parse(await readFile(transcriptPath, "utf-8"));

    // --- ETAPA 2: Carrega especialista ---
    const rawEspecialista = getEspecialistaOrGenerico(especialistaSlug);

    // Mapeia campos do banco para o formato esperado pelo agente
    const especialista: Parameters<typeof analyze>[0]["especialista"] = {
      nome: rawEspecialista.nome || "Especialista",
      cargo: rawEspecialista.cargo || "",
      area_atuacao: rawEspecialista.nicho || undefined,
      publico_alvo: rawEspecialista.publico_alvo || undefined,
      tom_de_voz: rawEspecialista.tom_de_voz || undefined,
      vocabulario_prioritario: rawEspecialista.vocabulario
        ? rawEspecialista.vocabulario.split(",").map((t) => ({ termo: t.trim(), tipo: "jargao" as const })).filter((t) => t.termo)
        : undefined,
      palavras_a_evitar: rawEspecialista.palavras_proibidas
        ? rawEspecialista.palavras_proibidas.split(",").map((p) => p.trim()).filter(Boolean)
        : undefined,
      cta_padrao: rawEspecialista.cta_formato
        ? {
            formato: rawEspecialista.cta_formato,
            palavra_ou_evento: rawEspecialista.cta_palavra || undefined,
            texto_secundario: rawEspecialista.cta_texto_secundario || undefined,
          }
        : undefined,
      metricas_referencia: rawEspecialista.metricas
        ? rawEspecialista.metricas.split(",").map((m) => ({ nome: m.trim(), unidade: "" })).filter((m) => m.nome)
        : undefined,
      identidade_visual: {
        cor_destaque_primaria: rawEspecialista.cor_primaria,
        cor_destaque_secundaria: rawEspecialista.cor_secundaria,
      },
      observacoes: [
        rawEspecialista.brief_padrao || null,
        rawEspecialista.posicionamento_texto
          ? `Posicionamento padrão de texto: ${rawEspecialista.posicionamento_texto}`
          : null,
      ]
        .filter(Boolean)
        .join("\n") || undefined,
    };

    // Brief por job é somado ao brief_padrao do especialista (não substitui)
    const briefFinal = [rawEspecialista.brief_padrao, brief]
      .filter(Boolean)
      .join("\n\n---\nBRIEF DO JOB:\n") || undefined;

    // --- ETAPA 3: Análise Claude ---
    const result = await analyze({
      transcript,
      videoOriginalPath: videoPath,
      especialista,
      brief: briefFinal,
    });

    // Injeta identidade visual do especialista no scenes.json para uso no render e player
    const scenesComCores = {
      ...result.scenes,
      cor_primaria: rawEspecialista.cor_primaria || undefined,
      cor_secundaria: rawEspecialista.cor_secundaria || undefined,
      fonte_url: rawEspecialista.fonte_url || undefined,
      fonte_familia: rawEspecialista.fonte_familia || undefined,
      especialista_slug: especialistaSlug,
    };

    const scenesPath = path.join(jobDir, "scenes.json");
    await writeFile(scenesPath, JSON.stringify(scenesComCores, null, 2), "utf-8");

    // Retorna o job completo
    return NextResponse.json({
      id: jobId,
      fileName: videoFile.name,
      videoPath,
      transcriptPath,
      scenesPath,
      status: "ready",
      scenes: scenesComCores,
      outputPath: null,
      error: null,
      createdAt: new Date().toISOString(),
      especialista_slug: especialistaSlug,
    });

  } catch (err) {
    console.error("[POST /api/jobs]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/jobs
 * Lista todos os jobs processados (que têm scenes.json).
 */
export async function GET() {
  try {
    const jobsDir = path.join(REPO_ROOT, "jobs");
    if (!existsSync(jobsDir)) return NextResponse.json([]);

    const entries = readdirSync(jobsDir, { withFileTypes: true });
    const jobs = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const jobId = entry.name;
      const jobDir = path.join(jobsDir, jobId);
      const scenesPath = path.join(jobDir, "scenes.json");
      if (!existsSync(scenesPath)) continue;

      let fileName = "";
      let especialista_slug = "generico";
      let createdAt = "";

      try {
        const files = readdirSync(jobDir);
        const mp4 = files.find((f) => f.endsWith(".mp4"));
        if (mp4) fileName = mp4;
      } catch {}

      try {
        const stat = statSync(scenesPath);
        createdAt = stat.mtime.toISOString();
      } catch {}

      try {
        const scenes = JSON.parse(readFileSync(scenesPath, "utf-8"));
        especialista_slug = scenes.especialista_slug ?? "generico";
      } catch {}

      const hasOutput = existsSync(path.join(jobDir, "out", "reel.mp4"));

      jobs.push({ id: jobId, fileName, especialista_slug, createdAt, hasOutput });
    }

    jobs.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return NextResponse.json(jobs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
