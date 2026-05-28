# Arquitetura técnica

Como o pipeline funciona em detalhe. Documento educacional pra quem (humano ou agente) vai trabalhar no código.

## 1. Conceito fundamental do Remotion

Remotion é React renderizando vídeo. A premissa: **cada frame do vídeo final é uma "foto" da tela do navegador num instante específico**. Pra fazer um vídeo de 80s a 30fps, você gera 2400 fotos sequenciais. Remotion automatiza isso.

### Como o componente sabe que frame é

Todo componente Remotion tem acesso a `useCurrentFrame()`, que retorna em qual frame está sendo renderizado. É isso que permite programar animação:

```tsx
const Hook = () => {
  const frame = useCurrentFrame();
  const opacidade = frame < 30 ? frame / 30 : 1; // fade-in nos 30 frames iniciais
  return <h1 style={{ opacity: opacidade }}>SUA CLÍNICA PERDE...</h1>;
};
```

Quando Remotion renderiza o frame 0, opacidade = 0. Frame 15, opacidade = 0.5. Frame 30 em diante, opacidade = 1. Cada frame vira uma foto. 30 fotos por segundo = movimento.

### Como o vídeo bruto vira PNG (a ponte conceitual)

1. Você escreve componente React. React não desenha pixel — só atualiza o DOM do navegador.
2. Quem desenha pixel é o engine de renderização do Chrome (Blink). Ele lê HTML+CSS e pinta.
3. Chrome tem modo **headless** (sem janela visível) controlável via API (CDP — Chrome DevTools Protocol).
4. Uma das APIs do CDP é `Page.captureScreenshot`: pede um PNG da viewport atual.
5. Esse comando não sabe o que é React. Pra ele, é só "qual o estado pintado da viewport agora? Me dá um PNG."

Remotion controla isso com um loop:

```
pra cada frame de 0 até 2399:
   1. Define internamente: currentFrame = N
   2. Re-renderiza React (todos os useCurrentFrame() retornam N)
   3. React atualiza o DOM com o estado correspondente
   4. Chrome repinta com o novo DOM
   5. Manda CDP Page.captureScreenshot
   6. Salva PNG como frame_NNNN.png
   7. Próximo frame
```

**Não tem 30fps em tempo real.** Remotion vai no ritmo que a CPU/GPU aguentar. Cada PNG é uma foto da página HTML naquele estado específico. Quando você junta os 2400 PNGs num MP4, o olho humano vê movimento.

### Sequence: a timeline declarativa

Você não chama componentes diretamente, declara `<Sequence>`:

```tsx
<>
  <Sequence from={0}   durationInFrames={210}> <Hook props={...} /> </Sequence>           {/* 0-7s */}
  <Sequence from={210} durationInFrames={240}> <FraseImpacto props={...} /> </Sequence>   {/* 7-15s */}
  <Sequence from={450} durationInFrames={150}> <CTA props={...} /> </Sequence>            {/* 15-20s */}
</>
```

`from` e `durationInFrames` controlam quando aparece e por quanto tempo. **Dentro da cena, `useCurrentFrame()` reseta pra zero** — o componente Hook vê o frame 0 quando a cena começa, mesmo que a timeline global esteja no frame 100.

### Vídeo bruto entra como elemento React

```tsx
const Hook = ({ video_path, start_segundos }) => (
  <AbsoluteFill>
    <OffthreadVideo
      src={video_path}
      startFrom={start_segundos * 30}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    <h1 style={{ position: "absolute", top: "40%" }}>TÍTULO ANIMADO</h1>
  </AbsoluteFill>
);
```

Quando Remotion vai renderizar o frame da timeline com `<OffthreadVideo>`:
1. Calcula qual frame do vídeo bruto extrair (baseado em `startFrom` + frame atual)
2. Manda FFmpeg (em outra thread/processo — daí "offthread") extrair esse frame específico do MP4 bruto como JPG
3. Coloca essa imagem como `<img>` no DOM, ocupando a tela
4. Por cima, o resto do componente renderiza (texto sobreposto)
5. Chrome pinta o DOM completo (foto bruta + texto)
6. Screenshot vira PNG: aparece o quadro do vídeo bruto + texto por cima

**Os "cortes" do editor de vídeo tradicional não existem aqui.** Você não corta — você declara "essa cena dura 7 segundos e mostra o pedaço do bruto começando no segundo 5". O resultado visual é um corte, mas conceitualmente é uma janela sobre o vídeo bruto.

### Áudio entra separado

`<Audio src={video_path} startFrom={...} />` puxa o áudio. Pode usar áudio do vídeo bruto inteiro sincronizado com a fala original, ou cortar/concatenar pedaços pra acompanhar a edição.

Áudio nunca aparece no PNG. Áudio é processado em paralelo: Remotion lê os componentes `<Audio>`, sabe que segmento do áudio cobrir, e no final FFmpeg junta os 2400 PNGs + áudio compilado num MP4 só.

### Render final: como tudo vira MP4

Quando você roda `npx remotion render`:
1. Remotion bundla o React (Webpack)
2. Abre Chrome em modo headless
3. Pra cada frame da timeline (0 ao 2399): navega pro estado do componente, espera React renderizar, tira screenshot, salva PNG
4. No fim, FFmpeg pega os 2400 PNGs + áudio + monta MP4 final

```bash
ffmpeg -framerate 30 -i frame_%04d.png -i audio.wav -c:v libx264 reel_final.mp4
```

Tempo de render: ~1–3min por minuto de vídeo em CPU; mais rápido em GPU. Reel de 80s deve fechar em 3–4 minutos local.

## 2. Pipeline ponta-a-ponta

```
[vídeo bruto MP4]
     ↓ FFmpeg extrai áudio
[audio.wav 16kHz mono]
     ↓ faster-whisper (Python)
[transcript.json — segments + word timestamps]
     +
[especialista.json — perfil cadastrado]
     +
[brief.txt opcional]
     ↓ Claude Sonnet 4.6 (com prompt-caching)
[scenes.json — array variável de cenas tipadas]
     ↓ validação Zod
     ↓ revisão opcional do estrategista
     ↓ Remotion: bundle React + Chrome headless + screenshot loop
[2400 PNGs + áudio sincronizado]
     ↓ FFmpeg encode H.264
[reel_final.mp4 — 1080×1920, 30fps, 60–100s]
```

Cada etapa persiste em `jobs/<job_id>/`:
- `input.mp4` — vídeo bruto original
- `audio.wav` — áudio extraído
- `transcript.json` — saída do Whisper
- `scenes.json` — saída do Claude
- `output.mp4` — reel final

Falha em qualquer etapa permite retomada sem refazer as anteriores.

## 3. Onde Claude entra (e onde NÃO entra)

**Claude faz**:
- Lê transcrição com word-level timestamps
- Lê perfil do Especialista (tom, jargão, palavras a evitar, CTA padrão)
- Lê brief opcional do estrategista
- Decide quantas cenas fazem sentido (sem mínimo nem máximo fixo)
- Decide ordem das cenas
- Pra cada cena, escolhe **tipo** (do pool técnico de componentes Remotion existentes) e **props** (texto, números, qual segmento do vídeo bruto usar via `startFrom`)
- Retorna JSON estruturado validado por Zod

**Claude NÃO faz**:
- Não escreve código React/TS
- Não inventa números, mensagens ou cenários que o mentor não falou
- Não escolhe cor, tipografia, layout (isso vem do componente + perfil do Especialista)
- Não renderiza vídeo

## 4. Fronteira entre código e LLM

| Domínio | Quem decide |
|---|---|
| Estrutura visual (componentes Remotion, layout, animações) | Código TS escrito uma vez |
| Texto literal das cenas | Claude (extrai do transcript) |
| Quais números aparecem | Claude (só usa números literalmente ditos pelo mentor) |
| Quantas cenas, em que ordem | Claude (decide com base no conteúdo) |
| Tipo de cena de cada slot | Claude (escolhe do pool técnico disponível) |
| Cor de destaque, logo, identidade | Cadastro do Especialista (vai como prop pro componente) |
| Duração de cada cena | Claude propõe, validação Zod aceita se bater limites duros |

A regra prática: tudo que é **estrutura/forma** é codado. Tudo que é **conteúdo/texto** é decidido pelo Claude com base no que foi falado.
