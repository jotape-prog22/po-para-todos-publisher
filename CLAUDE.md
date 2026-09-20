# PO para Todos — publisher

Canal e material de aula do projeto de extensão PO para Todos (Pesquisa Operacional, UNIRIO).

## Design system (`design-system/`)
- `tokens.json` é a fonte da verdade; `tokens.css` é gerado por `design-system/scripts/gerar-tokens-css.mjs` — nunca edite o .css à mão.
- `README.md`, `fundamentos-slides.md` e `fundamentos-youtube.md` foram extraídos de material real: não reescreva sem perguntar.
- Modelos vivos em `design-system/components/` (abra `index.html`).

## Miniaturas do YouTube
Para gerar a miniatura de um vídeo, siga `design-system/miniaturas/GUIA-AGENTE.md` — catálogo de tópicos, formatos, ícones e o gerador `design-system/scripts/gerar-miniatura.mjs`. Saída em `thumbnails/out/` (ignorado pelo git).
