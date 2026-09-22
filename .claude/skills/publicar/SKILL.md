---
name: publicar
description: Sobe um vídeo gravado do PO para Todos ao YouTube como privado, com título, descrição, tags, miniatura e playlist, usando o MCP youtube. Use quando a pessoa disser que gravou e quer publicar.
---

# Publicar

Diga antes: "Vou subir o vídeo como **privado**, com título, descrição, tags, miniatura e playlist. Tornar público é você quem faz, no YouTube Studio."

## 1. Pré-checagem (pare no primeiro problema)

1. Pergunte onde está o arquivo gravado (`.mp4`/`.mov`) se a pessoa não disse. Confira que existe: `ls -la "<caminho>"`. Se não existir, pare e diga "não achei o arquivo" — não siga para os próximos itens nem para o upload.
2. `videos/<slug>/metadados.json` tem `titulo` preenchido e `descricao` gerada — senão, rode a skill `titulo-descricao`.
3. `videos/<slug>/miniatura.png` existe — senão, rode a skill `miniatura`.
4. MCP conectado: chame `youtube_auth_status`. Se não estiver autenticado, peça para a pessoa rodar `youtube_auth` (abre o navegador para login no Google) e espere.
5. **Capítulos reais**: mostre os capítulos de `metadados.json` e pergunte: "Esses tempos são estimados. Você tem os tempos reais da gravação? Cole no formato `mm:ss Título`, ou responda 'iguais' para manter." Se vierem tempos novos, substitua `capitulos` em `metadados.json` (mesmos títulos, na mesma ordem) e rode `node scripts/descricao.mjs videos/<slug>` de novo.

## 2. Suba

Chame, nesta ordem, parando e reportando se qualquer uma falhar (não tente corrigir com atualizações parciais):

1. `youtube_upload_video` com `file_path` = caminho absoluto do vídeo, `title` = `metadados.titulo`, `description` = `metadados.descricao`, `tags` = `metadados.tags`, `category_id` = `canal.json.categoriaYoutube` ("27"), `privacy_status` = `"private"`. Guarde o `id` retornado. (Custa 1.600 unidades da cota diária de 10.000 — avise a pessoa se `youtube_auth_status` mostrar menos de 2.000 disponíveis.)
2. `youtube_set_thumbnail` com `video_id` e `file_path` = caminho absoluto de `miniatura.png`.
3. `youtube_add_to_playlist` com `playlist_id` = `canal.json.playlists[<playlist do roteiro>].id` e `video_id` = o id retornado no passo 1.

## 3. Registre

Escreva `videos/<slug>/publicacao.json`:
```json
{ "video_id": "…", "url": "https://youtu.be/…", "publicado_em": "<ISO agora>", "privacidade": "private", "playlist_id": "…" }
```

## 4. Story para o Instagram

Run: `node design-system/scripts/gerar-story.mjs videos/<slug>`

Abra `videos/<slug>/story.png` e confira que headline, subhead e ícone são os mesmos da miniatura. Se a busca pelo título escolheu outro tópico, rode de novo com `--topico <id>` (o mesmo usado na miniatura). Este story **não** vai pela API: o link é o motivo dele e a API não coloca sticker (`docs/adr/0007`). Post, quiz e reel do vídeo só saem se a pessoa pedir — sugira, no fim, "quando o vídeo estiver público, posso fazer o pacote do Instagram (post + story + reel) se você quiser".

Entregue: "Vídeo no ar como privado: https://youtu.be/… . Para publicar: YouTube Studio → Conteúdo → o vídeo → Visibilidade → Público. Confira a miniatura e a descrição lá antes. Quando tornar o vídeo público, poste `videos/<slug>/story.png` no Instagram como story, com o sticker de link apontando para https://youtu.be/… — coloque o sticker no espaço vazio acima da faixa verde."
