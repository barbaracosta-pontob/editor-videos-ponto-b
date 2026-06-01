/**
 * POST /api/jobs/[jobId]/render
 *
 * Responde com Server-Sent Events (SSE) para que o cliente receba
 * progresso em tempo real durante a renderização do Remotion.
 *
 * Eventos emitidos:
 *   data: {"type":"progress","frames":450,"total":1590,"eta":"2m 30s"}
 *   data: {"type":"done","outputPath":"..."}
 *   data: {"type":"error","message":"..."}
 */

import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const JOBS_DIR = process.env.JOBS_DIR
  ? path.resolve(REPO_ROOT, process.env.JOBS_DIR)
  : path.join(REPO_ROOT, "jobs");
const REMOTION_DIR = path.join(REPO_ROOT, "apps/remotion");

// Remotion passa por 3 fases distintas durante o render. Cada uma emite
// padroes de log diferentes:
//
//   1. Bundling     — "Bundled" / "Bundling" / "(1/3) Bundling code"
//   2. Rendering    — "Rendered X/Y" — frame-by-frame via Chromium
//   3. Encoding     — "Encoded X/Y" / "Stitching" / "Combining" — FFmpeg junta tudo
//
// O parser antigo so capturava (2). Quando o Remotion passava para (3) ele
// parava de emitir "Rendered" e a UI congelava em "Y/Y frames" — mesmo
// com o servidor ainda trabalhando no encoding.

const FRAME_RE = /Rendered\s+(\d+)\/(\d+)/i;
const ENCODED_RE = /Encoded\s+(\d+)\/(\d+)/i;
const ETA_RE = /(\d+h\s*)?(\d+m\s*)?(\d+s)\s+remaining/i;

// Marcadores de transicao de fase (case-insensitive). Detectados via includes
// em vez de regex completa porque o Remotion pode formatar de varias formas.
const PHASE_MARKERS: Array<{ pattern: RegExp; phase: RenderPhase }> = [
  { pattern: /\bbundl(ed|ing)\b/i,                          phase: "bundling" },
  { pattern: /Composition information loaded/i,              phase: "bundling" },
  { pattern: /\bRendering frames\b/i,                        phase: "rendering" },
  { pattern: /\bStitching\b/i,                               phase: "encoding" },
  { pattern: /\b(Encoding|Combining|Muxing)\b/i,             phase: "encoding" },
  { pattern: /\bFinaliz(ing|ed)\b/i,                         phase: "encoding" },
];

type RenderPhase = "bundling" | "rendering" | "encoding";

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}

function resolveRemotionBin(): string {
  const isWin = process.platform === "win32";
  const ext = isWin ? ".cmd" : "";
  const local = path.join(REMOTION_DIR, `node_modules/.bin/remotion${ext}`);
  const root = path.join(REPO_ROOT, `node_modules/.bin/remotion${ext}`);
  return existsSync(local) ? local : existsSync(root) ? root : `remotion${ext}`;
}

// Prefixos de assets estáticos que devem ser convertidos para URL HTTP absoluta
// para que o Remotion possa buscá-los via rede durante o render (sem staticFile).
const STATIC_ASSET_PREFIXES = ["sfx/", "musica/", "ambient/"];

function isStaticAssetPath(val: unknown): val is string {
  return typeof val === "string" &&
    !val.startsWith("http") &&
    STATIC_ASSET_PREFIXES.some((p) => val.startsWith(p));
}

function substituirVideoPaths(obj: unknown, videoUrl: string, baseUrl: string): unknown {
  if (Array.isArray(obj)) return obj.map((v) => substituirVideoPaths(v, videoUrl, baseUrl));
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => {
        if (k === "video_path" || k === "video_original_path") return [k, videoUrl];
        // Converte sfx.path e musica_fundo.path relativos para URL HTTP absoluta.
        // O Remotion proíbe staticFile() com URLs — assets devem ser servidos via HTTP.
        if (k === "path" && isStaticAssetPath(v)) {
          return [k, `${baseUrl}/${(v as string).replace(/^\//, "")}`];
        }
        // Converte logo_url relativa para absoluta
        if (k === "logo_url" && typeof v === "string" && v.startsWith("/")) {
          return [k, `${baseUrl}${v}`];
        }
        return [k, substituirVideoPaths(v, videoUrl, baseUrl)];
      })
    );
  }
  return obj;
}

// IMPORTANTE: o nome do arquivo de saida usa direto a formatKey
// (`reel_${formatKey}.mp4`) — sem campo `suffix` intermediario.
// Versao antiga tinha suffix="reel" para a key "reels", gerando
// `reel_reel.mp4` em disco enquanto o download tentava buscar
// `reel_reels.mp4` (HTTP 404). Eliminamos o intermediario para garantir
// que render e download sempre concordem sobre o nome do arquivo.
const FORMAT_CONFIG = {
  reels:  { compositionId: "Reel",       label: "9:16 Reels" },
  wide:   { compositionId: "ReelWide",   label: "16:9 Wide" },
  square: { compositionId: "ReelSquare", label: "1:1 Square" },
} as const;

type FormatKey = keyof typeof FORMAT_CONFIG;

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const jobDir = path.join(JOBS_DIR, jobId);
  const scenesPath = path.join(jobDir, "scenes.json");

  if (!existsSync(scenesPath)) {
    return new Response(JSON.stringify({ error: "Job não encontrado" }), { status: 404 });
  }

  // Formatos selecionados pelo usuário (default: apenas reels)
  let formatos: FormatKey[] = ["reels"];
  try {
    const body = await req.json();
    if (Array.isArray(body?.formatos) && body.formatos.length > 0) {
      formatos = body.formatos.filter((f: string) => f in FORMAT_CONFIG) as FormatKey[];
      if (formatos.length === 0) formatos = ["reels"];
    }
  } catch { /* body vazio */ }

  // Prepara props antes de abrir o stream
  let propsPath: string;
  const outputDir = path.join(jobDir, "out");
  try {
    const scenes = JSON.parse(await readFile(scenesPath, "utf-8"));
    const host = req.headers.get("host") ?? "localhost:3001";
    const videoUrl = `http://${host}/api/jobs/${jobId}/video`;
    const baseUrl = `http://${host}`;
    const scenesComUrl = substituirVideoPaths(scenes, videoUrl, baseUrl);

    propsPath = path.join(jobDir, "props.json");
    await writeFile(propsPath, JSON.stringify(scenesComUrl, null, 2), "utf-8");

    await mkdir(outputDir, { recursive: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }

  // SSE stream — itera sobre cada formato selecionado sequencialmente
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const bin = resolveRemotionBin();
      const isWin = process.platform === "win32";
      const outputs: Record<string, string> = {};

      for (const formatKey of formatos) {
        const fmt = FORMAT_CONFIG[formatKey];
        const outputPath = path.join(outputDir, `reel_${formatKey}.mp4`);
        outputs[formatKey] = outputPath;

        send({ type: "format_start", format: formatKey, label: fmt.label });

        const exitCode = await new Promise<number>((resolve) => {
          const lines: string[] = [];
          let lastFrames = 0;
          let lastTotal = 0;
          let lastEta = "";
          let currentPhase: RenderPhase = "bundling";
          let lastEncodedFrames = 0;
          let lastEncodedTotal = 0;

          // Heartbeat: durante o encoding o Remotion pode ficar 30-60s sem emitir
          // linha nova. Manda um sinal "ainda vivo" a cada 2s pra UI nao parecer
          // congelada — mesmo sem progresso numerico.
          const heartbeat = setInterval(() => {
            send({
              type: "heartbeat",
              format: formatKey,
              phase: currentPhase,
            });
          }, 2000);

          const child = spawn(bin, [
            "render",
            fmt.compositionId,
            outputPath,
            `--props=${propsPath}`,
            "--log=verbose",
          ], {
            cwd: REMOTION_DIR,
            shell: isWin,
            stdio: ["ignore", "pipe", "pipe"],
          });

          function processChunk(chunk: Buffer) {
            const raw = chunk.toString();
            const text = stripAnsi(raw);

            // Detecta transicao de fase. Avanca so para frente (bundling -> rendering -> encoding)
            // para nao oscilar quando o log mistura termos.
            for (const marker of PHASE_MARKERS) {
              if (marker.pattern.test(text)) {
                const order: RenderPhase[] = ["bundling", "rendering", "encoding"];
                const idxAtual = order.indexOf(currentPhase);
                const idxNova = order.indexOf(marker.phase);
                if (idxNova > idxAtual) {
                  currentPhase = marker.phase;
                  send({ type: "phase", format: formatKey, phase: currentPhase });
                }
              }
            }

            const frameMatch = text.match(FRAME_RE);
            if (frameMatch) {
              lastFrames = parseInt(frameMatch[1], 10);
              lastTotal = parseInt(frameMatch[2], 10);
              // "Rendered X/Y" so aparece na fase de rendering — confirma a fase
              if (currentPhase === "bundling") {
                currentPhase = "rendering";
                send({ type: "phase", format: formatKey, phase: currentPhase });
              }
            }

            const encodedMatch = text.match(ENCODED_RE);
            if (encodedMatch) {
              lastEncodedFrames = parseInt(encodedMatch[1], 10);
              lastEncodedTotal = parseInt(encodedMatch[2], 10);
              // "Encoded X/Y" indica fase de encoding
              if (currentPhase !== "encoding") {
                currentPhase = "encoding";
                send({ type: "phase", format: formatKey, phase: currentPhase });
              }
            }

            const etaMatch = text.match(ETA_RE);
            if (etaMatch) {
              lastEta = etaMatch[0].replace(/\s*remaining/i, "").trim();
            }

            if (currentPhase === "encoding" && lastEncodedTotal > 0) {
              send({
                type: "progress",
                format: formatKey,
                phase: "encoding",
                frames: lastEncodedFrames,
                total: lastEncodedTotal,
                eta: lastEta,
              });
            } else if (lastTotal > 0) {
              send({
                type: "progress",
                format: formatKey,
                phase: currentPhase,
                frames: lastFrames,
                total: lastTotal,
                eta: lastEta,
              });
            }
          }

          child.stdout?.on("data", (chunk: Buffer) => {
            const raw = chunk.toString();
            process.stdout.write(raw);
            lines.push(raw);
            processChunk(chunk);
          });
          child.stderr?.on("data", (chunk: Buffer) => {
            const raw = chunk.toString();
            process.stderr.write(raw);
            lines.push(raw);
            // Remotion costuma emitir progresso tambem em stderr quando o terminal nao e TTY.
            processChunk(chunk);
          });

          child.on("close", (code) => {
            clearInterval(heartbeat);
            resolve(code ?? 1);
          });
          child.on("error", (err) => {
            clearInterval(heartbeat);
            send({ type: "error", message: String(err) });
            resolve(1);
          });
        });

        if (exitCode !== 0) {
          send({ type: "error", message: `Falha ao renderizar formato ${fmt.label} (código ${exitCode})` });
          controller.close();
          return;
        }

        send({ type: "format_done", format: formatKey, label: fmt.label, outputPath });
      }

      // Todos os formatos concluídos
      send({ type: "done", outputs, outputPath: outputs["reels"] ?? Object.values(outputs)[0] });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
