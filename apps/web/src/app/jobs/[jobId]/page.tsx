"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EditorView } from "@/components/EditorView";
import type { Job } from "@/types";

export default function JobPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/jobs/${jobId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Job não encontrado");
        return r.json();
      })
      .then((data: Job) => setJob(data))
      .catch((e) => setError(e.message));
  }, [jobId]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "var(--red)", fontSize: 14 }}>{error}</p>
        <Link href="/jobs" style={{ color: "var(--ink-3)", fontSize: 13, textDecoration: "none" }}>← Voltar para jobs</Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--canvas)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Carregando job...</p>
      </div>
    );
  }

  return <EditorView job={job} onNew={() => { window.location.href = "/"; }} />;
}
