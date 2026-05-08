/**
 * PUT /api/jobs/[jobId]/scenes
 * Salva as cenas editadas de volta no scenes.json do job.
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const JOBS_DIR = process.env.JOBS_DIR
  ? path.resolve(REPO_ROOT, process.env.JOBS_DIR)
  : path.join(REPO_ROOT, "jobs");

export async function PUT(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const jobDir = path.join(JOBS_DIR, jobId);
  const scenesPath = path.join(jobDir, "scenes.json");

  if (!existsSync(scenesPath)) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json();
    writeFileSync(scenesPath, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
