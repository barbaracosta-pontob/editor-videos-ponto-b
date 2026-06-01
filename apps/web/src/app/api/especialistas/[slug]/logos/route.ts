/**
 * GET    /api/especialistas/[slug]/logos        — lista logos do especialista
 * POST   /api/especialistas/[slug]/logos        — faz upload de uma logo
 * DELETE /api/especialistas/[slug]/logos?file=x — remove uma logo
 */

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdirSync, readdirSync, existsSync, unlinkSync, writeFileSync } from "node:fs";
import { REPO_ROOT } from "@/lib/db";

const LOGOS_DIR = path.join(REPO_ROOT, "apps", "web", "public", "logos");

function slugLogoDir(slug: string) {
  return path.join(LOGOS_DIR, slug);
}

function publicUrl(slug: string, filename: string) {
  return `/logos/${slug}/${filename}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const dir = slugLogoDir(params.slug);
  if (!existsSync(dir)) return NextResponse.json([]);

  const files = readdirSync(dir).filter((f) =>
    /\.(png|jpe?g|webp|svg|gif)$/i.test(f)
  );

  return NextResponse.json(
    files.map((f) => ({ filename: f, url: publicUrl(params.slug, f) }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext ?? "")) {
      return NextResponse.json(
        { error: "Formato não suportado. Use PNG, JPG, WEBP ou SVG." },
        { status: 400 }
      );
    }

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const dir = slugLogoDir(params.slug);
    mkdirSync(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(path.join(dir, safeFilename), buffer);

    return NextResponse.json({
      filename: safeFilename,
      url: publicUrl(params.slug, safeFilename),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file");

  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Nome de arquivo inválido" }, { status: 400 });
  }

  const filePath = path.join(slugLogoDir(params.slug), filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  unlinkSync(filePath);
  return NextResponse.json({ ok: true });
}
