/**
 * Composição Reel para uso no @remotion/player no browser (Next.js).
 *
 * Diferença do apps/remotion: usa <Video> (client-side) em vez de
 * <OffthreadVideo> (server-side render only). Mesma lógica visual.
 */

import {
  AbsoluteFill,
  Sequence,
  Video,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  staticFile,
} from "remotion";
import { useEffect } from "react";
import type { ReelProps, Cena } from "@pontob/schema";

const FPS = 30;

// ── Tema inline (espelho do apps/remotion/src/theme.ts) ──────────────────────

const colors = {
  navy: "#0A1628",
  navyDeep: "#050B14",
  red: "#E63946",
  white: "#FFFFFF",
  whiteSoft: "#F4F6F8",
  yellow: "#F4C430",
  textMuted: "#8B95A1",
} as const;

const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  weightHero: 900,
  weightTitle: 800,
  weightBody: 600,
  weightCaption: 500,
  sizeHero: 96,
  sizeTitle: 72,
  sizeSubtitle: 48,
  sizeBody: 44,
  sizeCaption: 32,
  trackingTight: -1.5,
  trackingNormal: 0,
  trackingWide: 2,
  lineHeightTight: 1.0,
  lineHeightBody: 1.3,
} as const;

const spacing = {
  xs: 8, sm: 16, md: 32, lg: 64, xl: 96, xxl: 144,
} as const;

function makeCorDestaque(corPrimaria?: string, corSecundaria?: string) {
  return (cor: "primaria" | "secundaria" | "branco"): string => {
    switch (cor) {
      case "primaria": return corPrimaria ?? colors.red;
      case "secundaria": return corSecundaria ?? colors.yellow;
      case "branco": return colors.white;
    }
  };
}

const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function resolveFontFamily(fonteFamilia?: string): string {
  return fonteFamilia && fonteFamilia.trim() ? fonteFamilia : DEFAULT_FONT_FAMILY;
}

/**
 * Constrói um mapa de cores por índice de token, suportando palavras compostas (ex: "20 MIL").
 * tokens: resultado de texto.split(/(\s+)/)
 * palavras: array de {palavra, cor}
 * resolver: makeCorDestaque(...)
 */
function resolveWordColor(cor: string, corPrimaria?: string, corSecundaria?: string): string {
  const lower = cor.toLowerCase().trim();
  if (lower === "primaria") return corPrimaria ?? colors.red;
  if (lower === "secundaria") return corSecundaria ?? colors.yellow;
  if (lower === "branco" || lower === "white") return colors.white;
  return cor;
}

function buildTokenCorMap(
  tokens: string[],
  palavras: Array<{ palavra: string; cor: string }>,
  corPrimaria?: string,
  corSecundaria?: string,
): (string | null)[] {
  const corMap: (string | null)[] = new Array(tokens.length).fill(null);
  for (const pw of palavras) {
    const corResolvida = resolveWordColor(pw.cor, corPrimaria, corSecundaria);
    const palavraLimpa = pw.palavra.toLowerCase().replace(/[.,!?;:]/g, "");
    const palavraTokens = palavraLimpa.split(/\s+/).filter(Boolean);
    let ti = 0;
    while (ti < tokens.length) {
      const candidates: number[] = [];
      let j = ti;
      while (j < tokens.length && candidates.length < palavraTokens.length) {
        if (tokens[j].trim()) candidates.push(j);
        j++;
      }
      if (candidates.length === palavraTokens.length) {
        const match = candidates.every((idx, k) =>
          tokens[idx].trim().replace(/[.,!?;:]/g, "").toLowerCase() === palavraTokens[k]
        );
        if (match) {
          candidates.forEach((idx) => { corMap[idx] = corResolvida; });
        }
      }
      ti++;
    }
  }
  return corMap;
}

// ── Reel (composição principal) ───────────────────────────────────────────────

export const ReelForPlayer: React.FC<ReelProps> = (props) => {
  const sequencias = (() => {
    let cursor = 0;
    return props.cenas.map((cena, index) => {
      const duracaoFrames = Math.max(1, Math.round(cena.duracao_segundos * FPS));
      // Se a cena de overlay tem inicio_overlay_segundos definido pelo usuário,
      // ele sobrescreve o cursor acumulado.
      const cenaComInicio = cena as Record<string, unknown>;
      const inicioOverride = typeof cenaComInicio["inicio_overlay_segundos"] === "number"
        ? (cenaComInicio["inicio_overlay_segundos"] as number)
        : null;
      const inicioSegundos = inicioOverride !== null ? inicioOverride : cursor;
      const inicioFrames = Math.round(inicioSegundos * FPS);
      cursor += cena.duracao_segundos;
      return { cena, inicioFrames, duracaoFrames, index };
    });
  })();

  const videoPath =
    props.video_original_path ??
    (props.cenas.find((c) => "video_path" in c) as { video_path: string } | undefined)?.video_path;

  const videoStartFrom = Math.round((props.video_start_segundos ?? 0) * FPS);
  const videoEndRaw = (props as Record<string, unknown>).video_end_segundos;
  const videoEndAt = typeof videoEndRaw === "number" && videoEndRaw > (props.video_start_segundos ?? 0)
    ? Math.round(videoEndRaw * FPS)
    : undefined;

  // Carrega a fonte do especialista no browser player
  useEffect(() => {
    if (!props.fonte_url) return;
    const existing = document.querySelector(`link[href="${props.fonte_url}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = props.fonte_url;
    document.head.appendChild(link);
  }, [props.fonte_url]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy }}>
      {videoPath ? (
        <Video
          src={videoPath}
          startFrom={videoStartFrom}
          {...(videoEndAt != null ? { endAt: videoEndAt } : {})}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}

      {videoPath ? (
        <AbsoluteFill style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }} />
      ) : null}

      {/* Música de fundo — toca durante todo o reel */}
      {props.musica_fundo ? (
        <Audio
          src={`/musica/${props.musica_fundo.path.replace(/^musica\//, "")}`}
          volume={Math.min(1, (props.musica_fundo.volume ?? 3) / 10)}
        />
      ) : null}

      {sequencias.map(({ cena, inicioFrames, duracaoFrames, index }) => (
        <Sequence
          key={`${cena.tipo}-${index}`}
          from={inicioFrames}
          durationInFrames={duracaoFrames}
          name={`${index + 1}_${cena.tipo}`}
        >
          <SceneRouter cena={cena} corPrimaria={props.cor_primaria} corSecundaria={props.cor_secundaria} fonteFamilia={props.fonte_familia} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// ── SceneRouter ───────────────────────────────────────────────────────────────

const SceneRouter: React.FC<{ cena: Cena; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({
  cena,
  corPrimaria,
  corSecundaria,
  fonteFamilia,
}) => {
  const p = { corPrimaria, corSecundaria, fonteFamilia };
  switch (cena.tipo) {
    case "Hook": return <HookOverlay cena={cena} {...p} />;
    case "CTA": return <CtaOverlay cena={cena} {...p} />;
    case "FraseImpacto": return <FraseImpactoOverlay cena={cena} {...p} />;
    case "ComparativoNumerico": return <ComparativoOverlay cena={cena} corPrimaria={corPrimaria} corSecundaria={corSecundaria} fonteFamilia={fonteFamilia} />;
    case "VideoCitacao": return <VideoCitacaoOverlay cena={cena} corPrimaria={corPrimaria} fonteFamilia={fonteFamilia} />;
    case "ListaPontos": return <ListaPontosOverlay cena={cena} corPrimaria={corPrimaria} fonteFamilia={fonteFamilia} />;
    case "MiniCaso": return <MiniCasoOverlay cena={cena} {...p} />;
    case "TransicaoTexto": return <TransicaoOverlay cena={cena} fonteFamilia={fonteFamilia} />;
    case "ConviteEvento": return <ConviteEventoOverlay cena={cena} corPrimaria={corPrimaria} fonteFamilia={fonteFamilia} />;
    case "GraficoBarra": return <GraficoBarraOverlay cena={cena} corPrimaria={corPrimaria} corSecundaria={corSecundaria} fonteFamilia={fonteFamilia} />;
    case "GraficoLinha": return <GraficoLinhaOverlay cena={cena} corPrimaria={corPrimaria} corSecundaria={corSecundaria} fonteFamilia={fonteFamilia} />;
    case "VideoSimples": return null; // Só o vídeo de fundo, sem overlay
    default: return null;
  }
};

// ── Gradiente de legibilidade reutilizável ────────────────────────────────────

const GradienteInferior: React.FC<{ opacity?: number }> = ({ opacity = 0.80 }) => (
  <AbsoluteFill style={{
    background: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,${opacity}) 100%)`,
    pointerEvents: "none",
  }} />
);

// ── Hook ──────────────────────────────────────────────────────────────────────

const HookOverlay: React.FC<{ cena: Extract<Cena, { tipo: "Hook" }>; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [40, 0]);
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  const tokens = cena.titulo.split(/(\s+)/);
  const fontFamily = resolveFontFamily(fonteFamilia);

  const hookCorMap = buildTokenCorMap(tokens, cena.palavras_destacadas, corPrimaria, corSecundaria);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <GradienteInferior />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 64px 420px", textAlign: "center" }}>
        <div style={{ opacity, transform: `translateY(${y}px) scale(${scale})`, fontFamily, fontWeight: typography.weightHero, fontSize: typography.sizeHero, lineHeight: typography.lineHeightTight, letterSpacing: typography.trackingTight, textTransform: "uppercase", color: colors.white, textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}>
          {tokens.map((token, i) => (
            <span key={i} style={{ color: hookCorMap[i] ?? colors.white }}>{token}</span>
          ))}
        </div>
        {cena.subtitulo && (
          <div style={{ marginTop: spacing.md, opacity: opacity * 0.9, transform: `translateY(${y * 0.8}px)`, fontFamily, fontWeight: typography.weightBody, fontSize: typography.sizeSubtitle, color: colors.whiteSoft, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
            {cena.subtitulo}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── VideoCitacao ──────────────────────────────────────────────────────────────

const VideoCitacaoOverlay: React.FC<{ cena: Extract<Cena, { tipo: "VideoCitacao" }>; corPrimaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [20, 0]);
  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.88) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 64px 420px" }}>
        <div style={{ opacity, transform: `translateY(${y}px)`, borderLeft: `6px solid ${accentColor}`, paddingLeft: spacing.md }}>
          <div style={{ fontFamily, fontWeight: typography.weightTitle, fontSize: typography.sizeBody, color: colors.white, letterSpacing: typography.trackingNormal }}>{cena.nome_mentor}</div>
          <div style={{ fontFamily, fontWeight: typography.weightCaption, fontSize: typography.sizeCaption, color: accentColor, marginBottom: spacing.md, opacity: 0.9 }}>{cena.cargo_mentor}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
            {cena.frases.map((frase, i) => {
              const fraseDelay = i * 8;
              const fe = spring({ frame: Math.max(0, frame - fraseDelay), fps, config: { damping: 14, stiffness: 80 } });
              return (
                <div key={i} style={{ opacity: interpolate(fe, [0, 1], [0, 1]), transform: `translateX(${interpolate(fe, [0, 1], [20, 0])}px)`, fontFamily, fontWeight: typography.weightBody, fontSize: typography.sizeSubtitle, color: colors.white, lineHeight: typography.lineHeightBody }}>{frase}</div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── FraseImpacto ──────────────────────────────────────────────────────────────

const FraseImpactoOverlay: React.FC<{ cena: Extract<Cena, { tipo: "FraseImpacto" }>; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [30, 0]);
  const tokens = cena.texto.split(/(\s+)/);
  const fontFamily = resolveFontFamily(fonteFamilia);
  const fraseCorMap = buildTokenCorMap(tokens, cena.palavras_destacadas ?? [], corPrimaria, corSecundaria);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.80) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: cena.alinhamento === "esquerda" ? "flex-start" : "center", padding: "0 64px 420px" }}>
        <div style={{ opacity, transform: `translateY(${y}px)`, fontFamily, fontWeight: typography.weightTitle, fontSize: typography.sizeTitle, lineHeight: typography.lineHeightBody, letterSpacing: typography.trackingTight, color: colors.white, textAlign: cena.alinhamento === "esquerda" ? "left" : "center", maxWidth: 900, textShadow: "0 3px 20px rgba(0,0,0,0.85)" }}>
          {tokens.map((token, i) => (
            <span key={i} style={{ color: fraseCorMap[i] ?? colors.white }}>{token}</span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── ListaPontos ───────────────────────────────────────────────────────────────

const ListaPontosOverlay: React.FC<{ cena: Extract<Cena, { tipo: "ListaPontos" }>; corPrimaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  const tituloEntrada = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const tituloOpacity = interpolate(tituloEntrada, [0, 1], [0, 1]);
  const tituloY = interpolate(tituloEntrada, [0, 1], [20, 0]);

  const ITEM_DELAY = 12;

  return (
    <AbsoluteFill>
      {cena.sfx ? cena.pontos.map((_, i) => (
        <Sequence key={i} from={Math.round(((cena.sfx!.inicio_segundos ?? 0) * fps) + i * ITEM_DELAY)}>
          <Audio
            src={staticFile(cena.sfx!.path)}
            volume={Math.min(1, (cena.sfx!.volume ?? 5) / 10)}
          />
        </Sequence>
      )) : null}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 15%, rgba(0,0,0,0.88) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 64px 420px", flexDirection: "column" }}>
        {cena.titulo && (
          <>
            <div style={{ opacity: tituloOpacity, width: 48, height: 4, backgroundColor: accentColor, borderRadius: 2, marginBottom: spacing.sm }} />
            <div style={{ opacity: tituloOpacity, transform: `translateY(${tituloY}px)`, fontFamily, fontWeight: typography.weightHero, fontSize: typography.sizeTitle, color: colors.white, letterSpacing: typography.trackingTight, textTransform: "uppercase", marginBottom: spacing.lg, textShadow: "0 3px 20px rgba(0,0,0,0.85)", lineHeight: typography.lineHeightTight }}>{cena.titulo}</div>
          </>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md, width: "100%" }}>
          {cena.pontos.map((ponto, i) => {
            const delay = i * ITEM_DELAY;
            const pe = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 16, stiffness: 100 } });
            const pontoOpacity = interpolate(pe, [0, 1], [0, 1]);
            const pontoX = interpolate(pe, [0, 1], [-60, 0]);
            const pontoScale = interpolate(pe, [0, 1], [0.95, 1]);
            return (
              <div key={i} style={{ opacity: pontoOpacity, transform: `translateX(${pontoX}px) scale(${pontoScale})`, display: "flex", flexDirection: "row", alignItems: "center", gap: spacing.md, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: `${spacing.sm}px ${spacing.md}px`, borderLeft: `4px solid ${accentColor}` }}>
                {cena.numerado
                  ? <div style={{ fontFamily, fontWeight: typography.weightHero, fontSize: 80, color: accentColor, minWidth: 68, lineHeight: 1, textAlign: "center", flexShrink: 0 }}>{i + 1}</div>
                  : <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: accentColor, flexShrink: 0 }} />}
                <div style={{ fontFamily, fontWeight: typography.weightBody, fontSize: typography.sizeBody, color: colors.white, lineHeight: typography.lineHeightBody }}>{ponto}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── ComparativoNumerico ───────────────────────────────────────────────────────

const ComparativoOverlay: React.FC<{ cena: Extract<Cena, { tipo: "ComparativoNumerico" }>; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [40, 0]);
  const accentColor = cena.cor_destaque ?? corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <GradienteInferior opacity={0.78} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 64px 420px", flexDirection: "column", gap: spacing.lg }}>
        <div style={{ opacity, transform: `translateY(${y}px)`, fontFamily, fontWeight: typography.weightBody, fontSize: typography.sizeCaption, color: colors.textMuted, textAlign: "center", textTransform: "uppercase", letterSpacing: typography.trackingWide }}>{cena.metrica_nome}</div>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "stretch", gap: spacing.md, width: "100%" }}>
          {cena.lados.map((lado, i) => {
            const delay = i * 4;
            const le = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12, stiffness: 80 } });
            return (
              <div key={i} style={{ opacity: interpolate(le, [0, 1], [0, 1]), transform: `translateY(${interpolate(le, [0, 1], [30, 0])}px)`, flex: 1, minWidth: 0, maxWidth: 420, backgroundColor: lado.eh_destaque ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border: lado.eh_destaque ? `3px solid ${accentColor}` : "2px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: `${spacing.lg}px ${spacing.md}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.sm, overflow: "hidden" }}>
                <div style={{ fontFamily, fontWeight: typography.weightHero, fontSize: (() => { const l = String(lado.valor).length; if (l <= 4) return 120; if (l <= 7) return 96; if (l <= 10) return 72; if (l <= 14) return 56; return 44; })(), lineHeight: 1.05, color: lado.eh_destaque ? accentColor : colors.whiteSoft, letterSpacing: typography.trackingTight, textAlign: "center", wordBreak: "break-word", overflowWrap: "break-word", width: "100%" }}>{lado.valor}</div>
                <div style={{ fontFamily, fontWeight: typography.weightBody, fontSize: typography.sizeCaption, color: colors.textMuted, textTransform: "uppercase", letterSpacing: typography.trackingWide, textAlign: "center", wordBreak: "break-word", width: "100%" }}>{lado.rotulo}</div>
              </div>
            );
          })}
        </div>
        <div style={{ opacity: opacity * 0.6, fontFamily, fontWeight: typography.weightCaption, fontSize: typography.sizeCaption, color: colors.textMuted, textAlign: "center" }}>
          em {cena.metrica_unidade}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── MiniCaso ──────────────────────────────────────────────────────────────────

const MiniCasoOverlay: React.FC<{ cena: Extract<Cena, { tipo: "MiniCaso" }>; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [30, 0]);
  const tokens = cena.resultado_texto.split(/(\s+)/);
  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);
  const casoCorMap = buildTokenCorMap(tokens, cena.palavras_destacadas ?? [], corPrimaria, corSecundaria);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 40%)" }} />
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.35)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-start", padding: `${spacing.xl}px ${spacing.lg}px 0` }}>
        <div style={{ opacity, transform: `translateY(${y}px)`, backgroundColor: "rgba(0,0,0,0.70)", border: `3px solid ${accentColor}`, borderRadius: 20, padding: `${spacing.md}px ${spacing.lg}px`, maxWidth: 900 }}>
          {cena.contexto_texto && (
            <div style={{ fontFamily, fontWeight: typography.weightCaption, fontSize: typography.sizeCaption, color: colors.textMuted, textTransform: "uppercase", letterSpacing: typography.trackingWide, marginBottom: spacing.xs }}>{cena.contexto_texto}</div>
          )}
          <div style={{ fontFamily, fontWeight: typography.weightTitle, fontSize: typography.sizeSubtitle, lineHeight: typography.lineHeightBody, color: colors.white }}>
            {tokens.map((token, i) => (
              <span key={i} style={{ color: casoCorMap[i] ?? colors.white }}>{token}</span>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── TransicaoTexto ────────────────────────────────────────────────────────────

const TransicaoOverlay: React.FC<{ cena: Extract<Cena, { tipo: "TransicaoTexto" }>; fonteFamilia?: string }> = ({ cena, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = resolveFontFamily(fonteFamilia);
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.96, 1]);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.72) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: `0 ${spacing.lg}px ${spacing.xxl}px` }}>
        <div style={{ opacity, transform: `scale(${scale})`, fontFamily, fontWeight: typography.weightTitle, fontSize: typography.sizeSubtitle, color: colors.whiteSoft, textAlign: "center", letterSpacing: typography.trackingNormal, lineHeight: typography.lineHeightBody, textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>{cena.texto}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── ConviteEvento ─────────────────────────────────────────────────────────────

const ConviteEventoOverlay: React.FC<{ cena: Extract<Cena, { tipo: "ConviteEvento" }>; corPrimaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [30, 0]);
  const accentColor = corPrimaria ?? colors.red;
  const fontFamily = resolveFontFamily(fonteFamilia);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ backgroundColor: "rgba(8, 10, 18, 0.82)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-start", padding: "200px 64px 420px", flexDirection: "column" }}>
        {cena.logo_url ? (
          <div style={{ opacity, transform: `translateY(${y}px)`, marginBottom: spacing.lg, alignSelf: cena.logo_posicao === "centro" ? "center" : cena.logo_posicao === "rodape" ? "flex-end" : "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cena.logo_url} alt={cena.nome_evento} style={{ height: cena.logo_altura ?? 72, width: "auto" }} />
          </div>
        ) : (
          <div style={{ opacity, transform: `translateY(${y}px)`, width: 64, height: 4, backgroundColor: accentColor, borderRadius: 2, marginBottom: spacing.md }} />
        )}
        <div style={{ opacity, transform: `translateY(${y}px)`, fontFamily, fontWeight: typography.weightHero, fontSize: typography.sizeTitle, lineHeight: typography.lineHeightTight, letterSpacing: typography.trackingTight, textTransform: "uppercase", color: colors.white, marginBottom: cena.descricao ? spacing.sm : spacing.lg }}>{cena.nome_evento}
        </div>
        {cena.descricao ? (
          <div style={{ opacity: opacity * 0.85, transform: `translateY(${y}px)`, fontFamily, fontWeight: typography.weightBody, fontSize: typography.sizeBody, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: typography.lineHeightBody }}>{cena.descricao}</div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          {cena.bullets.map((bullet, i) => {
            const delay = i * 6;
            const be = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14, stiffness: 90 } });
            const bulletOpacity = interpolate(be, [0, 1], [0, 1]);
            const bulletX = interpolate(be, [0, 1], [-30, 0]);
            return (
              <div key={i} style={{ opacity: bulletOpacity, transform: `translateX(${bulletX}px)`, display: "flex", alignItems: "center", gap: spacing.sm }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: colors.white, fontWeight: 900 }}>✓</div>
                <div style={{ fontFamily, fontWeight: typography.weightBody, fontSize: typography.sizeBody, color: colors.whiteSoft, lineHeight: typography.lineHeightBody }}>{bullet}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── GraficoLinha ──────────────────────────────────────────────────────────────

const GraficoLinhaOverlay: React.FC<{ cena: Extract<Cena, { tipo: "GraficoLinha" }>; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = resolveFontFamily(fonteFamilia);
  const accentColor = cena.cor_primaria ?? corPrimaria ?? colors.red;
  const accentSecundaria = cena.cor_secundaria ?? corSecundaria ?? colors.yellow;

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [30, 0]);

  const totalFrames = Math.round(cena.duracao_segundos * fps);
  const drawDelay = fps * 0.5;
  const drawProgress = Math.min(1, Math.max(0, (frame - drawDelay) / (totalFrames - drawDelay)));

  const pontos = cena.pontos;
  const valores = pontos.map((p) => p.valor);
  const minVal = Math.min(...valores);
  const maxVal = Math.max(...valores);
  const range = maxVal - minVal || 1;

  const W = 960;
  const H = 480;
  const PAD_LEFT = 80;
  const PAD_RIGHT = 40;
  const PAD_TOP = 40;
  const PAD_BOTTOM = 60;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const coords = pontos.map((p, i) => ({
    x: PAD_LEFT + (i / (pontos.length - 1)) * innerW,
    y: PAD_TOP + innerH - ((p.valor - minVal) / range) * innerH,
    ...p,
  }));

  const visibleCount = Math.max(2, Math.round(drawProgress * (pontos.length - 1)) + 1);
  const visibleCoords = coords.slice(0, visibleCount);
  const lastFull = visibleCoords[visibleCoords.length - 1];
  const nextFull = coords[visibleCount] ?? null;
  let pathCoords = visibleCoords;
  if (nextFull && visibleCount < pontos.length) {
    const segmentProgress = (drawProgress * (pontos.length - 1)) % 1;
    const interpX = lastFull.x + (nextFull.x - lastFull.x) * segmentProgress;
    const interpY = lastFull.y + (nextFull.y - lastFull.y) * segmentProgress;
    pathCoords = [...visibleCoords, { ...nextFull, x: interpX, y: interpY }];
  }

  const linePath = pathCoords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `M ${pathCoords[0].x} ${PAD_TOP + innerH} ` + pathCoords.map((c) => `L ${c.x} ${c.y}`).join(" ") + ` L ${pathCoords[pathCoords.length - 1].x} ${PAD_TOP + innerH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD_TOP + innerH * (1 - t),
    valor: minVal + range * t,
  }));

  const formatVal = (v: number) => {
    const u = cena.unidade ?? "";
    if (Math.abs(v) >= 1_000_000) return `${u}${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${u}${(v / 1_000).toFixed(0)}k`;
    return `${u}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
  };

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ backgroundColor: "rgba(5, 8, 20, 0.90)" }} />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `${spacing.xl}px ${spacing.lg}px`, gap: spacing.md }}>
        <div style={{ opacity, transform: `translateY(${translateY}px)`, fontFamily, fontWeight: typography.weightTitle, fontSize: typography.sizeSubtitle, color: colors.white, letterSpacing: typography.trackingTight, textAlign: "center", lineHeight: typography.lineHeightTight }}>{cena.titulo}</div>
        {cena.subtitulo ? <div style={{ opacity: opacity * 0.7, fontFamily, fontWeight: typography.weightCaption, fontSize: typography.sizeCaption, color: colors.textMuted, textAlign: "center" }}>{cena.subtitulo}</div> : null}
        <div style={{ opacity, width: W, flexShrink: 0 }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="lgAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {gridLines.map((g, i) => (
              <g key={i}>
                <line x1={PAD_LEFT} y1={g.y} x2={PAD_LEFT + innerW} y2={g.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <text x={PAD_LEFT - 10} y={g.y + 6} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize={24} fontFamily={fontFamily}>{formatVal(g.valor)}</text>
              </g>
            ))}
            {cena.mostrar_area !== false ? <path d={areaPath} fill="url(#lgAreaGrad)" /> : null}
            <path d={linePath} fill="none" stroke={accentColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            {coords.map((c, i) => {
              const visible = i < pathCoords.length;
              const isLast = visible && i === pathCoords.length - 1;
              return (
                <g key={i} opacity={visible ? 1 : 0}>
                  <text x={c.x} y={PAD_TOP + innerH + 40} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={22} fontFamily={fontFamily}>{c.rotulo}</text>
                  {isLast ? (
                    <>
                      <circle cx={c.x} cy={c.y} r={10} fill={accentColor} opacity={0.3} />
                      <circle cx={c.x} cy={c.y} r={5} fill={accentColor} />
                      <text x={c.x} y={c.y - 18} textAnchor="middle" fill={accentSecundaria} fontSize={28} fontWeight={700} fontFamily={fontFamily}>{formatVal(c.valor)}</text>
                    </>
                  ) : visible ? <circle cx={c.x} cy={c.y} r={4} fill={accentColor} opacity={0.6} /> : null}
                </g>
              );
            })}
          </svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── GraficoBarra ──────────────────────────────────────────────────────────────

const GraficoBarraOverlay: React.FC<{ cena: Extract<Cena, { tipo: "GraficoBarra" }>; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = resolveFontFamily(fonteFamilia);
  const accentColor = cena.cor_primaria ?? corPrimaria ?? colors.red;
  const accentSecundaria = cena.cor_secundaria ?? corSecundaria ?? colors.yellow;

  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const translateY = interpolate(entrada, [0, 1], [30, 0]);

  const barras = cena.barras;
  const maxVal = Math.max(...barras.map((b) => b.valor));

  const W = 952;
  const H = 480;
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
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ backgroundColor: "rgba(5, 8, 20, 0.90)" }} />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `0 64px`, gap: spacing.md }}>
        <div style={{ opacity, transform: `translateY(${translateY}px)`, fontFamily, fontWeight: typography.weightTitle, fontSize: typography.sizeSubtitle, color: colors.white, letterSpacing: typography.trackingTight, textAlign: "center", lineHeight: typography.lineHeightTight }}>
          {cena.titulo}
        </div>
        {cena.subtitulo ? (
          <div style={{ opacity: opacity * 0.7, fontFamily, fontWeight: typography.weightCaption, fontSize: typography.sizeCaption, color: colors.textMuted, textAlign: "center" }}>{cena.subtitulo}</div>
        ) : null}
        <div style={{ opacity, width: W, flexShrink: 0 }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
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
                    <text x={x + barWidth / 2} y={y - 14} textAnchor="middle" fill={isDestaque ? accentSecundaria : colors.white} fontSize={isDestaque ? 30 : 24} fontWeight={isDestaque ? 700 : 500} fontFamily={fontFamily} opacity={interpolate(progress, [0.7, 1], [0, 1])}>
                      {formatVal(barra)}
                    </text>
                  ) : null}
                  <text x={x + barWidth / 2} y={PAD_TOP + innerH + 44} textAnchor="middle" fill={isDestaque ? accentSecundaria : "rgba(255,255,255,0.55)"} fontSize={20} fontWeight={isDestaque ? 600 : 400} fontFamily={fontFamily}>
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

// ── CTA ───────────────────────────────────────────────────────────────────────

const CtaOverlay: React.FC<{ cena: Extract<Cena, { tipo: "CTA" }>; corPrimaria?: string; corSecundaria?: string; fonteFamilia?: string }> = ({ cena, corPrimaria, corSecundaria, fonteFamilia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontFamily = resolveFontFamily(fonteFamilia);
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [60, 0]);
  const setaY = 16 * Math.sin((frame / fps) * 2 * Math.PI * 1.4);
  const setaCor = (cena.palavras_destacadas && cena.palavras_destacadas.length > 0)
    ? resolveWordColor(cena.palavras_destacadas[0].cor, corPrimaria, corSecundaria)
    : (corPrimaria ?? colors.red);

  const tokens = cena.texto_principal.split(/(\s+)/);
  const ctaCorMap = buildTokenCorMap(tokens, cena.palavras_destacadas ?? [], corPrimaria, corSecundaria);

  return (
    <AbsoluteFill>
      {cena.sfx ? (
        <Sequence from={Math.round((cena.sfx.inicio_segundos ?? 0) * fps)}>
          <Audio
            src={staticFile(cena.sfx.path)}
            volume={Math.min(1, (cena.sfx.volume ?? 5) / 10)}
            endAt={cena.sfx.fim_segundos != null ? Math.round(cena.sfx.fim_segundos * fps) : undefined}
          />
        </Sequence>
      ) : null}

      <AbsoluteFill style={{ backgroundColor: "rgba(8, 10, 18, 0.75)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 64px 96px", flexDirection: "column" }}>
        <div style={{ opacity, transform: `translateY(${y}px)`, fontFamily, fontWeight: typography.weightHero, fontSize: 108, lineHeight: typography.lineHeightTight, letterSpacing: typography.trackingTight, textTransform: "uppercase", color: colors.white, textAlign: "center" }}>
          {cena.palavras_destacadas && cena.palavras_destacadas.length > 0
            ? tokens.map((token, i) => (
                <span key={i} style={{ color: ctaCorMap[i] ?? colors.white }}>{token}</span>
              ))
            : cena.texto_principal}
        </div>
        {cena.texto_secundario ? (
          <div style={{ marginTop: spacing.lg, opacity: opacity * 0.9, transform: `translateY(${y}px)`, fontFamily, fontWeight: typography.weightCaption, fontSize: typography.sizeBody, color: colors.textMuted, textAlign: "center", maxWidth: 800 }}>{cena.texto_secundario}</div>
        ) : null}
        {cena.mostrar_seta !== false ? (
          <div style={{ marginTop: spacing.xl, fontSize: 120, lineHeight: 1, color: setaCor, opacity, transform: `translateY(${setaY}px)` }}>↓</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
