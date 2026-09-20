---
name: roteiro
description: Escreve o roteiro.md de um vídeo do PO para Todos a partir do briefing.md. Use quando a pessoa pedir um roteiro, ou quando a skill video chegar nessa etapa.
---

# Roteiro

Você vai escrever `videos/<slug>/roteiro.md` a partir de `videos/<slug>/briefing.md`. Antes de começar, diga em uma frase o que vai fazer: "Vou ler o briefing e escrever o roteiro; depois você aprova ou pede ajustes."

## 1. Leia o que já existe

- `videos/<slug>/briefing.md` — se a pessoa deu só o tema, crie a pasta copiando `videos/_modelo/briefing.md` e preencha o que ela disse.
- `design-system/README.md`, seção "Voz e tom" — é a regra de escrita.
- `design-system/miniaturas/catalogo.json` — ache o tópico; use o `nome` como nome técnico correto.
- `videos/folgas-complementares/roteiro.md` — o exemplo de referência; siga o mesmo formato à risca.

## 2. Se faltar informação, pergunte em uma rodada

Não pergunte uma coisa por vez. Liste tudo que falta numa rodada só, no formato:

```
❓ **Q1** - **Duração**: quanto tempo o vídeo deve ter?
➡️ Sugiro 15 min: é a média dos vídeos de conceito do canal.
```

A pessoa pode responder só "ok" para aceitar todas as sugestões. Pergunte no máximo o necessário para: formato, duração alvo, público, playlist, apresentador, o que não pode faltar.

## 3. Escreva o roteiro

Formato obrigatório (o validador recusa qualquer desvio):

- Frontmatter YAML com `titulo_provisorio`, `formato`, `duracao_alvo_min`, `playlist`, `apresentador`, `relacionados` (lista de `url` + `contexto`; `[]` se não houver).
- `## Gancho` — `Duração: N s` na primeira linha; ≤ 30 s de fala; abre com uma pergunta e termina dizendo o que a aula vai fazer ("Nesta aula vamos…"). Vai literalmente para a descrição do YouTube.
- `## Objetivos` — `Duração: N s`; 3 a 5 itens com `- `, cada um uma frase completa começando por "O que…", "Como…", "Por que…". Viram a lista "você vai aprender".
- `## Blocos` — `### N. Título` numerados de 1; em cada um:
  - linha `Tipo: conteudo · Duração: N s` (ou `Tipo: exemplo`);
  - `**No slide**` — itens com `- ` (conteúdo) ou linhas de fórmula + `Resultado: …` (exemplo). Máximo ~9 linhas; o que não couber vira outro bloco;
  - `**Fala**` — o que o apresentador diz, 2 a 6 frases.
- `## Resumo — Pontos-chave` — `Duração: N s`; 3 itens.
- `## Encerramento` — `Duração: N s`; convite (vídeo relacionado, like, inscrição).

Regras de voz: imperativo ou "vamos"; nome técnico correto seguido de explicação comum; títulos de bloco são afirmações curtas ou perguntas; nada de "Descubra…", "O segredo…", exclamação.

Duração: a soma de todas as `Duração:` deve ficar a ±15 % da `duracao_alvo_min`. Um vídeo de conceito de 15 min costuma ter 8 a 10 blocos; um exemplo numérico longo pode ter 200–300 s.

## 4. Valide

Run: `node scripts/roteiro.mjs videos/<slug>/roteiro.md`

Se sair `erro: …`, corrija o roteiro e rode de novo. Só siga quando imprimir o JSON. Confira `duracao_total_s` contra a duração alvo.

## 5. Entregue

Mostre à pessoa: a lista de blocos com as durações e a duração total, e peça: "Leia o roteiro em `videos/<slug>/roteiro.md`. Quer mudar algo antes de eu montar os slides?" Não siga para os slides sem um sim.
