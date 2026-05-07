import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { colors, typography, spacing } from "../theme";

type Cta09 = {
  id: "09_cta_full_navy";
  tipo: "cta_full_navy";
  duracao_segundos: number;
  cta_texto_principal: string;
  cta_texto_secundario: string | null;
};

export const CtaFullNavyScene: React.FC<{ cena: Cta09 }> = ({ cena }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [60, 0]);

  // Bounce contínuo da seta
  const setaY = 16 * Math.sin((frame / fps) * 2 * Math.PI * 1.4);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navyDeep} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${spacing.lg}px`,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          fontFamily: typography.fontFamily,
          fontWeight: typography.weightHero,
          fontSize: 108,
          lineHeight: typography.lineHeightTight,
          letterSpacing: typography.trackingTight,
          textTransform: "uppercase",
          color: colors.white,
          textAlign: "center",
        }}
      >
        {cena.cta_texto_principal}
      </div>

      {cena.cta_texto_secundario ? (
        <div
          style={{
            marginTop: spacing.lg,
            opacity: opacity * 0.9,
            transform: `translateY(${translateY}px)`,
            fontFamily: typography.fontFamily,
            fontWeight: typography.weightCaption,
            fontSize: typography.sizeBody,
            color: colors.textMuted,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          {cena.cta_texto_secundario}
        </div>
      ) : null}

      <div
        style={{
          marginTop: spacing.xl,
          fontSize: 120,
          lineHeight: 1,
          color: colors.yellow,
          opacity,
          transform: `translateY(${setaY}px)`,
        }}
      >
        ↓
      </div>
    </AbsoluteFill>
  );
};
