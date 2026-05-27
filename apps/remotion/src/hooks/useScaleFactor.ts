import { useVideoConfig } from "remotion";

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 1920;

/**
 * Retorna um fator de escala relativo ao formato base 9:16 (1080x1920).
 * Usado para escalar fontes, paddings e tamanhos fixos proporcionalmente
 * em outros aspect ratios (16:9 wide, 1:1 square).
 *
 * Usa a menor dimensão relativa para garantir que nada estoure a tela.
 */
export function useScaleFactor(): number {
  const { width, height } = useVideoConfig();
  const sw = width / BASE_WIDTH;
  const sh = height / BASE_HEIGHT;
  return Math.min(sw, sh);
}

/**
 * Safe zone inferior em px — equivale a 22% do height base (420/1920).
 * No Instagram Stories, essa área é ocupada pelo avatar, curtidas e comentários.
 * Em outros formatos, reduzimos proporcionalmente.
 */
export function useSafeZoneBottom(): number {
  const { height } = useVideoConfig();
  return Math.round(height * 0.22);
}

/**
 * Safe zone superior em px — equivale a ~10% do height base (200/1920).
 */
export function useSafeZoneTop(): number {
  const { height } = useVideoConfig();
  return Math.round(height * 0.105);
}
