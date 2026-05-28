/**
 * DELETE /api/jobs/[jobId]/cleanup
 * Remove o diretório completo do job após o download do reel final.
 * Chamado somente depois que o arquivo já foi baixado pelo usuário.
 */

import { NextRequest, NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const JOBS_DIR = process.env.JOBS_DIR
  ? path.resolve(REPO_ROOT, process.env.JOBS_DIR)
  : path.join(REPO_ROOT, "jobs");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobDir = path.join(JOBS_DIR, params.jobId);

  if (!existsSync(jobDir)) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }

  try {
    await rm(jobDir, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/jobs/[jobId]/cleanup]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
