"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ActionButton } from "@/components/ActionButton";
import type { Job, Cena } from "@/types";
import type { ReelProps } from "@pontob/schema";
import styles from "./EditorView.module.css";

// Player carregado sem SSR — usa APIs de browser
const ReelPlayer = dynamic(
  () => import("./ReelPlayer").then((m) => m.ReelPlayer),
  { ssr: false, loading: () => <div className={styles.playerLoading}>Carregando player...</div> }
);

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  Hook: "Hook",
  FraseImpacto: "Frase de Impacto",
  ComparativoNumerico: "Comparativo",
  VideoCitacao: "Vídeo + Citação",
  ListaPontos: "Lista de Pontos",
  MiniCaso: "Mini Caso",
  TransicaoTexto: "Transição",
  CTA: "CTA",
  ConviteEvento: "Convite / Evento",
  GraficoLinha: "Gráfico de Linha",
  GraficoBarra: "Gráfico de Barras",
};

const TIPO_COLORS: Record<string, string> = {
  Hook: "var(--c-hook)",
  FraseImpacto: "var(--c-frase)",
  ComparativoNumerico: "var(--c-comparativo)",
  VideoCitacao: "var(--c-citacao)",
  ListaPontos: "var(--c-lista)",
  MiniCaso: "var(--c-caso)",
  TransicaoTexto: "var(--c-transicao)",
  CTA: "var(--c-cta)",
  ConviteEvento: "var(--c-evento)",
  GraficoLinha: "var(--c-comparativo)",
  GraficoBarra: "var(--c-comparativo)",
};

const FPS = 30;

type RenderProgress = { frames: number; total: number; eta: string };

function getPreview(cena: Cena): string {
  const c = cena as Record<string, unknown>;
  return String(
    c.titulo ?? c.nome_evento ?? c.texto ?? c.texto_principal ?? c.resultado_texto ?? ""
  ).slice(0, 50);
}

// ── EditorView ────────────────────────────────────────────────────────────────

interface EditorViewProps {
  job: Job;
  onNew: () => void;
}

export function EditorView({ job, onNew }: EditorViewProps) {
  const [scenes, setScenes] = useState<Cena[]>(job.scenes?.cenas ?? []);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null); // só vai pra SuccessScreen após render na sessão atual
  const [renderError, setRenderError] = useState<string | null>(null);
  const previousOutput = job.outputPath; // render anterior — mostra botão de download no editor

  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refineToast, setRefineToast] = useState<string | null>(null);

  const totalSec = scenes.reduce((acc, c) => acc + c.duracao_segundos, 0);

  // Frame inicial do player quando a cena selecionada muda
  const initialFrame = useMemo(() => {
    if (selectedIdx === null) return 0;
    let acc = 0;
    for (let i = 0; i < selectedIdx; i++) {
      acc += scenes[i]?.duracao_segundos ?? 0;
    }
    return Math.round(acc * FPS);
  }, [selectedIdx, scenes]);

  // Props para o player — substitui o caminho de arquivo pelo endpoint HTTP
  // para que o <Video> do browser consiga carregar o vídeo.
  const reelProps: ReelProps = useMemo(() => {
    const videoUrl = `/api/jobs/${job.id}/video`;
    const cenasComUrl = scenes.map((c) => {
      const cc = c as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      if ("video_path" in cc) updates.video_path = videoUrl;
      return Object.keys(updates).length ? { ...c, ...updates } : c;
    });
    return {
      duracao_total_estimada: totalSec,
      video_original_path: videoUrl,
      cenas: cenasComUrl as typeof scenes,
      cor_primaria: job.scenes?.cor_primaria,
      cor_secundaria: job.scenes?.cor_secundaria,
      fonte_url: job.scenes?.fonte_url,
      fonte_familia: job.scenes?.fonte_familia,
    };
  }, [scenes, totalSec, job.id]);

  async function handleRender() {
    setRendering(true);
    setRenderProgress(null);
    setRenderError(null);

    try {
      // Salva as cenas editadas antes de renderizar — recalcula duracao_total_estimada
      const duracaoAtual = scenes.reduce((acc, s) => acc + s.duracao_segundos, 0);
      const saveRes = await fetch(`/api/jobs/${job.id}/scenes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...job.scenes,
          cenas: scenes,
          duracao_total_estimada: parseFloat(duracaoAtual.toFixed(2)),
        }),
      });
      if (!saveRes.ok) {
        let errMsg = `Erro ao salvar cenas (${saveRes.status})`;
        try { const e = await saveRes.json(); errMsg = e.error ?? errMsg; } catch { /* corpo não é JSON */ }
        throw new Error(errMsg);
      }

      const res = await fetch(`/api/jobs/${job.id}/render`, { method: "POST" });
      if (!res.ok || !res.body) {
        let errMsg = `Erro na renderização (${res.status})`;
        try { const d = await res.json(); errMsg = d.error ?? errMsg; } catch { /* corpo não é JSON */ }
        throw new Error(errMsg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.replace(/^data:\s*/m, "").trim();
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "progress") setRenderProgress({ frames: msg.frames, total: msg.total, eta: msg.eta });
            else if (msg.type === "done") { setOutputPath(msg.outputPath); setRendering(false); return; }
            else if (msg.type === "error") throw new Error(msg.message);
          } catch { /* linha incompleta */ }
        }
      }
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : String(err));
      setRendering(false);
    }
  }

  async function handleRefine() {
    setRefining(true);
    setRefineError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000); // 3 min
      let res: Response;
      try {
        res = await fetch(`/api/jobs/${job.id}/refine`, { method: "POST", signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) {
        let errMsg = `Erro no refinamento (${res.status})`;
        try {
          const data = await res.json();
          errMsg = data.error ?? errMsg;
          if (data.detalhe) errMsg += `\n${data.detalhe}`;
        } catch { /* corpo não é JSON — mantém mensagem genérica */ }
        throw new Error(errMsg);
      }
      const data = await res.json();
      const novasCenas: Cena[] = data.scenes.cenas;
      setScenes(novasCenas);
      setSelectedIdx(0);
      setRefineToast(`✦ Sequência refinada — ${novasCenas.length} cenas`);
      setTimeout(() => setRefineToast(null), 4000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setRefineError("Tempo limite excedido (3 min). Tente novamente.");
      } else {
        setRefineError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRefining(false);
    }
  }

  if (rendering) return <RenderingScreen progress={renderProgress} />;
  if (refining) return <RefiningScreen />;
  if (outputPath) return <SuccessScreen jobId={job.id} outputPath={outputPath} onNew={onNew} />;

  const selected = selectedIdx !== null ? scenes[selectedIdx] : null;

  return (
    <main className={styles.root}>

      {/* Topbar */}
      <AppNav breadcrumb={job.fileName}>
        <div className={styles.topbarMeta}>{scenes.length} cenas · {Math.round(totalSec)}s</div>
        <Link href="/" className={styles.btnGhost}>Novo</Link>
        {previousOutput && (
          <a
            href={`/api/jobs/${job.id}/download`}
            download="reel.mp4"
            className={styles.btnGhost}
          >
            ↓ Baixar
          </a>
        )}
        <ActionButton onClick={handleRefine} icon="✦">Refinar com IA</ActionButton>
        <ActionButton onClick={handleRender} icon="⚡">Renderizar</ActionButton>
      </AppNav>

      {renderError && <div className={styles.errorBanner}>⚠ {renderError}</div>}
      {refineError && <div className={styles.errorBanner}>⚠ {refineError}</div>}
      {refineToast && <div className={styles.refineToast}>{refineToast}</div>}

      {/* Body: 3 colunas */}
      <div className={styles.body}>

        {/* Col 1 — lista de cenas */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>Sequência · {Math.round(totalSec)}s</div>
          {scenes.map((cena, i) => {
            const cor = TIPO_COLORS[cena.tipo] ?? "var(--c-transicao)";
            const label = TIPO_LABELS[cena.tipo] ?? cena.tipo;
            const active = selectedIdx === i;
            const pct = totalSec > 0 ? (cena.duracao_segundos / totalSec) * 100 : 0;
            return (
              <div
                key={i}
                className={`${styles.sceneItem} ${active ? styles.active : ""}`}
                onClick={() => setSelectedIdx(i)}
              >
                <div className={styles.sceneAccent} style={{ background: active ? cor : "transparent" }} />
                <div className={styles.sceneContent}>
                  <div className={styles.sceneRow}>
                    <div className={styles.sceneDot} style={{ background: cor }} />
                    <span className={styles.sceneLabel}>{label}</span>
                    <span className={styles.sceneSpacer} />
                    <span className={styles.sceneDuration}>{cena.duracao_segundos}s</span>
                    <span className={styles.sceneIndex}>#{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className={styles.sceneBar}>
                    <div className={styles.sceneBarFill} style={{ width: `${pct}%`, background: cor }} />
                  </div>
                  {getPreview(cena) && <div className={styles.scenePreview}>{getPreview(cena)}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Col 2 — player */}
        <div className={styles.playerCol}>
          <div className={styles.playerWrap}>
            <ReelPlayer props={reelProps} initialFrame={initialFrame} />
          </div>
          <div className={styles.playerHint}>
            Clique numa cena para pular · Edite à direita e o preview atualiza
          </div>
        </div>

        {/* Col 3 — painel de edição */}
        <div className={styles.detailCol}>
          {selected ? (
            <SceneDetail
              cena={selected}
              index={selectedIdx!}
              startAcumulado={scenes.slice(0, selectedIdx!).reduce((acc, s) => acc + s.duracao_segundos, 0)}
              especialistaSlug={job.especialista_slug}
              corPrimariaEspecialista={job.scenes?.cor_primaria}
              corSecundariaEspecialista={job.scenes?.cor_secundaria}
              onChange={(updated) => {
                const next = [...scenes];
                next[selectedIdx!] = updated;
                setScenes(next);
              }}
              onDelete={() => {
                const next = scenes.filter((_, i) => i !== selectedIdx);
                setScenes(next);
                setSelectedIdx(Math.min(selectedIdx!, next.length - 1));
              }}
              onMoveUp={() => {
                if (selectedIdx! <= 0) return;
                const next = [...scenes];
                [next[selectedIdx! - 1], next[selectedIdx!]] = [next[selectedIdx!], next[selectedIdx! - 1]];
                setScenes(next);
                setSelectedIdx(selectedIdx! - 1);
              }}
              onMoveDown={() => {
                if (selectedIdx! >= scenes.length - 1) return;
                const next = [...scenes];
                [next[selectedIdx!], next[selectedIdx! + 1]] = [next[selectedIdx! + 1], next[selectedIdx!]];
                setScenes(next);
                setSelectedIdx(selectedIdx! + 1);
              }}
            />
          ) : (
            <div className={styles.detailEmpty}>Selecione uma cena para editar</div>
          )}
        </div>

      </div>
    </main>
  );
}

// ── RenderingScreen ───────────────────────────────────────────────────────────

function RenderingScreen({ progress }: { progress: RenderProgress | null }) {
  const pct = progress && progress.total > 0
    ? Math.round((progress.frames / progress.total) * 100) : 0;

  return (
    <main className={styles.renderScreen}>
      <div className={styles.renderCard}>
        <div className={styles.renderHeading}>
          <h2 className={styles.renderTitle}>Renderizando</h2>
          <p className={styles.renderSubtitle}>O Remotion está gerando o reel. Não feche esta janela.</p>
        </div>
        <div className={styles.renderBox}>
          {progress && progress.total > 0 ? (
            <>
              <div className={styles.renderFrameRow}>
                <div>
                  <span className={styles.renderFrames}>{progress.frames}</span>
                  <span className={styles.renderTotal}> / {progress.total} frames</span>
                </div>
                {progress.eta && <span className={styles.renderEta}>{progress.eta} restante</span>}
              </div>
              <div className={styles.renderProgressTrack}>
                <div className={styles.renderProgressBar} style={{ width: `${pct}%` }} />
              </div>
              <div className={styles.renderProgressPct}>{pct}%</div>
            </>
          ) : (
            <div className={styles.renderWaiting}>
              <div className={styles.renderPulseDot} />
              Iniciando renderização...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ── RefiningScreen ────────────────────────────────────────────────────────────

function RefiningScreen() {
  return (
    <main className={styles.renderScreen}>
      <div className={styles.renderCard}>
        <div className={styles.renderHeading}>
          <h2 className={styles.renderTitle}>Refinando com IA</h2>
          <p className={styles.renderSubtitle}>
            O Claude está analisando a transcrição e as cenas atuais para gerar uma versão melhorada.
          </p>
        </div>
        <div className={styles.renderBox}>
          <div className={styles.renderWaiting}>
            <div className={styles.renderPulseDot} />
            Processando...
          </div>
        </div>
      </div>
    </main>
  );
}

// ── SuccessScreen ─────────────────────────────────────────────────────────────

function SuccessScreen({ jobId, outputPath, onNew }: { jobId: string; outputPath: string; onNew: () => void }) {
  const [cleanup, setCleanup] = useState(true);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = `/api/jobs/${jobId}/download`;
      a.download = "reel.mp4";
      a.click();
      if (cleanup) {
        await new Promise((r) => setTimeout(r, 1500));
        await fetch(`/api/jobs/${jobId}/cleanup`, { method: "DELETE" });
      }
    } finally {
      setDownloading(false);
      if (cleanup) onNew();
    }
  }

  return (
    <main className={styles.successScreen}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Reel gerado</h2>
        <p className={styles.successSubtitle}>O vídeo foi renderizado com sucesso.</p>
        <div className={styles.successPathBox}>
          <div className={styles.successPathLabel}>Arquivo</div>
          <code className={styles.successPath}>{outputPath}</code>
        </div>
        <label className={styles.cleanupRow}>
          <input type="checkbox" checked={cleanup} onChange={(e) => setCleanup(e.target.checked)} />
          <div className={styles.cleanupLabel}>
            Limpar arquivos temporários após baixar
            <span>Remove vídeo original, transcrição e JSONs. Mantém apenas o reel.</span>
          </div>
        </label>
        <div className={styles.successActions}>
          <ActionButton onClick={handleDownload} disabled={downloading} icon="↓">
            {downloading ? "Baixando..." : "Baixar vídeo"}
          </ActionButton>
          <Link href="/" className={styles.btnSecondary}>Novo vídeo</Link>
        </div>
      </div>
    </main>
  );
}

// ── SceneDetail ───────────────────────────────────────────────────────────────

function SceneDetail({
  cena, index, startAcumulado, especialistaSlug, corPrimariaEspecialista, corSecundariaEspecialista, onChange, onDelete, onMoveUp, onMoveDown,
}: {
  cena: Cena;
  index: number;
  startAcumulado: number;
  especialistaSlug?: string;
  corPrimariaEspecialista?: string;
  corSecundariaEspecialista?: string;
  onChange: (c: Cena) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const c = cena as Record<string, unknown>;
  const cor = TIPO_COLORS[cena.tipo] ?? "var(--c-transicao)";
  const label = TIPO_LABELS[cena.tipo] ?? cena.tipo;
  const [logos, setLogos] = useState<{ filename: string; url: string }[]>([]);

  useEffect(() => {
    if (cena.tipo === "ConviteEvento" && especialistaSlug) {
      fetch(`/api/especialistas/${especialistaSlug}/logos`)
        .then((r) => r.ok ? r.json() : [])
        .then(setLogos)
        .catch(() => setLogos([]));
    }
  }, [cena.tipo, especialistaSlug]);

  function textField(key: string, multiline = false) {
    if (!(key in c) || c[key] === undefined) return null;
    return (
      <div key={key} className={styles.field}>
        <label className={styles.fieldLabel}>{key}</label>
        {multiline ? (
          <textarea className={styles.input} value={String(c[key])} rows={3}
            onChange={(e) => onChange({ ...cena, [key]: e.target.value } as Cena)} />
        ) : (
          <input className={styles.input} type="text" value={String(c[key])}
            onChange={(e) => onChange({ ...cena, [key]: e.target.value } as Cena)} />
        )}
      </div>
    );
  }

  function numberField(key: string, label?: string, step = 0.5) {
    if (!(key in c)) return null;
    return (
      <div key={key} className={styles.field}>
        <label className={styles.fieldLabel}>{label ?? key}</label>
        <input className={styles.input} type="number" step={step} value={Number(c[key])}
          onChange={(e) => onChange({ ...cena, [key]: Number(e.target.value) } as Cena)} />
      </div>
    );
  }

  function listField(key: string, label: string) {
    if (!(key in c)) return null;
    return (
      <div key={key} className={styles.field}>
        <label className={styles.fieldLabel}>{label}</label>
        <textarea className={styles.input} rows={4}
          value={(c[key] as string[]).join("\n")}
          onChange={(e) => onChange({ ...cena, [key]: e.target.value.split("\n").filter(Boolean) } as Cena)} />
      </div>
    );
  }

  function jsonField(key: string) {
    if (!(key in c)) return null;
    return (
      <div key={key} className={styles.field}>
        <label className={styles.fieldLabel}>{key} (JSON)</label>
        <textarea className={`${styles.input} ${styles.inputMono}`} rows={6}
          value={JSON.stringify(c[key], null, 2)}
          onChange={(e) => {
            try { onChange({ ...cena, [key]: JSON.parse(e.target.value) } as Cena); } catch { }
          }} />
      </div>
    );
  }

  // Migra a cena para outro tipo, preservando campos comuns
  function migrarTipo(novoTipo: string) {
    if (novoTipo === cena.tipo) return;
    const dur = c["duracao_segundos"] ?? 8;
    const videoPath = c["video_path"] ?? undefined;
    const startSeg = c["start_segundos"] ?? undefined;

    // Campos que fazem sentido em qualquer tipo
    const base: Record<string, unknown> = { tipo: novoTipo, duracao_segundos: dur };

    // Herda video_path e start_segundos se o novo tipo usa vídeo
    const tiposComVideo = ["Hook", "VideoCitacao", "MiniCaso"];
    if (tiposComVideo.includes(novoTipo) && videoPath) {
      base["video_path"] = videoPath;
      if (startSeg !== undefined) base["start_segundos"] = startSeg;
    }

    // Herda título se disponível e novo tipo o usa
    const tiposComTitulo = ["Hook", "FraseImpacto", "ListaPontos", "GraficoBarra", "GraficoLinha", "ConviteEvento"];
    if (tiposComTitulo.includes(novoTipo) && c["titulo"]) base["titulo"] = c["titulo"];

    // Scaffolds mínimos por tipo de destino
    switch (novoTipo) {
      case "Hook":
        base["titulo"] = base["titulo"] ?? "TÍTULO DO HOOK";
        base["palavras_destacadas"] = [];
        base["animacao_entrada"] = "spring";
        break;
      case "FraseImpacto":
        base["texto"] = String(c["titulo"] ?? c["texto"] ?? "Frase de impacto aqui");
        base["palavras_destacadas"] = [];
        base["alinhamento"] = "centro";
        base["fundo"] = "navy";
        break;
      case "ComparativoNumerico":
        base["metrica_nome"] = String(c["titulo"] ?? "Métrica");
        base["metrica_unidade"] = "";
        base["lados"] = [
          { valor: "A", rotulo: "Opção A", eh_destaque: false },
          { valor: "B", rotulo: "Opção B", eh_destaque: true },
        ];
        base["visualizacao"] = "numeros_grandes";
        break;
      case "GraficoBarra":
        base["titulo"] = base["titulo"] ?? String(c["metrica_nome"] ?? "Comparativo");
        base["barras"] = [
          { rotulo: "A", valor: 1, valor_display: "1", eh_destaque: false },
          { rotulo: "B", valor: 1.5, valor_display: "1,5", eh_destaque: false },
          { rotulo: "C", valor: 2, valor_display: "2", eh_destaque: true },
        ];
        break;
      case "GraficoLinha":
        base["titulo"] = base["titulo"] ?? "Evolução";
        base["pontos"] = [
          { rotulo: "Jan", valor: 1 },
          { rotulo: "Fev", valor: 2 },
          { rotulo: "Mar", valor: 3 },
        ];
        base["unidade"] = "";
        break;
      case "VideoCitacao":
        base["frases"] = Array.isArray(c["frases"]) ? c["frases"] : ["Frase do mentor aqui"];
        base["nome_mentor"] = c["nome_mentor"] ?? "";
        base["cargo_mentor"] = c["cargo_mentor"] ?? "";
        base["estilo_lower_third"] = "barra_inferior";
        break;
      case "ListaPontos":
        base["pontos"] = Array.isArray(c["pontos"]) ? c["pontos"] : ["Ponto 1", "Ponto 2", "Ponto 3"];
        base["numerado"] = false;
        base["fundo"] = "navy";
        break;
            case "MiniCaso":
        base["resultado_texto"] = String(c["titulo"] ?? "Resultado aqui");
        base["contexto_texto"] = "";
        base["palavras_destacadas"] = [];
        break;
      case "TransicaoTexto":
        base["texto"] = String(c["titulo"] ?? c["texto"] ?? "Mas existe outro caminho");
        base["fundo"] = "navy";
        base["duracao_segundos"] = Math.min(Number(dur), 4);
        break;
      case "ConviteEvento":
        base["nome_evento"] = String(c["titulo"] ?? "Nome do Evento");
        base["descricao"] = "";
        base["bullets"] = ["Benefício 1", "Benefício 2"];
        base["fundo"] = "navy";
        break;
      case "CTA":
        base["texto_principal"] = String(c["texto_principal"] ?? c["titulo"] ?? "Comente aqui embaixo");
        base["texto_secundario"] = "";
        base["mostrar_seta"] = true;
        base["cor_seta"] = "secundaria";
        base["palavras_destacadas"] = [];
        break;
    }

    onChange(base as unknown as Cena);
  }

  return (
    <div className={styles.sceneDetail}>
      {/* Header da cena */}
      <div className={styles.sceneDetailHeader}>
        <div className={styles.sceneDetailDot} style={{ background: cor }} />
        <h2 className={styles.sceneDetailTitle}>{label}</h2>
        <span className={styles.sceneDetailIndex}>#{String(index + 1).padStart(2, "0")}</span>
        <div className={styles.sceneDetailActions}>
          <button className={styles.btnSceneAction} onClick={onMoveUp} title="Mover para cima">↑</button>
          <button className={styles.btnSceneAction} onClick={onMoveDown} title="Mover para baixo">↓</button>
          <button className={`${styles.btnSceneAction} ${styles.btnSceneDelete}`} onClick={onDelete} title="Excluir cena">✕</button>
        </div>
      </div>

      {/* Seletor de tipo */}
      <div className={styles.field} style={{ marginBottom: 0 }}>
        <label className={styles.fieldLabel}>Tipo de cena</label>
        <select
          className={styles.input}
          value={cena.tipo}
          style={{ appearance: "none", cursor: "pointer", borderLeft: `3px solid ${cor}` }}
          onChange={(e) => migrarTipo(e.target.value)}
        >
          {Object.entries(TIPO_LABELS).map(([tipo, tipoLabel]) => (
            <option key={tipo} value={tipo}>{tipoLabel}</option>
          ))}
        </select>
      </div>

      {/* Timing */}
      <div className={styles.timingGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Início no vídeo (s)
            {"start_segundos" in c
              ? null
              : <span style={{ fontWeight: 400, color: "var(--ink-3)", marginLeft: 4 }}>· auto</span>}
          </label>
          <input
            className={styles.input}
            type="number"
            step={0.1}
            min={0}
            value={"start_segundos" in c ? Number(c["start_segundos"]) : parseFloat(startAcumulado.toFixed(1))}
            onChange={(e) => onChange({ ...cena, start_segundos: Number(e.target.value) } as Cena)}
            style={"start_segundos" in c ? {} : { opacity: 0.6 }}
            title={"start_segundos" in c ? undefined : `Calculado automaticamente pela soma das cenas anteriores (${startAcumulado.toFixed(1)}s)`}
          />
        </div>
        {numberField("duracao_segundos", "Duração (s)", 0.5)}
      </div>

      {/* Campos de conteúdo */}
      {textField("titulo", true)}
      {textField("subtitulo")}
      {textField("nome_evento")}
      {cena.tipo === "ConviteEvento" ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Logo do evento</label>
          {logos.length > 0 ? (
            <div className={styles.logoSelectorGrid}>
              <div
                className={`${styles.logoSelectorItem} ${!c["logo_url"] ? styles.logoSelectorActive : ""}`}
                onClick={() => onChange({ ...cena, logo_url: undefined } as Cena)}
              >
                <span className={styles.logoSelectorNone}>Sem logo</span>
              </div>
              {logos.map((logo) => (
                <div
                  key={logo.filename}
                  className={`${styles.logoSelectorItem} ${c["logo_url"] === logo.url ? styles.logoSelectorActive : ""}`}
                  onClick={() => onChange({ ...cena, logo_url: logo.url } as Cena)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.url} alt={logo.filename} className={styles.logoSelectorThumb} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.inputHint}>
              Nenhuma logo cadastrada para este especialista.
              <a href="/especialistas" target="_blank" style={{ color: "var(--accent)", marginLeft: 4 }}>Cadastrar →</a>
            </div>
          )}
          <input className={styles.input} type="text" placeholder="Ou cole uma URL diretamente..."
            value={String(c["logo_url"] ?? "")} style={{ marginTop: 8 }}
            onChange={(e) => onChange({ ...cena, logo_url: e.target.value || undefined } as Cena)} />
        </div>
      ) : null}
      {cena.tipo === "ConviteEvento" && !!c["logo_url"] ? (
        <div className={styles.timingGroup}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Altura (px)</label>
            <input className={styles.input} type="number" min={24} max={1080} step={4}
              value={Number(c["logo_altura"] ?? 80)}
              onChange={(e) => onChange({ ...cena, logo_altura: Number(e.target.value) } as Cena)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Posição</label>
            <select className={styles.input}
              value={String(c["logo_posicao"] ?? "topo")}
              onChange={(e) => onChange({ ...cena, logo_posicao: e.target.value as "topo" | "centro" | "rodape" } as Cena)}
              style={{ appearance: "none", cursor: "pointer" }}>
              <option value="topo">Topo</option>
              <option value="centro">Centro</option>
              <option value="rodape">Rodapé</option>
            </select>
          </div>
        </div>
      ) : null}
      {textField("descricao")}
      {textField("texto", true)}
      {textField("texto_principal", true)}
      {textField("texto_secundario")}
      {textField("resultado_texto", true)}
      {textField("contexto_texto")}
      {textField("metrica_nome")}
      {textField("nome_mentor")}
      {textField("cargo_mentor")}

      {/* Editor estruturado de lados (ComparativoNumerico) */}
      {cena.tipo === "ComparativoNumerico" && Array.isArray((c as Record<string,unknown>)["lados"]) ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Lados</label>
          {((c as Record<string,unknown>)["lados"] as Array<Record<string,unknown>>).map((lado, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <input className={styles.input} type="text" style={{ flex: 2 }}
                placeholder="Valor"
                value={String(lado["valor"] ?? "")}
                onChange={(e) => {
                  const lados = [...((c as Record<string,unknown>)["lados"] as Array<Record<string,unknown>>)];
                  lados[i] = { ...lados[i], valor: e.target.value };
                  onChange({ ...cena, lados } as Cena);
                }} />
              <input className={styles.input} type="text" style={{ flex: 2 }}
                placeholder="Rótulo"
                value={String(lado["rotulo"] ?? "")}
                onChange={(e) => {
                  const lados = [...((c as Record<string,unknown>)["lados"] as Array<Record<string,unknown>>)];
                  lados[i] = { ...lados[i], rotulo: e.target.value };
                  onChange({ ...cena, lados } as Cena);
                }} />
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={!!lado["eh_destaque"]}
                  onChange={(e) => {
                    const lados = [...((c as Record<string,unknown>)["lados"] as Array<Record<string,unknown>>)];
                    lados[i] = { ...lados[i], eh_destaque: e.target.checked };
                    onChange({ ...cena, lados } as Cena);
                  }} />
                destaque
              </label>
            </div>
          ))}
        </div>
      ) : null}

      {/* Editor estruturado de barras (GraficoBarra) */}
      {cena.tipo === "GraficoBarra" && Array.isArray((c as Record<string,unknown>)["barras"]) ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Barras</label>
          {((c as Record<string,unknown>)["barras"] as Array<Record<string,unknown>>).map((barra, i) => {
            const barras = (c as Record<string,unknown>)["barras"] as Array<Record<string,unknown>>;
            return (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input className={styles.input} type="text" style={{ flex: 2 }}
                  placeholder="Rótulo"
                  value={String(barra["rotulo"] ?? "")}
                  onChange={(e) => {
                    const next = [...barras];
                    next[i] = { ...next[i], rotulo: e.target.value };
                    onChange({ ...cena, barras: next } as Cena);
                  }} />
                <input className={styles.input} type="number" step={0.1} style={{ flex: 1 }}
                  placeholder="Valor"
                  title="Valor numérico (define altura da barra)"
                  value={Number(barra["valor"] ?? 0)}
                  onChange={(e) => {
                    const next = [...barras];
                    next[i] = { ...next[i], valor: Number(e.target.value) };
                    onChange({ ...cena, barras: next } as Cena);
                  }} />
                <input className={styles.input} type="text" style={{ flex: 1.5 }}
                  placeholder="Display (ex: 0,8%–1,2%)"
                  title="Texto exibido na barra"
                  value={String(barra["valor_display"] ?? "")}
                  onChange={(e) => {
                    const next = [...barras];
                    next[i] = { ...next[i], valor_display: e.target.value || undefined };
                    onChange({ ...cena, barras: next } as Cena);
                  }} />
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={!!barra["eh_destaque"]}
                    onChange={(e) => {
                      const next = [...barras];
                      next[i] = { ...next[i], eh_destaque: e.target.checked };
                      onChange({ ...cena, barras: next } as Cena);
                    }} />
                  destaque
                </label>
                <button
                  title="Remover barra"
                  style={{ flexShrink: 0, background: "none", border: "1px solid var(--b-mid)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", padding: "2px 7px", fontSize: 14, lineHeight: 1 }}
                  onClick={() => {
                    if (barras.length <= 2) return;
                    const next = barras.filter((_, j) => j !== i);
                    onChange({ ...cena, barras: next } as Cena);
                  }}
                >−</button>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Valor numérico = altura da barra · Display = texto visível</div>
            <button
              style={{ background: "var(--accent)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "4px 12px", fontSize: 12, fontWeight: 600 }}
              onClick={() => {
                const barras = (c as Record<string,unknown>)["barras"] as Array<Record<string,unknown>>;
                if (barras.length >= 6) return;
                const next = [...barras, { rotulo: `Barra ${barras.length + 1}`, valor: 1, valor_display: "1", eh_destaque: false }];
                onChange({ ...cena, barras: next } as Cena);
              }}
            >+ Barra</button>
          </div>
        </div>
      ) : null}

      {/* Editor estruturado de pontos (GraficoLinha) */}
      {cena.tipo === "GraficoLinha" && Array.isArray((c as Record<string,unknown>)["pontos"]) ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Pontos</label>
          {((c as Record<string,unknown>)["pontos"] as Array<Record<string,unknown>>).map((ponto, i) => {
            const pontos = (c as Record<string,unknown>)["pontos"] as Array<Record<string,unknown>>;
            return (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input className={styles.input} type="text" style={{ flex: 2 }}
                  placeholder="Rótulo (ex: Jan, 2023)"
                  value={String(ponto["rotulo"] ?? "")}
                  onChange={(e) => {
                    const next = [...pontos];
                    next[i] = { ...next[i], rotulo: e.target.value };
                    onChange({ ...cena, pontos: next } as Cena);
                  }} />
                <input className={styles.input} type="number" step={0.1} style={{ flex: 1 }}
                  placeholder="Valor"
                  value={Number(ponto["valor"] ?? 0)}
                  onChange={(e) => {
                    const next = [...pontos];
                    next[i] = { ...next[i], valor: Number(e.target.value) };
                    onChange({ ...cena, pontos: next } as Cena);
                  }} />
                <button
                  title="Remover ponto"
                  style={{ flexShrink: 0, background: "none", border: "1px solid var(--b-mid)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", padding: "2px 7px", fontSize: 14, lineHeight: 1 }}
                  onClick={() => {
                    if (pontos.length <= 2) return;
                    const next = pontos.filter((_, j) => j !== i);
                    onChange({ ...cena, pontos: next } as Cena);
                  }}
                >−</button>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Unidade: {String((c as Record<string,unknown>)["unidade"] ?? "—")}</div>
            <button
              style={{ background: "var(--accent)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "4px 12px", fontSize: 12, fontWeight: 600 }}
              onClick={() => {
                const pontos = (c as Record<string,unknown>)["pontos"] as Array<Record<string,unknown>>;
                if (pontos.length >= 12) return;
                const next = [...pontos, { rotulo: `P${pontos.length + 1}`, valor: 1 }];
                onChange({ ...cena, pontos: next } as Cena);
              }}
            >+ Ponto</button>
          </div>
        </div>
      ) : null}

      {/* pontos: só para ListaPontos */}
      {cena.tipo === "ListaPontos" ? listField("pontos", "Pontos (um por linha)") : null}
      {listField("bullets", "Bullets (um por linha)")}
      {listField("frases", "Frases (uma por linha)")}

      {/* Editor de palavras destacadas — Hook, FraseImpacto, MiniCaso, CTA */}
      {(cena.tipo === "Hook" || cena.tipo === "FraseImpacto" || cena.tipo === "MiniCaso" || cena.tipo === "CTA") ? (() => {
        const palavras = (Array.isArray(c["palavras_destacadas"]) ? c["palavras_destacadas"] : []) as Array<{ palavra: string; cor: string }>;
        return (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Palavras em destaque</label>
            {palavras.map((pw, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input
                  className={styles.input}
                  type="text"
                  style={{ flex: 3 }}
                  placeholder="palavra ou frase composta (ex: 20 MIL)"
                  value={pw.palavra}
                  onChange={(e) => {
                    const next = [...palavras];
                    next[i] = { ...next[i], palavra: e.target.value };
                    onChange({ ...cena, palavras_destacadas: next } as Cena);
                  }}
                />
                <input
                  type="color"
                  style={{ width: 36, height: 32, padding: 2, background: "var(--surface-raised)", border: "1px solid var(--b-mid)", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
                  value={pw.cor.startsWith("#") ? pw.cor : (corPrimariaEspecialista ?? "#E63946")}
                  onChange={(e) => {
                    const next = [...palavras];
                    next[i] = { ...next[i], cor: e.target.value };
                    onChange({ ...cena, palavras_destacadas: next } as Cena);
                  }}
                />
                <button
                  title="Remover destaque"
                  style={{ flexShrink: 0, background: "none", border: "1px solid var(--b-mid)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", padding: "2px 7px", fontSize: 14, lineHeight: 1 }}
                  onClick={() => {
                    const next = palavras.filter((_, j) => j !== i);
                    onChange({ ...cena, palavras_destacadas: next } as Cena);
                  }}
                >−</button>
              </div>
            ))}
            {palavras.length < 3 ? (
              <button
                style={{ background: "var(--accent)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "4px 12px", fontSize: 12, fontWeight: 600, marginTop: 4 }}
                onClick={() => {
                  const next = [...palavras, { palavra: "", cor: corPrimariaEspecialista ?? "#E63946" }];
                  onChange({ ...cena, palavras_destacadas: next } as Cena);
                }}
              >+ Destaque</button>
            ) : null}
          </div>
        );
      })() : null}

      {/* Cor de destaque — ComparativoNumerico */}
      {cena.tipo === "ComparativoNumerico" ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Cor do lado em destaque</label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="color"
              style={{ width: 36, height: 32, padding: 2, background: "var(--surface-raised)", border: "1px solid var(--b-mid)", borderRadius: 6, cursor: "pointer" }}
              value={String(c["cor_destaque"] ?? corPrimariaEspecialista ?? "#E63946")}
              onChange={(e) => onChange({ ...cena, cor_destaque: e.target.value } as Cena)} />
            <input className={styles.input} type="text" style={{ flex: 1, fontFamily: "monospace" }}
              value={String(c["cor_destaque"] ?? "")}
              placeholder={corPrimariaEspecialista ?? "padrão do especialista"}
              onChange={(e) => onChange({ ...cena, cor_destaque: e.target.value || undefined } as Cena)} />
          </div>
        </div>
      ) : null}

      {/* Campos de cor por cena — GraficoLinha e GraficoBarra */}
      {(cena.tipo === "GraficoLinha" || cena.tipo === "GraficoBarra") ? (
        <div className={styles.timingGroup}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Cor primária</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="color"
                style={{ width: 36, height: 32, padding: 2, background: "var(--surface-raised)", border: "1px solid var(--b-mid)", borderRadius: 6, cursor: "pointer" }}
                value={String(c["cor_primaria"] ?? corPrimariaEspecialista ?? "#2b3dbf")}
                onChange={(e) => onChange({ ...cena, cor_primaria: e.target.value } as Cena)} />
              <input className={styles.input} type="text" style={{ flex: 1, fontFamily: "monospace" }}
                value={String(c["cor_primaria"] ?? "")}
                placeholder={corPrimariaEspecialista ?? "padrão do especialista"}
                onChange={(e) => onChange({ ...cena, cor_primaria: e.target.value || undefined } as Cena)} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Cor secundária</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="color"
                style={{ width: 36, height: 32, padding: 2, background: "var(--surface-raised)", border: "1px solid var(--b-mid)", borderRadius: 6, cursor: "pointer" }}
                value={String(c["cor_secundaria"] ?? corSecundariaEspecialista ?? "#F4C430")}
                onChange={(e) => onChange({ ...cena, cor_secundaria: e.target.value } as Cena)} />
              <input className={styles.input} type="text" style={{ flex: 1, fontFamily: "monospace" }}
                value={String(c["cor_secundaria"] ?? "")}
                placeholder={corSecundariaEspecialista ?? "padrão do especialista"}
                onChange={(e) => onChange({ ...cena, cor_secundaria: e.target.value || undefined } as Cena)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
