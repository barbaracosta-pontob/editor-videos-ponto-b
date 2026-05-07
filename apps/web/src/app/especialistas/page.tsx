"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ActionButton } from "@/components/ActionButton";
import styles from "./page.module.css";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Especialista = {
  slug: string;
  nome: string;
  cargo: string;
  nicho: string;
  cor_primaria: string;
  cor_secundaria: string;
  posicionamento_texto: "topo" | "rodape" | "centro";
  estilo_destaque: "primaria" | "secundaria" | "branco";
  brief_padrao: string;
  fonte_url?: string;
  fonte_familia?: string;
  publico_alvo?: string;
  tom_de_voz?: string;
  cta_formato?: string;
  cta_palavra?: string;
  cta_texto_secundario?: string;
  vocabulario?: string;
  palavras_proibidas?: string;
  metricas?: string;
};

type FormState = Omit<Especialista, "slug"> & { slug: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  slug: "",
  nome: "",
  cargo: "",
  nicho: "",
  cor_primaria: "#E63946",
  cor_secundaria: "#F4C430",
  posicionamento_texto: "topo",
  estilo_destaque: "primaria",
  brief_padrao: "",
  fonte_url: "",
  fonte_familia: "",
  publico_alvo: "",
  tom_de_voz: "",
  cta_formato: "",
  cta_palavra: "",
  cta_texto_secundario: "",
  vocabulario: "",
  palavras_proibidas: "",
  metricas: "",
};

function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── EspecialistasPage ─────────────────────────────────────────────────────────

export default function EspecialistasPage() {
  const [lista, setLista] = useState<Especialista[]>([]);
  const [selecionado, setSelecionado] = useState<Especialista | null>(null);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [logos, setLogos] = useState<{ filename: string; url: string }[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function carregarLogos(slug: string) {
    const res = await fetch(`/api/especialistas/${slug}/logos`);
    if (res.ok) setLogos(await res.json());
    else setLogos([]);
  }

  async function uploadLogo(file: File) {
    if (!selecionado && !criando) return;
    const slug = selecionado?.slug ?? form.slug;
    if (!slug) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/especialistas/${slug}/logos`, { method: "POST", body: fd });
      if (res.ok) await carregarLogos(slug);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function deleteLogo(filename: string) {
    const slug = selecionado?.slug ?? form.slug;
    if (!slug) return;
    await fetch(`/api/especialistas/${slug}/logos?file=${encodeURIComponent(filename)}`, { method: "DELETE" });
    await carregarLogos(slug);
  }


  async function carregarLista() {
    const res = await fetch("/api/especialistas");
    if (res.ok) setLista(await res.json());
  }

  useEffect(() => { carregarLista(); }, []);

  function selecionar(e: Especialista) {
    setSelecionado(e);
    setCriando(false);
    setForm({ ...e });
    setSlugManual(true);
    setSaveMsg(null);
    setConfirmandoExclusao(false);
    carregarLogos(e.slug);
  }

  function novoEspecialista() {
    setSelecionado(null);
    setLogos([]);
    setCriando(true);
    setForm(EMPTY_FORM);
    setSlugManual(false);
    setSaveMsg(null);
  }

  function setField(key: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "nome" && !slugManual) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function salvar() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const url = criando ? "/api/especialistas" : `/api/especialistas/${selecionado!.slug}`;
      const method = criando ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      setSaveMsg({ tipo: "ok", texto: "Salvo com sucesso" });
      setSelecionado(data);
      setCriando(false);
      setSlugManual(true);
      await carregarLista();
    } catch (err) {
      setSaveMsg({ tipo: "erro", texto: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  async function excluir() {
    if (!selecionado) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/especialistas/${selecionado.slug}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao excluir");
      setSelecionado(null);
      setCriando(false);
      setConfirmandoExclusao(false);
      await carregarLista();
    } catch (err) {
      setSaveMsg({ tipo: "erro", texto: err instanceof Error ? err.message : String(err) });
      setConfirmandoExclusao(false);
    } finally {
      setExcluindo(false);
    }
  }

  const mostrarForm = criando || selecionado !== null;

  function exportarJSON() {
    const exportData = lista.filter((e) => e.slug !== "generico");
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `especialistas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importarJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dados = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(dados)) throw new Error("Formato inválido: esperado array");

        let importados = 0;
        let erros = 0;
        for (const item of dados) {
          if (!item.slug || !item.nome) { erros++; continue; }
          const res = await fetch("/api/especialistas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (res.ok) importados++;
          else {
            // Se já existe, sobrescreve via PUT
            const putRes = await fetch(`/api/especialistas/${item.slug}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
            if (putRes.ok) importados++;
            else erros++;
          }
        }

        await carregarLista();
        alert(`Importação concluída: ${importados} importados, ${erros} com erro.`);
      } catch (err) {
        alert(`Erro na importação: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
    // Limpa o input para permitir reimportar o mesmo arquivo
    e.target.value = "";
  }

  return (
    <main className={styles.root}>

      <AppNav breadcrumb="Especialistas" />

      <div className={styles.body}>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Perfis</span>
            <div className={styles.sidebarHeaderActions}>
              <button className={styles.btnIcon} title="Exportar JSON" onClick={exportarJSON}>
                ↑
              </button>
              <label className={styles.btnIcon} title="Importar JSON">
                ↓
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={importarJSON}
                />
              </label>
              <button className={styles.btnNew} onClick={novoEspecialista}>+ Novo</button>
            </div>
          </div>

          <div className={styles.sidebarList}>
            {lista.length === 0 && (
              <div className={styles.sidebarEmpty}>Nenhum especialista cadastrado</div>
            )}
            {lista
              .filter((e) => e.slug !== "generico")
              .map((e) => {
                const active = selecionado?.slug === e.slug && !criando;
                return (
                  <div
                    key={e.slug}
                    className={`${styles.sidebarItem} ${active ? styles.active : ""}`}
                    style={{ borderLeftColor: active ? e.cor_primaria : "transparent" }}
                    onClick={() => selecionar(e)}
                  >
                    <div
                      className={styles.avatar}
                      style={{ background: e.cor_primaria }}
                    >
                      {e.nome.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className={styles.itemInfo}>
                      <div className={`${styles.itemName} ${!e.nome ? styles.placeholder : ""}`}>
                        {e.nome || "Sem nome"}
                      </div>
                      <div className={styles.itemSub}>
                        {e.cargo || e.nicho || e.slug}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Formulário */}
        <div className={styles.formArea}>
          {!mostrarForm ? (
            <div className={styles.formEmpty}>
              <div className={styles.formEmptyIcon}>👤</div>
              <div className={styles.formEmptyLabel}>Selecione um perfil ou crie um novo</div>
              <ActionButton onClick={novoEspecialista}>
                + Novo especialista
              </ActionButton>
            </div>
          ) : (
            <div className={styles.formCard}>

              {/* Cabeçalho */}
              <div className={styles.formHeader}>
                <div
                  className={styles.formAvatar}
                  style={{ background: form.cor_primaria }}
                >
                  {form.nome.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <div className={styles.formName}>
                    {criando ? "Novo especialista" : form.nome || "Especialista"}
                  </div>
                  <div className={styles.formSlug}>
                    {form.slug || "slug-gerado-automaticamente"}
                  </div>
                </div>
              </div>

              {/* Identidade */}
              <div className={styles.sectionTitle}>Identidade</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nome completo</label>
                <input
                  className={styles.input}
                  value={form.nome}
                  placeholder="Ex: Dr. Rafael Matos"
                  onChange={(e) => setField("nome", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Cargo / título</label>
                <input
                  className={styles.input}
                  value={form.cargo}
                  placeholder="Ex: Cardiologista e especialista em longevidade"
                  onChange={(e) => setField("cargo", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nicho / área de atuação</label>
                <input
                  className={styles.input}
                  value={form.nicho}
                  placeholder="Ex: Saúde, Finanças, Jurídico..."
                  onChange={(e) => setField("nicho", e.target.value)}
                />
              </div>

              {criando && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Slug (identificador único)</label>
                  <input
                    className={styles.input}
                    value={form.slug}
                    placeholder="ex: dr-rafael-matos"
                    onChange={(e) => {
                      setSlugManual(true);
                      setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                    }}
                  />
                  <div className={styles.inputHint}>
                    Gerado automaticamente pelo nome. Não pode ser alterado depois.
                  </div>
                </div>
              )}

              {/* Paleta */}
              <div className={styles.sectionTitle}>Paleta de cores</div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Cor primária</label>
                  <div className={styles.colorRow}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={form.cor_primaria}
                      onChange={(e) => setField("cor_primaria", e.target.value)}
                    />
                    <input
                      className={styles.input}
                      style={{ flex: 1, fontFamily: "monospace" }}
                      value={form.cor_primaria}
                      onChange={(e) => setField("cor_primaria", e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Cor secundária</label>
                  <div className={styles.colorRow}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={form.cor_secundaria}
                      onChange={(e) => setField("cor_secundaria", e.target.value)}
                    />
                    <input
                      className={styles.input}
                      style={{ flex: 1, fontFamily: "monospace" }}
                      value={form.cor_secundaria}
                      onChange={(e) => setField("cor_secundaria", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.colorPreview}>
                <div
                  className={styles.colorSwatch}
                  style={{ background: form.cor_primaria, color: "#fff" }}
                >
                  Primária
                </div>
                <div
                  className={styles.colorSwatch}
                  style={{ background: form.cor_secundaria, color: "#0C0C0C" }}
                >
                  Secundária
                </div>
                <div
                  className={styles.colorSwatch}
                  style={{ background: "#0A1628" }}
                >
                  <span style={{ color: form.cor_primaria }}>Texto</span>
                  <span style={{ color: "#fff" }}>&nbsp;normal</span>
                </div>
              </div>

              {/* Tipografia */}
              <div className={styles.sectionTitle}>Tipografia</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>URL da fonte (Google Fonts)</label>
                <input
                  className={styles.input}
                  value={form.fonte_url ?? ""}
                  placeholder="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap"
                  onChange={(e) => setField("fonte_url", e.target.value)}
                />
                <div className={styles.inputHint}>
                  Cole o link @import do Google Fonts. Deixe em branco para usar a fonte padrão do sistema.
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Font-family CSS</label>
                <input
                  className={styles.input}
                  value={form.fonte_familia ?? ""}
                  placeholder="'Montserrat', sans-serif"
                  onChange={(e) => setField("fonte_familia", e.target.value)}
                  style={{ fontFamily: form.fonte_familia || undefined }}
                />
                <div className={styles.inputHint}>
                  Nome exato da família como aparece no CSS. Ex: &apos;Montserrat&apos;, sans-serif
                </div>
              </div>


              {/* Logos */}
              {!criando && selecionado && (
                <>
                  <div className={styles.sectionTitle}>Logos</div>
                  <div className={styles.field}>
                    <div className={styles.logoGrid}>
                      {logos.map((logo) => (
                        <div key={logo.filename} className={styles.logoItem}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logo.url} alt={logo.filename} className={styles.logoThumb} />
                          <div className={styles.logoName}>{logo.filename}</div>
                          <button
                            className={styles.logoDelete}
                            onClick={() => deleteLogo(logo.filename)}
                            title="Remover logo"
                          >✕</button>
                        </div>
                      ))}
                      <label className={styles.logoUpload}>
                        {uploadingLogo ? "Enviando..." : "+ Adicionar logo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          style={{ display: "none" }}
                          disabled={uploadingLogo}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadLogo(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className={styles.inputHint}>
                      PNG, JPG, WEBP ou SVG. Usadas no componente Convite / Evento.
                    </div>
                  </div>
                </>
              )}

              {/* Comportamento visual */}
              <div className={styles.sectionTitle}>Comportamento visual</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Posicionamento padrão do texto</label>
                <select
                  className={styles.input}
                  value={form.posicionamento_texto}
                  onChange={(e) => setField("posicionamento_texto", e.target.value)}
                  style={{ appearance: "none", cursor: "pointer" }}
                >
                  <option value="topo">Topo — texto acima do rosto</option>
                  <option value="rodape">Rodapé — texto abaixo do rosto</option>
                  <option value="centro">Centro — sobre o rosto (não recomendado)</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Estilo padrão de destaque</label>
                <select
                  className={styles.input}
                  value={form.estilo_destaque}
                  onChange={(e) => setField("estilo_destaque", e.target.value)}
                  style={{ appearance: "none", cursor: "pointer" }}
                >
                  <option value="primaria">Cor primária</option>
                  <option value="secundaria">Cor secundária</option>
                  <option value="branco">Branco</option>
                </select>
              </div>

              {/* Brief padrão */}
              <div className={styles.sectionTitle}>Brief padrão</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Instruções fixas para o agente (aplicadas em todos os vídeos)
                </label>
                <textarea
                  className={styles.input}
                  rows={4}
                  style={{ resize: "vertical" }}
                  value={form.brief_padrao}
                  placeholder="Ex: Sempre priorizar dados numéricos no hook. Não usar linguagem de urgência artificial."
                  onChange={(e) => setField("brief_padrao", e.target.value)}
                />
                <div className={styles.inputHint}>
                  O brief por vídeo é somado a este, não o substitui.
                </div>
              </div>

              {/* Agente de IA */}
              <div className={styles.sectionTitle}>Agente de IA</div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Público-alvo</label>
                <input
                  className={styles.input}
                  value={form.publico_alvo ?? ""}
                  placeholder="Ex: Adultos 30-50 anos com interesse no tema, nível intermediário"
                  onChange={(e) => setField("publico_alvo", e.target.value)}
                />
                <div className={styles.inputHint}>
                  O agente usa isso para calibrar linguagem e exemplos nos textos de cena.
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Tom de voz</label>
                <input
                  className={styles.input}
                  value={form.tom_de_voz ?? ""}
                  placeholder="Ex: Direto e técnico, sem exageros emocionais"
                  onChange={(e) => setField("tom_de_voz", e.target.value)}
                />
              </div>

              <div className={styles.sectionTitle}>CTA padrão</div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Formato do CTA</label>
                  <input
                    className={styles.input}
                    value={form.cta_formato ?? ""}
                    placeholder="Ex: Comente [PALAVRA] aqui embaixo"
                    onChange={(e) => setField("cta_formato", e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Palavra / evento gatilho</label>
                  <input
                    className={styles.input}
                    value={form.cta_palavra ?? ""}
                    placeholder="Ex: SIM ou QUERO"
                    onChange={(e) => setField("cta_palavra", e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Texto secundário do CTA</label>
                <input
                  className={styles.input}
                  value={form.cta_texto_secundario ?? ""}
                  placeholder="Ex: Que eu te mando o acesso!"
                  onChange={(e) => setField("cta_texto_secundario", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Vocabulário da área (termos-chave)</label>
                <input
                  className={styles.input}
                  value={form.vocabulario ?? ""}
                  placeholder="Ex: termos técnicos da área separados por vírgula"
                  onChange={(e) => setField("vocabulario", e.target.value)}
                />
                <div className={styles.inputHint}>
                  Separados por vírgula. O agente prioriza esses termos ao identificar blocos temáticos.
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Palavras e expressões proibidas</label>
                <input
                  className={styles.input}
                  value={form.palavras_proibidas ?? ""}
                  placeholder="Ex: segredo, incrível, revolucionário, imperdível"
                  onChange={(e) => setField("palavras_proibidas", e.target.value)}
                />
                <div className={styles.inputHint}>
                  Separadas por vírgula. O agente evita essas expressões nos textos de cena.
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Métricas típicas da área</label>
                <input
                  className={styles.input}
                  value={form.metricas ?? ""}
                  placeholder="Ex: taxa de conversão em %, custo por lead em R$, tempo de resultado"
                  onChange={(e) => setField("metricas", e.target.value)}
                />
                <div className={styles.inputHint}>
                  Separadas por vírgula. Ajuda o agente a identificar comparativos numéricos corretamente.
                </div>
              </div>

              {/* Feedback */}
              {saveMsg && (
                <div className={saveMsg.tipo === "ok" ? styles.feedbackOk : styles.feedbackErr}>
                  {saveMsg.tipo === "ok" ? "✓ " : "⚠ "}{saveMsg.texto}
                </div>
              )}

              {/* Ações */}
              <div className={styles.actions}>
                <ActionButton onClick={salvar} disabled={saving} icon="✓">
                  {saving ? "Salvando..." : criando ? "Criar especialista" : "Salvar alterações"}
                </ActionButton>

                <button
                  className={styles.btnCancel}
                  onClick={() => {
                    setSelecionado(null);
                    setCriando(false);
                    setSaveMsg(null);
                    setConfirmandoExclusao(false);
                  }}
                >
                  Cancelar
                </button>

                {!criando && selecionado && (
                  <div className={styles.deleteArea}>
                    {!confirmandoExclusao ? (
                      <ActionButton
                        variant="danger"
                        onClick={() => setConfirmandoExclusao(true)}
                      >
                        Excluir
                      </ActionButton>
                    ) : (
                      <div className={styles.deleteConfirm}>
                        <span className={styles.deleteConfirmLabel}>Confirmar exclusão?</span>
                        <ActionButton
                          variant="danger"
                          onClick={excluir}
                          disabled={excluindo}
                        >
                          {excluindo ? "..." : "Confirmar"}
                        </ActionButton>
                        <button
                          className={styles.btnDeleteCancel}
                          onClick={() => setConfirmandoExclusao(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </main>
  );
}
