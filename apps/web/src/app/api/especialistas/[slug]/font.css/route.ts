/**
 * GET /api/especialistas/[slug]/font.css
 *   — retorna CSS @font-face para a fonte self-hosted do especialista
 *   — usado tanto pelo browser player quanto pelo Remotion (via fonte_url)
 */

import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { REPO_ROOT } from "@/lib/db";

const FONTS_DIR = path.join(REPO_ROOT, "apps", "web", "public", "fonts");

function fontFamilyFromFilename(filename: string): string {
  const base = filename.replace(/\.(woff2?|ttf|otf)$/i, "");
  const clean = base
    .replace(/[-_](Bold|Italic|Light|Regular|Medium|SemiBold|ExtraBold|Black|Thin|ExtraLight|BoldItalic|LightItalic|MediumItalic)$/i, "")
    .replace(/[-_]/g, " ")
    .trim();
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case "woff2": return "font/woff2";
    case "woff":  return "font/woff";
    case "ttf":   return "font/ttf";
    case "otf":   return "font/otf";
    default:      return "font/woff2";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const dir = path.join(FONTS_DIR, slug);

  if (!existsSync(dir)) {
    return new NextResponse("/* no font */", {
      status: 404,
      headers: { "Content-Type": "text/css" },
    });
  }

  const files = readdirSync(dir).filter((f) =>
    /\.(woff2?|ttf|otf)$/i.test(f)
  );

  if (files.length === 0) {
    return new NextResponse("/* no font files */", {
      status: 404,
      headers: { "Content-Type": "text/css" },
    });
  }

  // Gera @font-face para cada arquivo encontrado (suporte a múltiplos pesos)
  const blocks = files.map((filename) => {
    const fontFamily = fontFamilyFromFilename(filename);
    const ext = filename.split(".").pop()!.toLowerCase();
    const mime = mimeForExt(ext);

    // Detecta peso pelo nome do arquivo
    const weightMap: Record<string, number> = {
      thin: 100, extralight: 200, light: 300, regular: 400,
      medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
    };
    const lowerFile = filename.toLowerCase();
    let fontWeight = 400;
    for (const [key, val] of Object.entries(weightMap)) {
      if (lowerFile.includes(key)) { fontWeight = val; break; }
    }
    const fontStyle = lowerFile.includes("italic") ? "italic" : "normal";

    // Lê o arquivo e converte para base64 para evitar CORS no Remotion
    const fontBuffer = readFileSync(path.join(dir, filename));
    const base64 = fontBuffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    return `@font-face {
  font-family: '${fontFamily}';
  src: url('${dataUrl}') format('${ext === "ttf" ? "truetype" : ext}');
  font-weight: ${fontWeight};
  font-style: ${fontStyle};
  font-display: swap;
}`;
  });

  const css = blocks.join("\n\n");

  return new NextResponse(css, {
    status: 200,
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
