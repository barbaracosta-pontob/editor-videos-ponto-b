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
import type { VideoCitacao } from "@pontob/schema";
import { colors, resolveFontFamily, resolveAudioSrc, useTypography, useSpacing } from "../theme";
import { useScaleFactor, useSafeZoneBottom } from "../hooks/useScaleFactor";

export const VideoCitacaoScene: React.FC<{ cena: VideoCitacao; corPrimaria?: string; fonteFamilia?: string }> = ({
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

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [20, 0]);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={resolveAudioSrc(cena.sfx.path, staticFile)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

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
          padding: `0 ${sp.lg}px ${safeBottom}px`,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            borderLeft: `6px solid ${accentColor}`,
            paddingLeft: sp.md,
          }}
        >
          {/* Nome e cargo do mentor */}
          <div
            style={{
              fontFamily,
              fontWeight: typo.weightTitle,
              fontSize: typo.sizeBody,
              color: colors.white,
              letterSpacing: typo.trackingNormal,
            }}
          >
            {cena.nome_mentor}
          </div>
          <div
            style={{
              fontFamily,
              fontWeight: typo.weightCaption,
              fontSize: typo.sizeCaption,
              color: accentColor,
              marginBottom: sp.md,
              opacity: 0.9,
            }}
          >
            {cena.cargo_mentor}
          </div>

          {/* Frases-chave com entrada staggered */}
          <div style={{ display: "flex", flexDirection: "column", gap: sp.xs }}>
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
                    fontWeight: typo.weightBody,
                    fontSize: typo.sizeSubtitle,
                    color: colors.white,
                    lineHeight: typo.lineHeightBody,
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
