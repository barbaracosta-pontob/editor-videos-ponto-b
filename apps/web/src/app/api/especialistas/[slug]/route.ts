/**
 * GET    /api/especialistas/[slug]   — lê um especialista
 * PUT    /api/especialistas/[slug]   — atualiza um especialista
 * DELETE /api/especialistas/[slug]   — remove um especialista
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEspecialista,
  saveEspecialista,
  deleteEspecialista,
  especialistaExists,
} from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const row = getEspecialista(params.slug);
    if (!row) {
      return NextResponse.json({ error: "Especialista não encontrado" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (params.slug === "generico" || params.slug.startsWith("_")) {
    return NextResponse.json(
      { error: "Este perfil é reservado pelo sistema e não pode ser editado." },
      { status: 403 }
    );
  }

  try {
    if (!especialistaExists(params.slug)) {
      return NextResponse.json({ error: "Especialista não encontrado" }, { status: 404 });
    }

    const body = await req.json();

    // Preserva fonte_url/fonte_familia existentes se não vier no body
    const existing = getEspecialista(params.slug);

    const data = {
      slug: params.slug,
      nome: body.nome ?? "",
      cargo: body.cargo ?? "",
      nicho: body.nicho ?? "",
      cor_primaria: body.cor_primaria ?? "#E63946",
      cor_secundaria: body.cor_secundaria ?? "#F4C430",
      posicionamento_texto: body.posicionamento_texto ?? "rodape",
      estilo_destaque: body.estilo_destaque ?? "primaria",
      brief_padrao: body.brief_padrao ?? "",
      fonte_url: body.fonte_url !== undefined ? body.fonte_url : (existing?.fonte_url ?? ""),
      fonte_familia: body.fonte_familia !== undefined ? body.fonte_familia : (existing?.fonte_familia ?? ""),
    };

    saveEspecialista(data);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (params.slug === "generico" || params.slug.startsWith("_")) {
    return NextResponse.json(
      { error: "Este perfil é reservado pelo sistema e não pode ser excluído." },
      { status: 403 }
    );
  }

  try {
    if (!especialistaExists(params.slug)) {
      return NextResponse.json({ error: "Especialista não encontrado" }, { status: 404 });
    }

    deleteEspecialista(params.slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
