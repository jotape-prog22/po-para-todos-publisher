# Braço Instagram — formatos automáticos e rigor de conteúdo

Data: 2026-09-21. Aprovado em conversa (sessão de `grilling` + `grill-with-docs`). Continua `2026-09-20-braco-instagram-design.md`: aquela spec cobria o MVP (`artigo`, `aviso`, story de vídeo novo); esta cobre os formatos automáticos a partir de um pedido — story de aviso, quiz, `curiosidade`, `citação`, `reel` — e, principalmente, como a pipeline evita publicar besteira.

## Objetivo

Ainda não é sobre publicação autônoma: todo formato nasce de um pedido explícito da pessoa (`eu peço → o sistema gera → eu aprovo → publica`). O que esta fase resolve é o que produzir a partir desse pedido, e — o foco real — um passo de **Checagem** que confere afirmações factuais e numéricas antes da aprovação, em vez de confiar cegamente no texto que a pessoa forneceu. Vocabulário completo em `CONTEXT.md` (termos `Story`, `Story de vídeo novo`, `Sequência de stories`, `Checagem`, `Reel`, `Corte`, `Citação`, `Curiosidade`, `Pacote`).

## Formatos

| Formato | Automático? | Nasce de | Checagem |
|---|---|---|---|
| `artigo` / `aviso` (já existe) | sim (já é) | `post.md` preenchido pela pessoa | nova: busca o artigo pelo link e compara com o resumo colado |
| Story de vídeo novo (já existe) | não — sempre manual (sticker de link) | fim da skill `publicar` | não se aplica (sem afirmação nova) |
| Story de aviso de post novo | sim | um `artigo`/`aviso` recém-escrito | não se aplica (repete o que o post já diz) |
| Sequência de stories "quiz respondido" | sim | um pedido ou um vídeo/tema | sim — a conta por trás é recalculada por um caminho independente |
| `curiosidade` | sim | um pedido solto ("faz uma curiosidade sobre X") | sim — mesma checagem de `artigo`/quiz, conforme a afirmação (fonte externa ou conta) |
| `citação` | sim | um vídeo ou post já existente | não — o conteúdo já passou pela checagem da origem |
| `reel` — Corte | sim | um vídeo já **publicado** no YouTube | não — reaproveita o que o vídeo já disse |
| `reel` — do zero | sim | um pedido solto, mais longo que uma `curiosidade` | sim — mesmo nível de uma `curiosidade` |

Fora desta fase, mas desenhados: `comemorativa`, resumo periódico. Descartados (não adiados): narração sintética (voz de IA) e bastidores do canal.

## Regra do story (ADR-0007)

Story com sticker interativo (link, quiz/enquete nativos) continua manual — a API não desenha sticker. Story sem sticker nenhum publica pela API. É o que libera a story de aviso e o quiz "respondido" (pergunta num story, resposta no seguinte, sem sticker, tom de engajamento — nunca resposta seca) a serem automáticos.

## Checagem (ADR-0009)

Antes da parada de aprovação, quando o conteúdo faz uma afirmação factual ou numérica:
- **Fonte externa** (`artigo`, e `curiosidade`/reel-do-zero quando citam algo específico): busca a fonte pelo link e compara com o texto escrito; se não conseguir acessar (paywall, sem link), avisa que não confirmou em vez de fingir que confirmou.
- **Conta** (quiz, `curiosidade`/reel-do-zero com número): recalcula por um caminho independente do texto que descreve a solução, e sinaliza divergência.

O resultado aparece explícito na aprovação ("o que confirmei / o que não confirmei"), ao lado dos PNGs e da legenda — nunca silenciosa, nunca bloqueando sozinha a publicação. A pessoa decide com essa informação.

## Reel — Corte (ADR-0008)

Pedido: "vê um trecho legal do vídeo Y pra postar". A pipeline baixa o vídeo pelo `yt-dlp` (só funciona porque o vídeo já está público — sem cookies, sem login), sugere 2 a 3 candidatos usando o Gancho e blocos `exemplo` autocontidos do roteiro, localizados pelos capítulos reais de `metadados.json`. A pessoa escolhe. O corte mantém o áudio original; a moldura vertical usa fundo de marca (navy/verde do design system) acima e abaixo do vídeo 16:9, nunca corta nem borra as bordas.

## Pacote

Um pedido pode disparar mais de um formato numa sequência fixa: conteúdo original → story de aviso → `reel`. `/video` nunca dispara isso sozinho — mesmo logo após o vídeo ficar público, é sempre por pedido explícito. Falha no meio de um pacote para tudo e reporta o que já saiu e o que ficou pendente; não pula, não desfaz (mesmo padrão da skill `publicar`).

## Fora de arquitetura (decisão delegada)

Pastas, nomes de arquivo e organização interna ficam a critério de quem implementa, documentando com clareza para quem usa (leitor sem experiência de programação). Único guia: uma pasta por ocasião publicável pode reunir post, sequência de stories e reel de uma mesma ideia.

## Ordem de implementação sugerida

Do que destrava mais com menos código para o que exige mais peças novas:

1. **Publicar `STORIES`/`REELS` pela API** em `scripts/instagram.mjs` (sem sticker) — capacidade de base; sem ela nada dos itens 2, 5, 7 e 8 funciona.
2. **Story de aviso automático** de post novo — reaproveita o gerador de stories em vídeo já existente com uma cena só; publica com o item 1.
3. **Checagem para `artigo`** (busca da fonte pelo link, seção na aprovação) — maior valor de qualidade, e a peça central desta fase.
4. **`curiosidade`** — reaproveita cards/legenda do MVP; Checagem por recomputação quando citar número.
5. **Sequência "quiz respondido"** automática — reaproveita o gerador de stories em vídeo já existente; Checagem por recomputação da conta; publica com o item 1.
6. **`citação`** — reaproveita cards; lógica nova é só sugerir candidatos a partir de um vídeo/post existente.
7. **`reel` do zero** — reaproveita o gerador de stories em vídeo para uma peça mais longa; publica `REELS` com o item 1.
8. **`reel` — Corte** — `yt-dlp`, leitura dos capítulos reais, corte por ffmpeg, moldura de marca, sugestão de candidatos. É o item mais caro; fica por último.
9. **Comando "pacote"** — só orquestra os comandos atômicos já existentes, na ordem fixa, parando no meio se algo falhar.
