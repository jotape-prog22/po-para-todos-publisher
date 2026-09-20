# Braço Instagram — PO para Todos

Data: 2026-09-20. Aprovado em conversa (sessão de `grilling`). **Ainda não implementado**: esta spec registra o desenho para quando a pipeline de vídeo (`2026-09-20-pipeline-video-design.md`) estiver concluída.

## Objetivo

Publicar no Instagram do projeto (`@pesquisaoperacionalparatodos`) a partir do mesmo repositório, com o Claude Code escrevendo legenda e gerando as artes e uma pessoa aprovando antes de publicar. Restrição dominante: **custo zero** — o projeto de extensão não tem orçamento. Nenhum serviço pago, nenhum free tier de terceiro com cartão cadastrado; só GitHub, a API oficial da Meta e ferramentas open-source rodando na máquina de quem publica.

O mesmo público da pipeline de vídeo vale aqui: o leitor do README é um bolsista ou voluntário que pode nunca ter usado terminal.

## Papel do Instagram

O Instagram é um **canal próprio**, não uma vitrine dos vídeos. O que se publica hoje (levantado do perfil em 20/09/2026, doze posts mais recentes):

| Tipo | Frequência observada | O que é |
|---|---|---|
| resumo de trabalho científico | 5 de 12 | carrossel: título do artigo em caixa alta, "Autores: …", ideias principais |
| aviso/oportunidade | 3 de 12 | edital, evento, prazo de submissão (ENEGEP, SBPO, vaga de professor) |
| "Você sabia?" | 1 de 12 | curiosidade de PO em card único |
| reconhecimento | 1 de 12 | Hall SOBRAPO |
| data comemorativa | 2 de 12 | Natal, Ano Novo, com arte de banco |

Existe um destaque de stories "Videoaula" — o story avisando de vídeo novo já é prática do perfil. A bio aponta para um linktr.ee, que é o "link na bio" das legendas.

Um vídeo novo no YouTube gera **apenas um story**; não gera post de feed nem reel.

## Conta e credenciais

- A conta já é **profissional** (categoria Educação), verificado em 20/09/2026. Não há passo de conversão. Criador ou Empresa tanto faz para a API.
- Publicação pela **API oficial do Instagram com Instagram Login** (gratuita). Não exige Página do Facebook.
- App criado no Meta for Developers na conta de quem coordena o projeto; se for criado na conta de um bolsista, o coordenador entra como administrador do app. Para publicar na própria conta o app fica em modo de desenvolvimento, sem revisão da Meta.
- Token de longa duração (60 dias) em variável de ambiente `INSTAGRAM_ACCESS_TOKEN`, no mesmo esquema do `YOUTUBE_MCP_CLIENT_SECRET`. O script de publicar renova o token sozinho quando faltarem menos de 30 dias e avisa quando a renovação falhar.
- README com o passo a passo de criar o app, gerar o token e onde colocá-lo, com prints, na mesma linguagem do restante do repositório.

## Mecanismo de publicação

- Script Node no repositório (`scripts/instagram.mjs`, nome sujeito ao plano) chama a API oficial. Sem MCP de terceiros, sem biblioteca não oficial (instagrapi e afins arriscam bloqueio da conta institucional).
- A API exige que a mídia esteja em **URL pública** na hora do post. Solução: o repositório é público no GitHub e o script faz push do PNG/MP4 para um branch órfão `midia`, usa a URL `raw.githubusercontent.com`, e apaga o arquivo do branch depois que a Meta baixou (ela baixa ao criar o contêiner de mídia).
- **Publica na hora**, por comando, depois que a pessoa olhou os PNGs. A pipeline não agenda. Quem quiser data marcada usa o Meta Business Suite.
- **Fallback manual documentado**: os mesmos arquivos (`card-NN.png`, `legenda.txt`) servem para publicar à mão pelo app ou pelo Business Suite quando o token venceu e ninguém que sabe programar está por perto.
- Qualquer falha interrompe e reporta o passo, como na skill `publicar` do YouTube.

Limitações da API que a spec assume: stories pela API não têm stickers (link, menção, enquete); a biblioteca de músicas do Instagram não está disponível — o áudio de um reel tem de estar dentro do MP4.

## Tipos de post

Cinco tipos, três no primeiro corte.

| Tipo | Corte | Formato | Conteúdo |
|---|---|---|---|
| `artigo` | MVP | carrossel 4:5 | capa com título e autores; um card por ideia; card final com referência/link |
| `aviso` | MVP | card único 4:5 | nome, data-limite, link. `reconhecimento` (Hall SOBRAPO) é `aviso` sem data |
| `video-novo` | MVP | story 9:16 | arte gerada pela pipeline de vídeo; **publicado à mão** pelo app, com sticker de link (a API não põe o link, e o link é o motivo do story) |
| `curiosidade` | fase 2 | card único ou carrossel curto | "Você sabia?" |
| `comemorativa` | fase 2 | card único | Natal, Ano Novo, Dia do Engenheiro — modelo simples, pouca informação |

Para o `video-novo`: a skill `publicar` da pipeline de vídeo ganha um último passo que gera `videos/<slug>/story.png` e termina dizendo "quando tornar o vídeo público, poste `story.png` com o sticker de link apontando para `<link>`". Não há comando novo, porque o vídeo sobe privado e o story só faz sentido depois que fica público.

## Pasta de um post (`instagram/<AAAA-MM-DD>-<slug>/`)

| Arquivo | Quem escreve | Conteúdo |
|---|---|---|
| `post.md` | pessoa | tipo e os fatos brutos: para `artigo`, título, autores (com `@` quando tiverem), evento/revista, link, resumo colado; para `aviso`, nome, data-limite, link |
| `card-NN.png` | skill | artes geradas, uma por card |
| `legenda.txt` | skill | legenda pronta |
| `reel.mp4` | skill (fase 2) | reel gerado dos cards |
| `publicacao.json` | script de publicar | id do post, link, data |

`instagram/_modelo/post.md` traz as perguntas em branco por tipo, no mesmo espírito do `videos/_modelo/briefing.md`. A data no nome da pasta é deliberada: é um calendário, não um catálogo.

## Design

- Usa o **design system do canal** (`design-system/`): `brand-green`, `brand-navy`, Archivo Black/Poppins, ícones de `miniaturas/icones/`, `catalogo.json` para achar o ícone do tópico. Isso muda a cara do perfil (hoje verde/laranja nos posts antigos e azul estilo Canva nos recentes) — mudança intencional, para o Instagram e o YouTube serem a mesma marca.
- Formatos: feed **4:5 (1080×1350)**; story e reel **9:16 (1080×1920)**.
- Mesmo caminho das miniaturas: HTML → Chrome headless → PNG (`design-system/scripts/exportar.sh`).
- Nova pasta `design-system/instagram/` espelhando `miniaturas/`: `formatos.json`, layouts HTML por tipo, `GUIA-AGENTE.md`. Novo `fundamentos-instagram.md`. Os fundamentos existentes (`fundamentos-slides.md`, `fundamentos-youtube.md`) não são tocados.
- Todo card leva `@pesquisaoperacionalparatodos` no rodapé, como hoje.

## Legenda

- A primeira frase é o gancho e cabe nos **125 caracteres** que o Instagram mostra antes do "mais".
- Rodapé curto: uma linha do projeto + "link na bio". Sem "não esqueça do like".
- `hashtagsFixas` de `canal.json` + 3 a 4 do tema, com o mesmo critério de tags do YouTube (`catalogo.json`).
- `artigo`: autores por extenso e `@` de quem tiver.
- CTA por tipo: `artigo`/`curiosidade` → "salve o post"; `aviso` → "link na bio".

## Reels (fase 2)

- Motor: **Hyperframes** (HeyGen, Apache-2.0, `npx hyperframes`). Transforma HTML + CSS + animações em MP4 determinístico, renderizando localmente com Chrome headless e FFmpeg. Gratuito; a renderização em nuvem da HeyGen não é usada.
- Conteúdo: os `card-NN.png` (ou os mesmos HTMLs) animados em 9:16, 20 a 40 s, texto entrando cena a cena. **Sem voz e sem música** no primeiro corte: voz sintética (Kokoro) destoa do canal, e música exige resolver licença. Depois, o apresentador pode gravar um áudio curto e a pipeline monta o reel sobre ele.
- As skills do Hyperframes são instaladas pelo participante (`npx hyperframes skills update`), não vendorizadas — mesma decisão tomada para o superpowers. Uma skill própria `reel` escreve a composição a partir dos cards.
- README ganha um passo **opcional** "instalar FFmpeg e Hyperframes", só na seção de reels. O MVP não depende disso.
- A skill `/brag` (latent-spaces/brag), que motivou a avaliação, **não** é usada: é um gerador de "vídeo de lançamento" de software; só o motor por baixo dela interessa.
- Hyperframes **não entra na pipeline do YouTube**, nem para vinhetas, nem no futuro. O YouTube continua PPTX + gravação.

## Ordem de implementação

1. MVP: `artigo` + `aviso` de ponta a ponta (`post.md` → cards → legenda → API), mais o `story.png` na skill `publicar` do YouTube.
2. Só quando o ciclo do MVP rodar sem o autor por perto: `curiosidade`, `comemorativa`, reels com Hyperframes.

## Fora de escopo

Agendamento pela pipeline, stickers e enquetes, análise de métricas, repostar ou refazer posts antigos, voz sintética, música, qualquer serviço que custe dinheiro.
