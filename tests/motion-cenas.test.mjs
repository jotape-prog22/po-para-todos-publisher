import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarCena, CENAS, TIPOS_DE_CENA } from "../design-system/motion/cenas/index.mjs";
import * as texto from "../design-system/motion/cenas/texto.mjs";
import * as impacto from "../design-system/motion/cenas/impacto.mjs";
import * as odometro from "../design-system/motion/cenas/odometro.mjs";
import * as grafo from "../design-system/motion/cenas/grafo.mjs";
import * as conta from "../design-system/motion/cenas/conta.mjs";
import * as grafico from "../design-system/motion/cenas/grafico.mjs";
import * as tabela from "../design-system/motion/cenas/tabela.mjs";
import { inicioDoConteudo } from "../design-system/motion/cenas/cabecalho.mjs";
import { quebrarLinhas, caixa, escreverLinhas, duracaoEscrita } from "../design-system/motion/escrita.mjs";
import { LIMITES_CENA } from "../design-system/motion/cenas/comum.mjs";
import { ritmoDe, ErroMotion } from "../design-system/motion/movimento.mjs";
import { kitFalso, ctxFalso, textos, desenharEm, movimento } from "./ajudas-motion.mjs";

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

test("o ritmo da Cena texto vem de movimento.json (ritmo.texto)", () => {
  const r = movimento.ritmo.texto;
  const c = story();
  assert.deepEqual(texto.linhaDoTempo(c).tempos.blocos, [r.primeiro, r.primeiro + r.linha]);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, texto: { ...r, titulo: 0.5, primeiro: 2, linha: 1 } } };
  const lt = texto.linhaDoTempo(c, outro);
  assert.equal(lt.tempos.titulo, 0.5);
  assert.deepEqual(lt.tempos.blocos, [2, 3]);
});

test("item: recuo vem do layout (kit.layout.recuoItem) e o deslize de entrada de movimento.json (desenho.deslize)", () => {
  const { cena } = validarCena(story({ linhas: undefined, itens: [{ titulo: "Pão", texto: "rende 1 h" }] }), "story 1");
  const kit = kitFalso();
  const fim = textos(desenharEm(texto, cena, [cena.duracao], kit));
  assert.equal(fim.find((x) => x.s === "PÃO").x, kit.layout.recuoItem);
  const meio = cena.linha.tempos.blocos[0] + movimento.duracoes.entrada / 2;
  const semDeslize = kitFalso({ movimento: { ...movimento, desenho: { ...movimento.desenho, deslize: 0 } } });
  assert.equal(textos(desenharEm(texto, cena, [meio], semDeslize)).find((x) => x.s === "PÃO").x, kit.layout.recuoItem);
  assert.ok(textos(desenharEm(texto, cena, [meio], kit)).find((x) => x.s === "PÃO").x > kit.layout.recuoItem);
});

test("escreverLinhas escreve uma linha depois da outra; o bloco todo leva duracaoEscrita do texto inteiro", () => {
  const kit = kitFalso(), f = kit.fontes.corpo, linhas = ["primeira linha", "b"];
  const pc = movimento.duracoes.escrita_por_caractere;
  assert.equal(duracaoEscrita("primeira linha", movimento), 14 * pc);
  assert.equal(duracaoEscrita("b", movimento), movimento.duracoes.escrita_minima, "texto curto usa a duração mínima");
  const total = duracaoEscrita("primeira linha b", movimento);   // as linhas quebradas somam o texto de antes da quebra
  const d0 = (total * 14) / 16;   // cada linha leva a sua parte em caracteres (o espaço da quebra conta na primeira)
  const em = (t) => { const ctx = ctxFalso(); const fim = escreverLinhas(ctx, linhas, f, 0, 0, t, 1, kit); return { fim, ditas: textos(ctx).map((x) => x.s), caneta: ctx.chamadas.some((c) => c[0] === "arc") }; };
  assert.deepEqual(em(0.5).ditas, []);
  assert.deepEqual(em(1 + d0 / 2).ditas, ["primeira linha"]);
  assert.deepEqual(em(1 + total - 0.01).ditas, ["primeira linha", "b"]);
  assert.ok(Math.abs(em(0).fim - (1 + total)) < 1e-9);
  assert.equal(em(1 + total).caneta, false, "no fim do bloco a caneta já saiu");
});

for (const formato of ["reel", "story"]) {
  test(`pergunta de 60 caracteres como último bloco: a Cena mínima (${formato}) termina com a escrita completa`, () => {
    const pergunta = "Qual das duas máquinas deve produzir antes para render mais?";
    assert.equal(pergunta.length, 60);
    const base = { duracao: 60, titulo: "T", pergunta };
    const { cena: longa } = validarCena(base, "cena 1", { formato });
    assert.equal(longa.linha.fimEscrita, longa.linha.tempos.pergunta + duracaoEscrita(pergunta, movimento));
    assert.ok(longa.minimo >= longa.linha.fimEscrita + movimento.duracoes.leitura_final);
    const { cena, erros } = validarCena({ ...base, duracao: Math.max(longa.minimo, LIMITES_CENA.duracao[formato].min) }, "cena 1", { formato });
    assert.deepEqual(erros, []);
    const ctx = ctxFalso();
    texto.desenhar(ctx, cena, cena.minimo - 0.001, kitFalso());
    assert.ok(!ctx.chamadas.some((c) => c[0] === "arc"), "a caneta já terminou a pergunta");
    assert.equal(textos(ctx).filter((x) => /[a-z]/.test(x.s)).map((x) => x.s).join(" "), pergunta);
  });
}

test("ritmoDe falha com ErroMotion quando movimento.json não tem o ritmo do tipo", () => {
  assert.throws(() => ritmoDe("nao-existe"), (e) => e instanceof ErroMotion && /ritmo\.nao-existe/.test(e.message));
});

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

test("impacto: o ritmo vem de movimento.json (ritmo.impacto) e o apoio escrito entra em fimEscrita", () => {
  const r = movimento.ritmo.impacto;
  const c = { palavras: ["A", "B", "C"], apoio: "sem repetir nenhuma" };
  assert.deepEqual(impacto.linhaDoTempo(c).eventos.slice(0, 3).map((e) => e.t), [0.15, 0.7, 1.25].map((x, i) => Math.round((r.primeira + i * r.passo) * 1000) / 1000));
  assert.deepEqual([r.primeira, r.passo], [0.15, 0.55]);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, impacto: { ...r, primeira: 0.5, passo: 1 } } };
  assert.deepEqual(impacto.linhaDoTempo(c, outro).eventos.slice(0, 3).map((e) => e.t), [0.5, 1.5, 2.5]);
  const lt = impacto.linhaDoTempo(c);
  assert.equal(lt.fimEscrita, Math.round((lt.fim + duracaoEscrita(c.apoio, movimento)) * 1000) / 1000);
  assert.equal(impacto.linhaDoTempo({ palavras: ["A"] }).fimEscrita, 0.15, "sem apoio não há escrita a caneta");
});

test("odometro: formata em pt-BR, para no valor e mostra o rótulo", () => {
  assert.equal(odometro.formatar(1736), "1736", "ano não leva ponto de milhar");
  assert.equal(odometro.formatar(12000), "12.000");
  assert.equal(odometro.formatar(3.5, 1), "3,5");
  const erro = (c) => validarCena({ tipo: "odometro", duracao: 6, ...c }, "cena 1", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ valor: "1736" }), /"valor" precisa ser um número/);
  assert.match(erro({ valor: 1234567.89, casas_decimais: 2 }), /dígitos demais/);
  assert.match(erro({ valor: 1, casas_decimais: 3 }), /de 0 a 2/);
  const { cena } = validarCena({ tipo: "odometro", duracao: 6, titulo: "O ANO", valor: 1736, rotulo: "Euler escreve sobre as pontes" }, "cena", { formato: "reel" });
  assert.ok(cena.linha.eventos.some((e) => e.efeito === "pop" && e.t === 2.7));
  const caracteres = textos(desenharEm(odometro, cena, [5.9])).map((x) => x.s).filter((s) => s.length === 1);
  assert.deepEqual(caracteres, ["1", "7", "3", "6"], "no fim, só os dígitos finais");
  assert.ok(textos(desenharEm(odometro, cena, [5.9])).some((x) => x.s.includes("Euler")));
});

test("odometro: o rótulo escrito a caneta entra em fimEscrita e na duração mínima", () => {
  const c = { valor: 5, titulo: "T", rotulo: "Euler escreve sobre as pontes" };
  const lt = odometro.linhaDoTempo(c);
  assert.equal(lt.fim, 3);
  assert.equal(lt.fimEscrita, Math.round((3 + duracaoEscrita(c.rotulo, movimento)) * 1000) / 1000);
  assert.equal(odometro.linhaDoTempo({ valor: 5, titulo: "T" }).fimEscrita, 2.7, "sem rótulo, a escrita termina no pop");
});

test("odometro: ritmo (giro, escalonar) e início do cabeçalho vêm de movimento.json", () => {
  const { giro } = movimento.ritmo.odometro, cab = movimento.ritmo.cabecalho;
  assert.equal(inicioDoConteudo({ titulo: "T" }), cab.titulo_comeca);
  assert.equal(inicioDoConteudo({ kicker: "K" }), cab.kicker_comeca);
  assert.equal(inicioDoConteudo({}), cab.vazio_comeca);
  assert.deepEqual([0.9, 0.6, 0.2], [cab.titulo_comeca, cab.kicker_comeca, cab.vazio_comeca]);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, odometro: { ...movimento.ritmo.odometro, giro: 3 }, cabecalho: { ...cab, titulo_comeca: 2 } } };
  const lt = odometro.linhaDoTempo({ valor: 5, titulo: "T" }, outro);
  assert.equal(lt.eventos.find((e) => e.efeito === "pop" && e.t > 1).t, 5);
  assert.equal(giro, 1.8);
});

test("odometro: os tambores giram até o fim do giro e o último gira mais que o primeiro", () => {
  const { cena } = validarCena({ tipo: "odometro", duracao: 6, valor: 1736 }, "cena", { formato: "reel" });
  const meio = textos(desenharEm(odometro, cena, [1.4])).map((x) => x.s).filter((s) => s.length === 1).join("");
  const fim = textos(desenharEm(odometro, cena, [5.9])).map((x) => x.s).filter((s) => s.length === 1).join("");
  assert.equal(fim, "1736");
  assert.notEqual(meio, fim, "no meio do giro os dígitos ainda não pararam");
});

test("impacto: o kicker digitado gera o evento digitar e entra em fimEscrita só pela caneta", () => {
  const lt = impacto.linhaDoTempo({ palavras: ["A"], kicker: "K" });
  assert.deepEqual(lt.eventos[0], { t: movimento.ritmo.impacto.kicker, efeito: "digitar" });
});

test("impacto: tremor, mola, rampa, meia-vida e ruído vêm de movimento.json (impacto.*)", () => {
  const i = movimento.impacto;
  for (const k of ["tremor", "clarao", "passar", "rampa", "meia_vida", "ruido"]) assert.equal(typeof i[k], "number", k);
  assert.ok(i.clarao <= 0.05, "clarão quase imperceptível");
  assert.equal(typeof movimento.ritmo.odometro.aparecer, "number");
});

test("impacto: a mola nunca passa a palavra da largura útil, nem no pico (14 caracteres)", () => {
  const { cena } = validarCena({ tipo: "impacto", duracao: 3, palavras: ["MMMMMMMMMMMMMM"] }, "cena", { formato: "reel" });
  const kit = kitFalso();
  let maior = 0;
  for (let t = 0.15; t < 0.6; t += 0.01) {
    const ctx = ctxFalso();
    let esc = 1;
    ctx.scale = (a) => { esc = a; };
    ctx.fillText = (s) => { maior = Math.max(maior, esc * ctx.measureText(s).width); };
    impacto.desenhar(ctx, cena, t, kit);
  }
  assert.ok(maior <= kit.layout.area.w + 1e-6, `largura de pico ${maior} passa de ${kit.layout.area.w}`);
  // palavra curta mantém o soco
  const { cena: curta } = validarCena({ tipo: "impacto", duracao: 3, palavras: ["7"] }, "cena", { formato: "reel" });
  let pico = 1;
  for (let t = 0.15; t < 0.6; t += 0.01) { const ctx = ctxFalso(); ctx.scale = (a) => { pico = Math.max(pico, a); }; impacto.desenhar(ctx, curta, t, kit); }
  assert.ok(pico > 1.2);
});

test("odometro: prefixo, número e sufixo cabem na área, mesmo com 9 caracteres e sufixo de 10", () => {
  const { cena, erros } = validarCena({ tipo: "odometro", duracao: 6, valor: 12345.67, casas_decimais: 2, prefixo: "R$ ab", sufixo: "x".repeat(10) }, "cena", { formato: "reel" });
  assert.deepEqual(erros, []);
  const kit = kitFalso(), { x, w } = kit.layout.area;
  const ctx = ctxFalso();
  const vistos = [];
  ctx.fillText = (s, px) => vistos.push({ s, x: px, w: ctx.measureText(s).width, a: ctx.textAlign });
  odometro.desenhar(ctx, cena, 5.9, kit);
  assert.ok(vistos.some((v) => v.s === "R$ ab") && vistos.some((v) => v.s === "x".repeat(10)));
  for (const v of vistos) {
    const esq = v.a === "right" ? v.x - v.w : v.a === "center" ? v.x - v.w / 2 : v.x;
    assert.ok(esq >= x - 1e-6 && esq + v.w <= x + w + 1e-6, `"${v.s}" sai da área: ${esq}..${esq + v.w}`);
  }
});

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

test("grafo: o ritmo vem de movimento.json (ritmo.grafo) e a legenda escrita entra em fimEscrita", () => {
  const c = konigsberg({ caminho: ["N", "I", "L"], legenda: "cada ponte é uma ligação" });
  const r = movimento.ritmo.grafo;
  const lt = grafo.linhaDoTempo(c);
  const ticks = (l) => l.eventos.filter((e) => e.efeito === "tick").map((e) => e.t);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, grafo: { ...r, segmento: r.segmento + 1 } } };
  const [p1, p2] = ticks(grafo.linhaDoTempo(c, outro));
  assert.ok(Math.abs(p2 - p1 - (r.segmento + 1)) < 1e-9, "o passo do caminho segue ritmo.grafo.segmento");
  const maisLento = { ...movimento, ritmo: { ...movimento.ritmo, grafo: { ...r, passo_aresta: r.passo_aresta + 0.5 } } };
  assert.ok(ticks(grafo.linhaDoTempo(c, maisLento))[0] > ticks(lt)[0], "arestas mais espaçadas empurram o caminho");
  assert.equal(lt.fimEscrita, Math.round((lt.fim + duracaoEscrita(c.legenda, movimento)) * 1000) / 1000);
  const semLegenda = grafo.linhaDoTempo(konigsberg({ caminho: ["N", "I", "L"] }));
  assert.ok(semLegenda.fimEscrita > semLegenda.fim, "a caneta ainda está no último passo do caminho quando ele começa");
});

test("grafo: rótulo longo vai para fora do desenho (oposto ao centro), não para cima das arestas", () => {
  const { cena } = validarCena(konigsberg(), "cena", { formato: "reel" });
  const ilha = textos(desenharEm(grafo, cena, [7.9])).find((x) => x.s === "ILHA");
  // I fica à esquerda do centro do grafo (L está à direita): o rótulo sai pela esquerda, na altura do nó.
  assert.ok(ilha.x < 0 && Math.abs(ilha.y) < 1e-6, `ILHA em (${ilha.x}, ${ilha.y}) relativo ao nó`);
  const curto = textos(desenharEm(grafo, cena, [7.9])).find((x) => x.s === "N");
  assert.deepEqual([curto.x, curto.y], [0, 0], "rótulo curto fica dentro do nó");
});

for (const [caso, L] of [["nomes por extenso", { x: 9, rotulo: "leste" }], ["leste na borda, sem lugar à direita", { x: 10, rotulo: "leste" }]]) test(`grafo: rótulos longos não cobrem aresta nem nó e ficam na área (Königsberg, ${caso})`, () => {
  const nomes = { N: "norte", I: "ilha", S: "sul", L: L.rotulo };
  const c = konigsberg({ titulo: "RÓTULOS LONGOS", nos: konigsberg().nos.map((n) => ({ ...n, rotulo: nomes[n.id], ...(n.id === "L" ? { x: L.x } : {}) })) });
  const { cena } = validarCena(c, "cena", { formato: "reel" });
  const kit = kitFalso(), ctx = ctxFalso();
  const tracos = [], rotulos = [], nos = [];
  let no = null, raio = 0;
  Object.assign(ctx, {
    translate: (x, y) => { no = { x, y }; },
    moveTo: (x, y) => tracos.push([{ x, y }]),
    lineTo: (x, y) => tracos.at(-1).push({ x, y }),
    arc: (x, y, r) => { raio = r; nos.push(no); },
    fillText: (s, x, y) => { const w = ctx.measureText(s).width, h = Number(ctx.font.match(/([\d.]+)px/)[1]); if ((x || y) && Object.values(nomes).map((v) => v.toUpperCase()).includes(s)) rotulos.push({ s, x0: no.x + x - w / 2, x1: no.x + x + w / 2, y0: no.y + y - h / 2, y1: no.y + y + h / 2 }); },
  });
  grafo.desenhar(ctx, cena, 7.9, kit);
  assert.deepEqual(rotulos.map((r) => r.s), ["NORTE", "ILHA", L.rotulo.toUpperCase()], "SUL (3 letras) cabe no nó com a fonte do teste");
  const dentro = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
  const { x, w } = kit.layout.area;
  for (const r of rotulos) {
    assert.ok(r.x0 >= x && r.x1 <= x + w, `${r.s} sai da área`);
    for (const q of nos) assert.ok(Math.hypot(Math.max(r.x0 - q.x, 0, q.x - r.x1), Math.max(r.y0 - q.y, 0, q.y - r.y1)) >= raio, `${r.s} cobre um nó`);
    for (const pts of tracos) for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 10; k++) {
      const a = pts[i - 1], b = pts[i], p = { x: a.x + ((b.x - a.x) * k) / 10, y: a.y + ((b.y - a.y) * k) / 10 };
      assert.ok(!dentro(p, r), `${r.s} cobre uma aresta em (${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
    }
  }
});

test("grafo: raio mínimo do nó, espessuras e zoom do caminho vêm de movimento.json (desenho.grafo)", () => {
  const { cena } = validarCena(konigsberg({ caminho: ["N", "I", "L"] }), "cena", { formato: "reel" });
  const kitCom = (g) => kitFalso({ movimento: { ...movimento, desenho: { ...movimento.desenho, grafo: { ...movimento.desenho.grafo, ...g } } } });
  const raios = (kit) => desenharEm(grafo, cena, [7.9], kit).chamadas.filter((c) => c[0] === "arc").map((c) => c[3]);
  assert.ok(raios(kitCom({ raio_minimo: 77 })).every((r) => r === 77));
  assert.ok(raios(kitFalso()).every((r) => r < 77));
  // espessura de cada traço (stroke): arestas, caminho e contorno dos nós
  const larguras = (kit) => { const ctx = ctxFalso(), ls = new Set(); ctx.stroke = () => ls.add(ctx.lineWidth); grafo.desenhar(ctx, cena, 7.9, kit); return ls; };
  const ls = larguras(kitCom({ aresta: 7, caminho: 13, contorno: 3 }));
  for (const w of [7, 13, 3]) assert.ok(ls.has(w), `largura ${w}`);
  const d = movimento.desenho.grafo;
  for (const w of [d.aresta, d.caminho, d.contorno]) assert.ok(larguras(kitFalso()).has(w), `largura ${w} de movimento.json`);
  // zoom da câmera no meio do caminho
  const iniC = cena.linha.eventos.find((e) => e.efeito === "tick").t;
  const zoom = (kit) => desenharEm(grafo, cena, [iniC + movimento.ritmo.grafo.camera], kit).chamadas.find((c) => c[0] === "transform")[1];
  assert.ok(Math.abs(zoom(kitCom({ zoom_caminho: 1.5 })) - 1.5) < 1e-9);
  assert.ok(Math.abs(zoom(kitFalso()) - d.zoom_caminho) < 1e-9);
});

test("grafo: caminho que volta pelas pontes paralelas acende uma ponte diferente a cada passo", () => {
  const { cena, erros } = validarCena(konigsberg({ caminho: ["N", "I", "N"] }), "cena", { formato: "reel" });
  assert.deepEqual(erros, []);
  const kit = kitFalso(), ctx = ctxFalso(), tracos = [];
  let atual = null;
  ctx.moveTo = (x, y) => { atual = [{ x, y }]; };
  ctx.lineTo = (x, y) => atual?.push({ x, y });
  ctx.stroke = () => { if (ctx.strokeStyle === kit.cores.verde && ctx.lineWidth === movimento.desenho.grafo.caminho) tracos.push(atual); };
  grafo.desenhar(ctx, cena, 7.9, kit);
  assert.equal(tracos.length, 2);
  const mediaX = (pts) => pts.reduce((s, p) => s + p.x, 0) / pts.length;
  assert.ok(Math.abs(mediaX(tracos[0]) - mediaX(tracos[1])) > 10, "as duas pontes N–I, não a mesma duas vezes");
});

test("grafo: aresta vazia ou sem as pontas é recusada com mensagem legível", () => {
  const erros = (arestas) => validarCena(konigsberg({ arestas }), "cena 2", { formato: "reel" }).erros;
  assert.match(erros([null])[0] ?? "", /arestas\[1\] precisa de "de" e "para"/);
  assert.match(erros([{}])[0] ?? "", /arestas\[1\] precisa de "de" e "para"/);
  assert.ok(!erros([{}]).some((e) => /ele mesmo/.test(e)));
});

const contaDe = (extra = {}) => ({ tipo: "conta", duracao: 8, titulo: "QUANTAS PONTES EM CADA REGIÃO", linhas: ["ilha: 5", "norte: 3  sul: 3  leste: 3", "4 regiões ímpares"], destaque: 3, nota: "mais de 2 ímpares: impossível", ...extra });

test("conta: linhas escritas uma a uma, destaque válido, nota no fim", () => {
  const c = contaDe();
  const { cena, erros } = validarCena(c, "cena 3", { formato: "reel" });
  assert.deepEqual(erros, []);
  assert.equal(cena.linha.eventos.filter((e) => e.efeito === "caneta").length, 3);
  const ts = textos(desenharEm(conta, cena, [7.9])).map((x) => x.s);
  assert.ok(c.linhas.every((l) => ts.includes(l)) && ts.includes(c.nota));
  assert.ok(!textos(desenharEm(conta, cena, [0.2])).some((x) => x.s === "ilha: 5"));
  const erro = (extra) => validarCena({ ...c, ...extra }, "cena 3", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ destaque: 4 }), /"destaque" é o número de uma linha \(1 a 3\)/);
  assert.match(erro({ linhas: ["x".repeat(33)] }), /linhas\[1\]" tem 33/);
  assert.match(erro({ linhas: [] }), /de 1 a 5 linhas/);
});

test("conta: o sublinhado do destaque dá um pop no instante do destaque (sem título, é o único pop)", () => {
  const { cena } = validarCena(contaDe(), "cena 3", { formato: "reel" });
  const d = cena.linha.tempos.destaque;
  assert.ok(d > cena.linha.tempos.linhas[2].t, "depois da linha destacada começar");
  assert.ok(cena.linha.eventos.some((e) => e.efeito === "pop" && e.t === d), "pop do destaque");
  const pops = (extra) => conta.linhaDoTempo(contaDe({ titulo: undefined, ...extra })).eventos.filter((e) => e.efeito === "pop").length;
  assert.equal(pops({}), 1);
  assert.equal(pops({ destaque: undefined }), 0);
});

test("conta: o ritmo vem de movimento.json (ritmo.conta) e a escrita usa duracaoEscrita", () => {
  const r = movimento.ritmo.conta, c = contaDe();
  const lt = conta.linhaDoTempo(c);
  const [l1, l2] = lt.tempos.linhas;
  assert.equal(l2.t, Math.round((l1.t + duracaoEscrita(c.linhas[0], movimento) + r.entre) * 1000) / 1000);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, conta: { ...r, entre: r.entre + 1 } } };
  assert.ok(Math.abs(conta.linhaDoTempo(c, outro).tempos.linhas[1].t - l2.t - 1) < 1e-9);
  const pc = { ...movimento, duracoes: { ...movimento.duracoes, escrita_por_caractere: 0.1 } };
  assert.ok(conta.linhaDoTempo(c, pc).tempos.linhas[1].t > l2.t, "escrita mais lenta empurra a próxima linha");
  assert.equal(lt.fimEscrita, Math.round((lt.tempos.nota + duracaoEscrita(c.nota, movimento)) * 1000) / 1000);
});

test("conta: o sublinhado fica desenho.conta.sublinhado_abaixo px abaixo da linha de base", () => {
  const { cena } = validarCena(contaDe({ nota: undefined }), "cena 3", { formato: "reel" });
  const ys = (kit) => {
    const ctx = desenharEm(conta, cena, [7.9], kit);
    const base = textos(ctx).find((x) => x.s === "4 regiões ímpares").y;
    const mv = ctx.chamadas.filter((c) => c[0] === "moveTo").map((c) => c[2]);
    return mv.map((y) => Math.round((y - base) * 1000) / 1000);
  };
  const dc = movimento.desenho.conta;
  assert.ok(ys(kitFalso()).includes(dc.sublinhado_abaixo));
  const outro = kitFalso({ movimento: { ...movimento, desenho: { ...movimento.desenho, conta: { ...dc, sublinhado_abaixo: 40 } } } });
  assert.ok(ys(outro).includes(40));
});

test("conta: linha longa encolhe a fonte para caber na largura, sem quebrar a conta", () => {
  const { cena } = validarCena(contaDe({ linhas: ["x".repeat(32)], destaque: 1 }), "cena 3", { formato: "reel" });
  const kit = kitFalso(), { x, w } = kit.layout.area;
  const ctx = ctxFalso();
  const vistos = [];
  ctx.fillText = (s, px) => vistos.push({ s, x: px, w: ctx.measureText(s).width });
  conta.desenhar(ctx, cena, 7.9, kit);
  const l = vistos.find((v) => v.s === "x".repeat(32));
  assert.ok(l && l.x >= x - 1e-6 && l.x + l.w <= x + w + 1e-6, `${l?.x}..${l?.x + l?.w}`);
});

test("exemplos do GUIA de grafo, conta, grafico e tabela validam", () => {
  const guia = readFileSync(new URL("../design-system/motion/GUIA.md", import.meta.url), "utf8");
  const exemplos = [...guia.matchAll(/^    (\{ "tipo": "(?:grafo|conta|grafico|tabela)"[\s\S]*?\})\n\n/gm)].map((m) => JSON.parse(m[1].replace(/\n    /g, " ")));
  assert.equal(exemplos.length, 4);
  for (const c of exemplos) assert.deepEqual(validarCena(c, "guia", { formato: "reel" }).erros, [], c.tipo);
});

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

test("grafico: a região viável dá um pop no instante da região (sem título, é o único pop)", () => {
  const lt = grafico.linhaDoTempo(padaria({ titulo: undefined }));
  const pops = lt.eventos.filter((e) => e.efeito === "pop");
  assert.equal(pops.length, 1);
  assert.equal(pops[0].t, lt.tempos.regiao);
  assert.ok(lt.tempos.regiao > lt.tempos.restricoes.at(-1), "depois da última restrição");
});

test("grafico: o ritmo vem de movimento.json (ritmo.grafico), inclusive o crescimento do anel do ótimo", () => {
  const r = movimento.ritmo.grafico, c = padaria();
  const lt = grafico.linhaDoTempo(c);
  const canetas = (l) => l.eventos.filter((e) => e.efeito === "caneta").map((e) => e.t);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, grafico: { ...r, passo_restricao: r.passo_restricao + 1 } } };
  const [, a1, a2] = canetas(lt), [, b1, b2] = canetas(grafico.linhaDoTempo(c, outro));
  assert.ok(Math.abs(b2 - b1 - (a2 - a1) - 1) < 1e-9, "o passo entre restrições segue ritmo.grafico.passo_restricao");
  assert.equal(lt.fimEscrita, Math.round((lt.tempos.restricoes.at(-1) + r.restricao) * 1000) / 1000, "sem nota, a caneta acaba na última restrição");
  const comNota = grafico.linhaDoTempo(padaria({ nota: "o lucro máximo fica num vértice" }));
  assert.equal(comNota.fimEscrita, Math.round((comNota.tempos.nota + duracaoEscrita("o lucro máximo fica num vértice", movimento)) * 1000) / 1000);
  // anel do ótimo: raio = desenho.grafico.ponto + desenho.grafico.anel × (tempo desde o ótimo / ritmo.grafico.anel)
  const d = movimento.desenho.grafico, t = lt.tempos.otimo + 0.2;
  const raios = (kit) => desenharEm(grafico, { ...c, linha: lt }, [t], kit).chamadas.filter((x) => x[0] === "arc").map((x) => Math.round(x[3] * 1000) / 1000);
  const kitR = (anel) => kitFalso({ movimento: { ...movimento, ritmo: { ...movimento.ritmo, grafico: { ...r, anel } } } });
  assert.ok(raios(kitR(r.anel)).includes(Math.round((d.ponto + d.anel * (0.2 / r.anel)) * 1000) / 1000));
  assert.ok(raios(kitR(r.anel * 2)).includes(Math.round((d.ponto + d.anel * (0.2 / (r.anel * 2))) * 1000) / 1000));
});

test("grafico: ponto, anel, espessuras e margem vêm de movimento.json (desenho.grafico)", () => {
  const { cena } = validarCena(padaria(), "cena 4", { formato: "reel" });
  const d = movimento.desenho.grafico;
  const kitCom = (g) => kitFalso({ movimento: { ...movimento, desenho: { ...movimento.desenho, grafico: { ...d, ...g } } } });
  const raios = (kit) => desenharEm(grafico, cena, [9.9], kit).chamadas.filter((x) => x[0] === "arc").map((x) => x[3]);
  assert.ok(raios(kitFalso()).includes(d.ponto));
  assert.ok(raios(kitCom({ ponto: 21 })).includes(21));
  assert.ok(raios(kitCom({ ponto: 21, anel: 70 })).includes(91), "anel completo: ponto + anel");
  const larguras = (kit) => { const ctx = ctxFalso(), ls = new Set(); ctx.stroke = () => ls.add(ctx.lineWidth); grafico.desenhar(ctx, cena, 9.9, kit); return ls; };
  for (const w of [d.eixos, d.restricao, d.anel_traco]) assert.ok(larguras(kitFalso()).has(w), `largura ${w}`);
  const ls = larguras(kitCom({ eixos: 7, restricao: 9, anel_traco: 3 }));
  for (const w of [7, 9, 3]) assert.ok(ls.has(w), `largura ${w}`);
  // margem lateral: o eixo y começa mais para dentro quando a margem cresce e o desenho fica apertado na largura
  const xEixo = (kit) => desenharEm(grafico, cena, [9.9], kit).chamadas.find((x) => x[0] === "moveTo")[1];
  const largo = kitFalso({ layout: { ...kitFalso().layout, area: { x: 72, y: 572, w: 600, h: 1400 } } });
  const largoMargem = kitFalso({ layout: largo.layout, movimento: { ...movimento, desenho: { ...movimento.desenho, grafico: { ...d, margem: d.margem + 50 } } } });
  assert.ok(Math.abs(xEixo(largoMargem) - xEixo(largo) - 50) < 1e-6, "margem lateral de desenho.grafico.margem");
});

test("grafico: durante a saída da Cena (alfa do quadro < 1) nada sai com alfa 1, nem a nota depois do rótulo do ótimo", () => {
  const nota = "o lucro máximo fica num vértice";
  const { cena, erros } = validarCena(padaria({ nota }), "cena 4", { formato: "reel" });
  assert.deepEqual(erros, []);
  const ctx = ctxFalso(), pilha = [], vistos = [];
  ctx.save = () => pilha.push(ctx.globalAlpha);
  ctx.restore = () => { ctx.globalAlpha = pilha.pop(); };
  for (const k of ["fillText", "fill", "stroke", "fillRect"]) ctx[k] = (s) => vistos.push({ k, s, a: ctx.globalAlpha });
  ctx.globalAlpha = 0.5;
  grafico.desenhar(ctx, cena, 9.9, kitFalso());
  assert.ok(vistos.some((v) => v.s === "Z* = R$ 220") && vistos.some((v) => v.s === nota));
  assert.deepEqual(vistos.filter((v) => v.a > 0.5 + 1e-9), []);
  assert.equal(ctx.globalAlpha, 0.5, "a Cena devolve o alfa como recebeu");
});

test("grafico: no exemplo do GUIA nenhum rótulo cai em cima de outro (bolos × massa) e todos ficam na área", () => {
  const { cena } = validarCena(padaria(), "cena 4", { formato: "reel" });
  const kit = kitFalso(), ctx = ctxFalso(), caixas = [];
  const rotulos = ["pães", "bolos", "forno", "massa", "Z* = R$ 220"];
  ctx.fillText = (s, x, y) => {
    if (!rotulos.includes(s)) return;
    const w = ctx.measureText(s).width, px = Number(ctx.font.match(/([\d.]+)px/)[1]);
    const x0 = ctx.textAlign === "right" ? x - w : ctx.textAlign === "center" ? x - w / 2 : x;
    caixas.push({ s, x0, x1: x0 + w, y0: y - px * 0.8, y1: y + px * 0.2 });
  };
  grafico.desenhar(ctx, cena, 9.9, kit);
  assert.deepEqual(caixas.map((c) => c.s).sort(), [...rotulos].sort());
  for (const [i, a] of caixas.entries()) for (const b of caixas.slice(i + 1))
    assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `"${a.s}" cobre "${b.s}"`);
  const { x, w } = kit.layout.area;
  for (const c of caixas) assert.ok(c.x0 >= x - 1e-6 && c.x1 <= x + w + 1e-6, `${c.s} sai da área`);
});

const lucros = (extra = {}) => ({ tipo: "tabela", duracao: 8, titulo: "O QUE CADA UM RENDE", colunas: ["", "Pão", "Bolo"], linhas: [["Forno", "1 h", "2 h"], ["Lucro", "R$ 20", "R$ 50"]], destaque: { linha: 2, coluna: 3 }, ...extra });

test("tabela: valida formato e destaque; desenha cabeçalho e células, linha por linha", () => {
  const { cena, erros } = validarCena(lucros(), "cena 5", { formato: "reel" });
  assert.deepEqual(erros, []);
  assert.equal(cena.linha.eventos.filter((e) => e.efeito === "tick").length, 2);
  const erro = (extra) => validarCena(lucros(extra), "cena 5", { formato: "reel" }).erros[0] ?? "";
  assert.match(erro({ linhas: [["Forno", "1 h"]] }), /linhas\[1\] tem 2 células; as colunas são 3/);
  assert.match(erro({ destaque: { linha: 3, coluna: 1 } }), /"destaque" fora da tabela/);
  assert.match(erro({ linhas: [["Forno", "x".repeat(13), "2 h"]] }), /"célula \(1, 2\)" tem 13/);
  assert.match(erro({ colunas: ["A"] }), /de 2 a 4 colunas/);
  const fim = textos(desenharEm(tabela, cena, [7.9])).map((x) => x.s);
  for (const s of ["PÃO", "BOLO", "Forno", "1 h", "2 h", "Lucro", "R$ 20", "R$ 50"]) assert.ok(fim.includes(s), s);
  assert.ok(!textos(desenharEm(tabela, cena, [1])).some((x) => x.s === "R$ 50"), "segunda linha ainda não entrou");
});

test("tabela: a moldura do destaque dá um pop no instante do destaque (sem título, é o único pop)", () => {
  const lt = tabela.linhaDoTempo(lucros({ titulo: undefined }));
  const pops = lt.eventos.filter((e) => e.efeito === "pop");
  assert.equal(pops.length, 1);
  assert.equal(pops[0].t, lt.tempos.destaque);
  assert.ok(lt.tempos.destaque > lt.tempos.linhas.at(-1), "depois da última linha entrar");
  assert.equal(tabela.linhaDoTempo(lucros({ titulo: undefined, destaque: undefined })).eventos.filter((e) => e.efeito === "pop").length, 0);
});

test("tabela: o ritmo vem de movimento.json (ritmo.tabela) e a nota escrita entra em fimEscrita", () => {
  const r = movimento.ritmo.tabela, c = lucros();
  const lt = tabela.linhaDoTempo(c);
  const [l1, l2] = lt.tempos.linhas;
  assert.equal(l2, Math.round((l1 + r.linha) * 1000) / 1000);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, tabela: { ...r, linha: r.linha + 1 } } };
  const [m1, m2] = tabela.linhaDoTempo(c, outro).tempos.linhas;
  assert.ok(Math.abs(m2 - m1 - (r.linha + 1)) < 1e-9);
  assert.equal(lt.fimEscrita, Math.round((lt.tempos.destaque + r.moldura) * 1000) / 1000, "sem nota, a caneta acaba na moldura");
  const nota = "o bolo rende mais por hora";
  const comNota = tabela.linhaDoTempo(lucros({ nota }));
  assert.equal(comNota.fimEscrita, Math.round((comNota.tempos.nota + duracaoEscrita(nota, movimento)) * 1000) / 1000);
  const { erros } = validarCena(lucros({ nota }), "cena 5", { formato: "reel" });
  assert.deepEqual(erros, []);
  assert.ok(textos(desenharEm(tabela, validarCena(lucros({ nota }), "cena 5", { formato: "reel" }).cena, [7.9])).some((x) => x.s === nota));
});

test("tabela: altura mínima da linha, espessuras e recuo da moldura vêm de movimento.json (desenho.tabela)", () => {
  const { cena } = validarCena(lucros(), "cena 5", { formato: "reel" });
  const d = movimento.desenho.tabela;
  const kitCom = (g) => kitFalso({ movimento: { ...movimento, desenho: { ...movimento.desenho, tabela: { ...d, ...g } } } });
  const passo = (kit) => { const ts = textos(desenharEm(tabela, cena, [7.9], kit)); return ts.find((x) => x.s === "Lucro").y - ts.find((x) => x.s === "Forno").y; };
  assert.equal(passo(kitCom({ linha_minima: 200 })), 200);
  assert.ok(passo(kitFalso()) < 200);
  const larguras = (kit) => { const ctx = ctxFalso(), ls = new Set(); ctx.stroke = () => ls.add(ctx.lineWidth); tabela.desenhar(ctx, cena, 7.9, kit); return ls; };
  for (const w of [d.cabecalho, d.grade, d.moldura]) assert.ok(larguras(kitFalso()).has(w), `largura ${w}`);
  const ls = larguras(kitCom({ cabecalho: 5, grade: 3, moldura: 7 }));
  for (const w of [5, 3, 7]) assert.ok(ls.has(w), `largura ${w}`);
  // moldura: começa recuo_moldura px para dentro da célula (coluna 3 de 3)
  const xMoldura = (kit) => { const ctx = ctxFalso(); let x = null; ctx.moveTo = (mx) => { if (ctx.strokeStyle === kit.cores.verde && x == null) x = mx; }; ctx.beginPath = () => {}; tabela.desenhar(ctx, cena, 7.9, kit); return x; };
  const { x, w } = kitFalso().layout.area;
  assert.ok(Math.abs(xMoldura(kitFalso()) - (x + (2 * w) / 3 + d.recuo_moldura)) < 1e-6);
  assert.ok(Math.abs(xMoldura(kitCom({ recuo_moldura: 20 })) - (x + (2 * w) / 3 + 20)) < 1e-6);
});
