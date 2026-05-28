/**
 * GET /api/jobs/[jobId]/download?format=reels|wide|square
 * Serve o mp4 gerado para download no browser.
 * Se format nao for passado, tenta reel_reels.mp4, depois reel.mp4 (legado).
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const JOBS_DIR = process.env.JOBS_DIR
  ? path.resolve(REPO_ROOT, process.env.JOBS_DIR)
  : path.join(REPO_ROOT, "jobs");

const VALID_FORMATS = ["reels", "wide", "square"] as const;
type FormatKey = typeof VALID_FORMATS[number];

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const outDir = path.join(JOBS_DIR, jobId, "out");

  const formatParam = req.nextUrl.searchParams.get("format") as FormatKey | null;

  // Candidatos em ordem de prioridade
  const candidates: { file: string; name: string }[] = [];

  if (formatParam && VALID_FORMATS.includes(formatParam)) {
    candidates.push({ file: `reel_${formatParam}.mp4`, name: `reel_${formatParam}.mp4` });
  }

  // Fallbacks para compatibilidade com renders antigos
  candidates.push(
    { file: "reel_reels.mp4", name: "reel_reels.mp4" },
    { file: "reel.mp4",       name: "reel.mp4" },
  );

  const found = candidates.find((c) => existsSync(path.join(outDir, c.file)));

  if (!found) {
    return NextResponse.json({ error: "Arquivo nao encontrado" }, { status: 404 });
  }

  const filePath = path.join(outDir, found.file);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${found.name}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
