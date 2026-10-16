// Chamadas: os tipos de Cena de abertura dos reels (CONTEXT.md, "Chamada") e os estilos do impacto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCena } from "../design-system/motion/cenas/index.mjs";
import { kitFalso, ctxFalso, textos, desenharEm, movimento } from "./ajudas-motion.mjs";
import * as impacto from "../design-system/motion/cenas/impacto.mjs";

const imp = (extra = {}) => validarCena({ tipo: "impacto", duracao: 4, palavras: ["UMA RUA", "NOVA", "TODOS PIORAM"], ...extra }, "cena 1", { formato: "reel" });

test("impacto: estilo desconhecido e destaque fora do sublinhar são recusados", () => {
  assert.match(imp({ estilo: "girar" }).erros[0], /cena 1: "estilo" deve ser um de: batida, deslizar, trocar, crescer, sublinhar/);
  assert.match(imp({ estilo: "trocar", destaque: 1 }).erros[0], /"destaque" só vale com estilo "sublinhar"/);
  assert.match(imp({ estilo: "sublinhar", destaque: 4 }).erros[0], /"destaque" é o número de uma palavra \(1 a 3\)/);
  assert.deepEqual(imp().erros, []);
  assert.deepEqual(imp({ estilo: "sublinhar", destaque: 2 }).erros, []);
});

test("impacto: sem estilo continua a batida de hoje (eventos impacto, clarão)", () => {
  const { cena } = imp();
  assert.deepEqual(cena.linha.eventos.map((e) => e.efeito), ["impacto", "impacto", "impacto"]);
  assert.ok(impacto.clarao(cena, 0.16, kitFalso()) > 0);
});

test("impacto deslizar/trocar/crescer: sem clarão, som próprio", () => {
  for (const [estilo, efeito] of [["deslizar", "pop"], ["trocar", "pop"], ["crescer", "tick"]]) {
    const { cena } = imp({ estilo });
    assert.deepEqual(cena.linha.eventos.map((e) => e.efeito), [efeito, efeito, efeito], estilo);
    assert.equal(impacto.clarao(cena, 0.16, kitFalso()), 0, estilo);
  }
});

test("impacto trocar: só a palavra da vez fica na tela", () => {
  const { cena } = imp({ estilo: "trocar" });
  const r = movimento.ritmo.impacto;
  const ditas = textos(desenharEm(impacto, cena, [r.primeira + r.passo + 0.1])).map((x) => x.s);
  assert.deepEqual(ditas, ["NOVA"]);
});

test("impacto sublinhar: palavras juntas, depois a caneta sublinha o destaque", () => {
  const { cena } = imp({ estilo: "sublinhar", destaque: 3 });
  const r = movimento.ritmo.impacto;
  const ef = cena.linha.eventos;
  assert.deepEqual(ef.map((e) => e.efeito), ["pop", "caneta"]);
  assert.equal(ef[1].t, Math.round((r.primeira + r.sublinhar) * 1000) / 1000);
  const antes = desenharEm(impacto, cena, [r.primeira + 0.1]);
  assert.deepEqual(textos(antes).map((x) => x.s), ["UMA RUA", "NOVA", "TODOS PIORAM"]);
  assert.ok(!antes.chamadas.some((c) => c[0] === "stroke"));
  const depois = desenharEm(impacto, cena, [r.primeira + r.sublinhar + r.traco]);
  assert.ok(depois.chamadas.some((c) => c[0] === "stroke"));
});

test("impacto (Review Focus 1): palavra de 14 caracteres nunca passa da largura útil em nenhum estilo", () => {
  // No contexto falso, 14 caracteres já ocupam a largura útil inteira no tamanho de repouso:
  // qualquer escala acima de 1 estouraria a tela.
  const kit = kitFalso();
  for (const estilo of impacto.ESTILOS) {
    const { cena } = validarCena({ tipo: "impacto", duracao: 4, estilo, palavras: ["MMMMMMMMMMMMMM"] }, "c", { formato: "reel" });
    for (const t of [0.2, 0.3, 0.5, 1, 2, 3.9]) {
      const ctx = ctxFalso();
      impacto.desenhar(ctx, cena, t, kit);
      for (const c of ctx.chamadas.filter((c) => c[0] === "scale")) assert.ok(c[1] <= 1.0001, `${estilo} t=${t}: escala ${c[1]}`);
    }
  }
});

test("impacto (Review Focus 5): desenhar em t = 0 e muito depois do fim não lança erro", () => {
  for (const estilo of impacto.ESTILOS) desenharEm(impacto, imp({ estilo }).cena, [0, 99]);
});
