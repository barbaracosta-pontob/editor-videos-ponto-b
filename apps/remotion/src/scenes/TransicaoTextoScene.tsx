import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { TransicaoTexto } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily } from "../theme";

export const TransicaoTextoScene: React.FC<{ cena: TransicaoTexto; fonteFamilia?: string }> = ({ cena, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const scale = interpolate(entrada, [0, 1], [0.96, 1]);

  return (
    <AbsoluteFill>
      {/* Gradiente inferior sutil para legibilidade da transição */}
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.72) 100%)",
        pointerEvents: "none",
      }} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: `0 ${spacing.lg}px ${spacing.xxl}px`,
        }}
      >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          fontFamily,
          fontWeight: typography.weightTitle,
          fontSize: typography.sizeSubtitle,
          color: colors.whiteSoft,
          textAlign: "center",
          letterSpacing: typography.trackingNormal,
          lineHeight: typography.lineHeightBody,
          textShadow: "0 2px 16px rgba(0,0,0,0.9)",
        }}
      >
        {cena.texto}
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
