# Setup local

Como subir o projeto na sua máquina pela primeira vez.

## 1. Pré-requisitos

- **Node.js 20+** — https://nodejs.org/
- **Python 3.11+** — https://www.python.org/
- **FFmpeg** no PATH — `winget install Gyan.FFmpeg` (Windows) ou baixar de https://ffmpeg.org/

Verificar:

```powershell
node --version
python --version
ffmpeg -version
```

## 2. Variáveis de ambiente

```powershell
copy .env.example .env
notepad .env
```

Preencher `ANTHROPIC_API_KEY=sk-ant-...`. Demais variáveis têm default razoável.

## 3. Dependências Node (workspace inteiro)

Da raiz do projeto:

```powershell
cd C:\Users\Rafael\source\repos\pontob-video-editor
npm install
```

Isso instala dependências de:
- `apps/remotion` — Remotion + React
- `services/analysis` — Anthropic SDK + tsx
- `packages/schema` — Zod

## 4. Dependências Python (transcrição)

```powershell
cd services\transcription
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Primeira execução do `run.py` baixa o modelo `large-v3` (~3 GB) automaticamente.

## 5. Pasta de jobs e samples

```powershell
mkdir samples
mkdir jobs
```

Coloque vídeos brutos em `samples/`. Cada execução cria pasta nova em `jobs/<job_id>/`.

## 6. Smoke test do pipeline (CLI)

### 6.1. Transcrever

```powershell
.\services\transcription\.venv\Scripts\Activate.ps1
python services\transcription\run.py `
  --input samples\meu_video.mp4 `
  --output jobs\teste01\transcript.json `
  --model large-v3
```

Saída: `jobs\teste01\transcript.json` com segments + word-level timestamps.

### 6.2. Cadastrar Especialista

Criar arquivo `especialistas\nome-do-mentor.json` seguindo `docs/especialista.md`. Exemplo mínimo:

```json
{
  "slug": "mateus-castro",
  "nome": "Mateus Castro",
  "cargo": "Especialista em renda passiva",
  "tom_de_voz": "Direto, analítico, técnico",
  "palavras_a_evitar": ["fórmula", "segredo"],
  "cta_padrao": {
    "formato": "comente_palavra",
    "palavra_ou_evento": "MARATONA"
  },
  "identidade_visual": {
    "cor_destaque_primaria": "#E63946"
  }
}
```

### 6.3. Analisar (Claude)

```powershell
cd services\analysis
npm run analyze -- `
  --transcript ..\..\jobs\teste01\transcript.json `
  --especialista ..\..\especialistas\mateus-castro.json `
  --output ..\..\jobs\teste01\scenes.json
```

Saída: `jobs\teste01\scenes.json` validado por Zod.

### 6.4. Renderizar (Remotion)

```powershell
cd apps\remotion
npm run dev          # abre Remotion Studio em http://localhost:3000 com props default
# ou
npm run render -- --props=..\..\jobs\teste01\scenes.json
```

Saída: `apps\remotion\out\reel.mp4` (1080×1920, 30fps).

## 7. Tempo estimado por etapa

Pra um vídeo bruto de 50s:

| Etapa | CPU pura | GPU NVIDIA |
|---|---|---|
| Extração de áudio (FFmpeg) | <1s | <1s |
| Transcrição (faster-whisper large-v3) | 60-90s | 10-20s |
| Análise (Claude API) | 4-8s | 4-8s |
| Render (Remotion) | 3-5min | 1-2min |
| Encode final (FFmpeg) | <5s | <5s |
| **Total** | ~5-8min | ~2-3min |

## Estado atual do código

⚠️ **Atenção**: O código atual (Reel.tsx, scenes.ts, prompt.ts) está no modelo antigo de
9 cenas fixas. A documentação reflete o modelo novo (sequência variável). Refator pendente
na Fase 1.

Ver `docs/HANDOFF.md` pra detalhes do gap entre código e documentação.
