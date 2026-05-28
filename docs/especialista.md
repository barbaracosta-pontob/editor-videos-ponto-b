# Cadastro de Especialista

> ⚠️ Schema preliminar. Campos exatos pendentes de validação final com Artur.

Cada Especialista cadastrado representa um mentor/expert que aparece nos vídeos brutos da Ponto B. O cadastro informa contexto pro Claude calibrar a geração de cenas: tom de voz, jargão, palavras a evitar, CTA padrão.

Antes de gerar um reel, o estrategista escolhe qual Especialista é o autor do vídeo bruto.

## Local de armazenamento

Arquivos JSON em `especialistas/<slug>.json` na raiz do repo.

Exemplo:

```
especialistas/
  ├── mateus-castro.json
  ├── ana-silva.json
  └── joao-pereira.json
```

A UI de cadastro (a construir em Fase 3) cria/edita esses arquivos.

## Schema proposto (a validar)

```json
{
  "slug": "mateus-castro",
  "nome": "Mateus Castro",
  "cargo": "Especialista em renda passiva",
  "area_atuacao": "Investimentos / Renda passiva via opções",
  "publico_alvo": "Investidores que querem viver de renda",
  "tom_de_voz": "Direto, analítico, técnico. Foca em números e mecânica do método.",
  "bandeiras": [
    "liberdade financeira",
    "renda passiva",
    "estratégia"
  ],
  "palavras_chave_recorrentes": [
    "opções",
    "dividendos",
    "renda fixa",
    "rentabilidade"
  ],
  "palavras_a_evitar": [
    "fórmula",
    "segredo",
    "ganho fácil",
    "milagre"
  ],
  "cta_padrao": {
    "formato": "comente_palavra",
    "palavra_ou_evento": "MARATONA",
    "texto_secundario": "Vou te enviar a inscrição"
  },
  "identidade_visual": {
    "cor_destaque_primaria": "#E63946",
    "cor_destaque_secundaria": "#F5C518",
    "logo_path": null
  },
  "observacoes": "Costuma usar exemplos numéricos concretos. Evita anedotas longas."
}
```

## Como cada campo é usado pelo Claude

| Campo | Uso |
|---|---|
| `nome`, `cargo` | Vai pro componente `CitacaoMentor` (lower-third) |
| `area_atuacao` | Contexto pro Claude entender o nicho do conteúdo |
| `publico_alvo` | Calibra linguagem da cena (técnica vs acessível) |
| `tom_de_voz` | Influencia escolha de palavras nos textos das cenas |
| `bandeiras` | Termos a priorizar como palavras-chave destacadas |
| `palavras_chave_recorrentes` | Confirma jargão técnico que deve ser preservado, não simplificado |
| `palavras_a_evitar` | Filtro absoluto. Se o mentor falou e Claude tem que reaproveitar, reescreve usando sinônimo |
| `cta_padrao.formato` | Define como a cena CTA é gerada (`comente_palavra`, `link_bio`, `inscricao_evento`) |
| `cta_padrao.palavra_ou_evento` | Texto principal do CTA (ex: "Comente MARATONA aqui embaixo") |
| `identidade_visual.cor_destaque_primaria` | Vai como prop `cor` pros componentes Remotion (palavras destacadas) |
| `identidade_visual.logo_path` | Sobreposição opcional em cenas selecionadas |
| `observacoes` | Texto livre. Claude lê como contexto adicional |

## Tipos de CTA suportados

```
formato: "comente_palavra" | "link_bio" | "inscricao_evento" | "comentario_aberto"
```

- `comente_palavra` — "Comente [PALAVRA] aqui embaixo. Vou te enviar [X]"
- `link_bio` — "Acesse o link na bio pra [X]"
- `inscricao_evento` — "Inscreva-se na [evento] no link aqui"
- `comentario_aberto` — "Comenta aqui [pergunta aberta sobre o tema]"

## Próximas decisões pendentes

1. Validar com Artur se esses são os campos corretos ou faltam coisas.
2. Definir se cadastro tem versão (ex: histórico de mudanças no perfil quando o tom evolui).
3. Definir UI de criação/edição (formulário Next.js ou só edição manual de JSON).
4. Definir se o cadastro pode ter múltiplas variações por especialista (ex: "Mateus modo formal" vs "Mateus modo conversa").
