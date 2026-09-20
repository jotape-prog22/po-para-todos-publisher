# PO para Todos — produção de vídeos

Este repositório faz a parte chata de produzir uma aula do canal **Pesquisa Operacional para Todos** (UNIRIO): escreve o roteiro, monta os slides no PowerPoint, sugere título, descrição e tags, gera a miniatura e sobe o vídeo no YouTube. Você decide, aprova e grava.

Não precisa saber programar. Precisa seguir os passos abaixo uma vez; depois é só conversar com o Claude.

## O que você vai instalar (uma vez só)

1. **Claude Code** — o assistente que roda tudo, dentro do Terminal (o programa de linha de comando do computador; no Mac procure por "Terminal" no Spotlight, atalho Cmd+Espaço; no Windows procure por "PowerShell" no menu Iniciar). Siga o guia oficial em https://docs.claude.com/en/docs/claude-code/quickstart . No final, abrir o Terminal e digitar `claude` deve mostrar uma tela de boas-vindas do Claude Code.
2. **Node.js** (versão 22 ou mais nova) — o programa que gera os slides e a descrição a partir dos arquivos do vídeo. Baixe o instalador em https://nodejs.org (escolha a versão "LTS", a mais estável) e instale como qualquer outro programa. Confira que funcionou abrindo o Terminal e digitando `node -v` → deve aparecer algo como `v22...` (ou um número maior).
3. **uv** — instala e roda o conector que fala com o YouTube (chamado de "MCP", explicado mais abaixo). No Terminal, cole o comando abaixo, aperte Enter, e depois feche e abra o Terminal de novo:
   - Mac/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Windows (no PowerShell): `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
   Confira digitando `uv --version` → deve aparecer um número de versão, sem erro.
4. **Google Chrome ou Microsoft Edge** — o gerador de miniaturas usa um desses navegadores por trás dos panos para desenhar a imagem. Se você já tem um dos dois instalado, pode pular este item.
5. **PowerPoint** — para abrir e apresentar os slides que o Claude gera (arquivo `.pptx`).

## Baixar o projeto

Se você nunca usou o `git` (o programa que guarda o histórico e as cópias deste projeto) antes, o caminho mais simples é: abra a página do repositório no navegador, clique no botão verde **Code** e depois em **Download ZIP**; extraia o arquivo ZIP baixado em uma pasta de fácil acesso (por exemplo, a Área de Trabalho).

Quem já tem `git` instalado pode preferir clonar (baixar uma cópia sincronizável) pelo Terminal — troque o endereço abaixo pelo link do repositório que você recebeu de quem coordena o projeto, caso seja diferente:

```bash
git clone https://github.com/po-para-todos/po-para-todos-publisher.git
```

Depois, entre na pasta do projeto pelo Terminal e instale as dependências (bibliotecas de código que os scripts usam):

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
   - No Mac: abra o Finder, aperte Cmd+Shift+G, digite `~/.youtube-mcp` e Enter (crie a pasta antes se ela ainda não existir) — depois arraste o arquivo renomeado para lá.
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

Cada vídeo tem sua própria pasta em `videos/<slug>/`. Um exemplo real e completo, para você abrir e ver como cada arquivo fica pronto, está em `videos/folgas-complementares/`.

| Arquivo | O que é |
|---|---|
| `briefing.md` | O formulário inicial: tema, formato, duração alvo, público, playlist e vídeos relacionados. |
| `roteiro.md` | O roteiro do vídeo — gancho, objetivos e os blocos com o que será dito e mostrado em cada parte. |
| `slides.json` | Os dados de cada slide, derivados do roteiro (um item por slide). |
| `slides.pptx` | Os slides prontos para abrir no PowerPoint. É gerado a partir de `slides.json` (comando `node design-system/scripts/gerar-slides.mjs videos/<slug>`) e não fica salvo no repositório — cada pessoa gera o seu ao rodar o `/video`. |
| `metadados.json` | Títulos candidatos, título escolhido, tags, capítulos e a descrição final que vai para o YouTube. |
| `miniatura.png` | A imagem de capa do vídeo no YouTube (2560×1440). |
| `publicacao.json` | O registro do upload: link do vídeo, data e playlist usada. |

## Quando algo dá errado

- **"erro: roteiro inválido"** — normalmente o próprio Claude corrige sozinho e tenta de novo. Se ele insistir no erro, peça: "valide o roteiro e me mostre os erros".
- **"nenhum Chrome/Chromium/Edge encontrado"** — falta instalar o Google Chrome ou o Microsoft Edge (item 4 da lista de instalação); instale um dos dois e tente de novo.
- **"não autenticado" no YouTube** — o login salvo expirou ou nunca foi feito; peça ao Claude: "faça login no YouTube".
- **Cota do YouTube esgotada** — a conta atingiu o limite diário de uso da API; espere até o dia seguinte, a cota é renovada à meia-noite no horário do Pacífico (EUA), o que costuma cair de madrugada no horário de Brasília.
- **Slides com uma fonte diferente da esperada** — é normal: o PowerPoint, ao abrir o arquivo, substitui as fontes da marca (Aharoni, Hagrid) por uma fonte parecida disponível no seu computador; isso não afeta o conteúdo.

## Quero mudar a pipeline

Esta seção é para quem programa e quer alterar o funcionamento deste repositório (as skills, os scripts, o design system). Leia primeiro `CLAUDE.md` (como o projeto é organizado) e `CONTEXT.md` (o vocabulário usado: briefing, roteiro, bloco, slug, e assim por diante). O fluxo de trabalho é: desenhar a mudança com `/grill-me` (ou `/grill-with-docs` quando ela cria ou muda um termo do vocabulário ou uma decisão importante, o que gera um registro em `docs/adr/`); depois planejar com a skill `writing-plans` do superpowers; depois executar com `executing-plans` ou `subagent-driven-development`, sempre rodando `npm test` antes de considerar algo pronto. As especificações de cada mudança ficam em `docs/superpowers/specs/`.

## Créditos

Projeto de extensão **PO para Todos** (Pesquisa Operacional), UNIRIO. Feito com o MCP de YouTube [felipefontoura/youtube-studio-mcp](https://github.com/felipefontoura/youtube-studio-mcp) e as skills de [obra/superpowers](https://github.com/obra/superpowers) e [mattpocock/skills](https://github.com/mattpocock/skills). Licença MIT.
