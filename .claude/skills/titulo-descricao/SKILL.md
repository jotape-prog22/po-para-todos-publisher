---
name: titulo-descricao
description: Propõe títulos, monta a descrição e as tags do YouTube de um vídeo do PO para Todos, gravando em metadados.json. Use quando a pessoa pedir título/descrição, ou quando a skill video chegar nessa etapa.
---

# Título, descrição e tags

Diga antes: "Vou propor 5 títulos para você escolher e montar a descrição no padrão do canal."

## 1. Leia

- `videos/<slug>/roteiro.md` (válido) e `canal.json`.
- `videos/folgas-complementares/metadados.json` e `descricao-publicada.txt` — o padrão.
- `design-system/miniaturas/catalogo.json` — apelidos do tópico viram tags.

## 2. Títulos

Padrão do canal: `PALAVRA-CHAVE EM CAIXA ALTA - Complemento em Title Case`, com ` - Parte N` no fim se for série. Máximo 70 caracteres, sem exclamação. Proponha 5 variando a palavra-chave: nome técnico (TEOREMA DAS FOLGAS COMPLEMENTARES), termo curto (FOLGAS COMPLEMENTARES), ferramenta (SOLVER NO EXCEL), pergunta (PREÇO-SOMBRA - De Onde Ele Vem?). Valide cada um:

Run: `node scripts/descricao.mjs --validar-titulo "TÍTULO"`

Apresente numerados e peça a escolha (recomende um). Grave em `titulos_candidatos` e `titulo`.

## 3. Campos da descrição

Escreva em `metadados.json`:
- `fechamento`: uma frase com o resultado concreto do exemplo ("Fechamos com um exemplo completo, … W* = Z* = 36.").
- `cta_complemento`: completa "compartilhar o vídeo com quem …" ("está penando com dualidade").
- `hashtags_tema`: 3 a 4, em CamelCase sem acento (`#FolgasComplementares`).
- `tags`: 10 a 15 termos de busca — nome do tema, sinônimos e apelidos do catálogo, área, "pesquisa operacional", "UNIRIO", "PO para Todos".
- `capitulos`: `null` (o script calcula do roteiro; a skill `publicar` troca pelos tempos reais).
- `descricao`: `null`.

## 4. Gere

Run: `node scripts/descricao.mjs videos/<slug>`

O comando grava `capitulos` e `descricao` e imprime a descrição. Leia-a inteira: gancho, objetivos, fechamento, capítulos, relacionados, rodapé, CTA, hashtags. Se algo estiver estranho, corrija o roteiro ou o metadados e rode de novo — nunca edite `descricao` à mão.

## 5. Entregue

Mostre o título escolhido e a descrição, e diga: "Os capítulos são estimados pelo roteiro; depois que você gravar, a gente ajusta com os tempos reais antes de publicar."
