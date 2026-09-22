import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { segundos, mmss, candidatosDeCorte, candidatos, DURACAO_CORTE } from "../scripts/corte.mjs";
import { carregarRoteiro } from "../scripts/roteiro.mjs";

const folgas = fileURLToPath(new URL("../videos/folgas-complementares/", import.meta.url));
const roteiro = carregarRoteiro(`${folgas}roteiro.md`);
const { capitulos } = JSON.parse(readFileSync(`${folgas}metadados.json`, "utf8"));

test("segundos e mmss", () => {
  assert.equal(segundos("06:30"), 390);
  assert.equal(segundos("1:02:03"), 3723);
  assert.equal(mmss(390), "06:30");
  assert.throws(() => segundos("6.5"), /mm:ss/);
});

test("candidatos: o gancho (Abertura → Objetivos) e os blocos exemplo autocontidos de 15 a 90 s, com os tempos reais", () => {
  const lista = candidatosDeCorte({ roteiro, capitulos });
  assert.deepEqual(lista[0], { titulo: "Abertura", inicio: "00:00", fim: "00:36", duracao_s: 36, motivo: "é o gancho: abre com a pergunta e já foi escrito para prender em 30 s" });
  const primal = lista.find((c) => c.titulo === "Exemplo — O Primal");
  assert.deepEqual([primal.inicio, primal.fim, primal.duracao_s], ["06:30", "07:20", 50]);
  assert.ok(primal.motivo.includes("exemplo"));
  assert.ok(!lista.some((c) => c.titulo === "Exemplo — Montando o Dual"), "286 s não cabe");
  assert.ok(!lista.some((c) => c.titulo === "Relembrando: Primal e Dual"), "bloco conteudo não entra");
  for (const c of lista) assert.ok(c.duracao_s >= DURACAO_CORTE.min && c.duracao_s <= DURACAO_CORTE.max && segundos(c.inicio) < segundos(c.fim));
});

test("candidatos: bloco exemplo que depende do anterior fica de fora; capítulo sem par no roteiro é ignorado", () => {
  const r = { gancho: { texto: "x" }, blocos: [{ numero: 1, titulo: "Exemplo A", tipo: "exemplo", fala: "Como vimos no bloco anterior, agora …" }, { numero: 2, titulo: "Exemplo B", tipo: "exemplo", fala: "Vamos direto." }] };
  const caps = [{ tempo: "00:00", titulo: "Abertura" }, { tempo: "00:20", titulo: "Exemplo A" }, { tempo: "00:50", titulo: "Exemplo B" }, { tempo: "01:30", titulo: "Encerramento" }];
  const lista = candidatosDeCorte({ roteiro: r, capitulos: caps });
  assert.deepEqual(lista.map((c) => c.titulo), ["Abertura", "Exemplo B"]);
  assert.deepEqual(candidatosDeCorte({ roteiro: r, capitulos: [{ tempo: "00:00", titulo: "Abertura" }] }), []);
});

test("candidatos(pasta) exige publicacao.json público", async () => {
  const r = await candidatos(folgas);
  assert.equal(r.url, "https://youtu.be/6n6oPR70LSA");
  assert.ok(r.candidatos.length >= 3);
  await assert.rejects(candidatos("/nao/existe"), /publicacao\.json/);
});
