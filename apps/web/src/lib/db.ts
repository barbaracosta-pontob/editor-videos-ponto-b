/**
 * db.ts — storage de especialistas via arquivos JSON
 *
 * Cada especialista é um arquivo <slug>.json em <repo_root>/especialistas/
 * O arquivo generico.json é o fallback do sistema.
 */

import path from "node:path";
import { mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";

export const REPO_ROOT = path.resolve(process.cwd(), "../..");
export const ESPECIALISTAS_DIR = path.join(REPO_ROOT, "especialistas");

// Garante que a pasta existe
mkdirSync(ESPECIALISTAS_DIR, { recursive: true });

export type EspecialistaRow = {
  slug: string;
  nome: string;
  cargo: string;
  nicho: string;
  cor_primaria: string;
  cor_secundaria: string;
  posicionamento_texto: string;
  estilo_destaque: string;
  brief_padrao: string;
  /** URL do @import do Google Fonts — ex: https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap */
  fonte_url?: string;
  /** CSS font-family value — ex: 'Montserrat', sans-serif */
  fonte_familia?: string;

  // Campos para o agente de IA
  /** Quem é o público que assiste os vídeos — ex: "Homens e mulheres 35-55 anos, investidores iniciantes" */
  publico_alvo?: string;
  /** Tom de voz predominante — ex: "Direto e analítico, sem eufemismos" */
  tom_de_voz?: string;
  /** Formato padrão do CTA — ex: "Comente [PALAVRA] aqui embaixo" */
  cta_formato?: string;
  /** Palavra ou evento do CTA — ex: "QUERO" ou "MARATONA" */
  cta_palavra?: string;
  /** Texto secundário do CTA — ex: "Que eu te mando o link!" */
  cta_texto_secundario?: string;
  /** Termos técnicos da área que o agente deve reconhecer e priorizar */
  vocabulario?: string;
  /** Palavras e expressões proibidas nos textos de cena */
  palavras_proibidas?: string;
  /** Métricas típicas da área — ex: "ROI em %, taxa de conversão, CAC em R$" */
  metricas?: string;
};

const DEFAULTS: Omit<EspecialistaRow, "slug"> = {
  nome: "",
  cargo: "",
  nicho: "",
  cor_primaria: "#E63946",
  cor_secundaria: "#F4C430",
  posicionamento_texto: "rodape",
  estilo_destaque: "primaria",
  brief_padrao: "",
  fonte_url: "",
  fonte_familia: "",
  publico_alvo: "",
  tom_de_voz: "",
  cta_formato: "",
  cta_palavra: "",
  cta_texto_secundario: "",
  vocabulario: "",
  palavras_proibidas: "",
  metricas: "",
};

function filePath(slug: string) {
  return path.join(ESPECIALISTAS_DIR, `${slug}.json`);
}

export function listEspecialistas(): EspecialistaRow[] {
  if (!existsSync(ESPECIALISTAS_DIR)) return [];
  return readdirSync(ESPECIALISTAS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((slug) => slug !== "generico" && !slug.startsWith("_"))
    .map((slug) => getEspecialista(slug))
    .filter((e): e is EspecialistaRow => e !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

export function getEspecialista(slug: string): EspecialistaRow | null {
  const fp = filePath(slug);
  if (!existsSync(fp)) return null;
  try {
    const raw = JSON.parse(readFileSync(fp, "utf-8"));
    return { ...DEFAULTS, ...raw, slug };
  } catch {
    return null;
  }
}

export function getEspecialistaOrGenerico(slug: string): EspecialistaRow {
  return (
    getEspecialista(slug) ??
    getEspecialista("generico") ?? { slug: "generico", ...DEFAULTS, nome: "Especialista", cargo: "Expert" }
  );
}

export function saveEspecialista(data: EspecialistaRow): void {
  writeFileSync(filePath(data.slug), JSON.stringify(data, null, 2), "utf-8");
}

export function deleteEspecialista(slug: string): void {
  const fp = filePath(slug);
  if (existsSync(fp)) unlinkSync(fp);
}

export function especialistaExists(slug: string): boolean {
  return existsSync(filePath(slug));
}
