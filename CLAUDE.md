# PO para Todos — publisher

Pipeline de produção dos vídeos do canal Pesquisa Operacional para Todos (UNIRIO): do tema ao link no YouTube. Quem usa este repositório pode não saber programar — escreva para essa pessoa: passos numerados, comando exato, o que esperar na tela.

## Fluxo de um vídeo
`/video` encadeia as skills em `.claude/skills/`: `roteiro` → `titulo-descricao` → `slides` → `miniatura` → `publicar`, com paradas para aprovar o roteiro e gravar. Cada skill também funciona sozinha. Vocabulário em `CONTEXT.md`; exemplo completo em `videos/folgas-complementares/`.

Scripts (Node ≥ 22, `npm install` uma vez):
- `node scripts/roteiro.mjs videos/<slug>/roteiro.md` — valida o roteiro.
- `node design-system/scripts/gerar-slides.mjs videos/<slug>` — `slides.json` → `slides.pptx`.
- `node scripts/descricao.mjs videos/<slug>` — monta a descrição em `metadados.json`.
- `node design-system/scripts/gerar-miniatura.mjs …` — ver `design-system/miniaturas/GUIA-AGENTE.md`.
- `npm test` — testes; a pasta `videos/folgas-complementares/` é fixture: não a altere sem atualizar os testes.

Upload é sempre privado (`docs/adr/0003`). `canal.json` guarda links, playlists e rodapé.

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
