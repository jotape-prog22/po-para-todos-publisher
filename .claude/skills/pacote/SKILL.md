---
name: pacote
description: Faz o pacote do Instagram de uma ocasião — post (com story de aviso) e depois reel — encadeando as skills post e reel, sempre por pedido explícito da pessoa e com uma parada de aprovação em cada formato. Use quando a pessoa disser "faz o pacote do vídeo Y", "faz tudo que dá a partir do vídeo Y" ou "post e reel do artigo X".
---

# Pacote

Diga antes: "Vou fazer, nesta ordem: post (com o story de aviso) e depois o reel. Cada um para para você aprovar; se um falhar ao publicar, eu paro ali e digo o que já saiu."

Regras (spec `docs/superpowers/specs/2026-09-21-instagram-formatos-e-rigor.md`, "Pacote"):
- **Ordem fixa**: conteúdo original → story de aviso → reel. Nunca o reel antes do post.
- **Nunca sozinho**: este pacote só começa quando a pessoa pede. `/video` não chama isto.
- **Falha no meio para tudo**: não pule, não desfaça, não tente de novo por conta própria.

## 1. O que entra

Pergunte, numa rodada só, o que faltar:
- A origem: um vídeo (`videos/<slug>`, já **público** — o reel de corte exige) ou um artigo/tema (aí não há corte; o reel é do zero, ou a pessoa dispensa o reel).
- Uma pasta só: `instagram/<AAAA-MM-DD>-<slug>/` para o post, o story de aviso e o reel.
- O tipo do post: de um vídeo, normalmente `curiosidade` ou `citacao` (o vídeo já tem a Checagem da origem); de um artigo, `artigo`.

## 2. Post + story de aviso

Rode a skill `post` até o fim (inclui a Checagem quando o tipo exige, a parada de aprovação e o story de aviso). Se a publicação falhar, **pare aqui** e reporte: "Parei no post: <erro>. Nada foi publicado." Se o post saiu e o story de aviso falhou, reporte os dois estados e pare.

## 3. Reel

Só depois do post no ar: rode a skill `reel` na mesma pasta (corte se a origem é um vídeo público; cenas se não). Se falhar ao publicar, reporte: "Post e story no ar; o reel não saiu: <erro>." e pare.

## 4. Entrega

"Pacote publicado: post <url>, story de aviso, reel <url>." Liste também o que a pessoa ainda pode fazer à mão (destaque dos stories, story de vídeo novo com o sticker de link, se ainda não fez).
