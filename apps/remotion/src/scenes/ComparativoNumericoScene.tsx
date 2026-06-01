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
import type { ComparativoNumerico } from "@pontob/schema";
import { colors, resolveFontFamily, resolveAudioSrc, useTypography, useSpacing } from "../theme";
import { useScaleFactor } from "../hooks/useScaleFactor";

function valorFontSizeBase(valor: string): number {
  const len = String(valor).length;
  if (len <= 4)  return 120;
  if (len <= 7)  return 96;
  if (len <= 10) return 72;
  if (len <= 14) return 56;
  return 44;
}

export const ComparativoNumericoScene: React.FC<{
  cena: ComparativoNumerico;
  corPrimaria?: string;
  corSecundaria?: string;
  fonteFamilia?: string;
}> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = useScaleFactor();
  const typo = useTypography(scale);
  const sp = useSpacing(scale);

  const accentColor = cena.cor_destaque ?? corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  const entrada = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [40, 0]);

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
        background: "linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.78) 100%)",
        pointerEvents: "none",
      }} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: `0 ${sp.lg}px ${sp.xxl}px`,
          flexDirection: "column",
          gap: sp.lg,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontFamily,
            fontWeight: typo.weightBody,
            fontSize: typo.sizeCaption,
            color: colors.textMuted,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: typo.trackingWide,
          }}
        >
          {cena.metrica_nome}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "stretch",
            gap: sp.md,
            width: "100%",
          }}
        >
          {cena.lados.map((lado, i) => {
            const delay = i * 4;
            const ladoEntrada = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 12, stiffness: 80 },
            });
            const ladoOpacity = interpolate(ladoEntrada, [0, 1], [0, 1]);
            const ladoY = interpolate(ladoEntrada, [0, 1], [30, 0]);

            return (
              <div
                key={i}
                style={{
                  opacity: ladoOpacity,
                  transform: `translateY(${ladoY}px)`,
                  flex: 1,
                  minWidth: 0,
                  maxWidth: Math.round(380 * scale),
                  backgroundColor: lado.eh_destaque
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: lado.eh_destaque
                    ? `3px solid ${accentColor}`
                    : "2px solid rgba(255,255,255,0.1)",
                  borderRadius: 24,
                  padding: `${sp.lg}px ${sp.md}px`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: sp.sm,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontFamily,
                    fontWeight: typo.weightHero,
                    fontSize: Math.round(valorFontSizeBase(String(lado.valor)) * scale),
                    lineHeight: 1.05,
                    color: lado.eh_destaque ? accentColor : colors.whiteSoft,
                    letterSpacing: typo.trackingTight,
                    textAlign: "center",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    width: "100%",
                  }}
                >
                  {lado.valor}
                </div>
                <div
                  style={{
                    fontFamily,
                    fontWeight: typo.weightBody,
                    fontSize: typo.sizeCaption,
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: typo.trackingWide,
                    textAlign: "center",
                    wordBreak: "break-word",
                    width: "100%",
                  }}
                >
                  {lado.rotulo}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            opacity: opacity * 0.6,
            fontFamily,
            fontWeight: typo.weightCaption,
            fontSize: typo.sizeCaption,
            color: colors.textMuted,
            textAlign: "center",
          }}
        >
          em {cena.metrica_unidade}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
