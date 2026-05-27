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
import type { TransicaoTexto } from "@pontob/schema";
import { colors, resolveFontFamily, resolveAudioSrc, useTypography, useSpacing } from "../theme";
import { useScaleFactor } from "../hooks/useScaleFactor";

export const TransicaoTextoScene: React.FC<{ cena: TransicaoTexto; fonteFamilia?: string }> = ({ cena, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScaleFactor();
  const typo = useTypography(scale);
  const sp = useSpacing(scale);

  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const scaleAnim = interpolate(entrada, [0, 1], [0.96, 1]);

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

      {/* Gradiente inferior sutil para legibilidade da transição */}
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.72) 100%)",
        pointerEvents: "none",
      }} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: `0 ${sp.lg}px ${sp.xxl}px`,
        }}
      >
      <div
        style={{
          opacity,
          transform: `scale(${scaleAnim})`,
          fontFamily,
          fontWeight: typo.weightTitle,
          fontSize: typo.sizeSubtitle,
          color: colors.whiteSoft,
          textAlign: "center",
          letterSpacing: typo.trackingNormal,
          lineHeight: typo.lineHeightBody,
          textShadow: "0 2px 16px rgba(0,0,0,0.9)",
        }}
      >
        {cena.texto}
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
