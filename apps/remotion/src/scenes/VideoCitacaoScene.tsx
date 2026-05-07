import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { VideoCitacao } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily } from "../theme";

export const VideoCitacaoScene: React.FC<{ cena: VideoCitacao; corPrimaria?: string; fonteFamilia?: string }> = ({
  cena,
  corPrimaria,
  fonteFamilia,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [20, 0]);

  return (
    <AbsoluteFill>
      {/* Gradiente inferior para legibilidade do lower-third */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Lower-third — posicionado na zona segura */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: `0 ${spacing.lg}px 420px`,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            borderLeft: `6px solid ${accentColor}`,
            paddingLeft: spacing.md,
          }}
        >
          {/* Nome e cargo do mentor */}
          <div
            style={{
              fontFamily,
              fontWeight: typography.weightTitle,
              fontSize: typography.sizeBody,
              color: colors.white,
              letterSpacing: typography.trackingNormal,
            }}
          >
            {cena.nome_mentor}
          </div>
          <div
            style={{
              fontFamily,
              fontWeight: typography.weightCaption,
              fontSize: typography.sizeCaption,
              color: accentColor,
              marginBottom: spacing.md,
              opacity: 0.9,
            }}
          >
            {cena.cargo_mentor}
          </div>

          {/* Frases-chave com entrada staggered */}
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            {cena.frases.map((frase, i) => {
              const fraseDelay = i * 8;
              const fraseEntrada = spring({
                frame: Math.max(0, frame - fraseDelay),
                fps,
                config: { damping: 14, stiffness: 80 },
              });
              const fraseOpacity = interpolate(fraseEntrada, [0, 1], [0, 1]);
              const fraseX = interpolate(fraseEntrada, [0, 1], [20, 0]);

              return (
                <div
                  key={i}
                  style={{
                    opacity: fraseOpacity,
                    transform: `translateX(${fraseX}px)`,
                    fontFamily,
                    fontWeight: typography.weightBody,
                    fontSize: typography.sizeSubtitle,
                    color: colors.white,
                    lineHeight: typography.lineHeightBody,
                  }}
                >
                  {frase}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
