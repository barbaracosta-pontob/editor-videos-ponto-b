# Serviço de Transcrição

Wrapper Python sobre `faster-whisper` para transcrever vídeos brutos com word-level timestamps. Saída JSON é a fonte de verdade pra etapa seguinte (análise Claude).

## Setup

```powershell
cd services\transcription
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Primeira execução baixa o modelo `large-v3` (~3 GB) automaticamente. Modelos ficam em cache (`~/.cache/huggingface/`).

## Uso

```powershell
python run.py --input ..\..\samples\video.mp4 --output ..\..\jobs\teste01\transcript.json
```

Argumentos:
- `--input` (obrigatório) — caminho do vídeo
- `--output` (obrigatório) — caminho do JSON
- `--model` — default `large-v3`. Alternativas: `medium`, `small`, `tiny` (mais rápidos, qualidade menor)
- `--device` — `auto` / `cuda` / `cpu`. Default `auto`
- `--language` — default `pt`
- `--beam-size` — default `5`. Maior = mais preciso, mais lento

Saída JSON:

```json
{
  "language": "pt",
  "language_probability": 1.0,
  "duration": 47.232,
  "segments": [
    {
      "id": 1,
      "start": 0.0,
      "end": 5.1,
      "text": "Se você quer viver com 20 mil reais por mês...",
      "words": [
        { "word": "Se", "start": 0.0, "end": 0.04, "probability": 0.976 },
        { "word": "você", "start": 0.04, "end": 0.22, "probability": 0.999 }
      ]
    }
  ],
  "metadata": {
    "model": "large-v3",
    "device": "cpu",
    "compute_type": "int8",
    "beam_size": 5,
    "elapsed_seconds": 62.3
  }
}
```

## Decisões técnicas

- **Modelo**: `large-v3` em produção. Melhor qualidade pra PT-BR. Tradeoff: lento em CPU pura (~0.5x realtime), aceitável em GPU NVIDIA (3-5x realtime).
- **VAD filter**: ligado, remove silêncios longos antes da transcrição (`min_silence_duration_ms=500`).
- **Word timestamps**: obrigatórios. Alimentam animação de palavras destacadas no Remotion.
- **Beam size**: 5 (default). Aumentar reduz erros mas custa tempo.

## Performance medida

| Vídeo | Duração | Modelo | Device | Tempo | Realtime factor |
|---|---|---|---|---|---|
| VID AD 01 | 47s | large-v3 | CPU | 62s | 0.76x |

(Atualizar com mais medições conforme rodamos vídeos reais.)

## Limitações conhecidas

- Áudio com eco/ruído pesado degrada qualidade. Avaliar SNR antes de transcrever (a fazer).
- Falas sobrepostas (vários falantes ao mesmo tempo) confundem. Whisper assume falante único — adequado pro caso da Ponto B (mentor sozinho na câmera).
- Números pronunciados com ambiguidade ("dois milhões e meio") podem ser transcritos como texto em vez de dígitos. Aceitar e tratar no prompt do Claude.
