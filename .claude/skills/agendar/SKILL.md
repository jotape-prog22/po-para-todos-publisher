---
name: agendar
description: Agenda vários conteúdos prontos do Instagram do PO para Todos (posts, sequências de stories sem sticker, reels) para saírem sozinhos, um por dia, pelo GitHub Actions — junta as pastas, dá datas pela semana-modelo, abre a revisão em bloco para a pessoa aprovar, sobe a mídia aprovada e envia a agenda. Use quando a pessoa disser "agenda esses posts", "deixa a semana programada", "quero programar os conteúdos", "o que está na agenda" ou pedir para reagendar/ajustar um item.
---

# Agendar

Diga antes: "Vou pôr esses conteúdos na agenda, dar datas pela semana-modelo, abrir uma página para você aprovar tudo de uma vez e só então mandar para o GitHub publicar."

Regras (`docs/adr/0010`):
- **Nada sai sem aprovação.** Só o que você marcou "Aprovar" na revisão entra na fila; o publicador recusa o resto.
- **A regra da Checagem vale** (ADR 0009): `artigo`, `curiosidade`, sequência de stories e reel de cenas precisam de `checagem.json`; o `--adicionar` recusa sem ela e diz o que falta.
- **Story de vídeo novo e sequência com sticker são manuais** — não entram na agenda.
- **Nunca publique por aqui.** Publicar é do workflow. Para testar: `gh workflow run publicar-agenda.yml -f simular=true`.

## 1. Trazer o estado mais novo

```
node scripts/agenda.mjs --atualizar
node scripts/agenda.mjs --status
```
O workflow grava o estado no GitHub a cada publicação; sem `--atualizar` você edita uma agenda velha. Mostre o `--status` e diga o que há (rascunhos, agendados, falhas).

## 2. Juntar os conteúdos

Para cada pasta pronta (`instagram/<data>-<slug>/`, com mídia já gerada):
```
node scripts/agenda.mjs --adicionar instagram/<pasta>
```
Uma pasta com post e reel vira dois itens. Se aparecer "não adicionei — …", leia o motivo à pessoa e faça o que falta (rodar a Checagem, gerar o reel…) antes de seguir. Avisos ("sem story-aviso.mp4") só informam.

## 3. Dar datas

Pergunte só a data de início ("a partir de que segunda?") e rode:
```
node scripts/agenda.mjs --distribuir AAAA-MM-DD
node scripts/agenda.mjs --status
```
Semana-modelo padrão: reels seg/qua/sex às 12h, posts ter/qui/dom às 12h, quiz de stories no sábado às 18h. Para mudar um item: `--mover <id> AAAA-MM-DDTHH:MM`. Para mudar a regra da semana: edite `instagram/agenda-modelo.json`.

## 4. Revisão em bloco (parada obrigatória)

```
npm run revisar
```
Diga: "Abri uma página no navegador com todos os itens. Para cada um: **Aprovar**, **Pedir ajuste** (escreva o que mudar) ou **Tirar da agenda**. Quando terminar, volte aqui e me diga."

Quando a pessoa voltar, rode `--status`. Para cada item com `ajuste:` — leia a nota, corrija a pasta (cards.json, legenda.json, roteiro do reel…), regenere a mídia com o script do formato, refaça a Checagem se o conteúdo mudou, e diga que está pronto para nova revisão (a nota some quando a pessoa aprova). Itens que continuam "falta aprovar" ficam de fora da fila.

## 5. Enfileirar e enviar

```
node scripts/agenda.mjs --enfileirar
node scripts/agenda.mjs --enviar
```
`--enfileirar` sobe a mídia dos aprovados para o branch `fila` e os marca `agendado`. `--enviar` faz commit e push do `agenda.json`; o workflow só enxerga o que está no GitHub. Confirme com `--status` e diga a primeira e a última data.

## Depois: mexer no que já está agendado

- Mudar a data: `--mover <id> AAAA-MM-DDTHH:MM`, depois `--enviar`.
- Mudar o conteúdo: `--reabrir <id>`, ajuste a pasta, `npm run revisar`, `--enfileirar`, `--enviar`. (O que sai é o que foi aprovado e enfileirado; mudar a pasta sem reabrir não muda nada na nuvem.)
- Tirar: `--remover <id>`, depois `--enviar`.
- Item `FALHOU` ou `PERDIDO`: leia o `erro:` do `--status`, corrija a causa e reagende com `--mover <id> <nova data>` (uma data no futuro; isso volta o item a `agendado`), depois `--enviar`.
