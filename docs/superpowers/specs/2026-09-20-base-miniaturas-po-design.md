# Base de conhecimento para geração de miniaturas — PO para Todos

Data: 2026-09-20. Aprovado em conversa.

## Objetivo
Um agente (Claude) recebe o título/assunto de um vídeo e produz a miniatura 1280×720 (exportada em 2560×1440) dentro da marca, para qualquer tópico de Pesquisa Operacional, sem intervenção humana.

## Arquitetura (tudo em `design-system/miniaturas/`, exceto scripts)
- `catalogo.json` — taxonomia de PO: áreas → tópicos, cada um com apelidos, headline/subhead sugeridos (que cabem na escala), ícone padrão e formato padrão.
- `formatos.json` — formatos de vídeo (tutorial, conceito, exercicio, serie, erros, comparativo, ferramenta, rapido): faixa padrão, slot de ícone, layout padrão.
- `icones/*.svg` — ~27 ícones desenhados à mão, 200×200, linguagem do motivo (nós, hastes finas, brand-green-soft + um acento).
- `layouts/*.html` — empilhado, dividido, comparativo, numerado; placeholders `{{headline}} {{subhead}} {{faixa}} {{icone}} {{icone2}} {{numero}}`; consomem `tokens.css` + `components/base.css`.
- `scripts/gerar-miniatura.mjs` — spec (CLI ou JSON) → preenche pelo catálogo → valida → HTML em `thumbnails/out/` → PNG via `exportar.sh` escala 2.
- `scripts/gerar-galeria.mjs` — um exemplo por tópico → `miniaturas/galeria.html` (revisão + regressão).
- `medidas-fontes.json` — larguras de glifos da Archivo Black e Poppins 800 extraídas via headless, para validar cabimento em px.
- `GUIA-AGENTE.md` — do título ao PNG em cinco passos; banco de palavras; tópico fora do catálogo.
- `CLAUDE.md` na raiz apontando para o guia.

## Validações do gerador
Headline e subhead cabem na largura útil (1088px) medidos em px; um ícone só (dois apenas no comparativo); faixa nunca vazia; caixa alta; ícone e formato existem.

## Fora de escopo
Shorts 9:16; geração de imagem por modelo; chamada ao MCP do YouTube; alterar `tokens.json` ou os três `.md` originais.
