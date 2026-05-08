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

Tudo passa pela interface web em `localhost:3000`. Cada job persiste em `jobs/<job_id>/`.

---

## Setup — passo a passo

### Pré-requisitos

| Ferramenta | Versão mínima | Windows | macOS | Linux |
|---|---|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) | `brew install node` | `nvm install 20` |
| Python | 3.11+ | [python.org](https://www.python.org) | `brew install python@3.11` | `sudo apt install python3.11` |
| FFmpeg | qualquer | `winget install Gyan.FFmpeg` | `brew install ffmpeg` | `sudo apt install ffmpeg` |

Confirme que estão instalados:

```bash
node --version   # deve mostrar v20+
python --version # deve mostrar 3.11+
ffmpeg -version
```

#### Windows — liberar execução de scripts no PowerShell

Por padrão o PowerShell bloqueia scripts externos (incluindo o `npm`). Abra o PowerShell **como Administrador** e rode uma vez:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Confirme com `S` quando perguntado. Feche e reabra o terminal antes de continuar.

---

### 1. Clonar e instalar dependências Node

Na pasta onde você quer guardar o projeto:

```bash
git clone https://github.com/barbaracosta-pontob/editor-reels-ponto-b.git
cd editor-reels-ponto-b
npm install
```

O `npm install` na raiz instala tudo de uma vez — `apps/web`, `apps/remotion`, `services/analysis` e `packages/schema`.

---

### 2. Configurar variáveis de ambiente

Na raiz do projeto (`editor-reels-ponto-b/`):

**Windows:**
```powershell
copy .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Abra o `.env` e preencha:

```env
ANTHROPIC_API_KEY=sk-ant-...    # obrigatório — sua chave em console.anthropic.com
CLAUDE_MODEL=claude-sonnet-4-6  # deixe assim
WHISPER_MODEL=large-v3          # use "small" para testar mais rápido
WHISPER_DEVICE=auto             # auto detecta GPU se disponível
```

> O `.env` deve ficar na raiz do projeto. Reinicie o servidor após qualquer alteração nele.

---

### 3. Instalar dependências Python

A partir da raiz do projeto (`editor-reels-ponto-b/`):

**Windows:**
```powershell
cd services\transcription
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
cd ..\..
```

**macOS / Linux:**
```bash
cd services/transcription
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd ../..
```

Ao final você deve estar de volta na raiz do projeto.

> Na primeira transcrição o modelo `large-v3` é baixado automaticamente (~3 GB). Use `WHISPER_MODEL=small` no `.env` para pular isso durante testes.

---

### 4. Criar pastas necessárias

Na raiz do projeto (`editor-reels-ponto-b/`):

**Windows:**
```powershell
mkdir jobs
mkdir especialistas
```

**macOS / Linux:**
```bash
mkdir -p jobs especialistas
```

---

### 5. Subir a interface web

Na raiz do projeto (`editor-reels-ponto-b/`):

```bash
npm run dev
```

Acesse **http://localhost:3000**

Na interface você consegue:
- Fazer upload do vídeo bruto
- Selecionar o especialista cadastrado
- Adicionar um brief opcional (ex: "priorize os comparativos numéricos")
- Acompanhar o processamento em tempo real
- Revisar e editar as cenas geradas
- Renderizar o reel final

---

### 6. (Opcional) Remotion Studio

Para visualizar e depurar cenas diretamente no player do Remotion:

```bash
npm run dev:remotion
```

Acesse **http://localhost:3001**

---

## Estrutura do repositório

```
editor-reels-ponto-b/
├── apps/
│   ├── web/             # Interface Next.js — upload, revisão, renderização
│   └── remotion/        # Componentes React → vídeo (1 componente por tipo de cena)
├── services/
│   ├── transcription/   # Python + faster-whisper
│   └── analysis/        # Node + Anthropic SDK (Claude analisa e gera scenes.json)
├── packages/
│   └── schema/          # Schema Zod compartilhado (fonte de verdade dos tipos de cena)
├── especialistas/        # JSONs de cadastro de cada mentor
├── jobs/                 # Arquivos de cada execução — criado localmente, não versionado
├── docs/                 # Documentação detalhada
├── .env.example          # Template de variáveis de ambiente
└── .env                  # Suas variáveis locais — não versionar
```

---

## Tipos de cena disponíveis

O Claude pode gerar os tipos abaixo, em qualquer ordem e quantidade (4–15 cenas):

| Tipo | Descrição |
|---|---|
| `Hook` | Abertura — título grande sobre vídeo do mentor. Sempre primeiro. |
| `FraseImpacto` | Frase-chave sobre fundo sólido, sem vídeo |
| `ComparativoNumerico` | Dois ou três valores contrastados lado a lado |
| `VideoCitacao` | Vídeo do mentor com frases em overlay |
| `ListaPontos` | Lista de 2–5 tópicos animados em sequência |
| `MiniCaso` | Vídeo com resultado de caso real em overlay |
| `TransicaoTexto` | Frase curta de separação de bloco (1–4s) |
| `GraficoBarra` | Gráfico de barras animado com dados numéricos |
| `GraficoLinha` | Gráfico de linha animado com evolução temporal |
| `ConviteEvento` | Convite para evento com vídeo do mentor ao fundo |
| `CtaFullNavy` | CTA em fundo navy escuro, sem vídeo |
| `CTA` | Encerramento com chamada de ação. Sempre último. |

---

## Problemas comuns

**`ModuleNotFoundError: No module named 'faster_whisper'`**
→ O `.venv` do Python não foi ativado corretamente. Refaça o passo 3.

**`ANTHROPIC_API_KEY não definido`**
→ O `.env` precisa estar na raiz do projeto. Reinicie o servidor após criar o arquivo.

**`spawn remotion ENOENT`**
→ Rode `npm install` na raiz do projeto.

**Primeira transcrição muito lenta**
→ O modelo `large-v3` está sendo baixado (~3 GB). Normal só na primeira vez. Use `WHISPER_MODEL=small` no `.env` para testes rápidos.

**Python não encontrado no macOS**
→ Tente `python3` em vez de `python`. Se necessário: `brew install python@3.11`.

---

## Documentação

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — estado atual, decisões, pendências
- [`docs/arquitetura.md`](docs/arquitetura.md) — pipeline completo e como o Remotion funciona
- [`docs/especialista.md`](docs/especialista.md) — schema completo do cadastro de Especialista
- [`docs/schema.md`](docs/schema.md) — schema do `scenes.json`
- [`docs/cenas-componentes.md`](docs/cenas-componentes.md) — detalhes de cada componente Remotion
- [`docs/prompt-claude-analise.md`](docs/prompt-claude-analise.md) — system prompt versionado do Claude
