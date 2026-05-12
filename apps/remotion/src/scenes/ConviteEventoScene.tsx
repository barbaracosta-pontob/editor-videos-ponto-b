import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  Audio,
  Sequence,
  staticFile,
} from "remotion";
import type { ConviteEvento } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily , resolveAudioSrc } from "../theme";

export const ConviteEventoScene: React.FC<{ cena: ConviteEvento; corPrimaria?: string; fonteFamilia?: string }> = ({
  cena,
  corPrimaria,
  fonteFamilia,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [30, 0]);

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

      {/* Overlay escuro semitransparente — o vídeo do mentor aparece suavizado ao fundo */}
      <AbsoluteFill style={{ backgroundColor: "rgba(10, 12, 20, 0.82)" }} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          padding: `200px ${spacing.lg}px 420px`,
          flexDirection: "column",
        }}
      >
        {/* Logo do evento se disponível */}
        {cena.logo_url ? (
          <div style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            marginBottom: spacing.lg,
            alignSelf: cena.logo_posicao === "centro" ? "center" : cena.logo_posicao === "rodape" ? "flex-end" : "flex-start",
          }}>
            <Img
              src={cena.logo_url}
              style={{ height: cena.logo_altura ?? 80, width: "auto" }}
            />
          </div>
        ) : (
          /* Linha de acento superior quando não há logo */
          <div
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              width: 64,
              height: 4,
              backgroundColor: accentColor,
              borderRadius: 2,
              marginBottom: spacing.md,
            }}
          />
        )}

        {/* Nome do evento */}
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontFamily,
            fontWeight: typography.weightHero,
            fontSize: typography.sizeTitle,
            lineHeight: typography.lineHeightTight,
            letterSpacing: typography.trackingTight,
            textTransform: "uppercase",
            color: colors.white,
            marginBottom: cena.descricao ? spacing.sm : spacing.lg,
          }}
        >
          {cena.nome_evento}
        </div>

        {/* Descrição opcional */}
        {cena.descricao ? (
          <div
            style={{
              opacity: opacity * 0.85,
              transform: `translateY(${translateY}px)`,
              fontFamily,
              fontWeight: typography.weightBody,
              fontSize: typography.sizeBody,
              color: colors.textMuted,
              marginBottom: spacing.lg,
              lineHeight: typography.lineHeightBody,
            }}
          >
            {cena.descricao}
          </div>
        ) : null}

        {/* Bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          {cena.bullets.map((bullet, i) => {
            const delay = i * 6;
            const bulletEntrada = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 14, stiffness: 90 },
            });
            const bulletOpacity = interpolate(bulletEntrada, [0, 1], [0, 1]);
            const bulletX = interpolate(bulletEntrada, [0, 1], [-30, 0]);

            return (
              <div
                key={i}
                style={{
                  opacity: bulletOpacity,
                  transform: `translateX(${bulletX}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: accentColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 12,
                    color: colors.white,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </div>
                <div
                  style={{
                    fontFamily,
                    fontWeight: typography.weightBody,
                    fontSize: typography.sizeBody,
                    color: colors.whiteSoft,
                    lineHeight: typography.lineHeightBody,
                  }}
                >
                  {bullet}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
