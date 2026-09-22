# PO para Todos — produção de vídeos

Este repositório faz a parte chata de produzir uma aula do canal **Pesquisa Operacional para Todos** (UNIRIO): escreve o roteiro, monta os slides no PowerPoint, sugere título, descrição e tags, gera a miniatura e sobe o vídeo no YouTube. Você decide, aprova e grava.

Não precisa saber programar. Precisa seguir os passos abaixo uma vez; depois é só conversar com o Claude.

## O que você vai instalar (uma vez só)

1. **Claude Code** — o assistente que roda tudo, dentro do Terminal (o programa de linha de comando do computador; no Mac procure por "Terminal" no Spotlight, atalho Cmd+Espaço; no Windows procure por "PowerShell" no menu Iniciar). Siga o guia oficial em https://docs.claude.com/en/docs/claude-code/quickstart . No final, abrir o Terminal e digitar `claude` deve mostrar uma tela de boas-vindas do Claude Code.
2. **Node.js** (versão 22 ou mais nova) — o programa que gera os slides e a descrição a partir dos arquivos do vídeo. Baixe o instalador em https://nodejs.org (escolha a versão "LTS", a mais estável) e instale como qualquer outro programa. Confira que funcionou abrindo o Terminal e digitando `node -v` → deve aparecer algo como `v22...` (ou um número maior).
3. **git** — o programa que guarda o histórico e as cópias deste projeto; o conector que fala com o YouTube (o "uv" do próximo item) é baixado por ele nos bastidores, então é preciso instalar mesmo que você prefira baixar o projeto pelo ZIP (veja "Baixar o projeto" abaixo).
   - Mac: abra o Terminal e digite `xcode-select --install` — aparece uma janela pedindo confirmação; a instalação leva alguns minutos.
   - Windows: baixe o instalador em https://git-scm.com/download/win e aceite as opções padrão.
   Confira digitando `git --version` → deve aparecer um número de versão.
4. **uv** — instala e roda o conector que fala com o YouTube (chamado de "MCP", explicado mais abaixo). No Terminal, cole o comando abaixo, aperte Enter, e depois feche e abra o Terminal de novo:
   - Mac/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Windows (no PowerShell): cole exatamente como está abaixo, sem alterar nada — `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
   Confira digitando `uv --version` → deve aparecer um número de versão, sem erro.
5. **Google Chrome ou Microsoft Edge** — o gerador de miniaturas usa um desses navegadores por trás dos panos para desenhar a imagem. Se você já tem um dos dois instalado, pode pular este item. Ele também desenha os cards do Instagram.
6. **PowerPoint** — para abrir e apresentar os slides que o Claude gera (arquivo `.pptx`).
7. **yt-dlp** (opcional — só para reels feitos de um trecho de vídeo já publicado). É o programa que baixa o trecho do YouTube.
   - Mac: no Terminal, `brew install yt-dlp` (se não tiver o Homebrew, instale antes em https://brew.sh).
   - Windows (no PowerShell): `winget install yt-dlp.yt-dlp`, depois feche e abra o PowerShell de novo.
   Confira digitando `yt-dlp --version` → deve aparecer uma data (a versão). Se você não for fazer reels de corte, pule este item; o Claude avisa quando precisar.

## Baixar o projeto

Se você nunca usou o `git` (o programa que guarda o histórico e as cópias deste projeto) antes, o caminho mais simples é: abra a página do repositório no navegador (https://github.com/jotape-prog22/po-para-todos-publisher), clique no botão verde **Code** e depois em **Download ZIP**; extraia o arquivo ZIP baixado em uma pasta de fácil acesso (por exemplo, a Área de Trabalho).

Quem já tem `git` instalado pode preferir clonar (baixar uma cópia sincronizável) pelo Terminal:

```bash
git clone https://github.com/jotape-prog22/po-para-todos-publisher.git
```

Depois, entre na pasta do projeto pelo Terminal e instale as dependências (bibliotecas de código que os scripts usam). Se você baixou o ZIP (em vez de clonar), o GitHub extrai uma pasta com um nome como `po-para-todos-publisher-main`; renomeie-a para `po-para-todos-publisher` antes de continuar, para que os comandos deste guia funcionem sem ajustes.

Para entrar na pasta pelo Terminal sem precisar digitar o caminho todo: digite `cd ` (com um espaço depois) e, sem apertar Enter ainda, arraste a pasta do projeto do Finder (Mac) ou do Explorador de Arquivos (Windows) para dentro da janela do Terminal — o caminho completo é colado sozinho. Só então aperte Enter. Ou, se preferir digitar o caminho direto:

```bash
cd po-para-todos-publisher
npm install
```

O que esperar na tela: uma linha como `added 20 packages, and audited 21 packages in 374ms`. Avisos de "vulnerabilidades" (`vulnerabilities`) logo depois são normais nesse tipo de projeto local e podem ser ignorados.

## Conectar ao YouTube (uma vez só)

O upload do vídeo é feito por um "MCP" — a peça (Model Context Protocol) que permite ao Claude conversar diretamente com o YouTube em seu nome, em vez de você preencher formulários manualmente no YouTube Studio. Para o MCP conseguir subir vídeos na conta do canal, você precisa criar uma credencial no Google Cloud (o painel de administração de projetos do Google) e guardá-la numa pasta específica do seu computador. É um processo de configuração único; depois disso o login com o YouTube fica salvo.

1. Acesse https://console.cloud.google.com e crie um projeto novo (é como criar uma pasta para organizar essa configuração; qualquer nome serve, por exemplo "po-para-todos").
2. Nesse projeto, ative três APIs (uma API é a "porta" pela qual um programa conversa com um serviço do Google — cada uma libera um tipo de acesso ao YouTube): **YouTube Data API v3**, **YouTube Analytics API** e **YouTube Reporting API**. Busque cada nome no menu "APIs e serviços" → "Biblioteca" e clique em "Ativar".
3. Configure a "tela de consentimento OAuth" (a tela que aparece pedindo autorização quando você faz login): escolha o tipo **Externo** e, na lista de "usuários de teste", adicione o endereço de e-mail do Google usado pelo canal do YouTube.
4. Crie uma credencial do tipo **ID do cliente OAuth**, escolhendo **App para computador** (Desktop app) como tipo de aplicativo.
5. Baixe o arquivo JSON gerado para essa credencial — JSON é só um formato de arquivo de texto para guardar essas chaves de acesso; o Google oferece um botão de download assim que a credencial é criada.
6. Renomeie esse arquivo para `client_secret.json` e mova-o para a pasta `.youtube-mcp` dentro da sua pasta pessoal (se a pasta não existir, crie-a):
   - No Mac: essa pasta (`.youtube-mcp`) começa com ponto, então é oculta e o Finder sozinho não a cria. Abra o Terminal e rode `mkdir -p ~/.youtube-mcp` (cria a pasta, sem erro se ela já existir) e depois `open ~/.youtube-mcp` (abre a pasta no Finder) — aí é só arrastar o arquivo renomeado para dentro dela.
   - No Windows: abra o Explorador de Arquivos, digite `%USERPROFILE%\.youtube-mcp` na barra de endereço e Enter (crie a pasta se pedir), e mova o arquivo renomeado para lá.

   O passo a passo oficial, com capturas de tela, está em https://github.com/felipefontoura/youtube-studio-mcp#google-cloud-setup .

Com o arquivo no lugar, abra o Terminal na pasta do projeto e digite `claude`. Na primeira vez, o Claude Code pergunta se você aprova o servidor MCP do projeto chamado `youtube` (definido no arquivo `.mcp.json` deste repositório) — responda que sim. Depois, escreva para o Claude: "faça login no YouTube". Isso abre uma aba no navegador; escolha a conta do Google do canal. A partir daí o login fica salvo e você não precisa repetir esse passo.

A cota diária de uso da API do YouTube é de 10.000 unidades e cada upload de vídeo consome 1.600 — dá para publicar vários vídeos por dia sem problema.

## Instalar os skills (uma vez só)

"Skills" são as instruções em português que ensinam o Claude a escrever roteiro, montar slides, gerar miniatura e publicar — são elas que fazem este projeto funcionar. Duas coleções de skills precisam ser instaladas:

1. Dentro do `claude` (ou seja, com o Claude Code já aberto, digitando ali dentro), rode:
   ```
   /plugin install superpowers@claude-plugins-official
   ```
2. No Terminal (fora do `claude`), rode:
   ```
   npx skills add mattpocock/skills
   ```
   Esse comando pede uma confirmação antes de instalar — aceite instalar para o Claude Code.

Como saber que deu certo: abra o `claude` na pasta do projeto e digite apenas `/` — deve aparecer uma lista de comandos incluindo `video`, `roteiro` e `grill-me`.

## Fazer um vídeo

Abra o Terminal, entre na pasta do projeto (`cd po-para-todos-publisher`) e digite `claude`. Dentro do Claude Code, peça o vídeo com o comando `/video` seguido do tema, por exemplo:

```
/video quero uma aula sobre o algoritmo de Dijkstra, 12 minutos, para a playlist po2
```

O Claude vai escrever o roteiro, montar os slides, sugerir título e descrição, gerar a miniatura e, por fim, subir o vídeo no YouTube — mas ele para duas vezes para você decidir:

1. **Aprovar o roteiro**: o Claude mostra o roteiro completo e pergunta se você aprova. Se quiser mudanças, peça os ajustes; se estiver bom, responda "sim" para seguir em frente.
2. **Gravar o vídeo**: depois de gerar os slides, o título, a descrição e a miniatura, o Claude para e espera você gravar a aula usando os slides (arquivo `.pptx`, que abre no PowerPoint). Quando terminar de gravar, diga ao Claude onde está o arquivo de vídeo (`.mp4` ou `.mov`).

Todos os arquivos do vídeo ficam em uma pasta própria, `videos/<tema-em-minusculas-com-hifen>/` (por exemplo, `videos/algoritmo-dijkstra/`) — veja a seção seguinte para o que tem dentro.

O upload sempre sobe como **privado** — só quem tem o link consegue ver. Para tornar o vídeo público, entre no YouTube Studio, vá em **Conteúdo**, clique no vídeo, abra **Visibilidade** e escolha **Público**. Aproveite para conferir lá a miniatura e a descrição antes de publicar.

## O que tem na pasta de um vídeo

Cada vídeo tem sua própria pasta em `videos/<slug>/` (o slug é o nome da pasta do vídeo: tema em minúsculas com hífens, ex.: `folgas-complementares`). Um exemplo real e completo, para você abrir e ver como cada arquivo fica pronto, está em `videos/folgas-complementares/`.

| Arquivo | O que é |
|---|---|
| `briefing.md` | O formulário inicial: tema, formato, duração alvo, público, playlist e vídeos relacionados. |
| `roteiro.md` | O roteiro do vídeo — gancho, objetivos e os blocos com o que será dito e mostrado em cada parte. |
| `slides.json` | Os dados de cada slide, derivados do roteiro (um item por slide). |
| `slides.pptx` | Os slides prontos para abrir no PowerPoint. É gerado a partir de `slides.json` (comando `node design-system/scripts/gerar-slides.mjs videos/<slug>`, onde `<slug>` é o nome da pasta do vídeo) e não fica salvo no repositório — cada pessoa gera o seu ao rodar o `/video`. |
| `metadados.json` | Títulos candidatos, título escolhido, tags, capítulos e a descrição final que vai para o YouTube. |
| `miniatura.png` | A imagem de capa do vídeo no YouTube (2560×1440). |
| `publicacao.json` | O registro do upload: link do vídeo, data e playlist usada. Na pasta de exemplo ele diz `"privacidade": "public"` porque registra o vídeo já publicado de verdade; a skill sempre grava `"private"`, já que todo upload novo sobe como privado. |

## Publicar no Instagram

O mesmo projeto publica no Instagram `@pesquisaoperacionalparatodos`: você escreve os fatos num arquivo, o Claude monta os cards (as imagens do carrossel) e a legenda, você aprova, e o post entra pela API oficial da Meta. Não custa nada: só a conta do Instagram, uma conta no site de desenvolvedores da Meta e uma no GitHub.

### Conectar ao Instagram (uma vez a cada 60 dias)

A Meta dá um "token" (uma senha longa e temporária) que permite ao script publicar na conta do projeto. Ele vale 60 dias; o script renova sozinho enquanto estiver sendo usado e avisa se a renovação falhar. Se ficar dois meses sem publicar, repita os passos 4 e 5.

1. Entre em https://developers.facebook.com com a conta de quem coordena o projeto (o mesmo login do Facebook/Instagram). Se aparecer um pedido para "se registrar como desenvolvedor", aceite — é só confirmar o e-mail.
2. Clique em **Meus apps → Criar app**. Escolha o caso de uso **"Outro"**, depois o tipo **"Empresa"** (Business); nome do app: `PO para Todos`. Não precisa de Página do Facebook nem de portfólio comercial.
3. No painel do app, no menu da esquerda, procure **Instagram** (ou "Adicionar produto → Instagram") e escolha **"API do Instagram com login do Instagram"** (API setup with Instagram login). Em **"Gerar tokens de acesso"**, clique em **Adicionar conta** e faça login na conta `@pesquisaoperacionalparatodos`. A conta já é profissional (categoria Educação) — se a tela pedir para converter, é porque você entrou com outra conta. Se o aplicativo do Instagram no celular mostrar um convite de testador (**Configurações → Site permissions → Apps e sites → Convites de testador**), aceite antes de gerar o token.
4. Na mesma tela, ao lado da conta adicionada, clique em **Gerar token**. Marque as permissões `instagram_business_basic` e `instagram_business_content_publish`, confirme, e copie o token (um texto longo começando com `IG`). Guarde-o como uma senha — não cole em conversas nem em arquivos do projeto.
5. Rode o comando logo depois de gerar o token: o script conta os 60 dias de validade a partir desse momento. Abra uma janela do Terminal separada da conversa com o Claude — **nunca cole o token na conversa**, porque ele fica salvo na transcrição — e, na pasta do projeto, cole (com o token entre as aspas):
   ```bash
   node scripts/instagram.mjs --token "COLE-O-TOKEN-AQUI"
   ```
   O que esperar: `token guardado em /Users/você/.po-para-todos/instagram.json: conta @pesquisaoperacionalparatodos, vale até 2026-11-19`. Se sair `erro: o token é da conta @outra`, gere o token de novo logado na conta do projeto.

O passo a passo oficial, com telas, está em https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/ (em inglês; a interface do painel está em português).

### Conectar ao GitHub (uma vez)

A Meta só consegue baixar as imagens de um endereço público na internet. O script usa o próprio repositório para isso (um "branch" separado chamado `midia`, que fica vazio entre um post e outro), e para escrever nele precisa de um token do GitHub.

Esse token é gerado **pela conta dona do repositório** (`jotape-prog22`), uma vez por projeto — como o app da Meta. Um token *fine-grained* só pode escolher repositórios da própria conta (ou de uma organização à qual ela pertença): quem apenas colabora no projeto não vê `po-para-todos-publisher` em "Only select repositories". Quem for publicar recebe esse token de quem coordena o projeto.

1. Entre em https://github.com/settings/personal-access-tokens e clique em **Generate new token** (tipo *fine-grained*).
2. Nome: `PO para Todos - Instagram`; validade: 1 ano; em **Repository access** escolha **Only select repositories** e marque `po-para-todos-publisher`; em **Permissions → Repository permissions** dê **Contents: Read and write**. Nada mais. Gere e copie o token (começa com `github_pat_`).
3. Abra uma janela do Terminal separada da conversa com o Claude — **nunca cole o token na conversa**, porque ele fica salvo na transcrição — e, na pasta do projeto:
   ```bash
   node scripts/instagram.mjs --token-github "COLE-O-TOKEN-AQUI"
   ```
   O que esperar: `token do GitHub guardado em …/instagram.json`.

Se outra pessoa precisar publicar com a própria conta do GitHub: quem é dono do repositório a adiciona como colaboradora com permissão de escrita (**Settings → Collaborators**), e ela cria um token **clássico** em https://github.com/settings/tokens → **Generate new token (classic)**, só com o escopo `public_repo`, e roda o mesmo comando `--token-github`. Quem guarda esse token consegue escrever no repositório público — mantenha-o tão privado quanto o token do Instagram.

Confira tudo com `node scripts/instagram.mjs --status` — mostra a conta, quantos dias o token ainda vale e quantos posts já foram feitos nas últimas 24 h (o limite da Meta é 100).

### Fazer um post

1. Copie `instagram/_modelo/post.md` para uma pasta nova `instagram/<data>-<assunto>/` (a data em que você pretende publicar, ex.: `instagram/2026-10-03-kruskal-1956/`) e preencha: para um **artigo**, título, autores, onde saiu, link e o resumo; para um **aviso** (edital, evento, prazo, vaga), nome, data-limite e link.
2. Abra o `claude` na pasta do projeto e peça: `/post instagram/2026-10-03-kruskal-1956`.
3. O Claude monta os cards e a legenda e abre as imagens para você conferir. Diga "sim" para publicar, ou peça ajustes.
4. O post entra na hora (a pipeline não agenda; quem quiser data marcada usa o Meta Business Suite depois). O link fica em `instagram/<pasta>/publicacao.json`.

**Vídeo novo no YouTube** não vira post de feed: ao final da publicação de um vídeo, o Claude gera `videos/<slug>/story.png`. Quando você tornar o vídeo público, poste essa imagem como *story* pelo app, com o sticker de link apontando para o vídeo (a API não coloca sticker, e o link é o motivo do story).

**Se a API não funcionar** (token vencido, sem ninguém para ajudar): os mesmos arquivos servem para publicar à mão — no app do Instagram ou no Meta Business Suite, escolha `card-01.png`, `card-02.png`… na ordem e cole o texto de `legenda.txt`.

Um exemplo completo está em `instagram/2026-09-20-kruskal-1956/`.

| Arquivo | O que é |
|---|---|
| `post.md` | O que você escreve: tipo e os fatos (título, autores, link, resumo; ou nome, data, link). |
| `cards.json` | O texto de cada card, escrito pelo Claude a partir do `post.md`. |
| `card-01.png`… | Os cards prontos (1080×1350), gerados de `cards.json`. |
| `legenda.json` / `legenda.txt` | A legenda: o que o Claude escreveu e o texto final montado com o rodapé do projeto e as hashtags. |
| `publicacao.json` | O registro da publicação: link e data. |

### Stories, reels e o "pacote"

Além do post, o Claude faz:
- **Story de aviso** do post novo — sai sozinho, pela API, logo depois do post (você aprova junto com os cards).
- **Sequência de stories** (quiz "respondido", explicação em passos): diga `quero um quiz sobre X`. Sem sticker ela sai pela API; com sticker (enquete, link) o Claude entrega os vídeos e um roteiro para você postar pelo app.
- **Reel**: `vê um trecho legal do vídeo Y para postar` (o Claude sugere trechos, você escolhe; precisa do `yt-dlp` do item 7 e do vídeo já público) ou `faz um reel sobre X` (cenas do zero).
- **Pacote**: `faz o pacote do vídeo Y` — post + story de aviso + reel, nessa ordem, com uma parada de aprovação em cada um.

Antes de publicar, o Claude confere os fatos (a "Checagem") e mostra o que confirmou e o que não conseguiu confirmar — é você quem decide o que fica.

## Quando algo dá errado

- **"erro: roteiro inválido"** — normalmente o próprio Claude corrige sozinho e tenta de novo. Se ele insistir no erro, peça: "valide o roteiro e me mostre os erros".
- **"nenhum Chrome/Chromium/Edge encontrado"** — falta instalar o Google Chrome ou o Microsoft Edge (item 5 da lista de instalação); instale um dos dois e tente de novo. Se você já tem um dos dois instalado mas em um local não padrão, defina a variável `CHROME` com o caminho do executável antes de rodar o comando — no Mac: `CHROME="/caminho/para/Google Chrome" node design-system/scripts/gerar-miniatura.mjs …`; no Windows (PowerShell): `$env:CHROME="C:\caminho\para\chrome.exe"`. Para os cards do Instagram, o mesmo vale para `node design-system/scripts/gerar-cards.mjs …`.
- **"não autenticado" no YouTube** — o login salvo expirou ou nunca foi feito; peça ao Claude: "faça login no YouTube".
- **Cota do YouTube esgotada** — a conta atingiu o limite diário de uso da API; espere até o dia seguinte, a cota é renovada à meia-noite no horário do Pacífico (EUA), o que costuma cair de madrugada no horário de Brasília.
- **Slides com uma fonte diferente da esperada** — é normal: o PowerPoint, ao abrir o arquivo, substitui as fontes da marca (Aharoni, Hagrid) por uma fonte parecida disponível no seu computador; isso não afeta o conteúdo.
- **"erro: sem token do Instagram"** ou **"o token do Instagram venceu"** — refaça os passos 4 e 5 de "Conectar ao Instagram".
- **"aviso: não consegui renovar o token"** — o post saiu, mas o token vai vencer na data que o `--status` mostra; gere outro antes disso.
- **"GitHub: Bad credentials"** — o token do GitHub venceu ou foi colado errado; gere outro em "Conectar ao GitHub".
- **"a Meta rejeitou a mídia"** — em geral é a imagem grande demais ou a URL inacessível; rode `node design-system/scripts/gerar-cards.mjs instagram/<pasta>` de novo e tente outra vez. Se persistir, publique à mão (acima).
- **"a conta já fez 100 publicações"** — limite diário da API; espere 24 h ou publique à mão.
- **Interrompi o `--publicar` no meio (Ctrl+C)** — as imagens podem ficar no branch `midia` do GitHub até o próximo post, que substitui tudo. Não faz mal: são os mesmos cards que iriam para o Instagram.
- **"erro: yt-dlp não encontrado"** — falta instalar o `yt-dlp` (item 7 de "O que você vai instalar"); instale e rode o comando de novo.

## Quero mudar a pipeline

Esta seção é para quem programa e quer alterar o funcionamento deste repositório (as skills, os scripts, o design system). Leia primeiro `CLAUDE.md` (como o projeto é organizado) e `CONTEXT.md` (o vocabulário usado: briefing, roteiro, bloco, slug, e assim por diante). O fluxo de trabalho é: desenhar a mudança com `/grill-me` (ou `/grill-with-docs` quando ela cria ou muda um termo do vocabulário ou uma decisão importante, o que gera um registro em `docs/adr/`); depois planejar com a skill `writing-plans` do superpowers; depois executar com `executing-plans` ou `subagent-driven-development`, sempre rodando `npm test` antes de considerar algo pronto. As especificações de cada mudança ficam em `docs/superpowers/specs/`.

## Créditos

Projeto de extensão **PO para Todos** (Pesquisa Operacional), UNIRIO. Feito com o MCP de YouTube [felipefontoura/youtube-studio-mcp](https://github.com/felipefontoura/youtube-studio-mcp) e as skills de [obra/superpowers](https://github.com/obra/superpowers) e [mattpocock/skills](https://github.com/mattpocock/skills). Licença MIT.

## Como o projeto recebe mudanças

Qualquer pessoa pode ler, baixar e propor mudanças (abrindo um *Pull Request* — um pedido de alteração que aparece na aba **Pull requests** do GitHub). Ninguém escreve direto na `master`: a mudança só entra depois que alguém listado em `.github/CODEOWNERS` aprovar. Para incluir uma pessoa nessa lista, edite esse arquivo (também por Pull Request) e convide-a como colaboradora em **Settings → Collaborators**.
