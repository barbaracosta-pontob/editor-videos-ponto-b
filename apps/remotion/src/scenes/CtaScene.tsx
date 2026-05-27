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
import type { CTA } from "@pontob/schema";
import { colors, resolveFontFamily, buildTokenCorMap, resolveWordColor, resolveAudioSrc, useTypography, useSpacing } from "../theme";
import { useScaleFactor } from "../hooks/useScaleFactor";

export const CtaScene: React.FC<{ cena: CTA; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({
  cena,
  corPrimaria,
  corSecundaria,
  fonteFamilia,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScaleFactor();
  const typo = useTypography(scale);
  const sp = useSpacing(scale);

  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [60, 0]);

  const setaY = 16 * Math.sin((frame / fps) * 2 * Math.PI * 1.4);
  const setaCor = (cena.palavras_destacadas && cena.palavras_destacadas.length > 0)
    ? resolveWordColor(cena.palavras_destacadas[0].cor, corPrimaria, corSecundaria)
    : (corPrimaria ?? colors.red);

  const tokens = cena.texto_principal.split(/(\s+)/);
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

      <AbsoluteFill style={{ backgroundColor: "rgba(8, 10, 18, 0.75)" }} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: `0 ${sp.lg}px ${sp.xl}px`,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontFamily,
            fontWeight: typo.weightHero,
            fontSize: Math.round(108 * scale),
            lineHeight: typo.lineHeightTight,
            letterSpacing: typo.trackingTight,
            textTransform: "uppercase",
            color: colors.white,
            textAlign: "center",
          }}
        >
          {cena.palavras_destacadas && cena.palavras_destacadas.length > 0
            ? tokens.map((token, i) => (
                <span key={i} style={{ color: corMap[i] ?? colors.white }}>{token}</span>
              ))
            : cena.texto_principal}
        </div>

        {cena.texto_secundario ? (
          <div
            style={{
              marginTop: sp.lg,
              opacity: opacity * 0.9,
              transform: `translateY(${translateY}px)`,
              fontFamily,
              fontWeight: typo.weightCaption,
              fontSize: typo.sizeBody,
              color: colors.textMuted,
              textAlign: "center",
              maxWidth: Math.round(800 * scale),
            }}
          >
            {cena.texto_secundario}
          </div>
        ) : null}

        {cena.mostrar_seta !== false ? (
          <div
            style={{
              marginTop: sp.xl,
              fontSize: Math.round(120 * scale),
              lineHeight: 1,
              color: setaCor,
              opacity,
              transform: `translateY(${setaY}px)`,
            }}
          >
            ↓
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
