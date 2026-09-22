---
name: stories
description: Faz uma sequência de stories do PO para Todos em vídeo — um quiz "respondido" (pergunta num story, resposta no seguinte) ou uma sequência didática — do pedido ao stories.json, à Checagem e à publicação pela API quando não há sticker, parando para a pessoa aprovar. Use quando a pessoa disser "faz um quiz sobre X", "stories explicando Y" ou "sequência de stories".
---

# Sequência de stories

Diga antes: "Vou escrever a sequência, gerar os vídeos e conferir as contas; só publico depois do seu sim. Sem sticker ela sai pela API; com sticker (quiz nativo, enquete, link) você posta pelo app."

## 1. Pasta e forma

- Pasta `instagram/<AAAA-MM-DD>-<slug>/` (data prevista; pode ser a pasta de um post da mesma ocasião). Se já tem `stories.json`, veja `publicacao-stories.json`: o que está lá já saiu.
- Pergunte, numa rodada só, o que faltar: o tema; se é **quiz** (pergunta → resposta) ou **didática** (passos, ideia, onde aparece); se quer sticker (aí é manual) — o padrão é **sem sticker, pela API**.

## 2. Escrever `stories.json`

Comece de `instagram/_modelo/stories.json`. Limites e campos: `design-system/scripts/gerar-story-video.mjs` (`LIMITES`: até 10 stories, 5 a 60 s cada, kicker 40, título 60, linha 90, pergunta 60, dica 30, faixa 40). Exemplo manual com stickers: `instagram/2026-09-22-como-funciona-po/`.

**Quiz "respondido"** — o pique é engajar, não entregar:
- Story 1: kicker de situação (`UM DESAFIO`, `UMA DECISÃO`), título com a cena, `linhas` com os dados, `pergunta` e `dica` terminando em "Sabe a resposta?" (ou "Chuta?", "Qual você escolhe?"). Nunca a resposta aqui.
- Story 2: kicker `A RESPOSTA`, título com a resposta curta, `linhas` com a conta em uma linha, por que não era óbvio, e o que isso tem a ver com PO; `dica` "Entendeu?" ou "Acertou?".
- Opcional, story 3: `COMO A PO FUNCIONA` com `itens` (modelar, resolver, decidir) e `faixa` apontando para o canal ("AULA COMPLETA NO CANAL" — sem link, é "link na bio").
- Tom: pergunta direta, dado concreto, zero "incrível"/"surpreendente"; a graça é a conta bater.

**Sem sticker**: `"publicacao": "api"`, sem `stories.md`. **Com sticker**: sem `publicacao` (ou `"manual"`) e escreva `stories.md` como o do exemplo (qual sticker em cada story, como postar).

## 3. Checagem (ADR-0009)

Toda conta e todo fato viram uma entrada em `checagem.json` (formato em `design-system/instagram/GUIA-AGENTE.md`, passo 3). A conta do quiz é `tipo: "conta"`: refaça por um caminho **diferente** do texto — enumere as combinações num `node -e "…"` e cole o resultado em `como`. Se a resposta do story 2 não bater com a conta, corrija o story, não a conta. Valide: `node scripts/checagem.mjs instagram/<pasta>`.

## 4. Gerar

`node design-system/scripts/gerar-story-video.mjs instagram/<pasta>` → `story-NN.mp4` + `story-NN.png` (último quadro). Abra os PNGs: texto inteiro, nada cortado, ordem certa.

## 5. **PARADA**: aprovação

Mostre os PNGs na ordem, o resumo de `node scripts/checagem.mjs instagram/<pasta>` inteiro (destaque "Não confirmei"), e pergunte: "Aprova a sequência e a conta? Quer trocar alguma palavra?" **Não avance sem um sim explícito.**

## 6. Publicar

- Pela API (`"publicacao": "api"`): `node scripts/instagram.mjs --status` (token e cota; se faltar token, README "Publicar no Instagram", token fora do chat), depois `node scripts/instagram.mjs --publicar-stories instagram/<pasta>`. Reporte cada linha. Se sair `erro: falhou em story-NN…`, mostre exatamente: o script diz o que já saiu e o que ficou — corrija e rode **o mesmo comando** de novo, ele continua de onde parou. Não pule stories.
- Manual (com sticker): entregue `stories.md` e diga: "Poste pelo app na ordem, com os stickers indicados; salve no destaque."

Entregue: "Sequência no ar (N stories). Em 24 h ela some; salve no destaque se quiser guardar."
