# Pipeline de vídeo — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar um vídeo do canal PO para Todos do tema ao link privado no YouTube: roteiro → slides PPTX → título/descrição/tags → miniatura → upload, com skills do Claude Code e scripts Node testados, num repositório que um bolsista sem experiência em programação consegue instalar e usar.

**Architecture:** Scripts Node determinísticos (`scripts/roteiro.mjs`, `scripts/descricao.mjs`, `design-system/scripts/gerar-slides.mjs`) fazem parsing, validação e renderização; skills em `.claude/skills/` fazem o trabalho de escrita e chamam os scripts; um exemplo real completo em `videos/folgas-complementares/` é ao mesmo tempo fixture dos testes e tutorial. O MCP `youtube` entra no repo via `.mcp.json`.

**Tech Stack:** Node ≥ 22 (`node --test`, ESM `.mjs`), `pptxgenjs` (PPTX), `yaml` (frontmatter), `jszip` (só nos testes, para abrir o PPTX), Chrome/Edge headless (já usado por `exportar.sh`), MCP `youtube-studio-mcp` via `uvx`.

**Spec:** `docs/superpowers/specs/2026-09-20-pipeline-video-design.md`

## Global Constraints

- Todo texto voltado ao usuário (README, SKILL.md, mensagens de erro dos scripts, `briefing.md`) em português, para leitor que **não sabe programar**: passos numerados, comando exato para copiar, o que esperar na tela.
- Nunca editar `design-system/tokens.json`, `tokens.css`, `README.md`, `fundamentos-slides.md`, `fundamentos-youtube.md` do design system.
- Scripts seguem o estilo de `design-system/scripts/gerar-miniatura.mjs`: ESM, comentários em português, exporta funções + bloco CLI protegido por `import.meta.url === pathToFileURL(process.argv[1]).href`, erros de uso saem como `erro: …` com `process.exit(1)`.
- Cores em PPTX sem `#` (`0E2841`), tamanhos em pt: `slide-title` 44, `slide-body`/`slide-label` 20, `slide-caption` 18; famílias `Aharoni` (título) e `Hagrid Text` (corpo).
- Grade do slide: 13,333 × 7,5 pol; margem lateral 0,7; título a 0,33 do topo; corpo a partir de 1,75; logo UNIRIO 1,4 pol no canto superior direito de todo slide; motivo 1,47 pol no canto inferior direito.
- Título de vídeo: `PALAVRA-CHAVE EM CAIXA ALTA - Complemento em Title Case[ - Parte N]`, ≤ 70 caracteres, sem `!`.
- Upload sempre `privacy_status: "private"`, `category_id: "27"`.
- Commits em português, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Testes: `npm test` = `node --test` (sem caminho; `node --test tests/` falha no Node 26).

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json`, `package-lock.json` | dependências e `npm test` |
| `scripts/roteiro.mjs` | parser + validador de `roteiro.md` (módulo + CLI) |
| `scripts/descricao.mjs` | capítulos, descrição, validação de título (módulo + CLI que atualiza `metadados.json`) |
| `design-system/scripts/rasterizar-motivo.mjs` | gera `assets/Marca/motivo-nos-600.png` a partir do SVG |
| `design-system/scripts/gerar-slides.mjs` | `slides.json` → `slides.pptx` com pptxgenjs e tokens |
| `canal.json` | links, rodapé, hashtags fixas, playlists, categoria |
| `videos/_modelo/briefing.md` | formulário em branco para começar um vídeo |
| `videos/folgas-complementares/*` | exemplo real: briefing, roteiro, slides.json, metadados, descricao-publicada.txt, publicacao.json |
| `tests/roteiro.test.mjs`, `tests/descricao.test.mjs`, `tests/slides.test.mjs`, `tests/motivo.test.mjs` | testes |
| `CONTEXT.md`, `docs/adr/000N-*.md` | glossário e decisões (para `grill-with-docs`) |
| `.claude/skills/{roteiro,slides,titulo-descricao,miniatura,publicar,video}/SKILL.md` | skills |
| `.mcp.json` | MCP youtube |
| `CLAUDE.md`, `README.md` | instruções para o agente e para o participante |

---

### Task 1: Base Node do projeto

**Files:**
- Create: `package.json`
- Create: `tests/base.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm test` roda `node --test tests/`; dependências `pptxgenjs`, `yaml`; devDependency `jszip`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "po-para-todos-publisher",
  "version": "0.1.0",
  "private": true,
  "description": "Pipeline de produção de vídeos do canal Pesquisa Operacional para Todos (UNIRIO)",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test tests/",
    "slides": "node design-system/scripts/gerar-slides.mjs",
    "descricao": "node scripts/descricao.mjs",
    "roteiro": "node scripts/roteiro.mjs"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Instalar dependências**

Run: `npm install pptxgenjs yaml && npm install --save-dev jszip`
Expected: `package-lock.json` criado, `node_modules/pptxgenjs` existe. Confirme a versão instalada com `node -e "console.log(require('pptxgenjs/package.json').version)"` (deve ser ≥ 3.12).

- [ ] **Step 3: Escrever teste de fumaça**

`tests/base.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("dependências instaladas", () => {
  assert.ok(existsSync(new URL("../node_modules/pptxgenjs", import.meta.url)));
  assert.ok(existsSync(new URL("../node_modules/yaml", import.meta.url)));
});
```

- [ ] **Step 4: Rodar**

Run: `npm test`
Expected: `# pass 1`

- [ ] **Step 5: Ignorar vídeos gravados e arquivos gerados**

Acrescente ao final de `.gitignore`:
```
videos/**/*.mp4
videos/**/*.mov
videos/**/slides.pptx
videos/**/miniatura.png
!videos/folgas-complementares/miniatura.png
```
(`slides.pptx` e `miniatura.png` são gerados; só a miniatura do exemplo é versionada, para o tutorial.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tests/base.test.mjs .gitignore
git commit -m "Base Node: package.json, testes e dependências da pipeline

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Parser e validador de `roteiro.md` + roteiro do exemplo

**Files:**
- Create: `scripts/roteiro.mjs`
- Create: `videos/folgas-complementares/roteiro.md`
- Test: `tests/roteiro.test.mjs`

**Interfaces:**
- Produces: `lerRoteiro(md: string) → Roteiro`, `validarRoteiro(r: Roteiro) → string[]` (lista de erros, vazia se ok), `carregarRoteiro(caminho: string) → Roteiro` (lê, valida, lança `Error` com os erros).
- `Roteiro = { meta: { titulo_provisorio, formato, duracao_alvo_min, playlist, apresentador, relacionados: [{url, contexto}] }, gancho: { duracao_s, texto }, objetivos: { duracao_s, itens: string[] }, blocos: [{ numero, titulo, tipo: "conteudo"|"exemplo", duracao_s, noSlide: string, fala: string }], finais: [{ titulo, duracao_s, corpo }] }`
- CLI: `node scripts/roteiro.mjs videos/<slug>/roteiro.md` imprime o JSON ou `erro: …` e sai com 1.

- [ ] **Step 1: Escrever o roteiro do exemplo**

`videos/folgas-complementares/roteiro.md` — durações batem com os capítulos reais do vídeo publicado (id `6n6oPR70LSA`):

````markdown
---
titulo_provisorio: Teorema das Folgas Complementares
formato: conceito
duracao_alvo_min: 17
playlist: dualidade
apresentador: Apresentador do PO para Todos
relacionados:
  - url: https://youtu.be/yGP0LK19R30
    contexto: "Quer ver o Preço-Sombra aparecendo na prática, dentro do Excel? Assista à aula sobre o Relatório de Sensibilidade do Solver"
---

## Gancho
Duração: 36 s

Você resolveu o Primal e achou o ótimo. Mas e o Dual — precisa rodar o Simplex tudo de novo? 🤔 Não precisa. Nesta aula vamos usar o Teorema das Folgas Complementares para achar a solução ótima do Dual direto a partir do Primal.

## Objetivos
Duração: 38 s

- O que é a "folga" de uma restrição e por que ela decide se a variável dual vale zero.
- As duas relações de complementaridade, enunciadas e explicadas na intuição antes da fórmula.
- Como montar o Dual de um problema de maximização e resolvê-lo sem refazer o Simplex.
- O que é o Preço-Sombra e por que ele é a base da análise de sensibilidade.

## Blocos

### 1. Relembrando: Primal e Dual
Tipo: conteudo · Duração: 54 s

**No slide**
- Primal: todo problema de PL tem um par. Maximização com restrições ≤ vira minimização com restrições ≥.
- Cada restrição do Primal gera **uma variável** do Dual; cada variável do Primal gera **uma restrição** do Dual.
- Dualidade Forte: no ótimo, **Z\* = W\***.

**Fala**
Antes do teorema, vamos relembrar o que é o par Primal–Dual. Repare que não é um problema novo: é o mesmo problema visto do lado dos recursos.

### 2. A intuição: o que é uma "folga"?
Tipo: conteudo · Duração: 74 s

**No slide**
- Folga é o quanto **sobra** de um recurso na solução ótima.
- Restrição com folga = recurso sobrando = aumentar esse recurso **não muda** o lucro.
- Se não muda o lucro, o "preço" desse recurso no Dual é **zero**.

**Fala**
Pense num recurso que sobrou. Se sobrou, comprar mais dele não adianta nada — e é por isso que a variável dual dele vale zero. Essa é a ideia inteira do teorema.

### 3. O Teorema — Enunciado
Tipo: conteudo · Duração: 50 s

**No slide**
- Sejam x\* ótimo do Primal e y\* ótimo do Dual.
- Para cada restrição i do Primal: **folga_i × y\*_i = 0**.
- Para cada variável j do Primal: **x\*_j × folga_dual_j = 0**.

**Fala**
Agora o enunciado formal. Cada produto é zero: ou a folga é zero, ou a variável é zero. Nunca os dois positivos ao mesmo tempo.

### 4. As relações de complementaridade
Tipo: conteudo · Duração: 70 s

**No slide**
- Condição 1: Se uma restrição do Primal tem **folga**, a variável dual correspondente vale zero.
- Condição 2: Se uma variável do Primal é **positiva**, a restrição dual correspondente é ativa (sem folga).
- Vale o contrário também: as duas condições são simétricas.

**Fala**
Vamos ler as duas condições com calma. A primeira fala das restrições do Primal; a segunda, das variáveis. Repare que uma é o espelho da outra.

### 5. Por que o teorema é útil?
Tipo: conteudo · Duração: 68 s

**No slide**
- Com x\* em mãos, as condições viram um **sistema linear** em y.
- Resolver esse sistema é muito mais rápido do que rodar o Simplex de novo.
- Os y\* são os **Preços-Sombra**: quanto vale uma unidade a mais de cada recurso.

**Fala**
Na prática o teorema transforma o Dual num sisteminha de equações. E o resultado tem nome: Preço-Sombra, que vocês vão reencontrar na análise de sensibilidade.

### 6. Exemplo — O Primal
Tipo: exemplo · Duração: 50 s

**No slide**
max Z = 3x1 + 5x2
s.a. x1 ≤ 4
2x2 ≤ 12
3x1 + 2x2 ≤ 18
x1, x2 ≥ 0
Resultado: x\* = (2, 6), Z\* = 36

**Fala**
Este é o Primal clássico. Já resolvemos ele no vídeo de Simplex: o ótimo é x1 = 2, x2 = 6 e Z = 36. Vamos partir daí.

### 7. Exemplo — Montando o Dual
Tipo: exemplo · Duração: 286 s

**No slide**
min W = 4y1 + 12y2 + 18y3
s.a. y1 + 3y3 ≥ 3
2y2 + 2y3 ≥ 5
y1, y2, y3 ≥ 0
Resultado: três variáveis duais, uma por recurso

**Fala**
Cada restrição do Primal virou uma variável y. Cada variável x virou uma restrição. Os lados direitos trocaram de lugar com os coeficientes do objetivo. Vamos montar linha por linha.

### 8. Exemplo — Analisando as folgas
Tipo: exemplo · Duração: 108 s

**No slide**
Restrição 1: x1 = 2 < 4 → folga 2 → y1 = 0
Restrição 2: 2·6 = 12 → sem folga → y2 livre
Restrição 3: 3·2 + 2·6 = 18 → sem folga → y3 livre
Resultado: y1\* = 0; y2 e y3 vêm das restrições ativas

**Fala**
Substituímos x\* em cada restrição. A primeira sobra: dois de folga, então y1 é zero. As outras duas estão justas, então seus preços podem ser positivos.

### 9. Exemplo — Resolvendo o Dual
Tipo: exemplo · Duração: 50 s

**No slide**
x1 > 0 → y1 + 3y3 = 3 → y3 = 1
x2 > 0 → 2y2 + 2y3 = 5 → y2 = 3/2
Resultado: y\* = (0, 3/2, 1)

**Fala**
Como x1 e x2 são positivos, as duas restrições duais são ativas: viram igualdades. Duas equações, duas incógnitas. Sem Simplex.

### 10. Exemplo — Dualidade Forte
Tipo: exemplo · Duração: 76 s

**No slide**
W\* = 4·0 + 12·(3/2) + 18·1
W\* = 18 + 18 = 36
Resultado: W\* = Z\* = 36

**Fala**
Conferimos: W é 36, exatamente o Z do Primal. Dualidade Forte confirmada — e de quebra ganhamos os três preços-sombra.

## Resumo — Pontos-chave
Duração: 48 s

- Folga positiva ⇒ variável dual zero; variável positiva ⇒ restrição dual ativa.
- Com o ótimo do Primal, o Dual vira um sistema linear.
- Os y\* são os Preços-Sombra.

## Encerramento
Duração: 40 s

Se você quer ver o Preço-Sombra aparecendo na prática, dentro do Excel, assista à aula sobre o Relatório de Sensibilidade do Solver. Deixa o like, se inscreve e compartilha com quem está penando com dualidade!
````

- [ ] **Step 2: Escrever os testes**

`tests/roteiro.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerRoteiro, validarRoteiro } from "../scripts/roteiro.mjs";

const md = readFileSync(new URL("../videos/folgas-complementares/roteiro.md", import.meta.url), "utf8");

test("lê frontmatter, gancho e objetivos", () => {
  const r = lerRoteiro(md);
  assert.equal(r.meta.formato, "conceito");
  assert.equal(r.meta.playlist, "dualidade");
  assert.equal(r.meta.relacionados[0].url, "https://youtu.be/yGP0LK19R30");
  assert.equal(r.gancho.duracao_s, 36);
  assert.ok(r.gancho.texto.startsWith("Você resolveu o Primal"));
  assert.equal(r.objetivos.duracao_s, 38);
  assert.equal(r.objetivos.itens.length, 4);
  assert.ok(r.objetivos.itens[3].startsWith("O que é o Preço-Sombra"));
});

test("lê os 10 blocos com tipo, duração, slide e fala", () => {
  const r = lerRoteiro(md);
  assert.equal(r.blocos.length, 10);
  const b = r.blocos[3];
  assert.equal(b.numero, 4);
  assert.equal(b.titulo, "As relações de complementaridade");
  assert.equal(b.tipo, "conteudo");
  assert.equal(b.duracao_s, 70);
  assert.ok(b.noSlide.startsWith("- Condição 1:"));
  assert.ok(b.fala.startsWith("Vamos ler as duas condições"));
  assert.equal(r.blocos[5].tipo, "exemplo");
});

test("lê as seções finais", () => {
  const r = lerRoteiro(md);
  assert.deepEqual(r.finais.map((f) => [f.titulo, f.duracao_s]), [
    ["Resumo — Pontos-chave", 48],
    ["Encerramento", 40],
  ]);
});

test("roteiro do exemplo é válido", () => {
  assert.deepEqual(validarRoteiro(lerRoteiro(md)), []);
});

test("validação aponta o que falta", () => {
  const quebrado = md
    .replace("Tipo: conteudo · Duração: 54 s", "Tipo: video · Duração: 54 s")
    .replace("### 5. Por que", "### 7. Por que")
    .replace("## Encerramento\nDuração: 40 s", "## Encerramento");
  const erros = validarRoteiro(lerRoteiro(quebrado));
  assert.ok(erros.some((e) => e.includes("bloco 1") && e.includes("tipo")));
  assert.ok(erros.some((e) => e.includes("numerados em sequência")));
  assert.ok(erros.some((e) => e.includes("Encerramento") && e.includes("duração")));
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/roteiro.test.mjs`
Expected: falha com `Cannot find module '.../scripts/roteiro.mjs'`.

- [ ] **Step 4: Implementar `scripts/roteiro.mjs`**

```js
#!/usr/bin/env node
// Lê e valida o roteiro.md de um vídeo.
//
//   node scripts/roteiro.mjs videos/folgas-complementares/roteiro.md   → imprime o JSON
//
// Formato esperado (veja videos/folgas-complementares/roteiro.md):
//   frontmatter YAML; seções "## Gancho", "## Objetivos", "## Blocos" (com "### N. Título"),
//   e uma ou mais seções finais ("## Resumo — …", "## Encerramento").
//   Cada seção e cada bloco começa com "Duração: N s"; cada bloco tem "Tipo: conteudo|exemplo".

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";

const TIPOS = ["conteudo", "exemplo"];

function duracao(texto) {
  const m = texto.match(/Duração:\s*(\d+)\s*s/);
  return m ? Number(m[1]) : null;
}
function semLinhaDeDuracao(texto) {
  return texto.replace(/^.*Duração:.*$/m, "").trim();
}
function itensDeLista(texto) {
  return texto.split("\n").filter((l) => /^\s*-\s+/.test(l)).map((l) => l.replace(/^\s*-\s+/, "").trim());
}

export function lerRoteiro(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = fm ? YAML.parse(fm[1]) ?? {} : {};
  const corpo = fm ? md.slice(fm[0].length) : md;

  // Seções de nível 2, na ordem em que aparecem
  const secoes = [];
  for (const parte of corpo.split(/^## /m).slice(1)) {
    const [titulo, ...resto] = parte.split("\n");
    secoes.push({ titulo: titulo.trim(), texto: resto.join("\n").trim() });
  }
  const achar = (nome) => secoes.find((s) => s.titulo === nome);

  const gancho = achar("Gancho");
  const objetivos = achar("Objetivos");
  const blocosSec = achar("Blocos");

  const blocos = [];
  if (blocosSec) {
    for (const parte of blocosSec.texto.split(/^### /m).slice(1)) {
      const [cab, ...resto] = parte.split("\n");
      const texto = resto.join("\n");
      const m = cab.match(/^(\d+)\.\s*(.+)$/);
      const tipo = (texto.match(/Tipo:\s*([\wçã]+)/) ?? [])[1] ?? null;
      const [antes, depoisSlide = ""] = texto.split("**No slide**");
      const [noSlide, fala = ""] = depoisSlide.split("**Fala**");
      blocos.push({
        numero: m ? Number(m[1]) : null,
        titulo: m ? m[2].trim() : cab.trim(),
        tipo,
        duracao_s: duracao(antes),
        noSlide: noSlide.trim(),
        fala: fala.trim(),
      });
    }
  }

  const fixas = new Set(["Gancho", "Objetivos", "Blocos"]);
  const finais = secoes
    .filter((s) => !fixas.has(s.titulo))
    .map((s) => ({ titulo: s.titulo, duracao_s: duracao(s.texto), corpo: semLinhaDeDuracao(s.texto) }));

  return {
    meta: { relacionados: [], ...meta },
    gancho: gancho ? { duracao_s: duracao(gancho.texto), texto: semLinhaDeDuracao(gancho.texto) } : null,
    objetivos: objetivos ? { duracao_s: duracao(objetivos.texto), itens: itensDeLista(objetivos.texto) } : null,
    blocos,
    finais,
  };
}

export function validarRoteiro(r) {
  const erros = [];
  for (const campo of ["titulo_provisorio", "formato", "playlist"]) {
    if (!r.meta[campo]) erros.push(`frontmatter sem "${campo}"`);
  }
  if (!r.gancho) erros.push('falta a seção "## Gancho"');
  else {
    if (r.gancho.duracao_s == null) erros.push("Gancho sem linha de duração (ex.: Duração: 30 s)");
    if (!r.gancho.texto) erros.push("Gancho vazio");
  }
  if (!r.objetivos) erros.push('falta a seção "## Objetivos"');
  else {
    if (r.objetivos.duracao_s == null) erros.push("Objetivos sem linha de duração");
    if (r.objetivos.itens.length < 3 || r.objetivos.itens.length > 5)
      erros.push(`Objetivos deve ter de 3 a 5 itens (tem ${r.objetivos.itens.length})`);
  }
  if (r.blocos.length === 0) erros.push('falta a seção "## Blocos" com pelo menos um "### 1. Título"');
  r.blocos.forEach((b, i) => {
    const nome = `bloco ${b.numero ?? i + 1}`;
    if (!TIPOS.includes(b.tipo)) erros.push(`${nome}: tipo "${b.tipo}" inválido — use ${TIPOS.join(" ou ")}`);
    if (b.duracao_s == null) erros.push(`${nome}: sem duração (ex.: Duração: 60 s)`);
    if (!b.noSlide) erros.push(`${nome}: sem a parte "**No slide**"`);
    if (!b.fala) erros.push(`${nome}: sem a parte "**Fala**"`);
  });
  if (r.blocos.some((b, i) => b.numero !== i + 1)) erros.push("blocos precisam estar numerados em sequência a partir de 1");
  const enc = r.finais.find((f) => f.titulo === "Encerramento");
  if (!enc) erros.push('falta a seção "## Encerramento"');
  else if (enc.duracao_s == null) erros.push("Encerramento sem linha de duração");
  for (const f of r.finais) if (f.duracao_s == null && f.titulo !== "Encerramento") erros.push(`seção "${f.titulo}" sem duração`);
  return erros;
}

export function carregarRoteiro(caminho) {
  const r = lerRoteiro(readFileSync(resolve(caminho), "utf8"));
  const erros = validarRoteiro(r);
  if (erros.length) throw new Error(`roteiro inválido:\n- ${erros.join("\n- ")}`);
  return r;
}

export function duracaoTotal(r) {
  return (r.gancho?.duracao_s ?? 0) + (r.objetivos?.duracao_s ?? 0)
    + r.blocos.reduce((s, b) => s + (b.duracao_s ?? 0), 0)
    + r.finais.reduce((s, f) => s + (f.duracao_s ?? 0), 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const caminho = process.argv[2];
  if (!caminho) { console.error("uso: node scripts/roteiro.mjs videos/<slug>/roteiro.md"); process.exit(1); }
  try {
    const r = carregarRoteiro(caminho);
    console.log(JSON.stringify({ ...r, duracao_total_s: duracaoTotal(r) }, null, 2));
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 5: Rodar os testes**

Run: `node --test tests/roteiro.test.mjs`
Expected: `# pass 5`. Se o teste dos blocos falhar em `noSlide`, confira que o separador `**No slide**` está exatamente assim no roteiro (com asteriscos).

- [ ] **Step 6: Conferir a CLI**

Run: `node scripts/roteiro.mjs videos/folgas-complementares/roteiro.md | head -20`
Expected: JSON começando com `"meta"`; ao final `"duracao_total_s": 1048` (= 17 min 28 s, a duração real do vídeo).

- [ ] **Step 7: Commit**

```bash
git add scripts/roteiro.mjs tests/roteiro.test.mjs videos/folgas-complementares/roteiro.md
git commit -m "Parser e validador de roteiro.md com o roteiro do exemplo Folgas Complementares

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Descrição, capítulos, título e `canal.json`

**Files:**
- Create: `canal.json`
- Create: `scripts/descricao.mjs`
- Create: `videos/folgas-complementares/metadados.json`
- Create: `videos/folgas-complementares/descricao-publicada.txt`
- Test: `tests/descricao.test.mjs`

**Interfaces:**
- Consumes: `carregarRoteiro`, `lerRoteiro` de `scripts/roteiro.mjs`.
- Produces: `formatarTempo(s) → "mm:ss"`, `capitulos(roteiro) → [{tempo, titulo}]`, `montarDescricao({roteiro, metadados, canal}) → string`, `validarTitulo(t) → string[]`.
- CLI: `node scripts/descricao.mjs videos/<slug>` — lê `roteiro.md`, `metadados.json` e `canal.json`; se `metadados.capitulos` for nulo, calcula e grava; grava `metadados.descricao`; imprime a descrição. `node scripts/descricao.mjs --validar-titulo "TÍTULO"` imprime `ok` ou os erros.
- `metadados.json = { titulos_candidatos: string[], titulo: string|null, fechamento: string, cta_complemento: string, hashtags_tema: string[], tags: string[], capitulos: [{tempo, titulo}]|null, descricao: string|null }`

- [ ] **Step 1: Criar `canal.json`**

```json
{
  "nome": "Pesquisa Operacional para Todos",
  "site": "https://pesquisaoperacional.uniriotec.br/index.html",
  "instagram": "https://www.instagram.com/pesquisaoperacionalparatodos/",
  "categoriaYoutube": "27",
  "rodape": {
    "projeto": "📚 Este conteúdo faz parte do PO Para Todos, um projeto da UNIRIO que busca democratizar o ensino da Pesquisa Operacional de um jeito acessível e direto.",
    "convite": "💡 Gostou da aula? Acompanhe nosso projeto e tenha acesso a mais materiais:",
    "cta": "👍 Não esqueça de deixar o like, se inscrever no canal e compartilhar o vídeo com quem {complemento}!"
  },
  "hashtags": {
    "abertura": ["#PesquisaOperacional", "#PO"],
    "fechamento": ["#Otimização", "#UNIRIO"]
  },
  "playlists": {
    "programacao-inteira": { "id": "PLdARkEgZLCfwLNUJKQEMnVmdasoqkQROX", "nome": "Programação Inteira" },
    "teoria-dos-jogos": { "id": "PLdARkEgZLCfwK11_FYfBVMT-C2ugC9qui", "nome": "Teoria dos Jogos" },
    "arvore-geradora": { "id": "PLdARkEgZLCfzpZRjpkkrvNgnBA_16eLFW", "nome": "Árvore Geradora" },
    "po2": { "id": "PLdARkEgZLCfyhA7Y5PFICBoACdjekfTh1", "nome": "Pesquisa Operacional 2" },
    "sensibilidade": { "id": "PLdARkEgZLCfw128oRJMF9CCGON8H2jy11", "nome": "Análise de Sensibilidade e Pós-otimização" },
    "dualidade": { "id": "PLdARkEgZLCfxTCwI7DcHPVcik0RxXKO5v", "nome": "Dualidade" },
    "solver": { "id": "PLdARkEgZLCfxokilvmCWKp1EMR3UWzC2n", "nome": "Resolução de PPL utilizando o Solver" },
    "po1": { "id": "PLdARkEgZLCfwKLFUREqCiN9qaPctEUXbS", "nome": "Pesquisa Operacional 1" }
  }
}
```

- [ ] **Step 2: Salvar a descrição real publicada (fixture)**

`videos/folgas-complementares/descricao-publicada.txt` — copie exatamente (sem linha em branco no final):

```
Você resolveu o Primal e achou o ótimo. Mas e o Dual — precisa rodar o Simplex tudo de novo? 🤔 Não precisa. Nesta aula vamos usar o Teorema das Folgas Complementares para achar a solução ótima do Dual direto a partir do Primal.

Nesta aula, você vai aprender:

O que é a "folga" de uma restrição e por que ela decide se a variável dual vale zero.

As duas relações de complementaridade, enunciadas e explicadas na intuição antes da fórmula.

Como montar o Dual de um problema de maximização e resolvê-lo sem refazer o Simplex.

O que é o Preço-Sombra e por que ele é a base da análise de sensibilidade.

Fechamos com um exemplo completo, do Primal até a confirmação da Dualidade Forte: W* = Z* = 36.

⏱️ Capítulos:
00:00 Abertura
00:36 Objetivos
01:14 Relembrando: Primal e Dual
02:08 A intuição: o que é uma "folga"?
03:22 O Teorema — Enunciado
04:12 As relações de complementaridade
05:22 Por que o teorema é útil?
06:30 Exemplo — O Primal
07:20 Exemplo — Montando o Dual
12:06 Exemplo — Analisando as folgas
13:54 Exemplo — Resolvendo o Dual
14:44 Exemplo — Dualidade Forte
16:00 Resumo — Pontos-chave
16:48 Encerramento

⚠️ Quer ver o Preço-Sombra aparecendo na prática, dentro do Excel? Assista à aula sobre o Relatório de Sensibilidade do Solver: https://youtu.be/yGP0LK19R30

📚 Este conteúdo faz parte do PO Para Todos, um projeto da UNIRIO que busca democratizar o ensino da Pesquisa Operacional de um jeito acessível e direto.

💡 Gostou da aula? Acompanhe nosso projeto e tenha acesso a mais materiais:

📸 Instagram: https://www.instagram.com/pesquisaoperacionalparatodos/
🌐 Nosso Site: https://pesquisaoperacional.uniriotec.br/index.html

👍 Não esqueça de deixar o like, se inscrever no canal e compartilhar o vídeo com quem está penando com dualidade!

#PesquisaOperacional #PO #FolgasComplementares #Dualidade #ProgramacaoLinear #PrecoSombra #Otimização #UNIRIO
```

- [ ] **Step 3: Criar `metadados.json` do exemplo (sem `descricao` e sem `capitulos` — o script preenche)**

```json
{
  "titulos_candidatos": [
    "TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra",
    "FOLGAS COMPLEMENTARES - Do Primal ao Dual sem Refazer o Simplex",
    "DUALIDADE - O Teorema das Folgas Complementares Explicado",
    "FOLGAS COMPLEMENTARES - Como Achar o Dual a Partir do Primal",
    "PREÇO-SOMBRA - De Onde Ele Vem? Folgas Complementares"
  ],
  "titulo": "TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra",
  "fechamento": "Fechamos com um exemplo completo, do Primal até a confirmação da Dualidade Forte: W* = Z* = 36.",
  "cta_complemento": "está penando com dualidade",
  "hashtags_tema": ["#FolgasComplementares", "#Dualidade", "#ProgramacaoLinear", "#PrecoSombra"],
  "tags": [
    "folgas complementares", "teorema das folgas complementares", "dualidade", "primal e dual",
    "preço sombra", "programação linear", "pesquisa operacional", "simplex", "otimização",
    "análise de sensibilidade", "UNIRIO", "PO para Todos"
  ],
  "capitulos": null,
  "descricao": null
}
```

- [ ] **Step 4: Escrever os testes**

`tests/descricao.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerRoteiro } from "../scripts/roteiro.mjs";
import { formatarTempo, capitulos, montarDescricao, validarTitulo } from "../scripts/descricao.mjs";

const pasta = new URL("../videos/folgas-complementares/", import.meta.url);
const roteiro = lerRoteiro(readFileSync(new URL("roteiro.md", pasta), "utf8"));
const metadados = JSON.parse(readFileSync(new URL("metadados.json", pasta), "utf8"));
const canal = JSON.parse(readFileSync(new URL("../../canal.json", pasta), "utf8"));
const publicada = readFileSync(new URL("descricao-publicada.txt", pasta), "utf8").trim();

test("formata tempo em mm:ss e h:mm:ss", () => {
  assert.equal(formatarTempo(0), "00:00");
  assert.equal(formatarTempo(74), "01:14");
  assert.equal(formatarTempo(3725), "1:02:05");
});

test("capítulos acumulam as durações do roteiro", () => {
  const c = capitulos(roteiro);
  assert.equal(c.length, 14);
  assert.deepEqual(c[0], { tempo: "00:00", titulo: "Abertura" });
  assert.deepEqual(c[2], { tempo: "01:14", titulo: "Relembrando: Primal e Dual" });
  assert.deepEqual(c[13], { tempo: "16:48", titulo: "Encerramento" });
});

test("descrição gerada é idêntica à publicada", () => {
  assert.equal(montarDescricao({ roteiro, metadados, canal }), publicada);
});

test("capítulos reais em metadados substituem os estimados", () => {
  const m = { ...metadados, capitulos: [{ tempo: "00:00", titulo: "Abertura" }, { tempo: "00:40", titulo: "Fim" }] };
  const d = montarDescricao({ roteiro, metadados: m, canal });
  assert.ok(d.includes("00:40 Fim"));
  assert.ok(!d.includes("01:14 Relembrando"));
});

test("sem vídeos relacionados o bloco ⚠️ some", () => {
  const r = { ...roteiro, meta: { ...roteiro.meta, relacionados: [] } };
  const d = montarDescricao({ roteiro: r, metadados, canal });
  assert.ok(!d.includes("⚠️"));
  assert.ok(d.includes("16:48 Encerramento\n\n📚"));
});

test("valida título no padrão do canal", () => {
  assert.deepEqual(validarTitulo("TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra"), []);
  assert.deepEqual(validarTitulo("COMO USAR SOLVER NO EXCEL - Análise de Sensibilidade - Parte 2"), []);
  assert.ok(validarTitulo("Teorema das folgas - explicado").some((e) => e.includes("CAIXA ALTA")));
  assert.ok(validarTitulo("SIMPLEX explicado").some((e) => e.includes(' - ')));
  assert.ok(validarTitulo("SIMPLEX - Aprenda Agora!").some((e) => e.includes("!")));
  assert.ok(validarTitulo("SIMPLEX - " + "a".repeat(70)).some((e) => e.includes("70")));
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `node --test tests/descricao.test.mjs`
Expected: falha com `Cannot find module '.../scripts/descricao.mjs'`.

- [ ] **Step 6: Implementar `scripts/descricao.mjs`**

```js
#!/usr/bin/env node
// Monta a descrição do YouTube no molde do canal a partir de roteiro.md + metadados.json + canal.json.
//
//   node scripts/descricao.mjs videos/folgas-complementares        → grava metadados.descricao (e capitulos, se faltar) e imprime
//   node scripts/descricao.mjs --validar-titulo "SIMPLEX - Passo a Passo"
//
// Molde (extraído do vídeo "Teorema das Folgas Complementares", set/2026):
//   gancho · "Nesta aula, você vai aprender:" + objetivos · fechamento · ⏱️ capítulos ·
//   ⚠️ relacionados · rodapé fixo do canal · CTA com complemento · hashtags.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { carregarRoteiro } from "./roteiro.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITULO_MAX = 70;

export function formatarTempo(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(seg).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function capitulos(roteiro) {
  const lista = [];
  let t = 0;
  const add = (titulo, dur) => { lista.push({ tempo: formatarTempo(t), titulo }); t += dur ?? 0; };
  add("Abertura", roteiro.gancho?.duracao_s);
  add("Objetivos", roteiro.objetivos?.duracao_s);
  for (const b of roteiro.blocos) add(b.titulo, b.duracao_s);
  for (const f of roteiro.finais) add(f.titulo, f.duracao_s);
  return lista;
}

export function montarDescricao({ roteiro, metadados, canal }) {
  const caps = metadados.capitulos ?? capitulos(roteiro);
  const partes = [
    roteiro.gancho.texto,
    "Nesta aula, você vai aprender:",
    ...roteiro.objetivos.itens,
    metadados.fechamento,
    "⏱️ Capítulos:\n" + caps.map((c) => `${c.tempo} ${c.titulo}`).join("\n"),
    ...(roteiro.meta.relacionados ?? []).map((r) => `⚠️ ${r.contexto}: ${r.url}`),
    canal.rodape.projeto,
    canal.rodape.convite,
    `📸 Instagram: ${canal.instagram}\n🌐 Nosso Site: ${canal.site}`,
    canal.rodape.cta.replace("{complemento}", metadados.cta_complemento),
    [...canal.hashtags.abertura, ...metadados.hashtags_tema, ...canal.hashtags.fechamento].join(" "),
  ];
  return partes.filter((p) => p && p.trim()).join("\n\n");
}

export function validarTitulo(titulo) {
  const erros = [];
  if (titulo.length > TITULO_MAX) erros.push(`título com ${titulo.length} caracteres — máximo ${TITULO_MAX}`);
  if (titulo.includes("!")) erros.push("título não usa ponto de exclamação (!)");
  const partes = titulo.split(" - ");
  if (partes.length < 2) erros.push('título precisa de " - " separando a palavra-chave do complemento');
  else if (/\p{Ll}/u.test(partes[0])) erros.push("a parte antes do \" - \" vai em CAIXA ALTA");
  return erros;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [arg, valor] = process.argv.slice(2);
  try {
    if (arg === "--validar-titulo") {
      const erros = validarTitulo(valor ?? "");
      if (erros.length) { console.error(`erro: ${erros.join("; ")}`); process.exit(1); }
      console.log("ok"); process.exit(0);
    }
    if (!arg) { console.error("uso: node scripts/descricao.mjs videos/<slug>"); process.exit(1); }
    const pasta = resolve(arg);
    const roteiro = carregarRoteiro(join(pasta, "roteiro.md"));
    const metaPath = join(pasta, "metadados.json");
    const metadados = JSON.parse(readFileSync(metaPath, "utf8"));
    const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
    for (const campo of ["fechamento", "cta_complemento", "hashtags_tema"]) {
      if (!metadados[campo]) throw new Error(`metadados.json sem "${campo}"`);
    }
    if (!metadados.capitulos) metadados.capitulos = capitulos(roteiro);
    metadados.descricao = montarDescricao({ roteiro, metadados, canal });
    writeFileSync(metaPath, JSON.stringify(metadados, null, 2) + "\n");
    console.log(metadados.descricao);
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 7: Rodar os testes**

Run: `node --test tests/descricao.test.mjs`
Expected: `# pass 6`. Se o teste de igualdade falhar, rode `node -e` com um diff linha a linha — a diferença normalmente é um espaço ou emoji; nunca ajuste a fixture publicada, ajuste o molde.

- [ ] **Step 8: Rodar a CLI sobre o exemplo e conferir que gravou**

Run: `node scripts/descricao.mjs videos/folgas-complementares > /dev/null && node -e "const m=require('./videos/folgas-complementares/metadados.json'); console.log(m.capitulos.length, [...m.descricao].length)"`
Expected: `14 1873` (14 capítulos; 1873 caracteres Unicode — `[...s].length` conta code points, como `wc -m`; `s.length` daria 1879 por causa dos emojis).

- [ ] **Step 9: Commit**

```bash
git add canal.json scripts/descricao.mjs tests/descricao.test.mjs videos/folgas-complementares/
git commit -m "Descrição no molde do canal: capítulos, rodapé, hashtags e validação de título

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Motivo de nós em PNG para o PPTX

**Files:**
- Create: `design-system/scripts/rasterizar-motivo.mjs`
- Create: `design-system/assets/Marca/motivo-nos-600.png` (gerado e versionado)
- Test: `tests/motivo.test.mjs`

**Interfaces:**
- Produces: `design-system/assets/Marca/motivo-nos-600.png`, 600×600, fundo transparente, usado por `gerar-slides.mjs`.

- [ ] **Step 1: Escrever o teste**

`tests/motivo.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("motivo-nos-600.png existe e mede 600×600", () => {
  const buf = readFileSync(new URL("../design-system/assets/Marca/motivo-nos-600.png", import.meta.url));
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  assert.equal(buf.readUInt32BE(16), 600);
  assert.equal(buf.readUInt32BE(20), 600);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/motivo.test.mjs`
Expected: `ENOENT … motivo-nos-600.png`.

- [ ] **Step 3: Escrever o script**

`design-system/scripts/rasterizar-motivo.mjs`:
```js
#!/usr/bin/env node
// Converte assets/Marca/motivo-nos.svg em PNG 600×600 com fundo transparente, para uso no PPTX
// (pptxgenjs não rasteriza SVG fora do navegador). Rode de novo só se o SVG mudar.
//
//   node design-system/scripts/rasterizar-motivo.mjs

import { writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SVG = join(DS, "assets/Marca/motivo-nos.svg");
const PNG = join(DS, "assets/Marca/motivo-nos-600.png");

function acharChrome() {
  const candidatos = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge",
  ].filter(Boolean);
  const bin = candidatos.find((c) => existsSync(c));
  if (!bin) throw new Error("nenhum Chrome/Chromium/Edge encontrado; defina CHROME=/caminho/do/binário");
  return bin;
}

export function rasterizar() {
  const dir = mkdtempSync(join(tmpdir(), "motivo-"));
  const html = join(dir, "motivo.html");
  writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    img{display:block;width:600px;height:600px}
  </style></head><body><img src="${pathToFileURL(SVG).href}"></body></html>`);
  execFileSync(acharChrome(), [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
    "--window-size=600,600", `--screenshot=${PNG}`, pathToFileURL(html).href,
  ], { stdio: "ignore" });
  return PNG;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(rasterizar()); }
  catch (e) { console.error(`erro: ${e.message}`); process.exit(1); }
}
```

- [ ] **Step 4: Gerar e testar**

Run: `node design-system/scripts/rasterizar-motivo.mjs && node --test tests/motivo.test.mjs`
Expected: caminho do PNG impresso, `# pass 1`. Abra o PNG (`open design-system/assets/Marca/motivo-nos-600.png`) e confirme fundo transparente e traços verdes-claros; se o fundo vier branco, confira que a flag `--default-background-color=00000000` foi passada (Edge e Chrome a aceitam).

- [ ] **Step 5: Commit**

```bash
git add design-system/scripts/rasterizar-motivo.mjs design-system/assets/Marca/motivo-nos-600.png tests/motivo.test.mjs
git commit -m "Motivo de nós rasterizado em PNG para os slides PPTX

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `gerar-slides.mjs` — tokens, validação, capa e conteúdo

**Files:**
- Create: `design-system/scripts/gerar-slides.mjs`
- Create: `videos/folgas-complementares/slides.json`
- Test: `tests/slides.test.mjs`

**Interfaces:**
- Produces: `carregarTokens() → { cor: {nome→"RRGGBB"}, fonte: {title, body}, pt: {titulo:44, corpo:20, caption:18} }`, `validarSlides(spec) → string[]`, `gerarSlides(spec, { saida }) → Promise<string>` (caminho do PPTX). Tipos de slide: `capa`, `conteudo`, `exemplo`, `encerramento`.
- `slides.json = { apresentador: string, slides: [ {tipo:"capa", titulo}, {tipo:"conteudo", titulo, blocos:[{rotulo?: string, itens: string[]}]}, {tipo:"exemplo", titulo, formulacao: string[], resultado: string}, {tipo:"encerramento"} ] }`. Itens aceitam `**negrito**` inline.
- Limites (constantes exportadas `LIMITES`): `titulo` 60 caracteres, `capaTitulo` 66, `linhasCorpo` 9 (cada rótulo = 1 linha; cada item = `ceil(len/78)` linhas), `formulacaoLinhas` 7, `formulacaoChars` 60, `resultado` 60.

- [ ] **Step 1: Criar `slides.json` do exemplo (14 slides, um por capítulo)**

`videos/folgas-complementares/slides.json`:
```json
{
  "apresentador": "Apresentador do PO para Todos",
  "slides": [
    { "tipo": "capa", "titulo": "Teorema das Folgas Complementares" },
    { "tipo": "conteudo", "titulo": "Objetivos", "blocos": [ { "itens": [
      "O que é a \"folga\" de uma restrição e por que ela decide se a variável dual vale zero.",
      "As duas relações de complementaridade, na intuição antes da fórmula.",
      "Como montar o Dual de um problema de maximização e resolvê-lo sem refazer o Simplex.",
      "O que é o Preço-Sombra e por que ele é a base da análise de sensibilidade."
    ] } ] },
    { "tipo": "conteudo", "titulo": "Relembrando: Primal e Dual", "blocos": [ { "itens": [
      "Todo problema de PL tem um par: maximização com ≤ vira minimização com ≥.",
      "Cada restrição do Primal gera **uma variável** do Dual; cada variável gera **uma restrição**.",
      "Dualidade Forte: no ótimo, **Z* = W***."
    ] } ] },
    { "tipo": "conteudo", "titulo": "A intuição: o que é uma \"folga\"?", "blocos": [ { "itens": [
      "Folga é o quanto **sobra** de um recurso na solução ótima.",
      "Restrição com folga = recurso sobrando = aumentar esse recurso **não muda** o lucro.",
      "Se não muda o lucro, o \"preço\" desse recurso no Dual é **zero**."
    ] } ] },
    { "tipo": "conteudo", "titulo": "O Teorema — Enunciado", "blocos": [ { "itens": [
      "Sejam x* ótimo do Primal e y* ótimo do Dual.",
      "Para cada restrição i do Primal: **folga_i × y*_i = 0**.",
      "Para cada variável j do Primal: **x*_j × folga_dual_j = 0**."
    ] } ] },
    { "tipo": "conteudo", "titulo": "As relações de complementaridade", "blocos": [
      { "rotulo": "Condição 1", "itens": [ "Se uma restrição do Primal tem **folga**, a variável dual correspondente vale zero." ] },
      { "rotulo": "Condição 2", "itens": [ "Se uma variável do Primal é **positiva**, a restrição dual correspondente é ativa.", "Vale o contrário também: as duas condições são simétricas." ] }
    ] },
    { "tipo": "conteudo", "titulo": "Por que o teorema é útil?", "blocos": [ { "itens": [
      "Com x* em mãos, as condições viram um **sistema linear** em y.",
      "Resolver esse sistema é muito mais rápido do que rodar o Simplex de novo.",
      "Os y* são os **Preços-Sombra**: quanto vale uma unidade a mais de cada recurso."
    ] } ] },
    { "tipo": "exemplo", "titulo": "Exemplo — O Primal",
      "formulacao": [ "max Z = 3x₁ + 5x₂", "s.a.  x₁ ≤ 4", "      2x₂ ≤ 12", "      3x₁ + 2x₂ ≤ 18", "      x₁, x₂ ≥ 0" ],
      "resultado": "x* = (2, 6), Z* = 36" },
    { "tipo": "exemplo", "titulo": "Exemplo — Montando o Dual",
      "formulacao": [ "min W = 4y₁ + 12y₂ + 18y₃", "s.a.  y₁ + 3y₃ ≥ 3", "      2y₂ + 2y₃ ≥ 5", "      y₁, y₂, y₃ ≥ 0" ],
      "resultado": "Uma variável dual por recurso" },
    { "tipo": "exemplo", "titulo": "Exemplo — Analisando as folgas",
      "formulacao": [ "Restrição 1: x₁ = 2 < 4 → folga 2 → y₁ = 0", "Restrição 2: 2·6 = 12 → sem folga", "Restrição 3: 3·2 + 2·6 = 18 → sem folga" ],
      "resultado": "y₁* = 0; y₂ e y₃ vêm das restrições ativas" },
    { "tipo": "exemplo", "titulo": "Exemplo — Resolvendo o Dual",
      "formulacao": [ "x₁ > 0 → y₁ + 3y₃ = 3 → y₃ = 1", "x₂ > 0 → 2y₂ + 2y₃ = 5 → y₂ = 3/2" ],
      "resultado": "y* = (0, 3/2, 1)" },
    { "tipo": "exemplo", "titulo": "Exemplo — Dualidade Forte",
      "formulacao": [ "W* = 4·0 + 12·(3/2) + 18·1", "W* = 18 + 18 = 36" ],
      "resultado": "W* = Z* = 36" },
    { "tipo": "conteudo", "titulo": "Resumo — Pontos-chave", "blocos": [ { "itens": [
      "Folga positiva ⇒ variável dual zero; variável positiva ⇒ restrição dual ativa.",
      "Com o ótimo do Primal, o Dual vira um sistema linear.",
      "Os y* são os Preços-Sombra."
    ] } ] },
    { "tipo": "encerramento" }
  ]
}
```

- [ ] **Step 2: Escrever os testes de validação, capa e conteúdo**

`tests/slides.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { carregarTokens, validarSlides, gerarSlides, LIMITES } from "../design-system/scripts/gerar-slides.mjs";

const spec = JSON.parse(readFileSync(new URL("../videos/folgas-complementares/slides.json", import.meta.url), "utf8"));

async function abrir(spec) {
  const saida = join(mkdtempSync(join(tmpdir(), "slides-")), "t.pptx");
  await gerarSlides(spec, { saida });
  const zip = await JSZip.loadAsync(readFileSync(saida));
  const nomes = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const xml = {};
  for (const n of nomes) xml[Number(n.match(/slide(\d+)/)[1])] = await zip.file(n).async("string");
  const rels = {};
  for (const n of nomes) {
    const i = Number(n.match(/slide(\d+)/)[1]);
    rels[i] = await zip.file(`ppt/slides/_rels/slide${i}.xml.rels`).async("string");
  }
  return { total: nomes.length, xml, rels };
}

test("tokens vêm do tokens.json", () => {
  const t = carregarTokens();
  assert.equal(t.cor["brand-navy"], "0E2841");
  assert.equal(t.cor["accent-blue"], "156082");
  assert.equal(t.cor["surface-panel"], "F3F4F5");
  assert.equal(t.fonte.title, "Aharoni");
  assert.equal(t.fonte.body, "Hagrid Text");
  assert.deepEqual(t.pt, { titulo: 44, corpo: 20, caption: 18 });
});

test("slides.json do exemplo é válido", () => {
  assert.deepEqual(validarSlides(spec), []);
});

test("validação recusa o que não cabe", () => {
  const longo = { apresentador: "x", slides: [
    { tipo: "capa", titulo: "a".repeat(LIMITES.capaTitulo + 1) },
    { tipo: "conteudo", titulo: "t", blocos: [{ itens: Array(10).fill("b".repeat(80)) }] },
    { tipo: "exemplo", titulo: "t", formulacao: ["c".repeat(61)], resultado: "r" },
    { tipo: "foto", titulo: "t" },
  ] };
  const erros = validarSlides(longo);
  assert.ok(erros.some((e) => e.startsWith("slide 1") && e.includes("título")));
  assert.ok(erros.some((e) => e.startsWith("slide 2") && e.includes("linhas")));
  assert.ok(erros.some((e) => e.startsWith("slide 3") && e.includes("formulação")));
  assert.ok(erros.some((e) => e.startsWith("slide 4") && e.includes("tipo")));
});

test("gera um slide por entrada, com logo UNIRIO em todos", async () => {
  const { total, rels } = await abrir(spec);
  assert.equal(total, 14);
  for (let i = 1; i <= total; i++) assert.match(rels[i], /logo-unirio|image/);
});

test("capa: título em Aharoni 44pt navy, autoria em caption", async () => {
  const { xml } = await abrir(spec);
  assert.ok(xml[1].includes("Teorema das Folgas Complementares"));
  assert.ok(xml[1].includes('typeface="Aharoni"'));
  assert.ok(xml[1].includes('sz="4400"'));
  assert.ok(xml[1].includes('val="0E2841"'));
  assert.ok(xml[1].includes("Projeto PO para Todos – UNIRIO"));
  assert.ok(xml[1].includes('sz="1800"'));
});

test("conteúdo: rótulo em accent-blue, marcadores e negrito inline", async () => {
  const { xml } = await abrir(spec);
  const s = xml[6]; // "As relações de complementaridade"
  assert.ok(s.includes("Condição 1"));
  assert.ok(s.includes('val="156082"'));
  assert.ok(s.includes("<a:buChar"));
  assert.ok(s.includes('typeface="Hagrid Text"'));
  assert.ok(s.includes('sz="2000"'));
  assert.ok(/<a:rPr[^>]*b="1"[^>]*>(?:(?!<\/a:r>).)*<a:t>folga<\/a:t>/s.test(s));
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/slides.test.mjs`
Expected: `Cannot find module '.../gerar-slides.mjs'`.

- [ ] **Step 4: Implementar tokens, validação, capa e conteúdo**

`design-system/scripts/gerar-slides.mjs`:
```js
#!/usr/bin/env node
// Gera o slides.pptx de um vídeo a partir do slides.json, usando as cores, fontes e grade do design system.
//
//   node design-system/scripts/gerar-slides.mjs videos/folgas-complementares            → videos/folgas-complementares/slides.pptx
//   node design-system/scripts/gerar-slides.mjs videos/x --saida /tmp/x.pptx
//   node design-system/scripts/gerar-slides.mjs --validar videos/x                       → só valida, não gera
//
// Tipos de slide (fundamentos-slides.md): capa, conteudo, exemplo, encerramento.
// O gerador recusa texto que não cabe; encurte o texto, nunca a fonte.

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pptxgen from "pptxgenjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARCA = join(DS, "assets/Marca");
const LOGO_UNIRIO = join(MARCA, "logo-unirio.png");
const MOTIVO = join(MARCA, "motivo-nos-600.png");
const LINK_PROJETO = "pesquisaoperacional.uniriotec.br";

// ---------- tokens ----------
export function carregarTokens() {
  const t = JSON.parse(readFileSync(join(DS, "tokens.json"), "utf8"));
  const cor = {};
  for (const c of t.color.tokens ?? t.color) {
    const v = typeof c.value === "string" ? c.value : c.value.slides;
    cor[c.name] = v.replace("#", "").toUpperCase();
  }
  const primeira = (fam) => t.type.families[fam].split(",")[0].replace(/"/g, "").trim();
  return {
    cor,
    fonte: { title: primeira("title"), body: primeira("body") },
    pt: { titulo: 44, corpo: 20, caption: 18 }, // valores em pt documentados nos tokens (44pt/20pt/18pt)
  };
}

// ---------- grade (polegadas; fundamentos-slides.md) ----------
const G = {
  larg: 13.333, alt: 7.5, margem: 0.7,
  tituloY: 0.33, tituloH: 1.3, corpoY: 1.75, corpoH: 3.85,
  logo: 1.4, logoY: 0.15, motivo: 1.47,
};
G.tituloW = G.larg - 2 * G.margem - G.logo - 0.3;   // não invade o logo
G.corpoW = G.larg - 2 * G.margem;
G.logoX = G.larg - G.margem - G.logo;
G.motivoX = G.larg - G.margem - G.motivo;
G.motivoY = G.alt - 0.33 - G.motivo;

// ---------- validação ----------
export const LIMITES = { titulo: 60, capaTitulo: 66, linhasCorpo: 9, charsPorLinha: 78, formulacaoLinhas: 7, formulacaoChars: 60, resultado: 60 };
const TIPOS = ["capa", "conteudo", "exemplo", "encerramento"];
const semMarcas = (s) => s.replace(/\*\*/g, "");

export function validarSlides(spec) {
  const erros = [];
  if (!spec.apresentador) erros.push('falta "apresentador"');
  if (!Array.isArray(spec.slides) || !spec.slides.length) erros.push('"slides" precisa ser uma lista com pelo menos a capa');
  (spec.slides ?? []).forEach((s, i) => {
    const n = `slide ${i + 1}`;
    if (!TIPOS.includes(s.tipo)) { erros.push(`${n}: tipo "${s.tipo}" inválido — use ${TIPOS.join(", ")}`); return; }
    if (s.tipo !== "encerramento" && !s.titulo) erros.push(`${n}: sem título`);
    if (s.tipo === "capa" && s.titulo?.length > LIMITES.capaTitulo) erros.push(`${n}: título da capa com ${s.titulo.length} caracteres — máximo ${LIMITES.capaTitulo}`);
    if (s.tipo !== "capa" && s.titulo?.length > LIMITES.titulo) erros.push(`${n}: título com ${s.titulo.length} caracteres — máximo ${LIMITES.titulo}`);
    if (s.tipo === "conteudo") {
      if (!s.blocos?.length) erros.push(`${n}: slide de conteúdo sem "blocos"`);
      let linhas = 0;
      for (const b of s.blocos ?? []) {
        if (b.rotulo) linhas += 1;
        for (const it of b.itens ?? []) linhas += Math.ceil(semMarcas(it).length / LIMITES.charsPorLinha);
      }
      if (linhas > LIMITES.linhasCorpo) erros.push(`${n}: corpo ocupa ~${linhas} linhas — máximo ${LIMITES.linhasCorpo}; encurte ou divida em dois slides`);
    }
    if (s.tipo === "exemplo") {
      if (!s.formulacao?.length) erros.push(`${n}: slide de exemplo sem "formulacao"`);
      if ((s.formulacao?.length ?? 0) > LIMITES.formulacaoLinhas) erros.push(`${n}: formulação com ${s.formulacao.length} linhas — máximo ${LIMITES.formulacaoLinhas}`);
      for (const l of s.formulacao ?? []) if (l.length > LIMITES.formulacaoChars) erros.push(`${n}: linha da formulação com ${l.length} caracteres — máximo ${LIMITES.formulacaoChars}`);
      if (!s.resultado) erros.push(`${n}: slide de exemplo sem "resultado"`);
      else if (s.resultado.length > LIMITES.resultado) erros.push(`${n}: resultado com ${s.resultado.length} caracteres — máximo ${LIMITES.resultado}`);
    }
  });
  return erros;
}

// ---------- texto ----------
// "Se tem **folga**, vale zero" → runs com negrito só no trecho marcado.
function runs(texto, base, { bullet = false, breakLine = true } = {}) {
  const partes = texto.split("**");
  const lista = partes.map((p, i) => ({ text: p, options: { ...base, bold: i % 2 === 1 || base.bold === true } })).filter((r) => r.text !== "");
  if (bullet) lista[0].options.bullet = { indent: 18 };
  if (breakLine) lista[lista.length - 1].options.breakLine = true;
  return lista;
}

// ---------- slides ----------
function marca(slide, T) {
  slide.background = { color: T.cor.surface };
  slide.addImage({ path: LOGO_UNIRIO, x: G.logoX, y: G.logoY, w: G.logo, h: G.logo });
}
function titulo(slide, T, texto) {
  slide.addText(texto, {
    x: G.margem, y: G.tituloY, w: G.tituloW, h: G.tituloH, margin: 0, valign: "top",
    fontFace: T.fonte.title, fontSize: T.pt.titulo, bold: true, color: T.cor["brand-navy"],
  });
}
function motivo(slide) {
  slide.addImage({ path: MOTIVO, x: G.motivoX, y: G.motivoY, w: G.motivo, h: G.motivo });
}

function slideCapa(pres, T, s, spec) {
  const slide = pres.addSlide();
  marca(slide, T);
  slide.addText(s.titulo, {
    x: G.margem, y: 2.0, w: 7.6, h: 2.4, margin: 0, valign: "bottom",
    fontFace: T.fonte.title, fontSize: T.pt.titulo, bold: true, color: T.cor["brand-navy"],
  });
  slide.addText([
    { text: spec.apresentador, options: { breakLine: true } },
    { text: "Projeto PO para Todos – UNIRIO" },
  ], { x: G.margem, y: 4.6, w: 7.6, h: 1.0, margin: 0, valign: "top", fontFace: T.fonte.body, fontSize: T.pt.caption, color: T.cor["ink-muted"] });
  slide.addImage({ path: MOTIVO, x: 8.7, y: 1.65, w: 4.2, h: 4.2 });
}

function slideConteudo(pres, T, s) {
  const slide = pres.addSlide();
  marca(slide, T);
  titulo(slide, T, s.titulo);
  const corpo = { fontFace: T.fonte.body, fontSize: T.pt.corpo, color: T.cor.ink };
  const lista = [];
  for (const b of s.blocos) {
    if (b.rotulo) lista.push(...runs(b.rotulo, { ...corpo, bold: true, color: T.cor["accent-blue"] }));
    for (const it of b.itens) lista.push(...runs(it, corpo, { bullet: true }));
  }
  lista[lista.length - 1].options.breakLine = false;
  slide.addText(lista, { x: G.margem, y: G.corpoY, w: G.corpoW, h: G.corpoH, margin: 0, valign: "top", paraSpaceAfter: 8 });
  motivo(slide);
}

const GERADORES = { capa: slideCapa, conteudo: slideConteudo };

export async function gerarSlides(spec, { saida }) {
  const erros = validarSlides(spec);
  if (erros.length) throw new Error(`slides.json inválido:\n- ${erros.join("\n- ")}`);
  const T = carregarTokens();
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = spec.slides[0].titulo ?? "PO para Todos";
  pres.author = spec.apresentador;
  for (const s of spec.slides) GERADORES[s.tipo](pres, T, s, spec);
  await pres.writeFile({ fileName: saida });
  return saida;
}
```

- [ ] **Step 5: Rodar os testes**

Run: `node --test tests/slides.test.mjs`
Expected: `# pass 6`. Pontos de atenção se algo falhar:
- `typeface="Aharoni"` ausente → pptxgenjs escreve `<a:latin typeface="…"/>` só quando `fontFace` está nas opções do run ou da caixa; confira que a capa passa `fontFace` na caixa.
- `<a:buChar` ausente → o `bullet` precisa estar no **primeiro run** do parágrafo (é o que `runs()` faz); não coloque em todos.
- negrito inline não encontrado → confira que `bold` sai `true` só nos runs ímpares.

- [ ] **Step 6: Commit**

```bash
git add design-system/scripts/gerar-slides.mjs tests/slides.test.mjs videos/folgas-complementares/slides.json
git commit -m "Gerador de slides PPTX: tokens, validação, capa e conteúdo

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `gerar-slides.mjs` — exemplo, encerramento e CLI

**Files:**
- Modify: `design-system/scripts/gerar-slides.mjs`
- Test: `tests/slides.test.mjs`

**Interfaces:**
- Consumes: `GERADORES`, `marca`, `titulo`, `motivo`, `runs`, `G`, `carregarTokens` da Task 5.
- Produces: CLI `node design-system/scripts/gerar-slides.mjs videos/<slug> [--saida x.pptx] [--validar]`.

- [ ] **Step 1: Acrescentar testes**

Ao final de `tests/slides.test.mjs`:
```js
test("exemplo: painel cinza com cantos arredondados, formulação e resultado em azul negrito", async () => {
  const { xml } = await abrir(spec);
  const s = xml[8]; // "Exemplo — O Primal"
  assert.ok(s.includes('prst="roundRect"'));
  assert.ok(s.includes('val="F3F4F5"'));
  assert.ok(s.includes("max Z = 3x₁ + 5x₂"));
  assert.ok(/<a:rPr[^>]*b="1"[^>]*>(?:(?!<\/a:r>).)*val="156082"(?:(?!<\/a:r>).)*<a:t>x\* = \(2, 6\), Z\* = 36<\/a:t>/s.test(s));
});

test("encerramento: Obrigado!, autoria e link do projeto", async () => {
  const { xml } = await abrir(spec);
  const s = xml[14];
  assert.ok(s.includes("Obrigado!"));
  assert.ok(s.includes("Apresentador do PO para Todos"));
  assert.ok(s.includes("pesquisaoperacional.uniriotec.br"));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/slides.test.mjs`
Expected: os dois novos falham com `GERADORES[s.tipo] is not a function` (o gerador do exemplo lança antes de escrever).

- [ ] **Step 3: Implementar exemplo, encerramento e CLI**

Em `gerar-slides.mjs`, antes de `const GERADORES`:
```js
function slideExemplo(pres, T, s) {
  const slide = pres.addSlide();
  marca(slide, T);
  titulo(slide, T, s.titulo);
  const linhaAlt = 0.42;                                   // 20pt × 1,5 de entrelinha
  const painelH = s.formulacao.length * linhaAlt + 0.5;   // + preenchimento (space-md ≈ 0,25 pol por lado)
  const painelW = 8.4;
  slide.addShape(pres.ShapeType.roundRect, {
    x: G.margem, y: G.corpoY, w: painelW, h: painelH,
    fill: { color: T.cor["surface-panel"] }, line: { color: T.cor["surface-panel"] }, rectRadius: 0.17,
  });
  slide.addText(s.formulacao.map((l, i) => ({ text: l, options: { breakLine: i < s.formulacao.length - 1 } })), {
    x: G.margem + 0.25, y: G.corpoY + 0.25, w: painelW - 0.5, h: painelH - 0.5, margin: 0, valign: "top",
    fontFace: T.fonte.body, fontSize: T.pt.corpo, color: T.cor.ink, lineSpacingMultiple: 1.5,
  });
  slide.addText(s.resultado, {
    x: G.margem, y: G.corpoY + painelH + 0.3, w: painelW, h: 0.6, margin: 0, valign: "top",
    fontFace: T.fonte.body, fontSize: T.pt.corpo, bold: true, color: T.cor["accent-blue"],
  });
  motivo(slide);
}

function slideEncerramento(pres, T, s, spec) {
  const slide = pres.addSlide();
  slide.background = { color: T.cor.surface };
  slide.addText("Obrigado!", {
    x: G.margem, y: 2.2, w: 7.6, h: 1.3, margin: 0, valign: "bottom",
    fontFace: T.fonte.title, fontSize: T.pt.titulo, bold: true, color: T.cor["brand-navy"],
  });
  slide.addText([
    { text: spec.apresentador, options: { breakLine: true } },
    { text: "Projeto PO para Todos – UNIRIO", options: { breakLine: true } },
    { text: LINK_PROJETO },
  ], { x: G.margem, y: 3.7, w: 7.6, h: 1.4, margin: 0, valign: "top", fontFace: T.fonte.body, fontSize: T.pt.caption, color: T.cor["ink-muted"] });
  slide.addImage({ path: LOGO_UNIRIO, x: 9.4, y: 2.5, w: 2.5, h: 2.5 });
}
```
Troque a linha de `GERADORES` por:
```js
const GERADORES = { capa: slideCapa, conteudo: slideConteudo, exemplo: slideExemplo, encerramento: slideEncerramento };
```
E acrescente ao final do arquivo:
```js
// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const soValidar = args.includes("--validar");
  const iSaida = args.indexOf("--saida");
  const saidaArg = iSaida >= 0 ? args[iSaida + 1] : null;
  const pasta = args.find((a) => !a.startsWith("--") && a !== saidaArg);
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-slides.mjs videos/<slug> [--saida arquivo.pptx] [--validar]"); process.exit(1); }
  const specPath = join(resolve(pasta), "slides.json");
  try {
    if (!existsSync(specPath)) throw new Error(`não achei ${specPath}`);
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const erros = validarSlides(spec);
    if (erros.length) throw new Error(`slides.json inválido:\n- ${erros.join("\n- ")}`);
    if (soValidar) { console.log(`ok: ${spec.slides.length} slides cabem`); process.exit(0); }
    const saida = saidaArg ? resolve(saidaArg) : join(resolve(pasta), "slides.pptx");
    console.log(await gerarSlides(spec, { saida }));
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: todos passam (`# fail 0`).

- [ ] **Step 5: Gerar o exemplo e olhar no PowerPoint**

Run: `node design-system/scripts/gerar-slides.mjs videos/folgas-complementares && open videos/folgas-complementares/slides.pptx`
Expected: 14 slides; capa com título à esquerda e motivo grande à direita; conteúdo com rótulos azuis e marcadores; exemplos com painel cinza; encerramento com logo UNIRIO grande. Se o motivo aparecer com fundo branco, refaça a Task 4 Step 4. Se algum texto estourar a caixa, reduza `LIMITES` correspondente (nunca a fonte) e ajuste o teste de validação.

- [ ] **Step 6: Commit**

```bash
git add design-system/scripts/gerar-slides.mjs tests/slides.test.mjs
git commit -m "Gerador de slides: exemplo, encerramento e CLI

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Glossário, ADRs e modelo de briefing

**Files:**
- Create: `CONTEXT.md`
- Create: `docs/adr/0001-slides-em-pptx.md`, `docs/adr/0002-molde-de-descricao-do-canal.md`, `docs/adr/0003-upload-sempre-privado.md`, `docs/adr/0004-grill-me-em-vez-de-brainstorming.md`
- Create: `videos/_modelo/briefing.md`
- Create: `videos/folgas-complementares/briefing.md`, `videos/folgas-complementares/publicacao.json`

**Interfaces:**
- Produces: vocabulário canônico usado por todas as skills; formato de `briefing.md` que a skill `roteiro` lê; `publicacao.json = { video_id, url, publicado_em, privacidade, playlist_id }`.

- [ ] **Step 1: Escrever `CONTEXT.md`**

```markdown
# Pipeline de vídeo — PO para Todos

Produção de um vídeo de aula do canal Pesquisa Operacional para Todos (UNIRIO), do tema ao link no YouTube. Uma pessoa decide (aprova o roteiro, grava, torna público); o Claude escreve e monta.

## Language

**Vídeo**:
Uma aula do canal, representada por uma pasta `videos/<slug>/` com todos os seus arquivos.
_Avoid_: aula (é o conteúdo, não a unidade de trabalho), projeto

**Slug**:
Identificador da pasta do vídeo: tema em minúsculas com hífens (`folgas-complementares`). Mesmo padrão dos ids de `catalogo.json`.
_Avoid_: nome da pasta, id

**Briefing**:
Formulário curto (`briefing.md`) que a pessoa preenche antes de tudo: tema, formato, duração alvo, público, playlist, vídeos relacionados.
_Avoid_: pauta, pedido

**Formato**:
Natureza do vídeo, um dos oito ids de `design-system/miniaturas/formatos.json` (tutorial, conceito, exercicio, serie, erros, comparativo, ferramenta, rapido). Decide a faixa da miniatura.
_Avoid_: tipo de vídeo, categoria

**Roteiro**:
`roteiro.md`: o que será dito e mostrado, em Gancho, Objetivos, Blocos e seções finais, cada parte com duração estimada.
_Avoid_: script, texto

**Gancho**:
Os primeiros ≤ 30 s do roteiro, abrindo com uma pergunta. É reaproveitado como primeiro parágrafo da descrição.
_Avoid_: introdução, abertura (é o nome do capítulo, não da seção)

**Bloco**:
Unidade numerada do roteiro com tipo (`conteudo` ou `exemplo`), duração, o que aparece no slide e a fala. Um bloco vira exatamente um slide e um capítulo.
_Avoid_: tópico, parte, seção

**Capítulo**:
Linha `mm:ss Título` da descrição do YouTube. Estimado pela soma das durações do roteiro; substituído pelos tempos reais antes de publicar.
_Avoid_: timestamp, marcador

**Slides**:
`slides.json` (um objeto por slide, derivado do roteiro) e `slides.pptx` (gerado). Tipos: capa, conteudo, exemplo, encerramento.
_Avoid_: deck, apresentação

**Metadados**:
`metadados.json`: títulos candidatos, título escolhido, fechamento, complemento do CTA, hashtags do tema, tags, capítulos e descrição final.
_Avoid_: SEO, informações do vídeo

**Miniatura**:
`miniatura.png`, 2560×1440, gerada por `gerar-miniatura.mjs` conforme `design-system/miniaturas/GUIA-AGENTE.md`.
_Avoid_: thumbnail, capa (é um tipo de slide)

**Publicação**:
Upload privado do vídeo com título, descrição, tags, miniatura e playlist, registrado em `publicacao.json`. Tornar público é ação manual da pessoa.
_Avoid_: postar, lançar

**Canal**:
`canal.json`: o que se repete em toda publicação — links, rodapé, hashtags fixas, playlists, categoria.
_Avoid_: configuração, settings
```

- [ ] **Step 2: Escrever os quatro ADRs**

`docs/adr/0001-slides-em-pptx.md`:
```markdown
# Slides são gerados em PPTX, não em HTML

O design system já tinha modelos de slide em HTML, mas o apresentador grava a partir do PowerPoint e precisa editar o deck. Decidimos gerar `.pptx` com pptxgenjs lendo `tokens.json`; os modelos HTML ficam como referência visual. Consequência: fontes são referenciadas pelo nome (Aharoni, Hagrid Text) e o PowerPoint da máquina substitui se faltar; a verificação visual é abrir o arquivo, não há renderização automática.
```

`docs/adr/0002-molde-de-descricao-do-canal.md`:
```markdown
# A descrição segue o molde dos vídeos já publicados

Em vez de inventar um formato, a descrição reproduz a ordem e o texto fixo do vídeo "Teorema das Folgas Complementares" (set/2026), o mais completo do canal: gancho, "Nesta aula, você vai aprender:", fechamento, capítulos, relacionados, rodapé, CTA, hashtags. O teste compara byte a byte com a descrição publicada — mudar o molde exige mudar a fixture de propósito.
```

`docs/adr/0003-upload-sempre-privado.md`:
```markdown
# O upload é sempre privado

A skill `publicar` sobe o vídeo com `privacy_status: "private"` e nunca o torna público, mesmo que o briefing peça. Motivo: o upload custa 1.600 unidades de cota e é irreversível; um erro de título ou capítulo visto pelo público custa mais do que um clique manual no YouTube Studio. Tornar público é sempre decisão da pessoa.
```

`docs/adr/0004-grill-me-em-vez-de-brainstorming.md`:
```markdown
# Desenho de mudanças usa `grill-me`, não `superpowers:brainstorming`

O superpowers continua sendo usado para planejar e executar (`writing-plans`, `executing-plans`, TDD), mas a etapa de desenho usa `/grill-me` (ou `/grill-with-docs` quando mexe no vocabulário deste arquivo e dos ADRs). Motivo: as rodadas de perguntas numeradas com resposta recomendada são mais fáceis para participantes que não programam do que o diálogo aberto do brainstorming. O `CLAUDE.md` desliga o brainstorming explicitamente.
```

- [ ] **Step 3: Escrever o modelo de briefing**

`videos/_modelo/briefing.md`:
```markdown
# Briefing — [tema do vídeo]

Preencha o que souber. O que ficar em branco, o Claude pergunta depois. Depois copie esta pasta para `videos/<slug>/` (ex.: `videos/simplex-no-excel/`).

- **Tema**: [ex.: Teorema das Folgas Complementares]
- **Formato**: [um destes: tutorial · conceito · exercicio · serie · erros · comparativo · ferramenta · rapido]
- **Duração alvo (min)**: [ex.: 15]
- **Público**: [ex.: alunos de PO 1 que já viram dualidade]
- **Playlist**: [um destes: po1 · po2 · dualidade · sensibilidade · solver · programacao-inteira · teoria-dos-jogos · arvore-geradora]
- **Apresentador**: [nome como deve aparecer nos slides]
- **Vídeos relacionados**: [link — por que ele se relaciona; um por linha, ou "nenhum"]
- **O que não pode faltar**: [ex.: exemplo numérico até Z* = W*]
- **O que fica de fora**: [ex.: Simplex dual]
```

- [ ] **Step 4: Briefing e publicação do exemplo**

`videos/folgas-complementares/briefing.md`:
```markdown
# Briefing — Teorema das Folgas Complementares

- **Tema**: Teorema das Folgas Complementares
- **Formato**: conceito
- **Duração alvo (min)**: 17
- **Público**: alunos de PO 1 que já viram Simplex e a montagem do Dual
- **Playlist**: dualidade
- **Apresentador**: Apresentador do PO para Todos
- **Vídeos relacionados**: https://youtu.be/yGP0LK19R30 — aula do Relatório de Sensibilidade do Solver, onde o Preço-Sombra aparece na prática
- **O que não pode faltar**: exemplo numérico completo até confirmar W* = Z* = 36
- **O que fica de fora**: Simplex dual, dualidade fraca em detalhe
```

`videos/folgas-complementares/publicacao.json`:
```json
{
  "video_id": "6n6oPR70LSA",
  "url": "https://youtu.be/6n6oPR70LSA",
  "publicado_em": "2026-09-20T18:24:58Z",
  "privacidade": "public",
  "playlist_id": "PLdARkEgZLCfxTCwI7DcHPVcik0RxXKO5v"
}
```

- [ ] **Step 5: Conferir que a validação do roteiro aceita o vocabulário do glossário**

Run: `node scripts/roteiro.mjs videos/folgas-complementares/roteiro.md > /dev/null && echo ok`
Expected: `ok` (nada mudou no parser; o passo só confirma que o exemplo continua íntegro após adicionar arquivos na pasta).

- [ ] **Step 6: Commit**

```bash
git add CONTEXT.md docs/adr videos/_modelo videos/folgas-complementares/briefing.md videos/folgas-complementares/publicacao.json
git commit -m "Glossário, ADRs e modelo de briefing

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Skill `roteiro`

**Files:**
- Create: `.claude/skills/roteiro/SKILL.md`

**Interfaces:**
- Consumes: `briefing.md`, `scripts/roteiro.mjs` (validador), `design-system/README.md` (voz), `design-system/miniaturas/catalogo.json` (nome técnico do tópico).
- Produces: `videos/<slug>/roteiro.md` válido.

- [ ] **Step 1: Escrever a skill**

`.claude/skills/roteiro/SKILL.md`:
````markdown
---
name: roteiro
description: Escreve o roteiro.md de um vídeo do PO para Todos a partir do briefing.md. Use quando a pessoa pedir um roteiro, ou quando a skill video chegar nessa etapa.
---

# Roteiro

Você vai escrever `videos/<slug>/roteiro.md` a partir de `videos/<slug>/briefing.md`. Antes de começar, diga em uma frase o que vai fazer: "Vou ler o briefing e escrever o roteiro; depois você aprova ou pede ajustes."

## 1. Leia o que já existe

- `videos/<slug>/briefing.md` — se a pessoa deu só o tema, crie a pasta copiando `videos/_modelo/briefing.md` e preencha o que ela disse.
- `design-system/README.md`, seção "Voz e tom" — é a regra de escrita.
- `design-system/miniaturas/catalogo.json` — ache o tópico; use o `nome` como nome técnico correto.
- `videos/folgas-complementares/roteiro.md` — o exemplo de referência; siga o mesmo formato à risca.

## 2. Se faltar informação, pergunte em uma rodada

Não pergunte uma coisa por vez. Liste tudo que falta numa rodada só, no formato:

```
❓ **Q1** - **Duração**: quanto tempo o vídeo deve ter?
➡️ Sugiro 15 min: é a média dos vídeos de conceito do canal.
```

A pessoa pode responder só "ok" para aceitar todas as sugestões. Pergunte no máximo o necessário para: formato, duração alvo, público, playlist, apresentador, o que não pode faltar.

## 3. Escreva o roteiro

Formato obrigatório (o validador recusa qualquer desvio):

- Frontmatter YAML com `titulo_provisorio`, `formato`, `duracao_alvo_min`, `playlist`, `apresentador`, `relacionados` (lista de `url` + `contexto`; `[]` se não houver).
- `## Gancho` — `Duração: N s` na primeira linha; ≤ 30 s de fala; abre com uma pergunta e termina dizendo o que a aula vai fazer ("Nesta aula vamos…"). Vai literalmente para a descrição do YouTube.
- `## Objetivos` — `Duração: N s`; 3 a 5 itens com `- `, cada um uma frase completa começando por "O que…", "Como…", "Por que…". Viram a lista "você vai aprender".
- `## Blocos` — `### N. Título` numerados de 1; em cada um:
  - linha `Tipo: conteudo · Duração: N s` (ou `Tipo: exemplo`);
  - `**No slide**` — itens com `- ` (conteúdo) ou linhas de fórmula + `Resultado: …` (exemplo). Máximo ~9 linhas; o que não couber vira outro bloco;
  - `**Fala**` — o que o apresentador diz, 2 a 6 frases.
- `## Resumo — Pontos-chave` — `Duração: N s`; 3 itens.
- `## Encerramento` — `Duração: N s`; convite (vídeo relacionado, like, inscrição).

Regras de voz: imperativo ou "vamos"; nome técnico correto seguido de explicação comum; títulos de bloco são afirmações curtas ou perguntas; nada de "Descubra…", "O segredo…", exclamação.

Duração: a soma de todas as `Duração:` deve ficar a ±15 % da `duracao_alvo_min`. Um vídeo de conceito de 15 min costuma ter 8 a 10 blocos; um exemplo numérico longo pode ter 200–300 s.

## 4. Valide

Run: `node scripts/roteiro.mjs videos/<slug>/roteiro.md`

Se sair `erro: …`, corrija o roteiro e rode de novo. Só siga quando imprimir o JSON. Confira `duracao_total_s` contra a duração alvo.

## 5. Entregue

Mostre à pessoa: a lista de blocos com as durações e a duração total, e peça: "Leia o roteiro em `videos/<slug>/roteiro.md`. Quer mudar algo antes de eu montar os slides?" Não siga para os slides sem um sim.
````

- [ ] **Step 2: Testar a skill de ponta a ponta com um briefing novo**

Crie `videos/teste-dijkstra/briefing.md` a partir do modelo com tema "Algoritmo de Dijkstra", formato `exercicio`, 12 min, playlist `po2`. Em uma sessão do Claude Code neste repositório, peça: "use a skill roteiro para videos/teste-dijkstra". Depois:

Run: `node scripts/roteiro.mjs videos/teste-dijkstra/roteiro.md | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.blocos.length,'blocos',r.duracao_total_s,'s')})"`
Expected: JSON válido, entre 6 e 10 blocos, total entre 612 e 828 s (12 min ±15 %). Se o validador recusou o que a skill escreveu, ajuste o texto da skill (não o validador) até a skill produzir roteiro válido de primeira.

- [ ] **Step 3: Apagar o teste e commitar**

```bash
rm -rf videos/teste-dijkstra
git add .claude/skills/roteiro/SKILL.md
git commit -m "Skill roteiro: do briefing ao roteiro.md validado

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Skills `slides` e `miniatura`

**Files:**
- Create: `.claude/skills/slides/SKILL.md`
- Create: `.claude/skills/miniatura/SKILL.md`

**Interfaces:**
- Consumes: `roteiro.md`, `gerar-slides.mjs` (Tasks 5–6), `GUIA-AGENTE.md` + `gerar-miniatura.mjs`, `metadados.json.titulo` (Task 10 — a miniatura aceita também um título provisório).
- Produces: `slides.json`, `slides.pptx`, `miniatura.png`.

- [ ] **Step 1: Escrever a skill `slides`**

`.claude/skills/slides/SKILL.md`:
````markdown
---
name: slides
description: Monta slides.json e slides.pptx de um vídeo a partir do roteiro.md aprovado. Use quando a pessoa pedir os slides, ou quando a skill video chegar nessa etapa.
---

# Slides

Você vai transformar `videos/<slug>/roteiro.md` em `slides.json` e gerar `slides.pptx`. Diga antes: "Vou montar um slide por bloco do roteiro e gerar o PowerPoint; você abre e confere."

## 1. Leia

- `videos/<slug>/roteiro.md` (precisa passar em `node scripts/roteiro.mjs videos/<slug>/roteiro.md`; se falhar, volte para a skill `roteiro`).
- `videos/folgas-complementares/slides.json` — o exemplo; siga o mesmo formato.
- `design-system/fundamentos-slides.md` — o que cada tipo de slide contém.

## 2. Monte `slides.json`

Mapa fixo, nesta ordem:

1. `capa` — `titulo` = `titulo_provisorio` do roteiro (ou o título escolhido em `metadados.json`, se já existir, sem a parte em CAIXA ALTA: use Title Case normal).
2. `conteudo` "Objetivos" — um bloco sem rótulo, `itens` = os objetivos do roteiro (encurte para caber, sem mudar o sentido).
3. Um slide por bloco do roteiro, na ordem:
   - `Tipo: conteudo` → `{ "tipo": "conteudo", "titulo", "blocos" }`. Cada item `- ` do **No slide** vira um item. Itens no formato `Rótulo: texto` (ex.: `Condição 1: Se…`) viram `{ "rotulo": "Condição 1", "itens": ["Se…"] }`. Mantenha os `**negrito**`.
   - `Tipo: exemplo` → `{ "tipo": "exemplo", "titulo", "formulacao", "resultado" }`. Cada linha do **No slide** vira uma linha de `formulacao`; a linha `Resultado: …` vira `resultado`. Use subscritos Unicode (x₁, y₂) e os símbolos ≤ ≥ → ·.
4. `conteudo` "Resumo — Pontos-chave" — itens do `## Resumo`.
5. `encerramento`.

`apresentador` = o do frontmatter.

## 3. Valide e gere

Run: `node design-system/scripts/gerar-slides.mjs videos/<slug> --validar`

Se aparecer `erro: slide N: …`, o texto não cabe. **Nunca resolva reduzindo fonte**: encurte a frase, tire um item ou divida o bloco em dois slides (e avise a pessoa que o roteiro ganhou um bloco a mais — atualize o `roteiro.md` também, com a duração dividida). Repita até `ok`.

Run: `node design-system/scripts/gerar-slides.mjs videos/<slug>`

## 4. Entregue

Diga: "Gerei `videos/<slug>/slides.pptx` com N slides. Abra no PowerPoint e confira: título azul-escuro, marcadores, painel cinza nos exemplos, logo da UNIRIO em todos. Se as fontes Aharoni/Hagrid não estiverem instaladas, o PowerPoint substitui — não é erro." Se a pessoa pedir ajuste, edite `slides.json` e gere de novo; não edite o `.pptx` à mão.
````

- [ ] **Step 2: Escrever a skill `miniatura`**

`.claude/skills/miniatura/SKILL.md`:
````markdown
---
name: miniatura
description: Gera a miniatura (thumbnail) 2560×1440 de um vídeo do PO para Todos. Use quando a pessoa pedir a miniatura, ou quando a skill video chegar nessa etapa.
---

# Miniatura

Diga antes: "Vou gerar a miniatura do vídeo a partir do título; você olha o PNG."

Siga `design-system/miniaturas/GUIA-AGENTE.md` do início ao fim — ele é a regra. O que muda aqui é só a entrada e a saída:

- **Título**: `metadados.json` → `titulo` (se existir) ou `titulo_provisorio` do `roteiro.md`.
- **Formato**: o `formato` do `roteiro.md`.
- **Número** (formato `serie`): pergunte à pessoa qual é o número da aula.
- **Saída**: `--saida videos/<slug>/miniatura.png` (não `thumbnails/out/`).

Passos: `--buscar "<título>" --so-buscar` → escolha o tópico → gere → leia os `avisos` → abra o PNG (`open videos/<slug>/miniatura.png`) e faça o teste dos 120 px do guia. Se o tópico não existe, siga "Tópico fora do catálogo" do guia e pergunte à pessoa antes de adicionar ao catálogo.

Entregue: "Miniatura em `videos/<slug>/miniatura.png` — headline X, subhead Y, faixa Z. Quer trocar alguma palavra?"
````

- [ ] **Step 3: Testar as duas skills sobre o exemplo**

Em uma sessão do Claude Code: "use a skill slides para videos/folgas-complementares, sobrescrevendo o slides.json". Depois:

Run: `node design-system/scripts/gerar-slides.mjs videos/folgas-complementares --validar && git diff --stat videos/folgas-complementares/slides.json`
Expected: `ok: 14 slides cabem`; o diff, se houver, é só de redação — 14 slides, mesma ordem de tipos. Restaure a fixture com `git checkout videos/folgas-complementares/slides.json`.

Depois: "use a skill miniatura para videos/folgas-complementares".
Run: `ls -la videos/folgas-complementares/miniatura.png && open videos/folgas-complementares/miniatura.png`
Expected: PNG 2560×1440 com FOLGAS / COMPLEMENTARES e faixa TEORIA EXPLICADA. Este arquivo é versionado (exceção no `.gitignore`).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/slides/SKILL.md .claude/skills/miniatura/SKILL.md videos/folgas-complementares/miniatura.png
git commit -m "Skills slides e miniatura

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Skills `titulo-descricao` e `publicar`

**Files:**
- Create: `.claude/skills/titulo-descricao/SKILL.md`
- Create: `.claude/skills/publicar/SKILL.md`

**Interfaces:**
- Consumes: `scripts/descricao.mjs` (Task 3), `canal.json`, MCP `youtube` (`youtube_upload_video`, `youtube_set_thumbnail`, `youtube_add_to_playlist`).
- Produces: `metadados.json` completo; `publicacao.json`.

- [ ] **Step 1: Escrever a skill `titulo-descricao`**

`.claude/skills/titulo-descricao/SKILL.md`:
````markdown
---
name: titulo-descricao
description: Propõe títulos, monta a descrição e as tags do YouTube de um vídeo do PO para Todos, gravando em metadados.json. Use quando a pessoa pedir título/descrição, ou quando a skill video chegar nessa etapa.
---

# Título, descrição e tags

Diga antes: "Vou propor 5 títulos para você escolher e montar a descrição no padrão do canal."

## 1. Leia

- `videos/<slug>/roteiro.md` (válido) e `canal.json`.
- `videos/folgas-complementares/metadados.json` e `descricao-publicada.txt` — o padrão.
- `design-system/miniaturas/catalogo.json` — apelidos do tópico viram tags.

## 2. Títulos

Padrão do canal: `PALAVRA-CHAVE EM CAIXA ALTA - Complemento em Title Case`, com ` - Parte N` no fim se for série. Máximo 70 caracteres, sem exclamação. Proponha 5 variando a palavra-chave: nome técnico (TEOREMA DAS FOLGAS COMPLEMENTARES), termo curto (FOLGAS COMPLEMENTARES), ferramenta (SOLVER NO EXCEL), pergunta (PREÇO-SOMBRA - De Onde Ele Vem?). Valide cada um:

Run: `node scripts/descricao.mjs --validar-titulo "TÍTULO"`

Apresente numerados e peça a escolha (recomende um). Grave em `titulos_candidatos` e `titulo`.

## 3. Campos da descrição

Escreva em `metadados.json`:
- `fechamento`: uma frase com o resultado concreto do exemplo ("Fechamos com um exemplo completo, … W* = Z* = 36.").
- `cta_complemento`: completa "compartilhar o vídeo com quem …" ("está penando com dualidade").
- `hashtags_tema`: 3 a 4, em CamelCase sem acento (`#FolgasComplementares`).
- `tags`: 10 a 15 termos de busca — nome do tema, sinônimos e apelidos do catálogo, área, "pesquisa operacional", "UNIRIO", "PO para Todos".
- `capitulos`: `null` (o script calcula do roteiro; a skill `publicar` troca pelos tempos reais).
- `descricao`: `null`.

## 4. Gere

Run: `node scripts/descricao.mjs videos/<slug>`

O comando grava `capitulos` e `descricao` e imprime a descrição. Leia-a inteira: gancho, objetivos, fechamento, capítulos, relacionados, rodapé, CTA, hashtags. Se algo estiver estranho, corrija o roteiro ou o metadados e rode de novo — nunca edite `descricao` à mão.

## 5. Entregue

Mostre o título escolhido e a descrição, e diga: "Os capítulos são estimados pelo roteiro; depois que você gravar, a gente ajusta com os tempos reais antes de publicar."
````

- [ ] **Step 2: Escrever a skill `publicar`**

`.claude/skills/publicar/SKILL.md`:
````markdown
---
name: publicar
description: Sobe um vídeo gravado do PO para Todos ao YouTube como privado, com título, descrição, tags, miniatura e playlist, usando o MCP youtube. Use quando a pessoa disser que gravou e quer publicar.
---

# Publicar

Diga antes: "Vou subir o vídeo como **privado**, com título, descrição, tags, miniatura e playlist. Tornar público é você quem faz, no YouTube Studio."

## 1. Pré-checagem (pare no primeiro problema)

1. Pergunte onde está o arquivo gravado (`.mp4`/`.mov`) se a pessoa não disse. Confira que existe: `ls -la "<caminho>"`.
2. `videos/<slug>/metadados.json` tem `titulo` preenchido e `descricao` gerada — senão, rode a skill `titulo-descricao`.
3. `videos/<slug>/miniatura.png` existe — senão, rode a skill `miniatura`.
4. MCP conectado: chame `youtube_auth_status`. Se não estiver autenticado, peça para a pessoa rodar `youtube_auth` (abre o navegador para login no Google) e espere.
5. **Capítulos reais**: mostre os capítulos de `metadados.json` e pergunte: "Esses tempos são estimados. Você tem os tempos reais da gravação? Cole no formato `mm:ss Título`, ou responda 'iguais' para manter." Se vierem tempos novos, substitua `capitulos` em `metadados.json` (mesmos títulos, na mesma ordem) e rode `node scripts/descricao.mjs videos/<slug>` de novo.

## 2. Suba

Chame, nesta ordem, parando e reportando se qualquer uma falhar (não tente corrigir com atualizações parciais):

1. `youtube_upload_video` com `file_path` = caminho absoluto do vídeo, `title` = `metadados.titulo`, `description` = `metadados.descricao`, `tags` = `metadados.tags`, `category_id` = `canal.json.categoriaYoutube` ("27"), `privacy_status` = `"private"`. Guarde o `id` retornado. (Custa 1.600 unidades da cota diária de 10.000 — avise a pessoa se `youtube_auth_status` mostrar menos de 2.000 disponíveis.)
2. `youtube_set_thumbnail` com `video_id` e `file_path` = caminho absoluto de `miniatura.png`.
3. `youtube_add_to_playlist` com `playlist_id` = `canal.json.playlists[<playlist do roteiro>].id`.

## 3. Registre

Escreva `videos/<slug>/publicacao.json`:
```json
{ "video_id": "…", "url": "https://youtu.be/…", "publicado_em": "<ISO agora>", "privacidade": "private", "playlist_id": "…" }
```

Entregue: "Vídeo no ar como privado: https://youtu.be/… . Para publicar: YouTube Studio → Conteúdo → o vídeo → Visibilidade → Público. Confira a miniatura e a descrição lá antes."
````

- [ ] **Step 3: Testar `titulo-descricao` sobre um exemplo novo**

Recrie `videos/teste-dijkstra/` (briefing + roteiro via skill `roteiro`, como na Task 8), depois: "use a skill titulo-descricao para videos/teste-dijkstra".

Run: `node -e "const m=require('./videos/teste-dijkstra/metadados.json'); console.log(m.titulos_candidatos.length, !!m.titulo, m.tags.length, m.capitulos.length, m.descricao.split('\n\n').length)" && node scripts/descricao.mjs --validar-titulo "$(node -p "require('./videos/teste-dijkstra/metadados.json').titulo")"`
Expected: `5 true <10–15> <n≥8> <≥10>` e `ok`.

- [ ] **Step 4: Testar `publicar` só na pré-checagem**

Sem arquivo de vídeo: "use a skill publicar para videos/teste-dijkstra". Expected: a skill pergunta o caminho do vídeo e, ao receber um caminho inexistente, para em "não achei o arquivo" sem chamar `youtube_upload_video`. **Não faça upload real neste teste** (cota).

- [ ] **Step 5: Limpar e commitar**

```bash
rm -rf videos/teste-dijkstra
git add .claude/skills/titulo-descricao/SKILL.md .claude/skills/publicar/SKILL.md
git commit -m "Skills titulo-descricao e publicar

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Skill `video` (orquestradora) e `CLAUDE.md`

**Files:**
- Create: `.claude/skills/video/SKILL.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: as cinco skills anteriores.
- Produces: fluxo completo com duas paradas obrigatórias.

- [ ] **Step 1: Escrever a skill `video`**

`.claude/skills/video/SKILL.md`:
````markdown
---
name: video
description: Fluxo completo de um vídeo do PO para Todos — do tema ao link privado no YouTube — encadeando roteiro, slides, título/descrição, miniatura e publicação, com paradas para a pessoa aprovar e gravar. Use quando a pessoa disser "quero fazer um vídeo sobre X" ou pedir a pipeline inteira.
---

# Vídeo — do tema ao YouTube

Diga antes, em linguagem simples: "Vamos fazer o vídeo em 5 etapas: roteiro → slides → título e descrição → miniatura → publicação. Eu paro duas vezes: para você aprovar o roteiro e para você gravar."

## Etapa 0 — Pasta

- Defina o slug (tema em minúsculas com hífens) e confira que `videos/<slug>/` não existe. Se existir, pergunte se é para continuar de onde parou (veja quais arquivos já estão lá e pule as etapas prontas).
- Crie `videos/<slug>/briefing.md` a partir de `videos/_modelo/briefing.md` com o que a pessoa disse.

## Etapa 1 — Roteiro → **PARADA 1**

Invoque a skill `roteiro`. Ela termina perguntando se a pessoa aprova. **Não avance sem um sim explícito.** Ajustes: edite o roteiro e valide de novo.

## Etapa 2 — Slides, título/descrição, miniatura

Nesta ordem, cada uma com a própria skill: `titulo-descricao` (primeiro, porque a miniatura e a capa usam o título escolhido), `slides`, `miniatura`. Ao final mostre um resumo:

```
✅ Roteiro       videos/<slug>/roteiro.md        (N blocos, ~M min)
✅ Slides        videos/<slug>/slides.pptx       (K slides)
✅ Título        "…"
✅ Descrição     em videos/<slug>/metadados.json
✅ Miniatura     videos/<slug>/miniatura.png
⏸️  Agora é com você: grave o vídeo usando os slides. Quando tiver o arquivo, me diga o caminho.
```

## Etapa 3 — **PARADA 2**: gravação

Espere a pessoa informar o arquivo gravado. Não invente caminho.

## Etapa 4 — Publicar

Invoque a skill `publicar`. Ela confirma os capítulos reais, sobe como privado e devolve o link.

## Se algo der errado

Reporte o passo e o erro exatamente como saiu (`erro: …`), diga o que você vai tentar, e não pule etapas. Se a pessoa quiser parar no meio, tudo bem: os arquivos ficam na pasta e ela pode retomar com "continue o vídeo <slug>".
````

- [ ] **Step 2: Reescrever `CLAUDE.md`**

```markdown
# PO para Todos — publisher

Pipeline de produção dos vídeos do canal Pesquisa Operacional para Todos (UNIRIO): do tema ao link no YouTube. Quem usa este repositório pode não saber programar — escreva para essa pessoa: passos numerados, comando exato, o que esperar na tela.

## Fluxo de um vídeo
`/video` encadeia as skills em `.claude/skills/`: `roteiro` → `titulo-descricao` → `slides` → `miniatura` → `publicar`, com paradas para aprovar o roteiro e gravar. Cada skill também funciona sozinha. Vocabulário em `CONTEXT.md`; exemplo completo em `videos/folgas-complementares/`.

Scripts (Node ≥ 22, `npm install` uma vez):
- `node scripts/roteiro.mjs videos/<slug>/roteiro.md` — valida o roteiro.
- `node design-system/scripts/gerar-slides.mjs videos/<slug>` — `slides.json` → `slides.pptx`.
- `node scripts/descricao.mjs videos/<slug>` — monta a descrição em `metadados.json`.
- `node design-system/scripts/gerar-miniatura.mjs …` — ver `design-system/miniaturas/GUIA-AGENTE.md`.
- `npm test` — testes; a pasta `videos/folgas-complementares/` é fixture: não a altere sem atualizar os testes.

Upload é sempre privado (`docs/adr/0003`). `canal.json` guarda links, playlists e rodapé.

## Design system (`design-system/`)
- `tokens.json` é a fonte da verdade; `tokens.css` é gerado por `design-system/scripts/gerar-tokens-css.mjs` — nunca edite o .css à mão.
- `README.md`, `fundamentos-slides.md` e `fundamentos-youtube.md` foram extraídos de material real: não reescreva sem perguntar.
- Modelos vivos em `design-system/components/` (abra `index.html`) — referência visual; os slides reais saem em PPTX (`docs/adr/0001`).

## Miniaturas do YouTube
Para gerar a miniatura de um vídeo, siga `design-system/miniaturas/GUIA-AGENTE.md` — catálogo de tópicos, formatos, ícones e o gerador `design-system/scripts/gerar-miniatura.mjs`.

## Quando for mudar a pipeline (desenvolvimento)
1. Desenhar: `/grill-me`; se a mudança cria ou muda um termo de `CONTEXT.md` ou uma decisão, `/grill-with-docs` (registra ADR em `docs/adr/`). **Não use `superpowers:brainstorming` neste repositório** (`docs/adr/0004`).
2. Planejar: superpowers `writing-plans` (planos em `docs/superpowers/plans/`).
3. Executar: superpowers `executing-plans` ou `subagent-driven-development`, com TDD (`npm test`) e `verification-before-completion`.
```

- [ ] **Step 3: Testar o fluxo até a PARADA 2**

Em uma sessão nova: "quero fazer um vídeo sobre o método húngaro, 10 minutos, playlist po2". Expected: a skill cria `videos/metodo-hungaro/`, escreve o roteiro, para e pergunta; após "sim", produz título (5 opções), slides, descrição, miniatura, e mostra o resumo com ⏸️. Confira:

Run: `ls videos/metodo-hungaro/ && node design-system/scripts/gerar-slides.mjs videos/metodo-hungaro --validar && node scripts/roteiro.mjs videos/metodo-hungaro/roteiro.md > /dev/null && echo roteiro-ok`
Expected: `briefing.md metadados.json miniatura.png roteiro.md slides.json slides.pptx`, `ok: N slides cabem`, `roteiro-ok`. Não publique.

- [ ] **Step 4: Limpar e commitar**

```bash
rm -rf videos/metodo-hungaro
git add .claude/skills/video/SKILL.md CLAUDE.md
git commit -m "Skill video (orquestradora) e CLAUDE.md com o fluxo

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: `.mcp.json`, README para participante e verificação final

**Files:**
- Create: `.mcp.json`
- Create: `README.md`
- Modify: `design-system/miniaturas/GUIA-AGENTE.md` (só a linha do passo 5, apontar para a skill `publicar`)

**Interfaces:**
- Produces: repositório instalável por alguém que nunca abriu um terminal.

- [ ] **Step 1: Criar `.mcp.json`**

```json
{
  "mcpServers": {
    "youtube": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/felipefontoura/youtube-studio-mcp", "youtube-studio-mcp"]
    }
  }
}
```
O MCP lê `~/.youtube-mcp/client_secret.json` por padrão (`auth.py`), então não precisa de variável de ambiente.

- [ ] **Step 2: Conferir que o MCP sobe pelo `.mcp.json`**

Run: `uvx --from git+https://github.com/felipefontoura/youtube-studio-mcp youtube-studio-mcp --help 2>&1 | head -3`
Expected: sem erro de instalação (o comando pode ficar esperando stdin — isso é normal para um servidor MCP; interrompa com Ctrl+C). Depois, em uma sessão nova do Claude Code neste diretório, `/mcp` deve listar `youtube` como conectado (na primeira vez o Claude Code pergunta se aprova o servidor do projeto).

- [ ] **Step 3: Escrever o README**

`README.md` — escreva na íntegra, seguindo esta estrutura e este tom (cada passo com o comando para copiar e o que aparece na tela):

```markdown
# PO para Todos — produção de vídeos

Este repositório faz a parte chata de produzir uma aula do canal **Pesquisa Operacional para Todos** (UNIRIO): escreve o roteiro, monta os slides no PowerPoint, sugere título, descrição e tags, gera a miniatura e sobe o vídeo no YouTube. Você decide, aprova e grava.

Não precisa saber programar. Precisa seguir os passos abaixo uma vez; depois é só conversar com o Claude.

## O que você vai instalar (uma vez só)

1. **Claude Code** — o assistente que roda tudo. Siga https://docs.claude.com/pt/docs/claude-code/quickstart . No final, abrir o Terminal e digitar `claude` deve mostrar uma tela de boas-vindas.
2. **Node.js** (versão 22 ou mais nova) — programa que gera os slides e a descrição. Baixe em https://nodejs.org , instale, e confira no Terminal: `node -v` → aparece `v22…` ou maior.
3. **uv** — instala o conector do YouTube. No Terminal: `curl -LsSf https://astral.sh/uv/install.sh | sh` e feche/reabra o Terminal. Confira: `uv --version`.
4. **Google Chrome ou Microsoft Edge** — usado por trás dos panos para desenhar a miniatura. Se já tem um dos dois, pule.
5. **PowerPoint** — para abrir e apresentar os slides gerados.

## Baixar o projeto

[git clone com o comando exato + alternativa "Code → Download ZIP"; depois `cd` para a pasta e `npm install` — o que esperar: "added N packages"]

## Conectar ao YouTube (uma vez só)

[passo a passo do Google Cloud resumido em 6 passos com links, terminando com: mover o arquivo baixado para a pasta `~/.youtube-mcp/` renomeado como `client_secret.json` — explicar como chegar nessa pasta no Finder (Cmd+Shift+G) e no Explorer; depois abrir `claude` na pasta do projeto, aceitar o servidor `youtube` quando perguntar, e pedir "faça login no YouTube" → abre o navegador → escolher a conta do canal]

## Instalar os skills (uma vez só)

[dentro do `claude`: `/plugin install superpowers@claude-plugins-official`; no Terminal: `npx skills add mattpocock/skills` (pede confirmação; aceite instalar para o Claude Code). Como saber que deu certo: digitar `/` no claude e ver `video`, `roteiro`, `grill-me` na lista]

## Fazer um vídeo

[abrir `claude` na pasta; digitar `/video` e o tema — exemplo literal: `/video quero uma aula sobre o algoritmo de Dijkstra, 12 minutos, para a playlist po2`; descrever as duas paradas (aprovar roteiro; gravar) e onde ficam os arquivos; explicar que o upload sai privado e como tornar público no YouTube Studio]

## O que tem na pasta de um vídeo

[tabela: briefing.md, roteiro.md, slides.json, slides.pptx, metadados.json, miniatura.png, publicacao.json — uma linha cada, apontando para `videos/folgas-complementares/` como exemplo real: "abra esses arquivos para ver como ficam"]

## Quando algo dá errado

[lista: "erro: roteiro inválido" → o Claude corrige sozinho, se insistir peça "valide o roteiro e me mostre os erros"; "nenhum Chrome/Chromium/Edge encontrado" → instale o Chrome; "não autenticado" no YouTube → peça "faça login no YouTube"; cota do YouTube esgotada → espere até o dia seguinte (a cota renova à meia-noite no horário do Pacífico); slides com fonte diferente → normal, o PowerPoint substituiu Aharoni/Hagrid]

## Quero mudar a pipeline

[para quem programa: leia `CLAUDE.md` e `CONTEXT.md`; fluxo `/grill-me` → plano → execução com testes (`npm test`); decisões em `docs/adr/`; spec em `docs/superpowers/specs/`]

## Créditos

[UNIRIO, projeto de extensão PO para Todos; MCP do YouTube: felipefontoura/youtube-studio-mcp; skills: obra/superpowers e mattpocock/skills; licença MIT]
```

Cada trecho entre colchetes deve ser escrito por extenso no arquivo final (sem colchetes), com os comandos reais. Confira o link do quickstart do Claude Code e o comando de instalação do `skills` CLI na hora de escrever (`npx skills add mattpocock/skills` é o comando usado nesta máquina — veja `~/.agents/skills/`).

- [ ] **Step 4: Ajustar o passo 5 do `GUIA-AGENTE.md`**

Em `design-system/miniaturas/GUIA-AGENTE.md`, troque a frase final do passo 5 `Depois, \`youtube_set_thumbnail\` com o PNG.` por `Dentro da pipeline, quem envia o PNG ao YouTube é a skill \`publicar\`.`

- [ ] **Step 5: Verificação final**

Run: `npm test && git status --short`
Expected: `# fail 0`; `git status` só com os arquivos desta task.

Leia o README inteiro fingindo ser um bolsista: cada seção tem comando + resultado esperado? Nenhum termo técnico sem explicação na primeira vez? Corrija o que faltar.

- [ ] **Step 6: Commit**

```bash
git add .mcp.json README.md design-system/miniaturas/GUIA-AGENTE.md
git commit -m "README para participante, .mcp.json e ponteiro do guia de miniaturas

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Auto-revisão do plano

**Cobertura da spec:** estrutura do repo (T1, T7, T12); pasta do vídeo e `slug` (T2–T7); `canal.json` (T3); roteiro (T2, T8); PPTX com tokens, grade, 4 layouts, limites, motivo como imagem (T4–T6, T9); título e descrição no molde real, tags (T3, T10); publicação privada com pré-checagem e `publicacao.json` (T10); skills em PT com paradas humanas (T8–T11); superpowers não vendorizado + grill-me + CONTEXT/ADR (T7, T11, T12); `.mcp.json` sem variável de ambiente (T12); exemplo vivo (T2, T3, T5, T7, T9); testes (T1–T6); README para leigo (T12).

**Placeholders:** o README na T12 é um esqueleto com trechos entre colchetes porque o texto final depende de conferir links e comandos na hora; a task diz explicitamente o que cada trecho contém e manda escrever por extenso. Nenhum outro "TBD".

**Consistência de nomes:** `carregarRoteiro`/`lerRoteiro`/`validarRoteiro` (T2) usados em T3; `capitulos`/`montarDescricao`/`validarTitulo` (T3) usados em T10; `validarSlides`/`gerarSlides`/`LIMITES`/`carregarTokens` (T5) usados em T6 e T9; `metadados.json` com os mesmos campos em T3, T10 e CONTEXT.md; playlists por chave (`dualidade`, `po2`) iguais em `canal.json`, `briefing.md` e roteiro.
