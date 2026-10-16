# Motion dos reels e stories em Canvas2D no Chrome da pipeline, não no motor WebGL do kit de referência

Os vídeos do Instagram passaram de "bloco que sobe e aparece" para motion design (tipografia de impacto, caneta que desenha grafos e contas, câmera, transições), inspirado no kit "Motion as Code", cujo motor é o pdoom-video (TypeScript + three.js/WebGL, bun, Vite, Playwright; MIT). Decisão: manter o Chrome/Puppeteer e o ffmpeg que a pipeline já usa e desenhar cada frame em Canvas2D como função pura do tempo, portando para `design-system/motion/` só as primitivas do kit (easing, mola, keyframes, câmera 2D, caneta, revelação de traço), com o aviso MIT preservado. O que o WebGL traria a mais — bloom, partículas, milhares de linhas na GPU, shaders de gravura — serve à estética "cinema escuro" do kit, não ao visual chapado e didático do design system, e custaria uma segunda pilha de ferramentas num repositório que precisa ser operado por quem não programa.

## Consequences

- A "escrita" é a fonte do design system revelada traço a traço, não a fonte de traço único do kit (sem acentos nem ≤, Σ, x₁).
- Tokens de movimento (durações, curvas) ficam em arquivo próprio; `tokens.json` não muda.
