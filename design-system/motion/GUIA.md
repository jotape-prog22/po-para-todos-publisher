# Cenas do motor de motion — guia para o agente

Cada Cena de `reel.json` (`"cenas"`) ou `stories.json` (`"stories"`) tem `duracao` (s) e um `tipo`. Sem `tipo`, é `texto`. Todo tipo aceita `faixa` (≤ 40, a linha acima do rodapé, ex.: "AULA COMPLETA NO CANAL"). O gerador recusa o que não cabe e diz a duração mínima de cada Cena.

Ritmo do reel: 25 a 45 s no total (limite técnico 15 a 90), Cenas de 3 a 8 s. A primeira Cena é a **Chamada** (`CONTEXT.md`): algo na tela em até 2 s, com um destes tipos — `impacto` (5 estilos), `pergunta`, `riscado`, `digitado`, `spoiler`, `mito-fato`, `desafio` — ou, se o tema pedir, `odometro`, `grafo` ou `texto` com `pergunta`. Varie: veja as regras na skill `reel` e toque `npm run chamadas` para ver todas. Story: cada um com pelo menos 5 s.

Quando usar cada tipo:
- **texto** — explicar com frases: kicker, título, até 6 linhas ou 4 itens numerados, pergunta, ícone, dica. É o formato antigo.
- **impacto** — gancho e viradas: 1 a 4 palavras grandes que batem uma por vez.
- **odometro** — um número que importa (ano, quantidade, resultado) girando até o valor.
- **grafo** — redes, caminhos, árvores: nós numa grade 0–10, arestas (pares repetidos viram pontes paralelas), pesos e um caminho que acende.
- **conta** — uma conta curta escrita à mão, linha a linha, com a linha do resultado em destaque.
- **grafico** — programação linear em 2 variáveis: eixos, restrições, região viável e ponto ótimo.
- **tabela** — comparar poucos números (até 6 linhas × 4 colunas), com uma célula em destaque.
- **pergunta** — Chamada que abre uma dúvida com 2 ou 3 opções; a última Cena do reel repete a pergunta com `resposta` e acende a certa.
- **riscado** — Chamada de virada: a crença comum ("parece") é riscada e a resposta ("é") bate.
- **digitado** — Chamada calma: uma frase digitada com cursor e um trecho com marca-texto. Para temas sérios.
- **spoiler** — Chamada que mostra o resultado final gigante e pergunta "COMO?"; o reel explica.
- **mito-fato** — Chamada com uma afirmação e o carimbo MITO ou FATO.
- **desafio** — Chamada com uma pergunta e um relógio de 3 a 5 s; a resposta vem na Cena 2.

Números, contas e pesos que aparecem na tela entram na Checagem (`checagem.json`, `onde: "cena N"`).

Os tempos de entrada de cada tipo ficam em `design-system/motion/movimento.json` (`ritmo.<tipo>`); os números deste guia são os de hoje.

## texto

    { "duracao": 7, "kicker": "UM ENIGMA DE KÖNIGSBERG", "titulo": "DÁ PARA ATRAVESSAR AS 7 PONTES?", "linhas": ["Uma ilha, dois braços de rio", "Passar por todas sem repetir"] }

Campos: `kicker` ≤ 40, `titulo` ≤ 60, `linhas` (até 6, ≤ 90) **ou** `itens` (até 4, `{titulo ≤ 20, texto ≤ 90}`), `pergunta` ≤ 60, `dica` ≤ 30, `icone` (nome de `design-system/miniaturas/icones/`).

## impacto

    { "tipo": "impacto", "duracao": 3, "palavras": ["7 PONTES", "1 PASSEIO"], "apoio": "sem repetir nenhuma" }

Campos: `palavras` (1 a 4, ≤ 14 cada), `apoio` ≤ 60, `kicker`. Sem `titulo`. Cada palavra entra 0,55 s depois da anterior.

`estilo`: `batida` (padrão: bate com mola, tremor e clarão), `deslizar` (entra de lado, sem tremor), `trocar` (uma palavra por vez no mesmo lugar), `crescer` (nasce pequena e cresce devagar — tensão), `sublinhar` (todas juntas; a caneta sublinha a de número `destaque`, padrão a última). `destaque` só vale com `sublinhar`.

## odometro

    { "tipo": "odometro", "duracao": 5, "titulo": "O ANO DO ARTIGO", "valor": 1736, "rotulo": "Euler escreve sobre as pontes" }

Campos: `valor` (número, sem aspas), `casas_decimais` (0 a 2), `prefixo` ≤ 6 (ex.: "R$"), `sufixo` ≤ 10 (ex.: "km"), `rotulo` ≤ 60, `kicker`, `titulo`. O valor formatado tem até 9 caracteres. Sai com separadores em pt-BR: 12.000 e 3,5; inteiros abaixo de 10 000 não levam ponto (o ano fica 1736, não 1.736).

## grafo

    { "tipo": "grafo", "duracao": 8, "titulo": "REGIÕES VIRAM PONTOS",
      "nos": [{ "id": "N", "x": 4, "y": 1 }, { "id": "I", "x": 4, "y": 5, "rotulo": "ilha" }, { "id": "S", "x": 4, "y": 9 }, { "id": "L", "x": 9, "y": 5 }],
      "arestas": [{ "de": "N", "para": "I" }, { "de": "N", "para": "I" }, { "de": "S", "para": "I" }, { "de": "S", "para": "I" }, { "de": "N", "para": "L" }, { "de": "I", "para": "L" }, { "de": "S", "para": "L" }],
      "caminho": ["N", "I", "L"], "legenda": "cada ponte é uma ligação" }

Campos: `nos` (2 a 12; `x`, `y` de 0 a 10, `y` cresce para baixo; `rotulo` ≤ 12, padrão = `id`), `arestas` (1 a 20; `peso` ≤ 6 caracteres), `dirigido` (true desenha setas e exige o sentido no caminho), `caminho` (cada par seguido precisa de aresta), `legenda` ≤ 60, `kicker`, `titulo`. Deixe pelo menos 2 unidades entre nós para os rótulos respirarem. Rótulo que não cabe no círculo (mais de 2 ou 3 letras) sai para fora, do lado oposto ao centro do grafo: evite um nó com rótulo longo bem no meio, cercado de arestas. Pesos e caminho entram na Checagem.

## conta

    { "tipo": "conta", "duracao": 8, "titulo": "QUANTAS PONTES EM CADA REGIÃO", "linhas": ["ilha: 5", "norte: 3  sul: 3  leste: 3", "4 regiões ímpares"], "destaque": 3, "nota": "mais de 2 ímpares: impossível" }

Campos: `linhas` (1 a 5, ≤ 32 cada), `destaque` (número da linha que sai verde e sublinhada), `nota` ≤ 60, `kicker`, `titulo`. Linha longa encolhe a fonte de todas, sem quebrar. Toda conta entra na Checagem refeita por outro caminho.

## grafico

    { "tipo": "grafico", "duracao": 10, "titulo": "ONDE O LUCRO É MAIOR",
      "eixos": { "x": { "rotulo": "pães", "max": 8 }, "y": { "rotulo": "bolos", "max": 6 } },
      "restricoes": [{ "a": 1, "b": 2, "c": 8, "rotulo": "forno" }, { "a": 1, "b": 1, "c": 6, "rotulo": "massa" }],
      "otimo": { "x": 4, "y": 2, "rotulo": "Z* = R$ 220" } }

Campos: `eixos` (`x` e `y`, cada um com `max` > 0 e `rotulo` ≤ 16), `restricoes` (1 a 5, `{ a, b, c, rotulo ≤ 16 }`), `otimo` (`{ x, y, rotulo ≤ 20 }`, dentro da região), `nota` ≤ 60, `kicker`, `titulo`. Cada restrição é `a·x + b·y ≤ c` (para "≥", multiplique tudo por −1). `max` dos eixos um pouco acima do maior intercepto. Rótulos saem como escritos, sem caixa alta (são fórmulas). O rótulo da restrição fica na ponta mais alta da reta; se ali cobriria outro rótulo (o do eixo y, quando a reta toca o topo do eixo), vai para a outra ponta. O gerador recusa região vazia e ótimo fora dela. Restrições, ótimo e valor entram na Checagem (refaça a conta nos vértices).

## tabela

    { "tipo": "tabela", "duracao": 8, "titulo": "O QUE CADA UM RENDE", "colunas": ["", "Pão", "Bolo"],
      "linhas": [["Forno", "1 h", "2 h"], ["Lucro", "R$ 20", "R$ 50"]], "destaque": { "linha": 2, "coluna": 3 } }

Campos: `colunas` (2 a 4, ≤ 12; a primeira pode ser `""` quando a coluna é de rótulos), `linhas` (1 a 6, mesmo número de células, cada célula ≤ 12), `destaque` `{ linha, coluna }` contando de 1 (sem o cabeçalho), `nota` ≤ 60, `kicker`, `titulo`. O cabeçalho sai em caixa alta; as células, como escritas. Todo número da tabela entra na Checagem.

## pergunta

    { "tipo": "pergunta", "duracao": 4, "pergunta": "Abrir um atalho deixa o trânsito…", "opcoes": ["Mais rápido", "Igual", "Mais lento"] }

Campos: `pergunta` ≤ 60, `opcoes` (2 a 3, ≤ 30 cada), `resposta` (número da opção certa — só na Cena que revela), `kicker`. Reel que abre com `pergunta` precisa terminar com a mesma pergunta, as mesmas `opcoes` na mesma ordem e a `resposta`; o gerador recusa se faltar. Opção longa encolhe a fonte de todas.

## riscado

    { "tipo": "riscado", "duracao": 4, "parece": "Sobrar energia é bom", "e": "Vira problema" }

Campos: `parece` ≤ 40, `e` ≤ 40, `kicker`. "PARECE" e "É" são fixos na tela.

## digitado

    { "tipo": "digitado", "duracao": 5, "frase": "37.719 pessoas esperam uma córnea no Brasil.", "marca": "37.719 pessoas" }

Campos: `frase` ≤ 90 (sai como escrita, sem caixa alta), `marca` ≤ 30 (trecho exato da frase), `kicker`. Cada palavra do trecho é marcada na linha em que cair; prefira marca curta. A frase entra na Checagem.

## spoiler

    { "tipo": "spoiler", "duracao": 3, "valor": 80, "sufixo": "min", "pergunta": "COMO?" }

Campos do número iguais aos do `odometro` (`valor`, `casas_decimais`, `prefixo`, `sufixo`; sem `rotulo`), `pergunta` ≤ 20 (padrão "COMO?"), `kicker`. O número entra na Checagem.

## mito-fato

    { "tipo": "mito-fato", "duracao": 4, "afirmacao": "Preço sombra é o preço de mercado.", "veredito": "mito" }

Campos: `afirmacao` ≤ 90, `veredito` (`"mito"` ou `"fato"`), `kicker`. O carimbo bate logo abaixo da afirmação, pelo menos 1,5 s depois do começo. Afirmação e veredito entram na Checagem.

## desafio

    { "tipo": "desafio", "duracao": 8, "pergunta": "3 bairros, 2 escolas: todos na mais perto cabe?", "segundos": 4 }

Campos: `pergunta` ≤ 90, `segundos` (3 a 5), `kicker`. Nunca é a última Cena: a Cena seguinte responde (o gerador recusa reel que termina em desafio).
