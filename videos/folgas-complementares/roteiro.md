---
titulo_provisorio: Teorema das Folgas Complementares
formato: conceito
duracao_alvo_min: 17
playlist: dualidade
apresentador: Apresentador do PO para Todos
relacionados:
  - url: https://youtu.be/yGP0LK19R30
    contexto: "Quer ver o Preço-Sombra aparecendo na prática, dentro do Excel? Assista à aula sobre o Relatório de Sensibilidade do Solver"
---

## Gancho
Duração: 36 s

Você resolveu o Primal e achou o ótimo. Mas e o Dual — precisa rodar o Simplex tudo de novo? 🤔 Não precisa. Nesta aula vamos usar o Teorema das Folgas Complementares para achar a solução ótima do Dual direto a partir do Primal.

## Objetivos
Duração: 38 s

- O que é a "folga" de uma restrição e por que ela decide se a variável dual vale zero.
- As duas relações de complementaridade, enunciadas e explicadas na intuição antes da fórmula.
- Como montar o Dual de um problema de maximização e resolvê-lo sem refazer o Simplex.
- O que é o Preço-Sombra e por que ele é a base da análise de sensibilidade.

## Blocos

### 1. Relembrando: Primal e Dual
Tipo: conteudo · Duração: 54 s

**No slide**
- Primal: todo problema de PL tem um par. Maximização com restrições ≤ vira minimização com restrições ≥.
- Cada restrição do Primal gera **uma variável** do Dual; cada variável do Primal gera **uma restrição** do Dual.
- Dualidade Forte: no ótimo, **Z\* = W\***.

**Fala**
Antes do teorema, vamos relembrar o que é o par Primal–Dual. Repare que não é um problema novo: é o mesmo problema visto do lado dos recursos.

### 2. A intuição: o que é uma "folga"?
Tipo: conteudo · Duração: 74 s

**No slide**
- Folga é o quanto **sobra** de um recurso na solução ótima.
- Restrição com folga = recurso sobrando = aumentar esse recurso **não muda** o lucro.
- Se não muda o lucro, o "preço" desse recurso no Dual é **zero**.

**Fala**
Pense num recurso que sobrou. Se sobrou, comprar mais dele não adianta nada — e é por isso que a variável dual dele vale zero. Essa é a ideia inteira do teorema.

### 3. O Teorema — Enunciado
Tipo: conteudo · Duração: 50 s

**No slide**
- Sejam x\* ótimo do Primal e y\* ótimo do Dual.
- Para cada restrição i do Primal: **folga_i × y\*_i = 0**.
- Para cada variável j do Primal: **x\*_j × folga_dual_j = 0**.

**Fala**
Agora o enunciado formal. Cada produto é zero: ou a folga é zero, ou a variável é zero. Nunca os dois positivos ao mesmo tempo.

### 4. As relações de complementaridade
Tipo: conteudo · Duração: 70 s

**No slide**
- Condição 1: Se uma restrição do Primal tem **folga**, a variável dual correspondente vale zero.
- Condição 2: Se uma variável do Primal é **positiva**, a restrição dual correspondente é ativa (sem folga).
- Vale o contrário também: as duas condições são simétricas.

**Fala**
Vamos ler as duas condições com calma. A primeira fala das restrições do Primal; a segunda, das variáveis. Repare que uma é o espelho da outra.

### 5. Por que o teorema é útil?
Tipo: conteudo · Duração: 68 s

**No slide**
- Com x\* em mãos, as condições viram um **sistema linear** em y.
- Resolver esse sistema é muito mais rápido do que rodar o Simplex de novo.
- Os y\* são os **Preços-Sombra**: quanto vale uma unidade a mais de cada recurso.

**Fala**
Na prática o teorema transforma o Dual num sisteminha de equações. E o resultado tem nome: Preço-Sombra, que vocês vão reencontrar na análise de sensibilidade.

### 6. Exemplo — O Primal
Tipo: exemplo · Duração: 50 s

**No slide**
max Z = 3x1 + 5x2
s.a. x1 ≤ 4
2x2 ≤ 12
3x1 + 2x2 ≤ 18
x1, x2 ≥ 0
Resultado: x\* = (2, 6), Z\* = 36

**Fala**
Este é o Primal clássico. Já resolvemos ele no vídeo de Simplex: o ótimo é x1 = 2, x2 = 6 e Z = 36. Vamos partir daí.

### 7. Exemplo — Montando o Dual
Tipo: exemplo · Duração: 286 s

**No slide**
min W = 4y1 + 12y2 + 18y3
s.a. y1 + 3y3 ≥ 3
2y2 + 2y3 ≥ 5
y1, y2, y3 ≥ 0
Resultado: três variáveis duais, uma por recurso

**Fala**
Cada restrição do Primal virou uma variável y. Cada variável x virou uma restrição. Os lados direitos trocaram de lugar com os coeficientes do objetivo. Vamos montar linha por linha.

### 8. Exemplo — Analisando as folgas
Tipo: exemplo · Duração: 108 s

**No slide**
Restrição 1: x1 = 2 < 4 → folga 2 → y1 = 0
Restrição 2: 2·6 = 12 → sem folga → y2 livre
Restrição 3: 3·2 + 2·6 = 18 → sem folga → y3 livre
Resultado: y1\* = 0; y2 e y3 vêm das restrições ativas

**Fala**
Substituímos x\* em cada restrição. A primeira sobra: dois de folga, então y1 é zero. As outras duas estão justas, então seus preços podem ser positivos.

### 9. Exemplo — Resolvendo o Dual
Tipo: exemplo · Duração: 50 s

**No slide**
x1 > 0 → y1 + 3y3 = 3 → y3 = 1
x2 > 0 → 2y2 + 2y3 = 5 → y2 = 3/2
Resultado: y\* = (0, 3/2, 1)

**Fala**
Como x1 e x2 são positivos, as duas restrições duais são ativas: viram igualdades. Duas equações, duas incógnitas. Sem Simplex.

### 10. Exemplo — Dualidade Forte
Tipo: exemplo · Duração: 76 s

**No slide**
W\* = 4·0 + 12·(3/2) + 18·1
W\* = 18 + 18 = 36
Resultado: W\* = Z\* = 36

**Fala**
Conferimos: W é 36, exatamente o Z do Primal. Dualidade Forte confirmada — e de quebra ganhamos os três preços-sombra.

## Resumo — Pontos-chave
Duração: 48 s

- Folga positiva ⇒ variável dual zero; variável positiva ⇒ restrição dual ativa.
- Com o ótimo do Primal, o Dual vira um sistema linear.
- Os y\* são os Preços-Sombra.

## Encerramento
Duração: 40 s

Se você quer ver o Preço-Sombra aparecendo na prática, dentro do Excel, assista à aula sobre o Relatório de Sensibilidade do Solver. Deixa o like, se inscreve e compartilha com quem está penando com dualidade!
