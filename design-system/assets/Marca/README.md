# assets/Marca

Arquivos da marca. Os dois logos são **arquivos de origem** — use como estão, nunca redesenhe, retinte ou recorte.

| Arquivo | O que é | Estado |
|---|---|---|
| `logo-po-fundo-escuro.png` | Logo do canal, 800×800, fundo grafite `#2C2C2C` (= `surface` do tema YouTube, encaixa sem emenda na miniatura). Sem canal alfa. Já inclui o texto "PESQUISA OPERACIONAL para todos." | presente |
| `logo-unirio.png` | Logotipo institucional UNIRIO, 2426×2436, com alfa, cor `unirio-navy`. | presente |
| `motivo-nos.svg` | Motivo decorativo de nós/grafo da marca — único elemento gráfico decorativo próprio (ver README raiz → A marca). Variação "anel" escolhida entre três propostas em 20/09/2026. | presente |

## O que falta

- **Versão do logo PO para fundo claro.** O README raiz fala em "versão com fundo sólido" sobre branco, mas só existe a de fundo escuro. Sem ela, o logo PO não entra nos slides (a grade dos slides só prevê o logo UNIRIO).
- `../Referencias/icone-engrenagens-atual.png` — o clip-art de engrenagens do deck antigo, citado no README raiz como contraexemplo. Não está no repositório; é só referência histórica, não é usado por nada.

## Uso do motivo de nós (`motivo-nos.svg`)

- **Cor:** `brand-green-soft` (#A7C973), fixada dentro do SVG — o arquivo é usado como `<img>`, que não herda cor do CSS. Sobre grafite mede 7,5:1; sobre branco 1,9:1 (é decoração, não texto; sobre branco ele é deliberadamente um wash discreto).
- **Tamanhos:** canto do slide 141px; slot de ícone da miniatura 130px; capa ampliado 400px. Abaixo de ~100px o traço fino desaparece — não use como ícone pequeno.
- **Posição:** canto inferior direito dos slides de conteúdo (alinhado à margem de 64px, 32px do rodapé); lado direito centrado na capa; slot do ícone na miniatura de conceito.
- **Não faça:** rotacionar, espelhar, esticar fora da proporção 1:1, trocar a cor por `brand-green` cheio (compete com o título), sobrepor texto.
- Um só motivo por peça.
