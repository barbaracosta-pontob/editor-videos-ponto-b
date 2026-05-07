/**
 * CLI: roda análise Claude sobre um transcript.json e salva scenes.json.
 *
 * Uso:
 *   tsx src/cli.ts --transcript ./transcript.json --output ./scenes.json \
 *     --especialista ../../especialistas/mateus-castro.json \
 *     --video-path ./video.mp4 \
 *     --brief "foco nos comparativos numéricos"
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { analyze, AnalysisError } from "./claude";

async function main() {
  const { values } = parseArgs({
    options: {
      transcript:    { type: "string", short: "t" },
      output:        { type: "string", short: "o" },
      especialista:  { type: "string", short: "e" },
      "video-path":  { type: "string", short: "v" },
      brief:         { type: "string", short: "b" },
      model:         { type: "string" },
      help:          { type: "boolean", short: "h" },
    },
  });

  if (values.help || !values.transcript || !values.output) {
    console.log(`
Uso: tsx src/cli.ts --transcript <path> --output <path> [opções]

Obrigatórios:
  --transcript, -t    Caminho do transcript.json (saída do faster-whisper)
  --output, -o        Caminho onde salvar o scenes.json

Opcionais:
  --especialista, -e  Caminho do JSON do especialista (ex: ../../especialistas/mateus-castro.json)
  --video-path, -v    Caminho do vídeo bruto (usado nas cenas de vídeo)
  --brief, -b         Brief do estrategista (texto livre)
  --model             Modelo Claude (default: claude-sonnet-4-6)
`);
    process.exit(values.help ? 0 : 1);
  }

  const transcript = JSON.parse(readFileSync(values.transcript!, "utf-8"));
  const videoPath = values["video-path"] ?? values.transcript!.replace("transcript.json", "video.mp4");

  // Carrega especialista (usa genérico se não informado)
  let especialista: Parameters<typeof analyze>[0]["especialista"] = {
    nome: "Especialista",
    cargo: "Expert",
  };
  if (values.especialista && existsSync(values.especialista)) {
    especialista = JSON.parse(readFileSync(values.especialista, "utf-8"));
  }

  console.error(`[cli] analisando ${values.transcript}...`);
  const t0 = Date.now();

  try {
    const result = await analyze(
      {
        transcript,
        videoOriginalPath: videoPath,
        especialista,
        brief: values.brief,
      },
      { model: values.model },
    );

    const elapsed = (Date.now() - t0) / 1000;

    mkdirSync(dirname(values.output!), { recursive: true });
    writeFileSync(values.output!, JSON.stringify(result.scenes, null, 2), "utf-8");

    console.error(`[cli] concluído em ${elapsed.toFixed(1)}s`);
    console.error(`[cli] tentativas: ${result.metadata.tentativas}`);
    console.error(`[cli] tokens: input=${result.metadata.tokens.input} output=${result.metadata.tokens.output} cache_read=${result.metadata.tokens.cacheRead}`);
    console.error(`[cli] salvo em ${values.output}`);

  } catch (err) {
    if (err instanceof AnalysisError) {
      console.error(`\n[cli] ANÁLISE FALHOU após ${err.tentativas} tentativas`);
      console.error(`[cli] ${err.message}`);
      if (err.ultimaResposta) {
        const dump = `${values.output}.last-failed.txt`;
        writeFileSync(dump, err.ultimaResposta, "utf-8");
        console.error(`[cli] ultima resposta crua salva em ${dump}`);
      }
      process.exit(2);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error("[cli] erro fatal:", err);
  process.exit(1);
});
