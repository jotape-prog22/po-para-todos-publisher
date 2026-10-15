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

// Sinal "musical": bumbo nos tempos 1 e 3, caixa (ruído) no 2 e 4, chimbal em colcheias e um
// baixo tonal — o chimbal tenta puxar para o dobro do andamento, o bumbo para a metade.
function musica(bpm, inicio, segundos = 30, taxa = 22050) {
  const x = new Float32Array(segundos * taxa);
  let semente = 7;
  const ruido = () => ((semente = (semente * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < x.length; i++) x[i] = 0.15 * Math.sin((2 * Math.PI * 55 * i) / taxa) + 0.005 * ruido();
  const P = 60 / bpm;
  for (let k = 0, t = inicio; t < segundos; k++, t = inicio + k * P / 2) {
    const s = Math.round(t * taxa);
    const tempo = k % 2 === 0, n = k / 2;
    for (let j = 0; j < 4000 && s + j < x.length; j++) {
      let v = 0.15 * ruido() * Math.exp(-j / 150);                                                  // chimbal
      if (tempo && n % 2 === 0) v += 0.8 * Math.sin((2 * Math.PI * 60 * j) / taxa) * Math.exp(-j / 1500); // bumbo
      if (tempo && n % 2 === 1) v += 0.5 * ruido() * Math.exp(-j / 700);                             // caixa
      x[s + j] += v;
    }
  }
  return x;
}

test("batidas não cai no dobro nem na metade num sinal com bumbo, caixa e chimbal", () => {
  for (const [bpm, inicio] of [[100, 0.3], [128, 0.05], [84, 0.5]]) {
    const r = batidas(musica(bpm, inicio), 22050);
    assert.ok(Math.abs(r.bpm - bpm) < 1, `bpm ${r.bpm} ≉ ${bpm}`);
    assert.ok(Math.abs(r.primeira_batida - inicio) < 0.03, `primeira ${r.primeira_batida} ≉ ${inicio}`);
  }
});

test("com a dica de ouvido (bpm), batidas sai do dobro e devolve a fase da grade certa", () => {
  const x = musica(72, 0.33);
  assert.ok(Math.abs(batidas(x, 22050).bpm - 144) < 1, "sem dica, este sinal sai no dobro (o caso que a dica corrige)");
  const r = batidas(x, 22050, { bpm: 70 });
  assert.ok(Math.abs(r.bpm - 72) < 1, `bpm ${r.bpm} ≉ 72`);
  assert.ok(Math.abs(r.primeira_batida - 0.33) < 0.03, `primeira ${r.primeira_batida} ≉ 0.33`);
  assert.throws(() => batidas(x, 22050, { bpm: 0 }), ErroAudio);
});

test("CLI --medir aceita --bpm <dica> e recusa dica inválida com erro em português", async () => {
  const { spawnSync } = await import("node:child_process");
  const cli = (...a) => spawnSync(process.execPath, [new URL("../scripts/audio.mjs", import.meta.url).pathname, ...a], { encoding: "utf8" });
  const uso = cli("--medir");
  assert.equal(uso.status, 1);
  assert.match(uso.stderr, /^erro: uso: node scripts\/audio\.mjs --medir <arquivo> \[--bpm <dica de ouvido>\]/);
  for (const dica of ["abc", "0", "300"]) {
    const r = cli("--medir", "faixa.mp3", "--bpm", dica);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /^erro: --bpm .* de 40 a 240/);
  }
  assert.match(cli("--medir", "faixa.mp3", "--bpm").stderr, /^erro: --bpm/);
});
