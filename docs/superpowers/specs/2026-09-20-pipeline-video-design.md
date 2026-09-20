# Pipeline de produção de vídeo — PO para Todos

Data: 2026-09-20. Aprovado em conversa.

## Objetivo

Levar um vídeo do canal **Pesquisa Operacional para Todos** (UNIRIO) do tema até o link no YouTube, com o Claude Code fazendo o trabalho de escrita e montagem e uma pessoa aprovando nos pontos que só ela pode decidir (roteiro, gravação, tornar público). O repositório será publicado no GitHub e usado por **participantes do projeto de extensão que podem não saber programar** — todo texto voltado ao usuário (README, briefing, mensagens das skills) é escrito para esse leitor.

Já existe: design system (`design-system/`), gerador de miniaturas (`design-system/miniaturas/GUIA-AGENTE.md` + `scripts/gerar-miniatura.mjs`) e um MCP do YouTube configurado só na máquina do autor (`~/.claude.json`, não no repo).

## Público e tom do repositório

- O leitor típico é um bolsista ou voluntário do projeto que sabe usar PowerPoint e YouTube Studio, mas nunca usou terminal ou git.
- README em português, em passos numerados, cada passo com o comando exato para copiar e o que se espera ver na tela. Nada de "configure o ambiente" sem dizer como.
- Cada skill, ao rodar, explica em uma frase o que vai fazer e o que a pessoa precisa fazer em seguida.
- Termos técnicos aparecem com explicação na primeira vez ("MCP — o conector que deixa o Claude falar com o YouTube").

## Estrutura do repositório

```
po-para-todos-publisher/
├── CLAUDE.md                 # atualizado: fluxo e ponteiros para as skills
├── README.md                 # guia passo a passo para participante novo
├── .mcp.json                 # youtube-studio-mcp via uvx; lê ~/.youtube-mcp/client_secret.json por padrão
├── canal.json                # links fixos, playlists, hashtags fixas, bloco de rodapé
├── .claude/skills/
│   ├── video/                # orquestradora
│   ├── roteiro/
│   ├── slides/
│   ├── titulo-descricao/
│   ├── miniatura/            # embrulha o GUIA-AGENTE.md existente
│   └── publicar/
├── design-system/            # como está + scripts/gerar-slides.mjs
├── videos/
│   ├── _modelo/briefing.md   # perguntas em branco para começar um vídeo
│   └── folgas-complementares/  # exemplo real completo (fixture dos testes e tutorial)
└── docs/superpowers/specs/
```

### Pasta de um vídeo (`videos/<slug>/`)

| Arquivo | Quem escreve | Conteúdo |
|---|---|---|
| `briefing.md` | pessoa (ou skill `video` a partir do tema) | tema, formato (id de `formatos.json`), duração alvo, público, playlist, vídeos relacionados |
| `roteiro.md` | skill `roteiro` | ver seção Roteiro |
| `slides.json` | skill `slides` | um objeto por slide, derivado do roteiro |
| `slides.pptx` | `gerar-slides.mjs` | apresentação pronta para abrir no PowerPoint |
| `metadados.json` | skill `titulo-descricao` | títulos candidatos, título escolhido, descrição, tags, playlist |
| `miniatura.png` | skill `miniatura` | 2560×1440 |
| `publicacao.json` | skill `publicar` | id do vídeo, link, data, status de privacidade |
| `*.mp4` | pessoa | gravação — ignorado pelo git |

`slug` é o tema em minúsculas com hífens (ex.: `folgas-complementares`), mesmo padrão dos ids de `catalogo.json`.

## `canal.json`

Fonte única do que se repete em toda publicação:

```json
{
  "nome": "Pesquisa Operacional para Todos",
  "site": "https://pesquisaoperacional.uniriotec.br/index.html",
  "instagram": "https://www.instagram.com/pesquisaoperacionalparatodos/",
  "hashtagsFixas": ["#PesquisaOperacional", "#PO", "#Otimização", "#UNIRIO"],
  "rodape": { "projeto": "📚 Este conteúdo faz parte do PO Para Todos, …", "convite": "💡 Gostou da aula? …", "cta": "👍 Não esqueça de deixar o like, se inscrever no canal e compartilhar o vídeo com quem {complemento}!" },
  "playlists": { "dualidade": "PLdARkEgZLCfxTCwI7DcHPVcik0RxXKO5v", "…": "…" },
  "categoriaYoutube": "27"
}
```

As oito playlists atuais do canal entram com id e nome. Categoria 27 = Educação.

## Roteiro (`roteiro.md`)

Frontmatter YAML: `titulo_provisorio`, `formato`, `duracao_alvo_min`, `playlist`, `relacionados` (lista de URLs com uma frase de contexto cada), `apresentador`.

Corpo com seções fixas, nesta ordem:

1. **Gancho** — ≤ 30 s de fala, abre com uma pergunta. É reaproveitado literalmente como primeiro parágrafo da descrição.
2. **Objetivos** — 3 a 5 itens. Viram o slide "Objetivos" e a lista "Nesta aula, você vai aprender:".
3. **Blocos** — numerados. Cada bloco tem: `tipo` (`conteudo` ou `exemplo`), `duracao_s` estimada, **No slide** (título curto + o que aparece: marcadores, fórmula, resultado) e **Fala** (o que o apresentador diz). Um bloco = um slide.
4. **Encerramento** — resumo em 3 pontos-chave + convite (like/inscrição/vídeo relacionado). Vira o slide de encerramento.

Regras de voz (da `design-system/README.md`, embutidas na skill): imperativo ou primeira pessoa do plural; nome técnico correto seguido de explicação comum; títulos de slide são afirmações curtas ou perguntas, nunca marketing.

Os capítulos da descrição saem da soma acumulada de `duracao_s` (Abertura = gancho, Objetivos, um capítulo por bloco, Resumo, Encerramento) — a mesma estrutura de 14 capítulos do vídeo "Teorema das Folgas Complementares" já publicado.

## Slides em PPTX

- `design-system/scripts/gerar-slides.mjs` lê `slides.json` e escreve `slides.pptx` com **pptxgenjs** (dependência Node; o repo ganha `package.json`).
- Lê `design-system/tokens.json` diretamente: cores por nome (`brand-navy`, `accent-blue`, `ink`, `ink-muted`, `surface-panel`), tamanhos em pt (`slide-title` 44 pt, `slide-body`/`slide-label` 20 pt, `slide-caption` 18 pt), famílias (`title` → Aharoni, `body` → Hagrid Text; o PowerPoint do apresentador substitui se não tiver).
- Grade de `fundamentos-slides.md`: 13,333 × 7,5 pol; margem lateral 0,7 pol; título a 0,33 pol do topo; corpo a partir de 1,75 pol; logo UNIRIO 1,4 pol no canto superior direito de todo slide; motivo de nós 1,47 pol no canto inferior direito. Ambos como imagens de `design-system/assets/Marca/`.
- Quatro layouts, um por tipo de `fundamentos-slides.md`:
  - `capa`: título (até 3 linhas), apresentador e "Projeto PO para Todos – UNIRIO" em caption.
  - `conteudo`: título curto + blocos com rótulo `accent-blue` negrito e marcadores/parágrafo; trechos marcados `**assim**` viram negrito.
  - `exemplo`: título + painel `surface-panel` com cantos arredondados contendo a formulação; linha de resultado em `accent-blue` negrito.
  - `encerramento`: "Obrigado!", autoria, link do projeto; logo UNIRIO maior.
- `slides.json`: `{ "apresentador": "...", "slides": [ { "tipo": "capa", "titulo": "..." }, { "tipo": "conteudo", "titulo": "...", "blocos": [ { "rotulo": "Condição 1", "itens": ["..."] } ] }, { "tipo": "exemplo", "titulo": "...", "formulacao": ["max Z = 3x1 + 5x2", "..."], "resultado": "Z* = 36" }, { "tipo": "encerramento" } ] }`.
- A skill `slides` produz `slides.json` a partir do `roteiro.md` (capa → Objetivos → bloco N → slide N → encerramento) e roda o script. Recusa blocos cujo texto não cabe (limite de caracteres por layout, derivado do tamanho da fonte e da área útil) e pede para encurtar, em vez de reduzir a fonte.
- Os modelos HTML em `design-system/components/Slide-*.html` continuam como referência visual; não são fonte do PPTX.

## Título e descrição (molde extraído dos 3 últimos vídeos do canal)

**Título**: `PALAVRA-CHAVE EM CAIXA ALTA - Complemento em Title Case[ - Parte N]`, ≤ 70 caracteres. A skill propõe 5 candidatos com a palavra-chave variando (nome técnico, ferramenta, pergunta) e a pessoa escolhe; o escolhido vai para `metadados.json`.

**Descrição**, seções na ordem exata do vídeo "Folgas Complementares":

1. Gancho (do roteiro) — pergunta, `🤔`, "Nesta aula vamos…".
2. `Nesta aula, você vai aprender:` + um parágrafo por objetivo.
3. Frase de fechamento com o resultado concreto do exemplo.
4. `⏱️ Capítulos:` — `mm:ss Nome`, começando em `00:00 Abertura`.
5. `⚠️` + frase + link, um por vídeo relacionado (omitido se não houver).
6. Rodapé de `canal.json`: projeto, convite, `📸 Instagram`, `🌐 Nosso Site`, CTA com o `{complemento}` escrito para o vídeo ("…com quem está penando com dualidade!").
7. Hashtags fixas + 3 a 4 do tema.

**Tags do YouTube** (campo separado, hoje vazio nos vídeos publicados): 10 a 15 — tema, sinônimos e apelidos de `catalogo.json`, área, "pesquisa operacional", "UNIRIO".

## Publicação

Skill `publicar`, usando o MCP `youtube`:

1. Pré-checagem: `.mp4` informado existe; `metadados.json` tem título escolhido; `miniatura.png` existe; pergunta se os capítulos estimados batem com a gravação e aceita os reais.
2. `youtube_upload_video` com `privacy_status: private`, título, descrição, tags, categoria 27.
3. `youtube_set_thumbnail`.
4. `youtube_add_to_playlist` na playlist do briefing.
5. Escreve `publicacao.json` e devolve o link.

Qualquer falha interrompe e reporta o passo; não tenta corrigir com atualizações parciais. Tornar o vídeo público é sempre uma ação manual da pessoa.

## Skills

Todas em português, uma pasta por skill em `.claude/skills/<nome>/SKILL.md`, escritas no padrão do superpowers (`writing-skills`). Cada uma funciona sozinha e recebe o slug do vídeo.

| Skill | Entrada | Saída | Para e pergunta |
|---|---|---|---|
| `video` | tema ou `briefing.md` | encadeia as demais | após o roteiro (aprovação); antes de publicar (mp4 e capítulos reais) |
| `roteiro` | `briefing.md` | `roteiro.md` | — |
| `slides` | `roteiro.md` | `slides.json`, `slides.pptx` | se algum bloco não cabe |
| `titulo-descricao` | `roteiro.md`, `canal.json` | `metadados.json` | escolha do título |
| `miniatura` | título escolhido | `miniatura.png` | só se o tópico não está no catálogo |
| `publicar` | pasta do vídeo + mp4 | `publicacao.json` | confirmação dos capítulos |

Superpowers **não** é vendorizado: o README instrui `/plugin install superpowers` e `CLAUDE.md` assume que está presente.

## MCP no repositório

`.mcp.json` na raiz:

```json
{ "mcpServers": { "youtube": { "command": "uvx", "args": ["--from", "git+https://github.com/felipefontoura/youtube-studio-mcp", "youtube-studio-mcp"] } } }
```

O MCP lê `~/.youtube-mcp/client_secret.json` por padrão, então não precisa de variável de ambiente. O README explica como criar esse `client_secret.json` no Google Cloud (linkando o passo a passo do próprio MCP) e onde colocá-lo. Limitação conhecida: o MCP corta descrições lidas em 500 caracteres — irrelevante para a pipeline, que só escreve.

## Exemplo vivo: `videos/folgas-complementares/`

Reconstruído a partir do vídeo publicado (título, descrição e capítulos reais, deck de 14 slides que originou o design system). Serve de tutorial no README ("abra esta pasta e veja o que cada arquivo é") e de fixture dos testes.

## Testes

- `gerar-slides.mjs`: teste em Node (`node --test`) que gera o PPTX do exemplo, abre o zip e confere número de slides, presença dos textos, cores dos títulos (`0E2841`) e dos rótulos (`156082`), e imagens do logo em todo slide. Verificação visual final é abrir no PowerPoint — não há renderizador headless na máquina.
- Descrição: função pura `montarDescricao(roteiro, metadados, canal)` em `scripts/` com teste que compara com a descrição real do Folgas Complementares.
- Skills: rodadas de ponta a ponta sobre o exemplo antes de publicar o repo; a saída é comparada com os arquivos do exemplo.

## Fluxo de trabalho de quem desenvolve o repositório

Documentado em `CLAUDE.md` e no README (seção "Quero mudar a pipeline"):

1. **Desenhar**: `/grill-me` para qualquer mudança de comportamento; `/grill-with-docs` quando a mudança cria ou altera vocabulário do domínio (registra ADR e atualiza o glossário). `superpowers:brainstorming` **não** é usado neste repositório — o `CLAUDE.md` diz isso explicitamente.
2. **Planejar**: superpowers `writing-plans`.
3. **Executar**: superpowers `executing-plans` ou `subagent-driven-development`, com `test-driven-development` e `verification-before-completion`.

Para o `grill-with-docs` funcionar, o repo tem `CONTEXT.md` na raiz (glossário: briefing, roteiro, bloco, formato, slug, playlist, metadados, publicação) e `docs/adr/` com um ADR por decisão registrada — as decisões desta spec (PPTX, molde de descrição, upload privado) viram os primeiros ADRs.

Ferramentas que o participante instala (README ensina): plugin `superpowers` (`/plugin install superpowers@claude-plugins-official`) e os skills do Matt Pocock (`npx skills add mattpocock/skills`).

A skill `roteiro`, quando o briefing não responde algo que ela precisa, pergunta no formato de rodadas do `grilling` (perguntas numeradas, cada uma com resposta recomendada), em vez de uma pergunta por vez.

## Fora de escopo

Shorts (9:16), legendas, geração de áudio/vídeo, analytics, atualizar descrições de vídeos antigos, paridade entre PPTX e os modelos HTML, virar plugin do Claude Code (possível depois sem refazer as skills).
