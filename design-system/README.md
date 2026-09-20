Sistema de identidade do projeto de extensão **PO para Todos** (Pesquisa Operacional para Todos), UNIRIO — construído a partir do deck real do projeto (`Teorema_Folgas_Complementares.pptx`), da peça de logo do canal e de uma miniatura de referência já publicada. Ele existe para que qualquer pessoa nova na equipe monte um slide ou uma miniatura sem precisar perguntar "que cor eu uso?" ou "que fonte é essa?".

O sistema tem duas frentes de uso, documentadas em separado porque respondem a leitores diferentes em momentos diferentes: quem está montando uma aula em slides (`fundamentos-slides.md`) e quem está criando a miniatura do vídeo dessa aula (`fundamentos-youtube.md`). As duas compartilham a mesma marca, a mesma paleta e os mesmos princípios de voz — descritos aqui — mas cada uma tem sua própria grade, hierarquia tipográfica e checklist.

## Voz e tom

O projeto ensina Pesquisa Operacional — um conteúdo técnico de graduação — a um público que inclui estudantes de primeiro contato e curiosos fora da universidade. Escreva como quem explica no quadro, não como quem documenta uma norma:

- Frases diretas, verbos no imperativo ou na primeira pessoa do plural ("vamos resolver", "repare que"), nunca em voz passiva acadêmica.
- Nomeie a variável, a restrição ou o teorema pelo nome técnico correto (isto não é um projeto de simplificação excessiva), mas explique-o em seguida em linguagem comum.
- Títulos de slide e de miniatura são perguntas ou afirmações curtas do assunto ("O Teorema — Enunciado", "Solver no Excel"), nunca jargão de marketing ("Descubra o poder de...").
- "para todos." (com o ponto final, minúsculo) é a assinatura da marca — repita-a exatamente assim no lockup do logo, nunca "Para Todos" com iniciais maiúsculas fora do nome curto do projeto.

## A marca

O logo (`assets/Marca/logo-po-fundo-escuro.png`) é uma composição de círculos e hastes verdes sobre fundo grafite — um grafo, o próprio objeto de estudo da Pesquisa Operacional, formando abstratamente as iniciais "P" e "O". Use-o como arquivo, nunca o redesenhe:

- Fundo grafite (`surface` no tema YouTube) é o fundo nativo do logo. Sobre branco, use apenas a versão com fundo sólido — não recorte o grafo para "flutuar" sobre outra cor sem testar a legibilidade dos nós.
- Reserve uma margem de respiro ao redor do logo de pelo menos um `space-lg` (32px em tela de 1280px) — nunca encoste texto ou outro elemento nele.
- O padrão de nós conectados (o grafo) é o único elemento gráfico decorativo próprio da marca. **Não é mais o ícone de engrenagens genérico do PowerPoint** usado no deck atual (`assets/Referencias/icone-engrenagens-atual.png`, clip-art de estoque, sem relação com a identidade do projeto) — ao criar slides ou peças novas, prefira o motivo de nós/grafo derivado do próprio logo como elemento decorativo de canto, documentado em `fundamentos-slides.md`.
- O logotipo institucional da UNIRIO (`assets/Marca/logo-unirio.png`, cor `unirio-navy`) acompanha toda peça pública do projeto — mantenha-o como está, sem recolorir; ele identifica a universidade responsável, não o projeto.

## Paleta

Onze cores cobrem as duas frentes — a tabela completa com o valor exato e a nota de uso de cada uma está em `tokens.json`. Em resumo: `brand-navy` (#0E2841) é a cor dos títulos nos slides claros; `brand-green` (#51AA04) é o verde de destaque que aparece nas duas frentes; `brand-green-soft` (#A7C973) é o tom mais suave visto no logo, para washes e padrões discretos; `accent-blue` (#156082) realça termos-chave no corpo dos slides; `unirio-navy` (#1C1E45) é exclusivo do logotipo institucional; `accent-red` (#FC3739) é só o ícone-alvo das miniaturas de tutorial, nunca texto.

## Acessibilidade

Todo par texto/fundo definido neste sistema para uso em corpo de texto atende no mínimo 4,5:1 (ou 3:1 para texto grande/negrito) nos dois temas — confira a nota de cada token de cor antes de usá-lo fora do papel para o qual foi pensado. Uma exceção real é mantida de propósito: o texto branco sobre `brand-green` na faixa inferior das miniaturas mede ~2,96:1 no material de referência, abaixo do ideal para texto grande. Ele é documentado fiel à fonte (ver nota do token `ink-on-brand-green`) — para peças novas, prefira `brand-navy` sobre o verde ou aumente o peso/tamanho da fonte.

## Onde continuar

- `fundamentos-slides.md` — grade, tipografia, estrutura de cada tipo de slide e checklist antes de exportar.
- `fundamentos-youtube.md` — grade, tipografia, estrutura da miniatura e checklist antes de publicar.
- `components/` — modelos vivos de cada tipo de slide e de miniatura, prontos para copiar a estrutura.
- `assets/Marca/` e `assets/Referencias/` — os arquivos originais usados para construir este sistema.
