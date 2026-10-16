# Chamadas variadas nos reels — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A primeira Cena de um reel (a **Chamada**, ver `CONTEXT.md`) deixa de ser sempre o `impacto` de palavras batendo: entram 6 tipos novos de Cena (`pergunta`, `riscado`, `digitado`, `spoiler`, `mito-fato`, `desafio`), o `impacto` ganha `estilo` (`batida`, `deslizar`, `trocar`, `crescer`, `sublinhar`) e uma galeria no navegador mostra todas com som.

**Architecture:** Cada tipo novo é um módulo em `design-system/motion/cenas/` com o contrato de sempre (`usaGrade`, `validar`, `linhaDoTempo`, `desenhar`, `clarao` opcional), registrado em `cenas/index.mjs`; ritmos em `movimento.json → ritmo.<tipo>`. Uma regra de reel inteiro (`validarChamadas`) garante que a `pergunta` da Cena 1 seja revelada na última Cena e que um `desafio` nunca feche o reel. A galeria (`npm run chamadas`) monta composições a partir de `design-system/motion/chamadas-exemplos.json` e usa a prévia que já existe (`verComposicoes`).

**Tech Stack:** Node ≥ 22 (ESM, `node --test`), Canvas2D no Chrome (o motor), sem dependências novas.

**Spec:** decisões da conversa de 15–16/10/2026, resumidas aqui (não há outro documento):
- Chamadas novas: `pergunta` (até 3 opções; a resposta só na última Cena, que acende a certa), `riscado` ("PARECE: X" riscado à mão → "É: Y"), `digitado` (máquina de escrever, cursor, uma palavra com marca-texto), `spoiler` (número final gigante + "COMO?"), `mito-fato` (afirmação + carimbo MITO/FATO depois de ~1,5 s), `desafio` (contagem de 3 a 5 s na própria Cena; a resposta vem na Cena 2).
- `impacto` ganha `estilo`: `batida` (o atual, padrão), `deslizar` (entra de lado, sem tremor nem clarão), `trocar` (uma palavra por vez, no mesmo lugar), `crescer` (nasce pequena e cresce devagar), `sublinhar` (palavras paradas, traço verde à mão sob uma delas).
- Efeitos sonoros só da biblioteca atual (`tick`, `pop`, `whoosh`, `impacto`, `digitar`, `caneta`, `sino`).
- Os tipos funcionam também em stories (mesmo motor).
- Regra na skill `reel`: Cena 1 é uma Chamada (ou `odometro`/`grafo`/`texto` com `pergunta`); num lote, nenhuma Chamada mais de 2 vezes; reels vizinhos na agenda não abrem igual.
- Galeria no navegador antes de aplicar aos 8 reels em revisão.

## Global Constraints

- Todo texto de tela, mensagem de erro e comentário em português, com acentos.
- Cores e fontes só do `kit` (`kit.cores.*`, `kit.fontes.*`); tempos e proporções de animação em `movimento.json` (nada de número mágico de tempo dentro do módulo; proporções geométricas como `CRESCER` podem ficar como constante nomeada, como nos módulos atuais).
- Limites de campo validados com `checarTamanho` (de `cenas/comum.mjs`) e mensagens no formato `${onde}: "campo" …`.
- `linhaDoTempo(c, movimento = MOVIMENTO)` devolve `{ fim, fimEscrita, eventos }`; eventos `{ t, efeito }` com `t` arredondado por `r3`; `efeito` ∈ `tick | pop | whoosh | impacto | digitar | caneta | sino`.
- Não mexer em `instagram/2026-09-20-kruskal-1956/` nem em `videos/folgas-complementares/` (fixtures).
- Trabalhar no branch `chamadas-reel` (a `master` é protegida); um commit por tarefa, mensagem em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `npm test` inteiro verde ao fim de cada tarefa.

## Review Focus

1. Texto longo no limite (14 caracteres por palavra do `impacto`, 90 da `frase`/`afirmacao`/`pergunta`): nada passa da largura útil (`kit.layout.area.w`) — o `trocar` e o `crescer` limitam a escala como o `batida` já faz.
2. `marca` do `digitado` que, depois da quebra de linha, fica partida entre duas linhas: o marca-texto ainda aparece (cada palavra da marca é marcada onde estiver), sem lançar erro.
3. `pergunta` na Cena 1 e uma revelação com opções diferentes (erro de digitação numa opção): o reel é recusado com mensagem que diz qual Cena corrigir.
4. Reel cuja Cena 1 é `desafio` e que tem só essa Cena (ou o desafio na última): recusado — a resposta precisa vir depois.
5. Cena de Chamada desenhada em t = 0 (antes de qualquer evento) e em t muito além do fim: não lança erro e não desenha nada fora da área.

Cada item tem teste na tarefa dona (marcado "Review Focus n").

---

## Mapa de arquivos

- Modificar: `design-system/motion/cenas/impacto.mjs` — campo `estilo` e `destaque`.
- Criar: `design-system/motion/cenas/pergunta.mjs`, `riscado.mjs`, `digitado.mjs`, `spoiler.mjs`, `mito-fato.mjs`, `desafio.mjs`.
- Modificar: `design-system/motion/cenas/index.mjs` — registro dos 6 tipos e `validarChamadas`.
- Modificar: `design-system/motion/movimento.json` — `ritmo.pergunta`, `ritmo.riscado`, `ritmo.digitado`, `ritmo.spoiler`, `ritmo.mito_fato`, `ritmo.desafio`, chaves novas em `ritmo.impacto`.
- Modificar: `design-system/scripts/gerar-reel.mjs` — `composicaoDoReel` chama `validarChamadas`.
- Criar: `design-system/motion/chamadas-exemplos.json`, `design-system/scripts/ver-chamadas.mjs`; `package.json` ganha `"chamadas"`.
- Testes: `tests/motion-chamadas.test.mjs` (novo, todas as Chamadas), `tests/reel.test.mjs` (regra de reel), `tests/motion-cenas.test.mjs` (só se algo existente quebrar).
- Docs: `design-system/motion/GUIA.md`, `.claude/skills/reel/SKILL.md`, `CLAUDE.md`, cabeçalho de `design-system/scripts/gerar-story-video.mjs`.

Padrão de teste (já usado em `tests/motion-cenas.test.mjs`): `validarCena(cena, "cena 1", { formato: "reel" })` devolve `{ erros, cena }`; `desenharEm(modulo, cena, [instantes])` desenha num contexto falso e devolve o último; `textos(ctx)` lista os `fillText`; `ctx.chamadas` registra toda chamada de método (ex.: `["stroke"]`, `["roundRect", …]`). Imports:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCena, validarChamadas, TIPOS_DE_CENA } from "../design-system/motion/cenas/index.mjs";
import { kitFalso, ctxFalso, textos, desenharEm, movimento } from "./ajudas-motion.mjs";
```

---

### Task 1: `impacto` com `estilo`

**Files:**
- Modify: `design-system/motion/cenas/impacto.mjs`
- Modify: `design-system/motion/movimento.json` (`ritmo.impacto`)
- Test: `tests/motion-chamadas.test.mjs` (criar)

**Interfaces:**
- Produces: `impacto.ESTILOS = ["batida", "deslizar", "trocar", "crescer", "sublinhar"]`; Cena `{ tipo: "impacto", estilo?, destaque?, palavras, apoio?, kicker? }`. `destaque` (1..n, só com `sublinhar`, padrão = última palavra).

- [ ] **Step 1: Escrever os testes que falham**

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/motion-chamadas.test.mjs`
Expected: FAIL — `impacto.ESTILOS` indefinido e mensagens de "estilo" ausentes.

- [ ] **Step 3: Ritmo novo em `movimento.json`**

Trocar a linha de `ritmo.impacto` por:

```json
"impacto": { "kicker": 0, "primeira": 0.15, "passo": 0.55, "apoio": 0.6, "sublinhar": 0.8, "traco": 0.5, "crescer": 1.4, "zoom_lento": 0.03 },
```

- [ ] **Step 4: Implementar em `impacto.mjs`**

Acrescentar ao topo do comentário: `// Estilos (campo "estilo"): batida (padrão: mola, tremor, clarão), deslizar (entra de lado, alternando), trocar (uma palavra por vez no mesmo lugar), crescer (nasce pequena e cresce devagar), sublinhar (todas juntas, a caneta sublinha a "destaque").`

Imports passam a incluir `revelarTraco, linhaBase, entrada` de `../escrita.mjs` e `prog, ease` de `../util.mjs`.

```js
export const ESTILOS = ["batida", "deslizar", "trocar", "crescer", "sublinhar"];
const SOM = { batida: "impacto", deslizar: "pop", trocar: "pop", crescer: "tick" };
const estiloDe = (c) => c.estilo ?? "batida";
const destaqueDe = (c) => c.destaque ?? c.palavras.length;
// Proporções: de onde o deslizar parte (fração da largura útil) e o tamanho inicial do crescer.
const DESLIZE = 0.35, NASCER = 0.6;
```

Em `validar`, depois das checagens atuais:

```js
  if (c.estilo != null && !ESTILOS.includes(c.estilo)) erros.push(`${onde}: "estilo" deve ser um de: ${ESTILOS.join(", ")}`);
  if (c.destaque != null) {
    if (c.estilo !== "sublinhar") erros.push(`${onde}: "destaque" só vale com estilo "sublinhar"`);
    else if (!(Number.isInteger(c.destaque) && c.destaque >= 1 && c.destaque <= (c.palavras?.length ?? 0))) erros.push(`${onde}: "destaque" é o número de uma palavra (1 a ${c.palavras?.length ?? 0})`);
  }
```

`linhaDoTempo`:

```js
export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("impacto", movimento), estilo = estiloDe(c);
  const eventos = c.kicker ? [{ t: R.kicker, efeito: "digitar" }] : [];
  if (estilo === "sublinhar") eventos.push({ t: R.primeira, efeito: "pop" }, { t: r3(R.primeira + R.sublinhar), efeito: "caneta" });
  else eventos.push(...c.palavras.map((_, i) => ({ t: r3(R.primeira + i * R.passo), efeito: SOM[estilo] })));
  let fim = eventos.at(-1).t;
  let fimEscrita = estilo === "sublinhar" ? r3(fim + R.traco) : fim;
  if (c.apoio) {
    fim = r3(fimEscrita + R.apoio);
    eventos.push({ t: fim, efeito: "tick" });
    fimEscrita = r3(fim + duracaoEscrita(c.apoio, movimento));
  }
  return { fim, fimEscrita, eventos };
}
```

(Para `batida` sem `apoio` o resultado é idêntico ao de hoje: os testes de `tests/motion-cenas.test.mjs` continuam valendo.)

`clarao`: primeira linha `if (estiloDe(c) !== "batida") return 0;`.

`desenhar`: manter o cálculo de `palavras`, `px`, `f`, `apoio`, `y0`, `batidas` e o kicker; trocar o bloco `ctx.save() … ctx.restore()` das palavras por um despacho:

```js
  const estilo = estiloDe(c);
  const caber = (w) => Math.max(1, area.w / (ctx.measureText(w).width || 1));   // escala máxima que ainda cabe
  const yDe = (i) => (estilo === "trocar" ? area.y + area.h / 2 : y0 + i * f.line + f.line / 2);
  const daVez = (i) => i === palavras.length - 1 || t < batidas[i + 1];
  const pintar = (w, i, { s = 1, dx = 0, alfa = 1, cor }) => {
    ctx.save();
    ctx.globalAlpha *= alfa;
    ctx.translate(area.x + area.w / 2 + dx, yDe(i));
    ctx.scale(s, s);
    usarFonte(ctx, f);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = cor;
    ctx.fillText(w, 0, 0);
    ctx.restore();
  };
  ctx.save();
  usarFonte(ctx, f);
  const { tremor, passar, rampa, ruido } = kit.movimento.impacto;
  if (estilo === "batida") ctx.translate(noise1(t * ruido, 3) * tremor * forca, noise1(t * ruido, 4) * tremor * forca);
  if (estilo === "sublinhar") {
    if (t >= R.primeira) palavras.forEach((w, i) => pintar(w, i, { alfa: entrada(t, R.primeira, kit), cor: i === destaqueDe(c) - 1 ? kit.cores.verde : kit.cores.tinta }));
    const k = destaqueDe(c) - 1, w = ctx.measureText(palavras[k]).width, cx = area.x + area.w / 2;
    const yb = y0 + k * f.line + f.line / 2 + f.px * 0.55;
    revelarTraco(ctx, [{ x: cx - w / 2, y: yb }, { x: cx + w / 2, y: yb }], prog(t, R.primeira + R.sublinhar, R.primeira + R.sublinhar + R.traco, ease.inOutCubic), kit, t, { cor: kit.cores.verde, largura: kit.movimento.desenho.conta.sublinhado });
  } else {
    palavras.forEach((w, i) => {
      const ti = batidas[i];
      if (t < ti) return;
      if (estilo === "trocar" && !daVez(i)) return;
      const cor = daVez(i) ? kit.cores.verde : kit.cores.tinta;
      const mola = 1 + passar * (1 - springStep(t - ti, m.freq, m.amortecimento));
      if (estilo === "batida" || estilo === "trocar") pintar(w, i, { s: Math.min(mola, caber(w)), alfa: clamp((t - ti) / rampa), cor });
      else if (estilo === "deslizar") pintar(w, i, { dx: (i % 2 ? 1 : -1) * area.w * DESLIZE * (1 - entrada(t, ti, kit)), alfa: entrada(t, ti, kit), cor });
      else if (estilo === "crescer") {
        const s = (NASCER + (1 - NASCER) * prog(t, ti, ti + R.crescer, ease.outCubic)) * (1 + R.zoom_lento * Math.max(0, t - ti));
        pintar(w, i, { s: Math.min(s, caber(w)), alfa: clamp((t - ti) / rampa), cor });
      }
    });
  }
  ctx.restore();
```

(`f.line`, `y0`, `forca`, `batidas`, `m` são as variáveis que o `desenhar` atual já calcula. No `trocar`, a altura total usada para `y0` não importa porque `yDe` centraliza.)

- [ ] **Step 5: Rodar os testes**

Run: `node --test tests/motion-chamadas.test.mjs tests/motion-cenas.test.mjs`
Expected: PASS (os testes antigos do `impacto` seguem verdes).

- [ ] **Step 6: Commit**

```bash
git add design-system/motion/cenas/impacto.mjs design-system/motion/movimento.json tests/motion-chamadas.test.mjs
git commit -m "motion: impacto ganha estilo (batida, deslizar, trocar, crescer, sublinhar)"
```

---

### Task 2: Chamada `pergunta` e a regra de revelação no reel

**Files:**
- Create: `design-system/motion/cenas/pergunta.mjs`
- Modify: `design-system/motion/cenas/index.mjs` (registro + `validarChamadas`)
- Modify: `design-system/motion/movimento.json` (`ritmo.pergunta`)
- Modify: `design-system/scripts/gerar-reel.mjs` (`composicaoDoReel`)
- Test: `tests/motion-chamadas.test.mjs`, `tests/reel.test.mjs`

**Interfaces:**
- Produces: Cena `{ tipo: "pergunta", pergunta (≤ 60), opcoes (2 a 3, cada ≤ 30), resposta? (1..n), kicker? }`. Sem `resposta` = abre a dúvida; com `resposta` = revela.
- Produces: `validarChamadas(cenas: Cena[]) → string[]` exportada de `cenas/index.mjs` (recebe as Cenas já validadas, com `tipo` preenchido). Regras: (1) Cena 1 `pergunta` sem `resposta` → a última Cena é `pergunta` com `resposta` e as mesmas `opcoes` (mesmo texto, mesma ordem); (2) `desafio` nunca é a última Cena. Usada pela Task 7 (`desafio`) e pela Task 8 (galeria).

- [ ] **Step 1: Testes que falham** (em `tests/motion-chamadas.test.mjs`)

```js
import * as pergunta from "../design-system/motion/cenas/pergunta.mjs";

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

test("validarChamadas: pergunta aberta na Cena 1 exige a revelação na última (Review Focus 3)", () => {
  const v = (lista) => validarChamadas(lista.map((c, i) => validarCena(c, `cena ${i + 1}`, { formato: "reel" }).cena));
  const meio = { duracao: 5, titulo: "MEIO", linhas: ["x"] };
  assert.deepEqual(v([perg(), meio, perg({ resposta: 3 })]), []);
  assert.match(v([perg(), meio])[0], /cena 1 é uma pergunta: a última cena precisa revelá-la/);
  assert.match(v([perg(), meio, perg({ resposta: 3, opcoes: ["Mais rápido", "Igual", "Mais lenta"] })])[0], /cena 3: as "opcoes" precisam ser as mesmas da cena 1/);
  assert.match(v([perg({ resposta: 1 }), meio])[0], /cena 1: a pergunta de abertura não leva "resposta"/);
});
```

Em `tests/reel.test.mjs`, seguindo o estilo do teste "gerarReel (cenas): recusa reel que fica abaixo de 15 s…" (use a mesma `biblioteca` de teste daquele arquivo):

```js
test("composicaoDoReel recusa pergunta de abertura sem revelação", () => {
  const dados = { tipo: "cenas", cenas: [
    { tipo: "pergunta", duracao: 6, pergunta: "Qual?", opcoes: ["A1", "B1"] },
    { duracao: 8, titulo: "MEIO", linhas: ["x"] },
    { duracao: 8, titulo: "FIM", linhas: ["y"], faixa: "MAIS PO NO CANAL" },
  ], legenda: { gancho: "g", corpo: "c", hashtags_tema: ["#A", "#B", "#C"] } };
  assert.throws(() => composicaoDoReel(dados, { biblioteca: { trilhas: [], efeitos: [] } }), /cena 1 é uma pergunta/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/motion-chamadas.test.mjs tests/reel.test.mjs`
Expected: FAIL — `pergunta` não existe / `validarChamadas` não exportada.

- [ ] **Step 3: Ritmo**

Em `movimento.json → ritmo`, acrescentar:

```json
"pergunta": { "pergunta": 0.15, "primeira_opcao": 1.0, "passo": 0.45, "revelar": 0.6, "apagar": 0.35 },
```

- [ ] **Step 4: Criar `pergunta.mjs`**

```js
// Cena "pergunta" (Chamada): a pergunta sobe no alto e as opções entram uma a uma, em caixas com
// letra (A, B, C). Sem "resposta", abre a dúvida; com "resposta", é a revelação: depois das opções,
// a certa acende em verde e as outras apagam. O reel que abre com pergunta precisa revelá-la na
// última Cena (validarChamadas, em index.mjs). Ritmo em movimento.json (ritmo.pergunta).

import { checarTamanho } from "./comum.mjs";
import { usarFonte, linhasDe, subir, caixa, linhaBase, entrada } from "../escrita.mjs";
import { clamp, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { pergunta: 60, opcoes: [2, 3], opcao: 30 };
const LETRAS = ["A", "B", "C"];
// Proporções (não são px): altura da caixa da opção em entrelinhas da fonte e o recuo da letra.
const ALTURA_CAIXA = 1.5, RECUO_LETRA = 1.4, ALFA_ERRADA = 0.3;

export function validar(c, onde) {
  const erros = [];
  if (!c.pergunta) erros.push(`${onde}: "pergunta" é obrigatória`);
  else { const e = checarTamanho("pergunta", c.pergunta, LIM.pergunta, onde); if (e) erros.push(e); }
  const ops = Array.isArray(c.opcoes) ? c.opcoes : [];
  if (ops.length < LIM.opcoes[0] || ops.length > LIM.opcoes[1]) erros.push(`${onde}: "opcoes" precisa de ${LIM.opcoes[0]} a ${LIM.opcoes[1]} itens`);
  ops.forEach((o, i) => { const e = checarTamanho(`opcoes[${i + 1}]`, o, LIM.opcao, onde); if (e) erros.push(e); });
  if (c.resposta != null && !(Number.isInteger(c.resposta) && c.resposta >= 1 && c.resposta <= ops.length)) erros.push(`${onde}: "resposta" é o número de uma opção (1 a ${ops.length})`);
  if (c.titulo) erros.push(`${onde}: pergunta não tem "titulo" — o texto vai em "pergunta"`);
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("pergunta", movimento);
  const opcoes = c.opcoes.map((_, i) => r3(R.primeira_opcao + i * R.passo));
  const revelar = c.resposta != null ? r3(opcoes.at(-1) + R.revelar) : null;
  return { R, opcoes, revelar };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const { R, opcoes, revelar } = tempos(c, movimento);
  const eventos = [{ t: R.pergunta, efeito: "pop" }, ...opcoes.map((t) => ({ t, efeito: "tick" }))];
  if (revelar != null) eventos.push({ t: revelar, efeito: "sino" });
  const fim = revelar ?? opcoes.at(-1);
  return { fim, fimEscrita: fim, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores;
  const { R, opcoes, revelar } = tempos(c, kit.movimento);
  const ls = linhasDe(ctx, F.tituloMedio, c.pergunta, area.w);
  const fo = F.itemTitulo, hCaixa = fo.line * ALTURA_CAIXA;
  const total = ls.length * F.tituloMedio.line + gap * 2 + c.opcoes.length * (hCaixa + gap);
  let y = area.y + Math.max(0, (area.h - total) / 2);
  subir(ctx, ls, F.tituloMedio, area.x, y, t, R.pergunta, cores.tinta, kit, { alinhar: "center", largura: area.w });
  y += ls.length * F.tituloMedio.line + gap * 2;
  const acesa = revelar != null ? clamp((t - revelar) / R.apagar) : 0;
  c.opcoes.forEach((o, i) => {
    const p = entrada(t, opcoes[i], kit);
    if (p <= 0) return;
    const certa = c.resposta === i + 1;
    const yy = y + i * (hCaixa + gap) + (1 - p) * gap;
    ctx.save();
    ctx.globalAlpha *= p * (certa ? 1 : 1 - (1 - ALFA_ERRADA) * acesa);
    ctx.strokeStyle = certa && acesa > 0 ? cores.verde : cores.tintaSuave;
    ctx.lineWidth = kit.movimento.desenho.tabela.grade * 2;
    ctx.beginPath(); ctx.roundRect(area.x, yy, area.w, hCaixa, hCaixa / 4); ctx.stroke();
    if (certa && acesa > 0) { ctx.globalAlpha *= acesa; ctx.fillStyle = cores.verde; ctx.beginPath(); ctx.roundRect(area.x, yy, area.w, hCaixa, hCaixa / 4); ctx.fill(); ctx.globalAlpha /= acesa; }
    usarFonte(ctx, fo);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    const base = yy + (hCaixa - fo.line) / 2 + linhaBase(fo);
    ctx.fillStyle = certa && acesa > 0 ? cores.tinta : cores.verde;
    ctx.fillText(LETRAS[i], area.x + fo.px * 0.8, base);
    ctx.fillStyle = cores.tinta;
    ctx.fillText(caixa(fo, o), area.x + fo.px * 0.8 + fo.px * RECUO_LETRA, base);
    ctx.restore();
  });
}
```

- [ ] **Step 5: Registrar e escrever `validarChamadas`** em `cenas/index.mjs`

```js
import * as pergunta from "./pergunta.mjs";
// …
export const CENAS = { texto, impacto, odometro, grafo, conta, grafico, tabela, pergunta };
```

e no fim do arquivo:

```js
// Regras de reel inteiro sobre as Chamadas (Cenas já validadas, com "tipo"). Devolve os erros.
export function validarChamadas(cenas) {
  const erros = [];
  const primeira = cenas[0], ultima = cenas.at(-1), n = cenas.length;
  if (primeira?.tipo === "pergunta") {
    if (primeira.resposta != null) erros.push(`cena 1: a pergunta de abertura não leva "resposta" — a última cena é que revela`);
    else if (n < 2 || ultima.tipo !== "pergunta" || ultima.resposta == null) erros.push(`cena 1 é uma pergunta: a última cena precisa revelá-la (tipo "pergunta" com as mesmas "opcoes" e a "resposta")`);
    else if (JSON.stringify(ultima.opcoes) !== JSON.stringify(primeira.opcoes)) erros.push(`cena ${n}: as "opcoes" precisam ser as mesmas da cena 1, na mesma ordem`);
  }
  if (ultima?.tipo === "desafio") erros.push(`cena ${n}: um desafio não fecha o reel — a resposta vem na cena seguinte`);
  return erros;
}
```

- [ ] **Step 6: Usar no reel** — em `design-system/scripts/gerar-reel.mjs`, importar `validarChamadas` de `../motion/cenas/index.mjs` (confira o caminho relativo do import de `validarCenas`/`montarComposicao` no topo do arquivo e siga o mesmo) e, em `composicaoDoReel`, logo depois de `const cenas = validarCenas(…)`:

```js
  const [erroChamada] = validarChamadas(cenas);
  if (erroChamada) throw new ErroReel(erroChamada);
```

- [ ] **Step 7: Rodar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add design-system/motion/cenas/pergunta.mjs design-system/motion/cenas/index.mjs design-system/motion/movimento.json design-system/scripts/gerar-reel.mjs tests/motion-chamadas.test.mjs tests/reel.test.mjs
git commit -m "motion: Chamada pergunta, revelada na última Cena do reel"
```

---

### Task 3: Chamada `riscado`

**Files:**
- Create: `design-system/motion/cenas/riscado.mjs`
- Modify: `design-system/motion/cenas/index.mjs`, `design-system/motion/movimento.json`
- Test: `tests/motion-chamadas.test.mjs`

**Interfaces:**
- Produces: Cena `{ tipo: "riscado", parece (≤ 40), e (≤ 40), kicker? }`. Rótulos fixos na tela: "PARECE" e "É".

- [ ] **Step 1: Testes que falham**

```js
import * as riscado from "../design-system/motion/cenas/riscado.mjs";

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
```

- [ ] **Step 2: Rodar e ver falhar** — `node --test tests/motion-chamadas.test.mjs` → FAIL (`riscado` inexistente).

- [ ] **Step 3: Ritmo** — `"riscado": { "parece": 0.15, "risco": 1.3, "traco": 0.45, "e": 1.9, "apagar": 0.5 },`

- [ ] **Step 4: Criar `riscado.mjs`**

```js
// Cena "riscado" (Chamada): "PARECE" e a crença comum sobem; a caneta risca a frase em vermelho, ela
// apaga, e "É" bate com a resposta em verde. A virada já no gancho. Ritmo em movimento.json (ritmo.riscado).

import { checarTamanho } from "./comum.mjs";
import { usarFonte, linhasDe, subir, revelarTraco, escalar } from "../escrita.mjs";
import { prog, ease, clamp, springStep } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { parece: 40, e: 40 };
// Proporções: tamanho do "é" em relação ao título e quanto a frase riscada apaga.
const MAIOR = 1.25, ALFA_RISCADA = 0.4;

export function validar(c, onde) {
  const erros = [];
  for (const k of ["parece", "e"]) {
    if (!c[k]) erros.push(`${onde}: "${k}" é obrigatório`);
    else { const e = checarTamanho(k, c[k], LIM[k], onde); if (e) erros.push(e); }
  }
  if (c.titulo) erros.push(`${onde}: riscado não tem "titulo" — use "parece" e "e"`);
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("riscado", movimento);
  return { fim: R.e, fimEscrita: R.e, eventos: [{ t: R.parece, efeito: "pop" }, { t: R.risco, efeito: "caneta" }, { t: R.e, efeito: "impacto" }] };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("riscado", kit.movimento);
  const fp = F.tituloMedio, fe = escalar(F.titulo, F.titulo.px * MAIOR);
  const lp = linhasDe(ctx, fp, c.parece, area.w), le = linhasDe(ctx, fe, c.e, area.w);
  const total = 2 * (F.kicker.line + gap) + lp.length * fp.line + gap * 3 + le.length * fe.line;
  let y = area.y + Math.max(0, (area.h - total) / 2);
  const cx = area.x + area.w / 2;
  const rotulo = (s, yy, t0) => {
    if (t < t0) return;
    usarFonte(ctx, F.kicker); ctx.fillStyle = cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.save(); ctx.globalAlpha *= clamp((t - t0) / 0.2); ctx.fillText(s, cx, yy); ctx.restore();
  };
  rotulo("PARECE", y, R.parece);
  y += F.kicker.line + gap;
  ctx.save();
  ctx.globalAlpha *= 1 - (1 - ALFA_RISCADA) * prog(t, R.risco + R.traco, R.risco + R.traco + R.apagar);
  subir(ctx, lp, fp, area.x, y, t, R.parece, cores.tinta, kit, { alinhar: "center", largura: area.w });
  ctx.restore();
  usarFonte(ctx, fp);
  lp.forEach((l, k) => {
    const w = ctx.measureText(l).width, ym = y + k * fp.line + fp.line / 2;
    const p = prog(t, R.risco + (k * R.traco) / lp.length, R.risco + ((k + 1) * R.traco) / lp.length, ease.inOutCubic);
    revelarTraco(ctx, [{ x: cx - w / 2 - 12, y: ym + 6 }, { x: cx + w / 2 + 12, y: ym - 6 }], p, kit, t, { cor: cores.vermelho, largura: kit.movimento.desenho.conta.sublinhado });
  });
  y += lp.length * fp.line + gap * 2;
  rotulo("É", y, R.e);
  y += F.kicker.line + gap;
  if (t < R.e) return;
  const m = kit.movimento.mola, s = 1 + kit.movimento.impacto.passar * (1 - springStep(t - R.e, m.freq, m.amortecimento));
  usarFonte(ctx, fe); ctx.fillStyle = cores.verde; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  le.forEach((l, k) => {
    const caber = Math.max(1, area.w / (ctx.measureText(l).width || 1));
    ctx.save(); ctx.translate(cx, y + k * fe.line + fe.line / 2); ctx.scale(Math.min(s, caber), Math.min(s, caber)); ctx.fillText(l, 0, 0); ctx.restore();
  });
}
```

(`kit.cores.vermelho` vem de `--accent-red` — `design-system/motion/layout.mjs:59`; `ctx.roundRect` existe no Chrome que renderiza.)

- [ ] **Step 5: Registrar** — `import * as riscado from "./riscado.mjs";` e `riscado` em `CENAS`.

- [ ] **Step 6: Rodar** — `npm test` → PASS.

- [ ] **Step 7: Commit**

```bash
git add design-system/motion/cenas/riscado.mjs design-system/motion/cenas/index.mjs design-system/motion/movimento.json tests/motion-chamadas.test.mjs
git commit -m "motion: Chamada riscado (parece X, é Y)"
```

---

### Task 4: Chamada `digitado`

**Files:**
- Create: `design-system/motion/cenas/digitado.mjs`
- Modify: `design-system/motion/cenas/index.mjs`, `design-system/motion/movimento.json`
- Test: `tests/motion-chamadas.test.mjs`

**Interfaces:**
- Produces: Cena `{ tipo: "digitado", frase (≤ 90), marca? (≤ 30, trecho de "frase"), kicker? }`. A frase sai como escrita (sem caixa alta).

- [ ] **Step 1: Testes que falham**

```js
import * as digitado from "../design-system/motion/cenas/digitado.mjs";

const dig = (extra = {}) => ({ tipo: "digitado", duracao: 6, frase: "37.719 pessoas esperam uma córnea no Brasil.", marca: "37.719 pessoas", ...extra });

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
  const frase = "Uma frase longa o bastante para a marca cair exatamente na quebra da linha do meio.";
  const { cena } = validarCena(dig({ frase, marca: "quebra da linha do meio" }), "c", { formato: "reel" });
  const ctx = desenharEm(digitado, cena, [9]);
  assert.ok(ctx.chamadas.some((c) => c[0] === "fillRect"));
});
```

- [ ] **Step 2: Rodar e ver falhar** — FAIL (`digitado` inexistente).

- [ ] **Step 3: Ritmo** — `"digitado": { "inicio": 0.2, "por_letra": 0.045, "marca": 0.4, "traco": 0.5, "piscar": 0.5 },`

- [ ] **Step 4: Criar `digitado.mjs`**

```js
// Cena "digitado" (Chamada): uma frase calma digitada letra a letra, com cursor piscando; depois um
// marca-texto verde passa sobre a "marca". Para temas sérios. Ritmo em movimento.json (ritmo.digitado).

import { checarTamanho } from "./comum.mjs";
import { usarFonte, quebrarLinhas, escalar, linhaBase } from "../escrita.mjs";
import { prog, ease, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { frase: 90, marca: 30 };
// Proporções: tamanho da frase em relação à fonte da pergunta e a opacidade do marca-texto.
const TAMANHO = 1.2, ALFA_MARCA = 0.4;

export function validar(c, onde) {
  const erros = [];
  if (!c.frase) erros.push(`${onde}: "frase" é obrigatória`);
  else { const e = checarTamanho("frase", c.frase, LIM.frase, onde); if (e) erros.push(e); }
  if (c.marca != null) {
    const e = checarTamanho("marca", c.marca, LIM.marca, onde);
    if (e) erros.push(e);
    else if (!String(c.frase ?? "").includes(c.marca)) erros.push(`${onde}: "marca" precisa ser um trecho de "frase"`);
  }
  if (c.titulo) erros.push(`${onde}: digitado não tem "titulo" — o texto vai em "frase"`);
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("digitado", movimento);
  const fimLetras = r3(R.inicio + c.frase.length * R.por_letra);
  const marca = c.marca ? r3(fimLetras + R.marca) : null;
  return { R, fimLetras, marca };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const { R, fimLetras, marca } = tempos(c, movimento);
  const eventos = [{ t: R.inicio, efeito: "digitar" }];
  if (marca != null) eventos.push({ t: marca, efeito: "caneta" });
  return { fim: marca ?? fimLetras, fimEscrita: marca != null ? r3(marca + R.traco) : fimLetras, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const { area } = kit.layout, cores = kit.cores;
  const { R, marca } = tempos(c, kit.movimento);
  const f = escalar(kit.fontes.pergunta, kit.fontes.pergunta.px * TAMANHO);
  usarFonte(ctx, f);
  const medir = (s) => ctx.measureText(s).width;
  const linhas = quebrarLinhas(medir, c.frase, area.w);
  const y0 = area.y + (area.h - linhas.length * f.line) / 2;
  const x0 = (l) => area.x + (area.w - medir(l)) / 2;   // centralizado pela linha inteira: o texto não "anda" enquanto digita
  // Marca-texto por baixo do texto: cada palavra da marca, onde estiver (sobrevive à quebra de linha).
  if (marca != null && t >= marca) {
    const p = prog(t, marca, marca + R.traco, ease.inOutCubic);
    const alvo = new Set(c.marca.split(/\s+/).filter(Boolean));
    ctx.save(); ctx.globalAlpha *= ALFA_MARCA; ctx.fillStyle = cores.verde;
    linhas.forEach((l, k) => {
      let x = x0(l);
      for (const w of l.split(" ")) {
        if (alvo.has(w)) ctx.fillRect(x - 4, y0 + k * f.line + f.line * 0.12, (medir(w) + 8) * p, f.line * 0.76);
        x += medir(w + " ");
      }
    });
    ctx.restore();
  }
  let resta = Math.max(0, Math.floor((t - R.inicio) / R.por_letra));
  ctx.fillStyle = cores.tinta; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  let cursor = null;
  linhas.forEach((l, k) => {
    if (resta <= 0 && cursor) return;
    const parte = l.slice(0, Math.max(0, resta));
    const yb = y0 + k * f.line + linhaBase(f);
    if (parte) ctx.fillText(parte, x0(l), yb);
    if (resta <= l.length && !cursor) cursor = { x: x0(l) + medir(parte), yb };
    resta -= l.length + 1;
  });
  const piscando = Math.floor(t / R.piscar) % 2 === 0;
  if (cursor && t >= R.inicio && piscando) { ctx.fillStyle = cores.verde; ctx.fillRect(cursor.x + 4, cursor.yb - f.px * 0.8, 6, f.px * 0.9); }
}
```

- [ ] **Step 5: Registrar** — `digitado` em `CENAS`.
- [ ] **Step 6: Rodar** — `npm test` → PASS.
- [ ] **Step 7: Commit**

```bash
git add design-system/motion/cenas/digitado.mjs design-system/motion/cenas/index.mjs design-system/motion/movimento.json tests/motion-chamadas.test.mjs
git commit -m "motion: Chamada digitado (máquina de escrever com marca-texto)"
```

---

### Task 5: Chamada `spoiler`

**Files:**
- Create: `design-system/motion/cenas/spoiler.mjs`
- Modify: `design-system/motion/cenas/index.mjs`, `design-system/motion/movimento.json`
- Test: `tests/motion-chamadas.test.mjs`

**Interfaces:**
- Consumes: `formatar(valor, casas)` e `validar` de `cenas/odometro.mjs` (mesmos campos `valor`, `casas_decimais`, `prefixo`, `sufixo`).
- Produces: Cena `{ tipo: "spoiler", valor, casas_decimais?, prefixo?, sufixo?, pergunta? (≤ 20, padrão "COMO?"), kicker? }`.

- [ ] **Step 1: Testes que falham**

```js
import * as spoiler from "../design-system/motion/cenas/spoiler.mjs";

const spo = (extra = {}) => ({ tipo: "spoiler", duracao: 3, valor: 33.3, casas_decimais: 1, sufixo: "%", ...extra });

test("spoiler: valida como o odômetro e limita a pergunta", () => {
  assert.deepEqual(validarCena(spo(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(spo({ valor: "33" }), "cena 1", { formato: "reel" }).erros[0], /"valor" precisa ser um número/);
  assert.match(validarCena(spo({ pergunta: "x".repeat(21) }), "cena 1", { formato: "reel" }).erros[0], /"pergunta" tem 21 caracteres; o máximo é 20/);
});

test("spoiler: impacto no número, pop na pergunta; padrão 'COMO?'", () => {
  const r = movimento.ritmo.spoiler;
  const { cena } = validarCena(spo(), "c", { formato: "reel" });
  assert.deepEqual(cena.linha.eventos, [{ t: r.numero, efeito: "impacto" }, { t: r.pergunta, efeito: "pop" }]);
  const ditos = textos(desenharEm(spoiler, cena, [2.9])).map((x) => x.s);
  assert.ok(ditos.includes("33,3") && ditos.includes("%") && ditos.includes("COMO?"));
  desenharEm(spoiler, cena, [0, 99]);   // Review Focus 5
});
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Ritmo** — `"spoiler": { "numero": 0.15, "pergunta": 1.3 },`
- [ ] **Step 4: Criar `spoiler.mjs`**

```js
// Cena "spoiler" (Chamada): o resultado final do reel bate gigante logo de cara (com mola e um clarão
// leve, como o impacto) e embaixo sobe a pergunta "COMO?". O resto do reel explica. Campos do número
// iguais aos do odometro. Ritmo em movimento.json (ritmo.spoiler).

import { checarTamanho } from "./comum.mjs";
import { formatar, validar as validarNumero } from "./odometro.mjs";
import { usarFonte, escalar, linhasDe, subir } from "../escrita.mjs";
import { springStep, pulse, clamp } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { pergunta: 20 };
// Proporções do número: quanto cresce sobre a fonte-base, quanto da largura ocupa, prefixo/sufixo menores.
const CRESCER = 2.0, OCUPAR = 0.92, MENOR = 0.4, AFASTAR = 0.06;

export function validar(c, onde) {
  const erros = validarNumero(c, onde);
  if (c.pergunta != null) { const e = checarTamanho("pergunta", c.pergunta, LIM.pergunta, onde); if (e) erros.push(e); }
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("spoiler", movimento);
  return { fim: R.pergunta, fimEscrita: R.pergunta, eventos: [{ t: R.numero, efeito: "impacto" }, { t: R.pergunta, efeito: "pop" }] };
}

export function clarao(c, t, kit) {
  const R = ritmoDe("spoiler", kit.movimento), { clarao: k, meia_vida } = kit.movimento.impacto;
  const forca = pulse(t, R.numero, meia_vida);
  return forca > 0.02 ? k * forca : 0;
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("spoiler", kit.movimento);
  const texto = formatar(c.valor, c.casas_decimais ?? 0);
  usarFonte(ctx, F.numero);
  const base = ctx.measureText(texto).width || 1;
  const menorBase = escalar(F.numero, F.numero.px * MENOR);
  usarFonte(ctx, menorBase);
  const lado = (s) => (s ? ctx.measureText(s).width + F.numero.px * AFASTAR : 0);
  const px = Math.min(F.numero.px * CRESCER, (F.numero.px * area.w * OCUPAR) / (base + lado(c.prefixo) + lado(c.sufixo)));
  const f = escalar(F.numero, px), menor = escalar(F.numero, px * MENOR);
  const lp = linhasDe(ctx, F.titulo, c.pergunta ?? "COMO?", area.w);
  const total = f.line + gap * 2 + lp.length * F.titulo.line;
  const cy = area.y + (area.h - total) / 2 + f.line / 2;
  if (t >= R.numero) {
    const m = kit.movimento.mola, s = 1 + kit.movimento.impacto.passar * (1 - springStep(t - R.numero, m.freq, m.amortecimento));
    usarFonte(ctx, f); const wn = ctx.measureText(texto).width;
    usarFonte(ctx, menor); const wp = c.prefixo ? ctx.measureText(c.prefixo).width + px * AFASTAR : 0, ws = c.sufixo ? ctx.measureText(c.sufixo).width + px * AFASTAR : 0;
    const grupo = wp + wn + ws, escala = Math.min(s, Math.max(1, area.w / grupo));
    ctx.save();
    ctx.globalAlpha *= clamp((t - R.numero) / kit.movimento.impacto.rampa);
    ctx.translate(area.x + area.w / 2, cy); ctx.scale(escala, escala);
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const x0 = -grupo / 2;
    usarFonte(ctx, menor); ctx.fillStyle = cores.verdeSuave;
    if (c.prefixo) ctx.fillText(c.prefixo, x0, 0);
    if (c.sufixo) ctx.fillText(c.sufixo, x0 + wp + wn + px * AFASTAR, 0);
    usarFonte(ctx, f); ctx.fillStyle = cores.verde;
    ctx.fillText(texto, x0 + wp, 0);
    ctx.restore();
  }
  subir(ctx, lp, F.titulo, area.x, cy + f.line / 2 + gap * 2, t, R.pergunta, cores.tinta, kit, { alinhar: "center", largura: area.w });
}
```

- [ ] **Step 5: Registrar** — `spoiler` em `CENAS`.
- [ ] **Step 6: Rodar** — `npm test` → PASS.
- [ ] **Step 7: Commit** — `git commit -m "motion: Chamada spoiler (resultado gigante + COMO?)"` (add dos mesmos 4 arquivos).

---

### Task 6: Chamada `mito-fato`

**Files:**
- Create: `design-system/motion/cenas/mito-fato.mjs`
- Modify: `design-system/motion/cenas/index.mjs` (chave `"mito-fato"`), `design-system/motion/movimento.json` (`ritmo.mito_fato`)
- Test: `tests/motion-chamadas.test.mjs`

**Interfaces:**
- Produces: Cena `{ tipo: "mito-fato", afirmacao (≤ 90), veredito: "mito" | "fato", kicker? }`. Carimbo vermelho (MITO) ou verde (FATO).

- [ ] **Step 1: Testes que falham**

```js
import * as mitoFato from "../design-system/motion/cenas/mito-fato.mjs";

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
  const longa = validarCena(mf({ afirmacao: "x".repeat(90) }), "c", { formato: "reel" }).cena.linha;
  assert.ok(longa.eventos[1].t > r.carimbo_minimo);
});

test("mito-fato: o carimbo só aparece depois do evento", () => {
  const { cena } = validarCena(mf(), "c", { formato: "reel" });
  const tc = cena.linha.eventos[1].t;
  assert.ok(!textos(desenharEm(mitoFato, cena, [tc - 0.05])).some((x) => x.s === "MITO"));
  assert.ok(textos(desenharEm(mitoFato, cena, [tc + 0.5])).some((x) => x.s === "MITO"));
  desenharEm(mitoFato, cena, [0, 99]);   // Review Focus 5
});
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Ritmo** — `"mito_fato": { "afirmacao": 0.15, "carimbo_minimo": 1.5, "antes_carimbo": 0.4 },`
- [ ] **Step 4: Criar `mito-fato.mjs`**

```js
// Cena "mito-fato" (Chamada): a caneta escreve uma afirmação; depois de um suspense curto, um carimbo
// MITO (vermelho) ou FATO (verde) bate inclinado por cima, com mola. O resto do reel explica o porquê.
// Ritmo em movimento.json (ritmo.mito_fato).

import { checarTamanho } from "./comum.mjs";
import { usarFonte, linhasDe, escreverLinhas, duracaoEscrita, escalar } from "../escrita.mjs";
import { springStep, clamp, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { afirmacao: 90 };
const VEREDITOS = ["mito", "fato"];
// Proporções: tamanho da afirmação e do carimbo, inclinação (rad), de quanto o carimbo cai e a espessura da borda.
const TAMANHO = 1.1, CARIMBO = 1.5, INCLINAR = -0.2, CAIR = 1.4, BORDA = 0.08;

export function validar(c, onde) {
  const erros = [];
  if (!c.afirmacao) erros.push(`${onde}: "afirmacao" é obrigatória`);
  else { const e = checarTamanho("afirmacao", c.afirmacao, LIM.afirmacao, onde); if (e) erros.push(e); }
  if (!VEREDITOS.includes(c.veredito)) erros.push(`${onde}: "veredito" é "mito" ou "fato"`);
  return erros;
}

function carimboEm(c, movimento) {
  const R = ritmoDe("mito_fato", movimento);
  return r3(Math.max(R.carimbo_minimo, R.afirmacao + duracaoEscrita(c.afirmacao, movimento) + R.antes_carimbo));
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("mito_fato", movimento), tc = carimboEm(c, movimento);
  return { fim: tc, fimEscrita: tc, eventos: [{ t: R.afirmacao, efeito: "caneta" }, { t: tc, efeito: "impacto" }] };
}

export function desenhar(ctx, c, t, kit) {
  const { area } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("mito_fato", kit.movimento);
  const f = escalar(F.pergunta, F.pergunta.px * TAMANHO);
  const ls = linhasDe(ctx, f, c.afirmacao, area.w);
  const y0 = area.y + (area.h - ls.length * f.line) / 2, cx = area.x + area.w / 2;
  escreverLinhas(ctx, ls, f, cx, y0, t, R.afirmacao, kit, { alinhar: "center", cor: cores.tinta });
  const tc = carimboEm(c, kit.movimento);
  if (t < tc) return;
  const fc = escalar(F.titulo, F.titulo.px * CARIMBO), palavra = c.veredito.toUpperCase();
  const cor = c.veredito === "mito" ? cores.vermelho : cores.verde;
  const m = kit.movimento.mola, s = 1 + (CAIR - 1) * (1 - springStep(t - tc, m.freq, m.amortecimento));
  usarFonte(ctx, fc);
  const w = ctx.measureText(palavra).width + fc.px, h = fc.line + fc.px * 0.3;
  ctx.save();
  ctx.globalAlpha *= clamp((t - tc) / kit.movimento.impacto.rampa);
  ctx.translate(cx, y0 + ls.length * f.line); ctx.rotate(INCLINAR); ctx.scale(s, s);
  ctx.strokeStyle = cor; ctx.lineWidth = fc.px * BORDA;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = cor; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(palavra, 0, 0);
  ctx.restore();
}
```

- [ ] **Step 5: Registrar** — `import * as mitoFato from "./mito-fato.mjs";` e `"mito-fato": mitoFato` em `CENAS`.
- [ ] **Step 6: Rodar** — `npm test` → PASS.
- [ ] **Step 7: Commit** — `git commit -m "motion: Chamada mito-fato (carimbo)"`.

---

### Task 7: Chamada `desafio`

**Files:**
- Create: `design-system/motion/cenas/desafio.mjs`
- Modify: `design-system/motion/cenas/index.mjs`, `design-system/motion/movimento.json`
- Test: `tests/motion-chamadas.test.mjs`, `tests/reel.test.mjs`

**Interfaces:**
- Consumes: `validarChamadas` (Task 2) já recusa `desafio` na última Cena.
- Produces: Cena `{ tipo: "desafio", pergunta (≤ 90), segundos (inteiro 3 a 5), kicker? }`.

- [ ] **Step 1: Testes que falham**

```js
import * as desafio from "../design-system/motion/cenas/desafio.mjs";

const des = (extra = {}) => ({ tipo: "desafio", duracao: 8, pergunta: "3 bairros, 2 escolas: todos na mais perto cabe?", segundos: 4, ...extra });

test("desafio: segundos de 3 a 5", () => {
  assert.deepEqual(validarCena(des(), "cena 1", { formato: "reel" }).erros, []);
  assert.match(validarCena(des({ segundos: 8 }), "cena 1", { formato: "reel" }).erros[0], /"segundos" é um inteiro de 3 a 5/);
});

test("desafio: caneta, um tick por segundo e sino no fim do tempo", () => {
  const r = movimento.ritmo.desafio, c = des();
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
});
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Ritmo** — `"desafio": { "pergunta": 0.15, "antes_relogio": 0.5 },`
- [ ] **Step 4: Criar `desafio.mjs`**

```js
// Cena "desafio" (Chamada): a caneta escreve a pergunta e um relógio em anel conta de "segundos" até 0,
// com um tique por segundo e um sino no fim (o último segundo fica vermelho). A resposta vem na Cena
// seguinte — um desafio nunca fecha o reel (validarChamadas). Ritmo em movimento.json (ritmo.desafio).

import { checarTamanho } from "./comum.mjs";
import { usarFonte, linhasDe, escreverLinhas, duracaoEscrita, escalar } from "../escrita.mjs";
import { clamp, r3, TAU } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { pergunta: 90, segundos: [3, 5] };
// Proporções: raio do anel (fração da largura útil), espessura, tamanho do número dentro.
const RAIO = 0.2, ESPESSURA = 0.09, NUMERO = 0.9;

export function validar(c, onde) {
  const erros = [];
  if (!c.pergunta) erros.push(`${onde}: "pergunta" é obrigatória`);
  else { const e = checarTamanho("pergunta", c.pergunta, LIM.pergunta, onde); if (e) erros.push(e); }
  if (!(Number.isInteger(c.segundos) && c.segundos >= LIM.segundos[0] && c.segundos <= LIM.segundos[1])) erros.push(`${onde}: "segundos" é um inteiro de ${LIM.segundos[0]} a ${LIM.segundos[1]}`);
  return erros;
}

function inicioRelogio(c, movimento) {
  const R = ritmoDe("desafio", movimento);
  return r3(R.pergunta + duracaoEscrita(c.pergunta, movimento) + R.antes_relogio);
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("desafio", movimento), ini = inicioRelogio(c, movimento), fim = r3(ini + c.segundos);
  const eventos = [{ t: R.pergunta, efeito: "caneta" }];
  for (let k = 0; k < c.segundos; k++) eventos.push({ t: r3(ini + k), efeito: "tick" });
  eventos.push({ t: fim, efeito: "sino" });
  return { fim, fimEscrita: fim, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("desafio", kit.movimento);
  const ls = linhasDe(ctx, F.pergunta, c.pergunta, area.w);
  const raio = area.w * RAIO, esp = raio * ESPESSURA;
  const total = ls.length * F.pergunta.line + gap * 3 + 2 * raio;
  const y0 = area.y + Math.max(0, (area.h - total) / 2), cx = area.x + area.w / 2;
  escreverLinhas(ctx, ls, F.pergunta, cx, y0, t, R.pergunta, kit, { alinhar: "center", cor: cores.tinta });
  const ini = inicioRelogio(c, kit.movimento);
  if (t < ini) return;
  const cy = y0 + ls.length * F.pergunta.line + gap * 3 + raio;
  const passado = clamp(t - ini, 0, c.segundos), resta = Math.max(0, Math.ceil(c.segundos - passado - 1e-9));
  const fim = resta <= 1 && passado > 0;
  ctx.save();
  ctx.globalAlpha *= clamp((t - ini) / 0.2);
  ctx.lineWidth = esp; ctx.lineCap = "round";
  ctx.strokeStyle = cores.tintaSuave; ctx.globalAlpha *= 0.3;
  ctx.beginPath(); ctx.arc(cx, cy, raio, 0, TAU); ctx.stroke();
  ctx.globalAlpha /= 0.3;
  ctx.strokeStyle = fim ? cores.vermelho : cores.verde;
  const fracao = 1 - passado / c.segundos;
  if (fracao > 0) { ctx.beginPath(); ctx.arc(cx, cy, raio, -TAU / 4, -TAU / 4 + TAU * fracao); ctx.stroke(); }
  const fn = escalar(F.numero, Math.min(F.numero.px, raio * NUMERO));
  usarFonte(ctx, fn); ctx.fillStyle = fim ? cores.vermelho : cores.tinta; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(resta), cx, cy);
  ctx.restore();
}
```

- [ ] **Step 5: Registrar** — `desafio` em `CENAS`.
- [ ] **Step 6: Rodar** — `npm test` → PASS.
- [ ] **Step 7: Commit** — `git commit -m "motion: Chamada desafio (relógio de 3 a 5 s)"`.

---

### Task 8: Galeria das Chamadas (`npm run chamadas`)

**Files:**
- Create: `design-system/motion/chamadas-exemplos.json`
- Create: `design-system/scripts/ver-chamadas.mjs`
- Modify: `package.json` (`"chamadas": "node design-system/scripts/ver-chamadas.mjs"`)
- Test: `tests/motion-chamadas.test.mjs`

**Interfaces:**
- Consumes: `validarCenas(lista, { formato: "reel", rotulo: "cena" })` de `design-system/scripts/gerar-story-video.mjs`; `validarChamadas` (Task 2); `montarComposicao(cenas, { formato: "reel", trilha, usuario })` de `design-system/motion/composicao.mjs`; `verComposicoes(itens, { biblioteca })` de `design-system/scripts/motion/ver.mjs`; `carregarBiblioteca()` de `scripts/audio.mjs`; `USUARIO` de `gerar-story-video.mjs`.
- Produces: `composicoesDaGaleria(exemplos, biblioteca) → [{ nome, comp, trilhaId }]` exportada de `ver-chamadas.mjs`.

- [ ] **Step 1: Teste que falha**

```js
import { readFileSync } from "node:fs";
import { composicoesDaGaleria } from "../design-system/scripts/ver-chamadas.mjs";
import * as impactoMod from "../design-system/motion/cenas/impacto.mjs";

test("galeria: todo exemplo valida e cobre as 6 Chamadas novas e os 5 estilos do impacto", () => {
  const exemplos = JSON.parse(readFileSync(new URL("../design-system/motion/chamadas-exemplos.json", import.meta.url), "utf8"));
  const itens = composicoesDaGaleria(exemplos, { trilhas: [], efeitos: [] });
  assert.equal(itens.length, exemplos.length);
  const aberturas = exemplos.map((e) => (e.cenas[0].tipo === "impacto" ? `impacto:${e.cenas[0].estilo ?? "batida"}` : e.cenas[0].tipo));
  for (const t of ["pergunta", "riscado", "digitado", "spoiler", "mito-fato", "desafio"]) assert.ok(aberturas.includes(t), t);
  for (const s of impactoMod.ESTILOS) assert.ok(aberturas.includes(`impacto:${s}`), s);
});
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Criar `chamadas-exemplos.json`** (exemplos com os temas dos reels em revisão; números são de exemplo de tela, não vão para publicação)

```json
[
  { "nome": "impacto · batida", "trilha": "detetives-tensos", "cenas": [
    { "tipo": "impacto", "duracao": 3, "palavras": ["UMA RUA NOVA", "TODOS PIORAM"] } ] },
  { "nome": "impacto · deslizar", "trilha": "pizzicato-misterio", "cenas": [
    { "tipo": "impacto", "estilo": "deslizar", "duracao": 3, "palavras": ["NUNCA GANHA", "MAS VENCE"] } ] },
  { "nome": "impacto · trocar", "trilha": "faiscas-espertas", "cenas": [
    { "tipo": "impacto", "estilo": "trocar", "duracao": 3, "palavras": ["REJEITE", "OS 3", "PRIMEIROS"] } ] },
  { "nome": "impacto · crescer", "trilha": "piano-reflexivo", "cenas": [
    { "tipo": "impacto", "estilo": "crescer", "duracao": 4, "palavras": ["RECORDE", "E A FILA", "CRESCEU"] } ] },
  { "nome": "impacto · sublinhar", "trilha": "jazz-foco", "cenas": [
    { "tipo": "impacto", "estilo": "sublinhar", "destaque": 2, "duracao": 3, "palavras": ["3 ROLOS", "OU 2?"] } ] },
  { "nome": "pergunta (+ revelação)", "trilha": "detetives-tensos", "cenas": [
    { "tipo": "pergunta", "duracao": 4, "pergunta": "Abrir um atalho deixa o trânsito…", "opcoes": ["Mais rápido", "Igual", "Mais lento"] },
    { "tipo": "pergunta", "duracao": 4, "pergunta": "Abrir um atalho deixa o trânsito…", "opcoes": ["Mais rápido", "Igual", "Mais lento"], "resposta": 3 } ] },
  { "nome": "riscado", "trilha": "estudo-leve", "cenas": [
    { "tipo": "riscado", "duracao": 4, "parece": "Sobrar energia é bom", "e": "Vira problema" } ] },
  { "nome": "digitado", "trilha": "piano-reflexivo", "cenas": [
    { "tipo": "digitado", "duracao": 5, "frase": "37.719 pessoas esperam uma córnea no Brasil.", "marca": "37.719 pessoas" } ] },
  { "nome": "spoiler", "trilha": "jazz-foco", "cenas": [
    { "tipo": "spoiler", "duracao": 3, "valor": 33.3, "casas_decimais": 1, "sufixo": "%", "pergunta": "COMO?" } ] },
  { "nome": "mito-fato", "trilha": "piano-inspirador", "cenas": [
    { "tipo": "mito-fato", "duracao": 4, "afirmacao": "Preço sombra é o preço de mercado.", "veredito": "mito" } ] },
  { "nome": "desafio (+ resposta)", "trilha": "tutorial-animado", "cenas": [
    { "tipo": "desafio", "duracao": 7, "pergunta": "3 bairros, 2 escolas: todos na escola mais perto cabe?", "segundos": 4 },
    { "duracao": 4, "kicker": "RESPOSTA", "titulo": "NÃO CABE", "linhas": ["E1 receberia 100 para 60 vagas"] } ] }
]
```

Se o validador pedir duração maior numa Cena, aumente a `duracao` daquela Cena no JSON (a mensagem diz o mínimo).

- [ ] **Step 4: Criar `ver-chamadas.mjs`**

```js
// Galeria das Chamadas: abre no navegador, com som, um vídeo curto para cada exemplo de
// design-system/motion/chamadas-exemplos.json (Cena de abertura e, quando precisa, a revelação).
//   npm run chamadas                 # todas
//   npm run chamadas -- riscado      # só os exemplos cujo nome contém "riscado"
// Fica no ar até Ctrl+C. Não grava nada.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validarCenas, USUARIO } from "./gerar-story-video.mjs";
import { validarChamadas } from "../motion/cenas/index.mjs";
import { montarComposicao } from "../motion/composicao.mjs";
import { verComposicoes } from "./motion/ver.mjs";
import { carregarBiblioteca } from "../../scripts/audio.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function composicoesDaGaleria(exemplos, biblioteca) {
  return exemplos.map((ex) => {
    const cenas = validarCenas(ex.cenas, { formato: "reel", rotulo: `${ex.nome} — cena` });
    const regras = validarChamadas(cenas).filter((e) => !/um desafio não fecha/.test(e) || cenas.at(-1).tipo === "desafio");
    if (regras.length) throw new Error(`${ex.nome}: ${regras[0]}`);
    const trilha = ex.trilha ? biblioteca.trilhas.find((t) => t.id === ex.trilha) ?? null : null;
    return { nome: ex.nome, comp: montarComposicao(cenas, { formato: "reel", trilha, usuario: USUARIO }), trilhaId: trilha ? ex.trilha : null };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const filtro = process.argv[2]?.toLowerCase();
  const exemplos = JSON.parse(readFileSync(join(DS, "motion/chamadas-exemplos.json"), "utf8")).filter((e) => !filtro || e.nome.toLowerCase().includes(filtro));
  const biblioteca = carregarBiblioteca();
  await verComposicoes(composicoesDaGaleria(exemplos, biblioteca), { biblioteca });
}
```

(Confira os nomes exportados: `USUARIO` e `validarCenas` saem de `gerar-story-video.mjs` — ver as linhas `export const USUARIO` e `export function validarCenas`; `carregarBiblioteca` de `scripts/audio.mjs` — ver o import no topo de `design-system/scripts/motion/ver.mjs`.)

- [ ] **Step 5: `package.json`** — em `"scripts"`, depois de `"calibrar"`: `"chamadas": "node design-system/scripts/ver-chamadas.mjs"` (lembre a vírgula na linha anterior).

- [ ] **Step 6: Rodar** — `npm test` → PASS. Depois, à mão: `npm run chamadas -- pergunta` abre o navegador; confira que toca e feche com Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add design-system/motion/chamadas-exemplos.json design-system/scripts/ver-chamadas.mjs package.json tests/motion-chamadas.test.mjs
git commit -m "motion: galeria das Chamadas no navegador (npm run chamadas)"
```

---

### Task 9: Documentação e regra da skill

**Files:**
- Modify: `design-system/motion/GUIA.md`, `.claude/skills/reel/SKILL.md`, `CLAUDE.md`, `design-system/scripts/gerar-story-video.mjs` (só o comentário do topo)

- [ ] **Step 1: `GUIA.md`** — trocar a linha "Ritmo do reel: … a primeira bate uma palavra em até 2 s (`impacto`)." por:

```
Ritmo do reel: 25 a 45 s no total (limite técnico 15 a 90), Cenas de 3 a 8 s. A primeira Cena é a **Chamada** (`CONTEXT.md`): algo na tela em até 2 s, com um destes tipos — `impacto` (5 estilos), `pergunta`, `riscado`, `digitado`, `spoiler`, `mito-fato`, `desafio` — ou, se o tema pedir, `odometro`, `grafo` ou `texto` com `pergunta`. Varie: veja as regras na skill `reel` e toque `npm run chamadas` para ver todas. Story: cada um com pelo menos 5 s.
```

Na lista "Quando usar cada tipo", acrescentar:

```
- **pergunta** — Chamada que abre uma dúvida com 2 ou 3 opções; a última Cena do reel repete a pergunta com `resposta` e acende a certa.
- **riscado** — Chamada de virada: a crença comum ("parece") é riscada e a resposta ("é") bate.
- **digitado** — Chamada calma: uma frase digitada com cursor e um trecho com marca-texto. Para temas sérios.
- **spoiler** — Chamada que mostra o resultado final gigante e pergunta "COMO?"; o reel explica.
- **mito-fato** — Chamada com uma afirmação e o carimbo MITO ou FATO.
- **desafio** — Chamada com uma pergunta e um relógio de 3 a 5 s; a resposta vem na Cena 2.
```

Na seção `## impacto`, acrescentar depois de "Campos:": `` `estilo`: `batida` (padrão: bate com mola, tremor e clarão), `deslizar` (entra de lado, sem tremor), `trocar` (uma palavra por vez no mesmo lugar), `crescer` (nasce pequena e cresce devagar — tensão), `sublinhar` (todas juntas; a caneta sublinha a de número `destaque`, padrão a última). ``

E uma seção para cada tipo novo, no formato das existentes (exemplo JSON de uma linha + campos):

```
## pergunta

    { "tipo": "pergunta", "duracao": 4, "pergunta": "Abrir um atalho deixa o trânsito…", "opcoes": ["Mais rápido", "Igual", "Mais lento"] }

Campos: `pergunta` ≤ 60, `opcoes` (2 a 3, ≤ 30 cada), `resposta` (número da opção certa — só na Cena que revela), `kicker`. Reel que abre com `pergunta` precisa terminar com a mesma pergunta, as mesmas `opcoes` na mesma ordem e a `resposta`; o gerador recusa se faltar.

## riscado

    { "tipo": "riscado", "duracao": 4, "parece": "Sobrar energia é bom", "e": "Vira problema" }

Campos: `parece` ≤ 40, `e` ≤ 40, `kicker`. "PARECE" e "É" são fixos na tela.

## digitado

    { "tipo": "digitado", "duracao": 5, "frase": "37.719 pessoas esperam uma córnea no Brasil.", "marca": "37.719 pessoas" }

Campos: `frase` ≤ 90 (sai como escrita, sem caixa alta), `marca` ≤ 30 (trecho exato da frase), `kicker`. Prefira marca curta: cada palavra dela é marcada onde estiver.

## spoiler

    { "tipo": "spoiler", "duracao": 3, "valor": 80, "sufixo": "min", "pergunta": "COMO?" }

Campos do número iguais aos do `odometro` (`valor`, `casas_decimais`, `prefixo`, `sufixo`), `pergunta` ≤ 20 (padrão "COMO?"), `kicker`. O número entra na Checagem.

## mito-fato

    { "tipo": "mito-fato", "duracao": 4, "afirmacao": "Preço sombra é o preço de mercado.", "veredito": "mito" }

Campos: `afirmacao` ≤ 90, `veredito` (`"mito"` ou `"fato"`), `kicker`. O carimbo bate pelo menos 1,5 s depois do começo. Afirmação e veredito entram na Checagem.

## desafio

    { "tipo": "desafio", "duracao": 7, "pergunta": "3 bairros, 2 escolas: todos na mais perto cabe?", "segundos": 4 }

Campos: `pergunta` ≤ 90, `segundos` (3 a 5), `kicker`. Nunca é a última Cena: a Cena seguinte responde.
```

- [ ] **Step 2: Skill `reel`** — em `.claude/skills/reel/SKILL.md`, seção 2a, item 1, trocar "a primeira é um `impacto` (palavra na tela em até 2 s)" por "a primeira é a **Chamada** (`design-system/motion/GUIA.md`: `impacto` em 5 estilos, `pergunta`, `riscado`, `digitado`, `spoiler`, `mito-fato`, `desafio`) — escolha pelo tema (virada → `riscado`; número que espanta → `spoiler`; tema sério → `digitado`; dá para chutar → `pergunta` ou `desafio`; crença comum → `mito-fato`)". E acrescentar logo depois do item 1:

```
   **Variar a Chamada**: rode `node scripts/agenda.mjs --status` e abra o `reel.json` dos reels vizinhos (o de antes e o de depois na agenda): não repita a Chamada deles (para `impacto`, tipo + `estilo`). Num lote, nenhuma Chamada aparece mais de 2 vezes. Para ver todas tocando: `npm run chamadas`.
```

- [ ] **Step 3: `CLAUDE.md`** — na lista de scripts, depois da linha do `gerar-reel.mjs`: ``- `npm run chamadas` — galeria das Chamadas (a Cena de abertura dos reels) no navegador, com som; `npm run chamadas -- <nome>` filtra.``

- [ ] **Step 4: Comentário de `gerar-story-video.mjs`** — linha 4: trocar a lista de tipos por "(design-system/motion: os tipos de Cena e as Chamadas — ver motion/GUIA.md)".

- [ ] **Step 5: Rodar** — `npm test` → PASS (há testes que leem docs; se algum falhar por texto citado, ajuste o doc, não o teste, a menos que o teste cite a frase antiga do `impacto` — aí atualize o teste para a frase nova).

- [ ] **Step 6: Commit**

```bash
git add design-system/motion/GUIA.md .claude/skills/reel/SKILL.md CLAUDE.md design-system/scripts/gerar-story-video.mjs
git commit -m "docs: Chamadas no GUIA, na skill reel e no CLAUDE.md"
```

---

## Depois do plano (fora das tarefas, com a pessoa)

1. `npm run chamadas` → a pessoa aprova ou pede ajuste em cada Chamada (ajustes viram mudanças em `movimento.json` ou no módulo).
2. Reabrir as aberturas dos 8 reels em revisão (`instagram/2026-10-19-…` a `2026-11-06-…`), uma Chamada diferente para cada vizinho, regenerar, refazer a Checagem do que mudou na Cena 1, `npm run revisar`.
3. Merge do branch `chamadas-reel` na `master` (protegida — mesmo caminho dos merges anteriores, com o ok da pessoa).
