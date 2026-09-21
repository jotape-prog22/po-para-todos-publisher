# Como funciona a PO — sequência de stories (vídeo)

Cinco stories em vídeo (`story-01.mp4` … `story-05.mp4`, 1080×1920, sem som), publicados **à mão pelo app**, nesta ordem, um atrás do outro. A interação vem dos stickers do Instagram: o vídeo deixa o espaço entre a última linha e a faixa verde livre para eles. Enquete e quiz aceitam até 4 opções.

Gerar de novo depois de mudar `stories.json`: `node design-system/scripts/gerar-story-video.mjs instagram/2026-09-22-como-funciona-po`.

## Como postar

1. No app, toque em **+ › Story** e escolha `story-01.mp4` do celular (envie os MP4 por AirDrop, WhatsApp "documento" ou Google Drive — pelo WhatsApp "vídeo" a qualidade cai).
2. Toque no ícone de sticker, escolha o sticker indicado abaixo, escreva a pergunta e as opções e arraste-o para o espaço vazio acima da faixa verde, abaixo da seta.
3. Se estiver difícil ler, o vídeo pode estar ampliado: afaste os dedos até ver a faixa verde inteira.
4. Publique e repita para o próximo story. Não corte o vídeo (o app oferece cortar; ignore).

## Os stories e seus stickers

| # | Arquivo | Duração | Sticker | Texto do sticker |
|---|---|---|---|---|
| 1 | `story-01.mp4` | 13 s | **Quiz** | Pergunta: "O que rende mais?" · Opções: "Só pães" / "Só bolos" / "Misturar" · Certa: **Misturar** |
| 2 | `story-02.mp4` | 12 s | **Enquete** | "Acertou?" · "Acertei" / "Errei" / "Chutei" |
| 3 | `story-03.mp4` | 13 s | **Enquete** | "Já tinha visto uma decisão escrita assim?" · "Já" / "Nunca" |
| 4 | `story-04.mp4` | 12 s | **Enquete** | "Qual passo parece mais difícil?" · "Modelar" / "Resolver" / "Decidir" |
| 5 | `story-05.mp4` | 10 s | **Link** | `https://youtu.be/v5KRSzU2E4U` (aula inaugural: PESQUISA OPERACIONAL - O Que É e Por Onde Começar) · texto do sticker: "Assistir a aula" |

No story 5 o sticker de link vai entre "Quer começar do começo?" e a faixa "AULA INAUGURAL NO CANAL".

## A conta por trás do desafio

Pão: 1 h de forno, R$ 30; bolo: 2 h, R$ 50; 8 h de forno; no máximo 5 pães. Testando as combinações inteiras que cabem no forno: 5 pães + 1 bolo = R$ 200; 4 pães + 2 bolos = **R$ 220**; 2 pães + 3 bolos = R$ 210; 4 bolos = R$ 200; 5 pães = R$ 150. Se alguém perguntar: sem exigir bolos inteiros, o modelo dá 5 pães e 1,5 bolo (R$ 225) — a diferença entre programação linear e inteira é assunto para outro story.

## Depois de publicar

- Salvar a sequência num destaque ("O que é PO") para não sumir em 24 h.
- Ver as respostas do quiz e das enquetes em cada story (arrastar para cima); anotar o que a maioria errou — vira ideia de post.
