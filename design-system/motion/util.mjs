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

// Arredonda a 3 casas (o "+ 0" troca -0 por 0).
export const r3 = (x) => Math.round(x * 1000) / 1000 + 0;

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
