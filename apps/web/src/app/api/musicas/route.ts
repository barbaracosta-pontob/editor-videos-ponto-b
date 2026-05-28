/**
 * GET /api/musicas
 *
 * Lista os arquivos .mp3 disponíveis na pasta apps/web/public/musica/.
 * Retorna array de { filename, label, path } onde path é o valor
 * a salvar em musica_fundo.path no schema (ex: "musica/lofi-beat.mp3").
 */

import { NextResponse } from "next/server";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

const MUSICA_DIR = path.join(process.cwd(), "public", "musica");

function toLabel(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")      // remove extensão
    .replace(/[-_]/g, " ")        // hífens e underscores viram espaço
    .replace(/\b\w/g, (c) => c.toUpperCase()); // capitaliza palavras
}

export async function GET() {
  if (!existsSync(MUSICA_DIR)) {
    return NextResponse.json([]);
  }

  const files = readdirSync(MUSICA_DIR)
    .filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f))
    .sort()
    .map((filename) => ({
      filename,
      label: toLabel(filename),
      path: `musica/${filename}`,
    }));

  return NextResponse.json(files);
}
