# Guia do agente — do título do vídeo à miniatura

Este guia é para um agente (ou pessoa) que recebe o título/assunto de um vídeo do canal PO para Todos e precisa entregar a miniatura pronta. Tudo que ele precisa está nesta pasta; a marca, a grade e a tipografia já estão decididas em `../fundamentos-youtube.md` e `../tokens.json` — **não reinvente nada disso**.

## Os cinco passos

1. **Ache o tópico no catálogo.** `node design-system/scripts/gerar-miniatura.mjs --buscar "<título do vídeo>" --so-buscar` lista os cinco tópicos mais próximos de `catalogo.json`. Se o primeiro é o certo, use o `id`. Se nenhum serve, veja "Tópico fora do catálogo".
2. **Escolha o formato** pela natureza do vídeo (tabela abaixo). O tópico tem um formato padrão, mas o vídeo manda: um vídeo de Simplex "no Excel" é `tutorial`, não `conceito`.
3. **Ajuste o texto só se precisar.** O catálogo já traz headline e subhead que cabem. Troque apenas quando o vídeo pede outra ênfase — e obedeça às regras de copy abaixo. O gerador rejeita o que não cabe.
4. **Gere:** `node design-system/scripts/gerar-miniatura.mjs --topico <id> --formato <formato> [--numero N] [--icone2 id] --saida thumbnails/out/<slug>.png`. Saída em 2560×1440 (o YouTube pede ≥ 1280×720, ≤ 2 MB). Leia os `avisos` do JSON de retorno.
5. **Olhe o PNG antes de publicar.** Reduza mentalmente a 120px de largura: a headline ainda lê? Só um ícone? Faixa preenchida? Depois, `youtube_set_thumbnail` com o PNG.

## Qual formato

| O vídeo… | formato | faixa | layout padrão |
|---|---|---|---|
| ensina a fazer algo numa ferramenta (Excel, Python…) | `tutorial` | PASSO A PASSO COMPLETO | empilhado, selo alvo |
| explica um teorema, método ou ideia | `conceito` | TEORIA EXPLICADA | dividido |
| resolve um problema numérico do início ao fim | `exercicio` | EXERCÍCIO RESOLVIDO | dividido |
| é a aula N de um curso/playlist | `serie` | AULA 03 · PROG. LINEAR | numerado (exige `--numero`) |
| lista armadilhas e enganos | `erros` | ERROS COMUNS | dividido, selo X |
| compara dois métodos/ferramentas | `comparativo` | QUAL USAR? | comparativo (exige `--icone2`) |
| é sobre o código/arquivo em si | `ferramenta` | CÓDIGO NA DESCRIÇÃO | dividido |
| resume em menos de 6 minutos | `rapido` | EM 5 MINUTOS | dividido, selo relógio |

A faixa pode ser sobrescrita com `--faixa`, mas nunca fica vazia e nunca vira frase de marketing.

## Como escrever headline e subhead

- **Headline** = a palavra que o aluno digitaria no YouTube: o nome técnico correto (DIJKSTRA, SIMPLEX, DUALIDADE), caixa alta, **uma linha, ≤ 1088px em Archivo Black 128px** — na prática 8 a 11 letras. Cor `brand-green`, fixa.
- **Subhead** completa: contexto ("PRIMAL E DUAL"), ferramenta ("NO EXCEL") ou pergunta ("OU MAXIMAX?"). Até duas linhas de 1088px em 92px. Nos layouts empilhado/comparativo/numerado, só uma linha.
- Se a palavra importante é longa (COMPLEMENTARES, PROGRAMAÇÃO), ela vai para o subhead e a headline fica com a curta (FOLGAS). Nunca abrevie inventando ("COMPLEM.").
- Nunca frase inteira, nunca "Descubra…", "O segredo de…", nunca ponto de exclamação. Interrogação é permitida quando o vídeo responde uma pergunta ("CONVEXO / OU NÃO?").
- Quem decide o layout é a largura medida do texto: título estreito → ícone grande à direita (dividido); título largo → ícone pequeno embaixo (empilhado). Não force `--layout` para vencer o validador.

### Banco de palavras por área

| Área | Headlines que funcionam |
|---|---|
| Programação Linear | SIMPLEX, DUALIDADE, FOLGAS, BIG-M, MÉTODO (+ GRÁFICO), PREÇO (+ SOMBRA), MODELAGEM, SOLUÇÃO (+ ILIMITADA?) |
| Programação Inteira | BRANCH (+ AND BOUND), MOCHILA, VARIÁVEIS (+ BINÁRIAS), PLANOS (+ DE CORTE), ONDE (+ INSTALAR?) |
| Redes | DIJKSTRA, KRUSKAL, FLUXO, TRANSPORTE, HÚNGARO, CAIXEIRO, ROTAS |
| Projetos | PERT/CPM, GANTT, CRASHING |
| Estoques | LOTE (+ ECONÔMICO), PONTO (+ DE PEDIDO) |
| Filas | M/M/1, M/M/C, LITTLE |
| Simulação | MONTE (+ CARLO), EVENTOS (+ DISCRETOS), ALEATÓRIO |
| Prog. Dinâmica | BELLMAN, ESTÁGIOS |
| Jogos | PAYOFF, NASH, SOMA ZERO |
| Decisão | ÁRVORE (+ DE DECISÃO), MAXIMIN, AHP |
| Heurísticas | GENÉTICO, ANNEALING, TABU, GULOSA |
| Não linear | GRADIENTE, KKT, CONVEXO |
| Previsão | MÉDIA (+ MÓVEL), REGRESSÃO |
| Ferramentas | SOLVER, PULP, OR-TOOLS, SCIPY, LINGO, GAMS, GUROBI, JUMP, LPSOLVE |

## Qual ícone

Um por miniatura (dois só no comparativo). Todos em `icones/`, mesma linguagem do logo. Quando o tópico tem ícone padrão, use-o; para tópico novo, escolha pelo assunto:

| Ícone | Assuntos |
|---|---|
| `regiao-viavel` | PL em geral, método gráfico, casos especiais |
| `tabela-simplex` | Simplex, Big-M, duas fases, qualquer coisa com tableau |
| `dualidade` | dual, folgas complementares, Simplex dual |
| `sensibilidade` | preço sombra, pós-otimização |
| `arvore-bb` | programação inteira, branch and bound, binárias |
| `plano-corte` | cortes, relaxação linear |
| `mochila` | knapsack, seleção de itens |
| `grafo-caminho` | caminho mínimo, Dijkstra, localização, heurística em grafo |
| `fluxo` | fluxo máximo, custo mínimo, corte mínimo |
| `arvore-geradora` | Kruskal, Prim |
| `transporte` | transporte, bipartido |
| `designacao` | húngaro, atribuição |
| `caixeiro` | TSP, roteamento, rotas |
| `gantt` | PERT/CPM, cronograma, crashing |
| `estoque` | EOQ, ponto de pedido |
| `fila` | qualquer fila |
| `dados` | Monte Carlo, aleatoriedade |
| `relogio` | eventos discretos, tempo; selo do formato rápido |
| `escada` | programação dinâmica |
| `payoff` | teoria dos jogos |
| `arvore-decisao` | decisão sob incerteza, valor esperado |
| `hierarquia` | AHP, multicritério |
| `cromossomo` | metaheurísticas |
| `gradiente` | não linear, KKT, convexidade |
| `previsao` | séries temporais, regressão |
| `planilha` | Excel, Sheets, LibreOffice (genérico, sem marca registrada) |
| `terminal` | Python, Julia, R, LINGO, GAMS, qualquer código |
| `alvo`, `erro` | só como selo (tutorial, erros) — nunca como ícone principal |

Não use logos de terceiros (Excel, Python, Gurobi): são marcas registradas e não estão no sistema. `planilha` e `terminal` cobrem todos os casos.

## Tópico fora do catálogo

1. Confirme com `--so-buscar` que não existe sob outro nome.
2. Gere direto com `--headline`, `--subhead`, `--icone` (e `--formato`) — funciona sem tópico.
3. Se o assunto vai voltar, adicione-o a `catalogo.json` na área certa:
   ```json
   { "id": "slug", "nome": "Nome completo", "apelidos": ["como as pessoas chamam"], "headline": "PALAVRA", "subhead": "COMPLEMENTO", "icone": "id-do-icone", "formato": "conceito" }
   ```
   Depois rode `node design-system/scripts/gerar-galeria.mjs`: ele valida todos os tópicos e falha se algum não cabe.
4. Ícone novo só se nenhum dos 29 representa o assunto. Desenhe em `icones/`, 200×200, traço 4, nós em `#A7C973`, um acento em `#51AA04`; nada de texto dentro do SVG.

## Comandos

```bash
node design-system/scripts/gerar-miniatura.mjs --listar                 # tópicos, formatos, layouts
node design-system/scripts/gerar-miniatura.mjs --buscar "texto" --so-buscar
node design-system/scripts/gerar-miniatura.mjs --topico simplex --formato serie --numero 3
node design-system/scripts/gerar-miniatura.mjs --spec spec.json --saida thumbnails/out/x.png
node design-system/scripts/gerar-galeria.mjs [--png]                    # regenera galeria.html
```

Spec JSON aceita os mesmos campos da CLI: `topico`, `buscar`, `formato`, `layout`, `headline`, `subhead`, `faixa`, `icone`, `icone2`, `selo`, `numero`, `ferramenta`, `saida`, `escala`, `soHtml`.

## Nunca

- Reduzir o tamanho da fonte para caber — mude a palavra.
- Trocar as cores da headline/subhead/faixa ou o fundo grafite.
- Mais de um ícone (exceto comparativo), ícones de terceiros, imagem gerada por modelo.
- Editar os arquivos de `galeria/` à mão.
