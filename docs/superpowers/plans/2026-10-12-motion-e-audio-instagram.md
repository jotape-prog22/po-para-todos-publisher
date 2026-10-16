# Motion design e som nos vídeos do Instagram — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o motor dos vídeos do Instagram (reel de Cenas, sequência de stories, story de aviso, moldura do Corte) por motion design em Canvas2D no padrão do design system, com Trilha e Efeitos sonoros mixados dentro do MP4.

**Architecture:** Uma página (`design-system/motion/pagina.html`) desenha cada quadro num `<canvas>` como função pura do tempo, com a geometria medida do CSS de `design-system/instagram/`. O Node valida as Cenas, monta a **composição** (Cenas posicionadas na linha do tempo + eventos de som), mixa o áudio no ffmpeg e grava o vídeo pedindo quadro a quadro ao Chrome (puppeteer-core) servido por um servidor HTTP local. Cada tipo de Cena é um módulo com `validar`, `linhaDoTempo` e `desenhar`.

**Tech Stack:** Node ≥ 22 (ESM, `node --test`), puppeteer-core + Chrome do sistema, ffmpeg-static, Canvas2D no navegador. Sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-10-12-motion-e-audio-instagram.md` (+ `CONTEXT.md`, `docs/adr/0011`, `docs/adr/0012`)

## Global Constraints

- Node ≥ 22; nenhuma dependência nova no `package.json`.
- Vídeo 1080×1920, 30 fps, libx264 `-crf 18 -pix_fmt yuv420p`, AAC, `+faststart`; todo MP4 sai com faixa de áudio (anullsrc quando não há som).
- Reel: 15 a 90 s no total. Cena de reel: 3 a 60 s. Story: 5 a 60 s. Até 10 stories por sequência.
- Folga depois do último bloco: 2 s no story, 1,2 s na Cena de reel.
- Cores e fontes só do design system, lidas do CSS (`tokens.css`, `instagram.css`, `story-video.css`, `reel.css`) — nunca hex nem tamanho fixo dentro das Cenas. `tokens.json` não muda.
- Áudio só com licença em `["CC0", "Pixabay Content License", "YouTube Audio Library — sem atribuição"]`.
- Corte: voz original, sem Trilha. Story: sem Trilha. Nada de narração sintética.
- `stories.json`/`reel.json` antigos (sem `tipo` nas Cenas) continuam válidos e viram Cenas `texto`.
- Fixtures intocáveis: `videos/folgas-complementares/`, `instagram/2026-09-20-kruskal-1956/`.
- Código, comentários e mensagens em português, no estilo dos scripts atuais (comentário curto no topo, `Erro<Coisa>` próprio, `erro: …` na CLI).
- Trabalhar no branch `motion-instagram` (a `master` é protegida; o merge é por PR depois dos pilotos aprovados).
- Mídia já aprovada ou agendada (`instagram/agenda.json`, branch `fila`) não é regerada.

## Review Focus

- **Texto que não cabe:** título de 60 caracteres + 6 linhas de 90 no story com sticker — o canvas não tem `overflow: hidden`; a Cena `texto` tem de encolher o bloco para caber na área, nunca invadir o rodapé. (Teste na Task 4.)
- **Acentos e caixa alta:** "função", "ótimo", "região" em kicker/título em caixa alta precisam virar "FUNÇÃO", "ÓTIMO", "REGIÃO" (pt-BR), não perder o acento. (Teste na Task 4.)
- **Trilha mais curta que o reel:** uma faixa de 40 s num reel de 60 s tem de repetir, não acabar em silêncio. (Teste na Task 3.)
- **Biblioteca sem efeitos para um uso (ou vazia):** o vídeo ainda sai, com os sons que existem ou com a faixa muda; nunca erro. (Teste na Task 3.)
- **Encaixe na batida estourando 90 s ou encurtando uma Cena abaixo do mínimo:** a composição nunca encurta uma Cena abaixo do tempo de leitura e o gerador recusa reel acima de 90 s depois do encaixe. (Testes nas Tasks 4 e 6.)

---

## Mapa de arquivos

Criar:
- `design-system/motion/LICENSE-pdoom.txt` — aviso MIT do pdoom-video.
- `design-system/motion/util.mjs` — primitivas (easing, mola, keyframes, ruído, polilinhas).
- `design-system/motion/camera.mjs` — câmera 2D com keyframes.
- `design-system/motion/movimento.json` — tokens de movimento e de som.
- `design-system/motion/escrita.mjs` — quebrar linhas, fontes, entrada, caneta, digitar, subir, escrever, revelar traço.
- `design-system/motion/cenas/comum.mjs` — limites comuns e checagem de tamanho.
- `design-system/motion/cenas/index.mjs` — registro dos tipos e `validarCena`.
- `design-system/motion/cenas/texto.mjs`, `cabecalho.mjs`, `impacto.mjs`, `odometro.mjs`, `grafo.mjs`, `conta.mjs`, `grafico.mjs`, `tabela.mjs`, `moldura.mjs`.
- `design-system/motion/composicao.mjs` — Cenas na linha do tempo, encaixe na batida, eventos de som, loop (só Node).
- `design-system/motion/quadro.mjs` — desenha um quadro: fundo, grade, Cena, transição, marca, grão.
- `design-system/motion/layout.mjs` — mede a geometria e as fontes do CSS (só navegador).
- `design-system/motion/player.mjs`, `design-system/motion/pagina.html` — página do motor (gravação e prévia).
- `design-system/motion/GUIA.md` — como escrever cada tipo de Cena (para a skill e para o agente).
- `design-system/scripts/navegador.mjs` — `acharNavegador` (sai de `gerar-story-video.mjs`).
- `design-system/scripts/motion/servidor.mjs` — servidor HTTP local, só leitura.
- `design-system/scripts/motion/renderizar.mjs` — composição → MP4 + PNG.
- `design-system/scripts/motion/mixagem.mjs` — composição → WAV (Trilha + Efeitos).
- `design-system/scripts/motion/ver.mjs` — prévia no navegador.
- `design-system/audio/biblioteca.json`, `design-system/audio/trilhas/`, `design-system/audio/efeitos/`, `design-system/audio/LICENCAS.md`.
- `scripts/audio.mjs` — valida a biblioteca, escolhe efeito, mede BPM.
- `tests/ajudas-motion.mjs`, `tests/motion-util.test.mjs`, `tests/motion-cenas.test.mjs`, `tests/motion-composicao.test.mjs`, `tests/motion-quadro.test.mjs`, `tests/motion-servidor.test.mjs`, `tests/motion-render.test.mjs`, `tests/audio.test.mjs`, `tests/mixagem.test.mjs`.

Modificar:
- `design-system/scripts/gerar-story-video.mjs` — vira fino: valida, monta composições, grava; mantém `htmlDaCena` (molde da calibração).
- `design-system/scripts/gerar-story-aviso.mjs`, `design-system/scripts/gerar-reel.mjs`.
- `design-system/scripts/recortar-tela.mjs` — importa `acharNavegador` de `navegador.mjs`.
- `design-system/instagram/story-video.css` — `--sv-conta-*` e `.sv__conta`.
- `design-system/instagram/layouts/story-cena.html` — sem mudança de marcação (continua molde da calibração).
- `tests/story-video.test.mjs`, `tests/story-aviso.test.mjs`, `tests/reel.test.mjs`.
- `.claude/skills/reel/SKILL.md`, `.claude/skills/stories/SKILL.md`, `.claude/skills/pacote/SKILL.md`, `design-system/instagram/GUIA-AGENTE.md`, `CLAUDE.md`, `README.md`, `instagram/_modelo/reel.json`.
- `.gitignore` — `instagram/**/*.composicao.json`, pastas `_piloto-*`.

---

### Task 0: Branch

- [ ] **Step 1: Criar o branch**

```bash
git checkout master && git pull && git checkout -b motion-instagram
```

---

### Task 1: Primitivas de movimento

**Files:**
- Create: `design-system/motion/LICENSE-pdoom.txt`, `design-system/motion/util.mjs`, `design-system/motion/camera.mjs`
- Test: `tests/motion-util.test.mjs`

**Interfaces:**
- Produces (`util.mjs`): `clamp(x,a=0,b=1)`, `lerp(a,b,t)`, `invLerp`, `remap(x,a,b,c,d,limitar=true)`, `smoothstep(a,b,x)`, `TAU`, `window01(x,a,b,fi=.2,fo=.2)`, `ease.{linear,inQuad,outQuad,inOutQuad,inCubic,outCubic,inOutCubic,outQuart,outQuint,inExpo,outExpo,inOutExpo,outBack,inBack,outElastic}`, `prog(x,a,b,fn=ease.linear)`, `springStep(t,freq=4,damping=.35)`, `pulse(t,t0,hl=.12)`, `mulberry32(seed) → () => number`, `hash(...xs) → [0,1)`, `noise1(x,seed=0) → [-1,1]`, `keys(t,[[t,v,fn?],...])`, `dist(a,b)`, `polylineLengths(pts) → Float64Array`, `pointAtLength(pts,L,s) → {x,y,angle}`.
- Produces (`camera.mjs`): `class Camera(largura, altura)` com `chave(t,cx,cy,z=1,giro=0,curva=ease.inOutCubic) → this`, `em(t) → {cx,cy,z,giro}`, `aplicar(ctx,t)` (multiplica a transformação atual: o ponto do mundo `(cx,cy)` vai para o centro da tela, escala `z`).

- [ ] **Step 1: Copiar o aviso de licença**

Copie o texto de `/Users/joaopedro/Downloads/drive-download-20261010T210750Z-1-001/Motion_as_kit/LICENSE.pdoom-engine` (só ler; não executar nada da pasta) para `design-system/motion/LICENSE-pdoom.txt`, com esta linha antes do texto:

```
As primitivas de util.mjs e camera.mjs foram portadas do pdoom-video (https://github.com/mexicat/pdoom-video), de Giacomo Magnanini, sob a licença abaixo.

```

- [ ] **Step 2: Escrever o teste que falha**

`tests/motion-util.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { clamp, lerp, ease, prog, springStep, pulse, keys, hash, mulberry32, noise1, polylineLengths, pointAtLength, window01 } from "../design-system/motion/util.mjs";
import { Camera } from "../design-system/motion/camera.mjs";

const perto = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("clamp, lerp e prog com easing", () => {
  assert.equal(clamp(2), 1); assert.equal(clamp(-1), 0); assert.equal(lerp(10, 20, 0.5), 15);
  assert.equal(prog(0, 1, 2), 0); assert.equal(prog(3, 1, 2), 1);
  perto(prog(1.5, 1, 2, ease.outExpo), ease.outExpo(0.5));
  for (const nome of Object.keys(ease)) { perto(ease[nome](0), 0, 1e-3); perto(ease[nome](1), 1, 1e-3); }
});

test("mola começa em 0, passa de 1 (overshoot) e assenta em 1", () => {
  assert.equal(springStep(0), 0);
  const amostras = Array.from({ length: 200 }, (_, i) => springStep(i / 100));
  assert.ok(Math.max(...amostras) > 1, "tem overshoot");
  perto(springStep(5), 1, 1e-3);
});

test("pulse decai pela meia-vida; window01 sobe, segura e desce", () => {
  assert.equal(pulse(0.9, 1), 0); perto(pulse(1, 1), 1); perto(pulse(1.12, 1, 0.12), 0.5);
  assert.equal(window01(0, 1, 3), 0); assert.equal(window01(2, 1, 3), 1); assert.equal(window01(3, 1, 3), 0);
});

test("keys interpola entre chaves e segura nas pontas", () => {
  const k = [[0, 0], [1, 10, ease.linear], [2, 0, ease.linear]];
  assert.equal(keys(-1, k), 0); assert.equal(keys(0.5, k), 5); assert.equal(keys(1.5, k), 5); assert.equal(keys(9, k), 0);
});

test("aleatoriedade determinística: mesma semente, mesma sequência", () => {
  const a = mulberry32(7), b = mulberry32(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.equal(hash(1, 2), hash(1, 2)); assert.notEqual(hash(1, 2), hash(2, 1));
  const n = noise1(3.3); assert.ok(n >= -1 && n <= 1); assert.equal(noise1(3.3), n);
});

test("polilinha: comprimento acumulado e ponto no meio", () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  const L = polylineLengths(pts);
  assert.deepEqual([...L], [0, 10, 20]);
  const p = pointAtLength(pts, L, 15); perto(p.x, 10); perto(p.y, 5); perto(p.angle, Math.PI / 2);
});

test("câmera: interpola entre chaves; aplicar leva o centro do mundo ao centro da tela", () => {
  const cam = new Camera(1080, 1920).chave(0, 540, 960, 1).chave(1, 540, 960, 2, 0, ease.linear);
  assert.deepEqual(cam.em(-1), { cx: 540, cy: 960, z: 1, giro: 0 });
  perto(cam.em(1).z, 2);
  const m = []; cam.aplicar({ transform: (...a) => m.push(a) }, 1);
  const [a, b, c, d, e, f] = m[0];
  perto(a * 540 + c * 960 + e, 540); perto(b * 540 + d * 960 + f, 960); perto(a, 2);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/motion-util.test.mjs`
Expected: FAIL — `Cannot find module '.../design-system/motion/util.mjs'`.

- [ ] **Step 4: Escrever `util.mjs`**

```js
// Primitivas de animação portadas do pdoom-video (MIT, Giacomo Magnanini — ver LICENSE-pdoom.txt).
// Tudo é função pura do tempo (ou de uma semente): o mesmo t dá sempre o mesmo quadro,
// na prévia e no MP4. Roda no Node (testes, composição) e no navegador (desenho).

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => (a === b ? 0 : (x - a) / (b - a));
export const remap = (x, a, b, c, d, limitar = true) => {
  const t = invLerp(a, b, x);
  return lerp(c, d, limitar ? clamp(t) : t);
};
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const TAU = Math.PI * 2;

// 0 antes de a, sobe em fi, segura, desce em fo terminando em b.
export const window01 = (x, a, b, fi = 0.2, fo = 0.2) => Math.min(smoothstep(a, a + fi, x), 1 - smoothstep(b - fo, b, x));

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

// Progresso 0..1 de x entre a e b, com easing.
export const prog = (x, a, b, fn = ease.linear) => fn(clamp((x - a) / (b - a)));

// Resposta de uma mola amortecida a um degrau em t = 0: vai de 0 a 1 passando um pouco de 1.
export const springStep = (t, freq = 4, damping = 0.35) => {
  if (t <= 0) return 0;
  const w = TAU * freq;
  return 1 - Math.exp(-damping * w * t) * Math.cos(w * Math.sqrt(1 - damping * damping) * t);
};

// 1 no instante t0, caindo pela metade a cada hl segundos ("batida" de um evento).
export const pulse = (t, t0, hl = 0.12) => (t < t0 ? 0 : Math.pow(0.5, (t - t0) / hl));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash sem estado de números para [0,1).
export function hash(...xs) {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    h ^= Math.floor(x * 1000003) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

const suave = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, suave(x - i));
}

// Interpolação por chaves [t, valor, easing?]; o easing da chave i molda o trecho que chega nela.
export function keys(t, ks) {
  if (!ks.length) return 0;
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const k = ks[i];
    if (t <= k[0]) {
      const p = ks[i - 1];
      return lerp(p[1], k[1], (k[2] ?? ease.inOutCubic)((t - p[0]) / (k[0] - p[0])));
    }
  }
  return ks[ks.length - 1][1];
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Comprimentos acumulados de uma polilinha e o ponto a uma distância s do começo (revelar traços).
export function polylineLengths(pts) {
  const L = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) L[i] = L[i - 1] + dist(pts[i - 1], pts[i]);
  return L;
}
export function pointAtLength(pts, L, s) {
  const n = pts.length;
  if (n === 0) return { x: 0, y: 0, angle: 0 };
  if (n === 1) return { x: pts[0].x, y: pts[0].y, angle: 0 };
  s = clamp(s, 0, L[n - 1]);
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] < s) lo = mid; else hi = mid; }
  const a = pts[lo], b = pts[hi], seg = L[hi] - L[lo];
  const u = seg > 0 ? (s - L[lo]) / seg : 0;
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), angle: Math.atan2(b.y - a.y, b.x - a.x) };
}
```

- [ ] **Step 5: Escrever `camera.mjs`**

```js
// Câmera 2D com chaves (portada do Cam2D do pdoom-video, MIT — ver LICENSE-pdoom.txt).
// Uma chave diz: no instante t, o ponto do mundo (cx, cy) fica no centro da tela, com zoom z e giro.

import { clamp, lerp, ease } from "./util.mjs";

export class Camera {
  constructor(largura, altura) { this.largura = largura; this.altura = altura; this.chaves = []; }

  chave(t, cx, cy, z = 1, giro = 0, curva = ease.inOutCubic) {
    this.chaves.push({ t, cx, cy, z, giro, curva });
    this.chaves.sort((a, b) => a.t - b.t);
    return this;
  }

  em(t) {
    const ks = this.chaves;
    const so = (k) => ({ cx: k.cx, cy: k.cy, z: k.z, giro: k.giro });
    if (!ks.length) return { cx: this.largura / 2, cy: this.altura / 2, z: 1, giro: 0 };
    if (t <= ks[0].t) return so(ks[0]);
    for (let i = 1; i < ks.length; i++) {
      const b = ks[i];
      if (t > b.t) continue;
      const a = ks[i - 1];
      const k = b.curva(clamp((t - a.t) / Math.max(1e-4, b.t - a.t)));
      const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), k));
      const giro = lerp(a.giro, b.giro, k);
      // zoom em torno do ponto fixo do movimento: aproximar e afastar parecem um gesto só
      if (Math.abs(b.z - a.z) > a.z * 0.04) {
        const fx = (b.z * b.cx - a.z * a.cx) / (b.z - a.z), fy = (b.z * b.cy - a.z * a.cy) / (b.z - a.z);
        return { cx: fx - (a.z / z) * (fx - a.cx), cy: fy - (a.z / z) * (fy - a.cy), z, giro };
      }
      return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z, giro };
    }
    return so(ks[ks.length - 1]);
  }

  // Multiplica a transformação atual do contexto (não substitui: respeita transições por fora).
  aplicar(ctx, t) {
    const { cx, cy, z, giro } = this.em(t);
    const co = Math.cos(giro), si = Math.sin(giro);
    ctx.transform(z * co, z * si, -z * si, z * co, this.largura / 2 - z * (co * cx - si * cy), this.altura / 2 - z * (si * cx + co * cy));
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `node --test tests/motion-util.test.mjs`
Expected: PASS (7 testes).

- [ ] **Step 7: Commit**

```bash
git add design-system/motion/LICENSE-pdoom.txt design-system/motion/util.mjs design-system/motion/camera.mjs tests/motion-util.test.mjs
git commit -m "motion: primitivas de animação e câmera 2D (portadas do pdoom-video, MIT)"
```

---

### Task 2: Biblioteca de áudio — esquema, validação e medição do andamento

**Files:**
- Create: `design-system/audio/biblioteca.json`, `design-system/audio/trilhas/.gitkeep`, `design-system/audio/efeitos/.gitkeep`, `scripts/audio.mjs`
- Test: `tests/audio.test.mjs`

**Interfaces:**
- Produces (`scripts/audio.mjs`): `class ErroAudio`, `LICENCAS_ACEITAS: string[]`, `CLIMAS: string[]`, `USOS: string[]`, `DIR_AUDIO: string` (caminho absoluto de `design-system/audio`), `carregarBiblioteca(arquivo?) → {licencas_aceitas, trilhas, efeitos}`, `validarBiblioteca(b, { existe? }) → string[]`, `usosSemEfeito(b) → string[]`, `escolherEfeito(b, uso, n) → efeito | null`, `batidas(amostras: Float32Array, taxa: number) → { bpm, primeira_batida }`, `medir(arquivo) → Promise<{ bpm, primeira_batida, duracao }>`.
- Trilha: `{ id, arquivo, titulo, autor, fonte, link, licenca, clima: string[], bpm, primeira_batida, duracao }` (`arquivo` relativo a `design-system/audio/`).
- Efeito: `{ id, arquivo, uso, fonte, link, licenca }`.

- [ ] **Step 1: Criar a biblioteca vazia**

`design-system/audio/biblioteca.json`:

```json
{
  "licencas_aceitas": ["CC0", "Pixabay Content License", "YouTube Audio Library — sem atribuição"],
  "trilhas": [],
  "efeitos": []
}
```

E os arquivos vazios `design-system/audio/trilhas/.gitkeep` e `design-system/audio/efeitos/.gitkeep`.

- [ ] **Step 2: Escrever o teste que falha**

`tests/audio.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarBiblioteca, usosSemEfeito, escolherEfeito, batidas, carregarBiblioteca, LICENCAS_ACEITAS, CLIMAS, USOS, ErroAudio } from "../scripts/audio.mjs";

const trilha = (extra = {}) => ({ id: "passos-leves", arquivo: "trilhas/passos-leves.mp3", titulo: "Passos Leves", autor: "Fulano", fonte: "Pixabay", link: "https://pixabay.com/music/x", licenca: "Pixabay Content License", clima: ["leve"], bpm: 96, primeira_batida: 0.4, duracao: 120, ...extra });
const efeito = (extra = {}) => ({ id: "tick-1", arquivo: "efeitos/tick-1.ogg", uso: "tick", fonte: "Kenney", link: "https://kenney.nl/assets/interface-sounds", licenca: "CC0", ...extra });
const bib = (t = [], e = []) => ({ licencas_aceitas: LICENCAS_ACEITAS, trilhas: t, efeitos: e });
const existe = () => true;

test("listas fixas: licenças, climas e usos", () => {
  assert.deepEqual(LICENCAS_ACEITAS, ["CC0", "Pixabay Content License", "YouTube Audio Library — sem atribuição"]);
  assert.deepEqual(CLIMAS, ["curioso", "leve", "animado", "reflexivo", "tenso"]);
  assert.deepEqual(USOS, ["caneta", "pop", "whoosh", "tick", "impacto", "digitar", "sino"]);
});

test("a biblioteca do repositório é válida", () => {
  assert.deepEqual(validarBiblioteca(carregarBiblioteca()), []);
});

test("validarBiblioteca aceita o que está completo e recusa licença, clima, uso, link e arquivo", () => {
  assert.deepEqual(validarBiblioteca(bib([trilha()], [efeito()]), { existe }), []);
  const erros = (b) => validarBiblioteca(b, { existe }).join("\n");
  assert.match(erros(bib([trilha({ licenca: "Copyright" })])), /licença "Copyright"/);
  assert.match(erros(bib([trilha({ clima: ["épico"] })])), /clima "épico"/);
  assert.match(erros(bib([trilha({ bpm: 300 })])), /bpm/);
  assert.match(erros(bib([trilha({ link: "pixabay.com" })])), /link/);
  assert.match(erros(bib([trilha(), trilha()])), /id "passos-leves" repetido/);
  assert.match(erros(bib([], [efeito({ uso: "buzina" })])), /uso "buzina"/);
  assert.match(validarBiblioteca(bib([trilha()]), { existe: () => false }).join("\n"), /não achei .*passos-leves\.mp3/);
});

test("usosSemEfeito lista o que falta; escolherEfeito alterna entre variações e devolve null sem nenhuma", () => {
  const b = bib([], [efeito(), efeito({ id: "tick-2", arquivo: "efeitos/tick-2.ogg" })]);
  assert.deepEqual(usosSemEfeito(b), USOS.filter((u) => u !== "tick"));
  assert.equal(escolherEfeito(b, "tick", 0).id, "tick-1");
  assert.equal(escolherEfeito(b, "tick", 1).id, "tick-2");
  assert.equal(escolherEfeito(b, "tick", 2).id, "tick-1");
  assert.equal(escolherEfeito(b, "pop", 0), null);
});

// Sinal sintético: cliques curtos a cada batida, a partir de `inicio`, com ruído baixo.
function cliques(bpm, inicio, segundos = 20, taxa = 22050) {
  const x = new Float32Array(segundos * taxa);
  for (let i = 0; i < x.length; i++) x[i] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.01;
  for (let t = inicio; t < segundos; t += 60 / bpm) {
    const s = Math.round(t * taxa);
    for (let j = 0; j < 300 && s + j < x.length; j++) x[s + j] += 0.9 * Math.exp(-j / 60) * (j % 2 ? 1 : -1);
  }
  return x;
}

test("batidas acha o andamento e a primeira batida de um sinal de cliques", () => {
  for (const [bpm, inicio] of [[120, 0.25], [95, 0.6], [140, 0.1]]) {
    const r = batidas(cliques(bpm, inicio), 22050);
    assert.ok(Math.abs(r.bpm - bpm) < 1, `bpm ${r.bpm} ≉ ${bpm}`);
    assert.ok(Math.abs(r.primeira_batida - inicio) < 0.03, `primeira ${r.primeira_batida} ≉ ${inicio}`);
  }
  assert.throws(() => batidas(new Float32Array(1000), 22050), ErroAudio);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/audio.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/audio.mjs'`.

- [ ] **Step 4: Escrever `scripts/audio.mjs`**

```js
#!/usr/bin/env node
// Biblioteca de áudio dos vídeos do Instagram (design-system/audio/biblioteca.json): Trilhas e
// Efeitos sonoros, cada um com fonte, link e licença gratuita explícita (ADR-0012).
//
//   node scripts/audio.mjs                    # valida a biblioteca e mostra o resumo
//   node scripts/audio.mjs --medir <arquivo>  # mede BPM, primeira batida e duração de uma faixa nova
//
// A medição ouve o arquivo pelo ffmpeg do projeto; o resultado vai para a entrada da Trilha.

import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DIR_AUDIO = join(RAIZ, "design-system/audio");

export class ErroAudio extends Error {}
export const LICENCAS_ACEITAS = ["CC0", "Pixabay Content License", "YouTube Audio Library — sem atribuição"];
export const CLIMAS = ["curioso", "leve", "animado", "reflexivo", "tenso"];
export const USOS = ["caneta", "pop", "whoosh", "tick", "impacto", "digitar", "sino"];

export function carregarBiblioteca(arquivo = join(DIR_AUDIO, "biblioteca.json")) {
  return JSON.parse(readFileSync(arquivo, "utf8"));
}

function comuns(item, onde, erros, existe, ids) {
  for (const c of ["id", "arquivo", "fonte", "link", "licenca"]) if (!item[c]) erros.push(`${onde}: falta "${c}"`);
  if (item.id) { if (ids.has(item.id)) erros.push(`${onde}: id "${item.id}" repetido`); ids.add(item.id); }
  if (item.link && !/^https:\/\//.test(item.link)) erros.push(`${onde}: "link" precisa começar com https://`);
  if (item.licenca && !LICENCAS_ACEITAS.includes(item.licenca)) erros.push(`${onde}: licença "${item.licenca}" não é aceita (${LICENCAS_ACEITAS.join("; ")})`);
  if (item.arquivo && !existe(item.arquivo)) erros.push(`${onde}: não achei design-system/audio/${item.arquivo}`);
}

export function validarBiblioteca(b, { existe = (rel) => existsSync(join(DIR_AUDIO, rel)) } = {}) {
  const erros = [], ids = new Set();
  if (!Array.isArray(b?.trilhas) || !Array.isArray(b?.efeitos)) return ['biblioteca.json precisa das listas "trilhas" e "efeitos"'];
  b.trilhas.forEach((t, i) => {
    const onde = `trilha ${i + 1}${t.id ? ` (${t.id})` : ""}`;
    comuns(t, onde, erros, existe, ids);
    if (!t.titulo || !t.autor) erros.push(`${onde}: falta "titulo" ou "autor"`);
    if (!Array.isArray(t.clima) || !t.clima.length) erros.push(`${onde}: "clima" precisa de pelo menos um de ${CLIMAS.join(", ")}`);
    else for (const c of t.clima) if (!CLIMAS.includes(c)) erros.push(`${onde}: clima "${c}" não existe (${CLIMAS.join(", ")})`);
    if (!(t.bpm >= 60 && t.bpm <= 200)) erros.push(`${onde}: "bpm" deve ser de 60 a 200 — meça com node scripts/audio.mjs --medir`);
    if (!(t.primeira_batida >= 0)) erros.push(`${onde}: "primeira_batida" deve ser ≥ 0`);
    if (!(t.duracao > 0)) erros.push(`${onde}: "duracao" deve ser > 0`);
  });
  b.efeitos.forEach((e, i) => {
    const onde = `efeito ${i + 1}${e.id ? ` (${e.id})` : ""}`;
    comuns(e, onde, erros, existe, ids);
    if (!USOS.includes(e.uso)) erros.push(`${onde}: uso "${e.uso}" não existe (${USOS.join(", ")})`);
  });
  return erros;
}

export const usosSemEfeito = (b) => USOS.filter((u) => !b.efeitos.some((e) => e.uso === u));

// n-ésima ocorrência de um uso → alterna entre as variações (o mesmo vídeo soa igual a cada render).
export function escolherEfeito(b, uso, n) {
  const lista = b.efeitos.filter((e) => e.uso === uso);
  return lista.length ? lista[n % lista.length] : null;
}

// Andamento por energia: onsets (subidas de energia) → período que mais se repete → fase da 1ª batida.
export function batidas(x, taxa, { min = 70, max = 180 } = {}) {
  const salto = 512, janela = 1024;
  const n = Math.floor((x.length - janela) / salto);
  if (n < 64) throw new ErroAudio("áudio curto demais para medir o andamento");
  const energia = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < janela; j++) { const v = x[i * salto + j]; s += v * v; }
    energia[i] = Math.log(1e-9 + s);
  }
  const onset = new Float64Array(n);
  for (let i = 1; i < n; i++) onset[i] = Math.max(0, energia[i] - energia[i - 1]);
  const fps = taxa / salto;
  // pente: para cada período P (em quadros, fracionário) e fase o, soma os onsets nas batidas o + kP
  const pente = (P) => {
    let melhor = { v: -1, o: 0 };
    for (let o = 0; o < Math.ceil(P); o++) {
      let s = 0, cont = 0;
      for (let k = o; k < n; k += P) { s += onset[Math.round(k)] ?? 0; cont++; }
      const v = s / Math.sqrt(cont);   // média puniria o dobro do período e soma, a metade: √ desempata a favor do certo
      if (v > melhor.v) melhor = { v, o };
    }
    return melhor;
  };
  let melhor = { P: 0, v: -1, o: 0 };
  const passo = (P0, P1, d) => { for (let P = P0; P <= P1; P += d) { const r = pente(P); if (r.v > melhor.v) melhor = { P, ...r }; } };
  passo((fps * 60) / max, (fps * 60) / min, 0.25);
  const grosso = melhor.P;
  passo(grosso - 0.25, grosso + 0.25, 0.005);
  const bpm = Math.round(((fps * 60) / melhor.P) * 10) / 10;
  const primeira_batida = Math.round(((melhor.o * salto + 0.75 * janela) / taxa) * 1000) / 1000;
  return { bpm, primeira_batida };
}

export async function medir(arquivo) {
  if (!existsSync(arquivo)) throw new ErroAudio(`não achei ${arquivo}`);
  const { default: ffmpeg } = await import("ffmpeg-static");
  const taxa = 22050;
  const pedacos = [];
  await new Promise((ok, falha) => {
    const p = spawn(ffmpeg, ["-loglevel", "error", "-i", arquivo, "-ac", "1", "-ar", String(taxa), "-f", "f32le", "-"], { stdio: ["ignore", "pipe", "inherit"] });
    p.stdout.on("data", (d) => pedacos.push(d));
    p.on("error", falha);
    p.on("close", (c) => (c === 0 ? ok() : falha(new ErroAudio(`ffmpeg não conseguiu ler ${arquivo}`))));
  });
  const buf = Buffer.concat(pedacos);
  const amostras = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  return { ...batidas(amostras, taxa), duracao: Math.round((amostras.length / taxa) * 10) / 10 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === "--medir") {
      if (!args[1]) throw new ErroAudio("uso: node scripts/audio.mjs --medir <arquivo>");
      console.log(JSON.stringify(await medir(resolve(args[1]))));
    } else {
      const b = carregarBiblioteca();
      const erros = validarBiblioteca(b);
      if (erros.length) throw new ErroAudio(`biblioteca.json inválida:\n- ${erros.join("\n- ")}`);
      console.log(`${b.trilhas.length} trilha(s), ${b.efeitos.length} efeito(s).`);
      for (const t of b.trilhas) console.log(`  trilha ${t.id}: ${t.clima.join("/")}, ${t.bpm} BPM, ${t.duracao} s — ${t.licenca}`);
      const faltam = usosSemEfeito(b);
      if (faltam.length) console.log(`aviso: nenhum efeito para ${faltam.join(", ")} — esses momentos saem sem som`);
    }
  } catch (e) {
    if (e instanceof ErroAudio) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test tests/audio.test.mjs`
Expected: PASS (5 testes). Se o teste de batidas falhar por tolerância, ajuste só a resolução do refinamento (`0.005`) ou o deslocamento `0.75 * janela` — não afrouxe as tolerâncias do teste.

- [ ] **Step 6: Commit**

```bash
git add design-system/audio scripts/audio.mjs tests/audio.test.mjs
git commit -m "áudio: biblioteca de trilhas e efeitos com licença explícita e medição de BPM"
```

---

### Task 3: Mixagem

**Files:**
- Create: `design-system/motion/movimento.json`, `design-system/scripts/motion/mixagem.mjs`
- Test: `tests/mixagem.test.mjs`

**Interfaces:**
- Consumes: `carregarBiblioteca`, `escolherEfeito`, `DIR_AUDIO` (Task 2).
- Produces (`movimento.json`): ver Step 1 (chaves `duracoes`, `curvas`, `mola`, `impacto` (tremor em px e opacidade do clarão da Cena `impacto` — suaves de propósito: no protótipo de 12/10, 12 px e 0,12 ficaram exagerados), `grade`, `grao`, `caneta`, `efeitos`, `trilha`, `loudness`).
- Produces (`mixagem.mjs`): `MOVIMENTO` (o JSON lido), `argsMixagem({ duracao, trilha: {arquivo, ganho} | null, efeitos: [{arquivo, t, ganho}], saida, normalizar }) → string[]`, `mixar(comp, { biblioteca, trilhaId = null, saida, executar?, ffmpeg? }) → Promise<string | null>` (null = sem som nenhum; quem grava usa a faixa muda).
- Composição (formato usado aqui e definido de vez na Task 4): `{ formato, duracao, efeitos: [{ t, efeito, ganho }], ... }`.

- [ ] **Step 1: Criar `movimento.json`**

```json
{
  "uso": "Tokens de movimento e de som dos vídeos do Instagram (design-system/motion). Segundos, salvo indicação. Cores e fontes não ficam aqui: vêm do CSS do design system.",
  "duracoes": { "entrada": 0.6, "saida": 0.35, "escrita_por_caractere": 0.035, "loop": 0.6, "faixa": 0.6 },
  "curvas": { "entrada": "outExpo", "saida": "inCubic", "camera": "inOutCubic" },
  "mola": { "freq": 3.2, "amortecimento": 0.42 },
  "impacto": { "tremor": 3, "clarao": 0.03 },
  "grade": { "passo": 54, "forte_a_cada": 4, "opacidade": 0.06, "revelar": 0.5 },
  "grao": { "opacidade": 0.05 },
  "caneta": { "raio": 9 },
  "efeitos": { "ganho_reel": 0.8, "ganho_story": 0.4, "intervalo_minimo": 0.08 },
  "trilha": { "ganho": 0.55, "fade_entrada": 0.4, "fade_saida": 1.2, "compasso": 4 },
  "loudness": { "I": -14, "TP": -1.5 }
}
```

- [ ] **Step 2: Escrever o teste que falha**

`tests/mixagem.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { argsMixagem, mixar, MOVIMENTO } from "../design-system/scripts/motion/mixagem.mjs";
import { LICENCAS_ACEITAS } from "../scripts/audio.mjs";

const filtro = (a) => a[a.indexOf("-filter_complex") + 1];

test("argsMixagem: base muda com a duração, Trilha em loop com fade, efeitos com atraso, normaliza a −14 LUFS", () => {
  const a = argsMixagem({ duracao: 30, trilha: { arquivo: "/a/t.mp3", ganho: 0.55 }, efeitos: [{ arquivo: "/a/tick.ogg", t: 1.5, ganho: 0.8 }], saida: "/tmp/m.wav", normalizar: true });
  const i = a.indexOf("anullsrc=channel_layout=stereo:sample_rate=44100");
  assert.ok(i > 0 && a[i - 1] === "-i" && a[i - 2] === "30.000" && a[i - 3] === "-t");
  const iT = a.indexOf("/a/t.mp3");
  assert.equal(a[iT - 1], "-i"); assert.deepEqual(a.slice(iT - 3, iT - 1), ["-stream_loop", "-1"], "Trilha curta repete");
  const f = filtro(a);
  assert.ok(f.includes("afade=t=in:st=0:d=0.4") && f.includes("afade=t=out:st=28.800:d=1.2") && f.includes("volume=0.55"));
  assert.ok(f.includes("adelay=1500|1500") && f.includes("volume=0.8"));
  assert.ok(f.includes("amix=inputs=3:normalize=0:duration=first") && f.includes("loudnorm=I=-14:TP=-1.5"));
  assert.deepEqual(a.slice(-4), ["[mix]", "-c:a", "pcm_s16le", "/tmp/m.wav"]);
});

test("argsMixagem sem Trilha (story): só efeitos, sem loudnorm (não infla o silêncio), com limitador", () => {
  const f = filtro(argsMixagem({ duracao: 8, trilha: null, efeitos: [{ arquivo: "/a/pop.ogg", t: 0.3, ganho: 0.4 }], saida: "/tmp/m.wav", normalizar: false }));
  assert.ok(!f.includes("loudnorm") && f.includes("alimiter") && f.includes("amix=inputs=2"));
});

const comp = { formato: "reel", duracao: 20, efeitos: [{ t: 0.3, efeito: "pop", ganho: 0.8 }, { t: 1, efeito: "tick", ganho: 0.8 }, { t: 2, efeito: "tick", ganho: 0.8 }] };
const bib = (trilhas = [], efeitos = []) => ({ licencas_aceitas: LICENCAS_ACEITAS, trilhas, efeitos });

test("mixar: biblioteca vazia e sem Trilha → null (o vídeo sai com a faixa muda)", async () => {
  let chamou = false;
  assert.equal(await mixar(comp, { biblioteca: bib(), saida: "/tmp/m.wav", executar: async () => { chamou = true; }, ffmpeg: "ff" }), null);
  assert.equal(chamou, false);
});

test("mixar: usa só os efeitos que existem, alterna variações e põe a Trilha escolhida", async () => {
  const efeitos = [{ id: "t1", arquivo: "efeitos/t1.ogg", uso: "tick" }, { id: "t2", arquivo: "efeitos/t2.ogg", uso: "tick" }];
  const trilhas = [{ id: "leve", arquivo: "trilhas/leve.mp3" }];
  const chamadas = [];
  const r = await mixar(comp, { biblioteca: bib(trilhas, efeitos), trilhaId: "leve", saida: "/tmp/m.wav", executar: async (bin, args) => chamadas.push({ bin, args }), ffmpeg: "ff" });
  assert.equal(r, "/tmp/m.wav");
  const a = chamadas[0].args;
  assert.equal(chamadas[0].bin, "ff");
  assert.ok(a.some((x) => x.endsWith("trilhas/leve.mp3")));
  assert.deepEqual(a.filter((x) => /efeitos\/t\d\.ogg$/.test(x)).map((x) => x.slice(-6)), ["t1.ogg", "t2.ogg"], "pop não existe e fica de fora; os dois ticks alternam");
  assert.ok(filtro(a).includes("loudnorm"), "com Trilha, normaliza");
  await assert.rejects(mixar(comp, { biblioteca: bib(trilhas, efeitos), trilhaId: "nao-tem", saida: "/tmp/m.wav", executar: async () => {}, ffmpeg: "ff" }), /trilha "nao-tem"/);
});

test("tokens de som estão no movimento.json", () => {
  assert.equal(MOVIMENTO.loudness.I, -14);
  assert.equal(MOVIMENTO.trilha.compasso, 4);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/mixagem.test.mjs`
Expected: FAIL — `Cannot find module '.../design-system/scripts/motion/mixagem.mjs'`.

- [ ] **Step 4: Escrever `mixagem.mjs`**

```js
// Mixa o som de uma composição num WAV: base muda com a duração exata, Trilha (em loop, com fade)
// e Efeitos sonoros nos instantes dos eventos. Com Trilha, normaliza a −14 LUFS; sem Trilha (stories),
// só limita os picos — normalizar um vídeo quase todo em silêncio estouraria os efeitos.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { escolherEfeito, DIR_AUDIO, ErroAudio } from "../../../scripts/audio.mjs";

export const MOVIMENTO = JSON.parse(readFileSync(new URL("../../motion/movimento.json", import.meta.url), "utf8"));

export function argsMixagem({ duracao, trilha = null, efeitos = [], saida, normalizar }) {
  const D = duracao.toFixed(3);
  const entradas = ["-f", "lavfi", "-t", D, "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"];
  const filtros = [], rotulos = ["[0:a]"];
  let n = 1;
  if (trilha) {
    const { fade_entrada: fi, fade_saida: fo } = MOVIMENTO.trilha;
    entradas.push("-stream_loop", "-1", "-i", trilha.arquivo);
    filtros.push(`[${n}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${D},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fi},afade=t=out:st=${(duracao - fo).toFixed(3)}:d=${fo},volume=${trilha.ganho}[t]`);
    rotulos.push("[t]");
    n++;
  }
  efeitos.forEach((e, i) => {
    const ms = Math.round(e.t * 1000);
    entradas.push("-i", e.arquivo);
    filtros.push(`[${n}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${e.ganho}[e${i}]`);
    rotulos.push(`[e${i}]`);
    n++;
  });
  const { I, TP } = MOVIMENTO.loudness;
  const final = normalizar ? `loudnorm=I=${I}:TP=${TP}:LRA=11` : "alimiter=limit=0.89";
  filtros.push(`${rotulos.join("")}amix=inputs=${rotulos.length}:normalize=0:duration=first,${final},aresample=44100,atrim=0:${D}[mix]`);
  return ["-y", "-loglevel", "error", ...entradas, "-filter_complex", filtros.join(";"), "-map", "[mix]", "-c:a", "pcm_s16le", saida];
}

async function rodar(bin, args) {
  const { spawn } = await import("node:child_process");
  return new Promise((ok, falha) => {
    const p = spawn(bin, args, { stdio: ["ignore", "inherit", "pipe"] });
    let erro = "";
    p.stderr.on("data", (d) => { erro += d; });
    p.on("error", falha);
    p.on("close", (c) => (c === 0 ? ok() : falha(new ErroAudio(`ffmpeg (mixagem) terminou com código ${c}: ${erro.trim()}`))));
  });
}

export async function mixar(comp, { biblioteca, trilhaId = null, saida, executar = rodar, ffmpeg = null }) {
  const contagem = {};
  const efeitos = comp.efeitos.flatMap((e) => {
    const n = (contagem[e.efeito] = (contagem[e.efeito] ?? -1) + 1);
    const ef = escolherEfeito(biblioteca, e.efeito, n);
    return ef ? [{ arquivo: join(DIR_AUDIO, ef.arquivo), t: e.t, ganho: e.ganho }] : [];
  });
  let trilha = null;
  if (trilhaId) {
    const t = biblioteca.trilhas.find((x) => x.id === trilhaId);
    if (!t) throw new ErroAudio(`trilha "${trilhaId}" não está em design-system/audio/biblioteca.json`);
    trilha = { arquivo: join(DIR_AUDIO, t.arquivo), ganho: MOVIMENTO.trilha.ganho };
  }
  if (!trilha && !efeitos.length) return null;
  await executar(ffmpeg ?? (await import("ffmpeg-static")).default, argsMixagem({ duracao: comp.duracao, trilha, efeitos, saida, normalizar: !!trilha }));
  return saida;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test tests/mixagem.test.mjs`
Expected: PASS (5 testes).

- [ ] **Step 6: Commit**

```bash
git add design-system/motion/movimento.json design-system/scripts/motion/mixagem.mjs tests/mixagem.test.mjs
git commit -m "motion: tokens de movimento e mixagem de Trilha e Efeitos no ffmpeg"
```

---

### Task 4: Contrato das Cenas, Cena `texto` e composição

**Files:**
- Create: `design-system/motion/escrita.mjs`, `design-system/motion/cenas/comum.mjs`, `design-system/motion/cenas/index.mjs`, `design-system/motion/cenas/texto.mjs`, `design-system/motion/composicao.mjs`, `tests/ajudas-motion.mjs`
- Test: `tests/motion-cenas.test.mjs`, `tests/motion-composicao.test.mjs`

**Interfaces:**
- Consumes: `util.mjs` (Task 1), `movimento.json` (Task 3).
- **Contrato de um módulo de Cena** (`design-system/motion/cenas/<tipo>.mjs`), sem nada de Node (roda no navegador):
  - `export const usaGrade: boolean`
  - `export function validar(cena, onde, { existeIcone }) → string[]` — mensagens já começando por `onde` (ex.: `"cena 2: …"`).
  - `export function linhaDoTempo(cena) → { fim: number, eventos: [{ t: number, efeito: string }] }` — `t` local à Cena; `fim` = instante em que o último bloco começa a entrar; `efeito` ∈ `USOS` (Task 2). A Cena `texto` devolve também `tempos` (o mesmo objeto de hoje).
  - `export function desenhar(ctx, cena, t, kit)` — `t` local. Desenha só o conteúdo (fundo, grade, marca e grão são do quadro).
- **kit** (montado pela página na Task 5; `kitFalso()` nos testes):
  `{ layout: { largura, altura, area: {x,y,w,h}, alinhamento: "center"|"top"|"bottom", lockup: {x,y,tam}, rodape: {y,h}, faixa: {y,h}, gap, respiroDica, icone, video: {y,h} }, fontes: { kicker, titulo, tituloMedio, tituloPequeno, corpo, apoio, pergunta, itemNumero, itemTitulo, itemTexto, numero, conta, faixa, rodape } (cada uma { css, px, line, caixaAlta?, espaco? }), cores: { fundo, tinta, tintaSuave, verde, verdeSuave, marinho, vermelho }, movimento, usuario, imagens: { logo, icones: {nome: img} }, grao }`
- Produces (`escrita.mjs`): `quebrarLinhas(medir, texto, largura) → string[]`, `usarFonte(ctx, f)`, `caixa(f, s)`, `linhaBase(f)`, `entrada(t, t0, kit, dur?)`, `escalar(f, px) → f`, `linhasDe(ctx, f, s, largura)`, `caneta(ctx, x, y, t, kit)`, `digitar(ctx, linhas, f, x, y, t, t0, cor, opts?)`, `subir(ctx, linhas, f, x, y, t, t0, cor, kit, opts?)`, `escrever(ctx, s, x, yBase, p, kit, t, opts?)`, `revelarTraco(ctx, pts, p, kit, t, opts)`.
- Produces (`cenas/comum.mjs`): `LIMITES_CENA = { duracao: { story: {min:5,max:60}, reel: {min:3,max:60} }, folga: { story: 2, reel: 1.2 }, campos: { kicker: 40, titulo: 60, faixa: 40 } }`, `tamanho(s)`, `checarTamanho(campo, valor, limite, onde) → string | null`.
- Produces (`cenas/index.mjs`): `CENAS` (tipo → módulo), `TIPOS_DE_CENA`, `INTERNAS` (tipo → módulo, não aceito em arquivos), `moduloDe(tipo)`, `validarCena(cena, onde, { formato = "story", existeIcone = () => true }) → { erros: string[], cena? }` — `cena` validada = `{ ...cena, tipo, duracao: Number, minimo, linha }`.
- Produces (`cenas/texto.mjs`): além do contrato, `LIMITES_TEXTO = { campos: { linha: 90, item_titulo: 20, item_texto: 90, pergunta: 60, dica: 30 }, linhas: 6, itens: 4 }`.
- Produces (`composicao.mjs`, só Node): `CLASSES`, `encaixarNaBatida(fronteiras, minimos, { bpm, primeira_batida }, compasso) → number[]`, `montarComposicao(cenas, { formato: "story"|"reel"|"moldura", semSticker = true, trilha = null, usuario }) → { formato, classes, usuario, duracao, loop, cenas: [{ ...cena, inicio, fim }], efeitos: [{ t, efeito, ganho }] }`.

- [ ] **Step 1: Ajudas de teste**

`tests/ajudas-motion.mjs`:

```js
// Contexto 2D e kit falsos para testar as Cenas no Node, sem navegador.
import { readFileSync } from "node:fs";

export const movimento = JSON.parse(readFileSync(new URL("../design-system/motion/movimento.json", import.meta.url), "utf8"));

// Registra as chamadas de desenho; measureText estima 0,6 × o tamanho da fonte por caractere.
export function ctxFalso() {
  const chamadas = [];
  const alvo = {
    font: "10px sans-serif", letterSpacing: "0px", globalAlpha: 1, globalCompositeOperation: "source-over",
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, lineCap: "butt", lineJoin: "miter", textAlign: "left", textBaseline: "alphabetic",
    chamadas,
    measureText(s) {
      const px = Number((this.font.match(/(\d+(?:\.\d+)?)px/) ?? [0, 10])[1]);
      return { width: String(s).length * px * 0.6, actualBoundingBoxAscent: px * 0.75, actualBoundingBoxDescent: px * 0.2 };
    },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createPattern() { return {}; },
  };
  return new Proxy(alvo, {
    get(o, k) { if (k in o) return o[k]; return (...args) => { chamadas.push([k, ...args]); }; },
    set(o, k, v) { o[k] = v; return true; },
  });
}

const f = (px, line, familia = "Poppins", peso = 600, extra = {}) => ({ css: `${peso} ${px}px ${familia}`, px, line, ...extra });

export function kitFalso(extra = {}) {
  return {
    layout: { largura: 1080, altura: 1920, area: { x: 72, y: 572, w: 936, h: 916 }, alinhamento: "center", lockup: { x: 72, y: 170, tam: 160 }, rodape: { y: 1654, h: 96 }, faixa: { y: 1558, h: 96 }, gap: 24, respiroDica: 64, icone: 220, video: { y: 656, h: 608 } },
    fontes: {
      kicker: f(32, 50, "Poppins", 800, { caixaAlta: true, espaco: "0.04em" }),
      titulo: f(76, 82, '"Archivo Black"', 400, { caixaAlta: true }),
      tituloMedio: f(58, 64, '"Archivo Black"', 400, { caixaAlta: true }),
      tituloPequeno: f(48, 55, '"Archivo Black"', 400, { caixaAlta: true }),
      corpo: f(42, 80), apoio: f(34, 44), pergunta: f(52, 60, '"Archivo Black"', 400),
      itemNumero: f(64, 64, '"Archivo Black"', 400), itemTitulo: f(46, 80, '"Archivo Black"', 400, { caixaAlta: true }), itemTexto: f(36, 48),
      numero: f(160, 160, '"Archivo Black"', 400), conta: f(64, 92, '"Baloo 2"', 700),
      faixa: f(32, 32, "Poppins", 800, { caixaAlta: true, espaco: "0.04em" }), rodape: f(32, 32, "Poppins", 800),
    },
    cores: { fundo: "rgb(44, 44, 44)", tinta: "rgb(255, 255, 255)", tintaSuave: "rgb(201, 201, 201)", verde: "rgb(81, 170, 4)", verdeSuave: "rgb(167, 201, 115)", marinho: "rgb(14, 40, 65)", vermelho: "#FC3739" },
    movimento, usuario: "pesquisaoperacionalparatodos", imagens: { logo: null, icones: {} }, grao: null,
    ...extra,
  };
}

// Textos desenhados (fillText) e o y de cada um.
export const textos = (ctx) => ctx.chamadas.filter((c) => c[0] === "fillText").map(([, s, x, y]) => ({ s, x, y }));

// Desenha a Cena em vários instantes e devolve o ctx do último; falha se desenhar lançar erro.
export function desenharEm(modulo, cena, instantes, kit = kitFalso()) {
  let ctx;
  for (const t of instantes) { ctx = ctxFalso(); modulo.desenhar(ctx, cena, t, kit); }
  return ctx;
}
```

- [ ] **Step 2: Escrever os testes que falham**

`tests/motion-cenas.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCena, CENAS, TIPOS_DE_CENA } from "../design-system/motion/cenas/index.mjs";
import * as texto from "../design-system/motion/cenas/texto.mjs";
import { quebrarLinhas, caixa } from "../design-system/motion/escrita.mjs";
import { kitFalso, ctxFalso, textos, desenharEm } from "./ajudas-motion.mjs";

const story = (extra = {}) => ({ duracao: 12, kicker: "UM DESAFIO", titulo: "VOCÊ TEM UMA PADARIA", linhas: ["Pão: 1 h", "Bolo: 2 h"], pergunta: "O que rende mais?", dica: "Responda no quiz", ...extra });

test("sem tipo vira texto; tipo desconhecido é recusado com a lista", () => {
  assert.ok(TIPOS_DE_CENA.includes("texto"));
  assert.equal(validarCena(story(), "story 1").cena.tipo, "texto");
  assert.match(validarCena({ ...story(), tipo: "slide" }, "cena 1").erros[0], /cena 1: tipo de cena "slide" não existe \(texto/);
});

test("texto mantém a linha do tempo de hoje e devolve eventos de som", () => {
  const { cena } = validarCena(story(), "story 1");
  assert.deepEqual(cena.linha.tempos, { kicker: 0, titulo: 0.3, blocos: [1.2, 2.3], pergunta: 3.5, dica: 4.3 });
  assert.equal(cena.linha.fim, 4.3);
  assert.equal(cena.minimo, 6.3);
  assert.deepEqual(cena.linha.eventos.map((e) => e.efeito), ["digitar", "pop", "tick", "tick", "caneta", "tick"]);
});

test("duração: story de 5 a 60 s com folga de 2 s; Cena de reel de 3 a 60 s com folga de 1,2 s", () => {
  assert.match(validarCena(story({ duracao: 5 }), "story 1").erros[0], /pelo menos 6\.3/);
  const curta = { duracao: 3, titulo: "NÃO DÁ" };
  assert.match(validarCena(curta, "story 1").erros[0], /de 5 a 60/);
  assert.deepEqual(validarCena(curta, "cena 1", { formato: "reel" }).erros, []);
  assert.equal(validarCena(curta, "cena 1", { formato: "reel" }).cena.minimo, 1.5);
});

test("texto recusa o que não cabe (mesmas regras de hoje)", () => {
  const erro = (c) => validarCena(c, "story 1", { existeIcone: (n) => n === "alvo" }).erros[0] ?? "";
  assert.match(erro(story({ dica: "x".repeat(31) })), /"dica" tem 31/);
  assert.match(erro(story({ itens: [{ titulo: "A", texto: "b" }] })), /"linhas" ou "itens"/);
  assert.match(erro(story({ icone: "nao-existe" })), /ícone "nao-existe"/);
  assert.match(erro({ duracao: 10, linhas: ["a"] }), /"kicker" ou "titulo"/);
  assert.match(erro(story({ linhas: Array(7).fill("a") })), /7 linhas/);
  assert.equal(erro(story({ icone: "alvo" })), "");
});

test("quebrarLinhas respeita a largura e as quebras manuais; caixa alta em pt-BR mantém acentos", () => {
  const medir = (s) => s.length * 10;
  assert.deepEqual(quebrarLinhas(medir, "um dois três quatro", 100), ["um dois", "três", "quatro"]);
  assert.deepEqual(quebrarLinhas(medir, "a\nb c", 100), ["a", "b c"]);
  assert.equal(caixa({ caixaAlta: true }, "função ótima da região"), "FUNÇÃO ÓTIMA DA REGIÃO");
  assert.equal(caixa({}, "função"), "função");
});

test("texto desenha kicker em caixa alta, título e linhas; no instante 0 ainda não há linhas", () => {
  const { cena } = validarCena(story({ kicker: "um desafio de produção" }), "story 1");
  const fim = textos(desenharEm(texto, cena, [cena.duracao]));
  assert.ok(fim.some((x) => x.s.startsWith("UM DESAFIO DE PRODUÇÃO")));
  assert.ok(fim.some((x) => x.s.includes("Pão: 1 h")) && fim.some((x) => x.s.includes("Bolo: 2 h")));
  const comeco = textos(desenharEm(texto, cena, [0]));
  assert.ok(!comeco.some((x) => x.s.includes("Pão")));
});

test("texto que não cabe encolhe: nada passa do fim da área (story com sticker, campos no máximo)", () => {
  const kit = kitFalso();
  kit.layout.area = { x: 72, y: 572, w: 936, h: 600 };
  kit.layout.alinhamento = "top";
  const cheio = { duracao: 20, kicker: "K".repeat(40), titulo: "TÍTULO ".repeat(8).trim().slice(0, 60), linhas: Array(6).fill("palavra ".repeat(11).trim().slice(0, 90)), dica: "x".repeat(30) };
  const { cena, erros } = validarCena(cheio, "story 1");
  assert.deepEqual(erros, []);
  const ctx = ctxFalso();
  texto.desenhar(ctx, cena, cena.duracao, kit);
  const escala = ctx.chamadas.find((c) => c[0] === "scale");
  assert.ok(escala && escala[1] < 1, "encolheu");
  const [, tx, ty] = ctx.chamadas.find((c) => c[0] === "translate");
  const yMax = Math.max(...textos(ctx).map((x) => x.y));
  assert.ok(ty + yMax * escala[1] <= kit.layout.area.y + kit.layout.area.h, "última linha dentro da área");
});

test("todo tipo registrado cumpre o contrato", () => {
  for (const [tipo, m] of Object.entries(CENAS)) {
    assert.equal(typeof m.usaGrade, "boolean", tipo);
    for (const fn of ["validar", "linhaDoTempo", "desenhar"]) assert.equal(typeof m[fn], "function", `${tipo}.${fn}`);
  }
});
```

`tests/motion-composicao.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { montarComposicao, encaixarNaBatida, CLASSES } from "../design-system/motion/composicao.mjs";
import { validarCena } from "../design-system/motion/cenas/index.mjs";

const cena = (extra = {}, formato = "reel") => validarCena({ duracao: 7, kicker: "K", titulo: "T", linhas: ["a"], ...extra }, "cena", { formato }).cena;

test("Cenas em sequência: início e fim acumulados, duração total, classes do formato", () => {
  const c = montarComposicao([cena(), cena({ duracao: 12 })], { formato: "reel", usuario: "u" });
  assert.deepEqual(c.cenas.map((x) => [x.inicio, x.fim]), [[0, 7], [7, 19]]);
  assert.equal(c.duracao, 19);
  assert.equal(c.classes, CLASSES.reel);
  assert.ok(CLASSES.reel.includes("ig--reel-cena") && CLASSES.reel.includes("ig--sem-sticker"));
  assert.equal(montarComposicao([cena({}, "story")], { formato: "story", semSticker: false }).classes, "ig ig--story ig--story-video");
  assert.equal(montarComposicao([cena({}, "story")], { formato: "story", semSticker: true }).classes, "ig ig--story ig--story-video ig--sem-sticker");
});

test("eventos de som: deslocados pelo início da Cena, whoosh na troca de Cena (só no reel), ganho do formato", () => {
  const c = montarComposicao([cena(), cena()], { formato: "reel" });
  const whoosh = c.efeitos.filter((e) => e.efeito === "whoosh");
  assert.deepEqual(whoosh.map((e) => e.t), [7]);
  assert.ok(c.efeitos.some((e) => e.efeito === "pop" && e.t === 7.3));
  assert.ok(c.efeitos.every((e) => e.ganho === 0.8));
  const s = montarComposicao([cena({}, "story")], { formato: "story" });
  assert.ok(s.efeitos.every((e) => e.ganho === 0.4) && !s.efeitos.some((e) => e.efeito === "whoosh"));
});

test("efeitos iguais colados (< 80 ms) viram um só", () => {
  const c = montarComposicao([cena({ linhas: ["a", "b"] })], { formato: "reel" });
  const ticks = c.efeitos.filter((e) => e.efeito === "tick").map((e) => e.t);
  assert.ok(ticks.every((t, i) => i === 0 || t - ticks[i - 1] >= 0.08));
});

test("loop só no reel cuja última Cena não tem faixa", () => {
  assert.equal(montarComposicao([cena()], { formato: "reel" }).loop, true);
  assert.equal(montarComposicao([cena({ faixa: "AULA COMPLETA NO CANAL" })], { formato: "reel" }).loop, false);
  assert.equal(montarComposicao([cena({}, "story")], { formato: "story" }).loop, false);
});

test("encaixarNaBatida põe as fronteiras no compasso sem encurtar Cena abaixo do mínimo", () => {
  const batida = { bpm: 120, primeira_batida: 0.5 };   // compasso de 4 tempos = 2 s
  assert.deepEqual(encaixarNaBatida([7, 19, 33], [5, 6, 6], batida, 4), [6.5, 18.5, 32.5]);
  assert.deepEqual(encaixarNaBatida([5], [5], batida, 4), [6.5], "arredondar para 4,5 deixaria a Cena com menos de 5 s");
  const c = montarComposicao([cena(), cena({ duracao: 12 })], { formato: "reel", trilha: batida });
  assert.deepEqual(c.cenas.map((x) => x.fim), [6.5, 18.5]);
  assert.ok(c.cenas.every((x) => x.fim - x.inicio >= x.minimo));
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/motion-cenas.test.mjs tests/motion-composicao.test.mjs`
Expected: FAIL — módulos não existem.

- [ ] **Step 4: Escrever `escrita.mjs`**

```js
// Ferramentas de escrita das Cenas: quebrar texto, aplicar fonte, entrada com easing, a caneta e as
// revelações (digitar letra a letra, subir por trás de uma máscara, escrever com a caneta, revelar traço).
// Cores e fontes chegam no kit (medidas do CSS); nada de valor fixo aqui.

import { clamp, ease, prog, noise1, polylineLengths, pointAtLength, TAU } from "./util.mjs";

export function quebrarLinhas(medir, texto, largura) {
  const saida = [];
  for (const paragrafo of String(texto ?? "").split("\n")) {
    let linha = "";
    for (const p of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? `${linha} ${p}` : p;
      if (linha && medir(tentativa) > largura) { saida.push(linha); linha = p; } else linha = tentativa;
    }
    saida.push(linha);
  }
  return saida;
}

export function usarFonte(ctx, f) { ctx.font = f.css; ctx.letterSpacing = f.espaco ?? "0px"; }
export const caixa = (f, s) => (f.caixaAlta ? String(s).toLocaleUpperCase("pt-BR") : String(s));
// Linha de base dentro da caixa de uma linha (a entrelinha divide o respiro em cima e embaixo, como no CSS).
export const linhaBase = (f) => (f.line - f.px) / 2 + f.px * 0.8;
export const entrada = (t, t0, kit, dur = kit.movimento.duracoes.entrada) => prog(t, t0, t0 + dur, ease[kit.movimento.curvas.entrada]);
// A mesma fonte noutro tamanho, mantendo a proporção da entrelinha.
export const escalar = (f, px) => ({ ...f, css: f.css.replace(/\d+(\.\d+)?px/, `${px}px`), px, line: px * (f.line / f.px) });

export function linhasDe(ctx, f, s, largura) {
  usarFonte(ctx, f);
  return quebrarLinhas((x) => ctx.measureText(x).width, caixa(f, s), largura);
}

// A ponta da caneta: brilho verde suave com um núcleo branco, tremendo de leve.
export function caneta(ctx, x, y, t, kit) {
  const r = kit.movimento.caneta.raio;
  const cx = x + noise1(t * 9, 1) * 2, cy = y + noise1(t * 9, 2) * 2;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
  g.addColorStop(0, kit.cores.verdeSuave);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 3, 0, TAU); ctx.fill();
  ctx.fillStyle = kit.cores.tinta;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, TAU); ctx.fill();
  ctx.restore();
}

// Letra a letra, a partir de t0 (kicker).
export function digitar(ctx, linhas, f, x, y, t, t0, cor, { porLetra = 0.03, alinhar = "left", largura = 0 } = {}) {
  usarFonte(ctx, f);
  ctx.fillStyle = cor; ctx.textAlign = alinhar; ctx.textBaseline = "alphabetic";
  let resta = Math.floor(clamp((t - t0) / porLetra, 0, 1e6));
  linhas.forEach((l, k) => {
    if (resta <= 0) return;
    ctx.fillText(l.slice(0, resta), alinhar === "center" ? x + largura / 2 : x, y + k * f.line + linhaBase(f));
    resta -= l.length;
  });
}

// Cada linha sobe de trás de uma máscara do tamanho da linha, uma depois da outra (títulos).
export function subir(ctx, linhas, f, x, y, t, t0, cor, kit, { atraso = 0.08, alinhar = "left", largura = 0 } = {}) {
  usarFonte(ctx, f);
  ctx.fillStyle = cor; ctx.textAlign = alinhar; ctx.textBaseline = "alphabetic";
  const xx = alinhar === "center" ? x + largura / 2 : x;
  linhas.forEach((l, k) => {
    const p = entrada(t, t0 + k * atraso, kit);
    if (p <= 0) return;
    const topo = y + k * f.line;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 40, topo, (largura || 4000) + 80, f.line); ctx.clip();
    ctx.fillText(l, xx, topo + linhaBase(f) + (1 - p) * f.line);
    ctx.restore();
  });
}

// Revela uma linha de texto da esquerda para a direita (p de 0 a 1), com a caneta na borda.
export function escrever(ctx, s, x, yBase, p, kit, t, { alinhar = "left", comCaneta = true } = {}) {
  if (p <= 0) return;
  const w = ctx.measureText(s).width;
  const x0 = alinhar === "center" ? x - w / 2 : x;
  ctx.save();
  ctx.textAlign = "left";
  if (p < 1) { ctx.beginPath(); ctx.rect(x0 - 8, yBase - 1000, w * p + 8, 1400); ctx.clip(); }
  ctx.fillText(s, x0, yBase);
  ctx.restore();
  if (comCaneta && p < 1) caneta(ctx, x0 + w * p, yBase - ctx.measureText("x").width * 0.6, t, kit);
}

// Desenha a polilinha até a fração p do comprimento, com a caneta na ponta.
export function revelarTraco(ctx, pts, p, kit, t, { cor, largura = 6, comCaneta = true } = {}) {
  if (p <= 0 || pts.length < 2) return;
  const L = polylineLengths(pts);
  const s = L[L.length - 1] * clamp(p);
  ctx.save();
  ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length && L[i] <= s; i++) ctx.lineTo(pts[i].x, pts[i].y);
  const cab = pointAtLength(pts, L, s);
  ctx.lineTo(cab.x, cab.y);
  ctx.stroke();
  ctx.restore();
  if (comCaneta && p < 1) caneta(ctx, cab.x, cab.y, t, kit);
}
```

- [ ] **Step 5: Escrever `cenas/comum.mjs`**

```js
// Limites que valem para toda Cena, qualquer que seja o tipo.

export const LIMITES_CENA = {
  duracao: { story: { min: 5, max: 60 }, reel: { min: 3, max: 60 } },   // segundos; o Instagram corta story em 60
  folga: { story: 2, reel: 1.2 },                                        // tela parada depois do último bloco entrar
  campos: { kicker: 40, titulo: 60, faixa: 40 },
};

export const tamanho = (s) => String(s ?? "").replace(/\n/g, "").length;

export function checarTamanho(campo, valor, limite, onde) {
  return tamanho(valor) > limite ? `${onde}: "${campo}" tem ${tamanho(valor)} caracteres; o máximo é ${limite}` : null;
}
```

- [ ] **Step 6: Escrever `cenas/texto.mjs`**

```js
// Cena "texto": kicker, título, linhas ou itens numerados, pergunta, ícone e dica — o formato que
// existia antes do motion (stories.json/reel.json antigos viram esta Cena). Mesmos instantes de
// entrada de antes; o que muda é como cada bloco entra.

import { checarTamanho, tamanho } from "./comum.mjs";
import { usarFonte, caixa, linhaBase, entrada, linhasDe, digitar, subir, escrever } from "../escrita.mjs";
import { springStep, TAU } from "../util.mjs";

export const usaGrade = false;
export const LIMITES_TEXTO = { campos: { linha: 90, item_titulo: 20, item_texto: 90, pergunta: 60, dica: 30 }, linhas: 6, itens: 4 };
const RITMO = { kicker: 0, titulo: 0.3, primeiro: 1.2, linha: 1.1, item: 1.6, pergunta: 1.2, dica: 0.8 };

export function validar(c, onde, { existeIcone = () => true } = {}) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  if (!c.kicker && !c.titulo) erros.push(`${onde}: precisa de "kicker" ou "titulo"`);
  if (c.linhas && c.itens) erros.push(`${onde}: use "linhas" ou "itens", não os dois`);
  for (const k of ["pergunta", "dica"]) if (c[k] != null) add(checarTamanho(k, c[k], LIMITES_TEXTO.campos[k], onde));
  const linhas = c.linhas ?? [], itens = c.itens ?? [];
  if (linhas.length > LIMITES_TEXTO.linhas) erros.push(`${onde}: ${linhas.length} linhas; o máximo é ${LIMITES_TEXTO.linhas}`);
  if (itens.length > LIMITES_TEXTO.itens) erros.push(`${onde}: ${itens.length} itens; o máximo é ${LIMITES_TEXTO.itens}`);
  linhas.forEach((l, j) => add(checarTamanho(`linhas[${j + 1}]`, l, LIMITES_TEXTO.campos.linha, onde)));
  itens.forEach((it, j) => {
    if (!it?.titulo || !it?.texto) { erros.push(`${onde}: itens[${j + 1}] precisa de "titulo" e "texto"`); return; }
    add(checarTamanho(`itens[${j + 1}].titulo`, it.titulo, LIMITES_TEXTO.campos.item_titulo, onde));
    add(checarTamanho(`itens[${j + 1}].texto`, it.texto, LIMITES_TEXTO.campos.item_texto, onde));
  });
  if (c.icone && !existeIcone(c.icone)) erros.push(`${onde}: ícone "${c.icone}" não existe em design-system/miniaturas/icones/`);
  return erros;
}

export function linhaDoTempo(c) {
  const linhas = c.linhas ?? [], itens = c.itens ?? [];
  const tempos = { kicker: RITMO.kicker, titulo: RITMO.titulo, blocos: [], pergunta: null, dica: null };
  let cursor = RITMO.primeiro;
  const passo = itens.length ? RITMO.item : RITMO.linha;
  for (let j = 0; j < (linhas.length || itens.length); j++) { tempos.blocos.push(cursor); cursor += passo; }
  let fim = tempos.blocos.length ? tempos.blocos.at(-1) : tempos.titulo;
  if (c.pergunta) { tempos.pergunta = fim + RITMO.pergunta; fim = tempos.pergunta; }
  if (c.dica) { tempos.dica = fim + RITMO.dica; fim = tempos.dica; }
  const eventos = [];
  if (c.kicker) eventos.push({ t: tempos.kicker, efeito: "digitar" });
  if (c.titulo) eventos.push({ t: tempos.titulo, efeito: "pop" });
  for (const t of tempos.blocos) eventos.push({ t, efeito: "tick" });
  if (c.pergunta) eventos.push({ t: tempos.pergunta, efeito: "caneta" });
  if (c.dica) eventos.push({ t: tempos.dica, efeito: "tick" });
  return { fim: Math.round(fim * 1000) / 1000, eventos, tempos };
}

// Cada bloco: altura (em px da grade de 1080) e como desenhar a partir do topo y, na largura w.
function blocosDe(ctx, c, kit, w) {
  const F = kit.fontes, tp = c.linha.tempos, blocos = [];
  if (c.kicker) blocos.push({ tipo: "kicker", f: F.kicker, linhas: linhasDe(ctx, F.kicker, c.kicker, w), t0: tp.kicker });
  if (c.titulo) {
    const f = tamanho(c.titulo) > 24 ? F.tituloMedio : F.titulo;
    blocos.push({ tipo: "titulo", f, linhas: linhasDe(ctx, f, c.titulo, w), t0: tp.titulo });
  }
  (c.linhas ?? []).forEach((l, j) => blocos.push({ tipo: "linha", f: F.corpo, linhas: linhasDe(ctx, F.corpo, l, w), t0: tp.blocos[j] }));
  (c.itens ?? []).forEach((it, j) => blocos.push({ tipo: "item", n: j + 1, titulo: caixa(F.itemTitulo, it.titulo), linhas: linhasDe(ctx, F.itemTexto, it.texto, w - 120), t0: tp.blocos[j] }));
  if (c.pergunta) blocos.push({ tipo: "pergunta", f: F.pergunta, linhas: linhasDe(ctx, F.pergunta, c.pergunta, w), t0: tp.pergunta });
  if (c.icone) blocos.push({ tipo: "icone", t0: tp.titulo, altura: kit.layout.icone });
  if (c.dica) blocos.push({ tipo: "dica", f: F.apoio, linhas: [c.dica], t0: tp.dica, antes: kit.layout.respiroDica });
  for (const b of blocos) {
    if (b.altura != null) continue;
    b.altura = b.tipo === "item" ? F.itemTitulo.line + b.linhas.length * F.itemTexto.line : b.tipo === "dica" ? b.f.line * 2 : b.linhas.length * b.f.line;
  }
  return blocos;
}

const DESENHOS = {
  kicker: (ctx, b, t, kit, y) => digitar(ctx, b.linhas, b.f, 0, y, t, b.t0, kit.cores.verdeSuave),
  titulo: (ctx, b, t, kit, y, w) => subir(ctx, b.linhas, b.f, 0, y, t, b.t0, kit.cores.verde, kit, { largura: w }),
  linha: (ctx, b, t, kit, y) => {
    const p = entrada(t, b.t0, kit);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    usarFonte(ctx, b.f); ctx.fillStyle = kit.cores.tinta; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    b.linhas.forEach((l, k) => ctx.fillText(l, (1 - p) * 48, y + k * b.f.line + linhaBase(b.f)));
    ctx.restore();
  },
  item: (ctx, b, t, kit, y) => {
    const F = kit.fontes, p = entrada(t, b.t0, kit);
    if (p <= 0) return;
    const m = kit.movimento.mola, s = springStep(t - b.t0, m.freq, m.amortecimento);
    ctx.save();
    usarFonte(ctx, F.itemNumero); ctx.fillStyle = kit.cores.verdeSuave; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.translate(0, y + linhaBase(F.itemTitulo)); ctx.scale(s, s); ctx.fillText(String(b.n), 0, 0);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= p;
    usarFonte(ctx, F.itemTitulo); ctx.fillStyle = kit.cores.verde; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(b.titulo, 120 + (1 - p) * 48, y + linhaBase(F.itemTitulo));
    usarFonte(ctx, F.itemTexto); ctx.fillStyle = kit.cores.tinta;
    b.linhas.forEach((l, k) => ctx.fillText(l, 120 + (1 - p) * 48, y + F.itemTitulo.line + k * F.itemTexto.line + linhaBase(F.itemTexto)));
    ctx.restore();
  },
  pergunta: (ctx, b, t, kit, y) => {
    usarFonte(ctx, b.f); ctx.fillStyle = kit.cores.tinta; ctx.textBaseline = "alphabetic";
    const porCar = kit.movimento.duracoes.escrita_por_caractere;
    let t0 = b.t0;
    b.linhas.forEach((l, k) => {
      const dur = Math.max(0.4, l.length * porCar);
      escrever(ctx, l, 0, y + k * b.f.line + linhaBase(b.f), (t - t0) / dur, kit, t);
      t0 += dur;
    });
  },
  icone: (ctx, b, t, kit, y) => {
    const img = kit.imagens.icones[b.icone];
    const m = kit.movimento.mola, s = springStep(t - b.t0, m.freq, m.amortecimento);
    if (!img || s <= 0) return;
    const tam = kit.layout.icone;
    ctx.save(); ctx.translate(tam / 2, y + tam / 2); ctx.scale(s, s); ctx.drawImage(img, -tam / 2, -tam / 2, tam, tam); ctx.restore();
  },
  dica: (ctx, b, t, kit, y, w) => {
    const p = entrada(t, b.t0, kit);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    usarFonte(ctx, b.f); ctx.fillStyle = kit.cores.tintaSuave; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(b.linhas[0], w / 2, y + linhaBase(b.f));
    const balanco = Math.sin((TAU * (t - b.t0)) / 1.6) * 6;
    ctx.fillStyle = kit.cores.verdeSuave;
    ctx.fillText("↓", w / 2, y + b.f.line + linhaBase(b.f) + balanco);
    ctx.restore();
  },
};

export function desenhar(ctx, c, t, kit) {
  const { area, alinhamento, gap } = kit.layout;
  const blocos = blocosDe(ctx, c, kit, area.w);
  for (const b of blocos) if (b.tipo === "icone") b.icone = c.icone;
  const total = blocos.reduce((s, b, i) => s + b.altura + (i ? gap : 0) + (b.antes ?? 0), 0);
  const escala = Math.min(1, area.h / total);
  const alto = total * escala;
  const y0 = alinhamento === "center" ? area.y + (area.h - alto) / 2 : alinhamento === "bottom" ? area.y + area.h - alto : area.y;
  ctx.save();
  ctx.translate(area.x, y0);
  ctx.scale(escala, escala);
  let y = 0;
  blocos.forEach((b, i) => {
    if (i) y += gap;
    y += b.antes ?? 0;
    DESENHOS[b.tipo](ctx, b, t, kit, y, area.w / escala);
    y += b.altura;
  });
  ctx.restore();
}
```

Atenção ao teste de "não cabe": o `yMax` dos textos é medido em coordenadas locais (antes da escala), e a dica desenha a seta na segunda linha da sua caixa — a conta do teste usa `ty + yMax * escala`, que fica dentro da área porque a altura total inclui as duas linhas da dica.

- [ ] **Step 7: Escrever `cenas/index.mjs`**

```js
// Registro dos tipos de Cena e a validação comum. Cada tipo é um módulo com
// usaGrade, validar, linhaDoTempo e desenhar (ver o contrato no plano/GUIA.md).

import { LIMITES_CENA, checarTamanho } from "./comum.mjs";
import * as texto from "./texto.mjs";

export const CENAS = { texto };
export const INTERNAS = {};
export const TIPOS_DE_CENA = Object.keys(CENAS);
export const moduloDe = (tipo) => CENAS[tipo] ?? INTERNAS[tipo];

export function validarCena(cena, onde, { formato = "story", existeIcone = () => true } = {}) {
  const tipo = cena?.tipo ?? "texto";
  const mod = CENAS[tipo];
  if (!mod) return { erros: [`${onde}: tipo de cena "${tipo}" não existe (${Object.keys(CENAS).join(", ")})`] };
  const erros = [];
  const duracao = Number(cena.duracao);
  const { min, max } = LIMITES_CENA.duracao[formato];
  if (!(duracao >= min && duracao <= max)) erros.push(`${onde}: "duracao" deve ser um número de ${min} a ${max} segundos`);
  for (const c of ["kicker", "titulo", "faixa"]) if (cena[c] != null) { const e = checarTamanho(c, cena[c], LIMITES_CENA.campos[c], onde); if (e) erros.push(e); }
  erros.push(...mod.validar(cena, onde, { existeIcone }));
  if (erros.length) return { erros };
  const linha = mod.linhaDoTempo(cena);
  const minimo = Math.ceil(Math.round((linha.fim + LIMITES_CENA.folga[formato]) * 10000) / 1000) / 10;   // arredonda antes do teto: 1,9 não pode virar 2,0 por ponto flutuante
  if (duracao < minimo) return { erros: [`${onde}: o último bloco entra aos ${linha.fim.toFixed(1)} s; "duracao" precisa ser de pelo menos ${minimo} s`] };
  return { erros: [], cena: { ...cena, tipo, duracao, minimo, linha } };
}
```

Observação: `TIPOS_DE_CENA` é calculado na carga; as Tasks 7–9 acrescentam módulos em `CENAS` (e a Task 10 em `INTERNAS`) editando esta mesma linha.

- [ ] **Step 8: Escrever `composicao.mjs`**

```js
// Composição: as Cenas validadas postas na linha do tempo do vídeo, com os eventos de som.
// Com Trilha, as trocas de Cena caem no compasso, sem encurtar nenhuma abaixo do seu mínimo.
// Só roda no Node (o navegador recebe a composição pronta).

import { readFileSync } from "node:fs";

const MOVIMENTO = JSON.parse(readFileSync(new URL("./movimento.json", import.meta.url), "utf8"));

export const CLASSES = {
  story: "ig ig--story ig--story-video",
  reel: "ig ig--story ig--story-video ig--sem-sticker ig--reel-cena",
  moldura: "ig ig--story ig--reel",
};

const r3 = (x) => Math.round(x * 1000) / 1000;

export function encaixarNaBatida(fronteiras, minimos, { bpm, primeira_batida }, compasso) {
  const barra = (compasso * 60) / bpm;
  const saida = [];
  let anterior = 0;
  fronteiras.forEach((f, i) => {
    let alvo = primeira_batida + Math.round((f - primeira_batida) / barra) * barra;
    if (alvo - anterior < minimos[i]) alvo = primeira_batida + Math.ceil((anterior + minimos[i] - primeira_batida) / barra) * barra;
    saida.push(r3(alvo));
    anterior = alvo;
  });
  return saida;
}

function espacar(efeitos) {
  const ordenados = [...efeitos].sort((a, b) => a.t - b.t);
  const ultimo = {};
  return ordenados.filter((e) => {
    if (ultimo[e.efeito] != null && e.t - ultimo[e.efeito] < MOVIMENTO.efeitos.intervalo_minimo) return false;
    ultimo[e.efeito] = e.t;
    return true;
  });
}

export function montarComposicao(cenas, { formato, semSticker = true, trilha = null, usuario = "" }) {
  let acumulado = 0;
  let fronteiras = cenas.map((c) => (acumulado = r3(acumulado + c.duracao)));
  if (trilha) fronteiras = encaixarNaBatida(fronteiras, cenas.map((c) => c.minimo), trilha, MOVIMENTO.trilha.compasso);
  let inicio = 0;
  const posicionadas = cenas.map((c, i) => { const p = { ...c, inicio, fim: fronteiras[i] }; inicio = fronteiras[i]; return p; });
  const ganho = formato === "story" ? MOVIMENTO.efeitos.ganho_story : MOVIMENTO.efeitos.ganho_reel;
  const efeitos = [];
  posicionadas.forEach((c, i) => {
    if (i > 0 && formato === "reel") efeitos.push({ t: c.inicio, efeito: "whoosh", ganho });
    for (const e of c.linha.eventos) if (c.inicio + e.t < c.fim) efeitos.push({ t: r3(c.inicio + e.t), efeito: e.efeito, ganho });
  });
  const classes = formato === "story" ? CLASSES.story + (semSticker ? " ig--sem-sticker" : "") : CLASSES[formato];
  return {
    formato, classes, usuario,
    duracao: fronteiras.at(-1),
    loop: formato === "reel" && !posicionadas.at(-1).faixa,
    cenas: posicionadas,
    efeitos: espacar(efeitos),
  };
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `node --test tests/motion-cenas.test.mjs tests/motion-composicao.test.mjs`
Expected: PASS (todos). Depois, `npm test` inteiro: os testes antigos ainda usam o motor antigo e continuam passando.

- [ ] **Step 10: Commit**

```bash
git add design-system/motion/escrita.mjs design-system/motion/cenas design-system/motion/composicao.mjs tests/ajudas-motion.mjs tests/motion-cenas.test.mjs tests/motion-composicao.test.mjs
git commit -m "motion: contrato das Cenas, Cena texto e composição com encaixe na batida"
```

---

### Task 5: Quadro, página do motor, servidor local, renderizador e prévia

**Files:**
- Create: `design-system/motion/quadro.mjs`, `design-system/motion/layout.mjs`, `design-system/motion/player.mjs`, `design-system/motion/pagina.html`, `design-system/scripts/navegador.mjs`, `design-system/scripts/motion/servidor.mjs`, `design-system/scripts/motion/renderizar.mjs`, `design-system/scripts/motion/ver.mjs`
- Modify: `design-system/instagram/story-video.css` (`--sv-conta-*`, `.sv__conta`), `design-system/scripts/gerar-story-video.mjs` (só trocar a definição de `acharNavegador` por reexportação), `design-system/scripts/recortar-tela.mjs:19`
- Test: `tests/motion-quadro.test.mjs`, `tests/motion-servidor.test.mjs`, `tests/motion-render.test.mjs`

**Interfaces:**
- Consumes: `moduloDe` (Task 4), `escrita.mjs` (Task 4), `util.mjs` (Task 1), `mixar` (Task 3), `carregarBiblioteca` (Task 2), composição (Task 4).
- Produces (`quadro.mjs`): `cenaNoInstante(comp, t) → { cena, indice, lt }`, `desenharGrade(ctx, kit, p)`, `desenharMarca(ctx, cena, lt, kit)`, `desenharGrao(ctx, kit, t)`, `desenharQuadro(ctx, comp, t, kit)`.
- Produces (`layout.mjs`, navegador): `medirLayout(document) → { layout, fontes, cores }` (formato do kit, Task 4).
- Produces (página): `window.__carregar(comp) → Promise<true>`, `window.__quadro(t)`; sem `?render` na URL, busca `/composicoes.json` e mostra a prévia.
- Produces (`navegador.mjs`): `acharNavegador() → string` (mesma lista de hoje), `class ErroNavegador`.
- Produces (`servidor.mjs`): `servir({ raiz, extras = {} }) → Promise<{ url, fechar }>`; `extras` mapeia caminho → `{ corpo, tipo }` ou `{ arquivo, tipo }`.
- Produces (`renderizar.mjs`): `FPS = 30`, `class ErroMotion`, `argsVideo(mp4, { fps, audio }) → string[]`, `abrirPlayer(comp) → { page, fechar }`, `renderizar(comp, { mp4, png, audio = null, capaEm = null }) → Promise<mp4>`, `fotografar(comp, instantes, prefixo) → Promise<string[]>`.
- Produces (`ver.mjs`): `verComposicoes(itens: [{ nome, comp, trilhaId? }], { biblioteca?, mixar?, abrir?, servirFn? }) → Promise<{ url, fechar }>`, `abrirNoNavegador(url)`.

- [ ] **Step 1: Escrever os testes que falham**

`tests/motion-quadro.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { cenaNoInstante, desenharQuadro } from "../design-system/motion/quadro.mjs";
import { montarComposicao } from "../design-system/motion/composicao.mjs";
import { validarCena } from "../design-system/motion/cenas/index.mjs";
import { ctxFalso, kitFalso, textos } from "./ajudas-motion.mjs";

const cena = (extra = {}) => validarCena({ duracao: 7, kicker: "K", titulo: "T", linhas: ["a"], ...extra }, "cena", { formato: "reel" }).cena;

test("cenaNoInstante acha a Cena e o tempo local; depois do fim fica na última", () => {
  const comp = montarComposicao([cena(), cena({ duracao: 5 })], { formato: "reel" });
  assert.deepEqual([cenaNoInstante(comp, 0).indice, cenaNoInstante(comp, 6.9).indice, cenaNoInstante(comp, 7).indice], [0, 0, 1]);
  assert.equal(cenaNoInstante(comp, 8).lt, 1);
  assert.equal(cenaNoInstante(comp, 99).indice, 1);
});

test("desenharQuadro: fundo, rodapé com o @ e faixa da Cena", () => {
  const comp = montarComposicao([cena({ faixa: "aula completa no canal" })], { formato: "reel", usuario: "pesquisaoperacionalparatodos" });
  const ctx = ctxFalso();
  desenharQuadro(ctx, comp, 6, kitFalso());
  const ts = textos(ctx).map((x) => x.s);
  assert.ok(ts.includes("@pesquisaoperacionalparatodos"));
  assert.ok(ts.includes("AULA COMPLETA NO CANAL"), "faixa em caixa alta");
  assert.deepEqual(ctx.chamadas.find((c) => c[0] === "fillRect").slice(1), [0, 0, 1080, 1920], "primeiro desenha o fundo inteiro");
});

test("saída da Cena e loop: alfa cai no fim de uma Cena intermediária e no fim do reel em loop", () => {
  const comp = montarComposicao([cena(), cena()], { formato: "reel" });
  assert.equal(comp.loop, true);
  // registra todo valor atribuído a globalAlpha durante o quadro
  const alfas = (t) => {
    const vistos = [];
    const ctx = new Proxy(ctxFalso(), { set(o, k, v) { if (k === "globalAlpha") vistos.push(v); o[k] = v; return true; }, get: (o, k) => o[k] });
    desenharQuadro(ctx, comp, t, kitFalso());
    return vistos;
  };
  assert.ok(alfas(6.99).some((a) => a < 0.2), "fim da Cena 1 quase apagado");
  assert.ok(alfas(13.99).some((a) => a < 0.2), "fim do reel recolhe (loop)");
  assert.ok(!alfas(3).some((a) => a > 0 && a < 0.2), "meio da Cena inteiro");
});
```

`tests/motion-servidor.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { servir } from "../design-system/scripts/motion/servidor.mjs";

test("servidor: arquivos da raiz com o tipo certo, extras, 404 e nada fora da raiz", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "srv-"));
  mkdirSync(join(raiz, "a")); writeFileSync(join(raiz, "a", "m.mjs"), "export {}"); writeFileSync(join(raiz, "a", "d.json"), "{}");
  const fora = join(raiz, "..", "segredo-" + Date.now() + ".txt"); writeFileSync(fora, "não");
  const { url, fechar } = await servir({ raiz, extras: { "/composicoes.json": { corpo: "[1]", tipo: "application/json" } } });
  try {
    let r = await fetch(`${url}/a/m.mjs`);
    assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "text/javascript");
    assert.equal((await fetch(`${url}/a/d.json`)).headers.get("content-type"), "application/json");
    r = await fetch(`${url}/composicoes.json`); assert.equal(await r.text(), "[1]");
    assert.equal((await fetch(`${url}/nao-tem.css`)).status, 404);
    assert.equal((await fetch(`${url}/..%2F${fora.split("/").pop()}`)).status, 403);
    assert.ok(url.startsWith("http://127.0.0.1:"));
  } finally { await fechar(); }
});
```

`tests/motion-render.test.mjs` (pula se não houver Chrome — os outros testes nunca abrem navegador):

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acharNavegador } from "../design-system/scripts/navegador.mjs";
import { renderizar, fotografar, argsVideo } from "../design-system/scripts/motion/renderizar.mjs";
import { montarComposicao } from "../design-system/motion/composicao.mjs";
import { validarCena } from "../design-system/motion/cenas/index.mjs";

let temChrome = true;
try { acharNavegador(); } catch { temChrome = false; }

test("argsVideo: com áudio usa o WAV; sem áudio, faixa muda", () => {
  const com = argsVideo("/t/x.mp4", { audio: "/t/m.wav" });
  assert.ok(com.includes("/t/m.wav") && !com.includes("anullsrc=channel_layout=stereo:sample_rate=44100"));
  const sem = argsVideo("/t/x.mp4", {});
  assert.ok(sem.includes("anullsrc=channel_layout=stereo:sample_rate=44100"));
  for (const par of [["-framerate", "30"], ["-c:v", "libx264"], ["-pix_fmt", "yuv420p"], ["-c:a", "aac"], ["-map", "1:a"]]) assert.ok(sem.some((a, j) => a === par[0] && sem[j + 1] === par[1]), par.join(" "));
});

const comp = (extra = {}) => montarComposicao([validarCena({ duracao: 3, kicker: "TESTE", titulo: "FUNÇÃO ÓTIMA", ...extra }, "cena", { formato: "reel" }).cena], { formato: "reel", usuario: "pesquisaoperacionalparatodos" });

test("renderizar grava MP4 e PNG de verdade (Chrome do sistema)", { skip: !temChrome && "sem Chrome" }, async () => {
  const pasta = mkdtempSync(join(tmpdir(), "render-"));
  const mp4 = join(pasta, "x.mp4"), png = join(pasta, "x.png");
  await renderizar(comp({ faixa: "AULA COMPLETA NO CANAL" }), { mp4, png });
  assert.ok(statSync(mp4).size > 10_000 && existsSync(png));
  const { default: sharp } = await import("sharp");
  const st = await sharp(png).stats();
  assert.ok(st.channels[1].max > 150, "tem verde (rodapé/título)");
  assert.ok(st.channels[0].stdev > 5, "não é uma tela lisa");
  const fotos = await fotografar(comp(), [0.5, 2.5], join(pasta, "foto"));
  assert.equal(fotos.length, 2); assert.ok(fotos.every(existsSync));
});

test("renderizar avisa quando a página do motor quebra", { skip: !temChrome && "sem Chrome" }, async () => {
  const c = comp(); c.cenas[0].tipo = "nao-existe";
  await assert.rejects(renderizar(c, { mp4: join(tmpdir(), "nunca.mp4") }), /página do motor/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/motion-quadro.test.mjs tests/motion-servidor.test.mjs tests/motion-render.test.mjs`
Expected: FAIL — módulos não existem.

- [ ] **Step 3: CSS da Cena `conta`**

Em `design-system/instagram/story-video.css`, dentro do `:root`, depois de `--sv-icone: 220px;`:

```css
  --sv-conta-size: 64px;   --sv-conta-line: 92px;   /* Cena "conta" do motion (Baloo 2, fallback de title) */
```

E no fim do arquivo:

```css
/* Cena "conta" (vídeo em motion, design-system/motion): só o motor desenha; aqui fica o tamanho, para a calibração */
.sv__conta { margin: 0; font: 700 var(--sv-conta-size)/var(--sv-conta-line) var(--font-title); color: var(--ink); }
```

- [ ] **Step 4: Escrever `quadro.mjs`**

```js
// Um quadro do vídeo: fundo do design system, grade (só nas Cenas de "conta"), o conteúdo da Cena
// com a saída/loop por fora, a marca (lockup, faixa, rodapé com o @) e o grão. Função pura de t.

import { moduloDe } from "./cenas/index.mjs";
import { ease, prog, hash, TAU } from "./util.mjs";
import { usarFonte, caixa, entrada } from "./escrita.mjs";

export function cenaNoInstante(comp, t) {
  const i = comp.cenas.findIndex((c) => t < c.fim);
  const indice = i < 0 ? comp.cenas.length - 1 : i;
  const cena = comp.cenas[indice];
  return { cena, indice, lt: t - cena.inicio };
}

export function desenharGrade(ctx, kit, p) {
  if (p <= 0) return;
  const { passo, forte_a_cada, opacidade } = kit.movimento.grade;
  const { largura: W, altura: H } = kit.layout;
  ctx.save();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, (p * Math.hypot(W, H)) / 2, 0, TAU); ctx.clip();
  ctx.strokeStyle = kit.cores.tintaSuave; ctx.lineWidth = 2;
  const linhas = (meio, max, traco) => {
    for (let k = -Math.ceil(meio / passo); meio + k * passo <= max; k++) {
      ctx.globalAlpha = opacidade * (k % forte_a_cada === 0 ? 2 : 1);
      ctx.beginPath(); traco(meio + k * passo); ctx.stroke();
    }
  };
  linhas(W / 2, W, (x) => { ctx.moveTo(x, 0); ctx.lineTo(x, H); });
  linhas(H / 2, H, (y) => { ctx.moveTo(0, y); ctx.lineTo(W, y); });
  ctx.restore();
}

export function desenharMarca(ctx, cena, lt, kit) {
  const { lockup, rodape, faixa, largura: W } = kit.layout;
  if (kit.imagens.logo) ctx.drawImage(kit.imagens.logo, lockup.x, lockup.y, lockup.tam, lockup.tam);
  ctx.fillStyle = kit.cores.verde;
  ctx.fillRect(0, rodape.y, W, rodape.h);
  usarFonte(ctx, kit.fontes.rodape);
  ctx.fillStyle = kit.cores.marinho; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`@${kit.usuario}`, W / 2, rodape.y + rodape.h / 2);
  if (cena.faixa) {
    const p = entrada(lt, kit.movimento.duracoes.faixa, kit);
    if (p > 0) {
      ctx.save(); ctx.globalAlpha *= p;
      usarFonte(ctx, kit.fontes.faixa);
      ctx.fillStyle = kit.cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(caixa(kit.fontes.faixa, cena.faixa), W / 2, faixa.y + faixa.h / 2 + (1 - p) * 24);
      ctx.restore();
    }
  }
}

export function desenharGrao(ctx, kit, t) {
  if (!kit.grao) return;
  const q = Math.round(t * 30);
  const ox = Math.floor(hash(q, 1) * 256), oy = Math.floor(hash(q, 2) * 256);
  const { largura: W, altura: H } = kit.layout;
  ctx.save();
  ctx.globalAlpha = kit.movimento.grao.opacidade; ctx.globalCompositeOperation = "overlay";
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(kit.grao, "repeat");
  ctx.fillRect(0, 0, W + ox, H + oy);
  ctx.restore();
}

export function desenharQuadro(ctx, comp, t, kit) {
  const { largura: W, altura: H } = kit.layout;
  const m = kit.movimento;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = kit.cores.fundo;
  ctx.fillRect(0, 0, W, H);
  const { cena, indice, lt } = cenaNoInstante(comp, t);
  const mod = moduloDe(cena.tipo);
  if (!mod) throw new Error(`tipo de cena "${cena.tipo}" não existe no motor`);
  const dur = cena.fim - cena.inicio;
  const ultima = indice === comp.cenas.length - 1;
  if (mod.usaGrade) desenharGrade(ctx, kit, Math.min(prog(lt, 0, m.grade.revelar, ease.outCubic), ultima ? 1 : 1 - prog(lt, dur - m.duracoes.saida, dur)));
  let alfa = 1, dy = 0, escala = 1;
  if (!ultima) {
    const s = prog(lt, dur - m.duracoes.saida, dur, ease[m.curvas.saida]);
    alfa = 1 - s; dy = -60 * s;
  } else if (comp.loop) {
    const s = prog(t, comp.duracao - m.duracoes.loop, comp.duracao, ease.inCubic);
    alfa = 1 - s; escala = 1 - 0.08 * s;
  }
  if (alfa > 0) {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(W / 2, H / 2 + dy); ctx.scale(escala, escala); ctx.translate(-W / 2, -H / 2);
    mod.desenhar(ctx, cena, lt, kit);
    ctx.restore();
  }
  desenharMarca(ctx, cena, lt, kit);
  desenharGrao(ctx, kit, t);
}
```

- [ ] **Step 5: Escrever `layout.mjs`**

```js
// Mede no navegador a geometria e as fontes do CSS do design system, a partir do molde (#molde) da
// página: é assim que a calibração (npm run calibrar, que grava o :root dos CSS) continua mandando.

const px = (v) => parseFloat(v) || 0;

function fonte(el) {
  const s = getComputedStyle(el);
  return {
    css: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`,
    px: px(s.fontSize),
    line: px(s.lineHeight) || px(s.fontSize) * 1.2,
    caixaAlta: s.textTransform === "uppercase",
    espaco: s.letterSpacing === "normal" ? "0px" : s.letterSpacing,
  };
}

export function medirLayout(doc) {
  const molde = doc.getElementById("molde");
  const q = (sel) => molde.querySelector(sel);
  const base = molde.getBoundingClientRect();
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
  const conteudo = q(".ig__conteudo"), cs = getComputedStyle(conteudo);
  const lockup = caixa(q(".ig__lockup")), rodape = caixa(q(".ig__rodape")), faixa = caixa(q(".ig__faixa"));
  const raiz = getComputedStyle(doc.documentElement);
  const videoAltura = px(raiz.getPropertyValue("--rm-video-altura")) || 608;
  const cor = (sel) => getComputedStyle(q(sel)).color;
  const j = cs.justifyContent;
  return {
    layout: {
      largura: base.width, altura: base.height,
      area: caixa(conteudo),
      alinhamento: j === "center" ? "center" : j === "flex-end" ? "bottom" : "top",
      lockup: { x: lockup.x, y: lockup.y, tam: lockup.w },
      rodape: { y: rodape.y, h: rodape.h },
      faixa: { y: faixa.y, h: faixa.h },
      gap: px(cs.rowGap),
      respiroDica: px(getComputedStyle(q(".sv__dica")).marginTop),
      icone: caixa(q(".ig__icone")).w,
      video: { y: (base.height - videoAltura) / 2, h: videoAltura },
    },
    fontes: {
      kicker: fonte(q(".ig__kicker")),
      titulo: fonte(q(".ig__titulo:not(.ig__titulo--medio):not(.ig__titulo--pequeno)")),
      tituloMedio: fonte(q(".ig__titulo--medio")),
      tituloPequeno: fonte(q(".ig__titulo--pequeno")),
      corpo: fonte(q(".ig__corpo")), apoio: fonte(q(".ig__apoio")), pergunta: fonte(q(".sv__pergunta")),
      itemNumero: fonte(q(".sv__item-numero")), itemTitulo: fonte(q(".sv__item-titulo")), itemTexto: fonte(q(".sv__item-texto")),
      numero: fonte(q(".ig__numero")), conta: fonte(q(".sv__conta")),
      faixa: fonte(q(".ig__faixa")), rodape: fonte(q(".ig__rodape")),
    },
    cores: {
      fundo: getComputedStyle(molde).backgroundColor,
      tinta: cor(".ig__corpo"), tintaSuave: cor(".ig__apoio"),
      verde: cor(".ig__titulo"), verdeSuave: cor(".ig__kicker"),
      marinho: getComputedStyle(q(".ig__rodape")).color,
      vermelho: raiz.getPropertyValue("--accent-red").trim(),
    },
  };
}
```

- [ ] **Step 6: Escrever `pagina.html`**

```html
<!doctype html>
<html lang="pt-BR" data-theme="youtube">
<head>
<meta charset="utf-8">
<title>Motion — PO para Todos</title>
<link rel="stylesheet" href="../tokens.css">
<link rel="stylesheet" href="../assets/fontes/fontes.css">
<link rel="stylesheet" href="../instagram/instagram.css">
<link rel="stylesheet" href="../instagram/story-video.css">
<link rel="stylesheet" href="../instagram/reel.css">
<style>
  html, body { margin: 0; background: #111; }
  #molde { position: absolute; left: -20000px; top: 0; }
  #quadro { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
  body.previa { display: flex; flex-direction: column; align-items: center; min-height: 100vh; color: #eee; font: 600 15px Poppins, sans-serif; }
  body.previa #quadro { position: static; height: calc(100vh - 72px); width: auto; aspect-ratio: 9 / 16; }
  #controles { display: none; }
  body.previa #controles { display: flex; gap: 12px; align-items: center; width: min(92vw, 720px); padding: 16px 0; }
  #controles input[type=range] { flex: 1; }
  #controles button, #controles select { font: inherit; padding: 4px 12px; }
</style>
</head>
<body>
<!-- Molde fora da tela: a mesma marcação do story em HTML. Só serve para medir geometria, fontes
     e cores do CSS (layout.mjs); quem desenha o vídeo é o canvas. -->
<main id="molde" class="ig ig--story ig--story-video" aria-hidden="true">
  <img class="ig__lockup" src="../assets/Marca/logo-po-fundo-escuro.png" alt="">
  <div class="ig__conteudo">
    <p class="ig__kicker">K</p>
    <h1 class="ig__titulo">T</h1><h1 class="ig__titulo ig__titulo--medio">T</h1><h1 class="ig__titulo ig__titulo--pequeno">T</h1>
    <p class="ig__corpo">C</p><p class="ig__apoio">A</p><p class="sv__pergunta">P</p>
    <p class="ig__numero">0</p><p class="sv__conta">0</p>
    <ol class="sv__itens"><li class="sv__item"><span class="sv__item-numero">1</span><h2 class="sv__item-titulo">I</h2><p class="sv__item-texto">X</p></li></ol>
    <div class="ig__icone"></div>
    <p class="sv__dica">D</p>
  </div>
  <p class="ig__faixa">F</p>
  <p class="ig__rodape"><span>@</span></p>
</main>
<canvas id="quadro" width="1080" height="1920"></canvas>
<div id="controles">
  <select id="qual" aria-label="Vídeo"></select>
  <button id="tocar" type="button">▶ Tocar</button>
  <input id="tempo" type="range" min="0" max="1" step="0.001" value="0" aria-label="Tempo">
  <span id="relogio">0,0 s</span>
</div>
<script type="module" src="./player.mjs"></script>
</body>
</html>
```

- [ ] **Step 7: Escrever `player.mjs`**

```js
// Página do motor: carrega uma composição, mede o CSS, prepara imagens e grão, e expõe
// window.__carregar(comp) e window.__quadro(t) para quem grava. Sem ?render na URL, vira a prévia:
// lista os vídeos de /composicoes.json, toca com o som e deixa arrastar a linha do tempo.

import { desenharQuadro } from "./quadro.mjs";
import { medirLayout } from "./layout.mjs";
import { mulberry32 } from "./util.mjs";

const canvas = document.getElementById("quadro");
const ctx = canvas.getContext("2d");
let comp = null, kit = null, movimento = null;

const carregarImagem = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

function texturaGrao() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d"), img = g.createImageData(256, 256), r = mulberry32(7);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}

window.__carregar = async (c) => {
  comp = c;
  movimento ??= await (await fetch("./movimento.json")).json();
  document.getElementById("molde").className = c.classes;
  await document.fonts.ready;
  await Promise.all(["800 32px Poppins", "600 32px Poppins", '400 32px "Archivo Black"', '700 32px "Baloo 2"', "400 32px Nunito"].map((f) => document.fonts.load(f)));
  const icones = {};
  for (const nome of new Set(c.cenas.map((x) => x.icone).filter(Boolean))) icones[nome] = await carregarImagem(`../miniaturas/icones/${nome}.svg`);
  kit = { ...medirLayout(document), movimento, usuario: c.usuario, imagens: { logo: await carregarImagem("../assets/Marca/logo-po-fundo-escuro.png"), icones }, grao: texturaGrao() };
  desenharQuadro(ctx, comp, 0, kit);
  return true;
};

window.__quadro = (t) => desenharQuadro(ctx, comp, t, kit);

async function iniciarPrevia() {
  const r = await fetch("/composicoes.json");
  if (!r.ok) return;
  const itens = await r.json();
  document.body.classList.add("previa");
  const $ = (id) => document.getElementById(id);
  const qual = $("qual"), botao = $("tocar"), tempo = $("tempo"), relogio = $("relogio");
  const audio = new Audio();
  let atual = 0, tocando = false, t = 0, inicioRelogio = 0;
  itens.forEach((it, i) => qual.add(new Option(it.nome, String(i))));
  const mostrar = () => { window.__quadro(t); tempo.value = String(t); relogio.textContent = `${t.toFixed(1).replace(".", ",")} s`; };
  const parar = () => { tocando = false; audio.pause(); botao.textContent = "▶ Tocar"; };
  async function escolher(i) {
    parar(); atual = i; t = 0;
    await window.__carregar(itens[i].comp);
    tempo.max = String(itens[i].comp.duracao);
    audio.src = itens[i].audio ?? "";
    mostrar();
  }
  function laco() {
    if (!tocando) return;
    t = itens[atual].audio ? audio.currentTime : (performance.now() - inicioRelogio) / 1000;
    if (t >= itens[atual].comp.duracao) { t = itens[atual].comp.duracao; mostrar(); parar(); return; }
    mostrar();
    requestAnimationFrame(laco);
  }
  botao.onclick = () => {
    if (tocando) { parar(); return; }
    if (t >= itens[atual].comp.duracao - 0.05) t = 0;
    tocando = true; botao.textContent = "❚❚ Pausar";
    inicioRelogio = performance.now() - t * 1000;
    if (itens[atual].audio) { audio.currentTime = t; audio.play(); }
    requestAnimationFrame(laco);
  };
  tempo.oninput = () => { t = Number(tempo.value); if (tocando) { inicioRelogio = performance.now() - t * 1000; audio.currentTime = t; } mostrar(); };
  qual.onchange = () => escolher(Number(qual.value));
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); botao.click(); }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { t = Math.max(0, Math.min(itens[atual].comp.duracao, t + (e.key === "ArrowRight" ? 1 : -1) / 30)); mostrar(); }
  });
  await escolher(0);
}

if (!new URLSearchParams(location.search).has("render")) iniciarPrevia();
```

- [ ] **Step 8: Escrever `navegador.mjs` e reexportar**

`design-system/scripts/navegador.mjs` — mova para cá a função `acharNavegador` de `gerar-story-video.mjs` (mesmo corpo, mesma lista de candidatos), lançando `ErroNavegador`:

```js
// Acha o Chrome/Chromium/Edge do sistema (mesma lista do exportar.sh). Usado por quem grava vídeo e recorta tela.
import { accessSync, constants } from "node:fs";
import { execSync } from "node:child_process";

export class ErroNavegador extends Error {}

export function acharNavegador() {
  const home = process.env.HOME ?? "";
  const candidatos = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ...["google-chrome", "chromium", "microsoft-edge"].map((n) => { try { return execSync(`command -v ${n}`, { stdio: "pipe" }).toString().trim(); } catch { return ""; } }),
  ];
  for (const c of candidatos) {
    if (!c) continue;
    try { accessSync(c, constants.X_OK); return c; } catch { /* próximo */ }
  }
  throw new ErroNavegador("nenhum Chrome/Chromium/Edge encontrado; defina CHROME=/caminho/do/navegador");
}
```

Em `gerar-story-video.mjs`, apague a função `acharNavegador` e ponha perto dos imports: `export { acharNavegador } from "./navegador.mjs";` (e importe-a também se o arquivo ainda a usar). Em `recortar-tela.mjs:19`, troque o import para `import { acharNavegador } from "./navegador.mjs";`.

- [ ] **Step 9: Escrever `servidor.mjs`**

```js
// Servidor HTTP local, só leitura e só em 127.0.0.1, para a página do motor carregar módulos ES,
// fontes e imagens (o Chrome não carrega módulos de file://). Porta livre escolhida pelo sistema.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname, sep } from "node:path";

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
};

export function servir({ raiz, extras = {} }) {
  const base = normalize(raiz);
  const srv = createServer(async (req, res) => {
    try {
      if (req.method !== "GET") { res.writeHead(405).end(); return; }
      const caminho = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const extra = extras[caminho];
      if (extra) {
        const corpo = extra.arquivo ? await readFile(extra.arquivo) : extra.corpo;
        res.writeHead(200, { "content-type": extra.tipo, "cache-control": "no-store" }).end(corpo);
        return;
      }
      const arquivo = normalize(join(base, caminho));
      if (arquivo !== base && !arquivo.startsWith(base + sep)) { res.writeHead(403).end(); return; }
      const corpo = await readFile(arquivo);
      res.writeHead(200, { "content-type": TIPOS[extname(arquivo)] ?? "application/octet-stream", "cache-control": "no-store" }).end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({
    url: `http://127.0.0.1:${srv.address().port}`,
    fechar: () => new Promise((f) => { srv.closeAllConnections?.(); srv.close(() => f()); }),
  })));
}
```

- [ ] **Step 10: Escrever `renderizar.mjs`**

```js
// Grava uma composição em MP4 (1080×1920, 30 fps, H.264 + AAC): abre a página do motor no Chrome do
// sistema, pede quadro a quadro (window.__quadro) e manda as capturas ao ffmpeg junto com o som mixado
// (ou uma faixa muda — a Meta recusa MP4 sem áudio). A capa (.png) é o quadro em capaEm, ou o último.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { servir } from "./servidor.mjs";
import { acharNavegador } from "../navegador.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const FPS = 30;
export class ErroMotion extends Error {}

export function argsVideo(mp4, { fps = FPS, audio = null } = {}) {
  return [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    ...(audio ? ["-i", audio] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]),
    "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", audio ? "192k" : "96k", "-movflags", "+faststart",
    mp4,
  ];
}

export async function abrirPlayer(comp) {
  const { default: puppeteer } = await import("puppeteer-core");
  const srv = await servir({ raiz: RAIZ });
  const browser = await puppeteer.launch({ executablePath: acharNavegador(), headless: true, args: ["--hide-scrollbars"] });
  const fechar = async () => { await browser.close(); await srv.fechar(); };
  try {
    const page = await browser.newPage();
    const erros = [];
    page.on("pageerror", (e) => erros.push(e.message));
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`${srv.url}/design-system/motion/pagina.html?render`, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.__carregar === "function", { timeout: 10_000 }).catch(() => {});
    if (erros.length) throw new ErroMotion(`a página do motor falhou ao abrir: ${erros.join("; ")}`);
    await page.evaluate((c) => window.__carregar(c), comp);
    return { page, fechar };
  } catch (e) {
    await fechar();
    throw e instanceof ErroMotion ? e : new ErroMotion(`a página do motor falhou: ${e.message}`);
  }
}

async function quadro(page, t) {
  try {
    await page.evaluate((x) => window.__quadro(x), t);
  } catch (e) {
    throw new ErroMotion(`a página do motor falhou no instante ${t.toFixed(2)} s: ${e.message}`);
  }
  return page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}

export async function renderizar(comp, { mp4, png = null, audio = null, capaEm = null }) {
  const { default: ffmpeg } = await import("ffmpeg-static");
  const { page, fechar } = await abrirPlayer(comp);
  try {
    const ff = spawn(ffmpeg, argsVideo(mp4, { audio }), { stdio: ["pipe", "inherit", "inherit"] });
    const terminou = new Promise((ok, falha) => { ff.on("error", falha); ff.on("close", (c) => (c === 0 ? ok() : falha(new ErroMotion(`ffmpeg terminou com código ${c}`)))); });
    const total = Math.round(comp.duracao * FPS);
    const iCapa = capaEm == null ? total - 1 : Math.min(total - 1, Math.round(capaEm * FPS));
    let capa;
    try {
      for (let i = 0; i < total; i++) {
        const img = await quadro(page, i / FPS);
        if (i === iCapa) capa = img;
        if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once("drain", r));
      }
    } finally {
      ff.stdin.end();
    }
    await terminou;
    if (png && capa) writeFileSync(png, capa);
    return mp4;
  } finally {
    await fechar();
  }
}

// Quadros soltos para conferir sem gravar o vídeo: <prefixo>-<t>s.png.
export async function fotografar(comp, instantes, prefixo) {
  const { page, fechar } = await abrirPlayer(comp);
  try {
    const saidas = [];
    for (const t of instantes) {
      const arq = `${prefixo}-${String(t).replace(".", ",")}s.png`;
      writeFileSync(arq, await quadro(page, t));
      saidas.push(arq);
    }
    return saidas;
  } finally {
    await fechar();
  }
}
```

Observação: se a página falhar dentro do laço, o `finally` fecha o stdin do ffmpeg; o `await terminou` não é alcançado, e o erro que sobe é o `ErroMotion` da página (o teste da página quebrada depende disso).

- [ ] **Step 11: Escrever `ver.mjs`**

```js
// Prévia no navegador: mixa o som de cada composição, serve a página do motor com /composicoes.json
// e abre o navegador padrão. Fica no ar até Ctrl+C.

import { mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { servir } from "./servidor.mjs";
import { mixar as mixarAudio } from "./mixagem.mjs";
import { carregarBiblioteca } from "../../../scripts/audio.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export function abrirNoNavegador(url) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
}

export async function verComposicoes(itens, { biblioteca = carregarBiblioteca(), mixar = mixarAudio, abrir = abrirNoNavegador, servirFn = servir } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "ver-"));
  const extras = {}, lista = [];
  for (const [i, it] of itens.entries()) {
    const audio = await mixar(it.comp, { biblioteca, trilhaId: it.trilhaId ?? null, saida: join(tmp, `audio-${i}.wav`) });
    if (audio) extras[`/audio-${i}.wav`] = { arquivo: audio, tipo: "audio/wav" };
    lista.push({ nome: it.nome, comp: it.comp, audio: audio ? `/audio-${i}.wav` : null });
  }
  extras["/composicoes.json"] = { corpo: JSON.stringify(lista), tipo: "application/json" };
  const srv = await servirFn({ raiz: RAIZ, extras });
  const url = `${srv.url}/design-system/motion/pagina.html`;
  abrir(url);
  return { url, fechar: async () => { await srv.fechar(); rmSync(tmp, { recursive: true, force: true }); } };
}
```

- [ ] **Step 12: Rodar e ver passar**

Run: `node --test tests/motion-quadro.test.mjs tests/motion-servidor.test.mjs tests/motion-render.test.mjs`
Expected: PASS. Os testes de render rodam se houver Chrome (no Mac do projeto, há) e levam alguns segundos.

Run: `npm test`
Expected: PASS — `recortar-tela` e os testes antigos continuam passando com `acharNavegador` vindo de `navegador.mjs`.

- [ ] **Step 13: Conferir à vista**

Rode no terminal (o caminho do PNG sai no fim):

```bash
node -e '
import("./design-system/scripts/motion/renderizar.mjs").then(async ({ fotografar }) => {
  const { montarComposicao } = await import("./design-system/motion/composicao.mjs");
  const { validarCena } = await import("./design-system/motion/cenas/index.mjs");
  const c = validarCena({ duracao: 8, kicker: "UM DESAFIO", titulo: "FUNÇÃO ÓTIMA DA PADARIA", linhas: ["Pão: 1 h de forno", "Bolo: 2 h de forno"], pergunta: "O que rende mais?", dica: "Sabe a resposta?", faixa: "AULA COMPLETA NO CANAL" }, "cena", { formato: "reel" }).cena;
  console.log(await fotografar(montarComposicao([c], { formato: "reel", usuario: "pesquisaoperacionalparatodos" }), [0.4, 1.5, 7.5], "/tmp/motion-texto"));
});'
```

Abra os três PNGs (Read tool ou `open`). Esperado: fundo grafite, lockup em cima à esquerda, rodapé verde com o @, kicker verde-claro sendo digitado (0,4 s), título verde subindo (1,5 s), tudo no lugar e a faixa (7,5 s). Compare com `instagram/2026-10-19-pontes-de-konigsberg/reel.png` (versão antiga): mesma grade e mesmas zonas.

- [ ] **Step 14: Commit**

```bash
git add design-system/motion design-system/scripts/navegador.mjs design-system/scripts/motion design-system/instagram/story-video.css design-system/scripts/gerar-story-video.mjs design-system/scripts/recortar-tela.mjs tests/motion-quadro.test.mjs tests/motion-servidor.test.mjs tests/motion-render.test.mjs
git commit -m "motion: página do motor em canvas, servidor local, renderizador e prévia"
```

---

### Task 6: Geradores no motor novo (stories, story de aviso, reel de Cenas com Trilha)

**Files:**
- Modify: `design-system/scripts/gerar-story-video.mjs` (reescrever, mantendo `htmlDaCena`/`conteudoHtml`), `design-system/scripts/gerar-story-aviso.mjs`, `design-system/scripts/gerar-reel.mjs` (parte "cenas"; o Corte muda na Task 10)
- Test: `tests/story-video.test.mjs`, `tests/story-aviso.test.mjs`, `tests/reel.test.mjs`

**Interfaces:**
- Consumes: `validarCena`, `LIMITES_CENA`, `LIMITES_TEXTO` (Task 4), `montarComposicao` (Task 4), `renderizar` (Task 5), `mixar` (Task 3), `verComposicoes` (Task 5), `carregarBiblioteca` (Task 2).
- Produces (`gerar-story-video.mjs`): `ErroStoryVideo`, `LIMITES` (mesmas chaves de hoje), `PUBLICACOES`, `USUARIO`, `validarCenas(lista, { formato = "story", rotulo = "story" }) → cenas` (lança `ErroStoryVideo` com o primeiro erro; Cenas `texto` ganham `linhas`, `itens`, `tempos` como antes), `validar(spec) → cenas`, `composicoesDeStories(spec) → comp[]`, `gravarComposicao(comp, { pasta, base, trilhaId = null, capaEm = null, renderizar?, mixar?, biblioteca? }) → mp4`, `gerarStoryVideo(pasta, { so, ver, ...injeções })`, `htmlDaCena` (inalterado), reexporta `acharNavegador`.
- Produces (`gerar-story-aviso.mjs`): `composicaoDoAviso(cards) → comp`; `gerarStoryAviso(pasta, { ver, ...injeções })`.
- Produces (`gerar-reel.mjs`): `validarReel(dados, { biblioteca }) → string[]` (aceita `"trilha": "<id>"` opcional), `composicaoDoReel(dados, { biblioteca }) → comp`, `gerarReel(pasta, { ver, renderizar, mixar, biblioteca, executar, raizVideos, ytDlp, exportar })`. Sai `argsConcat` e a opção `soHtml`.

- [ ] **Step 1: Reescrever os testes (devem falhar)**

Em `tests/story-video.test.mjs`:
- troque o import por `import { validar, htmlDaCena, ErroStoryVideo, LIMITES, PUBLICACOES, composicoesDeStories, gerarStoryVideo } from "../design-system/scripts/gerar-story-video.mjs";` e acrescente `writeFileSync` ao import de `node:fs`;
- apague os testes `"argsFfmpeg acrescenta uma faixa de áudio muda…"` (coberto por `argsVideo` na Task 5) e `"renderizarCenas --so-html…"`;
- mantenha todos os outros (linha do tempo, recusas, `htmlDaCena`, publicação, modelo de quiz, como-funciona-po) sem mudar uma linha;
- acrescente:

```js
const bibVazia = { licencas_aceitas: [], trilhas: [], efeitos: [] };

test("composicoesDeStories: um vídeo por story, sem sticker quando sai pela API, efeitos discretos e nunca Trilha", () => {
  const comps = composicoesDeStories({ ...spec(story(), story({ kicker: "DOIS" })), publicacao: "api" });
  assert.equal(comps.length, 2);
  assert.ok(comps.every((c) => c.classes.includes("ig--sem-sticker") && c.formato === "story" && c.loop === false));
  assert.ok(comps[0].efeitos.length > 0 && comps[0].efeitos.every((e) => e.ganho === 0.4));
  assert.equal(composicoesDeStories(spec(story()))[0].classes, "ig ig--story ig--story-video", "manual (com sticker) reserva a zona");
  assert.equal(comps[0].usuario, "pesquisaoperacionalparatodos");
});

test("gerarStoryVideo grava story-NN.mp4/.png com o som mixado, sem Trilha, e respeita --so", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "stories-"));
  writeFileSync(join(pasta, "stories.json"), JSON.stringify({ ...spec(story(), story({ kicker: "DOIS" })), publicacao: "api" }));
  const gravados = [], mixagens = [];
  const renderizar = async (comp, o) => { gravados.push({ comp, ...o }); writeFileSync(o.mp4, "v"); return o.mp4; };
  const mixar = async (comp, o) => { mixagens.push(o); return o.saida; };
  const saidas = await gerarStoryVideo(pasta, { renderizar, mixar, biblioteca: bibVazia });
  assert.deepEqual(saidas.map((s) => s.slice(pasta.length + 1)), ["story-01.mp4", "story-02.mp4"]);
  assert.ok(gravados[0].png.endsWith("story-01.png") && gravados[0].audio.endsWith("mix.wav") && gravados[0].capaEm === null);
  assert.ok(mixagens.every((m) => m.trilhaId === null));
  assert.equal(gravados[1].comp.cenas[0].kicker, "DOIS");
  const so2 = await gerarStoryVideo(pasta, { so: 2, renderizar, mixar, biblioteca: bibVazia });
  assert.deepEqual(so2.map((s) => s.slice(pasta.length + 1)), ["story-02.mp4"]);
});
```

Em `tests/story-aviso.test.mjs`, troque o último teste (`"gerarStoryAviso --so-html…"`) por:

```js
test("gerarStoryAviso grava story-aviso.mp4 sem sticker com o título do post", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "aviso-"));
  copyFileSync(join(exemplo, "cards.json"), join(pasta, "cards.json"));
  const vistos = [];
  const saida = await gerarStoryAviso(pasta, { renderizar: async (comp, o) => { vistos.push({ comp, o }); return o.mp4; }, mixar: async () => null, biblioteca: { licencas_aceitas: [], trilhas: [], efeitos: [] } });
  assert.ok(saida.endsWith("story-aviso.mp4"));
  const [{ comp, o }] = vistos;
  assert.ok(comp.classes.includes("ig--sem-sticker"));
  assert.equal(comp.cenas[0].kicker, "POST NOVO: RESUMO DE ARTIGO");
  assert.equal(comp.cenas[0].faixa, "VEJA NO FEED");
  assert.equal(o.audio, null);
  writeFileSync(join(pasta, "cards.json"), "{}");
  await assert.rejects(gerarStoryAviso(pasta, { renderizar: async () => {}, mixar: async () => null }), ErroStoryAviso);
});
```

(remova `readFileSync` do import de `node:fs` em `story-aviso.test.mjs` se não for mais usado — ele ainda é usado para `kruskal`, então fica.)

Em `tests/reel.test.mjs`:
- troque o import por `import { validarReel, gerarReel, ErroReel, DURACAO_REEL, TIPOS_DE_REEL, argsYtDlp, argsMoldura, htmlDaMoldura, acharYtDlp } from "../design-system/scripts/gerar-reel.mjs";`;
- apague o teste `"argsConcat usa o demuxer concat sem recodificar"`;
- no primeiro teste, acrescente ao fim: `assert.ok(validarReel({ tipo: "cenas", trilha: "x", cenas: [cena(), cena()], legenda }, { biblioteca: { trilhas: [] } }).some((e) => e.includes('trilha "x"')));`
- troque o teste `"gerarReel (cenas): renderiza cada cena…"` por:

```js
const bibLeve = { licencas_aceitas: [], trilhas: [{ id: "leve", arquivo: "trilhas/leve.mp3", bpm: 120, primeira_batida: 0.5 }], efeitos: [] };

test("gerarReel (cenas): uma composição contínua, Trilha encaixada no compasso, capa no fim da 1ª Cena", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", trilha: "leve", cenas: [cena(), cena({ kicker: "DOIS" })], legenda }));
  const visto = {};
  const mixar = async (comp, o) => { visto.mix = o; return o.saida; };
  const renderizar = async (comp, o) => { visto.comp = comp; visto.o = o; writeFileSync(o.mp4, "v"); return o.mp4; };
  const saida = await gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.equal(visto.mix.trilhaId, "leve");
  assert.deepEqual(visto.comp.cenas.map((c) => c.fim), [10.5, 20.5], "compasso de 2 s a partir de 0,5 s");
  assert.ok(visto.comp.classes.includes("ig--reel-cena") && visto.comp.formato === "reel");
  assert.ok(Math.abs(visto.o.capaEm - (10.5 - 0.35 - 0.1)) < 1e-9);
  assert.ok(visto.o.png.endsWith("reel.png") && visto.o.audio.endsWith("mix.wav"));

  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", trilha: "nao-tem", cenas: [cena(), cena()], legenda }));
  await assert.rejects(gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve }), /trilha "nao-tem"/);

  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", trilha: "leve", cenas: Array(9).fill(cena()), legenda }));
  await assert.rejects(gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve }), /90 s/, "90 s viram 90,5 no compasso: recusa");

  writeFileSync(join(pasta, "reel.json"), "{}");
  await assert.rejects(gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve }), ErroReel);
});
```

- no teste `"gerarReel (corte)…"`, troque a última linha por `await assert.rejects(gerarReel(pasta, { ver: true, executar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /--ver/);`

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/story-video.test.mjs tests/story-aviso.test.mjs tests/reel.test.mjs`
Expected: FAIL — `composicoesDeStories`/`gravarComposicao` não existem; `gerarReel` ainda concatena.

- [ ] **Step 3: Reescrever `gerar-story-video.mjs`**

Arquivo inteiro (o bloco `htmlDaCena`/`conteudoHtml`/`anim`/`quebras` é copiado sem mudança do arquivo atual):

```js
#!/usr/bin/env node
// Gera os vídeos de uma sequência de stories (1080×1920, MP4 H.264 com som) a partir de
// instagram/<pasta>/stories.json: um vídeo por story, cada um uma Cena do motor de motion
// (design-system/motion: texto, impacto, odometro, grafo, conta, grafico, tabela — ver motion/GUIA.md).
// Story leva só Efeitos sonoros discretos, nunca Trilha (ADR-0012). O sticker (quiz, enquete, link) não
// sai daqui: a pessoa adiciona no app, no espaço livre acima do rodapé — o roteiro de qual sticker vai em
// cada story fica em stories.md, na mesma pasta.
//
// stories.json pode ter "publicacao": "api" (sem sticker: sai pela API,
// node scripts/instagram.mjs --publicar-stories) ou "manual" (padrão: com sticker, pelo app).
//
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta>          # story-NN.mp4 + story-NN.png (último quadro)
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --ver    # prévia no navegador, com som (Ctrl+C fecha)
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --so 2   # só o story 2
//
// htmlDaCena continua aqui: é o molde em HTML que a calibração (npm run calibrar) mostra. O motor mede
// o mesmo CSS, então calibrar o molde calibra o vídeo.

import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher, esc } from "./modelo-html.mjs";
import { validarCena } from "../motion/cenas/index.mjs";
import { LIMITES_CENA, tamanho } from "../motion/cenas/comum.mjs";
import { LIMITES_TEXTO } from "../motion/cenas/texto.mjs";
import { montarComposicao } from "../motion/composicao.mjs";
import { renderizar as renderizarMotion, FPS } from "./motion/renderizar.mjs";
import { mixar as mixarAudio } from "./motion/mixagem.mjs";
import { verComposicoes } from "./motion/ver.mjs";
import { carregarBiblioteca } from "../../scripts/audio.mjs";
export { acharNavegador } from "./navegador.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));

export class ErroStoryVideo extends Error {}
export const USUARIO = canal.instagramUsuario;

export const LIMITES = {
  stories: { min: 1, max: 10 },
  duracao: LIMITES_CENA.duracao.story,
  fps: FPS,
  campos: { ...LIMITES_CENA.campos, ...LIMITES_TEXTO.campos },
  linhas: LIMITES_TEXTO.linhas,
  itens: LIMITES_TEXTO.itens,
  folga: LIMITES_CENA.folga.story,
};

export const PUBLICACOES = ["api", "manual"];   // api: sem sticker, sai pela API; manual: com sticker, pelo app (ADR-0007)

const existeIcone = (nome) => existsSync(join(DS, "miniaturas/icones", `${nome}.svg`));

// Valida uma lista de Cenas (stories ou Cenas de reel) e lança o primeiro erro.
export function validarCenas(lista, { formato = "story", rotulo = "story" } = {}) {
  return lista.map((s, i) => {
    const { erros, cena } = validarCena(s, `${rotulo} ${i + 1}`, { formato, existeIcone });
    if (erros.length) throw new ErroStoryVideo(erros[0]);
    return cena.tipo === "texto" ? { ...cena, linhas: cena.linhas ?? [], itens: cena.itens ?? [], tempos: cena.linha.tempos } : cena;
  });
}

export function validar(spec) {
  if (spec?.tipo !== "stories" || !Array.isArray(spec.stories)) throw new ErroStoryVideo('stories.json precisa de "tipo": "stories" e uma lista "stories"');
  if (spec.publicacao != null && !PUBLICACOES.includes(spec.publicacao)) throw new ErroStoryVideo(`"publicacao" deve ser "api" (sem sticker, sai pela API) ou "manual" (com sticker, pelo app)`);
  const { min, max } = LIMITES.stories;
  if (spec.stories.length < min || spec.stories.length > max) throw new ErroStoryVideo(`a sequência tem ${spec.stories.length} stories; o permitido é de ${min} a ${max}`);
  return validarCenas(spec.stories);
}

export function composicoesDeStories(spec) {
  const semSticker = spec.publicacao === "api";
  return validar(spec).map((c) => montarComposicao([c], { formato: "story", semSticker, usuario: USUARIO }));
}

// Grava uma composição em <pasta>/<base>.mp4 (+ .png) com o som mixado; a mixagem temporária some no fim.
export async function gravarComposicao(comp, { pasta, base, trilhaId = null, capaEm = null, renderizar = renderizarMotion, mixar = mixarAudio, biblioteca = carregarBiblioteca() }) {
  const tmp = mkdtempSync(join(tmpdir(), "mix-"));
  try {
    const audio = await mixar(comp, { biblioteca, trilhaId, saida: join(tmp, "mix.wav") });
    const mp4 = join(pasta, `${base}.mp4`);
    await renderizar(comp, { mp4, png: join(pasta, `${base}.png`), audio, capaEm });
    return mp4;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function gerarStoryVideo(pasta, { so = null, ver = false, ...injecoes } = {}) {
  const arquivo = join(pasta, "stories.json");
  if (!existsSync(arquivo)) throw new ErroStoryVideo(`não achei ${arquivo}`);
  const comps = composicoesDeStories(JSON.parse(readFileSync(arquivo, "utf8")));
  if (ver) return verComposicoes(comps.map((comp, i) => ({ nome: `story ${i + 1}`, comp })), injecoes);
  const saidas = [];
  for (const [i, comp] of comps.entries()) {
    if (so && so !== i + 1) continue;
    saidas.push(await gravarComposicao(comp, { pasta, base: `story-${String(i + 1).padStart(2, "0")}`, ...injecoes }));
  }
  return saidas;
}

// ---------- molde em HTML (calibração) ----------

const quebras = (s) => esc(s).replace(/\n/g, "<br>");

function conteudoHtml(s) {
  const { tempos: t } = s;
  const partes = [];
  if (s.kicker) partes.push(`    <p class="ig__kicker sv__anim" style="--t: ${t.kicker}s">${esc(s.kicker)}</p>`);
  if (s.titulo) partes.push(`    <h1 class="ig__titulo${tamanho(s.titulo) > 24 ? " ig__titulo--medio" : ""} sv__anim" style="--t: ${t.titulo}s">${quebras(s.titulo)}</h1>`);
  if (s.linhas.length) s.linhas.forEach((l, j) => partes.push(`    <p class="ig__corpo sv__anim" style="--t: ${t.blocos[j]}s">${quebras(l)}</p>`));
  if (s.itens.length) {
    partes.push(`    <ol class="sv__itens">`);
    s.itens.forEach((it, j) => partes.push(`      <li class="sv__item sv__anim" style="--t: ${t.blocos[j]}s"><span class="sv__item-numero">${j + 1}</span><h2 class="sv__item-titulo">${esc(it.titulo)}</h2><p class="sv__item-texto">${quebras(it.texto)}</p></li>`));
    partes.push(`    </ol>`);
  }
  if (s.pergunta) partes.push(`    <p class="sv__pergunta sv__anim" style="--t: ${t.pergunta}s">${quebras(s.pergunta)}</p>`);
  if (s.icone) partes.push(`    <div class="ig__icone sv__anim" style="--t: ${t.titulo}s"><img src="{{ds}}/miniaturas/icones/${esc(s.icone)}.svg" alt=""></div>`);
  return partes.join("\n");
}

export function htmlDaCena(s, ds, { semSticker = false, reel = false } = {}) {
  const modelo = readFileSync(join(DS, "instagram/layouts/story-cena.html"), "utf8");
  const conteudo = conteudoHtml(s).replace(/\{\{ds\}\}/g, ds);
  return preencher(modelo, {
    ds, conteudo, usuario: canal.instagramUsuario,
    classe_extra: `${semSticker ? " ig--sem-sticker" : ""}${reel ? " ig--reel-cena" : ""}`,
    titulo_pagina: `${s.kicker ?? ""} ${s.titulo ?? ""} — story`.trim(),
    dica: s.dica, dica_t: s.tempos.dica, faixa: s.faixa,
  }, { brutos: ["ds", "conteudo"] });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  const so = args.includes("--so") ? Number(args[args.indexOf("--so") + 1]) : null;
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story-video.mjs instagram/<pasta> [--ver] [--so N]"); process.exit(1); }
  try {
    if (args.includes("--ver")) {
      const { url } = await gerarStoryVideo(resolve(pasta), { ver: true });
      console.log(`Abri a prévia no navegador: ${url}\nQuando terminar de olhar, feche aqui com Ctrl+C.`);
    } else {
      for (const s of await gerarStoryVideo(resolve(pasta), { so })) console.log(relative(RAIZ, s));
    }
  } catch (e) {
    if (e instanceof ErroStoryVideo || e?.constructor?.name?.startsWith("Erro")) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

`conteudoHtml` e `htmlDaCena` são os de hoje, sem mudança (`tamanho` agora vem de `comum.mjs`, com a mesma definição). A constante `anim` do arquivo atual não era usada e sai.

- [ ] **Step 4: Atualizar `gerar-story-aviso.mjs`**

Troque o import de `./gerar-story-video.mjs` e a função `gerarStoryAviso` e a CLI:

```js
import { validarCenas, gravarComposicao, ErroStoryVideo, LIMITES, USUARIO } from "./gerar-story-video.mjs";
import { montarComposicao } from "../motion/composicao.mjs";
import { verComposicoes } from "./motion/ver.mjs";
```

```js
export function composicaoDoAviso(cards) {
  const [cena] = validarCenas([cenaDoAviso(cards)]);
  return montarComposicao([cena], { formato: "story", semSticker: true, usuario: USUARIO });
}

export async function gerarStoryAviso(pasta, { ver = false, ...injecoes } = {}) {
  const arquivo = join(pasta, "cards.json");
  if (!existsSync(arquivo)) throw new ErroStoryAviso(`não achei ${arquivo} — rode a skill post`);
  const comp = composicaoDoAviso(JSON.parse(readFileSync(arquivo, "utf8")));
  if (ver) return verComposicoes([{ nome: "story de aviso", comp }], injecoes);
  return gravarComposicao(comp, { pasta, base: "story-aviso", ...injecoes });
}
```

No cabeçalho, troque a linha do `--so-html` por `//   node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta> --ver      # prévia no navegador, com som`. Na CLI, troque `{ soHtml: args.includes("--so-html") }` por: se `--ver`, chame com `{ ver: true }` e imprima a mesma mensagem da prévia de `gerar-story-video.mjs`; senão imprima `relative(RAIZ, saida)`.

- [ ] **Step 5: Atualizar `gerar-reel.mjs` (Cenas)**

Imports: troque `validar, renderizarCenas` por `validarCenas, gravarComposicao, USUARIO` e acrescente:

```js
import { montarComposicao } from "../motion/composicao.mjs";
import { renderizar as renderizarMotion } from "./motion/renderizar.mjs";
import { mixar as mixarAudio, MOVIMENTO } from "./motion/mixagem.mjs";
import { verComposicoes } from "./motion/ver.mjs";
import { carregarBiblioteca } from "../../scripts/audio.mjs";
```

No cabeçalho, descreva: `tipo "cenas": Cenas do motor de motion (design-system/motion/GUIA.md) num vídeo contínuo, com Trilha ("trilha": "<id>" de design-system/audio/biblioteca.json, opcional) e Efeitos sonoros; as trocas de Cena caem no compasso da Trilha.` e troque `--so-html` por `--ver` (prévia no navegador).

`validarReel` — assinatura `validarReel(dados, { biblioteca = null } = {})`; o bloco `if (dados.tipo === "cenas")` vira:

```js
  if (dados.tipo === "cenas") {
    if (!Array.isArray(dados.cenas) || !dados.cenas.length) erros.push('tipo cenas precisa de uma lista "cenas"');
    else {
      try {
        validarCenas(dados.cenas, { formato: "reel", rotulo: "cena" });
      } catch (e) {
        if (e instanceof ErroStoryVideo) erros.push(e.message); else throw e;
      }
      const total = dados.cenas.reduce((s, c) => s + Number(c.duracao || 0), 0);
      if (total < DURACAO_REEL.min || total > DURACAO_REEL.max) erros.push(`as cenas somam ${total} s; um reel tem de ${DURACAO_REEL.min} a ${DURACAO_REEL.max} s`);
    }
    if (dados.trilha != null) {
      const b = biblioteca ?? carregarBiblioteca();
      if (!b.trilhas.some((t) => t.id === dados.trilha)) erros.push(`trilha "${dados.trilha}" não está em design-system/audio/biblioteca.json`);
    }
  }
```

Apague `argsConcat` e a função `gerarDeCenas` antiga; ponha:

```js
export function composicaoDoReel(dados, { biblioteca }) {
  const cenas = validarCenas(dados.cenas, { formato: "reel", rotulo: "cena" });
  const trilha = dados.trilha ? biblioteca.trilhas.find((t) => t.id === dados.trilha) : null;
  const comp = montarComposicao(cenas, { formato: "reel", trilha, usuario: USUARIO });
  if (comp.duracao > DURACAO_REEL.max) throw new ErroReel(`encaixadas no compasso da Trilha, as cenas dão ${comp.duracao} s; um reel tem até ${DURACAO_REEL.max} s — encurte uma cena`);
  return comp;
}

async function gerarDeCenas(dados, pasta, { ver, renderizar, mixar, biblioteca }) {
  const comp = composicaoDoReel(dados, { biblioteca });
  if (ver) return verComposicoes([{ nome: "reel", comp, trilhaId: dados.trilha ?? null }], { biblioteca, mixar });
  const capaEm = Math.max(0, comp.cenas[0].fim - MOVIMENTO.duracoes.saida - 0.1);   // a 1ª Cena inteira, antes de sair
  return gravarComposicao(comp, { pasta, base: "reel", trilhaId: dados.trilha ?? null, capaEm, renderizar, mixar, biblioteca });
}
```

`gerarReel`:

```js
export async function gerarReel(pasta, { ver = false, renderizar = renderizarMotion, mixar = mixarAudio, biblioteca = carregarBiblioteca(), executar = rodar, raizVideos = join(RAIZ, "videos"), ytDlp = null, exportar = exportarPng } = {}) {
  const arquivo = join(pasta, "reel.json");
  if (!existsSync(arquivo)) throw new ErroReel(`não achei ${arquivo} — rode a skill reel`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarReel(dados, { biblioteca });
  if (erros.length) throw new ErroReel(`reel.json inválido:\n- ${erros.join("\n- ")}`);
  if (dados.tipo === "cenas") return gerarDeCenas(dados, pasta, { ver, renderizar, mixar, biblioteca });
  if (ver) throw new ErroReel('--ver só vale para tipo "cenas" — o corte é conferido no reel.mp4');
  return gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, exportar });
}
```

CLI: troque `--so-html` por `--ver` (mesma mensagem da prévia); sem `--ver`, imprime o caminho como hoje. Apague os imports que sobrarem sem uso (`renameSync` continua usado pelo corte; `unlinkSync` também).

- [ ] **Step 6: Rodar e ver passar**

Run: `node --test tests/story-video.test.mjs tests/story-aviso.test.mjs tests/reel.test.mjs`
Expected: PASS.

Run: `npm test`
Expected: PASS (inclusive `calibrar.test.mjs`, que ainda usa `validar` + `htmlDaCena`).

- [ ] **Step 7: Conferir de verdade num exemplo existente (sem tocar na pasta)**

```bash
mkdir -p /tmp/piloto-texto && cp instagram/2026-10-10-quiz-nobel/stories.json /tmp/piloto-texto/
node design-system/scripts/gerar-story-video.mjs /tmp/piloto-texto --so 1
```

Expected: imprime `…/piloto-texto/story-01.mp4`. Abra o MP4 e o PNG: o quiz do Nobel no motor novo, com a mesma grade da versão atual, sem som ainda (biblioteca vazia → faixa muda). Para conferir as faixas do arquivo:

```bash
"$(node -e 'import("ffmpeg-static").then(m=>process.stdout.write(m.default))')" -hide_banner -i /tmp/piloto-texto/story-01.mp4 2>&1 | grep Stream
```

Expected: uma linha `Video: h264 … 1080x1920 … 30 fps` e uma `Audio: aac`.

- [ ] **Step 8: Commit**

```bash
git add design-system/scripts/gerar-story-video.mjs design-system/scripts/gerar-story-aviso.mjs design-system/scripts/gerar-reel.mjs tests/story-video.test.mjs tests/story-aviso.test.mjs tests/reel.test.mjs
git commit -m "stories, story de aviso e reel de Cenas no motor de motion, com Trilha e Efeitos"
```

---

### Task 7: Cenas `impacto` e `odometro` (+ cabeçalho comum e GUIA das Cenas)

**Files:**
- Create: `design-system/motion/cenas/cabecalho.mjs`, `design-system/motion/cenas/impacto.mjs`, `design-system/motion/cenas/odometro.mjs`, `design-system/motion/GUIA.md`
- Modify: `design-system/motion/cenas/index.mjs` (registrar)
- Test: `tests/motion-cenas.test.mjs` (acrescentar)

**Interfaces:**
- Consumes: contrato e kit (Task 4), `escrita.mjs`, `util.mjs`.
- Produces (`cabecalho.mjs`): `inicioDoConteudo(c) → number` (0,9 com título; 0,6 só com kicker; 0,2 sem nada), `eventosDoCabecalho(c) → eventos`, `desenharCabecalho(ctx, c, t, kit) → { x, y, w, h }` (a caixa livre abaixo do cabeçalho).
- Produces (`odometro.mjs`): além do contrato, `formatar(valor, casas = 0) → string` (pt-BR).
- Campos:
  - `impacto`: `palavras` (1 a 4, cada uma ≤ 14 caracteres), `apoio` (≤ 60, opcional), `kicker` (opcional). Sem `titulo`.
  - `odometro`: `valor` (número ≥ 0), `casas_decimais` (0 a 2, padrão 0), `prefixo` (≤ 6), `sufixo` (≤ 10), `rotulo` (≤ 60), `kicker`, `titulo` — todos opcionais menos `valor`; o valor formatado tem até 9 caracteres.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `tests/motion-cenas.test.mjs`:

```js
import * as impacto from "../design-system/motion/cenas/impacto.mjs";
import * as odometro from "../design-system/motion/cenas/odometro.mjs";

test("impacto: uma batida por palavra, recusa título e palavra longa", () => {
  const { cena, erros } = validarCena({ tipo: "impacto", duracao: 3, palavras: ["7 pontes", "1 passeio"] }, "cena 1", { formato: "reel" });
  assert.deepEqual(erros, []);
  assert.deepEqual(cena.linha.eventos, [{ t: 0.15, efeito: "impacto" }, { t: 0.7, efeito: "impacto" }]);
  assert.equal(cena.minimo, 1.9);
  const erro = (c) => validarCena({ tipo: "impacto", duracao: 3, ...c }, "cena 1", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ palavras: ["a", "b", "c", "d", "e"] }), /de 1 a 4/);
  assert.match(erro({ palavras: ["x".repeat(15)] }), /palavras\[1\]" tem 15/);
  assert.match(erro({ palavras: ["A"], titulo: "T" }), /não tem "titulo"/);
});

test("impacto desenha as palavras em caixa alta quando chegam a vez", () => {
  const { cena } = validarCena({ tipo: "impacto", duracao: 3, palavras: ["7 pontes", "1 passeio"], apoio: "e nenhuma repetida" }, "cena", { formato: "reel" });
  const fim = textos(desenharEm(impacto, cena, [2.9])).map((x) => x.s);
  assert.ok(fim.includes("7 PONTES") && fim.includes("1 PASSEIO") && fim.includes("e nenhuma repetida"));
  assert.ok(!textos(desenharEm(impacto, cena, [0.4])).some((x) => x.s === "1 PASSEIO"));
});

test("odometro: formata em pt-BR, para no valor e mostra o rótulo", () => {
  assert.equal(odometro.formatar(1736), "1.736");
  assert.equal(odometro.formatar(3.5, 1), "3,5");
  const erro = (c) => validarCena({ tipo: "odometro", duracao: 6, ...c }, "cena 1", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ valor: "1736" }), /"valor" precisa ser um número/);
  assert.match(erro({ valor: 1234567.89, casas_decimais: 2 }), /dígitos demais/);
  assert.match(erro({ valor: 1, casas_decimais: 3 }), /de 0 a 2/);
  const { cena } = validarCena({ tipo: "odometro", duracao: 6, titulo: "O ANO", valor: 1736, rotulo: "Euler escreve sobre as pontes" }, "cena", { formato: "reel" });
  assert.ok(cena.linha.eventos.some((e) => e.efeito === "pop" && e.t === 2.7));
  const caracteres = textos(desenharEm(odometro, cena, [5.9])).map((x) => x.s).filter((s) => s.length === 1);
  assert.deepEqual(caracteres, ["1", ".", "7", "3", "6"], "no fim, só os dígitos finais");
  assert.ok(textos(desenharEm(odometro, cena, [5.9])).some((x) => x.s.includes("Euler")));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/motion-cenas.test.mjs`
Expected: FAIL — `impacto.mjs` não existe.

- [ ] **Step 3: Escrever `cenas/cabecalho.mjs`**

```js
// Kicker e título no alto da área, para as Cenas que têm um desenho embaixo (odometro, grafo,
// conta, grafico, tabela). Devolve a caixa que sobra para o desenho.

import { linhasDe, digitar, subir } from "../escrita.mjs";

export const inicioDoConteudo = (c) => (c.titulo ? 0.9 : c.kicker ? 0.6 : 0.2);

export function eventosDoCabecalho(c) {
  const e = [];
  if (c.kicker) e.push({ t: 0, efeito: "digitar" });
  if (c.titulo) e.push({ t: 0.3, efeito: "pop" });
  return e;
}

export function desenharCabecalho(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes;
  let y = area.y;
  if (c.kicker) {
    const ls = linhasDe(ctx, F.kicker, c.kicker, area.w);
    digitar(ctx, ls, F.kicker, area.x, y, t, 0, kit.cores.verdeSuave);
    y += ls.length * F.kicker.line + gap;
  }
  if (c.titulo) {
    const ls = linhasDe(ctx, F.tituloMedio, c.titulo, area.w);
    subir(ctx, ls, F.tituloMedio, area.x, y, t, 0.3, kit.cores.verde, kit, { largura: area.w });
    y += ls.length * F.tituloMedio.line + gap * 2;
  }
  return { x: area.x, y, w: area.w, h: area.y + area.h - y };
}
```

- [ ] **Step 4: Escrever `cenas/impacto.mjs`**

```js
// Cena "impacto": 1 a 4 palavras que batem na tela, uma por vez, em tamanho grande — o gancho do reel.
// Cada batida tem mola (passa do tamanho e assenta), um tremor leve e um clarão quase imperceptível
// (movimento.json → impacto; a pessoa achou fortes demais no protótipo); a palavra da vez é verde.

import { checarTamanho } from "./comum.mjs";
import { usarFonte, caixa, escalar, linhasDe, digitar, escrever, linhaBase } from "../escrita.mjs";
import { springStep, pulse, noise1, clamp } from "../util.mjs";

export const usaGrade = false;
const LIM = { palavras: 4, palavra: 14, apoio: 60 };
const PRIMEIRA = 0.15, PASSO = 0.55;
const r3 = (x) => Math.round(x * 1000) / 1000;

export function validar(c, onde) {
  const erros = [];
  if (!Array.isArray(c.palavras) || !c.palavras.length || c.palavras.length > LIM.palavras) erros.push(`${onde}: "palavras" precisa de 1 a ${LIM.palavras} itens`);
  else c.palavras.forEach((w, i) => { const e = checarTamanho(`palavras[${i + 1}]`, w, LIM.palavra, onde); if (e) erros.push(e); });
  if (c.apoio != null) { const e = checarTamanho("apoio", c.apoio, LIM.apoio, onde); if (e) erros.push(e); }
  if (c.titulo) erros.push(`${onde}: impacto não tem "titulo" — a frase vai em "palavras"`);
  return erros;
}

export function linhaDoTempo(c) {
  const eventos = c.palavras.map((_, i) => ({ t: r3(PRIMEIRA + i * PASSO), efeito: "impacto" }));
  let fim = eventos.at(-1).t;
  if (c.apoio) { fim = r3(fim + 0.6); eventos.push({ t: fim, efeito: "tick" }); }
  return { fim, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap, largura: W, altura: H } = kit.layout, F = kit.fontes, m = kit.movimento.mola;
  const palavras = c.palavras.map((w) => caixa({ caixaAlta: true }, w));
  usarFonte(ctx, F.titulo);
  const maior = Math.max(...palavras.map((w) => ctx.measureText(w).width));
  const px = Math.min(F.titulo.px * 2.4, (F.titulo.px * area.w) / maior);
  const f = { ...escalar(F.titulo, px), line: px * 1.05 };
  const apoio = c.apoio ? linhasDe(ctx, F.corpo, c.apoio, area.w) : [];
  const total = palavras.length * f.line + apoio.length * F.corpo.line;
  const y0 = area.y + (area.h - total) / 2;
  const batidas = palavras.map((_, i) => PRIMEIRA + i * PASSO);
  const ultima = Math.max(-1, ...batidas.filter((b) => b <= t));
  const forca = ultima >= 0 ? pulse(t, ultima, 0.08) : 0;

  if (c.kicker) digitar(ctx, linhasDe(ctx, F.kicker, c.kicker, area.w), F.kicker, area.x, y0 - F.kicker.line - gap, t, 0, kit.cores.verdeSuave, { alinhar: "center", largura: area.w });

  ctx.save();
  const { tremor, clarao } = kit.movimento.impacto;
  ctx.translate(noise1(t * 45, 3) * tremor * forca, noise1(t * 45, 4) * tremor * forca);
  palavras.forEach((w, i) => {
    const ti = batidas[i];
    if (t < ti) return;
    const s = 1 + 0.6 * (1 - springStep(t - ti, m.freq, m.amortecimento));
    const daVez = i === palavras.length - 1 || t < batidas[i + 1];
    ctx.save();
    ctx.globalAlpha *= clamp((t - ti) / 0.06);
    ctx.translate(area.x + area.w / 2, y0 + i * f.line + f.line / 2);
    ctx.scale(s, s);
    usarFonte(ctx, f);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = daVez ? kit.cores.verde : kit.cores.tinta;
    ctx.fillText(w, 0, 0);
    ctx.restore();
  });
  ctx.restore();

  if (clarao > 0 && forca > 0.02) { ctx.save(); ctx.globalAlpha *= clarao * forca; ctx.fillStyle = kit.cores.tinta; ctx.fillRect(0, 0, W, H); ctx.restore(); }

  if (apoio.length) {
    usarFonte(ctx, F.corpo); ctx.fillStyle = kit.cores.tintaSuave; ctx.textBaseline = "alphabetic";
    const porCar = kit.movimento.duracoes.escrita_por_caractere;
    let t0 = c.linha.fim;
    apoio.forEach((l, k) => {
      const dur = Math.max(0.4, l.length * porCar);
      escrever(ctx, l, area.x + area.w / 2, y0 + palavras.length * f.line + k * F.corpo.line + linhaBase(F.corpo), (t - t0) / dur, kit, t, { alinhar: "center" });
      t0 += dur;
    });
  }
}
```

- [ ] **Step 5: Escrever `cenas/odometro.mjs`**

```js
// Cena "odometro": um número que gira até o valor (cada dígito um tambor; o da direita gira mais),
// para com um "pop" e ganha um rótulo escrito embaixo. Separadores em pt-BR (1.736; 3,5).

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, escalar, linhasDe, escrever, linhaBase } from "../escrita.mjs";
import { ease, prog, clamp } from "../util.mjs";

export const usaGrade = false;
const LIM = { prefixo: 6, sufixo: 10, rotulo: 60, caracteres: 9 };
const GIRO = 1.8, ESCALONAR = 0.08;
const r3 = (x) => Math.round(x * 1000) / 1000;

export const formatar = (valor, casas = 0) => valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function validar(c, onde) {
  const erros = [];
  const casas = c.casas_decimais ?? 0;
  if (typeof c.valor !== "number" || !Number.isFinite(c.valor) || c.valor < 0) erros.push(`${onde}: "valor" precisa ser um número ≥ 0 (sem aspas)`);
  if (!Number.isInteger(casas) || casas < 0 || casas > 2) erros.push(`${onde}: "casas_decimais" vai de 0 a 2`);
  for (const k of ["prefixo", "sufixo", "rotulo"]) if (c[k] != null) { const e = checarTamanho(k, c[k], LIM[k], onde); if (e) erros.push(e); }
  if (!erros.length && formatar(c.valor, casas).length > LIM.caracteres) erros.push(`${onde}: "valor" tem dígitos demais para a tela (até ${LIM.caracteres} caracteres formatado)`);
  return erros;
}

export function linhaDoTempo(c) {
  const ini = inicioDoConteudo(c);
  const eventos = [...eventosDoCabecalho(c), { t: ini, efeito: "tick" }, { t: r3(ini + GIRO), efeito: "pop" }];
  let fim = r3(ini + GIRO);
  if (c.rotulo) { fim = r3(fim + 0.3); eventos.push({ t: fim, efeito: "tick" }); }
  return { fim, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const F = kit.fontes;
  const caixaLivre = desenharCabecalho(ctx, c, t, kit);
  const ini = inicioDoConteudo(c);
  const texto = formatar(c.valor, c.casas_decimais ?? 0);
  usarFonte(ctx, F.numero);
  const larguraBase = ctx.measureText(texto).width || 1;
  const px = Math.min(F.numero.px * 1.6, (F.numero.px * caixaLivre.w * 0.9) / larguraBase);
  const f = { ...escalar(F.numero, px), line: px * 1.1 };
  const rotulo = c.rotulo ? linhasDe(ctx, F.corpo, c.rotulo, caixaLivre.w) : [];
  const total = f.line + rotulo.length * F.corpo.line;
  const topo = caixaLivre.y + (caixaLivre.h - total) / 2;
  const cy = topo + f.line / 2;
  usarFonte(ctx, f);
  const largs = [...texto].map((ch) => ctx.measureText(ch).width);
  let x = caixaLivre.x + (caixaLivre.w - largs.reduce((a, b) => a + b, 0)) / 2;
  const digitos = [...texto].filter((ch) => /\d/.test(ch)).length;
  const aparecer = clamp((t - ini) / 0.2);
  if (aparecer <= 0) return;

  if (c.prefixo || c.sufixo) {
    const menor = escalar(f, px * 0.45);
    usarFonte(ctx, menor); ctx.fillStyle = kit.cores.verdeSuave; ctx.textBaseline = "middle";
    ctx.save(); ctx.globalAlpha *= aparecer;
    if (c.prefixo) { ctx.textAlign = "right"; ctx.fillText(c.prefixo, x - 12, cy); }
    if (c.sufixo) { ctx.textAlign = "left"; ctx.fillText(c.sufixo, x + largs.reduce((a, b) => a + b, 0) + 12, cy); }
    ctx.restore();
  }

  usarFonte(ctx, f);
  ctx.fillStyle = kit.cores.verde; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  let k = 0;
  [...texto].forEach((ch, i) => {
    if (!/\d/.test(ch)) {
      ctx.save(); ctx.globalAlpha *= aparecer; ctx.fillText(ch, x, cy); ctx.restore();
      x += largs[i];
      return;
    }
    const alvo = Number(ch) + 10 * (1 + (digitos - 1 - k));   // o da direita dá mais voltas
    const p = prog(t, ini + k * ESCALONAR, ini + GIRO, ease.outExpo);
    const pos = p * alvo, base = Math.floor(pos + 1e-9), frac = pos - base;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 4, cy - f.line / 2, largs[i] + 8, f.line); ctx.clip();
    ctx.globalAlpha *= aparecer;
    ctx.fillText(String(base % 10), x, cy - frac * f.line);
    if (frac > 0.001) ctx.fillText(String((base + 1) % 10), x, cy + (1 - frac) * f.line);
    ctx.restore();
    x += largs[i];
    k++;
  });

  if (rotulo.length) {
    usarFonte(ctx, F.corpo); ctx.fillStyle = kit.cores.tinta; ctx.textBaseline = "alphabetic";
    const porCar = kit.movimento.duracoes.escrita_por_caractere;
    let t0 = c.linha.fim;
    rotulo.forEach((l, j) => {
      const dur = Math.max(0.4, l.length * porCar);
      escrever(ctx, l, caixaLivre.x + caixaLivre.w / 2, topo + f.line + j * F.corpo.line + linhaBase(F.corpo), (t - t0) / dur, kit, t, { alinhar: "center" });
      t0 += dur;
    });
  }
}
```

- [ ] **Step 6: Registrar**

Em `design-system/motion/cenas/index.mjs`:

```js
import * as texto from "./texto.mjs";
import * as impacto from "./impacto.mjs";
import * as odometro from "./odometro.mjs";

export const CENAS = { texto, impacto, odometro };
```

- [ ] **Step 7: Começar `design-system/motion/GUIA.md`**

```markdown
# Cenas do motor de motion — guia para o agente

Cada Cena de `reel.json` (`"cenas"`) ou `stories.json` (`"stories"`) tem `duracao` (s) e um `tipo`. Sem `tipo`, é `texto`. Todo tipo aceita `faixa` (≤ 40, a linha acima do rodapé, ex.: "AULA COMPLETA NO CANAL"). O gerador recusa o que não cabe e diz a duração mínima de cada Cena.

Ritmo do reel: 25 a 45 s no total (limite técnico 15 a 90), Cenas de 3 a 8 s, a primeira bate uma palavra em até 2 s (`impacto`). Story: cada um com pelo menos 5 s.

Quando usar cada tipo:
- **texto** — explicar com frases: kicker, título, até 6 linhas ou 4 itens numerados, pergunta, ícone, dica. É o formato antigo.
- **impacto** — gancho e viradas: 1 a 4 palavras grandes que batem uma por vez.
- **odometro** — um número que importa (ano, quantidade, resultado) girando até o valor.

Números, contas e pesos que aparecem na tela entram na Checagem (`checagem.json`, `onde: "cena N"`).

## texto

    { "duracao": 7, "kicker": "UM ENIGMA DE KÖNIGSBERG", "titulo": "DÁ PARA ATRAVESSAR AS 7 PONTES?", "linhas": ["Uma ilha, dois braços de rio", "Passar por todas sem repetir"] }

Campos: `kicker` ≤ 40, `titulo` ≤ 60, `linhas` (até 6, ≤ 90) **ou** `itens` (até 4, `{titulo ≤ 20, texto ≤ 90}`), `pergunta` ≤ 60, `dica` ≤ 30, `icone` (nome de `design-system/miniaturas/icones/`).

## impacto

    { "tipo": "impacto", "duracao": 3, "palavras": ["7 PONTES", "1 PASSEIO"], "apoio": "sem repetir nenhuma" }

Campos: `palavras` (1 a 4, ≤ 14 cada), `apoio` ≤ 60, `kicker`. Sem `titulo`. Cada palavra entra 0,55 s depois da anterior.

## odometro

    { "tipo": "odometro", "duracao": 5, "titulo": "O ANO DO ARTIGO", "valor": 1736, "rotulo": "Euler escreve sobre as pontes" }

Campos: `valor` (número, sem aspas), `casas_decimais` (0 a 2), `prefixo` ≤ 6 (ex.: "R$"), `sufixo` ≤ 10 (ex.: "km"), `rotulo` ≤ 60, `kicker`, `titulo`. O valor formatado tem até 9 caracteres.
```

- [ ] **Step 8: Rodar e ver passar**

Run: `node --test tests/motion-cenas.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 9: Conferir à vista**

```bash
node -e '
import("./design-system/scripts/motion/renderizar.mjs").then(async ({ fotografar }) => {
  const { montarComposicao } = await import("./design-system/motion/composicao.mjs");
  const { validarCena } = await import("./design-system/motion/cenas/index.mjs");
  const v = (c) => validarCena(c, "cena", { formato: "reel" }).cena;
  const comp = montarComposicao([v({ tipo: "impacto", duracao: 3, palavras: ["7 PONTES", "1 PASSEIO"], apoio: "sem repetir nenhuma" }), v({ tipo: "odometro", duracao: 5, titulo: "O ANO DO ARTIGO", valor: 1736, rotulo: "Euler escreve sobre as pontes" })], { formato: "reel", usuario: "pesquisaoperacionalparatodos" });
  console.log(await fotografar(comp, [0.2, 0.75, 2.5, 4.2, 7.5], "/tmp/motion-impacto"));
});'
```

Abra os PNGs. Esperado: em 0,2 s "7 PONTES" grande e passando do tamanho; em 0,75 s a segunda palavra verde e a primeira branca; em 4,2 s os dígitos girando; em 7,5 s "1.736" parado e o rótulo escrito.

- [ ] **Step 10: Commit**

```bash
git add design-system/motion tests/motion-cenas.test.mjs
git commit -m "motion: Cenas impacto e odometro, cabeçalho comum e guia das Cenas"
```

---

### Task 8: Cenas `grafo` e `conta`

**Files:**
- Create: `design-system/motion/cenas/grafo.mjs`, `design-system/motion/cenas/conta.mjs`
- Modify: `design-system/motion/cenas/index.mjs` (registrar), `design-system/motion/GUIA.md` (acrescentar)
- Test: `tests/motion-cenas.test.mjs` (acrescentar)

**Interfaces:**
- Consumes: contrato e kit (Task 4), `cabecalho.mjs` (Task 7), `escrita.mjs` (inclusive `escalar`), `Camera` (Task 1).
- Produces (`grafo.mjs`): além do contrato, `curvaturas(c) → number[]` (uma por aresta: 0 para aresta única; arestas paralelas entre o mesmo par se abrem simétricas, ex.: `[-0.5, 0.5]`).
- Campos:
  - `grafo`: `nos` (2 a 12, `{ id, x, y, rotulo? }` com `x`,`y` de 0 a 10 — grade; `y` cresce para baixo; `rotulo` ≤ 12, padrão = `id`), `arestas` (1 a 20, `{ de, para, peso? }`, `peso` ≤ 6 caracteres; pares repetidos viram arestas paralelas curvas), `dirigido` (bool, padrão false), `caminho` (opcional, ≥ 2 ids; cada par seguido precisa de uma aresta), `legenda` ≤ 60, `kicker`, `titulo`.
  - `conta`: `linhas` (1 a 5, cada uma ≤ 32 caracteres), `destaque` (número da linha, 1 a N, opcional — sai verde e sublinhada), `nota` ≤ 60, `kicker`, `titulo`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `tests/motion-cenas.test.mjs`:

```js
import * as grafo from "../design-system/motion/cenas/grafo.mjs";
import * as conta from "../design-system/motion/cenas/conta.mjs";

// Königsberg: margem norte (N), ilha (I), margem sul (S), leste (L); 7 pontes, com paralelas N–I e S–I.
const konigsberg = (extra = {}) => ({
  tipo: "grafo", duracao: 8, titulo: "REGIÕES VIRAM PONTOS",
  nos: [{ id: "N", x: 4, y: 1 }, { id: "I", x: 4, y: 5, rotulo: "ilha" }, { id: "S", x: 4, y: 9 }, { id: "L", x: 9, y: 5 }],
  arestas: [{ de: "N", para: "I" }, { de: "N", para: "I" }, { de: "S", para: "I" }, { de: "I", para: "S" }, { de: "N", para: "L" }, { de: "I", para: "L", peso: "3" }, { de: "S", para: "L" }],
  ...extra,
});

test("grafo: valida grade, ids, arestas e caminho; aceita arestas paralelas", () => {
  const ok = validarCena(konigsberg({ caminho: ["N", "I", "L"] }), "cena 2", { formato: "reel" });
  assert.deepEqual(ok.erros, []);
  assert.deepEqual(grafo.curvaturas(ok.cena), [-0.5, 0.5, -0.5, 0.5, 0, 0, 0], "N–I duas vezes, S–I e I–S também são o mesmo par");
  const erro = (extra) => validarCena(konigsberg(extra), "cena 2", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ nos: [{ id: "N", x: 11, y: 1 }, { id: "I", x: 1, y: 1 }] }), /"x" e "y" de 0 a 10/);
  assert.match(erro({ nos: [{ id: "N", x: 1, y: 1 }, { id: "N", x: 2, y: 2 }] }), /id "N" repetido/);
  assert.match(erro({ arestas: [{ de: "N", para: "Z" }] }), /nó "Z" não existe/);
  assert.match(erro({ caminho: ["N", "S"] }), /caminho: não há aresta entre "N" e "S"/);
  assert.match(erro({ dirigido: true, arestas: [{ de: "I", para: "N" }], caminho: ["N", "I"] }), /caminho: não há aresta de "N" para "I"/);
});

test("grafo: eventos (pop dos nós, caneta nas arestas, tick por passo do caminho) e desenho final com rótulos e pesos", () => {
  const { cena } = validarCena(konigsberg({ caminho: ["N", "I", "L"], legenda: "cada ponte é uma ligação" }), "cena", { formato: "reel" });
  const ef = cena.linha.eventos.map((e) => e.efeito);
  assert.ok(ef.includes("pop") && ef.includes("caneta"));
  assert.equal(ef.filter((e) => e === "tick").length, 3, "2 passos do caminho + legenda");
  const ts = textos(desenharEm(grafo, cena, [7.9])).map((x) => x.s);
  for (const r of ["N", "ILHA", "S", "L", "3", "cada ponte é uma ligação"]) assert.ok(ts.includes(r), r);
  assert.ok(grafo.usaGrade);
});

test("conta: linhas escritas uma a uma, destaque válido, nota no fim", () => {
  const c = { tipo: "conta", duracao: 8, titulo: "QUANTAS PONTES EM CADA REGIÃO", linhas: ["ilha: 5", "norte: 3  sul: 3  leste: 3", "4 regiões ímpares"], destaque: 3, nota: "mais de 2 ímpares: impossível" };
  const { cena, erros } = validarCena(c, "cena 3", { formato: "reel" });
  assert.deepEqual(erros, []);
  assert.equal(cena.linha.eventos.filter((e) => e.efeito === "caneta").length, 3);
  assert.ok(cena.linha.eventos.some((e) => e.efeito === "pop"), "sublinhado do destaque");
  const ts = textos(desenharEm(conta, cena, [7.9])).map((x) => x.s);
  assert.ok(c.linhas.every((l) => ts.includes(l)) && ts.includes(c.nota));
  assert.ok(!textos(desenharEm(conta, cena, [0.2])).some((x) => x.s === "ilha: 5"));
  const erro = (extra) => validarCena({ ...c, ...extra }, "cena 3", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ destaque: 4 }), /"destaque" é o número de uma linha \(1 a 3\)/);
  assert.match(erro({ linhas: ["x".repeat(33)] }), /linhas\[1\]" tem 33/);
  assert.match(erro({ linhas: [] }), /de 1 a 5 linhas/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/motion-cenas.test.mjs`
Expected: FAIL — `grafo.mjs` não existe.

- [ ] **Step 3: Escrever `cenas/grafo.mjs`**

```js
// Cena "grafo": nós que surgem com mola, arestas desenhadas pela caneta (paralelas viram curvas —
// Königsberg), pesos, e um caminho que acende em verde passo a passo com a câmera se aproximando.
// Posições numa grade 0–10 dada pelo autor: o desenho sai sempre igual.

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, escalar, linhasDe, escrever, revelarTraco, linhaBase, caixa } from "../escrita.mjs";
import { Camera } from "../camera.mjs";
import { springStep, prog, ease, dist, clamp, TAU } from "../util.mjs";

export const usaGrade = true;
const LIM = { nos: [2, 12], arestas: [1, 20], rotulo: 12, peso: 6, legenda: 60 };
const T = { no: 0.12, aresta: 0.35, passoAresta: 0.18, segmento: 0.45 };
const r3 = (x) => Math.round(x * 1000) / 1000;
const par = (a) => [a.de, a.para].sort().join("\u0000");

export function curvaturas(c) {
  const total = {}, visto = {};
  for (const a of c.arestas) total[par(a)] = (total[par(a)] ?? 0) + 1;
  return c.arestas.map((a) => { const k = (visto[par(a)] = (visto[par(a)] ?? -1) + 1); return k - (total[par(a)] - 1) / 2; });
}

const ligados = (c, u, v) => c.arestas.some((a) => (a.de === u && a.para === v) || (!c.dirigido && a.de === v && a.para === u));

export function validar(c, onde) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  const nos = Array.isArray(c.nos) ? c.nos : [], arestas = Array.isArray(c.arestas) ? c.arestas : [];
  if (nos.length < LIM.nos[0] || nos.length > LIM.nos[1]) erros.push(`${onde}: o grafo precisa de ${LIM.nos[0]} a ${LIM.nos[1]} nós`);
  if (arestas.length < LIM.arestas[0] || arestas.length > LIM.arestas[1]) erros.push(`${onde}: o grafo precisa de ${LIM.arestas[0]} a ${LIM.arestas[1]} arestas`);
  const ids = new Set();
  nos.forEach((n, i) => {
    if (!n?.id) { erros.push(`${onde}: nos[${i + 1}] precisa de "id"`); return; }
    if (ids.has(n.id)) erros.push(`${onde}: id "${n.id}" repetido`);
    ids.add(n.id);
    if (!(n.x >= 0 && n.x <= 10 && n.y >= 0 && n.y <= 10)) erros.push(`${onde}: nó "${n.id}" precisa de "x" e "y" de 0 a 10 (grade)`);
    add(checarTamanho(`rotulo de "${n.id}"`, n.rotulo ?? n.id, LIM.rotulo, onde));
  });
  arestas.forEach((a, i) => {
    for (const lado of ["de", "para"]) if (!ids.has(a?.[lado])) erros.push(`${onde}: arestas[${i + 1}]: nó "${a?.[lado]}" não existe`);
    if (a?.de === a?.para) erros.push(`${onde}: arestas[${i + 1}] liga "${a.de}" a ele mesmo`);
    if (a?.peso != null) add(checarTamanho(`arestas[${i + 1}].peso`, String(a.peso), LIM.peso, onde));
  });
  if (c.caminho != null) {
    if (!Array.isArray(c.caminho) || c.caminho.length < 2) erros.push(`${onde}: "caminho" precisa de pelo menos 2 nós`);
    else for (let i = 0; i + 1 < c.caminho.length; i++) {
      const [u, v] = [c.caminho[i], c.caminho[i + 1]];
      if (!ligados(c, u, v)) erros.push(`${onde}: caminho: não há aresta ${c.dirigido ? `de "${u}" para "${v}"` : `entre "${u}" e "${v}"`}`);
    }
  }
  if (c.legenda != null) add(checarTamanho("legenda", c.legenda, LIM.legenda, onde));
  return erros;
}

function tempos(c) {
  const ini = inicioDoConteudo(c);
  const nos = c.nos.map((_, i) => r3(ini + i * T.no));
  const iniA = ini + c.nos.length * T.no + 0.2;
  const arestas = c.arestas.map((_, i) => r3(iniA + i * T.passoAresta));
  const fimA = arestas.at(-1) + T.aresta;
  const iniC = fimA + 0.4;
  const caminho = (c.caminho ?? []).slice(1).map((_, i) => r3(iniC + i * T.segmento));
  const fimC = caminho.length ? caminho.at(-1) + T.segmento : fimA;
  return { ini, nos, arestas, fimA, iniC, caminho, fimC, legenda: c.legenda ? r3(fimC + 0.3) : null };
}

export function linhaDoTempo(c) {
  const tp = tempos(c);
  const eventos = [...eventosDoCabecalho(c), { t: tp.ini, efeito: "pop" }];
  tp.arestas.forEach((t, i) => { if (i % 3 === 0) eventos.push({ t, efeito: "caneta" }); });
  for (const t of tp.caminho) eventos.push({ t, efeito: "tick" });
  if (tp.legenda != null) eventos.push({ t: tp.legenda, efeito: "tick" });
  return { fim: tp.legenda ?? tp.caminho.at(-1) ?? tp.arestas.at(-1), eventos };
}

function geometria(c, livre, kit) {
  const legendaH = c.legenda ? kit.fontes.corpo.line * 1.6 : 0;
  const lado = Math.min(livre.w, livre.h - legendaH);
  const R = Math.max(26, lado * 0.045);
  const x0 = livre.x + (livre.w - lado) / 2, y0 = livre.y + (livre.h - legendaH - lado) / 2;
  const u = (lado - 2 * R) / 10;
  const pos = new Map(c.nos.map((n) => [n.id, { x: x0 + R + n.x * u, y: y0 + R + n.y * u }]));
  return { pos, R, centro: { x: x0 + lado / 2, y: y0 + lado / 2 }, legendaY: y0 + lado + kit.fontes.corpo.line * 0.4 };
}

// Pontos da aresta, curvada se tiver paralelas, sem o pedaço dentro dos círculos dos nós.
function pontosDaAresta(a, curvatura, { pos, R }) {
  const [p, q] = a.de < a.para ? [pos.get(a.de), pos.get(a.para)] : [pos.get(a.para), pos.get(a.de)];
  const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, flecha = curvatura * R * 2.4;
  const pts = [];
  for (let i = 0; i <= 32; i++) { const s = i / 32, b = 4 * s * (1 - s) * flecha; pts.push({ x: p.x + dx * s + nx * b, y: p.y + dy * s + ny * b }); }
  const aparados = pts.filter((pt) => dist(pt, p) >= R && dist(pt, q) >= R);
  return a.de < a.para ? aparados : aparados.reverse();
}

function seta(ctx, pts, cor, R) {
  const [a, b] = [pts.at(-2), pts.at(-1)];
  const ang = Math.atan2(b.y - a.y, b.x - a.x), s = R * 0.55;
  ctx.save(); ctx.fillStyle = cor; ctx.translate(b.x, b.y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s, -s * 0.6); ctx.lineTo(-s, s * 0.6); ctx.closePath(); ctx.fill(); ctx.restore();
}

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const tp = tempos(c), g = geometria(c, livre, kit), cores = kit.cores, m = kit.movimento.mola;
  const curv = curvaturas(c);
  const tracos = c.arestas.map((a, i) => pontosDaAresta(a, curv[i], g));

  // câmera: aproxima do meio do caminho enquanto ele acende e volta depois
  const { largura: W, altura: H } = kit.layout;
  const cam = new Camera(W, H).chave(0, W / 2, H / 2, 1);
  if (c.caminho) {
    const meio = c.caminho.map((id) => g.pos.get(id)).reduce((s, p, _, l) => ({ x: s.x + p.x / l.length, y: s.y + p.y / l.length }), { x: 0, y: 0 });
    cam.chave(tp.iniC, W / 2, H / 2, 1)
      .chave(tp.iniC + 0.8, (W / 2 + meio.x) / 2, (H / 2 + meio.y) / 2, 1.1, 0, ease[kit.movimento.curvas.camera])
      .chave(tp.fimC + 0.8, W / 2, H / 2, 1, 0, ease[kit.movimento.curvas.camera]);
  }
  ctx.save();
  cam.aplicar(ctx, t);

  // arestas e pesos
  c.arestas.forEach((a, i) => {
    const p = prog(t, tp.arestas[i], tp.arestas[i] + T.aresta, ease.inOutCubic);
    revelarTraco(ctx, tracos[i], p, kit, t, { cor: cores.tintaSuave, largura: 6 });
    if (p >= 1 && c.dirigido) seta(ctx, tracos[i], cores.tintaSuave, g.R);
    if (a.peso != null && p >= 1) {
      const meio = tracos[i][Math.floor(tracos[i].length / 2)];
      const f = escalar(kit.fontes.kicker, g.R * 0.8);
      usarFonte(ctx, f);
      const s = String(a.peso), w = ctx.measureText(s).width;
      ctx.save(); ctx.globalAlpha *= clamp((t - tp.arestas[i] - T.aresta) / 0.2);
      ctx.fillStyle = cores.fundo; ctx.fillRect(meio.x - w / 2 - 8, meio.y - f.px * 0.7, w + 16, f.px * 1.4);
      ctx.fillStyle = cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, meio.x, meio.y);
      ctx.restore();
    }
  });

  // caminho em verde, passo a passo
  const visitado = new Set();
  if (c.caminho && t >= tp.iniC) visitado.add(c.caminho[0]);
  (c.caminho ?? []).slice(1).forEach((v, j) => {
    const u = c.caminho[j];
    const i = c.arestas.findIndex((a) => (a.de === u && a.para === v) || (!c.dirigido && a.de === v && a.para === u));
    const pts = c.arestas[i].de === u ? tracos[i] : [...tracos[i]].reverse();
    const p = prog(t, tp.caminho[j], tp.caminho[j] + T.segmento, ease.inOutCubic);
    revelarTraco(ctx, pts, p, kit, t, { cor: cores.verde, largura: 12 });
    if (p >= 1) visitado.add(v);
  });

  // nós e rótulos
  const fRotulo = escalar(kit.fontes.kicker, g.R * 0.85);
  c.nos.forEach((n, i) => {
    const s = springStep(t - tp.nos[i], m.freq, m.amortecimento);
    if (s <= 0) return;
    const { x, y } = g.pos.get(n.id), aceso = visitado.has(n.id);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, 0, g.R, 0, TAU);
    ctx.fillStyle = aceso ? cores.verde : cores.fundo; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = aceso ? cores.verde : cores.tinta; ctx.stroke();
    usarFonte(ctx, fRotulo); ctx.fillStyle = cores.tinta; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const rotulo = caixa(fRotulo, n.rotulo ?? n.id);
    if (ctx.measureText(rotulo).width > g.R * 1.6) ctx.fillText(rotulo, 0, g.R + fRotulo.px);   // rótulo longo: embaixo do nó
    else ctx.fillText(rotulo, 0, 0);
    ctx.restore();
  });
  ctx.restore();

  if (c.legenda) {
    usarFonte(ctx, kit.fontes.corpo); ctx.fillStyle = cores.tintaSuave; ctx.textBaseline = "alphabetic";
    const [linha] = linhasDe(ctx, kit.fontes.corpo, c.legenda, livre.w);
    escrever(ctx, linha, livre.x + livre.w / 2, g.legendaY + linhaBase(kit.fontes.corpo), (t - tp.legenda) / Math.max(0.4, linha.length * kit.movimento.duracoes.escrita_por_caractere), kit, t, { alinhar: "center" });
  }
}
```

Observação para o teste de rótulos: `fRotulo` vem do kicker, que é `caixaAlta` — por isso "ilha" aparece como "ILHA".

- [ ] **Step 4: Escrever `cenas/conta.mjs`**

```js
// Cena "conta": até 5 linhas de conta escritas pela caneta, uma de cada vez, na fonte do título
// (Baloo 2); a linha de destaque sai verde e ganha um sublinhado desenhado; uma nota fecha.

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, linhasDe, escrever, revelarTraco, linhaBase } from "../escrita.mjs";
import { prog, ease } from "../util.mjs";

export const usaGrade = true;
const LIM = { linhas: [1, 5], linha: 32, nota: 60 };
const r3 = (x) => Math.round(x * 1000) / 1000;

export function validar(c, onde) {
  const erros = [];
  const linhas = Array.isArray(c.linhas) ? c.linhas : [];
  if (linhas.length < LIM.linhas[0] || linhas.length > LIM.linhas[1]) erros.push(`${onde}: "conta" precisa de 1 a 5 linhas`);
  linhas.forEach((l, i) => { const e = checarTamanho(`linhas[${i + 1}]`, l, LIM.linha, onde); if (e) erros.push(e); });
  if (c.destaque != null && !(Number.isInteger(c.destaque) && c.destaque >= 1 && c.destaque <= linhas.length)) erros.push(`${onde}: "destaque" é o número de uma linha (1 a ${linhas.length})`);
  if (c.nota != null) { const e = checarTamanho("nota", c.nota, LIM.nota, onde); if (e) erros.push(e); }
  return erros;
}

function tempos(c, porCar) {
  let t = inicioDoConteudo(c);
  const linhas = c.linhas.map((l) => { const dur = Math.max(0.5, l.length * porCar); const r = { t: r3(t), dur }; t += dur + 0.35; return r; });
  const fimLinhas = linhas.at(-1).t + linhas.at(-1).dur;
  const destaque = c.destaque ? r3(linhas[c.destaque - 1].t + linhas[c.destaque - 1].dur + 0.1) : null;
  const nota = c.nota ? r3(Math.max(fimLinhas, destaque != null ? destaque + 0.5 : 0) + 0.3) : null;
  return { linhas, destaque, nota };
}

const POR_CARACTERE = 0.035;   // mesmo valor de movimento.json; aqui a linha do tempo não tem o kit

export function linhaDoTempo(c) {
  const tp = tempos(c, POR_CARACTERE);
  const eventos = [...eventosDoCabecalho(c), ...tp.linhas.map((l) => ({ t: l.t, efeito: "caneta" }))];
  if (tp.destaque != null) eventos.push({ t: tp.destaque, efeito: "pop" });
  if (tp.nota != null) eventos.push({ t: tp.nota, efeito: "tick" });
  return { fim: tp.nota ?? tp.destaque ?? tp.linhas.at(-1).t, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const F = kit.fontes, cores = kit.cores;
  const tp = tempos(c, POR_CARACTERE);
  const nota = c.nota ? linhasDe(ctx, F.corpo, c.nota, livre.w) : [];
  const total = c.linhas.length * F.conta.line + nota.length * F.corpo.line + (nota.length ? kit.layout.gap : 0);
  const y0 = livre.y + (livre.h - total) / 2;
  const cx = livre.x + livre.w / 2;
  usarFonte(ctx, F.conta);
  ctx.textBaseline = "alphabetic";
  c.linhas.forEach((l, i) => {
    const destaque = c.destaque === i + 1;
    ctx.fillStyle = destaque ? cores.verde : cores.tinta;
    const yb = y0 + i * F.conta.line + linhaBase(F.conta);
    escrever(ctx, l, cx, yb, (t - tp.linhas[i].t) / tp.linhas[i].dur, kit, t, { alinhar: "center" });
    if (destaque && tp.destaque != null) {
      const w = ctx.measureText(l).width;
      revelarTraco(ctx, [{ x: cx - w / 2, y: yb + 18 }, { x: cx + w / 2, y: yb + 18 }], prog(t, tp.destaque, tp.destaque + 0.5, ease.inOutCubic), kit, t, { cor: cores.verde, largura: 8 });
      usarFonte(ctx, F.conta);
    }
  });
  if (nota.length) {
    usarFonte(ctx, F.corpo); ctx.fillStyle = cores.tintaSuave;
    const yN = y0 + c.linhas.length * F.conta.line + kit.layout.gap;
    nota.forEach((l, j) => escrever(ctx, l, cx, yN + j * F.corpo.line + linhaBase(F.corpo), (t - tp.nota) / Math.max(0.4, l.length * POR_CARACTERE), kit, t, { alinhar: "center" }));
  }
}
```

Atenção: `POR_CARACTERE` repete `movimento.duracoes.escrita_por_caractere` porque `linhaDoTempo` não recebe o kit (e precisa ser igual no Node e no navegador). Se um dia o token mudar, mude os dois — o teste "conta" pega a divergência se a nota começar antes do fim das linhas.

- [ ] **Step 5: Registrar**

Em `cenas/index.mjs`: importe `grafo` e `conta` e use `export const CENAS = { texto, impacto, odometro, grafo, conta };`.

- [ ] **Step 6: Acrescentar ao `GUIA.md`**

Na lista "Quando usar cada tipo", acrescente:

```markdown
- **grafo** — redes, caminhos, árvores: nós numa grade 0–10, arestas (pares repetidos viram pontes paralelas), pesos e um caminho que acende.
- **conta** — uma conta curta escrita à mão, linha a linha, com a linha do resultado em destaque.
```

E as seções:

```markdown
## grafo

    { "tipo": "grafo", "duracao": 8, "titulo": "REGIÕES VIRAM PONTOS",
      "nos": [{ "id": "N", "x": 4, "y": 1 }, { "id": "I", "x": 4, "y": 5, "rotulo": "ilha" }, { "id": "S", "x": 4, "y": 9 }, { "id": "L", "x": 9, "y": 5 }],
      "arestas": [{ "de": "N", "para": "I" }, { "de": "N", "para": "I" }, { "de": "S", "para": "I" }, { "de": "S", "para": "I" }, { "de": "N", "para": "L" }, { "de": "I", "para": "L" }, { "de": "S", "para": "L" }],
      "caminho": ["N", "I", "L"], "legenda": "cada ponte é uma ligação" }

Campos: `nos` (2 a 12; `x`, `y` de 0 a 10, `y` cresce para baixo; `rotulo` ≤ 12, padrão = `id`), `arestas` (1 a 20; `peso` ≤ 6 caracteres), `dirigido` (true desenha setas e exige o sentido no caminho), `caminho` (cada par seguido precisa de aresta), `legenda` ≤ 60, `kicker`, `titulo`. Deixe pelo menos 2 unidades entre nós para os rótulos respirarem. Pesos e caminho entram na Checagem.

## conta

    { "tipo": "conta", "duracao": 8, "titulo": "QUANTAS PONTES EM CADA REGIÃO", "linhas": ["ilha: 5", "norte: 3  sul: 3  leste: 3", "4 regiões ímpares"], "destaque": 3, "nota": "mais de 2 ímpares: impossível" }

Campos: `linhas` (1 a 5, ≤ 32 cada), `destaque` (número da linha que sai verde e sublinhada), `nota` ≤ 60, `kicker`, `titulo`. Toda conta entra na Checagem refeita por outro caminho.
```

- [ ] **Step 7: Rodar e ver passar**

Run: `node --test tests/motion-cenas.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 8: Conferir à vista**

```bash
node -e '
import("./design-system/scripts/motion/renderizar.mjs").then(async ({ fotografar }) => {
  const { montarComposicao } = await import("./design-system/motion/composicao.mjs");
  const { validarCena } = await import("./design-system/motion/cenas/index.mjs");
  const v = (c) => { const r = validarCena(c, "cena", { formato: "reel" }); if (r.erros.length) throw new Error(r.erros[0]); return r.cena; };
  const g = { tipo: "grafo", duracao: 8, titulo: "REGIÕES VIRAM PONTOS", nos: [{ id: "N", x: 4, y: 1 }, { id: "I", x: 4, y: 5, rotulo: "ilha" }, { id: "S", x: 4, y: 9 }, { id: "L", x: 9, y: 5 }], arestas: [{ de: "N", para: "I" }, { de: "N", para: "I" }, { de: "S", para: "I" }, { de: "S", para: "I" }, { de: "N", para: "L" }, { de: "I", para: "L" }, { de: "S", para: "L" }], caminho: ["N", "I", "L"], legenda: "cada ponte é uma ligação" };
  const k = { tipo: "conta", duracao: 8, titulo: "QUANTAS PONTES EM CADA REGIÃO", linhas: ["ilha: 5", "norte: 3  sul: 3  leste: 3", "4 regiões ímpares"], destaque: 3, nota: "mais de 2 ímpares: impossível" };
  console.log(await fotografar(montarComposicao([v(g), v(k)], { formato: "reel", usuario: "pesquisaoperacionalparatodos" }), [1.5, 2.4, 4.6, 7.6, 10, 15.6], "/tmp/motion-grafo"));
});'
```

Abra os PNGs. Esperado: grade sutil revelada do centro; nós surgindo; as duas pontes N–I e as duas S–I curvas, sem se sobrepor; o caminho N→I→L verde com a câmera um pouco mais perto (4,6 s); a conta escrita com a caneta, a terceira linha verde e sublinhada.

- [ ] **Step 9: Commit**

```bash
git add design-system/motion tests/motion-cenas.test.mjs
git commit -m "motion: Cenas grafo (arestas paralelas, caminho, câmera) e conta"
```

---

### Task 9: Cenas `grafico` e `tabela`

**Files:**
- Create: `design-system/motion/cenas/grafico.mjs`, `design-system/motion/cenas/tabela.mjs`
- Modify: `design-system/motion/cenas/index.mjs` (registrar), `design-system/motion/GUIA.md` (acrescentar)
- Test: `tests/motion-cenas.test.mjs` (acrescentar)

**Interfaces:**
- Consumes: contrato e kit (Task 4), `cabecalho.mjs` (Task 7), `escrita.mjs`.
- Produces (`grafico.mjs`): além do contrato, `regiaoViavel(eixos, restricoes) → [{x,y}]` (polígono de `0 ≤ x ≤ max`, `0 ≤ y ≤ max` e cada `a·x + b·y ≤ c`; `[]` se vazio).
- Campos:
  - `grafico`: `eixos` `{ x: { rotulo ≤ 16, max > 0 }, y: { … } }`, `restricoes` (1 a 5, `{ a, b, c, rotulo? ≤ 16 }` = `a·x + b·y ≤ c`), `otimo` (opcional `{ x, y, rotulo? ≤ 20 }`, precisa estar na região), `nota` ≤ 60, `kicker`, `titulo`.
  - `tabela`: `colunas` (2 a 4, cada uma ≤ 12, pode ser `""`), `linhas` (1 a 6, cada uma com o mesmo número de células das colunas, célula ≤ 12), `destaque` (opcional `{ linha, coluna }`, contando de 1, linha sem o cabeçalho), `nota` ≤ 60, `kicker`, `titulo`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `tests/motion-cenas.test.mjs`:

```js
import * as grafico from "../design-system/motion/cenas/grafico.mjs";
import * as tabela from "../design-system/motion/cenas/tabela.mjs";

const arred = (poli) => poli.map((p) => [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000]);

test("regiaoViavel recorta o retângulo dos eixos por cada restrição", () => {
  const eixos = { x: { max: 10 }, y: { max: 8 } };
  assert.deepEqual(arred(grafico.regiaoViavel(eixos, [{ a: 1, b: 2, c: 10 }])), [[0, 0], [10, 0], [0, 5]]);
  assert.deepEqual(arred(grafico.regiaoViavel(eixos, [{ a: 1, b: 1, c: 6 }, { a: 1, b: 0, c: 4 }])), [[0, 0], [4, 0], [4, 2], [0, 6]]);
  assert.deepEqual(grafico.regiaoViavel(eixos, [{ a: 1, b: 1, c: -1 }]), []);
});

const padaria = (extra = {}) => ({
  tipo: "grafico", duracao: 10, titulo: "ONDE O LUCRO É MAIOR",
  eixos: { x: { rotulo: "pães", max: 8 }, y: { rotulo: "bolos", max: 6 } },
  restricoes: [{ a: 1, b: 2, c: 8, rotulo: "forno" }, { a: 1, b: 1, c: 6, rotulo: "massa" }],
  otimo: { x: 4, y: 2, rotulo: "Z* = R$ 220" }, ...extra,
});

test("grafico: valida eixos, restrições, região vazia e ótimo fora da região", () => {
  const { cena, erros } = validarCena(padaria(), "cena 4", { formato: "reel" });
  assert.deepEqual(erros, []);
  assert.deepEqual(cena.linha.eventos.filter((e) => e.efeito === "caneta").length, 3, "eixos + 2 restrições");
  assert.ok(cena.linha.eventos.some((e) => e.efeito === "sino"), "ótimo");
  const erro = (extra) => validarCena(padaria(extra), "cena 4", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ eixos: { x: { rotulo: "x", max: 0 }, y: { rotulo: "y", max: 6 } } }), /"max" > 0/);
  assert.match(erro({ restricoes: [{ a: 0, b: 0, c: 1 }] }), /"a" e "b" não podem ser os dois 0/);
  assert.match(erro({ restricoes: [{ a: 1, b: 1, c: -1 }], otimo: undefined }), /região viável ficou vazia/);
  assert.match(erro({ otimo: { x: 7, y: 5 } }), /ótimo \(7; 5\) está fora da região viável/);
  const ts = textos(desenharEm(grafico, cena, [9.9])).map((x) => x.s);
  for (const r of ["pães", "bolos", "forno", "massa", "Z* = R$ 220"]) assert.ok(ts.includes(r), r);
});

const lucros = (extra = {}) => ({ tipo: "tabela", duracao: 8, titulo: "O QUE CADA UM RENDE", colunas: ["", "Pão", "Bolo"], linhas: [["Forno", "1 h", "2 h"], ["Lucro", "R$ 20", "R$ 50"]], destaque: { linha: 2, coluna: 3 }, ...extra });

test("tabela: valida formato e destaque; desenha cabeçalho e células, linha por linha", () => {
  const { cena, erros } = validarCena(lucros(), "cena 5", { formato: "reel" });
  assert.deepEqual(erros, []);
  assert.equal(cena.linha.eventos.filter((e) => e.efeito === "tick").length, 2);
  assert.ok(cena.linha.eventos.some((e) => e.efeito === "pop"));
  const erro = (extra) => validarCena(lucros(extra), "cena 5", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ linhas: [["Forno", "1 h"]] }), /linhas\[1\] tem 2 células; as colunas são 3/);
  assert.match(erro({ destaque: { linha: 3, coluna: 1 } }), /"destaque" fora da tabela/);
  assert.match(erro({ linhas: [["Forno", "x".repeat(13), "2 h"]] }), /célula \(1, 2\) tem 13/);
  assert.match(erro({ colunas: ["A"] }), /de 2 a 4 colunas/);
  const fim = textos(desenharEm(tabela, cena, [7.9])).map((x) => x.s);
  for (const s of ["PÃO", "BOLO", "Forno", "1 h", "2 h", "Lucro", "R$ 20", "R$ 50"]) assert.ok(fim.includes(s), s);
  assert.ok(!textos(desenharEm(tabela, cena, [1])).some((x) => x.s === "R$ 50"), "segunda linha ainda não entrou");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/motion-cenas.test.mjs`
Expected: FAIL — `grafico.mjs` não existe.

- [ ] **Step 3: Escrever `cenas/grafico.mjs`**

```js
// Cena "grafico": eixos desenhados, cada restrição a·x + b·y ≤ c traçada pela caneta, a região viável
// preenchida em verde da esquerda para a direita e o ponto ótimo pulsando com seu rótulo.

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, linhasDe, escrever, revelarTraco, linhaBase } from "../escrita.mjs";
import { prog, ease, springStep, pulse, clamp, TAU } from "../util.mjs";

export const usaGrade = true;
const LIM = { restricoes: [1, 5], rotuloEixo: 16, rotuloRestricao: 16, rotuloOtimo: 20, nota: 60 };
const r3 = (x) => Math.round(x * 1000) / 1000;
const num = (v) => typeof v === "number" && Number.isFinite(v);

export function regiaoViavel(eixos, restricoes) {
  let poli = [{ x: 0, y: 0 }, { x: eixos.x.max, y: 0 }, { x: eixos.x.max, y: eixos.y.max }, { x: 0, y: eixos.y.max }];
  for (const { a, b, c } of restricoes) {
    const f = (p) => a * p.x + b * p.y - c;
    const novo = [];
    poli.forEach((p, i) => {
      const q = poli[(i + 1) % poli.length], fp = f(p), fq = f(q);
      if (fp <= 1e-9) novo.push(p);
      if ((fp <= 1e-9) !== (fq <= 1e-9)) { const s = fp / (fp - fq); novo.push({ x: p.x + (q.x - p.x) * s, y: p.y + (q.y - p.y) * s }); }
    });
    poli = novo.filter((p, i) => { const q = novo[(i + novo.length - 1) % novo.length]; return novo.length < 2 || Math.hypot(p.x - q.x, p.y - q.y) > 1e-9; });
    if (poli.length < 3) return [];
  }
  const area = poli.reduce((s, p, i) => { const q = poli[(i + 1) % poli.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
  return Math.abs(area) > 1e-9 ? poli : [];
}

export function validar(c, onde) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  for (const k of ["x", "y"]) {
    const e = c.eixos?.[k];
    if (!e || !num(e.max) || e.max <= 0) erros.push(`${onde}: eixo ${k} precisa de "max" > 0`);
    if (e?.rotulo != null) add(checarTamanho(`eixos.${k}.rotulo`, e.rotulo, LIM.rotuloEixo, onde));
  }
  const rs = Array.isArray(c.restricoes) ? c.restricoes : [];
  if (rs.length < LIM.restricoes[0] || rs.length > LIM.restricoes[1]) erros.push(`${onde}: o gráfico precisa de 1 a 5 restrições`);
  rs.forEach((r, i) => {
    if (![r?.a, r?.b, r?.c].every(num)) erros.push(`${onde}: restricoes[${i + 1}] precisa de "a", "b" e "c" numéricos (a·x + b·y ≤ c)`);
    else if (r.a === 0 && r.b === 0) erros.push(`${onde}: restricoes[${i + 1}]: "a" e "b" não podem ser os dois 0`);
    if (r?.rotulo != null) add(checarTamanho(`restricoes[${i + 1}].rotulo`, r.rotulo, LIM.rotuloRestricao, onde));
  });
  if (c.otimo?.rotulo != null) add(checarTamanho("otimo.rotulo", c.otimo.rotulo, LIM.rotuloOtimo, onde));
  if (c.nota != null) add(checarTamanho("nota", c.nota, LIM.nota, onde));
  if (erros.length) return erros;
  if (!regiaoViavel(c.eixos, rs).length) return [`${onde}: a região viável ficou vazia — confira as restrições e o "max" dos eixos`];
  if (c.otimo) {
    const { x, y } = c.otimo, tol = 1e-6;
    const dentro = num(x) && num(y) && x >= -tol && y >= -tol && x <= c.eixos.x.max + tol && y <= c.eixos.y.max + tol && rs.every((r) => r.a * x + r.b * y <= r.c + tol);
    if (!dentro) erros.push(`${onde}: o ponto ótimo (${x}; ${y}) está fora da região viável`);
  }
  return erros;
}

function tempos(c) {
  const ini = inicioDoConteudo(c);
  const restricoes = c.restricoes.map((_, i) => r3(ini + 0.7 + i * 0.7));
  const regiao = r3(restricoes.at(-1) + 0.8);
  const otimo = c.otimo ? r3(regiao + 0.7) : null;
  const nota = c.nota ? r3((otimo ?? regiao) + 0.6) : null;
  return { ini, restricoes, regiao, otimo, nota };
}

export function linhaDoTempo(c) {
  const tp = tempos(c);
  const eventos = [...eventosDoCabecalho(c), { t: tp.ini, efeito: "caneta" }, ...tp.restricoes.map((t) => ({ t, efeito: "caneta" })), { t: tp.regiao, efeito: "pop" }];
  if (tp.otimo != null) eventos.push({ t: tp.otimo, efeito: "sino" });
  if (tp.nota != null) eventos.push({ t: tp.nota, efeito: "tick" });
  return { fim: tp.nota ?? tp.otimo ?? tp.regiao, eventos };
}

// Pedaço da reta a·x + b·y = c dentro do retângulo dos eixos (dois pontos), ou null.
function segmento({ a, b, c }, eixos) {
  const X = eixos.x.max, Y = eixos.y.max, pts = [];
  if (b !== 0) for (const x of [0, X]) { const y = (c - a * x) / b; if (y >= -1e-9 && y <= Y + 1e-9) pts.push({ x, y }); }
  if (a !== 0) for (const y of [0, Y]) { const x = (c - b * y) / a; if (x >= -1e-9 && x <= X + 1e-9) pts.push({ x, y }); }
  if (pts.length < 2) return null;
  pts.sort((p, q) => p.x - q.x || q.y - p.y);
  return [pts[0], pts.at(-1)];
}

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const F = kit.fontes, cores = kit.cores, tp = tempos(c), m = kit.movimento.mola;
  const nota = c.nota ? linhasDe(ctx, F.corpo, c.nota, livre.w) : [];
  const margem = { esq: 24, dir: 24, cima: F.apoio.line + 8, baixo: F.apoio.line + 16 };
  const notaH = nota.length * F.corpo.line;
  const lado = Math.min(livre.w - margem.esq - margem.dir, livre.h - margem.cima - margem.baixo - notaH);
  const bx = livre.x + (livre.w - lado) / 2, by = livre.y + margem.cima + (livre.h - margem.cima - margem.baixo - notaH - lado) / 2;
  const X = (x) => bx + (x / c.eixos.x.max) * lado, Y = (y) => by + lado - (y / c.eixos.y.max) * lado;

  // eixos
  const pEixos = prog(t, tp.ini, tp.ini + 0.6, ease.inOutCubic);
  revelarTraco(ctx, [{ x: X(0), y: Y(c.eixos.y.max) }, { x: X(0), y: Y(0) }, { x: X(c.eixos.x.max), y: Y(0) }], pEixos, kit, t, { cor: cores.tinta, largura: 4 });
  if (pEixos >= 1) {
    usarFonte(ctx, F.apoio); ctx.fillStyle = cores.tintaSuave; ctx.textBaseline = "alphabetic";
    if (c.eixos.x.rotulo) { ctx.textAlign = "right"; ctx.fillText(c.eixos.x.rotulo, X(c.eixos.x.max), Y(0) + F.apoio.line); }
    if (c.eixos.y.rotulo) { ctx.textAlign = "left"; ctx.fillText(c.eixos.y.rotulo, X(0) + 12, Y(c.eixos.y.max) - 12); }
  }

  // região viável, revelada da esquerda para a direita
  const pReg = prog(t, tp.regiao, tp.regiao + 0.6, ease.outCubic);
  if (pReg > 0) {
    const poli = regiaoViavel(c.eixos, c.restricoes);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, lado * pReg, lado); ctx.clip();
    ctx.globalAlpha *= 0.28; ctx.fillStyle = cores.verde;
    ctx.beginPath(); poli.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // restrições
  c.restricoes.forEach((r, i) => {
    const seg = segmento(r, c.eixos);
    if (!seg) return;
    const pts = seg.map((p) => ({ x: X(p.x), y: Y(p.y) }));
    const p = prog(t, tp.restricoes[i], tp.restricoes[i] + 0.6, ease.inOutCubic);
    revelarTraco(ctx, pts, p, kit, t, { cor: cores.tintaSuave, largura: 5 });
    if (p >= 1 && r.rotulo) {
      usarFonte(ctx, F.apoio); ctx.fillStyle = cores.verdeSuave; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      const alto = pts[0].y < pts[1].y ? pts[0] : pts[1];
      ctx.fillText(r.rotulo, Math.min(alto.x + 12, bx + lado - ctx.measureText(r.rotulo).width), alto.y - 10);
    }
  });

  // ótimo
  if (c.otimo && t >= tp.otimo) {
    const s = springStep(t - tp.otimo, m.freq, m.amortecimento), ox = X(c.otimo.x), oy = Y(c.otimo.y);
    ctx.save();
    ctx.globalAlpha *= 0.6 * pulse(t, tp.otimo, 0.3);
    ctx.strokeStyle = cores.verde; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ox, oy, 14 + 60 * clamp((t - tp.otimo) / 0.8), 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.fillStyle = cores.verde; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
    ctx.restore();
    if (c.otimo.rotulo) {
      usarFonte(ctx, F.kicker); ctx.fillStyle = cores.tinta; ctx.textBaseline = "alphabetic";
      const w = ctx.measureText(c.otimo.rotulo).width;
      ctx.textAlign = ox + 24 + w > bx + lado ? "right" : "left";
      ctx.globalAlpha *= clamp((t - tp.otimo) / 0.3);
      ctx.fillText(c.otimo.rotulo, ctx.textAlign === "right" ? ox - 24 : ox + 24, oy - 24);
      ctx.globalAlpha = 1;
    }
  }

  if (nota.length) {
    usarFonte(ctx, F.corpo); ctx.fillStyle = cores.tintaSuave; ctx.textBaseline = "alphabetic";
    const yN = by + lado + margem.baixo;
    nota.forEach((l, j) => escrever(ctx, l, livre.x + livre.w / 2, yN + j * F.corpo.line + linhaBase(F.corpo), (t - tp.nota) / Math.max(0.4, l.length * kit.movimento.duracoes.escrita_por_caractere), kit, t, { alinhar: "center" }));
  }
}
```

Atenção: o rótulo do ótimo usa a fonte do kicker, que é `caixaAlta` no CSS — mas aqui o texto é desenhado **sem** `caixa()`, de propósito (é uma fórmula: "Z* = R$ 220" não pode virar maiúscula em "r$"). O mesmo vale para os rótulos dos eixos e das restrições (fonte `apoio`, que não é caixa alta). O `globalAlpha = 1` depois do rótulo restaura o valor que o quadro tinha posto (o quadro sempre começa a Cena com `save()`/`restore()` por fora, então não vaza).

- [ ] **Step 4: Escrever `cenas/tabela.mjs`**

```js
// Cena "tabela": as linhas da grade se desenham, o cabeçalho é digitado e cada linha da tabela entra
// em seguida; a célula de destaque ganha uma moldura verde desenhada pela caneta.

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, escalar, caixa, linhasDe, escrever, revelarTraco, linhaBase } from "../escrita.mjs";
import { prog, ease, clamp } from "../util.mjs";

export const usaGrade = true;
const LIM = { colunas: [2, 4], linhas: [1, 6], celula: 12, nota: 60 };
const r3 = (x) => Math.round(x * 1000) / 1000;

export function validar(c, onde) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  const cols = Array.isArray(c.colunas) ? c.colunas : [], lins = Array.isArray(c.linhas) ? c.linhas : [];
  if (cols.length < LIM.colunas[0] || cols.length > LIM.colunas[1]) erros.push(`${onde}: a tabela precisa de 2 a 4 colunas`);
  cols.forEach((s, j) => add(checarTamanho(`colunas[${j + 1}]`, s, LIM.celula, onde)));
  if (lins.length < LIM.linhas[0] || lins.length > LIM.linhas[1]) erros.push(`${onde}: a tabela precisa de 1 a 6 linhas`);
  lins.forEach((l, i) => {
    if (!Array.isArray(l) || l.length !== cols.length) { erros.push(`${onde}: linhas[${i + 1}] tem ${Array.isArray(l) ? l.length : 0} células; as colunas são ${cols.length}`); return; }
    l.forEach((s, j) => add(checarTamanho(`célula (${i + 1}, ${j + 1})`, String(s), LIM.celula, onde)));
  });
  if (c.destaque != null) {
    const { linha, coluna } = c.destaque;
    if (!(Number.isInteger(linha) && Number.isInteger(coluna) && linha >= 1 && linha <= lins.length && coluna >= 1 && coluna <= cols.length)) erros.push(`${onde}: "destaque" fora da tabela (linha 1 a ${lins.length}, coluna 1 a ${cols.length})`);
  }
  if (c.nota != null) add(checarTamanho("nota", c.nota, LIM.nota, onde));
  return erros;
}

function tempos(c) {
  const ini = inicioDoConteudo(c);
  const linhas = c.linhas.map((_, i) => r3(ini + 0.5 + i * 0.45));
  const destaque = c.destaque ? r3(linhas.at(-1) + 0.6) : null;
  const nota = c.nota ? r3((destaque != null ? destaque + 0.5 : linhas.at(-1)) + 0.4) : null;
  return { ini, linhas, destaque, nota };
}

export function linhaDoTempo(c) {
  const tp = tempos(c);
  const eventos = [...eventosDoCabecalho(c), { t: tp.ini, efeito: "digitar" }, ...tp.linhas.map((t) => ({ t, efeito: "tick" }))];
  if (tp.destaque != null) eventos.push({ t: tp.destaque, efeito: "pop" });
  if (tp.nota != null) eventos.push({ t: tp.nota, efeito: "tick" });
  return { fim: tp.nota ?? tp.destaque ?? tp.linhas.at(-1), eventos };
}

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const F = kit.fontes, cores = kit.cores, tp = tempos(c);
  const nCols = c.colunas.length, colW = livre.w / nCols;
  // fonte das células: a do corpo, encolhida se a célula mais larga não couber
  usarFonte(ctx, F.corpo);
  const maior = Math.max(...c.linhas.flat().map((s) => ctx.measureText(String(s)).width), 1);
  const fCel = escalar(F.corpo, Math.min(F.corpo.px, (F.corpo.px * colW * 0.85) / maior));
  const fCab = escalar(F.kicker, Math.min(F.kicker.px, fCel.px));
  const altLinha = Math.max(fCel.px * 2.1, 72);
  const nota = c.nota ? linhasDe(ctx, F.corpo, c.nota, livre.w) : [];
  const total = (c.linhas.length + 1) * altLinha + (nota.length ? kit.layout.gap + nota.length * F.corpo.line : 0);
  const y0 = livre.y + (livre.h - total) / 2;
  const xCel = (j) => livre.x + j * colW;
  const meioY = (i) => y0 + i * altLinha + altLinha / 2;

  // linhas horizontais da grade
  const pGrade = prog(t, tp.ini, tp.ini + 0.5, ease.inOutCubic);
  for (let i = 1; i <= c.linhas.length; i++) {
    ctx.save(); ctx.globalAlpha *= i === 1 ? 0.9 : 0.4;
    revelarTraco(ctx, [{ x: livre.x, y: y0 + i * altLinha }, { x: livre.x + livre.w, y: y0 + i * altLinha }], pGrade, kit, t, { cor: cores.tintaSuave, largura: i === 1 ? 4 : 2, comCaneta: false });
    ctx.restore();
  }

  // cabeçalho
  usarFonte(ctx, fCab); ctx.fillStyle = cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  c.colunas.forEach((s, j) => {
    const p = clamp((t - tp.ini - j * 0.08) / 0.25);
    if (p <= 0 || !s) return;
    ctx.save(); ctx.globalAlpha *= p; ctx.fillText(caixa(fCab, s), xCel(j) + colW / 2, meioY(0)); ctx.restore();
  });

  // células, linha por linha
  usarFonte(ctx, fCel);
  c.linhas.forEach((l, i) => {
    l.forEach((s, j) => {
      const p = prog(t, tp.linhas[i] + j * 0.08, tp.linhas[i] + j * 0.08 + 0.4, ease.outExpo);
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha *= p;
      ctx.fillStyle = j === 0 && !c.colunas[0] ? cores.tintaSuave : cores.tinta;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(s), xCel(j) + colW / 2, meioY(i + 1) + (1 - p) * 14);
      ctx.restore();
    });
  });

  // destaque
  if (c.destaque && tp.destaque != null) {
    const { linha, coluna } = c.destaque;
    const x = xCel(coluna - 1) + 6, y = y0 + linha * altLinha + 6, w = colW - 12, h = altLinha - 12;
    const p = prog(t, tp.destaque, tp.destaque + 0.5, ease.inOutCubic);
    if (p >= 1) { ctx.save(); ctx.globalAlpha *= 0.15; ctx.fillStyle = cores.verde; ctx.fillRect(x, y, w, h); ctx.restore(); }
    revelarTraco(ctx, [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }], p, kit, t, { cor: cores.verde, largura: 6 });
  }

  if (nota.length) {
    usarFonte(ctx, F.corpo); ctx.fillStyle = cores.tintaSuave; ctx.textBaseline = "alphabetic";
    const yN = y0 + (c.linhas.length + 1) * altLinha + kit.layout.gap;
    nota.forEach((l, j) => escrever(ctx, l, livre.x + livre.w / 2, yN + j * F.corpo.line + linhaBase(F.corpo), (t - tp.nota) / Math.max(0.4, l.length * kit.movimento.duracoes.escrita_por_caractere), kit, t, { alinhar: "center" }));
  }
}
```

- [ ] **Step 5: Registrar**

Em `cenas/index.mjs`: importe `grafico` e `tabela`; `export const CENAS = { texto, impacto, odometro, grafo, conta, grafico, tabela };`.

- [ ] **Step 6: Acrescentar ao `GUIA.md`**

Na lista "Quando usar cada tipo":

```markdown
- **grafico** — programação linear em 2 variáveis: eixos, restrições, região viável e ponto ótimo.
- **tabela** — comparar poucos números (até 6 linhas × 4 colunas), com uma célula em destaque.
```

E as seções:

```markdown
## grafico

    { "tipo": "grafico", "duracao": 10, "titulo": "ONDE O LUCRO É MAIOR",
      "eixos": { "x": { "rotulo": "pães", "max": 8 }, "y": { "rotulo": "bolos", "max": 6 } },
      "restricoes": [{ "a": 1, "b": 2, "c": 8, "rotulo": "forno" }, { "a": 1, "b": 1, "c": 6, "rotulo": "massa" }],
      "otimo": { "x": 4, "y": 2, "rotulo": "Z* = R$ 220" } }

Cada restrição é `a·x + b·y ≤ c` (para "≥", multiplique tudo por −1). `max` dos eixos um pouco acima do maior intercepto. O gerador recusa região vazia e ótimo fora dela. Restrições, ótimo e valor entram na Checagem (refaça a conta nos vértices).

## tabela

    { "tipo": "tabela", "duracao": 8, "titulo": "O QUE CADA UM RENDE", "colunas": ["", "Pão", "Bolo"],
      "linhas": [["Forno", "1 h", "2 h"], ["Lucro", "R$ 20", "R$ 50"]], "destaque": { "linha": 2, "coluna": 3 } }

Campos: `colunas` (2 a 4, ≤ 12; a primeira pode ser `""` quando a coluna é de rótulos), `linhas` (1 a 6, mesmo número de células), `destaque` `{ linha, coluna }` contando de 1 (sem o cabeçalho), `nota` ≤ 60, `kicker`, `titulo`.
```

- [ ] **Step 7: Rodar e ver passar**

Run: `node --test tests/motion-cenas.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 8: Conferir à vista**

```bash
node -e '
import("./design-system/scripts/motion/renderizar.mjs").then(async ({ fotografar }) => {
  const { montarComposicao } = await import("./design-system/motion/composicao.mjs");
  const { validarCena } = await import("./design-system/motion/cenas/index.mjs");
  const v = (c) => { const r = validarCena(c, "cena", { formato: "reel" }); if (r.erros.length) throw new Error(r.erros[0]); return r.cena; };
  const g = { tipo: "grafico", duracao: 10, titulo: "ONDE O LUCRO É MAIOR", eixos: { x: { rotulo: "pães", max: 8 }, y: { rotulo: "bolos", max: 6 } }, restricoes: [{ a: 1, b: 2, c: 8, rotulo: "forno" }, { a: 1, b: 1, c: 6, rotulo: "massa" }], otimo: { x: 4, y: 2, rotulo: "Z* = R$ 220" } };
  const t = { tipo: "tabela", duracao: 8, titulo: "O QUE CADA UM RENDE", colunas: ["", "Pão", "Bolo"], linhas: [["Forno", "1 h", "2 h"], ["Lucro", "R$ 20", "R$ 50"]], destaque: { linha: 2, coluna: 3 } };
  console.log(await fotografar(montarComposicao([v(g), v(t)], { formato: "reel", usuario: "pesquisaoperacionalparatodos" }), [2, 3.6, 5, 6.5, 9.8, 13, 17.8], "/tmp/motion-grafico"));
});'
```

Abra os PNGs. Esperado: eixos desenhados, retas das restrições com rótulos, região verde translúcida entrando da esquerda, ótimo pulsando com "Z* = R$ 220" sem virar maiúscula; tabela com cabeçalho "PÃO / BOLO", linhas entrando e a célula "R$ 50" emoldurada em verde.

- [ ] **Step 9: Commit**

```bash
git add design-system/motion tests/motion-cenas.test.mjs
git commit -m "motion: Cenas grafico (região viável) e tabela"
```

---

### Task 10: Corte com moldura animada

**Files:**
- Create: `design-system/motion/cenas/moldura.mjs`
- Modify: `design-system/motion/cenas/index.mjs` (`INTERNAS`), `design-system/scripts/gerar-reel.mjs` (`gerarDeCorte`, `argsMoldura`, `gerarReel`), `.gitignore`
- Test: `tests/reel.test.mjs`, `tests/motion-cenas.test.mjs`

**Interfaces:**
- Consumes: `montarComposicao` (formato `"moldura"`, Task 4), `renderizar` (Task 5), `escrita.mjs`.
- Produces (`moldura.mjs`): contrato de Cena; é **interna** (fica em `INTERNAS`, não em `CENAS`: `reel.json` não aceita `tipo: "moldura"`). Campos: `titulo`, `faixa`, `duracao`.
- Produces (`gerar-reel.mjs`): `composicaoDaMoldura(dados, duracao) → comp`; `argsMoldura({ moldura, bruto, saida })` agora recebe a moldura em **MP4** (não PNG); `gerarReel(pasta, { …, renderizar })` usa `renderizar` também no Corte (sai a opção `exportar`).
- O som do Corte continua o original do vídeo (`-map 1:a?`); a moldura não tem Trilha nem Efeitos.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/motion-cenas.test.mjs`, acrescente:

```js
import { INTERNAS } from "../design-system/motion/cenas/index.mjs";

test("moldura (interna): kicker, título e barra de progresso que acompanha o tempo; reel.json não aceita", () => {
  assert.ok(!TIPOS_DE_CENA.includes("moldura"));
  assert.match(validarCena({ tipo: "moldura", duracao: 30 }, "cena 1", { formato: "reel" }).erros[0], /tipo de cena "moldura" não existe/);
  const cena = { tipo: "moldura", duracao: 50, titulo: "EXEMPLO: O PRIMAL", linha: INTERNAS.moldura.linhaDoTempo() };
  const ctx = ctxFalso();
  INTERNAS.moldura.desenhar(ctx, cena, 25, kitFalso());
  const ts = textos(ctx).map((x) => x.s);
  assert.ok(ts.includes("CORTE DA AULA") && ts.includes("EXEMPLO: O PRIMAL"));
  const barras = ctx.chamadas.filter((c) => c[0] === "fillRect").map((c) => c[3]);
  const cheia = 1080 - 2 * 72;
  assert.ok(barras.includes(cheia) && barras.some((w) => Math.abs(w - cheia / 2) < 1), "trilho inteiro e metade preenchida aos 25 de 50 s");
});
```

Em `tests/reel.test.mjs`, troque o teste `argsMoldura…` e o teste `gerarReel (corte)…` por:

```js
test("argsMoldura põe o vídeo 16:9 centrado sobre a moldura animada (MP4), em 30 fps, com o áudio original", () => {
  const a = argsMoldura({ moldura: "/p/reel-moldura.mp4", bruto: "/p/b.mp4", saida: "/p/reel.mp4" });
  const fc = a[a.indexOf("-filter_complex") + 1];
  assert.ok(fc.includes("scale=1080:-2") && fc.includes("fps=30") && fc.includes("overlay=0:(H-h)/2") && fc.includes("shortest=1") && fc.includes("yuv420p"));
  assert.ok(!a.includes("-loop"), "a moldura agora é vídeo");
  assert.ok(a.includes("/p/reel-moldura.mp4") && a.includes("1:a?") && a.includes("aac") && a.at(-1) === "/p/reel.mp4");
});

test("gerarReel (corte): baixa o trecho, grava a moldura animada do tamanho do corte, sobrepõe e limpa", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  const videos = join(pasta, "videos"); mkdirSync(join(videos, "folgas-complementares"), { recursive: true });
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "public" }));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify(corte));
  const chamadas = [], molduras = [];
  const executar = async (bin, args) => { chamadas.push({ bin, args }); const o = args.indexOf("-o"); writeFileSync(o >= 0 ? args[o + 1] : args.at(-1), "x"); };
  const renderizar = async (comp, o) => { molduras.push({ comp, o }); writeFileSync(o.mp4, "m"); writeFileSync(o.png, "p"); return o.mp4; };
  const saida = await gerarReel(pasta, { executar, renderizar, raizVideos: videos, ytDlp: "/bin/yt-dlp" });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.deepEqual(chamadas.map((c) => c.bin), ["/bin/yt-dlp", (await import("ffmpeg-static")).default]);
  const [{ comp, o }] = molduras;
  assert.equal(comp.formato, "moldura"); assert.equal(comp.duracao, 50); assert.equal(comp.cenas[0].titulo, "EXEMPLO: O PRIMAL");
  assert.equal(o.audio, null, "a moldura não tem som; o áudio é o do vídeo");
  assert.ok(chamadas[1].args.includes(join(pasta, "reel-moldura.mp4")));
  assert.ok(!existsSync(join(pasta, "corte-bruto.mp4")) && !existsSync(join(pasta, "reel-moldura.mp4")));
  assert.ok(existsSync(join(pasta, "reel.png")));
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "private" }));
  await assert.rejects(gerarReel(pasta, { executar, renderizar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /público/);
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "public" }));
  await assert.rejects(gerarReel(pasta, { ver: true, executar, renderizar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /--ver/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/reel.test.mjs tests/motion-cenas.test.mjs`
Expected: FAIL — `INTERNAS.moldura` não existe; `argsMoldura` ainda usa `-loop`.

- [ ] **Step 3: Escrever `cenas/moldura.mjs`**

```js
// Cena interna "moldura": o que fica em volta do vídeo de um Corte (o ffmpeg põe o vídeo por cima, no
// meio): kicker "CORTE DA AULA" digitado, título subindo (três tamanhos, como na moldura em HTML) e uma
// barra de progresso verde logo abaixo do vídeo. Sem som: o Corte mantém o áudio original.

import { linhasDe, digitar, subir, caixa } from "../escrita.mjs";
import { clamp } from "../util.mjs";

export const usaGrade = false;
export const validar = () => [];
export const linhaDoTempo = () => ({ fim: 0.3, eventos: [] });

export function desenhar(ctx, c, t, kit) {
  const { area, video, gap, lockup, largura: W } = kit.layout, F = kit.fontes, cores = kit.cores;
  const n = c.titulo.length;
  const f = n > 30 ? F.tituloPequeno : n > 20 ? F.tituloMedio : F.titulo;
  const linhas = linhasDe(ctx, f, c.titulo, area.w);
  const y0 = area.y + area.h - (F.kicker.line + gap + linhas.length * f.line);   // encostado embaixo, como o CSS (flex-end)
  digitar(ctx, [caixa(F.kicker, "CORTE DA AULA")], F.kicker, area.x, y0, t, 0, cores.verdeSuave);
  subir(ctx, linhas, f, area.x, y0 + F.kicker.line + gap, t, 0.3, cores.verde, kit, { largura: area.w });
  const x = lockup.x, largura = W - 2 * lockup.x, y = video.y + video.h + 16;
  ctx.save();
  ctx.globalAlpha *= 0.25; ctx.fillStyle = cores.tintaSuave; ctx.fillRect(x, y, largura, 8);
  ctx.restore();
  ctx.fillStyle = cores.verde;
  ctx.fillRect(x, y, largura * clamp(t / c.duracao), 8);
}
```

- [ ] **Step 4: Registrar como interna**

Em `cenas/index.mjs`: `import * as moldura from "./moldura.mjs";` e `export const INTERNAS = { moldura };`.

- [ ] **Step 5: Atualizar `gerar-reel.mjs` (Corte)**

Import: `import { INTERNAS } from "../motion/cenas/index.mjs";`. Tire `exportarPng` do import de `./modelo-html.mjs` (fica só `preencher`, usado por `htmlDaMoldura`, que continua — é o molde da calibração).

```js
// Moldura animada (MP4 do motor) por baixo, vídeo 16:9 redimensionado à largura, em 30 fps, centrado; áudio original se houver.
export function argsMoldura({ moldura, bruto, saida }) {
  return [
    "-y", "-loglevel", "error", "-i", moldura, "-i", bruto,
    "-filter_complex", "[1:v]scale=1080:-2:flags=lanczos,fps=30[v];[0:v][v]overlay=0:(H-h)/2:shortest=1,format=yuv420p[out]",
    "-map", "[out]", "-map", "1:a?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    saida,
  ];
}

export function composicaoDaMoldura(dados, duracao) {
  const cena = { tipo: "moldura", duracao, titulo: dados.titulo, faixa: dados.faixa, minimo: duracao, linha: INTERNAS.moldura.linhaDoTempo() };
  return montarComposicao([cena], { formato: "moldura", usuario: USUARIO });
}

async function gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, renderizar }) {
  const pub = join(raizVideos, dados.video, "publicacao.json");
  if (!existsSync(pub)) throw new ErroReel(`não achei ${pub} — o vídeo "${dados.video}" precisa estar publicado`);
  const publicacao = JSON.parse(readFileSync(pub, "utf8"));
  if (publicacao.privacidade !== "public") throw new ErroReel(`o vídeo "${dados.video}" precisa estar público (publicacao.json diz "${publicacao.privacidade}") — se já tornou público, troque para "public" no arquivo`);
  const ff = await ffmpeg();
  const bruto = join(pasta, "corte-bruto.mp4"), moldura = join(pasta, "reel-moldura.mp4"), reel = join(pasta, "reel.mp4");
  try {
    await executar(ytDlp ?? acharYtDlp(), argsYtDlp({ url: publicacao.url, inicio: dados.inicio, fim: dados.fim, saida: bruto, ffmpegDir: dirname(ff) }));
    if (!existsSync(bruto)) throw new ErroReel("yt-dlp terminou sem gerar corte-bruto.mp4 — o vídeo está público? a URL em publicacao.json está certa?");
    const duracao = segundos(dados.fim) - segundos(dados.inicio);
    await renderizar(composicaoDaMoldura(dados, duracao), { mp4: moldura, png: join(pasta, "reel.png"), audio: null, capaEm: Math.min(2.5, duracao) });
    await executar(ff, argsMoldura({ moldura, bruto, saida: reel }));
  } finally {
    for (const a of [bruto, moldura]) if (existsSync(a)) unlinkSync(a);
  }
  return reel;
}
```

Em `gerarReel`: tire `exportar = exportarPng` da assinatura e chame `gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, renderizar })`. No cabeçalho do arquivo, troque "posto numa moldura de marca" por "posto numa moldura de marca animada (título, barra de progresso), com o áudio original".

Em `.gitignore`, no bloco dos reels, acrescente `instagram/**/reel-moldura.mp4`.

- [ ] **Step 6: Rodar e ver passar**

Run: `node --test tests/reel.test.mjs tests/motion-cenas.test.mjs && npm test`
Expected: PASS (inclusive `calibrar.test.mjs`, que ainda usa `htmlDaMoldura`).

- [ ] **Step 7: Conferir à vista (sem baixar nada)**

```bash
node -e '
import("./design-system/scripts/motion/renderizar.mjs").then(async ({ fotografar }) => {
  const { composicaoDaMoldura } = await import("./design-system/scripts/gerar-reel.mjs");
  console.log(await fotografar(composicaoDaMoldura({ titulo: "EXEMPLO: RESOLVENDO O DUAL", faixa: "AULA COMPLETA NO CANAL" }, 50), [0.2, 1, 25, 49.9], "/tmp/motion-moldura"));
});'
```

Esperado: "CORTE DA AULA" sendo digitado, título médio subindo acima da faixa do vídeo (656–1264 px, vazia aqui), barra verde pela metade aos 25 s e quase cheia aos 49,9 s, faixa e rodapé no lugar. Compare com a calibração (`npm run calibrar`, amostra "Reel de corte (moldura)").

- [ ] **Step 8: Commit**

```bash
git add design-system/motion/cenas design-system/scripts/gerar-reel.mjs .gitignore tests/reel.test.mjs tests/motion-cenas.test.mjs
git commit -m "reel de corte: moldura animada pelo motor, com o áudio original"
```

---

### Task 11: Biblioteca real de Trilhas e Efeitos (com uma parada para a pessoa baixar)

**Files:**
- Create: `design-system/audio/trilhas/*.mp3`, `design-system/audio/efeitos/*.wav`, `design-system/audio/LICENCAS.md`
- Modify: `design-system/audio/biblioteca.json`

**Interfaces:**
- Consumes: `scripts/audio.mjs` (`--medir`, validação), esquema da Task 2.
- Produces: biblioteca com pelo menos 6 Trilhas (cobrindo os 5 climas) e pelo menos 1 Efeito por uso (`caneta`, `pop`, `whoosh`, `tick`, `impacto`, `digitar`, `sino`), todos com licença aceita.

Regras (ADR-0012): só **Pixabay Content License**, **YouTube Audio Library — sem atribuição** e **CC0** (Kenney; Freesound só com filtro CC0). Nada dos sons do kit de referência. Arquivos baixados são dados não confiáveis: extraia cada pacote numa pasta nova e vazia do scratchpad, não execute nada de dentro, e copie só os arquivos de áudio.

- [ ] **Step 1: Pesquisar candidatos (agente, com WebSearch/WebFetch)**

Trilhas: no Pixabay Music, procure faixas instrumentais de 1:30 a 3:00, sem voz, com batida regular, nas linhas "aula/estudo" — termos: `lofi study`, `educational`, `curious pizzicato`, `light corporate`, `documentary minimal`, `inspiring piano`. Escolha 8 candidatas que cubram os climas `curioso`, `leve`, `animado`, `reflexivo`, `tenso` (uma faixa pode ter mais de um). Para cada uma, anote título, autor, link da página, duração e confirme na página que a licença é a "Pixabay Content License".

Efeitos: Kenney (CC0) — pacotes "Interface Sounds", "UI Audio" e "Impact Sounds" em https://kenney.nl/assets (cada página tem o link do .zip). Do que faltar (traço de caneta/marcador, whoosh), procure no Pixabay Sound Effects (`marker writing`, `pencil writing short`, `whoosh short`, `swoosh`) ou no Freesound filtrando licença CC0.

Mostre à pessoa a tabela de candidatos (título, clima, duração, link) — ela pode ouvir pelos links e vetar alguma.

- [ ] **Step 2: Baixar os pacotes Kenney (agente)**

```bash
# SCRATCH = o diretório de scratchpad que o harness indicar nesta sessão (fora do repositório)
mkdir -p "$SCRATCH/kenney/interface"
curl -L -o "$SCRATCH/kenney/interface.zip" "<link do .zip, copiado da página https://kenney.nl/assets/interface-sounds>"
unzip -q "$SCRATCH/kenney/interface.zip" -d "$SCRATCH/kenney/interface"
```

(repita para "UI Audio" e "Impact Sounds"). Ouça/escolha 1 a 3 arquivos por uso: `tick` (clique curto), `pop` (bolha/confirmação curta), `digitar` (tecla), `impacto` (batida seca), `sino` (confirmação aguda).

- [ ] **Step 3: PARADA — a pessoa baixa o que pede login**

O Pixabay costuma pedir login para baixar. Passe à pessoa uma lista numerada, por exemplo:

```
1. Abra <link da trilha 1> e clique em "Download" (MP3).
2. Salve o arquivo em: design-system/audio/trilhas/ com o nome passos-curiosos.mp3
3. …
```

Espere a pessoa dizer que baixou. Confira: `ls -la design-system/audio/trilhas/`.

- [ ] **Step 4: Preparar os efeitos**

Cada efeito sai em WAV, sem silêncio no começo, com o pico em −3 dBFS (assim os ganhos de `movimento.json` valem igual para todos) e no máximo 1,5 s:

```bash
FF="$(node -e 'import("ffmpeg-static").then(m=>process.stdout.write(m.default))')"
"$FF" -y -loglevel error -i "<arquivo de origem>" -af "silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:1.5,afade=t=out:st=1.3:d=0.2,loudnorm=I=-16:TP=-3" -ar 44100 -ac 2 design-system/audio/efeitos/<uso>-<n>.wav
```

Nomes: `caneta-1.wav`, `pop-1.wav`, `whoosh-1.wav`, `tick-1.wav`, `tick-2.wav`, `impacto-1.wav`, `digitar-1.wav`, `sino-1.wav` …

- [ ] **Step 5: Medir as Trilhas**

Para cada faixa: `node scripts/audio.mjs --medir design-system/audio/trilhas/<nome>.mp3` → `{"bpm":…,"primeira_batida":…,"duracao":…}`. Se o BPM sair o dobro ou a metade do que se ouve (comum em faixas lentas), registre o que se ouve — o encaixe usa compassos, então dobro/metade ainda cai na batida, mas o número certo ajuda a escolher.

- [ ] **Step 6: Registrar**

Preencha `design-system/audio/biblioteca.json` (uma entrada por arquivo, com `fonte`, `link` da página de origem e `licenca` exata) e escreva `design-system/audio/LICENCAS.md`:

```markdown
# Licenças do áudio

Todo som usado nos vídeos do Instagram vem de fonte gratuita com licença explícita para uso comercial (ADR-0012). A fonte da verdade é `biblioteca.json`; esta tabela é para gente.

| Arquivo | Tipo | Origem | Licença |
|---|---|---|---|
| trilhas/passos-curiosos.mp3 | Trilha (curioso, leve) | <autor> — <link> | Pixabay Content License |
| efeitos/tick-1.wav | Efeito (tick) | Kenney, Interface Sounds — https://kenney.nl/assets/interface-sounds | CC0 |
| … | | | |

- **Pixabay Content License**: uso comercial gratuito, sem atribuição obrigatória; não vender o arquivo isolado. https://pixabay.com/service/license-summary/
- **CC0**: domínio público. https://creativecommons.org/publicdomain/zero/1.0/
- **YouTube Audio Library — sem atribuição**: uso livre em vídeos, sem crédito. https://studio.youtube.com (Biblioteca de áudio)
```

- [ ] **Step 7: Validar**

Run: `node scripts/audio.mjs`
Expected: `N trilha(s), M efeito(s).` e uma linha por trilha; **nenhum** "aviso: nenhum efeito para …".

Run: `npm test`
Expected: PASS (o teste "a biblioteca do repositório é válida" agora confere os arquivos de verdade).

Run: `du -sh design-system/audio`
Expected: até ~40 MB. Se passar, troque as faixas mais longas por versões mais curtas.

- [ ] **Step 8: Commit**

```bash
git add design-system/audio
git commit -m "áudio: biblioteca de trilhas (Pixabay) e efeitos (Kenney CC0) com licenças"
```

---

### Task 12: Skills, guias e documentação

**Files:**
- Modify: `.claude/skills/reel/SKILL.md`, `.claude/skills/stories/SKILL.md`, `.claude/skills/pacote/SKILL.md`, `design-system/instagram/GUIA-AGENTE.md`, `CLAUDE.md`, `README.md`, `instagram/_modelo/reel.json`, `.gitignore`

Use a skill `writing-for-agents` ao editar `SKILL.md` e `CLAUDE.md`. Leitor do README: alguém que não programa — passos numerados, comando exato, o que aparece na tela.

- [ ] **Step 1: `instagram/_modelo/reel.json`**

Troque pelo modelo com os tipos novos (a Trilha é uma das ids reais da biblioteca da Task 11 — confira com `node scripts/audio.mjs`):

```json
{
  "tipo": "cenas",
  "trilha": "<id de uma trilha da biblioteca>",
  "cenas": [
    { "tipo": "impacto", "duracao": 3, "palavras": ["UMA PERGUNTA", "QUE PARECE FÁCIL"] },
    { "duracao": 6, "kicker": "O PROBLEMA", "titulo": "O ENUNCIADO EM UMA FRASE", "linhas": ["O dado que importa", "O que se quer decidir"] },
    { "tipo": "conta", "duracao": 6, "titulo": "A CONTA", "linhas": ["2 + 3 = 5"], "destaque": 1 },
    { "duracao": 6, "kicker": "A RESPOSTA", "titulo": "O QUE ISSO ENSINA", "linhas": ["Uma linha com a ideia"], "faixa": "AULA COMPLETA NO CANAL" }
  ],
  "legenda": { "gancho": "Gancho de até 125 caracteres.", "corpo": "Corpo da legenda.", "hashtags_tema": ["#PesquisaOperacional", "#Otimizacao", "#Tema"] }
}
```

Run: `node -e 'import("./design-system/scripts/gerar-reel.mjs").then(m=>console.log(m.validarReel(JSON.parse(require("fs").readFileSync("instagram/_modelo/reel.json","utf8")))))'`
Expected: `[]`.

- [ ] **Step 2: skill `reel`**

Na seção "2a. Cenas (do zero)", troque o item 1 por:

```markdown
1. Comece de `instagram/_modelo/reel.json`. Os tipos de Cena, os campos e quando usar cada um estão em `design-system/motion/GUIA.md` — leia antes. Mire 25 a 45 s no total (o limite técnico é 15 a 90), 3 a 6 Cenas de 3 a 8 s; a primeira é um `impacto` (palavra na tela em até 2 s); use `grafo`, `conta`, `grafico`, `tabela` ou `odometro` quando o tema tiver isso — um reel só de `texto` é a exceção; a última Cena tem `faixa` apontando para o canal. `legenda`: gancho ≤ 125, corpo, 3 a 4 `hashtags_tema` (`#CamelCase`).
2. **Trilha**: `node scripts/audio.mjs` lista as faixas com clima e BPM. Escolha pelo clima do reel (curioso, leve, animado, reflexivo, tenso) e ponha a id em `"trilha"`. As trocas de Cena vão cair no compasso dela — por isso as durações finais podem mudar alguns décimos.
```

E renumere a Checagem para o item 3, acrescentando: "Números do `odometro`, linhas da `conta`, pesos e caminho do `grafo`, restrições e ótimo do `grafico` e células da `tabela` também viram entradas (`onde: \"cena N\"`)."

Na seção "3. Gerar", antes do comando de geração, acrescente:

```markdown
Para olhar antes de gravar: `node design-system/scripts/gerar-reel.mjs instagram/<pasta> --ver` abre a prévia no navegador, com som; arraste a linha do tempo. Ajuste o `reel.json` e recarregue a página com o comando de novo. Feche com Ctrl+C.
```

E troque "veja inteiro: texto legível, áudio presente no corte, nada cortado na moldura" por "veja inteiro **com som**: texto legível, nada encostando no rodapé, Trilha presente nas Cenas e áudio original no Corte, sons dos efeitos batendo com o que aparece".

Na seção "4. PARADA", acrescente ao que se mostra: "o nome da Trilha e a licença (de `design-system/audio/biblioteca.json`)".

- [ ] **Step 3: skill `stories`**

Troque a frase dos limites (`Comece de instagram/_modelo/stories.json. Limites e campos: …`) por:

```markdown
Comece de `instagram/_modelo/stories.json`. Cada story é uma Cena do motor de motion: os tipos e campos estão em `design-system/motion/GUIA.md` (sem `tipo` é `texto`, o formato de sempre: até 10 stories, 5 a 60 s cada, kicker 40, título 60, linha 90, pergunta 60, dica 30, faixa 40). Num quiz, a resposta pode ser um `odometro` (o número certo girando) ou uma `conta`. Story não leva Trilha — só Efeitos sonoros discretos, automáticos.
```

E no passo de geração acrescente a prévia: `node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --ver`.

- [ ] **Step 4: skill `pacote`**

Onde a skill fala do reel, acrescente uma linha: "O reel de Cenas sai com Trilha e Efeitos (skill `reel`, passo da Trilha); o Corte mantém o áudio da aula."

- [ ] **Step 5: `GUIA-AGENTE.md` do Instagram**

Na lista de comandos (perto da l.55-64), acrescente:

```
node design-system/scripts/gerar-reel.mjs instagram/<pasta> --ver         # prévia do reel no navegador, com som
node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --ver  # prévia dos stories
node scripts/audio.mjs                                                    # Trilhas e Efeitos disponíveis (clima, BPM, licença)
```

E uma linha logo acima da lista: "Vídeos (reels, stories, story de aviso) são desenhados pelo motor de motion: tipos de Cena em `design-system/motion/GUIA.md`; som em `design-system/audio/` (ADR-0011, ADR-0012)."

- [ ] **Step 6: `CLAUDE.md`**

Na lista de scripts, troque a linha do `gerar-story-video.mjs` e a do `gerar-reel.mjs` acrescentando ` (\`--ver\`: prévia no navegador, com som)` e acrescente:

```markdown
- `node scripts/audio.mjs [--medir <arquivo>]` — biblioteca de Trilhas e Efeitos sonoros (`design-system/audio/biblioteca.json`, só licença gratuita explícita, `docs/adr/0012`); `--medir` dá BPM e primeira batida de uma faixa nova.
```

Na seção "Fluxo de um post do Instagram", depois do parágrafo do `/reel`, acrescente:

```markdown
Reels, stories e story de aviso saem do motor de motion (`design-system/motion/`, Canvas2D no Chrome, `docs/adr/0011`): cada Cena tem um `tipo` (`texto`, `impacto`, `odometro`, `grafo`, `conta`, `grafico`, `tabela` — `design-system/motion/GUIA.md`) e a geometria vem do mesmo CSS da calibração. Reel de Cenas leva Trilha e Efeitos; story só Efeitos; Corte só o áudio original.
```

- [ ] **Step 7: `README.md`**

Acrescente uma seção para quem opera o canal (no mesmo tom das seções do Instagram), por exemplo "Ver um vídeo do Instagram antes de gravar" e "Pôr uma música nova na biblioteca":

```markdown
### Ver um vídeo do Instagram antes de gravar

1. No terminal, na pasta do projeto, rode (troque a pasta pela sua):
   `node design-system/scripts/gerar-reel.mjs instagram/2026-10-20-meu-reel --ver`
2. O navegador abre com o vídeo, um botão **▶ Tocar** e uma barra de tempo. Aperte espaço para tocar/pausar; as setas andam um quadro.
3. Para fechar, volte ao terminal e aperte **Ctrl+C**.

Para stories, o comando é o mesmo com `gerar-story-video.mjs`.

### Pôr uma música nova na biblioteca

Só entra música de graça e com licença clara (Pixabay, Biblioteca de áudio do YouTube "sem atribuição", ou CC0).

1. Baixe o MP3 e salve em `design-system/audio/trilhas/` com um nome curto, sem espaços (ex.: `passos-curiosos.mp3`).
2. Rode `node scripts/audio.mjs --medir design-system/audio/trilhas/passos-curiosos.mp3`. Aparece algo como `{"bpm":96,"primeira_batida":0.42,"duracao":142.3}`.
3. Peça ao Claude: "registra essa trilha na biblioteca, clima leve, link <página da música>". Ou edite `design-system/audio/biblioteca.json` copiando uma entrada que já existe.
4. Rode `node scripts/audio.mjs`. Se aparecer `erro: …`, a mensagem diz o que falta.
```

- [ ] **Step 8: `.gitignore`**

Acrescente:

```
# pilotos do motor de motion (Task 13 do plano 2026-10-12), nunca versionados
instagram/_piloto-*/
```

- [ ] **Step 9: Rodar e commitar**

Run: `npm test`
Expected: PASS.

```bash
git add .claude/skills design-system/instagram/GUIA-AGENTE.md CLAUDE.md README.md instagram/_modelo/reel.json .gitignore
git commit -m "docs: motor de motion e som nas skills, no guia, no CLAUDE.md e no README"
```

---

### Task 13: Pilotos e aprovação (PARADA)

**Files:**
- Create (não versionados): `instagram/_piloto-konigsberg/reel.json`, `instagram/_piloto-quiz-nobel/stories.json`, `instagram/_piloto-comparar.html`

Nada aqui toca em pasta agendada; as pastas `_piloto-*` estão no `.gitignore`.

- [ ] **Step 1: Piloto do reel — Königsberg**

`instagram/_piloto-konigsberg/reel.json` — o mesmo conteúdo do reel aprovado (`instagram/2026-10-19-pontes-de-konigsberg/reel.json`), reescrito com os tipos novos e uma Trilha `curioso` da biblioteca:

```json
{
  "tipo": "cenas",
  "trilha": "<id de uma trilha com clima curioso>",
  "cenas": [
    { "tipo": "impacto", "duracao": 3.5, "palavras": ["7 PONTES", "1 PASSEIO"], "apoio": "sem repetir nenhuma ponte" },
    { "duracao": 7, "kicker": "O QUE EULER ESCREVEU", "titulo": "UMA QUESTÃO “BANAL”", "linhas": ["Em cartas de 1736, Euler chamou o problema de banal", "Mesmo assim, escreveu um artigo inteiro sobre ele"] },
    { "tipo": "grafo", "duracao": 8, "kicker": "A IDEIA", "titulo": "REGIÕES VIRAM PONTOS",
      "nos": [{ "id": "N", "x": 4, "y": 1, "rotulo": "norte" }, { "id": "I", "x": 4, "y": 5, "rotulo": "ilha" }, { "id": "S", "x": 4, "y": 9, "rotulo": "sul" }, { "id": "L", "x": 9, "y": 5, "rotulo": "leste" }],
      "arestas": [{ "de": "N", "para": "I" }, { "de": "N", "para": "I" }, { "de": "S", "para": "I" }, { "de": "S", "para": "I" }, { "de": "N", "para": "L" }, { "de": "I", "para": "L" }, { "de": "S", "para": "L" }],
      "legenda": "cada ponte vira uma ligação" },
    { "tipo": "conta", "duracao": 7, "kicker": "A RESPOSTA", "titulo": "PONTES EM CADA REGIÃO", "linhas": ["ilha: 5", "norte: 3  sul: 3  leste: 3", "4 regiões ímpares"], "destaque": 3, "nota": "mais de 2 ímpares: o passeio é impossível" },
    { "duracao": 6, "kicker": "O QUE NASCEU DALI", "titulo": "A TEORIA DOS GRAFOS", "linhas": ["Menor caminho, árvore geradora, fluxo máximo: tudo é grafo"], "icone": "grafo-caminho", "faixa": "AULA COMPLETA NO CANAL" }
  ],
  "legenda": { "gancho": "Piloto do motor de motion — não publicar.", "corpo": "Piloto.", "hashtags_tema": ["#TeoriaDosGrafos", "#Euler", "#Piloto"] }
}
```

(Os números — 5, 3, 3, 3; quatro regiões ímpares — são os mesmos já checados no `checagem.json` do reel aprovado.)

Run: `node design-system/scripts/gerar-reel.mjs instagram/_piloto-konigsberg`
Expected: `instagram/_piloto-konigsberg/reel.mp4` em cerca de 30 s de vídeo (com o encaixe no compasso).

- [ ] **Step 2: Piloto dos stories — quiz do Nobel**

`instagram/_piloto-quiz-nobel/stories.json` — o quiz aprovado, com a resposta virando um `odometro` seguido do resto da explicação:

```json
{
  "tipo": "stories",
  "publicacao": "api",
  "stories": [
    { "duracao": 12, "kicker": "UM DESAFIO", "titulo": "UM NOBEL PARA A OTIMIZAÇÃO",
      "linhas": ["Três anos em que o Nobel de Economia premiou temas que a PO estuda:", "1975", "1994", "2012"],
      "pergunta": "Qual deles premiou a alocação ótima de recursos?", "dica": "Sabe a resposta?" },
    { "tipo": "odometro", "duracao": 6, "kicker": "A RESPOSTA", "valor": 1975, "rotulo": "Kantorovich e Koopmans, pela alocação ótima" },
    { "duracao": 13, "kicker": "E OS OUTROS?", "titulo": "DANTZIG, DO SIMPLEX, FICOU DE FORA",
      "linhas": ["1994: Harsanyi, Nash e Selten, por equilíbrios em jogos não cooperativos.", "2012: Roth e Shapley, por alocações estáveis e desenho de mercados.", "A pegadinha: 2012 também fala em alocação, mas o critério é a estabilidade."],
      "dica": "Acertou?" },
    { "duracao": 11, "kicker": "SEGUNDA, 12/10", "titulo": "SAI O NOBEL DE ECONOMIA DE 2026",
      "linhas": ["Anúncio em Estocolmo, a partir de 6h45 no horário de Brasília.", "Transmissão ao vivo nos canais oficiais do Nobel.", "Até lá: simplex e equilíbrio de Nash têm aula no canal."],
      "icone": "payoff", "faixa": "AULA COMPLETA NO CANAL" }
  ]
}
```

Run: `node design-system/scripts/gerar-story-video.mjs instagram/_piloto-quiz-nobel`
Expected: `story-01.mp4` … `story-04.mp4`.

- [ ] **Step 3: Página de comparação**

`instagram/_piloto-comparar.html` — dois vídeos lado a lado, antigo e novo (os antigos já estão no disco, fora do git):

```html
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Piloto: antes e depois</title>
<style>body{margin:0;background:#111;color:#eee;font:600 16px system-ui;display:grid;gap:24px;padding:24px}
.par{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:900px}video{width:100%;background:#000}</style></head>
<body>
<h1>Reel — Königsberg</h1>
<div class="par"><figure><figcaption>Antes</figcaption><video controls src="2026-10-19-pontes-de-konigsberg/reel.mp4"></video></figure>
<figure><figcaption>Depois (motor novo, com som)</figcaption><video controls src="_piloto-konigsberg/reel.mp4"></video></figure></div>
<h1>Stories — quiz do Nobel</h1>
<div class="par"><figure><figcaption>Antes (story 1)</figcaption><video controls src="2026-10-10-quiz-nobel/story-01.mp4"></video></figure>
<figure><figcaption>Depois (story 1)</figcaption><video controls src="_piloto-quiz-nobel/story-01.mp4"></video></figure></div>
<p>Depois, stories 2 a 4: abra <code>_piloto-quiz-nobel/story-02.mp4</code> etc.</p>
</body></html>
```

Se algum "Antes" não existir no disco, gere-o a partir do commit `34b6fe4` num worktree temporário — ou mostre só o `.png` antigo que estiver na pasta.

Abra: `open instagram/_piloto-comparar.html`.

- [ ] **Step 4: PARADA — a pessoa aprova**

Mostre a página de comparação e pergunte, em uma mensagem:
1. O ritmo está bom (rápido demais, lento demais)?
2. A Trilha combina? O volume dos efeitos está bom em relação a ela?
3. Algum movimento incomoda (o tremor do impacto, a câmera do grafo, o grão)?
4. Aprova o motor novo para substituir o atual?

Ajustes de gosto são em `design-system/motion/movimento.json` (durações, curvas, tremor e clarão do impacto, ganho da Trilha e dos efeitos, opacidade da grade e do grão) — mude, regere o piloto, mostre de novo. **Não avance sem um sim explícito.**

- [ ] **Step 5: Fechar**

Com o sim:

```bash
rm -rf instagram/_piloto-konigsberg instagram/_piloto-quiz-nobel instagram/_piloto-comparar.html
npm test
```

Expected: PASS. Depois siga a skill `superpowers:finishing-a-development-branch` (PR do branch `motion-instagram` para a `master`, que é protegida; o corpo do PR resume as Tasks e linka a spec e os ADRs 0011 e 0012).
