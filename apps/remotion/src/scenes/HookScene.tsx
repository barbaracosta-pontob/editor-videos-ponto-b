import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { Hook } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily, buildTokenCorMap } from "../theme";

export const HookScene: React.FC<{
  cena: Hook;
  corPrimaria?: string;
  corSecundaria?: string;
  fonteFamilia?: string;
}> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fontFamily = resolveFontFamily(fonteFamilia);

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.5 },
  });

  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleScale = interpolate(titleSpring, [0, 1], [0.92, 1]);

  const tokens = cena.titulo.split(/(\s+)/);
  const corMap = buildTokenCorMap(tokens, cena.palavras_destacadas);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: `0 ${spacing.lg}px 420px`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px) scale(${titleScale})`,
            fontFamily,
            fontWeight: typography.weightHero,
            fontSize: typography.sizeHero,
            lineHeight: typography.lineHeightTight,
            letterSpacing: typography.trackingTight,
            textTransform: "uppercase",
            color: colors.white,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
          }}
        >
          {tokens.map((token, i) => (
            <span key={i} style={{ color: corMap[i] ?? colors.white }}>
              {token}
            </span>
          ))}
        </div>

        {cena.subtitulo ? (
          <div
            style={{
              marginTop: spacing.md,
              opacity: titleOpacity * 0.9,
              transform: `translateY(${titleY * 0.8}px)`,
              fontFamily,
              fontWeight: typography.weightBody,
              fontSize: typography.sizeSubtitle,
              color: colors.whiteSoft,
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            {cena.subtitulo}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
