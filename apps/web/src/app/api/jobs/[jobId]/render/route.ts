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

// Remotion emite linhas como: "Rendered 450/1590" e "2m 30s remaining"
// Às vezes na mesma linha, às vezes separadas — parseamos tudo que vier
const FRAME_RE = /Rendered\s+(\d+)\/(\d+)/i;
const ETA_RE = /(\d+h\s*)?(\d+m\s*)?(\d+s)\s+remaining/i;

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

function substituirVideoPaths(obj: unknown, videoUrl: string, baseUrl: string): unknown {
  if (Array.isArray(obj)) return obj.map((v) => substituirVideoPaths(v, videoUrl, baseUrl));
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => {
        if (k === "video_path" || k === "video_original_path") return [k, videoUrl];
        // Converte logo_url relativa para absoluta (localhost:3001)
        if (k === "logo_url" && typeof v === "string" && v.startsWith("/")) {
          return [k, `${baseUrl}${v}`];
        }
        return [k, substituirVideoPaths(v, videoUrl, baseUrl)];
      })
    );
  }
  return obj;
}

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

  // Prepara props antes de abrir o stream
  let outputPath: string;
  try {
    const scenes = JSON.parse(await readFile(scenesPath, "utf-8"));
    const host = req.headers.get("host") ?? "localhost:3001";
    const videoUrl = `http://${host}/api/jobs/${jobId}/video`;
    const baseUrl = `http://${host}`;
    const scenesComUrl = substituirVideoPaths(scenes, videoUrl, baseUrl);

    const propsPath = path.join(jobDir, "props.json");
    await writeFile(propsPath, JSON.stringify(scenesComUrl, null, 2), "utf-8");

    const outputDir = path.join(jobDir, "out");
    await mkdir(outputDir, { recursive: true });
    outputPath = path.join(outputDir, "reel.mp4");
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }

  // SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const bin = resolveRemotionBin();
      const isWin = process.platform === "win32";

      const propsPath = path.join(jobDir, "props.json");

      const child = spawn(bin, [
        "render",
        "Reel",
        outputPath,
        `--props=${propsPath}`,
        "--log=verbose",
      ], {
        cwd: REMOTION_DIR,
        shell: isWin,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const lines: string[] = [];
      let lastFrames = 0;
      let lastTotal = 0;
      let lastEta = "";

      function processChunk(chunk: Buffer) {
        const raw = chunk.toString();
        process.stdout.write(raw);
        lines.push(raw);

        const text = stripAnsi(raw);

        const frameMatch = text.match(FRAME_RE);
        if (frameMatch) {
          lastFrames = parseInt(frameMatch[1], 10);
          lastTotal = parseInt(frameMatch[2], 10);
        }

        const etaMatch = text.match(ETA_RE);
        if (etaMatch) {
          lastEta = etaMatch[0].replace(/\s*remaining/i, "").trim();
        }

        if (lastTotal > 0) {
          send({ type: "progress", frames: lastFrames, total: lastTotal, eta: lastEta });
        }
      }

      child.stdout?.on("data", processChunk);
      child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk.toString());
        lines.push(chunk.toString());
      });

      child.on("close", (code) => {
        if (code === 0) {
          send({ type: "done", outputPath });
        } else {
          const tail = lines.join("").split("\n").slice(-60).join("\n");
          send({ type: "error", message: `Remotion CLI saiu com código ${code}\n\n${tail}` });
        }
        controller.close();
      });

      child.on("error", (err) => {
        send({ type: "error", message: String(err) });
        controller.close();
      });
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
