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
import type { Hook } from "@pontob/schema";
import { colors, resolveFontFamily, buildTokenCorMap, resolveAudioSrc, useTypography, useSpacing } from "../theme";
import { useScaleFactor, useSafeZoneBottom } from "../hooks/useScaleFactor";

export const HookScene: React.FC<{
  cena: Hook;
  corPrimaria?: string;
  corSecundaria?: string;
  fonteFamilia?: string;
}> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScaleFactor();
  const typo = useTypography(scale);
  const sp = useSpacing(scale);
  const safeBottom = useSafeZoneBottom();

  const fontFamily = resolveFontFamily(fonteFamilia);

  const titleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleScale = interpolate(titleSpring, [0, 1], [0.92, 1]);

  const tokens = cena.titulo.split(/(\s+)/);
  const corMap = buildTokenCorMap(tokens, cena.palavras_destacadas, corPrimaria, corSecundaria);

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

      <AbsoluteFill style={{
        background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.80) 100%)",
        pointerEvents: "none",
      }} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: `0 ${sp.lg}px ${safeBottom}px`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px) scale(${titleScale})`,
            fontFamily,
            fontWeight: typo.weightHero,
            fontSize: typo.sizeHero,
            lineHeight: typo.lineHeightTight,
            letterSpacing: typo.trackingTight,
            textTransform: "uppercase",
            color: colors.white,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
          }}
        >
          {tokens.map((token, i) => (
            <span key={i} style={{ color: corMap[i] ?? colors.white }}>{token}</span>
          ))}
        </div>

        {cena.subtitulo ? (
          <div
            style={{
              marginTop: sp.md,
              opacity: titleOpacity * 0.9,
              transform: `translateY(${titleY * 0.8}px)`,
              fontFamily,
              fontWeight: typo.weightBody,
              fontSize: typo.sizeSubtitle,
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
