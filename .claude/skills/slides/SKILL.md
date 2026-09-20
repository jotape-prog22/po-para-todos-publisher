---
name: slides
description: Monta slides.json e slides.pptx de um vídeo a partir do roteiro.md aprovado. Use quando a pessoa pedir os slides, ou quando a skill video chegar nessa etapa.
---

# Slides

Você vai transformar `videos/<slug>/roteiro.md` em `slides.json` e gerar `slides.pptx`. Diga antes: "Vou montar um slide por bloco do roteiro e gerar o PowerPoint; você abre e confere."

## 1. Leia

- `videos/<slug>/roteiro.md` (precisa passar em `node scripts/roteiro.mjs videos/<slug>/roteiro.md`; se falhar, volte para a skill `roteiro`).
- `videos/folgas-complementares/slides.json` — o exemplo; siga o mesmo formato.
- `design-system/fundamentos-slides.md` — o que cada tipo de slide contém.

## 2. Monte `slides.json`

Mapa fixo, nesta ordem:

1. `capa` — `titulo` = `titulo_provisorio` do roteiro. Se `metadados.json` já tiver um `titulo` escolhido, use-o no lugar — mas só a parte antes do primeiro " - " (o termo técnico em CAIXA ALTA do título de SEO), convertida para Title Case normal; descarte o complemento que vem depois do traço.
2. `conteudo` "Objetivos" — um bloco sem rótulo, `itens` = os objetivos do roteiro (encurte para caber, sem mudar o sentido).
3. Um slide por bloco do roteiro, na ordem:
   - `Tipo: conteudo` → `{ "tipo": "conteudo", "titulo", "blocos" }`. Cada item `- ` do **No slide** vira um item. Itens no formato `Rótulo: texto` (ex.: `Condição 1: Se…`) viram `{ "rotulo": "Condição 1", "itens": ["Se…"] }`. Um item seguinte que **não** tem esse formato de rótulo entra na lista `itens` do bloco rotulado anterior (não vira um bloco novo). Mantenha os `**negrito**`; "Z\*" e "x\*" no roteiro (a barra é só para escapar o Markdown) viram o caractere literal "Z*"/"x*", sem a barra.
   - `Tipo: exemplo` → `{ "tipo": "exemplo", "titulo", "formulacao", "resultado" }`. Cada linha do **No slide** vira uma linha de `formulacao`; a linha `Resultado: …` vira `resultado`. Use subscritos Unicode (x₁, y₂) e os símbolos ≤ ≥ → ·. Nas linhas de restrição que continuam depois de "s.a.", alinhe recuando com espaços até a mesma coluna do que vem depois de "s.a." (veja `videos/folgas-complementares/slides.json`) — é só estética, não afeta a validação.
4. `conteudo` "Resumo — Pontos-chave" — itens do `## Resumo`.
5. `encerramento`.

`apresentador` = o do frontmatter.

## 3. Valide e gere

Run: `node design-system/scripts/gerar-slides.mjs videos/<slug> --validar`

Se aparecer `erro: slide N: …`, o texto não cabe. **Nunca resolva reduzindo fonte**: encurte a frase, tire um item ou divida o bloco em dois slides (e avise a pessoa que o roteiro ganhou um bloco a mais — atualize o `roteiro.md` também, com a duração dividida). Repita até `ok`.

Run: `node design-system/scripts/gerar-slides.mjs videos/<slug>`

## 4. Entregue

Diga: "Gerei `videos/<slug>/slides.pptx` com N slides. Abra no PowerPoint e confira: título azul-escuro, marcadores, painel cinza nos exemplos, logo da UNIRIO em todos. Se as fontes Aharoni/Hagrid não estiverem instaladas, o PowerPoint substitui — não é erro." Se a pessoa pedir ajuste, edite `slides.json` e gere de novo; não edite o `.pptx` à mão.
