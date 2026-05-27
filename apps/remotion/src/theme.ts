/**
 * Tema visual fixo do template Ponto B.
 */

export const colors = {
  navy: "#0A1628",
  navyDeep: "#050B14",
  red: "#E63946",
  redDeep: "#C72A38",
  white: "#FFFFFF",
  whiteSoft: "#F4F6F8",
  yellow: "#F4C430",
  green: "#2EC27E",
  textMuted: "#8B95A1",
} as const;

export const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const typography = {
  fontFamily: DEFAULT_FONT_FAMILY,
  weightHero: 900,
  weightTitle: 800,
  weightBody: 600,
  weightCaption: 500,
  sizeHero: 96,
  sizeTitle: 72,
  sizeSubtitle: 48,
  sizeBody: 44,
  sizeCaption: 32,
  trackingTight: -1.5,
  trackingNormal: 0,
  trackingWide: 2,
  lineHeightTight: 1.0,
  lineHeightBody: 1.3,
} as const;

export const spacing = {
  xs: 8,
  sm: 16,
  md: 32,
  lg: 64,
  xl: 96,
  xxl: 144,
} as const;

export const makeCorDestaque = (
  corPrimaria?: string,
  corSecundaria?: string,
) => (cor: "primaria" | "secundaria" | "branco"): string => {
  if (cor === "primaria") return corPrimaria ?? colors.red;
  if (cor === "secundaria") return corSecundaria ?? colors.yellow;
  return colors.white;
};

export const resolveFontFamily = (fonteFamilia?: string): string =>
  fonteFamilia && fonteFamilia.trim() ? fonteFamilia : DEFAULT_FONT_FAMILY;

/**
 * Resolve o src de um asset de áudio (sfx ou música de fundo).
 *
 * Durante o render, o `render/route.ts` converte paths relativos
 * ("sfx/whoosh.mp3", "musica/lofi.mp3") para URLs HTTP absolutas antes de
 * gravar o props.json. Nesse caso a string já começa com "http" e não pode
 * ser passada para staticFile() — o Remotion lança TypeError.
 *
 * No Remotion Studio local os paths chegam ainda relativos, então
 * o caller deve passar staticFile como segundo argumento.
 *
 * Uso: src={resolveAudioSrc(cena.sfx.path, staticFile)}
 */
export const resolveAudioSrc = (
  path: string,
  staticFileFn: (path: string) => string,
): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return staticFileFn(path);
};

/**
 * Resolve uma cor que pode ser:
 * - Um hex literal ("#E63946")
 * - Um alias semântico ("primaria", "secundaria", "branco")
 *
 * Aceita um resolvedor opcional para os aliases. Se não fornecido,
 * usa os defaults de cores do tema.
 */
export const resolveWordColor = (
  cor: string,
  corPrimaria?: string,
  corSecundaria?: string,
): string => {
  const lower = cor.toLowerCase().trim();
  if (lower === "primaria") return corPrimaria ?? colors.red;
  if (lower === "secundaria") return corSecundaria ?? colors.yellow;
  if (lower === "branco" || lower === "white") return colors.white;
  return cor; // assume hex ou qualquer valor CSS válido
};

export const buildTokenCorMap = (
  tokens: string[],
  palavras: Array<{ palavra: string; cor: string }>,
  corPrimaria?: string,
  corSecundaria?: string,
): (string | null)[] => {
  const corMap: (string | null)[] = new Array(tokens.length).fill(null);
  for (const pw of palavras) {
    const corResolvida = resolveWordColor(pw.cor, corPrimaria, corSecundaria);
    const palavraLimpa = pw.palavra.toLowerCase().replace(/[.,!?;:]/g, "");
    const palavraTokens = palavraLimpa.split(/\s+/).filter(Boolean);
    let ti = 0;
    while (ti < tokens.length) {
      const candidates: number[] = [];
      let j = ti;
      while (j < tokens.length && candidates.length < palavraTokens.length) {
        if (tokens[j].trim()) candidates.push(j);
        j++;
      }
      if (candidates.length === palavraTokens.length) {
        const match = candidates.every((idx, k) =>
          tokens[idx].trim().replace(/[.,!?;:]/g, "").toLowerCase() === palavraTokens[k]
        );
        if (match) {
          candidates.forEach((idx) => { corMap[idx] = corResolvida; });
        }
      }
      ti++;
    }
  }
  return corMap;
};

/**
 * Hook que retorna tokens de tipografia escalados pelo aspect ratio atual.
 * Usar em vez de `typography` diretamente dentro de componentes Remotion.
 */
export function useTypography(scale: number) {
  return {
    fontFamily: typography.fontFamily,
    weightHero: typography.weightHero,
    weightTitle: typography.weightTitle,
    weightBody: typography.weightBody,
    weightCaption: typography.weightCaption,
    sizeHero:     Math.round(typography.sizeHero     * scale),
    sizeTitle:    Math.round(typography.sizeTitle    * scale),
    sizeSubtitle: Math.round(typography.sizeSubtitle * scale),
    sizeBody:     Math.round(typography.sizeBody     * scale),
    sizeCaption:  Math.round(typography.sizeCaption  * scale),
    trackingTight:    typography.trackingTight,
    trackingNormal:   typography.trackingNormal,
    trackingWide:     typography.trackingWide,
    lineHeightTight:  typography.lineHeightTight,
    lineHeightBody:   typography.lineHeightBody,
  };
}

/**
 * Hook que retorna tokens de espaçamento escalados pelo aspect ratio atual.
 */
export function useSpacing(scale: number) {
  return {
    xs:  Math.round(spacing.xs  * scale),
    sm:  Math.round(spacing.sm  * scale),
    md:  Math.round(spacing.md  * scale),
    lg:  Math.round(spacing.lg  * scale),
    xl:  Math.round(spacing.xl  * scale),
    xxl: Math.round(spacing.xxl * scale),
  };
}
