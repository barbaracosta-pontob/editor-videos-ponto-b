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
import type { FraseImpacto } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily, buildTokenCorMap , resolveAudioSrc } from "../theme";

export const FraseImpactoScene: React.FC<{ cena: FraseImpacto; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({
  cena,
  corPrimaria,
  corSecundaria,
  fonteFamilia,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [30, 0]);

  const tokens = cena.texto.split(/(\s+)/);
  const corMap = buildTokenCorMap(tokens, cena.palavras_destacadas ?? [], corPrimaria, corSecundaria);

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
        background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.80) 100%)",
        pointerEvents: "none",
      }} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: cena.alinhamento === "esquerda" ? "flex-start" : "center",
          padding: `0 ${spacing.lg}px 420px`,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontFamily,
            fontWeight: typography.weightTitle,
            fontSize: typography.sizeTitle,
            lineHeight: typography.lineHeightBody,
            letterSpacing: typography.trackingTight,
            color: colors.white,
            textAlign: cena.alinhamento === "esquerda" ? "left" : "center",
            maxWidth: 900,
            textShadow: "0 3px 20px rgba(0,0,0,0.85)",
          }}
        >
          {tokens.map((token, i) => (
            <span key={i} style={{ color: corMap[i] ?? colors.white }}>
              {token}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
