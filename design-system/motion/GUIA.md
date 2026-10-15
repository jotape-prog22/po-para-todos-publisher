# Cenas do motor de motion — guia para o agente

Cada Cena de `reel.json` (`"cenas"`) ou `stories.json` (`"stories"`) tem `duracao` (s) e um `tipo`. Sem `tipo`, é `texto`. Todo tipo aceita `faixa` (≤ 40, a linha acima do rodapé, ex.: "AULA COMPLETA NO CANAL"). O gerador recusa o que não cabe e diz a duração mínima de cada Cena.

Ritmo do reel: 25 a 45 s no total (limite técnico 15 a 90), Cenas de 3 a 8 s, a primeira bate uma palavra em até 2 s (`impacto`). Story: cada um com pelo menos 5 s.

Quando usar cada tipo:
- **texto** — explicar com frases: kicker, título, até 6 linhas ou 4 itens numerados, pergunta, ícone, dica. É o formato antigo.
- **impacto** — gancho e viradas: 1 a 4 palavras grandes que batem uma por vez.
- **odometro** — um número que importa (ano, quantidade, resultado) girando até o valor.

Números, contas e pesos que aparecem na tela entram na Checagem (`checagem.json`, `onde: "cena N"`).

Os tempos de entrada de cada tipo ficam em `design-system/motion/movimento.json` (`ritmo.<tipo>`); os números deste guia são os de hoje.

## texto

    { "duracao": 7, "kicker": "UM ENIGMA DE KÖNIGSBERG", "titulo": "DÁ PARA ATRAVESSAR AS 7 PONTES?", "linhas": ["Uma ilha, dois braços de rio", "Passar por todas sem repetir"] }

Campos: `kicker` ≤ 40, `titulo` ≤ 60, `linhas` (até 6, ≤ 90) **ou** `itens` (até 4, `{titulo ≤ 20, texto ≤ 90}`), `pergunta` ≤ 60, `dica` ≤ 30, `icone` (nome de `design-system/miniaturas/icones/`).

## impacto

    { "tipo": "impacto", "duracao": 3, "palavras": ["7 PONTES", "1 PASSEIO"], "apoio": "sem repetir nenhuma" }

Campos: `palavras` (1 a 4, ≤ 14 cada), `apoio` ≤ 60, `kicker`. Sem `titulo`. Cada palavra entra 0,55 s depois da anterior.

## odometro

    { "tipo": "odometro", "duracao": 5, "titulo": "O ANO DO ARTIGO", "valor": 1736, "rotulo": "Euler escreve sobre as pontes" }

Campos: `valor` (número, sem aspas), `casas_decimais` (0 a 2), `prefixo` ≤ 6 (ex.: "R$"), `sufixo` ≤ 10 (ex.: "km"), `rotulo` ≤ 60, `kicker`, `titulo`. O valor formatado tem até 9 caracteres. Sai com separadores em pt-BR: 12.000 e 3,5; inteiros abaixo de 10 000 não levam ponto (o ano fica 1736, não 1.736).
