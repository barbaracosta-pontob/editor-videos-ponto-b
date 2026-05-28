# Ponto B — Video Editor

Pipeline interno da Ponto B para gerar criativos curtos a partir de vídeos brutos gravados por especialistas. Cada job pode ser renderizado em até três formatos prontos pra mídia paga e orgânica:

- **9:16 Reels** (1080×1920) — Instagram Reels, TikTok, Shorts
- **16:9 Wide** (1920×1080) — YouTube, criativos display
- **1:1 Square** (1080×1080) — feed quadrado de Instagram/Facebook

A duração do reel acompanha a duração real do vídeo bruto (com teto em 100s). Vídeos curtos viram reels curtos — o sistema nunca infla overlays além do que existe no arquivo.

**Stack:** Python (faster-whisper) → Claude Sonnet → Remotion → MP4

---

## Início rápido (depois que o setup já foi feito uma vez)

Se você ou alguém da equipe já fez o setup completo na sua máquina, usar o editor é simples:

1. Vá até a pasta `editor-reels-ponto-b` no Windows Explorer
2. Dê **dois cliques no arquivo `Iniciar Editor.bat`**
3. Vai abrir uma janela preta chamada "PontoB Server" — **não feche essa janela**, ela é o servidor rodando
4. Espere cerca de 30 segundos. O navegador vai abrir sozinho em `http://localhost:3000`
5. Quando terminar de usar, é só fechar a janela "PontoB Server"

> **Dica — atalho no Desktop:** na primeira vez que você rodar o `Iniciar Editor.bat`, ele cria automaticamente um atalho no Desktop chamado "Ponto B - Video Editor" com o ícone do app. Da próxima vez é só clicar no atalho.

**Se você nunca fez o setup, siga o passo a passo completo abaixo.** É demorado (umas duas horas na primeira vez), mas você só faz uma vez por máquina.

---

## Como funciona (para entender o que está sendo instalado)

```
[vídeo bruto .mp4]
     ↓ faster-whisper (transcrição local com timestamps)
[transcript.json]
     +  perfil do Especialista  +  brief opcional
     ↓ Claude Sonnet (gera sequência de cenas)
[scenes.json — validado por Zod]
     ↓ Remotion (renderiza cada cena como componente React)
[reel.mp4 — 9:16 / 16:9 / 1:1, 30fps, ate 100s]
```

Tudo passa pela interface web em `localhost:3000`. Cada job persiste em `jobs/<job_id>/`.

Para o pipeline funcionar a gente precisa instalar 4 ferramentas no seu computador (passo 0), depois baixar o código do projeto e configurar (passos 1 a 5).

---

## Antes de começar — entendendo o que é "Terminal"

Praticamente todo o setup acontece no **Terminal** (também chamado de "Prompt de Comando", "PowerShell" ou "CMD" no Windows). É uma janela preta onde você digita comandos em vez de clicar em botões. Você cola um comando, aperta Enter, e ele executa.

**Como abrir um Terminal na pasta do projeto (Windows — método mais fácil):**

1. Abra o Windows Explorer
2. Navegue até a pasta onde você quer que o projeto fique (ex: `C:\repos`)
3. Clique uma vez na **barra de endereço** do Explorer (em cima, onde mostra o caminho)
4. Apague o que está escrito ali, digite **`powershell`** e aperte Enter
5. Vai abrir uma janela azul ou preta — esse é o terminal, **já posicionado** na pasta certa

> **Alternativa:** clique com o botão direito **dentro** da pasta segurando a tecla **Shift** → "Abrir janela do PowerShell aqui" (em versões mais antigas do Windows) ou "Abrir no Terminal" (Windows 11).

**Como saber onde o Terminal está agora:** a primeira linha mostra o caminho atual, tipo `PS C:\repos>`. Esse `C:\repos` é a pasta onde você está. Qualquer comando que você rodar vai afetar essa pasta.

**Como colar um comando no Terminal:**

- Copie o comando do README com Ctrl+C como sempre
- Clique dentro da janela do Terminal
- Cole com **clique direito do mouse** (no Windows PowerShell clássico) ou **Ctrl+V** (no Windows Terminal mais novo)
- Aperte **Enter** para executar

**O que esperar quando você rodar um comando:**

- Se aparecer texto descendo na tela, o comando está rodando — é só esperar
- Se voltar pro prompt (`PS C:\repos>`) **sem mensagem de erro vermelha**, deu certo
- Se aparecer texto **vermelho** ou a palavra "Error", algo deu errado — leia a mensagem ou consulte a seção "Problemas comuns" no final deste README

---

## Setup completo — passo a passo (primeira vez)

### Passo 0 — Instalar as ferramentas básicas no sistema

Antes de baixar o código, você precisa instalar 4 programas no Windows. Cada um faz uma parte diferente do trabalho.

#### 0.1 — Node.js (motor que roda o site do editor)

1. Acesse https://nodejs.org
2. Clique no botão **LTS** (versão estável, atualmente 20.x ou superior)
3. Baixe o instalador `.msi` e execute
4. Aceite todas as opções padrão, clique "Next" até o fim
5. **Reinicie o computador** depois da instalação (importante pra ele aparecer no Terminal)

**Como confirmar que instalou:** abra um Terminal (PowerShell) e cole:

```powershell
node --version
```

Aperte Enter. Deve aparecer algo como `v20.11.0`. Se aparecer "comando não reconhecido", reinicie o computador e tente de novo.

#### 0.2 — Python 3.12 (usado pra transcrever o áudio do vídeo)

> **Atenção:** tem que ser a versão **3.12**. As versões 3.13 e 3.14 fazem o transcritor quebrar.

1. Acesse https://www.python.org/downloads/release/python-3128/
2. Role até "Files" e baixe o **Windows installer (64-bit)**
3. Execute o instalador
4. Na primeira tela, **marque a caixa "Add python.exe to PATH"** (importante, senão não funciona no Terminal)
5. Clique em "Install Now" e aguarde
6. Reinicie o computador

**Como confirmar que instalou:** abra um Terminal e cole:

```powershell
py -3.12 --version
```

Deve aparecer `Python 3.12.x`. Se aparecer outra versão ou erro, refaça a instalação garantindo que marcou "Add to PATH".

#### 0.3 — FFmpeg (manipula arquivos de vídeo)

Abra o Terminal **como Administrador** (clique no Menu Iniciar, digite "PowerShell", clique direito → "Executar como administrador") e cole:

```powershell
winget install Gyan.FFmpeg
```

Aperte Enter. Vai baixar e instalar sozinho — pode demorar alguns minutos. Quando voltar pro prompt, fechou.

**Como confirmar:** feche e reabra o Terminal (não precisa ser como Admin desta vez) e cole:

```powershell
ffmpeg -version
```

Deve aparecer um monte de texto começando com "ffmpeg version...". Se não aparecer, reinicie o computador.

#### 0.4 — Visual C++ Redistributable (dependência da transcrição)

1. Baixe o arquivo daqui: https://aka.ms/vs/17/release/vc_redist.x64.exe
2. Execute o instalador, aceite os termos e clique "Install"
3. Se aparecer mensagem dizendo "Já está instalado", está tudo certo

> Sem isso, a transcrição quebra com erro `DLL load failed while importing onnxruntime_pybind11_state` quando você for usar.

#### 0.5 — Git (pra baixar o código do projeto)

1. Acesse https://git-scm.com/download/win
2. Baixe o instalador (vai começar automático)
3. Execute. Pode clicar "Next" em todas as opções — os padrões são bons
4. Reinicie o computador

**Como confirmar:** abra um Terminal e cole:

```powershell
git --version
```

Deve aparecer `git version 2.x.x`.

#### 0.6 — Liberar execução de scripts no PowerShell (só Windows)

Por segurança, o Windows bloqueia scripts externos por padrão (incluindo o `npm` que vamos usar). Precisa liberar uma vez.

1. Clique no Menu Iniciar, digite "PowerShell"
2. Clique com botão direito em "Windows PowerShell" → **"Executar como administrador"**
3. Cole o comando abaixo e aperte Enter:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

4. Quando aparecer a pergunta, digite **S** e aperte Enter
5. Feche essa janela do PowerShell

---

### Passo 1 — Baixar o código do projeto

#### 1.1 — Escolha onde guardar o projeto

Crie ou escolha uma pasta no seu computador pra ser o "lar" do projeto. Sugerimos `C:\repos` mas pode ser qualquer lugar (Documentos, Desktop, etc.). Só evite caminhos com espaços ou acentos.

Como criar a pasta:
1. Abra o Windows Explorer
2. Navegue até `C:\` (Este Computador → Disco Local C:)
3. Clique com botão direito num espaço vazio → Novo → Pasta
4. Nomeie como `repos` (sem espaço, sem acento)

#### 1.2 — Abra o Terminal **dentro dessa pasta**

Siga o método explicado na seção "Antes de começar — entendendo o que é Terminal":

1. Abra `C:\repos` no Windows Explorer
2. Clique na barra de endereço, apague o que está lá, digite `powershell` e aperte Enter
3. Você deve ver `PS C:\repos>` na janela que abriu

#### 1.3 — Baixe o código

Cole esses 3 comandos **um de cada vez**, apertando Enter entre cada um:

```powershell
git clone https://github.com/barbaracosta-pontob/editor-reels-ponto-b.git
```

Esse primeiro comando vai baixar o projeto e criar uma pasta nova chamada `editor-reels-ponto-b` dentro de `C:\repos`. Demora 10–30 segundos.

```powershell
cd editor-reels-ponto-b
```

Esse comando "entra" na pasta recém-baixada. Você vai ver o prompt mudar pra `PS C:\repos\editor-reels-ponto-b>`. Esse caminho que aparece depois do `PS` é onde o Terminal está "olhando" agora.

```powershell
npm install
```

Esse comando baixa **todas as dependências** do projeto (são mais de mil arquivos pequenos). Pode demorar **5 a 15 minutos** dependendo da sua internet. Vai aparecer muito texto descendo, isso é normal. Espere até voltar o prompt `PS C:\repos\editor-reels-ponto-b>` sem erros vermelhos.

> Você só precisa fazer o passo 1.3 uma vez. Da próxima vez que abrir o projeto, ele já vai estar baixado em `C:\repos\editor-reels-ponto-b`.

---

### Passo 2 — Configurar a chave da API do Claude

O editor usa o Claude (IA da Anthropic) pra gerar as cenas. Você precisa de uma chave de API.

#### 2.1 — Pegue sua chave da API

1. Acesse https://console.anthropic.com/settings/keys
2. Faça login (ou crie uma conta, se ainda não tiver)
3. Clique em **"Create Key"**
4. Dê um nome (ex: "Editor Ponto B") e clique em criar
5. **Copie a chave que aparece — ela começa com `sk-ant-...`**. Você só consegue ver essa chave uma vez. Se perder, tem que criar outra.

#### 2.2 — Crie o arquivo de configuração

No mesmo Terminal que você está (deve estar em `C:\repos\editor-reels-ponto-b`), cole:

```powershell
copy .env.example .env
```

Isso cria um arquivo chamado `.env` na raiz do projeto, baseado no template.

#### 2.3 — Abra o arquivo `.env` e cole sua chave

1. Abra o Windows Explorer em `C:\repos\editor-reels-ponto-b`
2. Procure o arquivo `.env` (atenção: ele começa com ponto, então pode estar oculto — se não aparecer, vá em "Exibir" → marque "Itens ocultos")
3. Clique com botão direito → **Abrir com → Bloco de Notas**
4. Procure a linha `ANTHROPIC_API_KEY=` e cole sua chave logo depois do `=`, sem espaço

O arquivo deve ficar assim:

```env
ANTHROPIC_API_KEY=sk-ant-api03-aBcDeFgHi...    # sua chave aqui
CLAUDE_MODEL=claude-sonnet-4-6                  # deixe assim
WHISPER_MODEL=large-v3                          # use "small" para testes mais rápidos
WHISPER_DEVICE=auto                             # auto detecta GPU
```

5. Salve com Ctrl+S e feche o Bloco de Notas.

> **Segurança:** essa chave dá acesso à sua conta da Anthropic e pode gastar seus créditos. Nunca compartilhe esse arquivo `.env` em e-mails, prints ou commits no Git. O projeto já está configurado pra ignorar o `.env` (existe um `.gitignore` cuidando disso).

---

### Passo 3 — Instalar as dependências do transcritor (Python)

A transcrição do áudio roda em Python separado do resto. Precisamos criar um "ambiente Python isolado" só pra ele.

No Terminal (ainda em `C:\repos\editor-reels-ponto-b`), cole os comandos abaixo **um de cada vez**:

```powershell
cd services\transcription
```

Isso entra na subpasta do transcritor. O prompt vai virar `PS C:\repos\editor-reels-ponto-b\services\transcription>`.

```powershell
py -3.12 -m venv .venv
```

Isso cria o "ambiente Python isolado" (chamado `.venv`) usando **especificamente** a versão 3.12. Demora 10–30 segundos.

```powershell
.\.venv\Scripts\pip install -r requirements.txt
```

Isso instala todas as bibliotecas Python que o transcritor precisa (faster-whisper, ctranslate2, etc.). Demora 3–10 minutos e baixa cerca de 500 MB.

```powershell
cd ..\..
```

Isso volta pra raiz do projeto. O prompt deve ficar de novo `PS C:\repos\editor-reels-ponto-b>`.

> **Atenção sobre o Python 3.12:** o comando `py -3.12` força o uso da versão certa, mesmo que você tenha outras versões instaladas. Se aparecer erro dizendo que "3.12" não foi encontrado, refaça o Passo 0.2.

> Na primeira vez que você usar o editor, ele vai baixar automaticamente o modelo de IA do Whisper (`large-v3`, cerca de 3 GB). Pra evitar esse download durante testes, troque `large-v3` por `small` no arquivo `.env` — usa menos espaço mas a transcrição fica menos precisa.

---

### Passo 4 — Criar as pastas que o editor usa

O editor precisa de duas pastas pra guardar arquivos durante o uso. No Terminal (em `C:\repos\editor-reels-ponto-b`), cole:

```powershell
mkdir jobs
```

```powershell
mkdir especialistas
```

São criadas vazias mesmo — vão se preencher conforme você usar.

---

### Passo 5 — Abrir o editor pela primeira vez

Agora que tudo está instalado, **você não vai mais precisar do Terminal pra usar o editor no dia a dia**. A partir daqui é tudo no clique.

1. Feche o Terminal (pode fechar a janela mesmo)
2. Abra o Windows Explorer em `C:\repos\editor-reels-ponto-b`
3. Procure o arquivo **`Iniciar Editor.bat`**
4. **Dê dois cliques nele**
5. Vai abrir uma janela preta chamada "PontoB Server" — **não feche essa janela**, ela é o servidor rodando por trás. Pode minimizar se quiser.
6. Aguarde até 30 segundos. O navegador vai abrir sozinho em `http://localhost:3000` mostrando a tela inicial do editor.

Se o editor abrir, **o setup está completo, parabéns**.

**O que aconteceu por trás dos panos na primeira execução:**

- O `.bat` criou automaticamente um **atalho no seu Desktop** chamado "Ponto B - Video Editor", com o ícone do app (um "B" branco em gradiente azul com um símbolo de play). Da próxima vez você não precisa nem abrir a pasta do projeto — é só clicar no atalho do Desktop.
- O servidor do editor está rodando localmente na sua máquina (porta 3000). Ninguém fora da sua máquina consegue acessar.
- Você pode usar o editor normalmente enquanto a janela "PontoB Server" estiver aberta.

**Como encerrar o editor:**

- Feche a aba do navegador (opcional)
- **Feche a janela preta "PontoB Server"** — é isso que de fato para o servidor

**Como abrir o editor da próxima vez:**

- Opção 1: clique duas vezes no atalho "Ponto B - Video Editor" no Desktop
- Opção 2: abra a pasta `C:\repos\editor-reels-ponto-b` e clique no `Iniciar Editor.bat`
- Ambas as opções fazem a mesma coisa

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
│   ├── web/                    # Interface Next.js — upload, revisão, renderização
│   │   └── public/
│   │       ├── sfx/            # Efeitos sonoros disponíveis no editor
│   │       └── musica/         # Músicas de fundo disponíveis no editor
│   └── remotion/               # Componentes React → vídeo (1 componente por tipo de cena)
│       └── public/
│           ├── sfx/            # Mesmos arquivos de sfx/ (necessário para o render)
│           └── musica/         # Mesmos arquivos de musica/ (necessário para o render)
├── services/
│   ├── transcription/          # Python + faster-whisper
│   └── analysis/               # Node + Anthropic SDK (Claude analisa e gera scenes.json)
├── packages/
│   └── schema/                 # Schema Zod compartilhado (fonte de verdade dos tipos de cena)
├── especialistas/              # JSONs de cadastro de cada mentor
├── jobs/                       # Arquivos de cada execução — criado localmente, não versionado
├── docs/                       # Documentação detalhada
├── .env.example                # Template de variáveis de ambiente
└── .env                        # Suas variáveis locais — não versionar
```

---

## Assets de áudio

### Efeitos sonoros (SFX)

Os SFX aparecem no editor por cena — o usuário escolhe qual efeito toca na entrada de cada cena.

Para adicionar novos efeitos, copie o arquivo `.mp3` para **ambas** as pastas abaixo e reinicie a aplicação:

```
apps/web/public/sfx/nome-do-efeito.mp3
apps/remotion/public/sfx/nome-do-efeito.mp3
```

O arquivo precisa estar nas duas pastas porque o preview usa o servidor Next.js (`apps/web`) e o render usa o servidor do Remotion (`apps/remotion`). O nome do arquivo vira automaticamente o label exibido no editor (hífens e underscores viram espaços, palavras capitalizadas).

### Música de fundo

A música de fundo toca durante todo o reel, com volume controlável no editor.

Para adicionar novas músicas, copie o arquivo `.mp3` para **ambas** as pastas e reinicie:

```
apps/web/public/musica/nome-da-musica.mp3
apps/remotion/public/musica/nome-da-musica.mp3
```

Formatos suportados: `.mp3`, `.wav`, `.ogg`, `.m4a`.

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
→ Tente `python3` em vez de `python`. Se necessário: `brew install python@3.12`.

**Transcrição falha com `Command failed` e código `3221225477` / `0xC0000005`**
→ Access violation ao carregar o modelo. A `.venv` foi criada com Python 3.13/3.14, que puxa um `ctranslate2 ≥ 4.6` incompatível com a CPU. Recrie a venv com Python 3.12:
```powershell
cd services\transcription
Remove-Item -Recurse -Force .venv
py -3.12 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

**`DLL load failed while importing onnxruntime_pybind11_state` (Windows)**
→ Falta o Visual C++ Redistributable, exigido pelo `onnxruntime` (filtro VAD). Instale o [vc_redist.x64.exe](https://aka.ms/vs/17/release/vc_redist.x64.exe), reinicie o terminal e rode `npm run dev` de novo. Teste o import isolado com:
```bash
.\.venv\Scripts\python -c "import onnxruntime; print('onnx ok')"
```

---

## Documentação

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — estado atual, decisões, pendências
- [`docs/arquitetura.md`](docs/arquitetura.md) — pipeline completo e como o Remotion funciona
- [`docs/especialista.md`](docs/especialista.md) — schema completo do cadastro de Especialista
- [`docs/schema.md`](docs/schema.md) — schema do `scenes.json`
- [`docs/cenas-componentes.md`](docs/cenas-componentes.md) — detalhes de cada componente Remotion
- [`docs/prompt-claude-analise.md`](docs/prompt-claude-analise.md) — system prompt versionado do Claude
