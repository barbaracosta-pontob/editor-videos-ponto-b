/**
 * GET /api/jobs/[jobId]
 * Retorna os dados de um job processado, incluindo duracao real do video.
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const JOBS_DIR = process.env.JOBS_DIR
  ? path.resolve(REPO_ROOT, process.env.JOBS_DIR)
  : path.join(REPO_ROOT, "jobs");

async function getVideoDuration(videoPath: string): Promise<number | null> {
  if (!existsSync(videoPath)) return null;
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);
    const d = parseFloat(stdout.trim());
    return isNaN(d) ? null : Math.round(d * 10) / 10;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const jobDir = path.join(JOBS_DIR, jobId);
  const scenesPath = path.join(jobDir, "scenes.json");

  if (!existsSync(scenesPath)) {
    return NextResponse.json({ error: "Job nao encontrado" }, { status: 404 });
  }

  try {
    const scenes = JSON.parse(readFileSync(scenesPath, "utf-8"));

    let fileName = "";
    let createdAt = "";

    try {
      const files = readdirSync(jobDir);
      const mp4 = files.find((f) => f.endsWith(".mp4"));
      if (mp4) fileName = mp4;
    } catch {}

    try {
      createdAt = statSync(scenesPath).mtime.toISOString();
    } catch {}

    const videoPath = path.join(jobDir, fileName);
    const transcriptPath = path.join(jobDir, "transcript.json");
    const outputPath = path.join(jobDir, "out", "reel.mp4");

    const videoDuration = await getVideoDuration(videoPath);

    return NextResponse.json({
      id: jobId,
      fileName,
      videoPath,
      transcriptPath,
      scenesPath,
      status: "ready",
      scenes,
      outputPath: existsSync(outputPath) ? outputPath : null,
      error: null,
      createdAt,
      especialista_slug: scenes.especialista_slug ?? "generico",
      videoDuration,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
