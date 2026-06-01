# Pool técnico de componentes Remotion

> ⚠️ Lista preliminar. Validação final pendente com Artur.

Catálogo de tipos de cena disponíveis. Cada item é um componente React parametrizável escrito uma vez em `apps/remotion/src/scenes/`. Claude escolhe da paleta — não escreve código React.

Princípio guia: **componentes altamente parametrizáveis, agnósticos de nicho**. Mesma componente serve clínica, investimento, educação, coaching — só muda o conteúdo.

## Tipos propostos no MVP

### 1. `Hook`

Título grande animado sobre vídeo do mentor cortado. Palavras destacadas em cor configurável. Equivalente à cena 01 do vídeo de referência.

**Props**:
```ts
{
  tipo: "Hook";
  titulo: string;                    // ex: "VIVER COM 20 MIL POR MÊS EXIGE 2 MILHÕES"
  subtitulo?: string;
  palavras_destacadas: Array<{
    palavra: string;
    cor?: "primaria" | "secundaria";  // resolve via cadastro do Especialista
  }>;
  video_path: string;                 // mp4 bruto
  start_segundos: number;             // de qual segundo do bruto começar
  duracao_segundos: number;           // 4-8s tipicamente
  animacao_entrada?: "spring" | "fade" | "slide";
}
```

**Casos de uso**: abertura de qualquer reel onde o mentor tem uma frase de impacto inicial.

---

### 2. `FraseImpacto`

Texto cheio sobre fundo escuro (navy). Sem vídeo. Pra frases-chave que merecem destaque visual completo. Palavras destacadas opcionais.

**Props**:
```ts
{
  tipo: "FraseImpacto";
  texto: string;
  palavras_destacadas?: Array<{ palavra: string; cor?: "primaria" | "secundaria" }>;
  alinhamento?: "centro" | "esquerda";
  duracao_segundos: number;          // 4-10s
  fundo?: "navy" | "preto" | "gradiente";
}
```

**Casos de uso**: insights, conclusões, reframes do mentor que merecem pausa visual.

---

### 3. `ComparativoNumerico`

Visualização lado-a-lado com 2 ou 3 grupos numéricos. Substitui "bonecos comparativos" do vídeo de referência por algo genérico.

**Props**:
```ts
{
  tipo: "ComparativoNumerico";
  metrica_nome: string;              // ex: "Capital pra render 20k/mês"
  metrica_unidade: string;            // ex: "R$", "%", "horas"
  lados: Array<{
    valor: number | string;           // string permite "2 mi", "8h", etc
    rotulo: string;                   // ex: "Tradicional"
    eh_destaque?: boolean;            // o lado vencedor ganha emphasis visual
  }>;                                  // 2 ou 3 lados
  visualizacao: "barras" | "numeros_grandes" | "bonecos";
  duracao_segundos: number;          // 5-8s
}
```

**Casos de uso**: contrastar antes/depois, com método/sem método, tradicional/acelerado, etc — em qualquer nicho que o mentor cite números.

---

### 4. `CitacaoMentor`

Vídeo do mentor cortado, com 1 a 3 frases-chave aparecendo em lower-third sequencial. Equivalente à cena 08 do vídeo de referência.

**Props**:
```ts
{
  tipo: "CitacaoMentor";
  video_path: string;
  start_segundos: number;
  duracao_segundos: number;          // 8-15s
  nome_mentor: string;                // do cadastro do Especialista
  cargo_mentor: string;
  frases: string[];                   // 1-3 frases curtas, max 10 palavras cada
  estilo_lower_third?: "barra_inferior" | "card_lateral";
}
```

**Casos de uso**: síntese final do mentor, recapitulação dos pontos-chave.

---

### 5. `ListaPontos`

3 a 5 tópicos curtos animados em sequência. Sem vídeo. Cada item entra por spring/fade.

**Props**:
```ts
{
  tipo: "ListaPontos";
  titulo?: string;                    // opcional, ex: "3 PASSOS"
  pontos: string[];                   // 3-5 itens, max 8 palavras cada
  numerado?: boolean;                  // mostra 1, 2, 3 antes de cada item
  duracao_segundos: number;          // 6-12s
  fundo?: "navy" | "preto" | "gradiente";
}
```

**Casos de uso**: passo a passo, lista de erros comuns, checklist do método, principais bandeiras.

---

### 6. `CTA`

Encerramento full navy com chamada de ação. Texto principal + texto secundário opcional + seta animada. Equivalente à cena 09 do vídeo de referência.

**Props**:
```ts
{
  tipo: "CTA";
  texto_principal: string;            // ex: "Comente MARATONA aqui embaixo"
  texto_secundario?: string;          // ex: "Vou te enviar a inscrição"
  duracao_segundos: number;          // 3-6s
  mostrar_seta?: boolean;
  cor_seta?: "primaria" | "secundaria";
}
```

**Casos de uso**: fechamento de qualquer reel.

---

## O que NÃO entra no MVP

Tipos que considerei mas decidi cortar:

- `TextoExplicativo` (parágrafo longo) — tende a virar parede de texto e quebrar ritmo de reel.
- `GraficoAnimado` (linha/área temporal) — overhead de implementação alto, casos raros.
- `ImagemSobreposta` (logo, foto, captura) — adicionar conforme necessidade real surgir.
- `Transicao` (componente entre cenas) — Remotion já oferece transitions nativas; não precisa modelar como cena.

Adicionar componentes novos = ticket de feature: codo, testo, fica disponível pra todos os Especialistas a partir do merge.

## Como Claude escolhe

Pro Claude, esse pool é apresentado como lista de "tipos disponíveis" no system prompt. Claude pode escolher qualquer um deles, em qualquer ordem, qualquer quantidade — desde que:

1. Tenha base no que o mentor falou
2. Respeite limites duros de duração total (60–100s)
3. Use sempre `CTA` como última cena
4. Não invente conteúdo

Detalhes em `docs/prompt-claude.md`.

## Fronteira: parametrização vs novo componente

Pergunta de design recorrente: **quando aceitar uma nova prop num componente existente vs criar componente novo?**

Regra prática:
- Mudou só **conteúdo** (texto, número, cor) → prop nova no existente
- Mudou **estrutura visual** (layout fundamentalmente diferente) → componente novo

Ex: `ComparativoNumerico` aceita 2 ou 3 lados via array → mesma componente. Mas se aparecer caso "comparativo de gráfico de linha temporal", isso é estrutura nova → componente `GraficoAnimado` separado.

## Estado de implementação

| Componente | Implementado? | Arquivo |
|---|---|---|
| `Hook` | Parcial (modelo antigo) | `apps/remotion/src/scenes/HookScene.tsx` |
| `CTA` | Parcial (modelo antigo) | `apps/remotion/src/scenes/CtaFullNavyScene.tsx` |
| `FraseImpacto` | ❌ a implementar | — |
| `ComparativoNumerico` | ❌ a implementar | — |
| `CitacaoMentor` | ❌ a implementar | — |
| `ListaPontos` | ❌ a implementar | — |

Os componentes existentes (`HookScene`, `CtaFullNavyScene`) estão amarrados ao schema antigo de 9 cenas fixas. Refatorar pra receber props do modelo novo na Fase 1.
