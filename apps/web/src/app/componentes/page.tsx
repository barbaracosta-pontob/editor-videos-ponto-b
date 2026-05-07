"use client";

import { AppNav } from "@/components/AppNav";
import styles from "./page.module.css";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type ComponenteInfo = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  preview: React.ReactNode;
};

// ── Cores de exemplo ───────────────────────────────────────────────────────────

const COR_PRIMARIA = "#1D5EAE";
const COR_SECUNDARIA = "#38DCA8";
const FONT = "'Inter', 'Helvetica Neue', sans-serif";

// ── Helpers de estilo ──────────────────────────────────────────────────────────

function Frame({ children, bg = "rgba(0,0,0,0.85)" }: { children: React.ReactNode; bg?: string }) {
  return (
    <div style={{
      width: "100%",
      aspectRatio: "9/16",
      background: bg,
      borderRadius: 10,
      overflow: "hidden",
      position: "relative",
      fontFamily: FONT,
    }}>
      {children}
    </div>
  );
}

function Gradient({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.88) 100%)",
      pointerEvents: "none",
      ...style,
    }} />
  );
}

// ── Previews individuais ───────────────────────────────────────────────────────

function PreviewHook() {
  return (
    <Frame bg="linear-gradient(160deg, #0a1628 0%, #1a2a40 100%)">
      <Gradient />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: "0 28px 120px", textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 42, lineHeight: 1.1, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}>
          você está{" "}
          <span style={{ color: COR_SECUNDARIA }}>perdendo</span>{" "}
          dinheiro todo dia
        </div>
        <div style={{ marginTop: 14, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          e nem sabe o motivo
        </div>
      </div>
    </Frame>
  );
}

function PreviewFraseImpacto() {
  return (
    <Frame bg="linear-gradient(160deg, #0a1628 0%, #1a2a40 100%)">
      <Gradient />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: "0 28px 120px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 36, lineHeight: 1.4, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 3px 20px rgba(0,0,0,0.85)" }}>
          "O problema não é falta de{" "}
          <span style={{ color: COR_PRIMARIA }}>esforço</span>.
          É falta de{" "}
          <span style={{ color: COR_SECUNDARIA }}>direção</span>."
        </div>
      </div>
    </Frame>
  );
}

function PreviewListaPontos() {
  const itens = ["Diagnóstico preciso", "Protocolo individualizado", "Acompanhamento semanal"];
  return (
    <Frame bg="linear-gradient(160deg, #0a1628 0%, #1a2a40 100%)">
      <Gradient />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start", padding: "0 28px 120px" }}>
        <div style={{ width: 40, height: 4, backgroundColor: COR_PRIMARIA, borderRadius: 2, marginBottom: 12 }} />
        <div style={{ fontWeight: 900, fontSize: 36, lineHeight: 1.1, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff", marginBottom: 20 }}>
          3 pilares do tratamento
        </div>
        {itens.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: COR_PRIMARIA, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ fontWeight: 600, fontSize: 20, color: "#fff", lineHeight: 1.3 }}>
              {item}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function PreviewMiniCaso() {
  return (
    <Frame bg="linear-gradient(160deg, #0a1628 0%, #1a2a40 100%)">
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 40%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start", padding: "48px 24px 0" }}>
        <div style={{ background: "rgba(0,0,0,0.70)", border: `3px solid ${COR_PRIMARIA}`, borderRadius: 16, padding: "16px 20px", maxWidth: "85%" }}>
          <div style={{ fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Paciente · 3 meses
          </div>
          <div style={{ fontWeight: 900, fontSize: 38, color: COR_SECUNDARIA, lineHeight: 1, marginBottom: 6 }}>
            −12 kg
          </div>
          <div style={{ fontWeight: 600, fontSize: 18, color: "#fff", lineHeight: 1.4 }}>
            sem dieta restritiva
          </div>
        </div>
      </div>
    </Frame>
  );
}

function PreviewComparativoNumerico() {
  return (
    <Frame bg="linear-gradient(160deg, #0a1628 0%, #1a2a40 100%)">
      <Gradient />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: "0 20px 80px", gap: 12 }}>
        <div style={{ fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Redução de colesterol
        </div>
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          {[
            { label: "Tratamento comum", valor: "8%", destaque: false },
            { label: "Protocolo integrado", valor: "34%", destaque: true },
          ].map((lado) => (
            <div key={lado.label} style={{ flex: 1, background: lado.destaque ? `linear-gradient(135deg, ${COR_PRIMARIA}22, ${COR_SECUNDARIA}22)` : "rgba(255,255,255,0.06)", border: `2px solid ${lado.destaque ? COR_SECUNDARIA : "rgba(255,255,255,0.12)"}`, borderRadius: 14, padding: "16px 10px", textAlign: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 44, color: lado.destaque ? COR_SECUNDARIA : "#fff", lineHeight: 1 }}>
                {lado.valor}
              </div>
              <div style={{ fontWeight: 500, fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 8, lineHeight: 1.4 }}>
                {lado.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function PreviewVideoCitacao() {
  return (
    <Frame bg="linear-gradient(160deg, #0a1628 0%, #1a2a40 100%)">
      <Gradient />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start", padding: "0 28px 140px" }}>
        <div style={{ borderLeft: `6px solid ${COR_PRIMARIA}`, paddingLeft: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 4 }}>
            Dr. Rafael Matos
          </div>
          <div style={{ fontWeight: 400, fontSize: 14, color: COR_SECUNDARIA, marginBottom: 16, opacity: 0.9 }}>
            Cardiologista · Hospital das Clínicas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Colesterol controlado", "Pressão normalizada"].map((frase, i) => (
              <div key={i} style={{ fontWeight: 600, fontSize: 18, color: i === 0 ? "#fff" : "rgba(255,255,255,0.55)" }}>
                {frase}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function PreviewTransicaoTexto() {
  return (
    <Frame bg="linear-gradient(160deg, #0a1628 0%, #1a2a40 100%)">
      <Gradient style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.72) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", padding: "0 28px 80px" }}>
        <div style={{ fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,0.85)", textAlign: "center", letterSpacing: "-0.01em", lineHeight: 1.5 }}>
          Mas isso foi só o começo...
        </div>
      </div>
    </Frame>
  );
}

function PreviewCTA() {
  return (
    <Frame bg="rgba(8, 10, 18, 0.92)">
      <div style={{ position: "absolute", inset: 0, background: "rgba(8, 10, 18, 0.75)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: "0 28px 80px" }}>
        <div style={{ fontWeight: 900, fontSize: 56, lineHeight: 1.1, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff", textAlign: "center" }}>
          Siga para{" "}
          <span style={{ color: COR_SECUNDARIA }}>mais</span>
        </div>
        <div style={{ marginTop: 20, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
          Conteúdo todo dia sobre saúde e longevidade
        </div>
        <div style={{ marginTop: 32, fontSize: 36 }}>↓</div>
      </div>
    </Frame>
  );
}

function PreviewConviteEvento() {
  return (
    <Frame bg="rgba(10, 12, 20, 0.92)">
      <div style={{ position: "absolute", inset: 0, background: "rgba(10, 12, 20, 0.82)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "0 28px" }}>
        <div style={{ width: 56, height: 4, background: `linear-gradient(90deg, ${COR_PRIMARIA}, ${COR_SECUNDARIA})`, borderRadius: 2, marginBottom: 20 }} />
        <div style={{ fontWeight: 900, fontSize: 42, lineHeight: 1.1, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff", marginBottom: 16 }}>
          Summit de Saúde Integrativa
        </div>
        <div style={{ fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.60)", lineHeight: 1.5, marginBottom: 24 }}>
          O maior evento de medicina funcional do Brasil
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{ icon: "📅", text: "15 de Agosto, 2025" }, { icon: "📍", text: "São Paulo · Online" }].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 18, color: "#fff" }}>{item.text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, background: `linear-gradient(135deg, ${COR_PRIMARIA}, ${COR_SECUNDARIA})`, borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 17, color: "#fff" }}>
          Inscrição gratuita →
        </div>
      </div>
    </Frame>
  );
}

function PreviewGraficoLinha() {
  const pontos = [
    { rotulo: "Jan", valor: 100 },
    { rotulo: "Mar", valor: 118 },
    { rotulo: "Jun", valor: 142 },
    { rotulo: "Set", valor: 165 },
    { rotulo: "Dez", valor: 210 },
  ];
  const W = 260; const H = 140;
  const PAD_L = 10; const PAD_R = 10; const PAD_T = 24; const PAD_B = 28;
  const iW = W - PAD_L - PAD_R; const iH = H - PAD_T - PAD_B;
  const vals = pontos.map(p => p.valor);
  const min = Math.min(...vals); const max = Math.max(...vals); const range = max - min;
  const coords = pontos.map((p, i) => ({
    x: PAD_L + (i / (pontos.length - 1)) * iW,
    y: PAD_T + iH - ((p.valor - min) / range) * iH,
    ...p,
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const area = `M ${coords[0].x} ${PAD_T + iH} ` + coords.map(c => `L ${c.x} ${c.y}`).join(" ") + ` L ${coords[coords.length-1].x} ${PAD_T + iH} Z`;

  return (
    <Frame bg="rgba(5, 8, 20, 0.95)">
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px 16px", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", textAlign: "center", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Patrimônio acumulado
        </div>
        <div style={{ fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: -4 }}>
          Juros compostos — aportes mensais
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", flexShrink: 0 }}>
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR_PRIMARIA} stopOpacity="0.3" />
              <stop offset="100%" stopColor={COR_PRIMARIA} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((t, i) => (
            <line key={i} x1={PAD_L} y1={PAD_T + iH * (1-t)} x2={PAD_L + iW} y2={PAD_T + iH * (1-t)} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          ))}
          <path d={area} fill="url(#lg1)" />
          <path d={line} fill="none" stroke={COR_PRIMARIA} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((c, i) => (
            <g key={i}>
              <text x={c.x} y={PAD_T + iH + 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9}>{c.rotulo}</text>
              {i === coords.length - 1 && (
                <>
                  <circle cx={c.x} cy={c.y} r={5} fill={COR_PRIMARIA} opacity={0.3} />
                  <circle cx={c.x} cy={c.y} r={3} fill={COR_PRIMARIA} />
                  <text x={c.x} y={c.y - 8} textAnchor="middle" fill={COR_SECUNDARIA} fontSize={11} fontWeight={700}>R${c.valor}k</text>
                </>
              )}
            </g>
          ))}
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <div style={{ width: 20, height: 2, background: COR_PRIMARIA, borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Evolução do patrimônio</span>
        </div>
      </div>
    </Frame>
  );
}

function PreviewGraficoBarra() {
  const barras = [
    { rotulo: "Poupança", valor: 6.2, destaque: false },
    { rotulo: "Tesouro", valor: 11.8, destaque: false },
    { rotulo: "FIIs", valor: 14.5, destaque: false },
    { rotulo: "Método V", valor: 28.3, destaque: true },
  ];
  const maxVal = Math.max(...barras.map(b => b.valor));
  const W = 260; const H = 150;
  const PAD_B = 32; const PAD_T = 20; const iH = H - PAD_T - PAD_B;
  const barW = 44; const gap = (W - barras.length * barW) / (barras.length + 1);

  return (
    <Frame bg="rgba(5, 8, 20, 0.95)">
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px 16px", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", textAlign: "center", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Rentabilidade anual
        </div>
        <div style={{ fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: -4 }}>
          Comparativo de estratégias — 2024
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", flexShrink: 0 }}>
          <line x1={0} y1={PAD_T + iH} x2={W} y2={PAD_T + iH} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
          {barras.map((b, i) => {
            const bH = (b.valor / maxVal) * iH;
            const x = gap + i * (barW + gap);
            const y = PAD_T + iH - bH;
            const fill = b.destaque ? COR_SECUNDARIA : COR_PRIMARIA;
            const fillOpacity = b.destaque ? 1 : 0.55;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={bH} rx={5} fill={fill} opacity={fillOpacity} />
                <text x={x + barW/2} y={y - 6} textAnchor="middle" fill={b.destaque ? COR_SECUNDARIA : "#fff"} fontSize={b.destaque ? 12 : 10} fontWeight={b.destaque ? 700 : 400}>{b.valor}%</text>
                <text x={x + barW/2} y={PAD_T + iH + 18} textAnchor="middle" fill={b.destaque ? COR_SECUNDARIA : "rgba(255,255,255,0.45)"} fontSize={9} fontWeight={b.destaque ? 600 : 400}>{b.rotulo}</text>
              </g>
            );
          })}
        </svg>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>% ao ano</div>
      </div>
    </Frame>
  );
}

// ── Dados da biblioteca ────────────────────────────────────────────────────────

const COMPONENTES: ComponenteInfo[] = [
  {
    id: "hook",
    nome: "Hook",
    tipo: "Abertura",
    descricao: "Texto de impacto sobre o vídeo para prender atenção nos primeiros segundos. Suporta palavras destacadas com cor primária ou secundária.",
    preview: <PreviewHook />,
  },
  {
    id: "frase_impacto",
    nome: "Frase de Impacto",
    tipo: "Argumento",
    descricao: "Frase central do argumento, com destaque em palavras-chave. Fica posicionada sobre o vídeo com gradiente de legibilidade.",
    preview: <PreviewFraseImpacto />,
  },
  {
    id: "lista_pontos",
    nome: "Lista de Pontos",
    tipo: "Estrutura",
    descricao: "Lista numerada com título e até 5 itens. Ideal para enumerar etapas, pilares ou benefícios de forma visual e organizada.",
    preview: <PreviewListaPontos />,
  },
  {
    id: "mini_caso",
    nome: "Mini Caso",
    tipo: "Prova social",
    descricao: "Card de resultado destacado com borda colorida, exibindo um resultado numérico ou conquista de paciente/cliente.",
    preview: <PreviewMiniCaso />,
  },
  {
    id: "comparativo_numerico",
    nome: "Comparativo Numérico",
    tipo: "Dados",
    descricao: "Dois cards lado a lado comparando métricas. Destaca o resultado superior com a cor do especialista.",
    preview: <PreviewComparativoNumerico />,
  },
  {
    id: "video_citacao",
    nome: "Vídeo Citação",
    tipo: "Autoridade",
    descricao: "Lower-third com nome, cargo e frases-chave do especialista. Entra com stagger animado e borda lateral colorida.",
    preview: <PreviewVideoCitacao />,
  },
  {
    id: "transicao_texto",
    nome: "Transição de Texto",
    tipo: "Transição",
    descricao: "Texto suave de transição entre blocos. Usado para criar ritmo e conduzir o espectador de um argumento ao próximo.",
    preview: <PreviewTransicaoTexto />,
  },
  {
    id: "cta",
    nome: "CTA",
    tipo: "Conversão",
    descricao: "Chamada para ação final com texto principal em destaque, seta animada e texto secundário opcional.",
    preview: <PreviewCTA />,
  },
  {
    id: "convite_evento",
    nome: "Convite / Evento",
    tipo: "Divulgação",
    descricao: "Overlay completo para divulgação de eventos, com logo, nome, descrição, data, local e botão de ação.",
    preview: <PreviewConviteEvento />,
  },
  {
    id: "grafico_linha",
    nome: "Gráfico de Linha",
    tipo: "Dados",
    descricao: "Evolução temporal de uma métrica financeira — patrimônio, rentabilidade acumulada, juros compostos. A linha é desenhada progressivamente durante a cena.",
    preview: <PreviewGraficoLinha />,
  },
  {
    id: "grafico_barra",
    nome: "Gráfico de Barras",
    tipo: "Dados",
    descricao: "Comparativo entre categorias ou cenários — classes de ativos, rentabilidade, benchmarks. Barras crescem com animação staggered; a barra de destaque usa a cor secundária.",
    preview: <PreviewGraficoBarra />,
  },
];

const TIPO_CORES: Record<string, string> = {
  "Abertura":    "#1D5EAE",
  "Argumento":   "#38DCA8",
  "Estrutura":   "#7C3AED",
  "Prova social":"#D97706",
  "Dados":       "#0EA5E9",
  "Autoridade":  "#059669",
  "Transição":   "#64748B",
  "Conversão":   "#DC2626",
  "Divulgação":  "#9333EA",
};

// ── Página ─────────────────────────────────────────────────────────────────────

export default function ComponentesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column" }}>
      <AppNav breadcrumb="Biblioteca de componentes" />

      <div style={{ padding: "32px 40px 60px", maxWidth: 1200, width: "100%" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink)", margin: 0, marginBottom: 8 }}>
            Biblioteca de componentes
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-3)", margin: 0 }}>
            {COMPONENTES.length} cenas disponíveis · os previews são estáticos; na renderização final as animações são aplicadas
          </p>
        </div>

        <div className={styles.grid}>
          {COMPONENTES.map((comp) => (
            <div key={comp.id} className={styles.card}>
              <div className={styles.preview}>
                {comp.preview}
              </div>
              <div className={styles.info}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardNome}>{comp.nome}</span>
                  <span
                    className={styles.badge}
                    style={{ background: `${TIPO_CORES[comp.tipo]}22`, color: TIPO_CORES[comp.tipo] }}
                  >
                    {comp.tipo}
                  </span>
                </div>
                <p className={styles.cardDesc}>{comp.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
