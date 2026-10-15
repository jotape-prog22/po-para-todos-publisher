import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCena, CENAS, TIPOS_DE_CENA } from "../design-system/motion/cenas/index.mjs";
import * as texto from "../design-system/motion/cenas/texto.mjs";
import * as impacto from "../design-system/motion/cenas/impacto.mjs";
import * as odometro from "../design-system/motion/cenas/odometro.mjs";
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
