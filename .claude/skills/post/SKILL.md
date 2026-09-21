---
name: post
description: Faz um post do Instagram do PO para Todos — artigo (carrossel) ou aviso (card único) — do post.md aos cards, legenda e publicação pela API oficial, parando para a pessoa aprovar. Use quando a pessoa disser "quero um post sobre X", "post do artigo Y" ou "aviso do evento Z".
---

# Post no Instagram

Diga antes: "Vou montar os cards e a legenda para você olhar; só publico depois do seu sim. Vídeo novo não entra aqui — isso é o story, que sai na skill `publicar`."

## 1. Pasta

- Defina a pasta `instagram/<AAAA-MM-DD>-<slug>/` (data prevista do post; slug do tema em minúsculas com hífens). Se já existir, veja o que tem: `publicacao.json` → já publicado, pare e diga o link; `cards.json` e `legenda.json` → gere os PNGs e a legenda (comandos do passo 2) e siga para o passo 3.
- Se não há `post.md`, crie a partir de `instagram/_modelo/post.md` com o que a pessoa disse e pergunte, em uma rodada só, o que faltar (artigo: título, autores, onde, link, resumo; aviso: nome, data-limite, link).

## 2. Cards e legenda

Siga `design-system/instagram/GUIA-AGENTE.md` do início ao fim: escreva `cards.json` e `legenda.json`, gere com `node design-system/scripts/gerar-cards.mjs instagram/<pasta>` e `node scripts/legenda.mjs instagram/<pasta>`, olhe cada PNG.

## 3. **PARADA**: aprovação

Abra os PNGs (`open instagram/<pasta>/card-*.png` no Mac, `start …` no Windows) e mostre a legenda inteira. Pergunte: "Aprova os cards e a legenda? Quer trocar alguma palavra?" **Não avance sem um sim explícito.** Ajustes: edite os JSON, gere de novo, mostre de novo.

## 4. Publicar

1. `node scripts/instagram.mjs --status`. Se sair `erro: sem token…`, diga à pessoa para rodar os comandos `--token`/`--token-github` (README, seção "Publicar no Instagram") numa outra janela do Terminal, fora desta conversa, e **nunca** colar o token aqui no chat. Espere ela dizer "pronto" e rode `--status` de novo. Se a cota estiver em 100, pare e diga quando libera.
2. `node scripts/instagram.mjs --publicar instagram/<pasta>`. Reporte cada linha que o script imprime. Se sair `erro: …`, mostre exatamente e não tente de novo por conta própria — o script já esvaziou o branch `midia`.
3. Entregue: "Post no ar: <url de publicacao.json>. Confira no app se o carrossel abriu na ordem certa."

## Fallback manual

Se a API falhou e a pessoa quer publicar mesmo assim: "Os arquivos estão prontos em `instagram/<pasta>/`: publique pelo app do Instagram (ou pelo Meta Business Suite) escolhendo `card-01.png` … na ordem, e cole o texto de `legenda.txt` na legenda." Depois, crie `publicacao.json` à mão com `{ "media_id": null, "url": "<link que a pessoa passar>", "publicado_em": "<ISO agora>", "tipo": "<tipo>", "cards": <n>, "manual": true }`.
