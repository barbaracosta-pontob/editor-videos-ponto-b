/**
 * POST /api/especialistas/[slug]/font
 *   — recebe multipart com campo "file" (.woff2 / .ttf / .otf)
 *   — salva em public/fonts/[slug]/[filename]
 *   — atualiza fonte_url e fonte_familia no JSON do especialista
 *   — retorna { fonte_url, fonte_familia }
 *
 * DELETE /api/especialistas/[slug]/font
 *   — remove o arquivo salvo e limpa os campos no JSON
 */

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { mkdirSync, writeFileSync, readdirSync, existsSync, unlinkSync } from "node:fs";
import { getEspecialista, saveEspecialista, REPO_ROOT } from "@/lib/db";

const FONTS_DIR = path.join(REPO_ROOT, "apps", "web", "public", "fonts");

function slugFontDir(slug: string) {
  return path.join(FONTS_DIR, slug);
}

/** Deriva o nome CSS da fonte a partir do nome do arquivo */
function fontFamilyFromFilename(filename: string): string {
  // "Butler-Bold.woff2" → "Butler"
  // "PlusJakartaSans-Regular.woff2" → "Plus Jakarta Sans"
  const base = filename.replace(/\.(woff2?|ttf|otf)$/i, "");
  // Remove sufixos de peso/estilo comuns
  const clean = base
    .replace(/[-_](Bold|Italic|Light|Regular|Medium|SemiBold|ExtraBold|Black|Thin|ExtraLight|BoldItalic|LightItalic|MediumItalic)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
  // Capitaliza cada palavra
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const row = getEspecialista(slug);
  if (!row) {
    return NextResponse.json({ error: "Especialista não encontrado" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["woff2", "woff", "ttf", "otf"].includes(ext ?? "")) {
      return NextResponse.json(
        { error: "Formato não suportado. Use .woff2, .woff, .ttf ou .otf" },
        { status: 400 }
      );
    }

    // Sanitiza o nome do arquivo
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const dir = slugFontDir(slug);
    mkdirSync(dir, { recursive: true });

    // Remove arquivos antigos do mesmo especialista
    if (existsSync(dir)) {
      readdirSync(dir).forEach((f) => unlinkSync(path.join(dir, f)));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(path.join(dir, safeFilename), buffer);

    // URL pública relativa
    const fonteUrl = `/api/especialistas/${slug}/font.css`;
    const fonteFamilia = fontFamilyFromFilename(safeFilename);

    saveEspecialista({
      ...row,
      fonte_url: fonteUrl,
      fonte_familia: fonteFamilia,
    });

    return NextResponse.json({ fonte_url: fonteUrl, fonte_familia: fonteFamilia });
  } catch (err) {
    console.error("[POST /api/especialistas/[slug]/font]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const row = getEspecialista(slug);
  if (!row) {
    return NextResponse.json({ error: "Especialista não encontrado" }, { status: 404 });
  }

  try {
    const dir = slugFontDir(slug);
    if (existsSync(dir)) {
      readdirSync(dir).forEach((f) => unlinkSync(path.join(dir, f)));
    }

    saveEspecialista({ ...row, fonte_url: "", fonte_familia: "" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
