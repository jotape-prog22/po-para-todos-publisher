# Pipeline de vídeo — PO para Todos

Produção de um vídeo de aula do canal Pesquisa Operacional para Todos (UNIRIO), do tema ao link no YouTube. Uma pessoa decide (aprova o roteiro, grava, torna público); o Claude escreve e monta.

## Language

**Vídeo**:
Uma aula do canal, representada por uma pasta `videos/<slug>/` com todos os seus arquivos.
_Avoid_: aula (é o conteúdo, não a unidade de trabalho), projeto

**Slug**:
Identificador da pasta do vídeo: tema em minúsculas com hífens (`folgas-complementares`). Mesmo padrão dos ids de `catalogo.json`.
_Avoid_: nome da pasta, id

**Briefing**:
Formulário curto (`briefing.md`) que a pessoa preenche antes de tudo: tema, formato, duração alvo, público, playlist, vídeos relacionados.
_Avoid_: pauta, pedido

**Formato**:
Natureza do vídeo, um dos oito ids de `design-system/miniaturas/formatos.json` (tutorial, conceito, exercicio, serie, erros, comparativo, ferramenta, rapido). Decide a faixa da miniatura.
_Avoid_: tipo de vídeo, categoria

**Roteiro**:
`roteiro.md`: o que será dito e mostrado, em Gancho, Objetivos, Blocos e seções finais, cada parte com duração estimada.
_Avoid_: script, texto

**Gancho**:
Os primeiros ≤ 30 s do roteiro, abrindo com uma pergunta. É reaproveitado como primeiro parágrafo da descrição.
_Avoid_: introdução, abertura (é o nome do capítulo, não da seção)

**Bloco**:
Unidade numerada do roteiro com tipo (`conteudo` ou `exemplo`), duração, o que aparece no slide e a fala. Um bloco vira exatamente um slide e um capítulo.
_Avoid_: tópico, parte, seção

**Capítulo**:
Linha `mm:ss Título` da descrição do YouTube. Estimado pela soma das durações do roteiro; substituído pelos tempos reais antes de publicar.
_Avoid_: timestamp, marcador

**Slides**:
`slides.json` (um objeto por slide, derivado do roteiro) e `slides.pptx` (gerado). Tipos: capa, conteudo, exemplo, encerramento.
_Avoid_: deck, apresentação

**Metadados**:
`metadados.json`: títulos candidatos, título escolhido, fechamento, complemento do CTA, hashtags do tema, tags, capítulos e descrição final.
_Avoid_: SEO, informações do vídeo

**Miniatura**:
`miniatura.png`, 2560×1440, gerada por `gerar-miniatura.mjs` conforme `design-system/miniaturas/GUIA-AGENTE.md`.
_Avoid_: thumbnail, capa (é um tipo de slide)

**Publicação**:
Upload privado do vídeo com título, descrição, tags, miniatura e playlist, registrado em `publicacao.json`. Tornar público é ação manual da pessoa.
_Avoid_: postar, lançar

**Canal**:
`canal.json`: o que se repete em toda publicação — links, rodapé, hashtags fixas, playlists, categoria.
_Avoid_: configuração, settings

**Post**:
Uma publicação no Instagram, representada pela pasta `instagram/<AAAA-MM-DD>-<slug>/` (a data é a de publicação prevista: a pasta é um calendário). Tipos do primeiro corte: `artigo` (carrossel), `aviso` (card único), `curiosidade` (card "você sabia?") e `citacao` (trecho de vídeo/post).

_Avoid_: publicação (é o registro do upload), postagem

**Card**:
Uma imagem 1080×1350 de um post (`card-NN.png`), gerada de `cards.json` por `gerar-cards.mjs`. Tipos: `capa`, `ideia`, `fim`, `aviso`.
_Avoid_: slide, arte, imagem

**Legenda**:
`legenda.json` (gancho ≤ 125 caracteres, corpo, autores, hashtags do tema) e `legenda.txt` (montado por `scripts/legenda.mjs` com CTA e rodapé de `canal.json`).
_Avoid_: descrição (é a do YouTube), caption

**Story**:
Publicação de 1080×1920 do Instagram, que some em 24 h. Publicada pela API quando não leva sticker interativo; manual, pelo app, quando leva (link, quiz, enquete — a API não os desenha).
_Avoid_: stories, destaque

**Story de vídeo novo**:
`videos/<slug>/story.png`, gerado pela skill `publicar` ao final do vídeo, com o sticker de link para o vídeo que acabou de ficar público. Sempre manual — é o motivo do sticker, que a API não desenha. Um vídeo novo gera só esse story, nunca post de feed.
_Avoid_: story de lançamento

**Sequência de stories**:
Vários `story-NN.mp4` (gerados de `instagram/<pasta>/stories.json`) publicados um atrás do outro sobre um mesmo tema — um aviso de post novo, um quiz "respondido" (pergunta num story, resposta no seguinte, sem sticker). Publicada pela API quando nenhum story da sequência leva sticker interativo.
_Avoid_: stories em vídeo

**Checagem**:
Passo que confere se as afirmações de um post (fatos, números, a resposta de um quiz) se sustentam na fonte, antes da aprovação. Aparece explícita na parada de aprovação ("o que confirmei / o que não confirmei"), nunca silenciosa.
_Avoid_: fact-check, validação

**Reel**:
Vídeo curto vertical (9:16) do Instagram, publicado pela API. Nasce de um Corte de vídeo já publicado ou é escrito do zero como uma Curiosidade mais longa; nunca leva narração sintética.
_Avoid_: vídeo curto, short

**Corte**:
Trecho de um vídeo já publicado no YouTube, baixado pela pipeline para virar um Reel — o Gancho do roteiro ou um bloco `exemplo` autocontido, escolhido pela pessoa entre 2 a 3 candidatos sugeridos. Mantém o áudio original; a moldura vertical usa fundo de marca, nunca corte ou desfoque das bordas.
_Avoid_: clipe

**Citação**:
Card único do Instagram com um trecho marcante de um vídeo ou post já existente, escolhido pela pessoa entre candidatos sugeridos pela pipeline.
_Avoid_: quote, destaque de texto

**Curiosidade**:
Card avulso "você sabia?" sobre Pesquisa Operacional, escrito a partir de um pedido, sem vídeo ou post por trás — passa pela mesma Checagem de um `artigo`.
_Avoid_: fato, dica

**Pacote**:
Pedido que dispara mais de um formato numa sequência fixa (o conteúdo original, depois o story de aviso, depois o Reel). Nunca disparado sozinho pela pipeline de vídeo — sempre por pedido explícito da pessoa.
_Avoid_: combo, lote

**Mídia temporária**:
Branch `midia` do repositório no GitHub: recebe os cards em JPEG num commit órfão só enquanto a Meta os baixa e volta a ficar vazio ao final de cada publicação.
_Avoid_: CDN, hospedagem
