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
import type { GraficoBarra } from "@pontob/schema";
import { colors, resolveFontFamily, resolveAudioSrc, useTypography, useSpacing } from "../theme";
import { useScaleFactor } from "../hooks/useScaleFactor";

export const GraficoBarraScene: React.FC<{
  cena: GraficoBarra;
  corPrimaria?: string;
  corSecundaria?: string;
  fonteFamilia?: string;
}> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const scale = useScaleFactor();
  const typo = useTypography(scale);
  const sp = useSpacing(scale);
  const fontFamily = resolveFontFamily(fonteFamilia);
  const accentColor = cena.cor_primaria ?? corPrimaria ?? colors.red;
  const accentSecundaria = cena.cor_secundaria ?? corSecundaria ?? colors.yellow;

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [30, 0]);

  const barras = cena.barras;
  const maxVal = Math.max(...barras.map((b) => b.valor));

  const W = Math.round(width * 0.88);
  const H = Math.round(W * 0.504);
  const PAD_TOP = 32;
  const PAD_BOTTOM = 72;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const barSpacing = Math.floor(W / barras.length);
  const barWidth = Math.floor(barSpacing * 0.6);

  const barAnimations = barras.map((_, i) => {
    const delay = i * 5;
    const bs = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14, stiffness: 90 } });
    return interpolate(bs, [0, 1], [0, 1]);
  });

  const formatVal = (b: typeof barras[0]) => {
    if ("valor_display" in b && (b as { valor_display?: string }).valor_display) {
      return (b as { valor_display: string }).valor_display;
    }
    const u = cena.unidade ?? "";
    const v = b.valor;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}${u}`;
  };

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

      <AbsoluteFill style={{ backgroundColor: "rgba(5, 8, 20, 0.90)" }} />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `0 ${sp.lg}px`, gap: sp.md }}>
        <div style={{ opacity, transform: `translateY(${translateY}px)`, fontFamily, fontWeight: typo.weightTitle, fontSize: typo.sizeSubtitle, color: colors.white, letterSpacing: typo.trackingTight, textAlign: "center", lineHeight: typo.lineHeightTight }}>
          {cena.titulo}
        </div>
        {cena.subtitulo ? (
          <div style={{ opacity: opacity * 0.7, fontFamily, fontWeight: typo.weightCaption, fontSize: typo.sizeCaption, color: colors.textMuted, textAlign: "center" }}>
            {cena.subtitulo}
          </div>
        ) : null}
        <div style={{ opacity, width: W, maxWidth: "100%", flexShrink: 0 }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <line x1={0} y1={PAD_TOP + innerH} x2={W} y2={PAD_TOP + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
            {barras.map((barra, i) => {
              const progress = barAnimations[i];
              const barH = ((barra.valor / maxVal) * innerH) * progress;
              const x = i * barSpacing + (barSpacing - barWidth) / 2;
              const y = PAD_TOP + innerH - barH;
              const isDestaque = barra.eh_destaque;
              const fillColor = isDestaque ? accentSecundaria : accentColor;
              const fillOpacity = isDestaque ? 1 : 0.6;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={barWidth} height={barH} rx={8} ry={8} fill={fillColor} opacity={fillOpacity} />
                  {progress > 0.7 ? (
                    <text
                      x={x + barWidth / 2}
                      y={y - 14}
                      textAnchor="middle"
                      fill={isDestaque ? accentSecundaria : colors.white}
                      fontSize={Math.round((isDestaque ? 30 : 24) * scale)}
                      fontWeight={isDestaque ? 700 : 500}
                      fontFamily={fontFamily}
                      opacity={interpolate(progress, [0.7, 1], [0, 1])}
                    >
                      {formatVal(barra)}
                    </text>
                  ) : null}
                  <text
                    x={x + barWidth / 2}
                    y={PAD_TOP + innerH + 44}
                    textAnchor="middle"
                    fill={isDestaque ? accentSecundaria : "rgba(255,255,255,0.55)"}
                    fontSize={Math.round(20 * scale)}
                    fontWeight={isDestaque ? 600 : 400}
                    fontFamily={fontFamily}
                  >
                    {barra.rotulo}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
