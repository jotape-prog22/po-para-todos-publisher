// Chamadas: os tipos de Cena de abertura dos reels (CONTEXT.md, "Chamada") e os estilos do impacto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCena, validarChamadas } from "../design-system/motion/cenas/index.mjs";
import { kitFalso, ctxFalso, textos, desenharEm, movimento } from "./ajudas-motion.mjs";
import { escalar } from "../design-system/motion/escrita.mjs";
import * as impacto from "../design-system/motion/cenas/impacto.mjs";
import * as pergunta from "../design-system/motion/cenas/pergunta.mjs";
import * as riscado from "../design-system/motion/cenas/riscado.mjs";
import * as digitado from "../design-system/motion/cenas/digitado.mjs";
import * as spoiler from "../design-system/motion/cenas/spoiler.mjs";
import * as mitoFato from "../design-system/motion/cenas/mito-fato.mjs";
import * as desafio from "../design-system/motion/cenas/desafio.mjs";

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

const perg = (extra = {}) => ({ tipo: "pergunta", duracao: 5, pergunta: "Abrir um atalho deixa o trânsito…", opcoes: ["Mais rápido", "Igual", "Mais lento"], ...extra });

test("pergunta: valida opções, resposta e tamanhos", () => {
  assert.deepEqual(validarCena(perg(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(perg({ opcoes: ["Só uma"] }), "cena 1", { formato: "reel" }).erros[0], /"opcoes" precisa de 2 a 3 itens/);
  assert.match(validarCena(perg({ resposta: 4 }), "cena 1", { formato: "reel" }).erros[0], /"resposta" é o número de uma opção \(1 a 3\)/);
  assert.match(validarCena(perg({ pergunta: "x".repeat(61) }), "cena 1", { formato: "reel" }).erros[0], /"pergunta" tem 61 caracteres; o máximo é 60/);
});

test("pergunta: pop na pergunta, tick por opção; com resposta, sino na revelação", () => {
  const r = movimento.ritmo.pergunta;
  const aberta = validarCena(perg(), "c", { formato: "reel" }).cena.linha;
  assert.deepEqual(aberta.eventos.map((e) => e.efeito), ["pop", "tick", "tick", "tick"]);
  assert.equal(aberta.eventos[1].t, r.primeira_opcao);
  const revela = validarCena(perg({ resposta: 3 }), "c", { formato: "reel" }).cena.linha;
  assert.deepEqual(revela.eventos.at(-1), { t: Math.round((r.primeira_opcao + 2 * r.passo + r.revelar) * 1000) / 1000, efeito: "sino" });
});

test("pergunta: desenha pergunta e opções com letra; a revelação apaga as erradas", () => {
  const { cena } = validarCena(perg({ resposta: 3 }), "c", { formato: "reel" });
  const ctx = desenharEm(pergunta, cena, [4.9]);
  const ditos = textos(ctx).map((x) => x.s);
  for (const s of ["A", "MAIS RÁPIDO", "B", "IGUAL", "C", "MAIS LENTO"]) assert.ok(ditos.includes(s), s);
  desenharEm(pergunta, cena, [0, 99]);   // Review Focus 5
});

// Contexto falso que guarda onde cada texto termina (x + largura, na fonte em vigor no fillText).
function ctxQueMede() {
  const ctx = ctxFalso(), fins = [];
  ctx.fillText = (s, x) => {
    const w = ctx.measureText(s).width;
    fins.push({ s, fim: ctx.textAlign === "center" ? x + w / 2 : ctx.textAlign === "right" ? x : x + w });
  };
  return { ctx, fins };
}

test("pergunta (Review Focus 1): opção de 30 caracteres não passa da caixa", () => {
  // Fonte da opção maior que a do kit falso, para valer pela largura das fontes reais (mais largas que 0,6 em).
  const kit = kitFalso(), { area } = kit.layout;
  kit.fontes.itemTitulo = escalar(kit.fontes.itemTitulo, 56);
  const { cena } = validarCena(perg({ opcoes: ["M".repeat(30), "Igual"] }), "c", { formato: "reel" });
  const { ctx, fins } = ctxQueMede();
  pergunta.desenhar(ctx, cena, 4.9, kit);
  const longa = fins.find((x) => x.s === "M".repeat(30));
  assert.ok(longa, "desenhou a opção");
  assert.ok(longa.fim <= area.x + area.w, `termina em ${longa.fim}, a área vai até ${area.x + area.w}`);
});

test("validarChamadas: pergunta aberta na Cena 1 exige a revelação na última (Review Focus 3)", () => {
  const v = (lista) => validarChamadas(lista.map((c, i) => validarCena(c, `cena ${i + 1}`, { formato: "reel" }).cena));
  const meio = { duracao: 5, titulo: "MEIO", linhas: ["x"] };
  assert.deepEqual(v([perg(), meio, perg({ resposta: 3 })]), []);
  assert.match(v([perg(), meio])[0], /cena 1 é uma pergunta: a última cena precisa revelá-la/);
  assert.match(v([perg(), meio, perg({ resposta: 3, opcoes: ["Mais rápido", "Igual", "Mais lenta"] })])[0], /cena 3: as "opcoes" precisam ser as mesmas da cena 1/);
  assert.match(v([perg({ resposta: 1 }), meio])[0], /cena 1: a pergunta de abertura não leva "resposta"/);
});

const risc = (extra = {}) => ({ tipo: "riscado", duracao: 4, parece: "Sobrar energia é bom", e: "Vira problema", ...extra });

test("riscado: campos obrigatórios e limites", () => {
  assert.deepEqual(validarCena(risc(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(risc({ e: undefined }), "cena 1", { formato: "reel" }).erros[0], /"e" é obrigatório/);
  assert.match(validarCena(risc({ parece: "x".repeat(41) }), "cena 1", { formato: "reel" }).erros[0], /"parece" tem 41 caracteres; o máximo é 40/);
});

test("riscado: pop no 'parece', caneta no risco, impacto no 'é'", () => {
  const r = movimento.ritmo.riscado;
  const { cena } = validarCena(risc(), "c", { formato: "reel" });
  assert.deepEqual(cena.linha.eventos, [{ t: r.parece, efeito: "pop" }, { t: r.risco, efeito: "caneta" }, { t: r.e, efeito: "impacto" }]);
  assert.equal(cena.linha.fim, r.e);
});

test("riscado: antes do risco não há traço nem 'É'; no fim, os dois textos e o traço", () => {
  const r = movimento.ritmo.riscado;
  const { cena } = validarCena(risc(), "c", { formato: "reel" });
  const antes = desenharEm(riscado, cena, [r.risco - 0.1]);
  assert.ok(!antes.chamadas.some((c) => c[0] === "stroke"));
  assert.ok(!textos(antes).some((x) => x.s === "VIRA PROBLEMA"));
  const fim = desenharEm(riscado, cena, [3.9]);
  const ditos = textos(fim).map((x) => x.s);
  for (const s of ["PARECE", "SOBRAR ENERGIA É BOM", "É", "VIRA PROBLEMA"]) assert.ok(ditos.includes(s), s);
  assert.ok(fim.chamadas.some((c) => c[0] === "stroke"));
  desenharEm(riscado, cena, [0, 99]);   // Review Focus 5
});

test("riscado (Review Focus 1): o risco de uma frase no limite não sai da área", () => {
  // 26 caracteres a 59,6 px ocupam 930 dos 936 px: a linha quase cheia, como acontece com as fontes reais.
  const kit = kitFalso(), { area } = kit.layout;
  kit.fontes.tituloMedio = escalar(kit.fontes.tituloMedio, 59.6);
  const { cena } = validarCena(risc({ parece: `${"M".repeat(26)} ${"M".repeat(13)}` }), "c", { formato: "reel" });
  const ctx = desenharEm(riscado, cena, [3.9], kit);
  const xs = ctx.chamadas.filter((c) => c[0] === "moveTo" || c[0] === "lineTo").map((c) => c[1]);
  assert.ok(xs.length && xs.every((x) => x >= area.x && x <= area.x + area.w), xs.join(", "));
});

const dig = (extra = {}) => ({ tipo: "digitado", duracao: 6, frase: "37.719 pessoas esperam uma córnea no Brasil.", marca: "37.719 pessoas", ...extra });

// Retângulos do marca-texto: os fillRect de um instante depois de "aPartirDe" em que o cursor
// está apagado (ele pisca a cada ritmo.digitado.piscar e também é um fillRect).
function retangulosDaMarca(cena, aPartirDe) {
  const { piscar } = movimento.ritmo.digitado;
  const t = (2 * Math.ceil(aPartirDe / (2 * piscar)) + 1) * piscar + 0.01;
  return desenharEm(digitado, cena, [t]).chamadas.filter((c) => c[0] === "fillRect");
}

test("digitado: a marca precisa estar na frase", () => {
  assert.deepEqual(validarCena(dig(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(dig({ marca: "fila" }), "cena 1", { formato: "reel" }).erros[0], /"marca" precisa ser um trecho de "frase"/);
});

test("digitado: digitar no início, caneta na marca, fim depois da última letra", () => {
  const r = movimento.ritmo.digitado, c = dig();
  const lt = validarCena(c, "c", { formato: "reel" }).cena.linha;
  const fimLetras = Math.round((r.inicio + c.frase.length * r.por_letra) * 1000) / 1000;
  assert.deepEqual(lt.eventos, [{ t: r.inicio, efeito: "digitar" }, { t: Math.round((fimLetras + r.marca) * 1000) / 1000, efeito: "caneta" }]);
  assert.equal(lt.fimEscrita, Math.round((fimLetras + r.marca + r.traco) * 1000) / 1000);
});

test("digitado: no meio, só parte da frase; no fim, a frase inteira", () => {
  const r = movimento.ritmo.digitado;
  const { cena } = validarCena(dig(), "c", { formato: "reel" });
  const meio = textos(desenharEm(digitado, cena, [r.inicio + 10 * r.por_letra])).map((x) => x.s).join("");
  assert.ok(meio.startsWith("37.719 pes") && !meio.includes("Brasil"));
  const fim = textos(desenharEm(digitado, cena, [5.9])).map((x) => x.s).join(" ");
  assert.ok(fim.includes("Brasil."));
  desenharEm(digitado, cena, [0, 99]);   // Review Focus 5
});

test("digitado (Review Focus 2): marca partida pela quebra de linha não lança erro e ainda marca", () => {
  // No kit falso cabem 25 caracteres por linha: "quebra" fecha a 3ª linha e "da linha do meio." abre a 4ª.
  const frase = "Uma frase longa o bastante para a marca cair exatamente na quebra da linha do meio.";
  const { cena } = validarCena(dig({ frase, marca: "quebra da linha do meio" }), "c", { formato: "reel" });
  const rets = retangulosDaMarca(cena, 9);
  assert.equal(rets.length, 5, "uma por palavra da marca");
  assert.equal(new Set(rets.map((r) => r[2])).size, 2, "em duas linhas");
});

test("digitado: palavra da marca repetida fora dela não é marcada", () => {
  const { cena } = validarCena(dig({ frase: "a fila anda e a espera cresce", marca: "a espera" }), "c", { formato: "reel" });
  assert.equal(retangulosDaMarca(cena, 5.9).length, 2);
});

const spo = (extra = {}) => ({ tipo: "spoiler", duracao: 3, valor: 33.3, casas_decimais: 1, sufixo: "%", ...extra });

test("spoiler: valida como o odômetro e limita a pergunta", () => {
  assert.deepEqual(validarCena(spo(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(spo({ valor: "33" }), "cena 1", { formato: "reel" }).erros[0], /"valor" precisa ser um número/);
  assert.match(validarCena(spo({ pergunta: "x".repeat(21) }), "cena 1", { formato: "reel" }).erros[0], /"pergunta" tem 21 caracteres; o máximo é 20/);
  assert.match(validarCena(spo({ rotulo: "da população" }), "cena 1", { formato: "reel" }).erros[0], /spoiler não tem "rotulo"/);
});

test("spoiler: impacto no número, pop na pergunta; padrão 'COMO?'", () => {
  const r = movimento.ritmo.spoiler;
  const { cena } = validarCena(spo(), "c", { formato: "reel" });
  assert.deepEqual(cena.linha.eventos, [{ t: r.numero, efeito: "impacto" }, { t: r.pergunta, efeito: "pop" }]);
  const ditos = textos(desenharEm(spoiler, cena, [2.9])).map((x) => x.s);
  assert.ok(ditos.includes("33,3") && ditos.includes("%") && ditos.includes("COMO?"));
  desenharEm(spoiler, cena, [0, 99]);   // Review Focus 5
});

const mf = (extra = {}) => ({ tipo: "mito-fato", duracao: 4, afirmacao: "Preço sombra é o preço de mercado.", veredito: "mito", ...extra });

test("mito-fato: veredito só mito ou fato", () => {
  assert.deepEqual(validarCena(mf(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(mf({ veredito: "talvez" }), "cena 1", { formato: "reel" }).erros[0], /"veredito" é "mito" ou "fato"/);
});

test("mito-fato: caneta na afirmação; carimbo (impacto) nunca antes do mínimo", () => {
  const r = movimento.ritmo.mito_fato;
  const curta = validarCena(mf({ afirmacao: "Curta." }), "c", { formato: "reel" }).cena.linha;
  assert.deepEqual(curta.eventos.map((e) => e.efeito), ["caneta", "impacto"]);
  assert.equal(curta.eventos[1].t, r.carimbo_minimo);
  // 90 caracteres escritos levam o carimbo para ~3,7 s: a Cena precisa de mais que 4 s para validar.
  const longa = validarCena(mf({ afirmacao: "x".repeat(90), duracao: 6 }), "c", { formato: "reel" }).cena.linha;
  assert.ok(longa.eventos[1].t > r.carimbo_minimo);
});

test("mito-fato: o carimbo só aparece depois do evento", () => {
  const { cena } = validarCena(mf(), "c", { formato: "reel" });
  const tc = cena.linha.eventos[1].t;
  assert.ok(!textos(desenharEm(mitoFato, cena, [tc - 0.05])).some((x) => x.s === "MITO"));
  assert.ok(textos(desenharEm(mitoFato, cena, [tc + 0.5])).some((x) => x.s === "MITO"));
  desenharEm(mitoFato, cena, [0, 99]);   // Review Focus 5
});

const des = (extra = {}) => ({ tipo: "desafio", duracao: 8, pergunta: "3 bairros, 2 escolas: todos na mais perto cabe?", segundos: 4, ...extra });

test("desafio: segundos de 3 a 5", () => {
  assert.deepEqual(validarCena(des(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(des({ segundos: 8 }), "cena 1", { formato: "reel" }).erros[0], /"segundos" é um inteiro de 3 a 5/);
});

test("desafio: caneta, um tick por segundo e sino no fim do tempo", () => {
  const c = des();
  const lt = validarCena(c, "c", { formato: "reel" }).cena.linha;
  assert.deepEqual(lt.eventos.map((e) => e.efeito), ["caneta", "tick", "tick", "tick", "tick", "sino"]);
  assert.equal(lt.eventos.at(-1).t - lt.eventos[1].t, 4);
  assert.equal(lt.fim, lt.eventos.at(-1).t);
});

test("desafio: o número do relógio desce de segundos até 0", () => {
  const { cena } = validarCena(des(), "c", { formato: "reel" });
  const ini = cena.linha.eventos[1].t;
  assert.ok(textos(desenharEm(desafio, cena, [ini + 0.1])).some((x) => x.s === "4"));
  assert.ok(textos(desenharEm(desafio, cena, [ini + 3.5])).some((x) => x.s === "1"));
  assert.ok(textos(desenharEm(desafio, cena, [ini + 4.2])).some((x) => x.s === "0"));
  desenharEm(desafio, cena, [0, 99]);   // Review Focus 5
});

test("validarChamadas (Review Focus 4): desafio não fecha o reel", () => {
  const cenas = [des()].map((c, i) => validarCena(c, `cena ${i + 1}`, { formato: "reel" }).cena);
  assert.match(validarChamadas(cenas)[0], /cena 1: um desafio não fecha o reel/);
  const comResposta = [des(), { duracao: 5, titulo: "NÃO CABE", linhas: ["x"] }].map((c, i) => validarCena(c, `cena ${i + 1}`, { formato: "reel" }).cena);
  assert.deepEqual(validarChamadas(comResposta), []);
});

// Toda Chamada aceita "kicker": ele é digitado acima do bloco, com o som de digitar no começo.
const COM_KICKER = [[pergunta, perg()], [riscado, risc()], [digitado, dig()], [spoiler, spo()], [mitoFato, mf()], [desafio, des()]];
test("Chamadas: o kicker é digitado na tela e soa digitar", () => {
  for (const [mod, c] of COM_KICKER) {
    const { cena, erros } = validarCena({ ...c, kicker: "PENSE RÁPIDO", duracao: 12 }, "c", { formato: "reel" });
    assert.deepEqual(erros, [], c.tipo);
    assert.deepEqual(cena.linha.eventos[0], { t: 0, efeito: "digitar" }, c.tipo);
    assert.ok(textos(desenharEm(mod, cena, [2])).some((x) => x.s === "PENSE RÁPIDO"), c.tipo);
  }
});
