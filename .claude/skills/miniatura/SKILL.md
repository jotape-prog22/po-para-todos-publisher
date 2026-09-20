---
name: miniatura
description: Gera a miniatura (thumbnail) 2560×1440 de um vídeo do PO para Todos. Use quando a pessoa pedir a miniatura, ou quando a skill video chegar nessa etapa.
---

# Miniatura

Diga antes: "Vou gerar a miniatura do vídeo a partir do título; você olha o PNG."

Siga `design-system/miniaturas/GUIA-AGENTE.md` do início ao fim — ele é a regra. O que muda aqui é só a entrada e a saída:

- **Título**: `metadados.json` → `titulo` (se existir) ou `titulo_provisorio` do `roteiro.md`.
- **Formato**: o `formato` do `roteiro.md`.
- **Número** (formato `serie`): pergunte à pessoa qual é o número da aula.
- **Saída**: `--saida videos/<slug>/miniatura.png` (não `thumbnails/out/`).

Passos: `--buscar "<título>" --so-buscar` → escolha o tópico → gere → leia os `avisos` → abra o PNG (`open …` no Mac, `start …` no Windows) e faça o teste dos 120 px do guia. Se o tópico não existe, siga "Tópico fora do catálogo" do guia e pergunte à pessoa antes de adicionar ao catálogo.

O gerador também cria um `miniatura.html` do lado do PNG (é só o material de trabalho para exportar a imagem). Apague esse `.html` depois de conferir o PNG — só o `.png` é versionado.

Entregue: "Miniatura em `videos/<slug>/miniatura.png` — headline X, subhead Y, faixa Z. Quer trocar alguma palavra?"
