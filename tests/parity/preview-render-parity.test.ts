/**
 * Teste de paridade: preview (ReelComposition.tsx) vs render (remotion scenes).
 *
 * Roda com: npx vitest run tests/parity  (ou: npm run test:parity)
 *
 * ── DECISAO DE ARQUITETURA ────────────────────────────────────────────────────
 *
 * Abordagem: grep estrutural sobre texto-fonte dos arquivos .tsx.
 * Verifica PRESENCA DE PADROES no codigo, nao execucao de runtime.
 *
 * Limite conhecido: se uma constante for renomeada ou movida para outro modulo,
 * o assert falha ou passa em falso dependendo do caso. O plano de migracao para
 * verificacao por import esta documentado em QUANDO AMADURECER abaixo.
 *
 * ── POR QUE VITEST E NAO NODE PURO ───────────────────────────────────────────
 *
 * 1. describe/it/expect dao estrutura real: agrupamento por componente, output
 *    colorido, contagem de testes, modo watch (-w) gratuito.
 * 2. TypeScript nativo via tsx/esbuild -- sem configuracao de transform.
 * 3. Importamos CenaSchema diretamente: qualquer novo tipo adicionado ao schema
 *    dispara o assert "todos os tipos do schema tem overlay no preview", forçando
 *    que o desenvolvedor cubra o novo componente conscientemente.
 * 4. Facil de evoluir para @testing-library/react se quisermos testar o DOM.
 *
 * ── QUANDO AMADURECER ────────────────────────────────────────────────────────
 *
 * Proximo nivel: extrair constantes criticas (W, H, PADs, ITEM_DELAY) para
 * packages/constants/layout.ts e importar em ambos os lados (preview + render).
 * Ai o teste compara imports, nao strings, e um rename quebra automaticamente
 * quem esqueceu de atualizar. Passos:
 *   1. Criar packages/constants/layout.ts com as constantes
 *   2. Importar nos scenes remotion e no ReelComposition
 *   3. Trocar os asserts de string por comparacao de valor importado
 *   4. Adicionar @testing-library/react para testar DOM dos overlays
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { CenaSchema } from "@pontob/schema";

const ROOT = path.resolve(__dirname, "../..");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// Extrai secao do preview entre dois comentarios de secao (suporta unicode nos ---)
// Busca a linha que contem o fragmento de nome dentro de um comentario "// "
function section(src: string, nameFragment: string, nextFragment: string | null): string {
  const lines = src.split("\n");
  let startLine = -1;
  let endLine = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const ascii = lines[i].replace(/[^\x20-\x7E]/g, " ");
    if (startLine === -1 && ascii.includes("// ") && ascii.includes(nameFragment)) {
      startLine = i;
    } else if (startLine !== -1 && nextFragment && ascii.includes("// ") && ascii.includes(nextFragment)) {
      endLine = i;
      break;
    }
  }
  return startLine === -1 ? "" : lines.slice(startLine, endLine).join("\n");
}

// Carrega todos os arquivos uma vez
let PREVIEW: string;
let EDITOR: string;
const RENDER: Record<string, string> = {};

beforeAll(() => {
  PREVIEW = read("apps/web/src/components/ReelComposition.tsx");
  EDITOR  = read("apps/web/src/components/EditorView.tsx");
  RENDER.Hook          = read("apps/remotion/src/scenes/HookScene.tsx");
  RENDER.FraseImpacto  = read("apps/remotion/src/scenes/FraseImpactoScene.tsx");
  RENDER.Transicao     = read("apps/remotion/src/scenes/TransicaoTextoScene.tsx");
  RENDER.GraficoLinha  = read("apps/remotion/src/scenes/GraficoLinhaScene.tsx");
  RENDER.GraficoBarra  = read("apps/remotion/src/scenes/GraficoBarraScene.tsx");
  RENDER.VideoCitacao  = read("apps/remotion/src/scenes/VideoCitacaoScene.tsx");
  RENDER.ListaPontos   = read("apps/remotion/src/scenes/ListaPontosScene.tsx");
  RENDER.Comparativo   = read("apps/remotion/src/scenes/ComparativoNumericoScene.tsx");
  RENDER.MiniCaso      = read("apps/remotion/src/scenes/MiniCasoScene.tsx");
  RENDER.ConviteEvento = read("apps/remotion/src/scenes/ConviteEventoScene.tsx");
  RENDER.CTA           = read("apps/remotion/src/scenes/CtaScene.tsx");
});

// Secoes do preview por bloco de componente
function getSection(name: string, next: string | null) {
  return section(PREVIEW, ` ${name} `, next ? ` ${next} ` : null);
}

// ── Schema: todos os tipos cobertos ──────────────────────────────────────────

describe("Schema coverage", () => {
  it("todos os tipos do CenaSchema tem overlay no preview", () => {
    // Extrai os tipos validos do discriminatedUnion do schema
    const tiposSchema = (CenaSchema.options as Array<{ shape: { tipo: { value: string } } }>)
      .map((opt) => opt.shape.tipo.value);

    // Tipos esperados no preview (nome do overlay pode diferir do tipo)
    const tipoParaOverlay: Record<string, string> = {
      Hook:                "HookOverlay",
      FraseImpacto:        "FraseImpactoOverlay",
      ComparativoNumerico: "ComparativoOverlay",
      VideoCitacao:        "VideoCitacaoOverlay",
      ListaPontos:         "ListaPontosOverlay",
      MiniCaso:            "MiniCasoOverlay",
      TransicaoTexto:      "TransicaoOverlay",
      CTA:                 "CtaOverlay",
      ConviteEvento:       "ConviteEventoOverlay",
      GraficoBarra:        "GraficoBarraOverlay",
      GraficoLinha:        "GraficoLinhaOverlay",
    };

    for (const tipo of tiposSchema) {
      const overlayName = tipoParaOverlay[tipo];
      expect(overlayName, `Tipo "${tipo}" nao tem entrada em tipoParaOverlay — adicione o overlay`).toBeDefined();
      expect(PREVIEW, `Overlay "${overlayName}" nao encontrado em ReelComposition.tsx`).toContain(overlayName);
    }
  });

  it("SceneRouter tem um case para cada tipo do schema", () => {
    const tiposSchema = (CenaSchema.options as Array<{ shape: { tipo: { value: string } } }>)
      .map((opt) => opt.shape.tipo.value);

    const routerSection = section(PREVIEW, " SceneRouter ", " Gradiente ");
    for (const tipo of tiposSchema) {
      expect(routerSection, `SceneRouter nao tem case para tipo "${tipo}"`).toContain(`case "${tipo}"`);
    }
  });
});

// ── SFX: Audio presente em todos os overlays ─────────────────────────────────

describe("SFX", () => {
  const overlays = [
    ["Hook",         "VideoCitacao"],
    ["VideoCitacao", "FraseImpacto"],
    ["FraseImpacto", "ListaPontos"],
    ["ListaPontos",  "ComparativoNumerico"],
    ["ComparativoNumerico", "MiniCaso"],
    ["MiniCaso",     "TransicaoTexto"],
    ["TransicaoTexto","ConviteEvento"],
    ["ConviteEvento","GraficoLinha"],
    ["GraficoLinha", "GraficoBarra"],
    ["GraficoBarra", "CTA"],
    ["CTA",          null],
  ] as const;

  for (const [name, next] of overlays) {
    it(`${name}: preview tem bloco <Audio> condicional a cena.sfx`, () => {
      const s = getSection(name, next);
      expect(s.length, `Secao "${name}" nao encontrada no preview`).toBeGreaterThan(50);
      expect(s).toContain("<Audio");
      expect(s).toContain("cena.sfx");
    });
  }

  describe("defaults no EditorView", () => {
    const sfxDefaults: Record<string, string> = {
      Hook:               "sfx/whoosh.mp3",
      FraseImpacto:       "sfx/transition.mp3",
      ComparativoNumerico:"sfx/ding.mp3",
      GraficoBarra:       "sfx/slide.mp3",
      GraficoLinha:       "sfx/slide.mp3",
      VideoCitacao:       "sfx/slide.mp3",
      ListaPontos:        "sfx/pop.mp3",
      MiniCaso:           "sfx/ding.mp3",
      TransicaoTexto:     "sfx/transition.mp3",
      ConviteEvento:      "sfx/slide.mp3",
      CTA:                "sfx/transition.mp3",
    };

    for (const [tipo, sfxPath] of Object.entries(sfxDefaults)) {
      it(`${tipo}: default = ${sfxPath}`, () => {
        const caseIdx = EDITOR.indexOf(`case "${tipo}":`);
        expect(caseIdx, `case "${tipo}" nao encontrado em EditorView`).toBeGreaterThan(-1);
        const nextCase = EDITOR.indexOf('      case "', caseIdx + 10);
        const block = nextCase === -1 ? EDITOR.slice(caseIdx) : EDITOR.slice(caseIdx, nextCase);
        expect(block, `sfx default do ${tipo} deve ser "${sfxPath}"`).toContain(sfxPath);
      });
    }
  });
});

// ── GraficoLinha ─────────────────────────────────────────────────────────────

describe("GraficoLinha", () => {
  const EXPECTED = { W: 960, H: 480, PAD_LEFT: 80, PAD_RIGHT: 40, PAD_TOP: 40, PAD_BOTTOM: 60 };

  for (const [key, val] of Object.entries(EXPECTED)) {
    it(`preview e render: ${key}=${val}`, () => {
      const preview = getSection("GraficoLinha", "GraficoBarra");
      expect(preview, `preview: const ${key} deve ser ${val}`).toContain(`const ${key} = ${val}`);
      expect(RENDER.GraficoLinha, `render: const ${key} deve ser ${val}`).toContain(`const ${key} = ${val}`);
    });
  }

  it("preview e render: formatVal com unidade prefixada", () => {
    const preview = getSection("GraficoLinha", "GraficoBarra");
    expect(preview).toMatch(/return `\$\{u\}\$\{/);
    expect(RENDER.GraficoLinha).toMatch(/return `\$\{u\}\$\{/);
  });

  it("preview e render: guard mostrar_area !== false", () => {
    const preview = getSection("GraficoLinha", "GraficoBarra");
    expect(preview).toContain("mostrar_area !== false");
    expect(RENDER.GraficoLinha).toContain("mostrar_area !== false");
  });

  it("preview e render: SVG overflow visible", () => {
    const preview = getSection("GraficoLinha", "GraficoBarra");
    expect(preview).toContain("overflow");
    expect(preview).toContain("visible");
    expect(RENDER.GraficoLinha).toContain("overflow");
    expect(RENDER.GraficoLinha).toContain("visible");
  });
});

// ── TransicaoTexto ────────────────────────────────────────────────────────────

describe("TransicaoTexto", () => {
  it("preview e render: padding usa spacing.xxl, nao 420px fixo", () => {
    const preview = getSection("TransicaoTexto", "ConviteEvento");
    expect(preview).toContain("spacing.xxl");
    expect(preview).not.toContain('"0 64px 420px"');
    expect(RENDER.Transicao).toContain("spacing.xxl");
  });

  it("preview e render: gradient stop em 40%", () => {
    const preview = getSection("TransicaoTexto", "ConviteEvento");
    expect(preview).toContain("transparent 40%");
    expect(RENDER.Transicao).toContain("transparent 40%");
  });
});

// ── ComparativoNumerico ───────────────────────────────────────────────────────

describe("ComparativoNumerico", () => {
  it("preview e render: footer metrica_unidade presente", () => {
    const preview = getSection("ComparativoNumerico", "MiniCaso");
    expect(preview).toContain("metrica_unidade");
    expect(RENDER.Comparativo).toContain("metrica_unidade");
  });

  it("preview e render: font-size com 5 breakpoints (120/96/72/56/44)", () => {
    const preview = getSection("ComparativoNumerico", "MiniCaso");
    for (const n of [120, 96, 72, 56, 44]) {
      const has = (src: string) =>
        src.includes(`return ${n}`) || src.includes(`: ${n}`) || src.includes(`${n};`);
      expect(has(preview), `preview: breakpoint ${n} ausente`).toBe(true);
      expect(has(RENDER.Comparativo), `render: breakpoint ${n} ausente`).toBe(true);
    }
  });
});

// ── VideoCitacao ──────────────────────────────────────────────────────────────

describe("VideoCitacao", () => {
  it("preview e render: stagger das frases = i * 8 frames", () => {
    const preview = getSection("VideoCitacao", "FraseImpacto");
    expect(preview).toMatch(/\*\s*8\b/);
    expect(RENDER.VideoCitacao).toMatch(/\*\s*8\b/);
  });

  it("preview e render: cargo_mentor tem weightCaption e opacity 0.9", () => {
    const preview = getSection("VideoCitacao", "FraseImpacto");
    expect(preview).toContain("weightCaption");
    expect(preview).toContain("opacity: 0.9");
    expect(RENDER.VideoCitacao).toContain("weightCaption");
    expect(RENDER.VideoCitacao).toContain("opacity: 0.9");
  });

  it("preview e render: nome_mentor tem trackingNormal", () => {
    const preview = getSection("VideoCitacao", "FraseImpacto");
    expect(preview).toContain("trackingNormal");
    expect(RENDER.VideoCitacao).toContain("trackingNormal");
  });
});

// ── ListaPontos ───────────────────────────────────────────────────────────────

describe("ListaPontos", () => {
  it("preview e render: titulo tem translateY animado", () => {
    const preview = getSection("ListaPontos", "ComparativoNumerico");
    expect(preview).toContain("tituloY");
    expect(preview).toContain("translateY");
    expect(RENDER.ListaPontos).toContain("tituloY");
    expect(RENDER.ListaPontos).toContain("translateY");
  });

  it("preview e render: ITEM_DELAY = 12 frames", () => {
    const preview = getSection("ListaPontos", "ComparativoNumerico");
    expect(preview).toContain("ITEM_DELAY = 12");
    expect(RENDER.ListaPontos).toContain("ITEM_DELAY = 12");
  });
});

// ── Hook ──────────────────────────────────────────────────────────────────────

describe("Hook", () => {
  it("preview e render: tem gradiente inferior", () => {
    const preview = getSection("Hook", "VideoCitacao");
    expect(
      preview.includes("linear-gradient") || preview.includes("GradienteInferior")
    ).toBe(true);
    expect(RENDER.Hook).toContain("linear-gradient");
  });
});

// ── FraseImpacto ──────────────────────────────────────────────────────────────

describe("FraseImpacto", () => {
  it("preview e render: gradient stop em 35%", () => {
    const preview = getSection("FraseImpacto", "ListaPontos");
    expect(preview).toContain("35%");
    expect(RENDER.FraseImpacto).toContain("35%");
  });
});
