# Schema do `scenes.json`

Contrato estrito entre Claude (saída) e Remotion (entrada). Validado por Zod em `packages/schema/scenes.ts`. Se Claude devolver JSON que não bate, retry; se falhar 3x, aborta com erro acionável.

## Schema TypeScript (modelo novo, a implementar)

```ts
import { z } from "zod";

// ============================================================
// Sub-schemas reutilizados
// ============================================================

const PalavraDestacadaSchema = z.object({
  palavra: z.string().min(1),
  cor: z.enum(["primaria", "secundaria"]).optional(),  // resolve via Especialista
});

const LadoComparativoSchema = z.object({
  valor: z.union([z.number(), z.string()]),
  rotulo: z.string().min(1),
  eh_destaque: z.boolean().optional(),
});

// ============================================================
// Cenas tipadas (discriminated union por `tipo`)
// ============================================================

export const HookSchema = z.object({
  tipo: z.literal("Hook"),
  titulo: z.string().min(1).max(120),
  subtitulo: z.string().nullable().optional(),
  palavras_destacadas: z.array(PalavraDestacadaSchema).max(3),
  video_path: z.string(),
  start_segundos: z.number().min(0),
  duracao_segundos: z.number().min(3).max(10),
  animacao_entrada: z.enum(["spring", "fade", "slide"]).optional(),
});

export const FraseImpactoSchema = z.object({
  tipo: z.literal("FraseImpacto"),
  texto: z.string().min(1),
  palavras_destacadas: z.array(PalavraDestacadaSchema).max(3).optional(),
  alinhamento: z.enum(["centro", "esquerda"]).optional(),
  duracao_segundos: z.number().min(3).max(12),
  fundo: z.enum(["navy", "preto", "gradiente"]).optional(),
});

export const ComparativoNumericoSchema = z.object({
  tipo: z.literal("ComparativoNumerico"),
  metrica_nome: z.string().min(1),
  metrica_unidade: z.string().min(1),
  lados: z.array(LadoComparativoSchema).min(2).max(3),
  visualizacao: z.enum(["barras", "numeros_grandes", "bonecos"]),
  duracao_segundos: z.number().min(4).max(10),
});

export const CitacaoMentorSchema = z.object({
  tipo: z.literal("CitacaoMentor"),
  video_path: z.string(),
  start_segundos: z.number().min(0),
  duracao_segundos: z.number().min(6).max(15),
  nome_mentor: z.string().min(1),
  cargo_mentor: z.string().min(1),
  frases: z.array(z.string().min(1)).min(1).max(3),
  estilo_lower_third: z.enum(["barra_inferior", "card_lateral"]).optional(),
});

export const ListaPontosSchema = z.object({
  tipo: z.literal("ListaPontos"),
  titulo: z.string().optional(),
  pontos: z.array(z.string().min(1)).min(3).max(5),
  numerado: z.boolean().optional(),
  duracao_segundos: z.number().min(5).max(15),
  fundo: z.enum(["navy", "preto", "gradiente"]).optional(),
});

export const CtaSchema = z.object({
  tipo: z.literal("CTA"),
  texto_principal: z.string().min(1),
  texto_secundario: z.string().nullable().optional(),
  duracao_segundos: z.number().min(3).max(8),
  mostrar_seta: z.boolean().optional(),
  cor_seta: z.enum(["primaria", "secundaria"]).optional(),
});

export const CenaSchema = z.discriminatedUnion("tipo", [
  HookSchema,
  FraseImpactoSchema,
  ComparativoNumericoSchema,
  CitacaoMentorSchema,
  ListaPontosSchema,
  CtaSchema,
]);

// ============================================================
// Schema raiz
// ============================================================

export const ReelPropsSchema = z
  .object({
    duracao_total_estimada: z.number().min(40).max(120),
    especialista_slug: z.string(),                    // referência ao especialistas/<slug>.json
    palavra_chave_metodo: z.string().nullable().optional(),
    cenas: z.array(CenaSchema).min(3).max(12),       // sequência variável, 3 a 12 cenas
  })
  .refine(
    (data) => {
      // Soma das durações próxima do duracao_total_estimada (±5s)
      const soma = data.cenas.reduce((acc, c) => acc + c.duracao_segundos, 0);
      return Math.abs(soma - data.duracao_total_estimada) <= 5;
    },
    { message: "Soma das durações das cenas não bate com duracao_total_estimada (±5s permitido)" },
  )
  .refine(
    (data) => data.cenas[data.cenas.length - 1].tipo === "CTA",
    { message: "Última cena deve ser do tipo CTA" },
  );

export type ReelProps = z.infer<typeof ReelPropsSchema>;
export type Cena = z.infer<typeof CenaSchema>;
```

## Regras de validação (resumo)

1. **3 a 12 cenas**. Sem mínimo nem máximo fixo de cada tipo.
2. **Última cena sempre `CTA`**. Reel sem CTA não é reel.
3. **Duração total entre 40s e 120s**, soma das cenas bate com `duracao_total_estimada` (±5s).
4. **Limites duros por cena** definidos em cada schema (ex: Hook 3–10s, ListaPontos 5–15s).
5. **Máximo 3 palavras destacadas** por cena (em cenas que suportam destaque).
6. **`video_path` e `start_segundos`** consistentes — `start_segundos` deve estar dentro da duração do vídeo bruto (validar fora do Zod, no orquestrador).
7. **`especialista_slug`** deve apontar pra um arquivo existente em `especialistas/`.

## Exemplo válido (vídeo VID AD 01 — Maratona Dividendos Turbinados)

> Esse exemplo é ilustrativo. Conteúdo real virá da análise Claude do transcript real.

```json
{
  "duracao_total_estimada": 50,
  "especialista_slug": "mateus-castro-investimentos",
  "palavra_chave_metodo": "MARATONA",
  "cenas": [
    {
      "tipo": "Hook",
      "titulo": "20 MIL POR MÊS EXIGE 2 MILHÕES INVESTIDOS",
      "subtitulo": "Do jeito tradicional",
      "palavras_destacadas": [
        { "palavra": "20 MIL", "cor": "primaria" },
        { "palavra": "2 MILHÕES", "cor": "primaria" }
      ],
      "video_path": "jobs/teste01/input.mp4",
      "start_segundos": 0,
      "duracao_segundos": 9,
      "animacao_entrada": "spring"
    },
    {
      "tipo": "ComparativoNumerico",
      "metrica_nome": "Capital pra render 20 mil/mês",
      "metrica_unidade": "R$",
      "lados": [
        { "valor": "2 mi", "rotulo": "Tradicional" },
        { "valor": "1 mi", "rotulo": "Com opções", "eh_destaque": true }
      ],
      "visualizacao": "numeros_grandes",
      "duracao_segundos": 7
    },
    {
      "tipo": "FraseImpacto",
      "texto": "Você dobra a renda sem aumentar o risco",
      "palavras_destacadas": [
        { "palavra": "dobra", "cor": "primaria" }
      ],
      "alinhamento": "centro",
      "duracao_segundos": 6,
      "fundo": "navy"
    },
    {
      "tipo": "CitacaoMentor",
      "video_path": "jobs/teste01/input.mp4",
      "start_segundos": 28,
      "duracao_segundos": 10,
      "nome_mentor": "Mateus Castro",
      "cargo_mentor": "Especialista em renda passiva",
      "frases": [
        "Isso é estratégia, não sorte",
        "Opções junto dos investimentos",
        "Acelera a liberdade financeira"
      ]
    },
    {
      "tipo": "ListaPontos",
      "titulo": "3 AULAS GRATUITAS",
      "pontos": [
        "Como usar opções com segurança",
        "Quanto rende na prática",
        "Quanto tempo leva pra acelerar"
      ],
      "numerado": true,
      "duracao_segundos": 9
    },
    {
      "tipo": "CTA",
      "texto_principal": "Comente MARATONA aqui embaixo",
      "texto_secundario": "Vou te enviar o link da inscrição",
      "duracao_segundos": 5,
      "mostrar_seta": true
    }
  ]
}
```

## Diferenças do schema antigo (descartado)

- ❌ Antes: `cenas` era `z.tuple([...9 schemas fixos...])` (sempre 9, na ordem definida).
- ✅ Agora: `cenas` é `z.array(CenaSchema).min(3).max(12)` (variável, 3 a 12).
- ❌ Antes: cada cena tinha `id` fixo (`"01_hook"`, `"02_split_improviso"`, etc).
- ✅ Agora: cada cena tem `tipo` (`"Hook"`, `"FraseImpacto"`, etc) escolhido livremente, sem ordem ou cardinalidade pré-definida.
- ❌ Antes: cenas específicas como `SplitImproviso`/`SplitPrevisivel` (amarrado a caso de WhatsApp).
- ✅ Agora: `ComparativoNumerico` genérico, sem amarração visual a um nicho.
- ❌ Antes: schema raiz tinha `tema_visual`, `nome_metodo`, `palavra_chave_comentario`.
- ✅ Agora: schema raiz tem `especialista_slug` (resolve identidade visual + CTA padrão indiretamente) + `palavra_chave_metodo` opcional.

## Arquivo de implementação

`packages/schema/scenes.ts` — atualmente contém o schema antigo (a refatorar na Fase 1 conforme este documento).
