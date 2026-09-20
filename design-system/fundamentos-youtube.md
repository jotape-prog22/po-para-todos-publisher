# Miniaturas do YouTube

Padrão para a miniatura (thumbnail) de todo vídeo do canal, extraído da peça de referência "Solver no Excel — Passo a Passo Completo". Canvas 1280 × 720px (16:9, o padrão exigido pelo YouTube) — a peça de referência foi entregue em 2752 × 1536px, use-a como qualidade de exportação, não como grade.

## Grade

- Fundo: `surface` no tema YouTube (grafite).
- Lockup da marca (logo + "PESQUISA OPERACIONAL para todos.", `thumb-kicker`) no canto superior, em tamanho pequeno — ele assina a peça, não compete com o título do vídeo.
- Título do vídeo ocupa o terço esquerdo/central: palavra-chave em `thumb-headline` seguida da complementação em `thumb-subhead`, alinhadas à esquerda, começando a `space-3xl` da borda esquerda.
- Um ícone ou elemento visual único do assunto do vídeo (o ícone do Excel + alvo na peça de referência) ocupa o canto inferior esquerdo ou centro, nunca mais de um por miniatura — não sature a peça com múltiplos ícones.
- Faixa inferior de largura total em `brand-green`, com o texto do formato do vídeo em `thumb-banner`, `space-xl` de respiro acima dela.

## Tipografia

- Palavra-chave do vídeo em `thumb-headline` (família "display" → Archivo Black; é uma aproximação deliberada — a peça de referência é uma imagem finalizada, sem o nome exato da fonte original recuperável; Archivo Black foi escolhido por reproduzir o peso e a largura condensada observados), cor `brand-green`, caixa alta.
- Complementação do título em `thumb-subhead`, mesma família, cor `ink` (branco), caixa alta.
- Texto da faixa inferior em `thumb-banner` (família "label" → Poppins), cor `ink-on-brand-green`, caixa alta. Lembre-se: esse par mede ~2,96:1 de contraste no material de referência — mantenha peso extra-bold e tamanho grande para compensar, ou troque para `brand-navy` sobre o verde em peças novas.
- Nunca use `slide-title`/Aharoni na miniatura — a família "display" (condensada, pesada) é o que garante legibilidade em tamanho pequeno na lista de vídeos do YouTube.

## Estrutura por tipo de miniatura

**Tutorial passo a passo** (o formato mais comum do canal, ex.: "Solver no Excel") — ferramenta ou software no ícone central, palavra-chave do recurso ensinado como `thumb-headline`, "NO [FERRAMENTA]" como `thumb-subhead`, faixa inferior "PASSO A PASSO COMPLETO". Modelo vivo em `components/Thumbnail-Tutorial`.

**Conceito / teoria** (adição intencional deste sistema, para vídeos sem uma ferramenta de software — ex.: "Dualidade Forte", "Folgas Complementares") — mesma grade e mesma paleta, mas sem o ícone de ferramenta: o espaço do ícone recebe o motivo de nós/grafo da marca em `brand-green-soft`, e a faixa inferior troca "PASSO A PASSO COMPLETO" por "TEORIA EXPLICADA" ou o rótulo equivalente ao conteúdo. Modelo vivo em `components/Thumbnail-Conceito`.

## Checklist antes de publicar

- Título legível em miniatura de celular (teste reduzindo a peça a ~120px de largura) — se `thumb-headline` some, aumente o peso ou reduza o texto, nunca reduza o contraste.
- Lockup da marca presente e íntegro no canto superior, sem esticar ou recolorir o logo.
- No máximo duas palavras em destaque (`thumb-headline` + `thumb-subhead`) — miniaturas com frases inteiras perdem legibilidade na lista de recomendados.
- Faixa inferior sempre em `brand-green` com o texto do formato do vídeo, nunca vazia.
- Um único ícone/elemento central por miniatura.
