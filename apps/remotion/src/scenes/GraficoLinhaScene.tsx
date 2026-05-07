import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import type { GraficoLinha } from "@pontob/schema";
import { colors, typography, spacing, resolveFontFamily } from "../theme";

export const GraficoLinhaScene: React.FC<{
  cena: GraficoLinha;
  corPrimaria?: string;
  corSecundaria?: string;
  fonteFamilia?: string;
}> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Override por cena tem prioridade sobre o do especialista
  const accentColor = cena.cor_primaria ?? corPrimaria ?? colors.red;
  const accentColorSecundaria = cena.cor_secundaria ?? corSecundaria ?? colors.yellow;
  const fontFamily = resolveFontFamily(fonteFamilia);

  // Entrada geral
  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [30, 0]);

  // Progresso do desenho da linha (0→1 ao longo da duração)
  const totalFrames = Math.round(cena.duracao_segundos * fps);
  const drawDelay = fps * 0.5; // começa a desenhar após 0.5s
  const drawProgress = Math.min(1, Math.max(0, (frame - drawDelay) / (totalFrames - drawDelay)));

  const pontos = cena.pontos;
  const valores = pontos.map((p) => p.valor);
  const minVal = Math.min(...valores);
  const maxVal = Math.max(...valores);
  const range = maxVal - minVal || 1;

  // Dimensões do gráfico (em px, na resolução 1080×1920)
  const W = 960;
  const H = 480;
  const PAD_LEFT = 80;
  const PAD_RIGHT = 40;
  const PAD_TOP = 40;
  const PAD_BOTTOM = 60;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  // Coordenadas de cada ponto
  const coords = pontos.map((p, i) => ({
    x: PAD_LEFT + (i / (pontos.length - 1)) * innerW,
    y: PAD_TOP + innerH - ((p.valor - minVal) / range) * innerH,
    ...p,
  }));

  // Quantos pontos mostrar com base no drawProgress
  const visibleCount = Math.max(2, Math.round(drawProgress * (pontos.length - 1)) + 1);
  const visibleCoords = coords.slice(0, visibleCount);

  // Interpola o último ponto parcial
  const lastFull = visibleCoords[visibleCoords.length - 1];
  const nextFull = coords[visibleCount] ?? null;
  let pathCoords = visibleCoords;

  if (nextFull && visibleCount < pontos.length) {
    const segmentProgress = (drawProgress * (pontos.length - 1)) % 1;
    const interpX = lastFull.x + (nextFull.x - lastFull.x) * segmentProgress;
    const interpY = lastFull.y + (nextFull.y - lastFull.y) * segmentProgress;
    pathCoords = [...visibleCoords, { ...nextFull, x: interpX, y: interpY }];
  }

  // SVG path da linha
  const linePath = pathCoords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  // SVG path da área preenchida
  const areaPath =
    `M ${pathCoords[0].x} ${PAD_TOP + innerH} ` +
    pathCoords.map((c) => `L ${c.x} ${c.y}`).join(" ") +
    ` L ${pathCoords[pathCoords.length - 1].x} ${PAD_TOP + innerH} Z`;

  // Linhas de grade (5 linhas horizontais)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD_TOP + innerH * (1 - t),
    valor: minVal + range * t,
  }));

  const formatVal = (v: number) => {
    const u = cena.unidade ?? "";
    if (Math.abs(v) >= 1_000_000) return `${u}${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${u}${(v / 1_000).toFixed(0)}k`;
    return `${u}${v.toFixed(0)}`;
  };

  return (
    <AbsoluteFill>
      {/* Fundo escuro semitransparente */}
      <AbsoluteFill style={{ backgroundColor: "rgba(5, 8, 20, 0.90)" }} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `${spacing.xl}px ${spacing.lg}px`,
          gap: spacing.md,
        }}
      >
        {/* Título */}
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontFamily,
            fontWeight: typography.weightTitle,
            fontSize: typography.sizeSubtitle,
            color: colors.white,
            letterSpacing: typography.trackingTight,
            textAlign: "center",
            lineHeight: typography.lineHeightTight,
          }}
        >
          {cena.titulo}
        </div>

        {cena.subtitulo ? (
          <div
            style={{
              opacity: opacity * 0.7,
              fontFamily,
              fontWeight: typography.weightCaption,
              fontSize: typography.sizeCaption,
              color: colors.textMuted,
              textAlign: "center",
            }}
          >
            {cena.subtitulo}
          </div>
        ) : null}

        {/* Gráfico SVG */}
        <div style={{ opacity, width: W, flexShrink: 0 }}>
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ overflow: "visible" }}
          >
            {/* Grade horizontal */}
            {gridLines.map((g, i) => (
              <g key={i}>
                <line
                  x1={PAD_LEFT}
                  y1={g.y}
                  x2={PAD_LEFT + innerW}
                  y2={g.y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 10}
                  y={g.y + 6}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.35)"
                  fontSize={24}
                  fontFamily={fontFamily}
                >
                  {formatVal(g.valor)}
                </text>
              </g>
            ))}

            {/* Área preenchida com gradiente sutil */}
            {cena.mostrar_area !== false ? (
              <>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGrad)" />
              </>
            ) : null}

            {/* Linha principal */}
            <path
              d={linePath}
              fill="none"
              stroke={accentColor}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Rótulos do eixo X e pontos */}
            {coords.map((c, i) => {
              const visible = i < pathCoords.length;
              return (
                <g key={i} opacity={visible ? 1 : 0}>
                  {/* Rótulo X */}
                  <text
                    x={c.x}
                    y={PAD_TOP + innerH + 40}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.45)"
                    fontSize={22}
                    fontFamily={fontFamily}
                  >
                    {c.rotulo}
                  </text>
                  {/* Ponto */}
                  {visible && i === pathCoords.length - 1 ? (
                    <>
                      <circle cx={c.x} cy={c.y} r={10} fill={accentColor} opacity={0.3} />
                      <circle cx={c.x} cy={c.y} r={5} fill={accentColor} />
                      {/* Valor no último ponto visível */}
                      <text
                        x={c.x}
                        y={c.y - 18}
                        textAnchor="middle"
                        fill={accentColorSecundaria}
                        fontSize={28}
                        fontWeight={700}
                        fontFamily={fontFamily}
                      >
                        {formatVal(c.valor)}
                      </text>
                    </>
                  ) : visible ? (
                    <circle cx={c.x} cy={c.y} r={4} fill={accentColor} opacity={0.6} />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
