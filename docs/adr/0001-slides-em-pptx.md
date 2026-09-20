# Slides são gerados em PPTX, não em HTML

O design system já tinha modelos de slide em HTML, mas o apresentador grava a partir do PowerPoint e precisa editar o deck. Decidimos gerar `.pptx` com pptxgenjs lendo `tokens.json`; os modelos HTML ficam como referência visual. Consequência: fontes são referenciadas pelo nome (Aharoni, Hagrid Text) e o PowerPoint da máquina substitui se faltar; a verificação visual é abrir o arquivo, não há renderização automática.
