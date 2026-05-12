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
import type { MiniCaso } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily, buildTokenCorMap , resolveAudioSrc } from "../theme";

export const MiniCasoScene: React.FC<{
  cena: MiniCaso;
  corPrimaria?: string;
  corSecundaria?: string;
  fonteFamilia?: string;
}> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [30, 0]);

  const tokens = cena.resultado_texto.split(/(\s+)/);
  const corMap = buildTokenCorMap(tokens, cena.palavras_destacadas ?? []);

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

      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.35)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 40%)" }} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
          padding: `${spacing.xl}px ${spacing.lg}px 0`,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            backgroundColor: "rgba(0,0,0,0.70)",
            border: `3px solid ${accentColor}`,
            borderRadius: 20,
            padding: `${spacing.md}px ${spacing.lg}px`,
            maxWidth: 900,
          }}
        >
          {cena.contexto_texto ? (
            <div
              style={{
                fontFamily,
                fontWeight: typography.weightCaption,
                fontSize: typography.sizeCaption,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: typography.trackingWide,
                marginBottom: spacing.xs,
              }}
            >
              {cena.contexto_texto}
            </div>
          ) : null}
          <div
            style={{
              fontFamily,
              fontWeight: typography.weightTitle,
              fontSize: typography.sizeSubtitle,
              lineHeight: typography.lineHeightBody,
              color: colors.white,
            }}
          >
            {tokens.map((token, i) => (
              <span key={i} style={{ color: corMap[i] ?? colors.white }}>
                {token}
              </span>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
