import { test } from "node:test";
import assert from "node:assert/strict";
import { clamp, lerp, ease, prog, springStep, pulse, keys, hash, mulberry32, noise1, polylineLengths, pointAtLength, window01, r3 } from "../design-system/motion/util.mjs";
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

test("r3 arredonda a 3 casas", () => {
  assert.equal(r3(1.23456), 1.235); assert.equal(r3(-0.0004), 0); assert.equal(r3(2), 2);
  assert.equal(r3(0.1 + 0.2), 0.3);
});
