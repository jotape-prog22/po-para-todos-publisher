# Instagram

Padrão dos cards de feed e dos stories do perfil `@pesquisaoperacionalparatodos`. Decidido em 20/09/2026 (spec do braço Instagram): o Instagram usa a **mesma marca do YouTube** — fundo grafite, verde da marca, Archivo Black e Poppins — para o perfil e o canal serem a mesma coisa. Os posts antigos (verde/laranja e azul estilo Canva) não são refeitos.

## Formatos

- Feed e carrossel: **1080 × 1350 px (4:5)** — ocupa o máximo de tela no celular. Todos os cards de um carrossel têm a mesma proporção.
- Story: **1080 × 1920 px (9:16)**. Os 250 px do topo e do rodapé ficam livres: o app desenha a barra de progresso, o nome do perfil e a caixa de resposta por cima.
- Exportação em escala 1 (o Instagram reduz tudo para 1080 px de largura). A API só aceita JPEG; o PNG é o arquivo de trabalho.

## Grade (1080 de largura)

- Margem lateral 72 px (área útil 936 px). Lockup do canal (logo quadrado, 160 px) no canto superior esquerdo — assina, não compete.
- Rodapé de largura total em `brand-green`, 96 px, com `@pesquisaoperacionalparatodos` à esquerda e o contador do carrossel (`2/5`) à direita, em `brand-navy` sobre o verde (5,08:1).
- Conteúdo centrado na vertical entre lockup e rodapé. Um só bloco de leitura por card; nunca dois assuntos.
- Story: conteúdo na metade superior, faixa "ASSISTA NO YOUTUBE" e rodapé logo acima da zona segura de baixo; entre eles, espaço para o sticker de link, que a pessoa adiciona no app.

## Tipografia (`instagram.css`)

| Papel | Fonte | Tamanho | Cor |
|---|---|---|---|
| kicker ("RESUMO DE ARTIGO", "PRAZO") | Poppins 800, caixa alta | 32/40 | `brand-green-soft` |
| título | Archivo Black, caixa alta | 76/82 (58/64 acima de 60 caracteres) | `brand-green` |
| número da ideia | Archivo Black | 160 | `brand-green-soft` |
| corpo | Poppins 600 | 42/58 | `ink` |
| apoio (autores, link, evento) | Poppins 600 | 34/44 | `ink-muted` |
| data-limite | Archivo Black, caixa alta | 96/100 | `ink` |

Motivo dos tamanhos: o card é visto a ~400 px no celular; 42 px de corpo viram ~16 px na tela, o mínimo confortável.

## Copy

- Título de artigo: o título original, em caixa alta, como o perfil já faz. Não traduza títulos em inglês.
- Ideia: título de até 40 caracteres que resume; texto de até 280 caracteres, uma ideia só, sem citação longa.
- Aviso: o nome do que está sendo avisado no título; data-limite em `dd/mm` ou `dd/mm/aaaa` precedida de "ATÉ"; link legível (sem `https://`).
- Nunca frase de marketing, nunca ponto de exclamação no título, nunca emoji nos cards (só na legenda).

## Nunca

- Reduzir a fonte para caber — corte o texto (os limites estão em `instagram/formatos.json`).
- Trocar cores, fundo ou fontes; usar logos de terceiros ou imagem gerada por modelo.
- Escrever "arraste para o lado", "link na bio" ou pedir like dentro do card.
