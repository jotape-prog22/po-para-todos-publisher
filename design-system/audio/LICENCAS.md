# Licenças do áudio

Todo som usado nos vídeos do Instagram vem de fonte gratuita com licença explícita para uso comercial (ADR-0012). A fonte da verdade é `biblioteca.json`; esta tabela é para gente.

| Arquivo | Tipo | Origem | Licença |
|---|---|---|---|
| trilhas/pizzicato-misterio.mp3 | Trilha (curioso, tenso) | VitMatNotes — Midnight Tiptoe — https://pixabay.com/music/cartoons-midnight-tiptoe-532222/ | Pixabay Content License |
| trilhas/faiscas-espertas.mp3 | Trilha (curioso, animado) | kissan4 — Smart Sparks — https://pixabay.com/music/upbeat-smart-sparks-436614/ | Pixabay Content License |
| trilhas/tutorial-animado.mp3 | Trilha (animado, leve) | MiroMaxMusic — Educational Presentation Tutorial Music — https://pixabay.com/music/upbeat-educational-presentation-tutorial-music-440118/ | Pixabay Content License |
| trilhas/estudo-leve.mp3 | Trilha (leve, reflexivo) | chill_background — Study — https://pixabay.com/music/beats-study-110111/ | Pixabay Content License |
| trilhas/jazz-foco.mp3 | Trilha (leve) | alex-morgan — Jazz Focus Study Music — https://pixabay.com/music/modern-jazz-jazz-focus-study-music-556237/ | Pixabay Content License |
| trilhas/piano-reflexivo.mp3 | Trilha (reflexivo) | PaulYudin — Piano - Piano Music — https://pixabay.com/music/solo-piano-piano-piano-music-508963/ | Pixabay Content License |
| trilhas/detetives-tensos.mp3 | Trilha (tenso, curioso) | futuristic_poetry — The Detectives Are Coming — https://pixabay.com/music/crime-scene-the-detectives-are-coming-237516/ | Pixabay Content License |
| trilhas/piano-inspirador.mp3 | Trilha (reflexivo, animado) | Kulakovka — Inspiring Piano Cinematic Trailer — https://pixabay.com/music/epic-classical-inspiring-piano-cinematic-trailer-614895/ | Pixabay Content License |
| efeitos/tick-1.wav | Efeito (tick) | Kenney, Interface Sounds — https://kenney.nl/assets/interface-sounds | CC0 |
| efeitos/tick-2.wav | Efeito (tick) | Kenney, Interface Sounds — https://kenney.nl/assets/interface-sounds | CC0 |
| efeitos/pop-1.wav | Efeito (pop) | Kenney, Interface Sounds — https://kenney.nl/assets/interface-sounds | CC0 |
| efeitos/pop-2.wav | Efeito (pop) | Kenney, Interface Sounds — https://kenney.nl/assets/interface-sounds | CC0 |
| efeitos/digitar-1.wav | Efeito (digitar) | Kenney, UI Audio — https://kenney.nl/assets/ui-audio | CC0 |
| efeitos/digitar-2.wav | Efeito (digitar) | Kenney, UI Audio — https://kenney.nl/assets/ui-audio | CC0 |
| efeitos/impacto-1.wav | Efeito (impacto) | Kenney, Impact Sounds — https://kenney.nl/assets/impact-sounds | CC0 |
| efeitos/impacto-2.wav | Efeito (impacto) | Kenney, Impact Sounds — https://kenney.nl/assets/impact-sounds | CC0 |
| efeitos/sino-1.wav | Efeito (sino) | Kenney, Interface Sounds — https://kenney.nl/assets/interface-sounds | CC0 |
| efeitos/sino-2.wav | Efeito (sino) | Kenney, Interface Sounds — https://kenney.nl/assets/interface-sounds | CC0 |
| efeitos/whoosh-1.wav | Efeito (whoosh) | biww — Short Swoosh Whoosh Sound — https://pixabay.com/sound-effects/film-special-effects-short-swoosh-whoosh-sound-561933/ | Pixabay Content License |
| efeitos/caneta-1.wav | Efeito (caneta) | freesound_community — Pencil Writing on Paper — https://pixabay.com/sound-effects/film-special-effects-pencil-writing-on-paper-84424/ | Pixabay Content License |
| efeitos/caneta-2.wav | Efeito (caneta) | spinopel — Hand lettering with marker pen — https://pixabay.com/sound-effects/film-special-effects-hand-lettering-with-marker-pen-345733/ | Pixabay Content License |

- **Pixabay Content License**: uso comercial gratuito, sem atribuição obrigatória; não vender o arquivo isolado. https://pixabay.com/service/license-summary/
- **CC0**: domínio público. https://creativecommons.org/publicdomain/zero/1.0/
- **YouTube Audio Library — sem atribuição**: uso livre em vídeos, sem crédito. https://studio.youtube.com (Biblioteca de áudio)

Só faixas sem 'Content ID Registered' na página do Pixabay — faixa com Content ID pode gerar reivindicação ou som silenciado mesmo com a licença.

## O áudio não está no GitHub

Os arquivos com **Pixabay Content License** (as 8 trilhas e `efeitos/whoosh-1.wav`, `caneta-1.wav`, `caneta-2.wav`) não vão para o git: o repositório é público e a licença proíbe distribuir o arquivo isolado. Ficam só no disco de quem produz, listados no `.gitignore`; esta tabela e `biblioteca.json` continuam no git. Os efeitos Kenney (CC0) continuam no git.

- **Backup:** `~/.po-para-todos/audio/` (mesma estrutura: `trilhas/`, `efeitos/`), guardado em lugar privado.
- **Restaurar num computador novo:** `cp -R ~/.po-para-todos/audio/* design-system/audio/` na pasta do projeto, ou baixe de novo pelos links da tabela acima, com o nome da coluna "Arquivo".
- **Som novo do Pixabay:** o arquivo também vai para o backup; efeito novo também ganha uma linha no `.gitignore`.
- `node scripts/audio.mjs` avisa cada arquivo que falta; reel com Trilha ausente para com erro dizendo onde copiar; efeito ausente só fica de fora do vídeo.
