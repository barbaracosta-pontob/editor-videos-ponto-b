import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  Sequence,
  staticFile,
} from "remotion";
import type { ListaPontos } from "@pontob/schema";
import { colors, resolveFontFamily, resolveAudioSrc, useTypography, useSpacing } from "../theme";
import { useScaleFactor, useSafeZoneBottom } from "../hooks/useScaleFactor";

export const ListaPontosScene: React.FC<{ cena: ListaPontos; corPrimaria?: string; fonteFamilia?: string }> = ({
  cena,
  corPrimaria,
  fonteFamilia,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScaleFactor();
  const typo = useTypography(scale);
  const sp = useSpacing(scale);
  const safeBottom = useSafeZoneBottom();

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
      {cena.sfx ? cena.pontos.map((_, i) => (
        <Sequence key={i} from={Math.round((cena.sfx!.inicio_segundos ?? 0) * fps + i * ITEM_DELAY)}>
          <Audio
            src={resolveAudioSrc(cena.sfx!.path, staticFile)}
            volume={Math.min(1, (cena.sfx!.volume ?? 5) / 10)}
          />
        </Sequence>
      )) : null}

      {/* Gradiente mais profundo para dar mais presença à lista */}
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, transparent 15%, rgba(0,0,0,0.88) 100%)",
        pointerEvents: "none",
      }} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: `0 ${sp.lg}px ${safeBottom}px`,
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
            marginBottom: sp.sm,
          }} />
        ) : null}

        {/* Título */}
        {cena.titulo ? (
          <div
            style={{
              opacity: tituloOpacity,
              transform: `translateY(${tituloY}px)`,
              fontFamily,
              fontWeight: typo.weightHero,
              fontSize: typo.sizeTitle,
              color: colors.white,
              letterSpacing: typo.trackingTight,
              textTransform: "uppercase",
              marginBottom: sp.lg,
              textShadow: "0 3px 20px rgba(0,0,0,0.85)",
              lineHeight: typo.lineHeightTight,
            }}
          >
            {cena.titulo}
          </div>
        ) : null}

        {/* Itens da lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: sp.md, width: "100%" }}>
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
                  gap: sp.md,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: `${sp.sm}px ${sp.md}px`,
                  borderLeft: `4px solid ${accentColor}`,
                }}
              >
                {cena.numerado ? (
                  <div
                    style={{
                      fontFamily,
                      fontWeight: typo.weightHero,
                      fontSize: Math.round(80 * scale),
                      color: accentColor,
                      minWidth: Math.round(68 * scale),
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
                    fontWeight: typo.weightBody,
                    fontSize: typo.sizeBody,
                    color: colors.white,
                    lineHeight: typo.lineHeightBody,
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
