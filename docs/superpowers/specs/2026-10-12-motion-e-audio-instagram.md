# Motion design e som nos vídeos do Instagram

Desenhado com `/grill-me` em 12/10/2026. Termos em `CONTEXT.md` (Cena, Trilha, Efeito sonoro, Reel); decisões em `docs/adr/0011` (motor) e `docs/adr/0012` (som).

## O que muda

Os reels de Cenas, as sequências de stories e o story de aviso deixam de ser "bloco de texto que sobe e aparece" e passam a ter motion design: tipografia de impacto no gancho, "quadro de aula" na explicação (caneta que desenha grafos, contas e gráficos), transições entre Cenas e final em loop. O reel de Cenas ganha Trilha e Efeitos sonoros; stories ganham só Efeitos discretos; o Corte ganha moldura animada e mantém a voz original, sem Trilha.

## Decisões

1. **Motor.** Chrome/Puppeteer + ffmpeg, como hoje. Cada quadro é desenhado em Canvas2D como função pura do tempo (o mesmo `t` dá sempre o mesmo quadro). Primitivas portadas do kit "Motion as Code" (pdoom-video, MIT) para `design-system/motion/`, com o aviso de licença. Nada de WebGL, bun, Vite ou TypeScript.
2. **Formato.** 1080×1920, 30 fps, H.264 yuv420p, AAC. Áudio sempre presente (a Meta recusa MP4 sem faixa de áudio).
3. **Design system.** Fundo `surface` (grafite quase preto), verde como acento, cor da caneta e do caminho destacado. Fontes do design system (Archivo Black, Poppins, Baloo 2). A geometria (zonas seguras, lockup, rodapé, faixa, tamanhos de fonte) é medida do mesmo CSS de `design-system/instagram/` — a calibração (`npm run calibrar`) continua valendo. Tokens de movimento em `design-system/motion/movimento.json`; `tokens.json` não muda.
4. **Impacto contido.** No protótipo de 12/10 o visual foi aprovado, mas o tremor e o clarão da batida ficaram exagerados: no motor eles são suaves (tremor de ~3 px, clarão quase imperceptível) e ajustáveis em `movimento.json`.
5. **Textura.** Grade quadriculada sutil só nas Cenas de "conta" (`grafo`, `conta`, `grafico`, `tabela`), revelada do centro; grão leve em tudo.
6. **Escrita.** A fonte do design system revelada da esquerda para a direita com a ponta da caneta acompanhando — não fonte de traço único (sem acentos nem símbolos).
7. **Cenas.** Campo `tipo`: `texto` (o formato atual, padrão quando falta o campo — arquivos antigos continuam válidos), `impacto`, `odometro`, `grafo`, `conta`, `grafico`, `tabela`. O grafo recebe posições numa grade 0–10 (sem layout automático) e aceita arestas paralelas (Königsberg).
8. **Ritmo.** Limite técnico do reel: 15 a 90 s. A skill mira 25 a 45 s, Cenas de 3 a 8 s, primeira palavra de impacto em até 2 s. Story: cada um com pelo menos 5 s.
9. **Trilha.** Biblioteca em `design-system/audio/biblioteca.json`: cada faixa com fonte, link, licença, clima, BPM e tempo da primeira batida (medidos uma vez por `scripts/audio.mjs --medir`). As fronteiras entre Cenas caem no compasso; a Trilha começa no zero, entra com fade e sai com fade no fim. Mix a −14 LUFS.
10. **Efeitos sonoros.** Disparados pelos eventos da linha do tempo de cada Cena (caneta, pop, whoosh, tick, impacto, digitar, sino). Ganho cheio no reel, reduzido no story.
11. **Licenças.** Só fontes gratuitas com licença explícita para uso comercial: Pixabay Content License, YouTube Audio Library "sem atribuição", CC0 (Kenney, Freesound). Os sons que vieram no kit não entram.
12. **Loop.** O reel cuja última Cena não tem `faixa` termina com o conteúdo recolhendo até o fundo limpo, igual ao primeiro quadro.
13. **Prévia.** `--ver` abre no navegador a página do motor com a linha do tempo arrastável e o som.
14. **Rigor.** A Checagem cobre números, contas e pesos das Cenas novas (`onde: "cena N"`).
15. **Transição.** Nada aprovado ou agendado é regerado. Pilotos: Königsberg (reel) e quiz do Nobel (stories), em pastas de teste, comparados com a versão atual; a pessoa aprova antes do merge.

## Fora do escopo

Story de vídeo novo (`story.png`, estático). Narração sintética. Voz gravada para reels de Cenas.
