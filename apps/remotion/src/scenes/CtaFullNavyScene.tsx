import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { colors, useTypography, useSpacing } from "../theme";
import { useScaleFactor } from "../hooks/useScaleFactor";

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
  const scale = useScaleFactor();
  const typo = useTypography(scale);
  const sp = useSpacing(scale);

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
        padding: `0 ${sp.lg}px`,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          fontFamily: typo.fontFamily,
          fontWeight: typo.weightHero,
          fontSize: Math.round(108 * scale),
          lineHeight: typo.lineHeightTight,
          letterSpacing: typo.trackingTight,
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
            marginTop: sp.lg,
            opacity: opacity * 0.9,
            transform: `translateY(${translateY}px)`,
            fontFamily: typo.fontFamily,
            fontWeight: typo.weightCaption,
            fontSize: typo.sizeBody,
            color: colors.textMuted,
            textAlign: "center",
            maxWidth: Math.round(800 * scale),
          }}
        >
          {cena.cta_texto_secundario}
        </div>
      ) : null}

      <div
        style={{
          marginTop: sp.xl,
          fontSize: Math.round(120 * scale),
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
