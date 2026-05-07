import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { ListaPontos } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily } from "../theme";

export const ListaPontosScene: React.FC<{ cena: ListaPontos; corPrimaria?: string; fonteFamilia?: string }> = ({
  cena,
  corPrimaria,
  fonteFamilia,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  // Entrada do título
  const tituloEntrada = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const tituloOpacity = interpolate(tituloEntrada, [0, 1], [0, 1]);
  const tituloY = interpolate(tituloEntrada, [0, 1], [20, 0]);

  // Delay entre itens — mais espaçado para parecer mais dinâmico
  const ITEM_DELAY = 12;

  return (
    <AbsoluteFill>
      {/* Gradiente mais profundo para dar mais presença à lista */}
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, transparent 15%, rgba(0,0,0,0.88) 100%)",
        pointerEvents: "none",
      }} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: `0 ${spacing.lg}px 420px`,
          flexDirection: "column",
        }}
      >

        {/* Linha de acento antes do título */}
        {cena.titulo ? (
          <div style={{
            opacity: tituloOpacity,
            width: 48,
            height: 4,
            backgroundColor: accentColor,
            borderRadius: 2,
            marginBottom: spacing.sm,
          }} />
        ) : null}

        {/* Título */}
        {cena.titulo ? (
          <div
            style={{
              opacity: tituloOpacity,
              transform: `translateY(${tituloY}px)`,
              fontFamily,
              fontWeight: typography.weightHero,
              fontSize: typography.sizeTitle,
              color: colors.white,
              letterSpacing: typography.trackingTight,
              textTransform: "uppercase",
              marginBottom: spacing.lg,
              textShadow: "0 3px 20px rgba(0,0,0,0.85)",
              lineHeight: typography.lineHeightTight,
            }}
          >
            {cena.titulo}
          </div>
        ) : null}

        {/* Itens da lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md, width: "100%" }}>
          {cena.pontos.map((ponto, i) => {
            const delay = i * ITEM_DELAY;
            const pontoEntrada = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 16, stiffness: 100 },
            });
            const pontoOpacity = interpolate(pontoEntrada, [0, 1], [0, 1]);
            const pontoX = interpolate(pontoEntrada, [0, 1], [-60, 0]);
            const pontoScale = interpolate(pontoEntrada, [0, 1], [0.95, 1]);

            return (
              <div
                key={i}
                style={{
                  opacity: pontoOpacity,
                  transform: `translateX(${pontoX}px) scale(${pontoScale})`,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderLeft: `4px solid ${accentColor}`,
                }}
              >
                {cena.numerado ? (
                  <div
                    style={{
                      fontFamily,
                      fontWeight: typography.weightHero,
                      fontSize: 80,
                      color: accentColor,
                      minWidth: 68,
                      lineHeight: 1,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                ) : (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: accentColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    fontFamily,
                    fontWeight: typography.weightBody,
                    fontSize: typography.sizeBody,
                    color: colors.white,
                    lineHeight: typography.lineHeightBody,
                  }}
                >
                  {ponto}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
