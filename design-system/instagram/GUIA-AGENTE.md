# Guia do agente — do `post.md` aos cards e à legenda

Para quem recebe um `instagram/<data>-<slug>/post.md` e precisa entregar `cards.json`, `legenda.json` e os PNGs. Marca, grade e tipografia já estão decididas em `../fundamentos-instagram.md`, `instagram.css` e `formatos.json` — **não reinvente**.

## Os cinco passos

1. **Leia `post.md`** (frontmatter `tipo`, seções `## …`). Se faltar título, autores ou link no `artigo`, ou nome no `aviso`, pergunte antes de escrever.
2. **Escreva `cards.json`** (formato abaixo). `artigo`: `capa` + 1 a 8 `ideia` + `fim`, no máximo 10 cards; uma ideia por card, tirada do resumo, na ordem em que o artigo apresenta. `aviso`: um card `aviso`.
3. **Escreva `legenda.json`**: `gancho` (uma frase, ≤ 125 caracteres, o que aparece antes do "mais" — pergunta ou fato surpreendente), `corpo` (2 a 4 parágrafos curtos, sem repetir os cards palavra por palavra), `autores` (artigo: por extenso, `@` de quem tiver — ex.: `"Maria Silva (@mariasilva), João Souza"`; aviso: `null`), `hashtags_tema` (3 a 4, `#CamelCase` sem acento, pelo mesmo critério das tags do YouTube: nome do tema, área, apelidos de `../miniaturas/catalogo.json`).
4. **Gere e valide**: `node design-system/scripts/gerar-cards.mjs instagram/<pasta>` e `node scripts/legenda.mjs instagram/<pasta>`. Os dois recusam o que não cabe (`erro: …`); corrija o JSON, nunca o CSS.
5. **Olhe cada PNG** (`open instagram/<pasta>/card-*.png`): texto inteiro, nada encostando no rodapé, contador certo. Reduza mentalmente a 400 px: o título lê? Só então mostre à pessoa.

## `cards.json`

```json
{ "tipo": "artigo",
  "cards": [
    { "tipo": "capa",  "titulo": "TÍTULO ORIGINAL", "autores": "Nome, Nome", "onde": "SBPO 2026" },
    { "tipo": "ideia", "titulo": "Ideia em 40 caracteres", "texto": "Até 280 caracteres. Pode ter\numa quebra de linha." },
    { "tipo": "fim",   "texto": "SOBRENOME, N. Título. Evento/Revista, ano.", "link": "doi.org/…" }
  ] }
```
Aviso: `{ "tipo": "aviso", "cards": [ { "tipo": "aviso", "kicker": "PRAZO", "titulo": "Chamada de trabalhos SBPO", "data": "ATÉ 15/03", "texto": "…", "link": "sbpo.org.br" } ] }`. `kicker` opcional (padrões: RESUMO DE ARTIGO, REFERÊNCIA, AVISO); use PRAZO, EVENTO, VAGA, EDITAL, RECONHECIMENTO conforme o caso. Limites por campo em `formatos.json`.

## Regras de copy

- Capa: título original em caixa alta (o gerador não converte — escreva como deve aparecer), sem traduzir. Autores por extenso, separados por vírgula, sem `@` (o `@` vai na legenda).
- Ideia: título curto nominal ("O problema", "O algoritmo", "Por que funciona"); texto que se sustenta sozinho, sem "como vimos no card anterior".
- Fim: referência no padrão ABNT curto; link sem `https://`.
- Aviso: data sempre com "ATÉ"; sem data para reconhecimento (`data` omitido).
- Nunca: emoji nos cards, ponto de exclamação, "arraste", "link na bio" dentro do card, frase de marketing.

## Comandos

```bash
node design-system/scripts/gerar-cards.mjs instagram/<pasta>            # card-NN.png
node design-system/scripts/gerar-cards.mjs instagram/<pasta> --so-html  # só HTML, para inspecionar
node scripts/legenda.mjs instagram/<pasta>                              # legenda.txt
node scripts/instagram.mjs --status                                     # conta, token, cota
node scripts/instagram.mjs --publicar instagram/<pasta>                 # publica (skill post decide quando)
node design-system/scripts/gerar-story.mjs videos/<slug>                # story.png de vídeo novo
node design-system/scripts/gerar-story-video.mjs instagram/<pasta>      # story-NN.mp4 de stories.json (sequência didática; stickers à mão, ver stories.md)
```

## Nunca

- Mexer em `instagram.css` ou nos layouts para um post caber — corte o texto.
- Publicar sem a pessoa ter olhado os PNGs e a legenda.
- Gerar story pela API (não põe o sticker de link): o story é sempre manual.
