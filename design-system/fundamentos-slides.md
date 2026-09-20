# Slides

Padrão para qualquer slide de aula do projeto, extraído do deck real "Teorema das Folgas Complementares" (14 slides, tema PowerPoint próprio). Formato 16:9 (12192000 × 6858000 EMU / 13,333 × 7,5 pol — 1280 × 720px como referência de tela).

## Grade

- Fundo: `surface` (branco).
- Margem lateral (esquerda e direita): `space-2xl` — medida real do deck fonte (0,7 pol).
- Título: começa a `space-md` (0,33 pol) do topo, altura de uma linha em `slide-title`; título com mais de uma linha empurra o corpo para baixo, nunca sobrepõe.
- Corpo: começa a 1,75 pol do topo (logo abaixo do título mais respiro), ocupa a largura entre as margens laterais.
- Logo UNIRIO: canto superior direito, quase encostado no topo, quadrado de ~1,4 pol de lado.
- Elemento decorativo de canto: inferior direito, quadrado de ~1,47 pol de lado, com respiro do rodapé. Use o padrão de nós/grafo da marca (veja `README.md` → A marca) no lugar do clip-art de engrenagens do deck atual.

## Tipografia

- Títulos em `slide-title` (família "title" → Aharoni, com Baloo 2 como alternativa quando Aharoni não estiver instalado), cor `brand-navy`.
- Corpo em `slide-body` (família "body" → Hagrid Text, com Nunito como alternativa), cor `ink`.
- Rótulos que abrem um bloco (ex.: "Condição 1") em `slide-label`, cor `accent-blue`, sempre em negrito.
- Resultados e valores que devem saltar aos olhos (ex.: "Z* = 36") em `slide-emphasis`.
- Linha de autoria (nome do apresentador, "Projeto PO para Todos – UNIRIO", link do projeto) em `slide-caption`, cor `ink-muted`.
- Nunca mais de duas famílias de fonte em um único slide (title + body) — não introduza uma terceira fonte para "variar".

## Estrutura por tipo de slide

Os quatro tipos abaixo cobrem o deck de referência inteiro; use exatamente esses papéis antes de inventar um quinto. Modelos vivos de cada um estão em `components/Slide-Capa`, `Slide-Conteúdo`, `Slide-Exemplo` e `Slide-Encerramento`.

**Capa** — título da aula em `slide-title` (até 3 linhas), nome do apresentador e "Projeto PO para Todos – UNIRIO" em `slide-caption` logo abaixo, com respiro. Reserve o lado direito para o elemento decorativo.

**Conteúdo** (objetivos, explicações, definições) — um `slide-title` curto (1–3 palavras: "Objetivos", "Relembrando: Primal e Dual") seguido de corpo em `slide-body`, em marcadores ou parágrafo corrido. Destaque termos técnicos com `slide-emphasis` ou `accent-blue`, nunca mais de uma frase por marcador em negrito total.

**Exemplo / fórmula** — título nomeando o exemplo ("Exemplo — O Primal"), corpo com a formulação matemática em `slide-body`/`slide-emphasis` (não use fonte monoespaçada — o deck fonte escreve fórmulas na própria Hagrid Text, em negrito para o que muda), resultado final sempre em `accent-blue` negrito. Se a fórmula for longa, use um painel `surface-panel` com `radius-md` para separá-la do restante do texto — adição intencional deste sistema, o deck atual não usava painéis.

**Encerramento** — "Obrigado!" ou equivalente em `slide-title`, autoria em `slide-caption`, com o link do projeto (`poparatodos.github.io/...`) na última linha. O logo UNIRIO pode aparecer maior aqui, centralizado à direita, como no deck fonte.

## Checklist antes de exportar

- Título em `slide-title`/`brand-navy`, corpo em `slide-body`/`ink` — nenhuma cor fora da paleta documentada em `tokens.json`.
- Logo UNIRIO presente no canto superior direito em todo slide, sem distorcer proporção.
- Elemento decorativo de canto usa o motivo de nós da marca, não clip-art genérico.
- Nenhum bloco de texto encosta nas margens (`space-2xl`) ou no logo.
- Uma aula = uma sequência Capa → Conteúdo/Exemplo (quantos forem necessários) → Encerramento.
