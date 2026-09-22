# Guia do agente — do `post.md` aos cards, à Checagem e à legenda

Para quem recebe um `instagram/<data>-<slug>/post.md` e precisa entregar `cards.json`, `checagem.json`, `legenda.json` e os PNGs (e, para stories e reels, `stories.json`/`reel.json` — ver as skills `stories` e `reel`). Marca, grade e tipografia já estão decididas em `../fundamentos-instagram.md`, `instagram.css` e `formatos.json` — **não reinvente**.

## Os seis passos

1. **Leia `post.md`** (frontmatter `tipo`, seções `## …`). Se faltar título, autores ou link no `artigo`, nome no `aviso`, tema e fonte na `curiosidade`, ou origem na `citacao`, pergunte antes de escrever.
2. **Escreva `cards.json`** (formato abaixo). `artigo`: `capa` + 1 a 8 `ideia` + `fim`, no máximo 10 cards; uma ideia por card, tirada do resumo, na ordem em que o artigo apresenta. `aviso`: um card `aviso`. `curiosidade`: um card `curiosidade` — `titulo` é o fato em até 80 caracteres (afirmativo, sem "você sabia" no texto: o kicker já diz), `texto` a explicação em até 320, `fonte` a referência em uma linha (autor, ano ou nome do site). A Checagem (passo 3) confere o fato na fonte do `post.md`; sem fonte acessível, a afirmação vai como `sem-acesso` em `checagem.json` e a pessoa decide na parada de aprovação (ADR-0009: a Checagem nunca bloqueia sozinha). `citacao`: rode `node scripts/citacao.mjs --candidatos <origem>`, mostre 2 a 3 à pessoa com a origem de cada um, e só depois escreva o card (`texto` ≤ 240, exatamente como está na origem — sem "melhorar" a frase; `origem` = título do vídeo ou do post). Kicker `DA AULA` para vídeo, `DO POST` para post. Sem Checagem: a origem já passou por ela.
3. **Faça a Checagem** (ADR-0009) e escreva `checagem.json`. Para cada afirmação factual ou numérica dos cards (o que o artigo diz, um número, uma data, "prova que", "é o primeiro a"), uma entrada `{ "onde": "card N", "texto": "…", "tipo": "fonte" | "conta", "fonte": "<URL>", "resultado": "confirmada" | "nao-confirmada" | "sem-acesso", "como": "…" }`:
   - `fonte`: busque a fonte pelo link do `post.md` (WebFetch do DOI/URL; se cair em página paga, tente o resumo/abstract ou a versão do autor). Compare o que o card afirma com o que o texto diz. `como` traz o trecho ou a seção que sustenta — ou, se não sustenta, o que o texto diz de diferente. Se o site do editor bloquear acesso automático (ams.org, JSTOR e sites parecidos retornam 403), antes de declarar `sem-acesso` tente a cópia do Wayback Machine (`https://web.archive.org/web/2024/<URL do PDF ou da página>`). Sem acesso: `"sem-acesso"` e diga em `como` onde tentou. Campo `"fonte"` é omitido quando `"tipo": "conta"`.
   - `conta`: refaça a conta por um caminho **diferente** do texto (enumere as combinações num `node -e "…"`, resolva de outro jeito) e cole a conta em `como`. Divergiu? Corrija o card ou o `resultado`.
   - `curiosidade`: a afirmação principal é o título; se o `post.md` traz link, é `fonte`; se traz só "li em tal lugar", procure a fonte primária (WebSearch) e registre a URL que usou.
   - Uma afirmação `nao-confirmada` não some sozinha: reescreva o card para o que a fonte sustenta **ou** deixe como está e mostre à pessoa — é ela quem decide. Nunca "confirme" o que não leu.
   Valide e veja o resumo: `node scripts/checagem.mjs instagram/<pasta>`. `artigo` e `curiosidade` não publicam sem este arquivo; `aviso` e `citacao` não precisam dele.
4. **Escreva `legenda.json`**: `gancho` (uma frase, ≤ 125 caracteres, o que aparece antes do "mais" — pergunta ou fato surpreendente), `corpo` (2 a 4 parágrafos curtos, sem repetir os cards palavra por palavra), `autores` (artigo: por extenso, `@` de quem tiver — ex.: `"Maria Silva (@mariasilva), João Souza"`; aviso: `null`), `hashtags_tema` (3 a 4, `#CamelCase` sem acento, pelo mesmo critério das tags do YouTube: nome do tema, área, apelidos de `../miniaturas/catalogo.json`).
5. **Gere e valide**: `node design-system/scripts/gerar-cards.mjs instagram/<pasta>` e `node scripts/legenda.mjs instagram/<pasta>`. Os dois recusam o que não cabe (`erro: …`); corrija o JSON, nunca o CSS.
6. **Olhe cada PNG** (`open instagram/<pasta>/card-*.png`): texto inteiro, nada encostando no rodapé, contador certo. Reduza mentalmente a 400 px: o título lê? Só então mostre à pessoa.

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

Curiosidade: `{ "tipo": "curiosidade", "cards": [ { "tipo": "curiosidade", "titulo": "O SIMPLEX TEM MAIS DE 75 ANOS", "texto": "…", "fonte": "Dantzig, 1947" } ] }`.

## Regras de copy

- Capa: título original em caixa alta (o gerador não converte — escreva como deve aparecer), sem traduzir. Autores por extenso, separados por vírgula, sem `@` (o `@` vai na legenda).
- Ideia: título curto nominal ("O problema", "O algoritmo", "Por que funciona"); texto que se sustenta sozinho, sem "como vimos no card anterior".
- Fim: referência no padrão ABNT curto; link sem `https://`.
- Aviso: data sempre com "ATÉ"; sem data para reconhecimento (`data` omitido).
- Curiosidade: título em caixa alta como a capa; explicação que ensina, não só anuncia; fonte curta, sem link (o link vai na legenda se couber, senão "link na bio").
- Citação: a frase é copiada, não reescrita; a origem tem o título como foi publicado.
- Nunca: emoji nos cards, ponto de exclamação, "arraste", "link na bio" dentro do card, frase de marketing.

## Comandos

```bash
node design-system/scripts/gerar-cards.mjs instagram/<pasta>            # card-NN.png
node design-system/scripts/gerar-cards.mjs instagram/<pasta> --so-html  # só HTML, para inspecionar
node scripts/legenda.mjs instagram/<pasta>                              # legenda.txt
node scripts/checagem.mjs instagram/<pasta>                             # valida checagem.json e imprime o resumo da Checagem
node scripts/instagram.mjs --status                                     # conta, token, cota
node scripts/instagram.mjs --publicar instagram/<pasta>                 # publica (skill post decide quando)
node design-system/scripts/gerar-story.mjs videos/<slug>                # story.png de vídeo novo
node design-system/scripts/gerar-story-video.mjs instagram/<pasta>      # story-NN.mp4 de stories.json (sequência didática; stickers à mão, ver stories.md)
node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta>          # story-aviso.mp4 (aviso de post novo, sem sticker)
node scripts/instagram.mjs --publicar-story instagram/<pasta> story-aviso.mp4  # publica um story sem sticker
node scripts/instagram.mjs --publicar-stories instagram/<pasta>               # publica a sequência (stories.json com "publicacao": "api")
node scripts/citacao.mjs --candidatos <videos/<slug> | instagram/<pasta>>     # trechos para um post citacao
node scripts/corte.mjs --candidatos videos/<slug>                             # trechos de vídeo público para um reel
node design-system/scripts/gerar-reel.mjs instagram/<pasta>                   # reel.json → reel.mp4
node scripts/legenda.mjs instagram/<pasta> --reel                             # reel-legenda.txt
node scripts/instagram.mjs --publicar-reel instagram/<pasta>                  # publica o reel
```

## Nunca

- Mexer em `instagram.css` ou nos layouts para um post caber — corte o texto.
- Publicar sem a pessoa ter olhado os PNGs e a legenda.
- Publicar `artigo` ou `curiosidade` sem `checagem.json` — e nunca marcar "confirmada" o que você não leu na fonte.
- Publicar pela API um story que precisa de sticker (link, quiz nativo, enquete): a API não põe sticker. O story de vídeo novo é sempre manual; sequências sem sticker (`"publicacao": "api"`) e o story de aviso saem pela API (ADR-0007).
