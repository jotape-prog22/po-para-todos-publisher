---
name: video
description: Fluxo completo de um vídeo do PO para Todos — do tema ao link privado no YouTube — encadeando roteiro, slides, título/descrição, miniatura e publicação, com paradas para a pessoa aprovar e gravar. Use quando a pessoa disser "quero fazer um vídeo sobre X" ou pedir a pipeline inteira.
---

# Vídeo — do tema ao YouTube

Diga antes, em linguagem simples: "Vamos fazer o vídeo em 5 etapas: roteiro → título e descrição → slides → miniatura → publicação. Eu paro duas vezes: para você aprovar o roteiro e para você gravar."

## Etapa 0 — Pasta

- Defina o slug (tema em minúsculas com hífens) e confira que `videos/<slug>/` não existe. Se existir, veja quais arquivos já estão lá para saber por onde retomar: um `roteiro.md` só conta como aprovado (PARADA 1 já passada) se `metadados.json` também já existir na pasta — é o primeiro arquivo produzido depois da aprovação. Se `roteiro.md` existir mas `metadados.json` não, volte para a Etapa 1 e peça o "sim" de novo, mesmo que o roteiro pareça pronto. Pule só as etapas cujo arquivo de saída já existe.
- Crie `videos/<slug>/briefing.md` a partir de `videos/_modelo/briefing.md` com o que a pessoa disse.

## Etapa 1 — Roteiro → **PARADA 1**

Invoque a skill `roteiro`. Ela termina perguntando se a pessoa aprova. **Não avance sem um sim explícito.** Ajustes: edite o roteiro e valide de novo.

## Etapa 2 — Título/descrição, slides, miniatura

Nesta ordem, cada uma com a própria skill: `titulo-descricao` (primeiro, porque a miniatura e a capa dos slides usam o título escolhido), `slides`, `miniatura`. Ao final mostre um resumo:

```
✅ Roteiro       videos/<slug>/roteiro.md        (N blocos, ~M min)
✅ Slides        videos/<slug>/slides.pptx       (K slides)
✅ Título        "…"
✅ Descrição     em videos/<slug>/metadados.json
✅ Miniatura     videos/<slug>/miniatura.png
⏸️  Agora é com você: grave o vídeo usando os slides. Quando tiver o arquivo, me diga o caminho.
```

## Etapa 3 — **PARADA 2**: gravação

Espere a pessoa informar o arquivo gravado. Não invente caminho. **Não avance sem o caminho do arquivo informado pela pessoa.**

## Etapa 4 — Publicar

Invoque a skill `publicar`. Ela confirma os capítulos reais, sobe como privado, devolve o link e, por fim, gera o `story.png` para o Instagram.

## Se algo der errado

Reporte o passo e o erro exatamente como saiu (`erro: …`), diga o que você vai tentar, e não pule etapas. Se a pessoa quiser parar no meio, tudo bem: os arquivos ficam na pasta e ela pode retomar com "continue o vídeo <slug>".
