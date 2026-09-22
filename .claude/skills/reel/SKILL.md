---
name: reel
description: Faz um reel do PO para Todos — corte de um vídeo já publicado no YouTube ("vê um trecho legal do vídeo Y") ou cenas do zero sobre um tema ("reel sobre X") — do reel.json ao reel.mp4, legenda, Checagem e publicação pela API, parando para a pessoa aprovar. Use quando a pessoa pedir um reel, um corte ou um vídeo curto para o Instagram.
---

# Reel

Diga antes: "Vou montar o reel e a legenda para você olhar; só publico depois do seu sim."

## 1. Pasta e origem

- Pasta `instagram/<AAAA-MM-DD>-<slug>/` (pode ser a de um post da mesma ocasião). `publicacao-reel.json` existe → já saiu, pare e diga.
- **Corte** (a pessoa citou um vídeo): siga a seção "Corte" abaixo. **Do zero** (um tema): siga "Cenas".

## 2a. Cenas (do zero)

1. Comece de `instagram/_modelo/reel.json` (`tipo: "cenas"`). Regras das cenas = as dos stories (`stories` skill, `LIMITES` de `gerar-story-video.mjs`); total de 15 a 90 s; 3 a 6 cenas; a primeira é um gancho (pergunta ou fato), a última tem `faixa` apontando para o canal. `legenda`: gancho ≤ 125, corpo, 3 a 4 `hashtags_tema` (`#CamelCase`).
2. **Checagem** (ADR-0009): todo fato e toda conta viram entrada em `checagem.json` (GUIA-AGENTE.md, passo 3) — busque a fonte, refaça a conta por outro caminho. `node scripts/checagem.mjs instagram/<pasta>`.

## 2b. Corte (vídeo já publicado)

1. O vídeo precisa estar **público**: `videos/<slug>/publicacao.json` com `"privacidade": "public"` (se a pessoa já tornou público e o arquivo diz `private`, peça para confirmar e atualize o arquivo).
2. `node scripts/corte.mjs --candidatos videos/<slug>` → lista de trechos (gancho e exemplos autocontidos, com início, fim e duração pelos capítulos reais). Mostre 2 a 3 com o motivo de cada um e pergunte qual vai — ou se a pessoa quer outro intervalo (`mm:ss` a `mm:ss`, 15 a 90 s).
3. Escreva `reel.json` com `tipo: "corte"`, `video` (slug), `inicio`, `fim`, `titulo` (≤ 60, caixa alta, o que o trecho ensina), `faixa` (`"AULA COMPLETA NO CANAL"`) e `legenda`. Sem `checagem.json`: o vídeo já disse isso.

## 3. Gerar

`node design-system/scripts/gerar-reel.mjs instagram/<pasta>` → `reel.mp4` + `reel.png` (capa). Corte: exige `yt-dlp` instalado (README, "O que você vai instalar", item opcional); se sair `erro: yt-dlp não encontrado`, mostre o passo do README e espere.
`node scripts/legenda.mjs instagram/<pasta> --reel` → `reel-legenda.txt`.
Abra `reel.mp4` (`open …` no Mac, `start …` no Windows) e veja inteiro: texto legível, áudio presente no corte, nada cortado na moldura.

## 4. **PARADA**: aprovação

Mostre o caminho do `reel.mp4`, o `reel.png`, a legenda inteira e — nas cenas do zero — o resumo de `node scripts/checagem.mjs instagram/<pasta>` (destaque "Não confirmei"). Pergunte: "Aprova o reel e a legenda?" **Não avance sem um sim explícito.**

## 5. Publicar

`node scripts/instagram.mjs --status` (token/cota; token fora do chat, README "Publicar no Instagram"). Depois `node scripts/instagram.mjs --publicar-reel instagram/<pasta>`. Reporte cada linha; `erro: …` → mostre exatamente e pare. Entregue: "Reel no ar: <url de publicacao-reel.json>."
