# Ponto B — Video Editor

Pipeline interno da Ponto B para gerar reels (1080×1920, 60–100s) a partir de vídeos brutos gravados por especialistas.

**Stack:** Python (faster-whisper) → Claude Sonnet → Remotion → MP4

---

## Como funciona

```
[vídeo bruto .mp4]
     ↓ faster-whisper (transcrição local com timestamps)
[transcript.json]
     +  perfil do Especialista  +  brief opcional
     ↓ Claude Sonnet (gera sequência de cenas)
[scenes.json — validado por Zod]
     ↓ Remotion (renderiza cada cena como componente React)
[reel.mp4 — 9:16, 30fps, 60–100s]
```

Tudo passa pela interface web em `localhost:3001`. Cada job persiste em `jobs/<job_id>/`.

---

## Setup — passo a passo

### Pré-requisitos

Instale antes de começar:

| Ferramenta | Versão mínima | Como instalar |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| Python | 3.11+ | https://www.python.org |
| FFmpeg | qualquer | `winget install Gyan.FFmpeg` (Windows) |

Confirme que estão instalados:
```powershell
node --version
python --version
ffmpeg -version
```

---

### 1. Clonar e instalar dependências Node

```powershell
git clone <url-do-repo>
cd pontob-video-editor
npm install
```

O `npm install` na raiz instala tudo de uma vez — `apps/web`, `apps/remotion`, `services/analysis` e `packages/schema`.

---

### 2. Configurar variáveis de ambiente

```powershell
copy .env.example .env
```

Abra o `.env` e preencha:

```env
ANTHROPIC_API_KEY=sk-ant-...    # obrigatório — sua chave da API Claude
CLAUDE_MODEL=claude-sonnet-4-6  # deixe assim
WHISPER_MODEL=large-v3          # use "small" para testar mais rápido
WHISPER_DEVICE=auto             # auto detecta GPU se disponível
```

> **Importante:** o `.env` deve ficar na raiz do projeto (`pontob-video-editor/.env`).

---

### 3. Instalar dependências Python

```powershell
cd services\transcription
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
cd ..\..
```

> Na primeira transcrição, o modelo `large-v3` é baixado automaticamente (~3 GB). Use `WHISPER_MODEL=small` no `.env` para pular isso durante testes.

---

### 4. Criar pastas necessárias

```powershell
mkdir jobs
mkdir especialistas
```

---

### 5. Cadastrar um Especialista

Crie um arquivo JSON em `especialistas/` com o slug do mentor. Exemplo:

**`especialistas/mateus-castro.json`**
```json
{
  "slug": "mateus-castro",
  "nome": "Mateus Castro",
  "cargo": "Especialista em renda passiva",
  "tom_de_voz": "Direto, analítico, técnico",
  "palavras_a_evitar": ["fórmula", "segredo", "incrível"],
  "cta_padrao": {
    "formato": "comente_palavra",
    "palavra_ou_evento": "MARATONA",
    "texto_secundario": "Vou te enviar o link gratuito"
  },
  "identidade_visual": {
    "cor_destaque_primaria": "#E63946"
  }
}
```

Schema completo em [`docs/especialista.md`](docs/especialista.md).

---

### 6. Subir a interface web

```powershell
npm run dev
```

Acesse **http://localhost:3001**

Na interface você consegue:
- Fazer upload do vídeo bruto
- Selecionar o especialista cadastrado
- Adicionar um brief opcional (ex: "priorize os comparativos numéricos")
- Acompanhar o processamento em tempo real
- Revisar e editar as cenas geradas
- Renderizar o reel final

---

### 7. (Opcional) Remotion Studio

Para visualizar e depurar cenas diretamente no player do Remotion:

```powershell
npm run dev:remotion
```

Acesse **http://localhost:3000**

---

## Estrutura do repositório

```
pontob-video-editor/
├── apps/
│   ├── web/             # Interface Next.js — upload, revisão, renderização
│   └── remotion/        # Componentes React → vídeo (1 componente por tipo de cena)
├── services/
│   ├── transcription/   # Python + faster-whisper
│   └── analysis/        # Node + Anthropic SDK (Claude analisa e gera scenes.json)
├── packages/
│   └── schema/          # Schema Zod compartilhado (fonte de verdade dos tipos de cena)
├── especialistas/        # JSONs de cadastro de cada mentor (gitignored)
├── jobs/                 # Arquivos de cada execução (gitignored)
├── docs/                 # Documentação detalhada
└── .env                  # Variáveis de ambiente (não versionar)
```

---

## Tipos de cena disponíveis

O Claude pode gerar 8 tipos, em qualquer ordem e quantidade (4–15 cenas):

| Tipo | Descrição |
|---|---|
| `Hook` | Abertura — título grande sobre vídeo do mentor. Sempre primeiro. |
| `FraseImpacto` | Frase-chave sobre fundo sólido, sem vídeo |
| `ComparativoNumerico` | Dois ou três valores contrastados lado a lado |
| `VideoCitacao` | Vídeo do mentor com frases em overlay |
| `ListaPontos` | Lista de 2–5 tópicos animados em sequência |
| `MiniCaso` | Vídeo com resultado de caso real em overlay |
| `TransicaoTexto` | Frase curta de separação de bloco (1–4s) |
| `CTA` | Encerramento com chamada de ação. Sempre último. |

---

## Problemas comuns

**`ModuleNotFoundError: No module named 'faster_whisper'`**
→ O `.venv` do Python não foi criado. Rode o passo 3 do setup.

**`ANTHROPIC_API_KEY não definido`**
→ O `.env` precisa estar na raiz do projeto (`pontob-video-editor/.env`). Reinicie o servidor após criar o arquivo.

**`spawn remotion ENOENT`**
→ O Remotion CLI não foi instalado. Rode `npm install` na raiz do projeto.

**Primeira transcrição muito lenta**
→ O modelo `large-v3` está sendo baixado (~3 GB). Normal só na primeira vez. Use `WHISPER_MODEL=small` no `.env` para testes rápidos.

---

## Documentação

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — estado atual, decisões, pendências
- [`docs/arquitetura.md`](docs/arquitetura.md) — pipeline completo e como o Remotion funciona
- [`docs/especialista.md`](docs/especialista.md) — schema completo do cadastro de Especialista
- [`docs/schema.md`](docs/schema.md) — schema do `scenes.json`
- [`docs/cenas-componentes.md`](docs/cenas-componentes.md) — detalhes de cada componente Remotion
- [`docs/prompt-claude-analise.md`](docs/prompt-claude-analise.md) — system prompt versionado do Claude
