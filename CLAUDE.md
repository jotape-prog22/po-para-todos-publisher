# PO para Todos — publisher

Pipeline de produção do canal Pesquisa Operacional para Todos (UNIRIO): vídeos, do tema ao link no YouTube, e posts do Instagram, do `post.md` ao link. Quem usa este repositório pode não saber programar — escreva para essa pessoa: passos numerados, comando exato, o que esperar na tela.

## Fluxo de um vídeo
`/video` encadeia as skills em `.claude/skills/`: `roteiro` → `titulo-descricao` → `slides` → `miniatura` → `publicar`, com paradas para aprovar o roteiro e gravar. Cada skill também funciona sozinha. Vocabulário em `CONTEXT.md`; exemplo completo em `videos/folgas-complementares/`.

Scripts (Node ≥ 22, `npm install` uma vez):
- `node scripts/roteiro.mjs videos/<slug>/roteiro.md` — valida o roteiro.
- `node design-system/scripts/gerar-slides.mjs videos/<slug>` — `slides.json` → `slides.pptx`.
- `node scripts/descricao.mjs videos/<slug>` — monta a descrição em `metadados.json`.
- `node design-system/scripts/gerar-miniatura.mjs …` — ver `design-system/miniaturas/GUIA-AGENTE.md`.
- `node design-system/scripts/gerar-story.mjs videos/<slug>` — `story.png` de vídeo novo (a skill `publicar` chama).
- `node design-system/scripts/gerar-story-video.mjs instagram/<pasta>` — `stories.json` → `story-NN.mp4` (sequência de stories em vídeo; stickers e ordem em `stories.md` da pasta).
- `node design-system/scripts/gerar-reel.mjs instagram/<pasta>` — `reel.json` → `reel.mp4`.
- `npm test` — testes; as pastas `videos/folgas-complementares/` e `instagram/2026-09-20-kruskal-1956/` são fixtures: não as altere sem atualizar os testes.

Upload é sempre privado (`docs/adr/0003`). `canal.json` guarda links, playlists, rodapés e o repositório.

## Fluxo de um post do Instagram
`/post instagram/<data>-<slug>` (skill `post`): `post.md` → `cards.json` + `legenda.json` → `gerar-cards.mjs` e `scripts/legenda.mjs` → parada para aprovar → `node scripts/instagram.mjs --publicar`. Guia em `design-system/instagram/GUIA-AGENTE.md`; tokens em `~/.po-para-todos/instagram.json` (`docs/adr/0006`); imagens passam pelo branch `midia` (`docs/adr/0005`). Story de vídeo novo é sempre manual (a API não põe sticker de link); story de aviso de post e sequências sem sticker saem pela API.

`/stories instagram/<data>-<slug>` (skill `stories`): quiz "respondido" ou sequência didática → `stories.json` + `checagem.json` → `gerar-story-video.mjs` → parada para aprovar → `node scripts/instagram.mjs --publicar-stories` (sem sticker; com sticker é manual, `docs/adr/0007`).

`/reel instagram/<data>-<slug>` (skill `reel`): corte de vídeo publicado (`scripts/corte.mjs --candidatos`, `yt-dlp`, `docs/adr/0008`) ou cenas do zero → `reel.json` → `gerar-reel.mjs` + `legenda.mjs --reel` → parada → `--publicar-reel`.

## Design system (`design-system/`)
- `tokens.json` é a fonte da verdade; `tokens.css` é gerado por `design-system/scripts/gerar-tokens-css.mjs` — nunca edite o .css à mão.
- `README.md`, `fundamentos-slides.md` e `fundamentos-youtube.md` foram extraídos de material real: não reescreva sem perguntar.
- Modelos vivos em `design-system/components/` (abra `index.html`) — referência visual; os slides reais saem em PPTX (`docs/adr/0001`).

## Miniaturas do YouTube
Para gerar a miniatura de um vídeo, siga `design-system/miniaturas/GUIA-AGENTE.md` — catálogo de tópicos, formatos, ícones e o gerador `design-system/scripts/gerar-miniatura.mjs`.

## Quando for mudar a pipeline (desenvolvimento)
1. Desenhar: `/grill-me`; se a mudança cria ou muda um termo de `CONTEXT.md` ou uma decisão, `/grill-with-docs` (registra ADR em `docs/adr/`). **Não use `superpowers:brainstorming` neste repositório** (`docs/adr/0004`).
2. Planejar: superpowers `writing-plans` (planos em `docs/superpowers/plans/`).
3. Executar: superpowers `executing-plans` ou `subagent-driven-development`, com TDD (`npm test`) e `verification-before-completion`.
