import type { ReelProps, Cena } from "@pontob/schema";

export type JobStatus =
  | "transcribing"
  | "analyzing"
  | "ready"
  | "rendering"
  | "done"
  | "error";

export type Job = {
  id: string;
  fileName: string;
  videoPath: string;
  transcriptPath: string;
  scenesPath: string;
  status: JobStatus;
  scenes: ReelProps | null;
  outputPath: string | null;
  error: string | null;
  createdAt: string;
  especialista_slug?: string;
};

export type { ReelProps, Cena };
