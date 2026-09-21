# Braço Instagram (MVP) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar no Instagram `@pesquisaoperacionalparatodos`, a partir deste repositório e a custo zero, posts dos tipos `artigo` (carrossel 4:5) e `aviso` (card único 4:5): `post.md` → cards PNG + legenda → aprovação da pessoa → API oficial da Meta; e gerar o `story.png` de vídeo novo ao final da skill `publicar` do YouTube.

**Architecture:** Mesmo desenho da pipeline de vídeo. Uma pessoa preenche `instagram/<AAAA-MM-DD>-<slug>/post.md`; a skill `post` escreve `cards.json` e `legenda.json`; scripts Node determinísticos validam e renderizam (`design-system/scripts/gerar-cards.mjs`: HTML → Chrome headless → PNG, como as miniaturas; `scripts/legenda.mjs`: `legenda.txt`); `scripts/instagram.mjs` sobe as imagens em JPEG para um commit órfão no branch `midia` do repositório público (via API REST do GitHub), cria os contêineres na API do Instagram, publica, grava `publicacao.json` e esvazia o branch. Layouts e CSS novos ficam em `design-system/instagram/`, consumindo os tokens existentes.

**Tech Stack:** Node ≥ 22 (`node --test`, ESM `.mjs`, `fetch` nativo), `sharp` (PNG → JPEG; a API da Meta só aceita JPEG), Chrome/Edge headless via `design-system/scripts/exportar.sh`, API do Instagram com Instagram Login (`graph.instagram.com`), API REST do GitHub (Git Data API).

**Spec:** `docs/superpowers/specs/2026-09-20-braco-instagram-design.md`

## Global Constraints

- Todo texto voltado ao usuário (README, SKILL.md, mensagens de erro, `post.md` modelo, `GUIA-AGENTE.md`) em português, para leitor que **não sabe programar**: passos numerados, comando exato para copiar, o que esperar na tela.
- **Custo zero**: nenhum serviço pago, nenhum free tier com cartão. Só GitHub, API oficial da Meta e npm.
- Nunca editar `design-system/tokens.json`, `tokens.css`, `README.md` do design system, `fundamentos-slides.md`, `fundamentos-youtube.md`. Nunca alterar `videos/folgas-complementares/` (fixture).
- Scripts no estilo de `design-system/scripts/gerar-miniatura.mjs`: ESM, comentários em português, exporta funções + bloco CLI protegido por `import.meta.url === pathToFileURL(process.argv[1]).href`, erros de uso saem como `erro: …` com `process.exit(1)`.
- Formatos: feed **1080×1350** (4:5); story **1080×1920** (9:16). Todo card leva `@pesquisaoperacionalparatodos` no rodapé.
- Legenda: gancho ≤ **125** caracteres; total ≤ 2200; ≤ 30 hashtags; hashtags = `canal.json.hashtags.abertura` + 3 a 4 do tema + `canal.json.hashtags.fechamento`; sem pedir like.
- Carrossel: 2 a 10 itens (limite da API). Cota: 100 publicações por 24 h.
- Publicação na hora, sem agendamento. Qualquer falha interrompe e reporta o passo.
- Commits em português, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Testes: `npm test` = `node --test`; testes não dependem de Chrome nem de rede (renderização é verificada com `--so-html`; HTTP com `fetch` falso injetado).

## Decisões tomadas neste plano (a spec deixava em aberto ou assumia diferente)

| # | Decisão | Motivo |
|---|---|---|
| D1 | A API da Meta recebe **JPEG**, não PNG. `card-NN.png` continua sendo o arquivo da pasta (é o que a pessoa olha e o que serve de fallback manual); `scripts/instagram.mjs` converte para JPEG (qualidade 92) só no momento de subir. | A API de publicação de conteúdo aceita apenas JPEG para imagens. |
| D2 | O branch `midia` é escrito pela **API REST do GitHub** (blob → tree → commit órfão → `refs/heads/midia` com `force`), com um token pessoal do GitHub, e não por `git push`. A URL usada é `raw.githubusercontent.com/<repo>/<sha-do-commit>/<arquivo>`. Depois da publicação o branch é apontado para um commit só com `README.md`. | Funciona para quem baixou o ZIP (sem `git` configurado); commit órfão + `force` mantém o branch sem histórico de imagens; URL pelo SHA não sofre com cache do CDN. |
| D3 | Tokens (Instagram e GitHub) ficam em **`~/.po-para-todos/instagram.json`**, gravados por comando (`--token`, `--token-github`), não em variável de ambiente. | O "esquema do YouTube" real é um arquivo na pasta oculta (`~/.youtube-mcp/`), não variável; e a renovação automática precisa reescrever o token em algum lugar. |
| D4 | Intermediários `cards.json` (conteúdo dos cards) e `legenda.json` (gancho, corpo, autores, hashtags do tema), escritos pela skill; os scripts geram `card-NN.png` e `legenda.txt`. | Espelha `slides.json`/`metadados.json` da pipeline de vídeo: o que a IA escreve é dado, o que o script faz é determinístico e testável. |
| D5 | Repositório de destino do branch `midia` em `canal.json.github` (`"jotape-prog22/po-para-todos-publisher"`). | Quem baixou o ZIP não tem `origin`. |
| D6 | O README descreve cada tela do Meta for Developers em palavras e aponta para a documentação oficial; **não traz prints** (o executor não consegue capturar telas do painel da Meta). | Limitação do executor; a pessoa pode acrescentar prints depois. |
| D7 | O texto dos cards é validado por **limite de caracteres por campo** (`design-system/instagram/formatos.json`), não por medição de glifos como nas miniaturas; a conferência visual do PNG pela skill é obrigatória. | Texto corrido com quebra automática; os limites foram dimensionados para a grade. |
| D8 | Versão da Graph API fixada em `v23.0` numa constante. | Versão vigente em 2026; mudar é uma linha. |

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `design-system/scripts/exportar.sh` | (modificar) aceita largura e altura opcionais |
| `design-system/scripts/modelo-html.mjs` | `preencher(html, vars)` (mustache mínimo, extraído de `gerar-miniatura.mjs`) e `exportarPng(html, png, {escala, largura, altura})` |
| `design-system/scripts/gerar-miniatura.mjs` | (modificar) passa a usar `preencher` |
| `design-system/instagram/formatos.json` | tamanhos dos formatos, campos e limites de cada card, sequência por tipo de post |
| `design-system/instagram/instagram.css` | grade e tipografia dos cards/story sobre os tokens |
| `design-system/instagram/layouts/{capa,ideia,fim,aviso,story-video}.html` | modelos HTML |
| `design-system/instagram/GUIA-AGENTE.md` | como preencher `cards.json`/`legenda.json`, comandos, checklist |
| `design-system/fundamentos-instagram.md` | fundamentos (grade, tipografia, zonas seguras) |
| `design-system/scripts/gerar-cards.mjs` | `cards.json` → `card-NN.png` (validação + render) |
| `design-system/scripts/gerar-story.mjs` | `videos/<slug>/metadados.json` → `story.png` |
| `scripts/legenda.mjs` | `legenda.json` + `cards.json` + `canal.json` → `legenda.txt` (validação) |
| `scripts/instagram.mjs` | tokens, renovação, mídia no GitHub, publicação, `publicacao.json` |
| `canal.json` | (modificar) `instagramUsuario`, `instagramLegenda`, `github` |
| `instagram/_modelo/post.md` | formulário em branco por tipo |
| `instagram/2026-09-20-kruskal-1956/` | exemplo real (artigo): `post.md`, `cards.json`, `legenda.json`, `legenda.txt`, `card-0N.png` — fixture dos testes |
| `tests/modelo-html.test.mjs`, `tests/cards.test.mjs`, `tests/legenda.test.mjs`, `tests/story.test.mjs`, `tests/instagram.test.mjs` | testes |
| `.claude/skills/post/SKILL.md` | skill do post (do `post.md` ao link) |
| `.claude/skills/publicar/SKILL.md` | (modificar) passo final gera `story.png` |
| `CONTEXT.md`, `docs/adr/0005-*.md`, `docs/adr/0006-*.md` | vocabulário e decisões D1–D3 |
| `README.md`, `CLAUDE.md`, `package.json`, `.gitignore` | participante, agente, scripts npm, arquivos gerados |

---

### Task 1: Renderização parametrizada — `exportar.sh` com tamanho, `modelo-html.mjs` e `sharp`

**Files:**
- Modify: `design-system/scripts/exportar.sh`
- Create: `design-system/scripts/modelo-html.mjs`
- Modify: `design-system/scripts/gerar-miniatura.mjs` (função `montarHtml` e `gerar`)
- Modify: `package.json`
- Test: `tests/modelo-html.test.mjs`

**Interfaces:**
- Produces: `preencher(html, vars, { brutos = ["ds"] })` → string (substitui `{{chave}}` escapando HTML, `{{#chave}}…{{/chave}}` condicional; chaves em `brutos` entram sem escapar); `esc(s)`; `exportarPng(html, png, { escala = 1, largura = 1280, altura = 720 })` → caminho do PNG. `exportar.sh html png [escala] [largura] [altura]`. Dependência `sharp`.

- [ ] **Step 1: Escrever o teste do `preencher`**

`tests/modelo-html.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { preencher, esc } from "../design-system/scripts/modelo-html.mjs";

test("preencher substitui, escapa e respeita blocos condicionais", () => {
  const html = "<p>{{a}}</p>{{#b}}<b>{{b}}</b>{{/b}}<i>{{c}}</i>";
  assert.equal(preencher(html, { a: "x<y", b: "", c: "<br>" }, { brutos: ["c"] }), "<p>x&lt;y</p><i><br></i>");
  assert.equal(preencher(html, { a: "1", b: "2", c: "" }), "<p>1</p><b>2</b><i></i>");
  assert.equal(esc('a"b&c'), "a&quot;b&amp;c");
});

test("exportar.sh aceita largura e altura", () => {
  const sh = readFileSync(new URL("../design-system/scripts/exportar.sh", import.meta.url), "utf8");
  assert.match(sh, /largura="\$\{4:-1280\}"/);
  assert.match(sh, /altura="\$\{5:-720\}"/);
  assert.match(sh, /--window-size="\$largura,\$altura"/);
});

test("sharp instalado", async () => {
  const sharp = (await import("sharp")).default;
  const buf = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#51AA04" } }).jpeg().toBuffer();
  assert.equal(buf[0], 0xff); assert.equal(buf[1], 0xd8);   // magic bytes do JPEG
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: 3 falhas em `modelo-html.test.mjs` (módulo não existe, regex não bate, `sharp` não instalado).

- [ ] **Step 3: Instalar `sharp`**

Run: `npm install sharp`
Expected: `package.json` ganha `"sharp": "^0.34.x"` (ou mais novo) em `dependencies`; `node -e "import('sharp').then(()=>console.log('ok'))"` imprime `ok`.

- [ ] **Step 4: Parametrizar `exportar.sh`**

Substitua o cabeçalho e as linhas de argumentos/`--window-size` de `design-system/scripts/exportar.sh` para ficar assim (o bloco de busca do Chrome não muda):
```bash
#!/usr/bin/env bash
# Exporta um modelo vivo (HTML) para PNG usando um Chromium headless.
# Uso: design-system/scripts/exportar.sh entrada.html saida.png [escala] [largura] [altura]
#   escala: fator de resolução (padrão 1; 2 → dobra, boa para o YouTube).
#   largura/altura: tamanho da página em px (padrão 1280×720 = miniatura; 1080×1350 = feed do Instagram; 1080×1920 = story).
# Procura Chrome, Chromium ou Edge; ou defina CHROME=/caminho/do/binário.
set -euo pipefail

html="${1:?informe o HTML de entrada}"
png="${2:?informe o PNG de saída}"
escala="${3:-1}"
largura="${4:-1280}"
altura="${5:-720}"
```
e, no comando final:
```bash
"$bin" --headless=new --disable-gpu --hide-scrollbars \
  --window-size="$largura,$altura" --force-device-scale-factor="$escala" \
  --screenshot="$abs_png" "file://$abs_html" 2>/dev/null
```

- [ ] **Step 5: Criar `modelo-html.mjs`**

`design-system/scripts/modelo-html.mjs`:
```js
// Preenche modelos HTML dos layouts ({{chave}}, {{#chave}}…{{/chave}}) e exporta para PNG.
// Usado por gerar-miniatura.mjs, gerar-cards.mjs e gerar-story.mjs.

import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// {{#k}}…{{/k}} fica se vars[k] for verdadeiro; {{k}} é escapado, salvo as chaves em `brutos`.
export function preencher(html, vars, { brutos = ["ds"] } = {}) {
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, corpo) => (vars[k] ? corpo : ""));
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => (brutos.includes(k) ? String(vars[k] ?? "") : esc(vars[k] ?? "")));
}

export function exportarPng(html, png, { escala = 1, largura = 1280, altura = 720 } = {}) {
  execFileSync(join(DS, "scripts/exportar.sh"), [html, png, String(escala), String(largura), String(altura)], { stdio: "pipe" });
  return png;
}
```

- [ ] **Step 6: `gerar-miniatura.mjs` usa o módulo**

Em `design-system/scripts/gerar-miniatura.mjs`:
1. Acrescente ao topo: `import { preencher, exportarPng } from "./modelo-html.mjs";` e remova `execFileSync` do import de `node:child_process` (fica sem uso).
2. Apague a linha `const esc = (s) => …` e troque o corpo de `montarHtml` por:
```js
export function montarHtml(r, { ds }) {
  const html = readFileSync(join(DS, "miniaturas/layouts", `${r.layout}.html`), "utf8");
  const vars = { ds, titulo: `${r.headline} ${r.subhead} — PO para Todos`.trim(), headline: r.headline, subhead: r.subhead, faixa: r.faixa, icone: r.icone, icone2: r.icone2 ?? "", selo: r.selo ?? "", numero: r.numero != null ? String(r.numero).padStart(2, "0") : "", icone_tamanho: r.iconeTamanho || 260 };
  return preencher(html, vars);
}
```
3. Em `gerar`, troque a linha do `execFileSync(join(DS, "scripts/exportar.sh"), …)` por `exportarPng(saidaHtml, saidaPng, { escala: spec.escala ?? 2 });`.

- [ ] **Step 7: Rodar os testes e a galeria**

Run: `npm test && node design-system/scripts/gerar-galeria.mjs && git status --short design-system/miniaturas/galeria`
Expected: `# fail 0`; a galeria regenera sem falhas e `git status` não mostra mudanças em `galeria/` (o HTML gerado é idêntico ao anterior).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json design-system/scripts/exportar.sh design-system/scripts/modelo-html.mjs design-system/scripts/gerar-miniatura.mjs tests/modelo-html.test.mjs
git commit -m "Renderização parametrizada: exportar.sh com tamanho, modelo-html.mjs e sharp

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `design-system/instagram/` — formatos, CSS, layouts e fundamentos

**Files:**
- Create: `design-system/instagram/formatos.json`
- Create: `design-system/instagram/instagram.css`
- Create: `design-system/instagram/layouts/capa.html`, `ideia.html`, `fim.html`, `aviso.html`, `story-video.html`
- Create: `design-system/fundamentos-instagram.md`
- Test: `tests/cards.test.mjs` (primeiro teste; o arquivo cresce na Task 3)

**Interfaces:**
- Produces: `formatos.json` com `formatos.feed = {largura: 1080, altura: 1350}`, `formatos.story = {largura: 1080, altura: 1920}`, `cards.<tipo> = { layout, campos: {campo: máximo}, obrigatorios }` para `capa`, `ideia`, `fim`, `aviso`, e `tipos.<artigo|aviso> = { min, max }`. Cada layout consome as variáveis: `ds`, `usuario`, `contador`, `kicker`, `numero`, `titulo`, `titulo_classe`, `autores`, `onde`, `data`, `link`, `texto_html` (bruto), `titulo_pagina`; `story-video.html` consome `ds`, `usuario`, `kicker`, `headline`, `subhead`, `icone`, `faixa`.

- [ ] **Step 1: Teste de consistência entre `formatos.json` e os layouts**

`tests/cards.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const DS = new URL("../design-system/", import.meta.url);
const formatos = JSON.parse(readFileSync(new URL("instagram/formatos.json", DS), "utf8"));

test("formatos do Instagram: feed 4:5, story 9:16, um layout por card", () => {
  assert.deepEqual(formatos.formatos.feed, { largura: 1080, altura: 1350, proporcao: "4:5" });
  assert.deepEqual(formatos.formatos.story, { largura: 1080, altura: 1920, proporcao: "9:16" });
  assert.deepEqual(Object.keys(formatos.cards), ["capa", "ideia", "fim", "aviso"]);
  for (const [id, c] of Object.entries(formatos.cards)) {
    assert.ok(existsSync(new URL(`instagram/layouts/${c.layout}.html`, DS)), `layout ${c.layout} do card ${id}`);
    for (const campo of c.obrigatorios) assert.ok(campo in c.campos, `${id}.${campo} obrigatório sem limite`);
  }
  assert.ok(existsSync(new URL("instagram/layouts/story-video.html", DS)));
  assert.deepEqual(formatos.tipos, { artigo: { min: 3, max: 10 }, aviso: { min: 1, max: 1 } });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/cards.test.mjs`
Expected: falha com `ENOENT … instagram/formatos.json`.

- [ ] **Step 3: Criar `formatos.json`**

`design-system/instagram/formatos.json`:
```json
{
  "name": "Formatos do Instagram — PO para Todos",
  "version": 1,
  "meta": {
    "uso": "Tamanhos de página e limites de texto por card. Quem valida é design-system/scripts/gerar-cards.mjs; quem desenha é instagram.css + layouts/. Limites em caracteres, dimensionados para a grade de 1080px com margem de 72px (área útil 936px).",
    "story": "Os 250px do topo e do rodapé do story ficam livres: o app desenha a barra de progresso, o nome do perfil e a caixa de resposta ali."
  },
  "formatos": {
    "feed":  { "largura": 1080, "altura": 1350, "proporcao": "4:5" },
    "story": { "largura": 1080, "altura": 1920, "proporcao": "9:16" }
  },
  "cards": {
    "capa":  { "layout": "capa",  "campos": { "kicker": 24, "titulo": 110, "autores": 120, "onde": 50 }, "obrigatorios": ["titulo", "autores"],
               "quando": "Primeiro card do artigo: título em caixa alta, autores, evento/revista." },
    "ideia": { "layout": "ideia", "campos": { "titulo": 40, "texto": 280 }, "obrigatorios": ["titulo", "texto"],
               "quando": "Uma ideia principal por card, numerada. De 1 a 8 por artigo." },
    "fim":   { "layout": "fim",   "campos": { "kicker": 24, "texto": 280, "link": 60 }, "obrigatorios": ["texto"],
               "quando": "Último card do artigo: referência bibliográfica e link curto." },
    "aviso": { "layout": "aviso", "campos": { "kicker": 24, "titulo": 60, "data": 30, "texto": 200, "link": 60 }, "obrigatorios": ["titulo"],
               "quando": "Card único: edital, evento, prazo, vaga ou reconhecimento (sem data)." }
  },
  "tipos": {
    "artigo": { "min": 3, "max": 10 },
    "aviso":  { "min": 1, "max": 1 }
  }
}
```

- [ ] **Step 4: Criar `instagram.css`**

`design-system/instagram/instagram.css`:
```css
/* PO para Todos — cards do Instagram (feed 1080×1350) e story (1080×1920).
 * Consome tokens.css e fontes.css no tema YouTube (grafite). Tamanhos de fonte
 * abaixo são decisões deste arquivo (tokens.json só conhece slides e miniaturas):
 * a grade é de 1080px vistos em ~400px no celular, ~2,7× a redução da miniatura.
 */
:root {
  --ig-margem: 72px;
  --ig-lockup: 120px;               /* logo quadrado do canal */
  --ig-rodape-altura: 96px;         /* faixa verde com o @ */
  --ig-kicker-size: 32px;  --ig-kicker-line: 40px;
  --ig-titulo-size: 76px;  --ig-titulo-line: 82px;       /* Archivo Black, caixa alta */
  --ig-titulo-medio-size: 58px; --ig-titulo-medio-line: 64px;
  --ig-corpo-size: 42px;   --ig-corpo-line: 58px;        /* Poppins 600 */
  --ig-apoio-size: 34px;   --ig-apoio-line: 44px;
  --ig-data-size: 96px;    --ig-data-line: 100px;
  --ig-numero-size: 160px;
  --ig-story-seguro: 250px;         /* zona da interface do app, em cima e embaixo */
  --ig-icone: 320px;
}

html, body { margin: 0; padding: 0; }
body { background: var(--surface); }

.ig {
  position: relative; overflow: hidden;
  width: var(--canvas-w); height: var(--canvas-h);
  background: var(--surface); color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
.ig--feed  { --canvas-w: 1080px; --canvas-h: 1350px; }
.ig--story { --canvas-w: 1080px; --canvas-h: 1920px; }

.ig__lockup { position: absolute; top: var(--ig-margem); left: var(--ig-margem); width: var(--ig-lockup); height: var(--ig-lockup); }

/* zona de conteúdo: entre o lockup e o rodapé, centrada na vertical */
.ig__conteudo {
  position: absolute; left: var(--ig-margem); right: var(--ig-margem);
  top: calc(var(--ig-margem) + var(--ig-lockup) + var(--space-xl));
  bottom: calc(var(--ig-rodape-altura) + var(--space-xl));
  display: flex; flex-direction: column; justify-content: center; gap: var(--space-md);
  overflow: hidden;
}
.ig__kicker { margin: 0; font: 800 var(--ig-kicker-size)/var(--ig-kicker-line) var(--font-label); letter-spacing: .04em; text-transform: uppercase; color: var(--brand-green-soft); }
.ig__titulo { margin: 0; font: 400 var(--ig-titulo-size)/var(--ig-titulo-line) var(--font-display); text-transform: uppercase; color: var(--brand-green); overflow-wrap: anywhere; }
.ig__titulo--medio { font-size: var(--ig-titulo-medio-size); line-height: var(--ig-titulo-medio-line); }
.ig__subhead { display: block; color: var(--ink); font-size: var(--ig-titulo-medio-size); line-height: var(--ig-titulo-medio-line); }
.ig__corpo { margin: 0; font: 600 var(--ig-corpo-size)/var(--ig-corpo-line) var(--font-label); color: var(--ink); }
.ig__apoio { margin: 0; font: 600 var(--ig-apoio-size)/var(--ig-apoio-line) var(--font-label); color: var(--ink-muted); overflow-wrap: anywhere; }
.ig__data  { margin: 0; font: 400 var(--ig-data-size)/var(--ig-data-line) var(--font-display); text-transform: uppercase; color: var(--ink); }
.ig__numero { margin: 0; font: 400 var(--ig-numero-size)/1 var(--font-display); color: var(--brand-green-soft); }
.ig__icone { width: var(--ig-icone); height: var(--ig-icone); }
.ig__icone img { display: block; width: 100%; height: 100%; object-fit: contain; }

/* rodapé: @ do perfil à esquerda, contador do carrossel à direita (brand-navy sobre verde, 5,08:1) */
.ig__rodape {
  position: absolute; left: 0; right: 0; bottom: 0; height: var(--ig-rodape-altura); margin: 0;
  background: var(--brand-green); color: var(--brand-navy);
  display: flex; align-items: center; justify-content: space-between; padding: 0 var(--ig-margem);
  font: 800 var(--ig-kicker-size)/1 var(--font-label);
}

/* story: conteúdo começa abaixo da zona segura; rodapé sobe para cima dela;
   o espaço livre acima do rodapé é onde a pessoa cola o sticker de link */
.ig--story .ig__lockup { top: var(--ig-story-seguro); }
.ig--story .ig__conteudo { top: calc(var(--ig-story-seguro) + var(--ig-lockup) + var(--space-xl)); bottom: calc(var(--ig-story-seguro) + var(--ig-rodape-altura) + 360px); justify-content: center; }
.ig--story .ig__rodape { bottom: var(--ig-story-seguro); justify-content: center; }
.ig--story .ig__faixa { position: absolute; left: 0; right: 0; bottom: calc(var(--ig-story-seguro) + var(--ig-rodape-altura)); height: var(--ig-rodape-altura); margin: 0; display: flex; align-items: center; justify-content: center; font: 800 var(--ig-kicker-size)/1 var(--font-label); color: var(--brand-green-soft); letter-spacing: .04em; }
```

- [ ] **Step 5: Criar os quatro layouts de card**

Todos começam com o mesmo cabeçalho (copie em cada arquivo):
```html
<!doctype html>
<html lang="pt-BR" data-theme="youtube">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080">
<title>{{titulo_pagina}}</title>
<link rel="stylesheet" href="{{ds}}/tokens.css">
<link rel="stylesheet" href="{{ds}}/assets/fontes/fontes.css">
<link rel="stylesheet" href="{{ds}}/instagram/instagram.css">
</head>
<body>
```

`design-system/instagram/layouts/capa.html` (após o cabeçalho):
```html
<!-- Capa do carrossel de artigo: kicker, título em caixa alta, autores, evento/revista. -->
<main class="ig ig--feed">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__kicker">{{kicker}}</p>
    <h1 class="ig__titulo {{titulo_classe}}">{{titulo}}</h1>
    <p class="ig__apoio">{{autores}}</p>
    {{#onde}}<p class="ig__apoio">{{onde}}</p>{{/onde}}
  </div>
  <p class="ig__rodape"><span>@{{usuario}}</span><span>{{contador}}</span></p>
</main>
</body>
</html>
```

`design-system/instagram/layouts/ideia.html`:
```html
<!-- Card de ideia: número grande, título curto, texto corrido. -->
<main class="ig ig--feed">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__numero">{{numero}}</p>
    <h1 class="ig__titulo ig__titulo--medio">{{titulo}}</h1>
    <p class="ig__corpo">{{texto_html}}</p>
  </div>
  <p class="ig__rodape"><span>@{{usuario}}</span><span>{{contador}}</span></p>
</main>
</body>
</html>
```

`design-system/instagram/layouts/fim.html`:
```html
<!-- Último card do artigo: referência e link. -->
<main class="ig ig--feed">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__kicker">{{kicker}}</p>
    <p class="ig__corpo">{{texto_html}}</p>
    {{#link}}<p class="ig__apoio">{{link}}</p>{{/link}}
    <p class="ig__apoio">Salve este post para ler depois.</p>
  </div>
  <p class="ig__rodape"><span>@{{usuario}}</span><span>{{contador}}</span></p>
</main>
</body>
</html>
```

`design-system/instagram/layouts/aviso.html`:
```html
<!-- Card único de aviso: kicker, nome, data-limite grande, detalhes, link. -->
<main class="ig ig--feed">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__kicker">{{kicker}}</p>
    <h1 class="ig__titulo {{titulo_classe}}">{{titulo}}</h1>
    {{#data}}<p class="ig__data">{{data}}</p>{{/data}}
    {{#texto_html}}<p class="ig__corpo">{{texto_html}}</p>{{/texto_html}}
    {{#link}}<p class="ig__apoio">{{link}}</p>{{/link}}
  </div>
  <p class="ig__rodape"><span>@{{usuario}}</span><span>{{contador}}</span></p>
</main>
</body>
</html>
```

- [ ] **Step 6: Criar o layout do story**

`design-system/instagram/layouts/story-video.html` (mesmo cabeçalho, com `<meta name="viewport" content="width=1080">` e `<title>{{headline}} {{subhead}} — story</title>`):
```html
<!-- Story de vídeo novo: mesma headline/subhead/ícone da miniatura; o espaço
     entre o conteúdo e a faixa fica livre para o sticker de link. -->
<main class="ig ig--story">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__kicker">{{kicker}}</p>
    <h1 class="ig__titulo">{{headline}}<span class="ig__subhead">{{subhead}}</span></h1>
    <div class="ig__icone"><img src="{{ds}}/miniaturas/icones/{{icone}}.svg" alt=""></div>
  </div>
  <p class="ig__faixa">{{faixa}}</p>
  <p class="ig__rodape"><span>@{{usuario}}</span></p>
</main>
</body>
</html>
```

- [ ] **Step 7: Escrever `fundamentos-instagram.md`**

`design-system/fundamentos-instagram.md`:
```markdown
# Instagram

Padrão dos cards de feed e dos stories do perfil `@pesquisaoperacionalparatodos`. Decidido em 20/09/2026 (spec do braço Instagram): o Instagram usa a **mesma marca do YouTube** — fundo grafite, verde da marca, Archivo Black e Poppins — para o perfil e o canal serem a mesma coisa. Os posts antigos (verde/laranja e azul estilo Canva) não são refeitos.

## Formatos

- Feed e carrossel: **1080 × 1350 px (4:5)** — ocupa o máximo de tela no celular. Todos os cards de um carrossel têm a mesma proporção.
- Story: **1080 × 1920 px (9:16)**. Os 250 px do topo e do rodapé ficam livres: o app desenha a barra de progresso, o nome do perfil e a caixa de resposta por cima.
- Exportação em escala 1 (o Instagram reduz tudo para 1080 px de largura). A API só aceita JPEG; o PNG é o arquivo de trabalho.

## Grade (1080 de largura)

- Margem lateral 72 px (área útil 936 px). Lockup do canal (logo quadrado, 120 px) no canto superior esquerdo — assina, não compete.
- Rodapé de largura total em `brand-green`, 96 px, com `@pesquisaoperacionalparatodos` à esquerda e o contador do carrossel (`2/5`) à direita, em `brand-navy` sobre o verde (5,08:1).
- Conteúdo centrado na vertical entre lockup e rodapé. Um só bloco de leitura por card; nunca dois assuntos.
- Story: conteúdo na metade superior, faixa "ASSISTA NO YOUTUBE" e rodapé logo acima da zona segura de baixo; entre eles, espaço para o sticker de link, que a pessoa adiciona no app.

## Tipografia (`instagram.css`)

| Papel | Fonte | Tamanho | Cor |
|---|---|---|---|
| kicker ("RESUMO DE ARTIGO", "PRAZO") | Poppins 800, caixa alta | 32/40 | `brand-green-soft` |
| título | Archivo Black, caixa alta | 76/82 (58/64 acima de 60 caracteres) | `brand-green` |
| número da ideia | Archivo Black | 160 | `brand-green-soft` |
| corpo | Poppins 600 | 42/58 | `ink` |
| apoio (autores, link, evento) | Poppins 600 | 34/44 | `ink-muted` |
| data-limite | Archivo Black, caixa alta | 96/100 | `ink` |

Motivo dos tamanhos: o card é visto a ~400 px no celular; 42 px de corpo viram ~16 px na tela, o mínimo confortável.

## Copy

- Título de artigo: o título original, em caixa alta, como o perfil já faz. Não traduza títulos em inglês.
- Ideia: título de até 40 caracteres que resume; texto de até 280 caracteres, uma ideia só, sem citação longa.
- Aviso: o nome do que está sendo avisado no título; data-limite em `dd/mm` ou `dd/mm/aaaa` precedida de "ATÉ"; link legível (sem `https://`).
- Nunca frase de marketing, nunca ponto de exclamação no título, nunca emoji nos cards (só na legenda).

## Nunca

- Reduzir a fonte para caber — corte o texto (os limites estão em `instagram/formatos.json`).
- Trocar cores, fundo ou fontes; usar logos de terceiros ou imagem gerada por modelo.
- Escrever "arraste para o lado", "link na bio" ou pedir like dentro do card.
```

- [ ] **Step 8: Conferir visualmente um card de cada layout**

Crie `thumbnails/out/ig-teste.html` copiando `layouts/aviso.html`, substituindo à mão: `{{ds}}` → `../../design-system`, `{{kicker}}` → `PRAZO`, `{{titulo}}` → `SUBMISSÃO DE ARTIGOS SBPO`, `{{data}}` → `ATÉ 15/03`, `{{texto_html}}` → `Simpósio Brasileiro de Pesquisa Operacional. Trabalhos completos e resumos.`, `{{link}}` → `sbpo2027.com.br`, `{{usuario}}` → `pesquisaoperacionalparatodos`, `{{contador}}` → `1/1`, `{{titulo_classe}}` → vazio, `{{titulo_pagina}}` → `teste`, e apague os marcadores `{{#…}}`/`{{/…}}`.

Run: `design-system/scripts/exportar.sh thumbnails/out/ig-teste.html thumbnails/out/ig-teste.png 1 1080 1350 && open thumbnails/out/ig-teste.png`
Expected: PNG 1080×1350, fundo grafite, kicker verde-claro, título verde, data branca grande, rodapé verde com `@pesquisaoperacionalparatodos` e `1/1`. Se algo estourar a zona (texto cortado), ajuste os tamanhos em `instagram.css`, nunca os limites. (`thumbnails/out/` está no `.gitignore`.)

- [ ] **Step 9: Rodar os testes e commitar**

Run: `npm test`
Expected: `# fail 0`.

```bash
git add design-system/instagram design-system/fundamentos-instagram.md tests/cards.test.mjs
git commit -m "Design system: formatos, CSS, layouts e fundamentos do Instagram

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `gerar-cards.mjs` e o post de exemplo

**Files:**
- Create: `design-system/scripts/gerar-cards.mjs`
- Create: `instagram/2026-09-20-kruskal-1956/post.md`, `cards.json`, `card-01.png` … `card-05.png`
- Modify: `canal.json` (chave `instagramUsuario`)
- Modify: `.gitignore`
- Test: `tests/cards.test.mjs`

**Interfaces:**
- Consumes: `preencher`, `exportarPng` (Task 1); `instagram/formatos.json` e layouts (Task 2).
- Produces: `validarCards(dados)` → `string[]` de erros; `variaveisDoCard(card, i, total, { ds, usuario })` → objeto de variáveis do layout; `gerarCards(pasta, { soHtml })` → lista de caminhos gerados; classe `ErroCards`. Formato de `cards.json`: `{ "tipo": "artigo" | "aviso", "cards": [ { "tipo": "capa" | "ideia" | "fim" | "aviso", …campos } ] }`. CLI: `node design-system/scripts/gerar-cards.mjs instagram/<pasta> [--so-html]`.

- [ ] **Step 1: Escrever o `post.md` do exemplo**

`instagram/2026-09-20-kruskal-1956/post.md` (artigo clássico, de domínio público na discussão, sem `@`):
```markdown
---
tipo: artigo
---

## Título
On the Shortest Spanning Subtree of a Graph and the Traveling Salesman Problem

## Autores
- Joseph B. Kruskal

## Onde
Proceedings of the American Mathematical Society, v. 7, n. 1, 1956

## Link
https://doi.org/10.1090/S0002-9939-1956-0078686-7

## Resumo
Artigo de duas páginas e meia que apresenta o algoritmo hoje conhecido como algoritmo de Kruskal: para achar a árvore geradora de custo mínimo de um grafo, ordene as arestas por custo e vá acrescentando a mais barata que não feche ciclo, até conectar todos os vértices. Kruskal prova que o resultado é ótimo e observa que o método serve como aproximação (limite inferior) para o problema do caixeiro viajante, já que toda rota do caixeiro contém uma árvore geradora. Ele também discute a versão "reversa" do algoritmo: partir do grafo completo e remover a aresta mais cara que não desconecta o grafo.
```

- [ ] **Step 2: Escrever o `cards.json` do exemplo**

`instagram/2026-09-20-kruskal-1956/cards.json`:
```json
{
  "tipo": "artigo",
  "cards": [
    { "tipo": "capa", "titulo": "On the Shortest Spanning Subtree of a Graph and the Traveling Salesman Problem", "autores": "Joseph B. Kruskal", "onde": "Proc. of the AMS, 1956" },
    { "tipo": "ideia", "titulo": "O problema", "texto": "Conectar todos os vértices de um grafo gastando o mínimo: é a árvore geradora mínima. Em 1956, com redes elétricas e de telefone crescendo, era um problema muito prático." },
    { "tipo": "ideia", "titulo": "O algoritmo", "texto": "Ordene as arestas da mais barata para a mais cara. Acrescente uma por vez, pulando toda aresta que fecharia um ciclo. Quando todos os vértices estiverem ligados, pare." },
    { "tipo": "ideia", "titulo": "Por que funciona", "texto": "Kruskal prova que escolher sempre a aresta mais barata que não fecha ciclo nunca leva a uma árvore pior. E mostra o elo com o caixeiro viajante: toda rota contém uma árvore geradora." },
    { "tipo": "fim", "texto": "KRUSKAL, J. B. On the shortest spanning subtree of a graph and the traveling salesman problem. Proceedings of the American Mathematical Society, v. 7, n. 1, p. 48–50, 1956.", "link": "doi.org/10.1090/S0002-9939-1956-0078686-7" }
  ]
}
```

- [ ] **Step 3: Acrescentar os testes do gerador**

Acrescente a `tests/cards.test.mjs`:
```js
import { mkdtempSync, copyFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validarCards, variaveisDoCard, gerarCards, ErroCards } from "../design-system/scripts/gerar-cards.mjs";

const exemplo = fileURLToPath(new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url));
const dados = JSON.parse(readFileSync(join(exemplo, "cards.json"), "utf8"));

test("o exemplo passa na validação", () => {
  assert.deepEqual(validarCards(dados), []);
});

test("validação: sequência do artigo, limites e campos desconhecidos", () => {
  const capa = { tipo: "capa", titulo: "T", autores: "A" };
  const ideia = { tipo: "ideia", titulo: "I", texto: "x" };
  const fim = { tipo: "fim", texto: "ref" };
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, ideia] }).some((e) => e.includes("3 a 10")));
  assert.ok(validarCards({ tipo: "artigo", cards: [ideia, ideia, fim] }).some((e) => e.includes("primeiro card é a capa")));
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, ideia, ideia] }).some((e) => e.includes("último card")));
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, { ...ideia, texto: "x".repeat(281) }, fim] }).some((e) => e.includes("máximo 280")));
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, { ...ideia, cor: "azul" }, fim] }).some((e) => e.includes('campo "cor"')));
  assert.ok(validarCards({ tipo: "artigo", cards: [{ tipo: "capa", titulo: "T" }, ideia, fim] }).some((e) => e.includes('falta "autores"')));
  assert.ok(validarCards({ tipo: "aviso", cards: [capa] }).some((e) => e.includes("tipo aviso")));
  assert.ok(validarCards({ tipo: "reel", cards: [] })[0].includes('tipo "reel" não existe'));
  assert.deepEqual(validarCards({ tipo: "aviso", cards: [{ tipo: "aviso", titulo: "SBPO", data: "ATÉ 15/03" }] }), []);
});

test("variáveis do card: kicker padrão, numeração, contador, título médio e quebras de linha", () => {
  const v = variaveisDoCard({ tipo: "ideia", titulo: "I", texto: "a<b\nc" }, 1, 5, { ds: ".", usuario: "po" });
  assert.equal(v.numero, "01");
  assert.equal(v.contador, "2/5");
  assert.equal(v.texto_html, "a&lt;b<br>c");
  assert.equal(v.usuario, "po");
  assert.equal(variaveisDoCard({ tipo: "capa", titulo: "T", autores: "A" }, 0, 3, { ds: ".", usuario: "po" }).kicker, "RESUMO DE ARTIGO");
  assert.equal(variaveisDoCard({ tipo: "capa", titulo: "T".repeat(61), autores: "A" }, 0, 3, { ds: ".", usuario: "po" }).titulo_classe, "ig__titulo--medio");
  assert.equal(variaveisDoCard({ tipo: "aviso", titulo: "T", kicker: "Prazo" }, 0, 1, { ds: ".", usuario: "po" }).kicker, "Prazo");
});

test("gerarCards --so-html escreve um HTML por card com o layout certo", () => {
  const pasta = mkdtempSync(join(tmpdir(), "cards-"));
  copyFileSync(join(exemplo, "cards.json"), join(pasta, "cards.json"));
  const saidas = gerarCards(pasta, { soHtml: true });
  assert.equal(saidas.length, 5);
  const capa = readFileSync(saidas[0], "utf8");
  assert.ok(capa.includes("ig--feed") && capa.includes("RESUMO DE ARTIGO") && capa.includes("Joseph B. Kruskal") && capa.includes("1/5"));
  assert.ok(readFileSync(saidas[1], "utf8").includes('class="ig__numero">01<'));
  assert.ok(readFileSync(saidas[4], "utf8").includes("doi.org/10.1090"));
  assert.match(capa, /href="[^"]*design-system\/tokens\.css"/);
});

test("gerarCards recusa cards.json inválido", () => {
  const pasta = mkdtempSync(join(tmpdir(), "cards-"));
  writeFileSync(join(pasta, "cards.json"), JSON.stringify({ tipo: "aviso", cards: [] }));
  assert.throws(() => gerarCards(pasta, { soHtml: true }), ErroCards);
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `node --test tests/cards.test.mjs`
Expected: falha ao importar `gerar-cards.mjs` (não existe).

- [ ] **Step 5: `canal.json` ganha o usuário do Instagram**

Em `canal.json`, logo após a linha `"instagram": "https://www.instagram.com/pesquisaoperacionalparatodos/",` acrescente:
```json
  "instagramUsuario": "pesquisaoperacionalparatodos",
```

- [ ] **Step 6: Escrever `gerar-cards.mjs`**

`design-system/scripts/gerar-cards.mjs`:
```js
#!/usr/bin/env node
// Gera os cards de um post do Instagram (PNG 1080×1350) a partir de instagram/<pasta>/cards.json.
//
//   node design-system/scripts/gerar-cards.mjs instagram/2026-09-20-kruskal-1956
//   node design-system/scripts/gerar-cards.mjs instagram/<pasta> --so-html    (só o HTML, sem Chrome)
//
// cards.json: { "tipo": "artigo" | "aviso", "cards": [ { "tipo": "capa" | "ideia" | "fim" | "aviso", ...campos } ] }
// Campos, limites e sequência por tipo estão em instagram/formatos.json; tudo é validado antes de renderizar.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher, exportarPng, esc } from "./modelo-html.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
export const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));

export class ErroCards extends Error {}

const KICKER_PADRAO = { capa: "RESUMO DE ARTIGO", fim: "REFERÊNCIA", aviso: "AVISO" };
const TITULO_LONGO = 60;   // acima disso o título cai para o tamanho médio

export function validarCards(dados) {
  const erros = [];
  const tipo = formatos.tipos[dados.tipo];
  if (!tipo) return [`tipo "${dados.tipo}" não existe (${Object.keys(formatos.tipos).join(", ")})`];
  const cards = Array.isArray(dados.cards) ? dados.cards : [];
  if (cards.length < tipo.min || cards.length > tipo.max) erros.push(`post do tipo ${dados.tipo} tem de ${tipo.min} a ${tipo.max} cards; há ${cards.length}`);
  cards.forEach((c, i) => {
    const n = i + 1;
    const def = formatos.cards[c.tipo];
    if (!def) { erros.push(`card ${n}: tipo "${c.tipo}" não existe (${Object.keys(formatos.cards).join(", ")})`); return; }
    for (const campo of def.obrigatorios) if (!c[campo] || !String(c[campo]).trim()) erros.push(`card ${n} (${c.tipo}): falta "${campo}"`);
    for (const [campo, max] of Object.entries(def.campos)) {
      const v = c[campo];
      if (v == null) continue;
      if (typeof v !== "string") erros.push(`card ${n}: "${campo}" precisa ser texto`);
      else if (v.length > max) erros.push(`card ${n}: "${campo}" tem ${v.length} caracteres — máximo ${max}`);
    }
    for (const campo of Object.keys(c)) if (campo !== "tipo" && !(campo in def.campos)) erros.push(`card ${n}: campo "${campo}" não existe no card ${c.tipo}`);
  });
  if (dados.tipo === "artigo" && cards.length) {
    if (cards[0].tipo !== "capa") erros.push("artigo: o primeiro card é a capa");
    if (cards.at(-1).tipo !== "fim") erros.push("artigo: o último card é o fim (referência)");
    if (!cards.slice(1, -1).every((c) => c.tipo === "ideia")) erros.push("artigo: entre a capa e o fim só entram cards de ideia");
  }
  if (dados.tipo === "aviso" && cards.length && cards[0].tipo !== "aviso") erros.push("aviso: o card único é do tipo aviso");
  return erros;
}

// Variáveis que os layouts consomem. `numero` conta as ideias a partir de 01 (a capa é o card 0).
export function variaveisDoCard(card, i, total, { ds, usuario }) {
  const titulo = card.titulo ?? "";
  return {
    ds, usuario,
    contador: `${i + 1}/${total}`,
    kicker: card.kicker ?? KICKER_PADRAO[card.tipo] ?? "",
    numero: String(i).padStart(2, "0"),
    titulo,
    titulo_classe: titulo.length > TITULO_LONGO ? "ig__titulo--medio" : "",
    autores: card.autores ?? "",
    onde: card.onde ?? "",
    data: card.data ?? "",
    link: card.link ?? "",
    texto_html: esc(card.texto ?? "").replace(/\n/g, "<br>"),
    titulo_pagina: `${titulo || card.tipo} — PO para Todos`,
  };
}

export function gerarCards(pasta, { soHtml = false } = {}) {
  const arquivo = join(pasta, "cards.json");
  if (!existsSync(arquivo)) throw new ErroCards(`não achei ${arquivo}`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarCards(dados);
  if (erros.length) throw new ErroCards(`cards.json inválido:\n- ${erros.join("\n- ")}`);
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  const { largura, altura } = formatos.formatos.feed;
  const saidas = [];
  dados.cards.forEach((card, i) => {
    const modelo = readFileSync(join(DS, "instagram/layouts", `${formatos.cards[card.tipo].layout}.html`), "utf8");
    const nn = String(i + 1).padStart(2, "0");
    const html = join(pasta, `card-${nn}.html`), png = join(pasta, `card-${nn}.png`);
    writeFileSync(html, preencher(modelo, variaveisDoCard(card, i, dados.cards.length, { ds, usuario: canal.instagramUsuario }), { brutos: ["ds", "texto_html"] }));
    if (soHtml) { saidas.push(html); return; }
    exportarPng(html, png, { largura, altura });
    unlinkSync(html);
    saidas.push(png);
  });
  // cards que sobraram de uma versão anterior com mais itens
  for (let n = dados.cards.length + 1; n <= formatos.tipos[dados.tipo].max; n++) {
    const velho = join(pasta, `card-${String(n).padStart(2, "0")}.png`);
    if (existsSync(velho)) unlinkSync(velho);
  }
  return saidas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-cards.mjs instagram/<pasta> [--so-html]"); process.exit(1); }
  try {
    const saidas = gerarCards(resolve(pasta), { soHtml: args.includes("--so-html") });
    for (const s of saidas) console.log(relative(RAIZ, s));
  } catch (e) {
    if (e instanceof ErroCards) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

- [ ] **Step 7: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 8: Gerar os PNGs do exemplo e conferir**

Run: `node design-system/scripts/gerar-cards.mjs instagram/2026-09-20-kruskal-1956 && open instagram/2026-09-20-kruskal-1956/card-0*.png`
Expected: 5 linhas `instagram/2026-09-20-kruskal-1956/card-01.png` … `card-05.png`; cada PNG 1080×1350 (`node -e "import('sharp').then(async s=>console.log(await s.default('instagram/2026-09-20-kruskal-1956/card-01.png').metadata()))"` mostra `width: 1080, height: 1350`). Olhe os cinco: título da capa em tamanho médio (tem 79 caracteres) sem cortar; número `01`/`02`/`03` nas ideias; referência inteira no card 5; rodapé com `@pesquisaoperacionalparatodos` e `n/5`. Se algum texto cortar, ajuste `instagram.css` (Task 2) e gere de novo.

- [ ] **Step 9: `.gitignore` — PNGs de posts são gerados, salvo o exemplo**

Acrescente ao final de `.gitignore`:
```
instagram/**/card-*.png
instagram/**/card-*.html
instagram/**/*.jpg
!instagram/2026-09-20-kruskal-1956/card-*.png
videos/**/story.png
videos/**/story.html
```

- [ ] **Step 10: Commit**

```bash
git add design-system/scripts/gerar-cards.mjs instagram/2026-09-20-kruskal-1956/post.md instagram/2026-09-20-kruskal-1956/cards.json instagram/2026-09-20-kruskal-1956/card-0*.png canal.json .gitignore tests/cards.test.mjs
git commit -m "Gerador de cards do Instagram e post de exemplo (Kruskal, 1956)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `legenda.mjs` — legenda no padrão do perfil

**Files:**
- Create: `scripts/legenda.mjs`
- Create: `instagram/2026-09-20-kruskal-1956/legenda.json`, `legenda.txt`
- Modify: `canal.json` (chave `instagramLegenda`)
- Modify: `package.json` (scripts `cards`, `legenda`)
- Test: `tests/legenda.test.mjs`

**Interfaces:**
- Produces: `validarLegenda(legenda, tipo)` → `string[]`; `montarLegenda({ legenda, tipo, canal })` → string; `GANCHO_MAX = 125`, `LEGENDA_MAX = 2200`, `HASHTAGS_MAX = 30`; classe `ErroLegenda`. `legenda.json`: `{ "gancho": string, "corpo": string, "autores": string | null, "hashtags_tema": string[] }`. CLI: `node scripts/legenda.mjs instagram/<pasta>` grava e imprime `legenda.txt`.

- [ ] **Step 1: `canal.json` ganha o rodapé e os CTAs do Instagram**

Logo após a linha `"instagramUsuario": …` acrescente:
```json
  "instagramLegenda": {
    "rodape": "📚 PO para Todos — projeto de extensão da UNIRIO que leva Pesquisa Operacional a todo mundo.",
    "cta": {
      "artigo": "💾 Salve este post para ler depois · mais conteúdo no link da bio.",
      "aviso": "🔗 Inscrições e detalhes: link na bio."
    }
  },
```

- [ ] **Step 2: Escrever `legenda.json` e `legenda.txt` do exemplo**

`instagram/2026-09-20-kruskal-1956/legenda.json`:
```json
{
  "gancho": "Como ligar todos os pontos de uma rede gastando o mínimo? Um artigo de 1956, com menos de três páginas, respondeu.",
  "corpo": "Joseph Kruskal propôs um algoritmo de uma simplicidade desconcertante: ordene as arestas da mais barata para a mais cara e vá acrescentando uma a uma, pulando as que fecham ciclo. Quando todos os vértices estiverem conectados, você tem a árvore geradora mínima — e ele prova que nenhuma outra é mais barata.\n\nDe quebra, o artigo mostra o elo com o caixeiro viajante: toda rota do caixeiro contém uma árvore geradora, então o custo da árvore mínima é um limite inferior para a rota ótima.\n\nNo carrossel, as três ideias do artigo em três cards.",
  "autores": "Joseph B. Kruskal",
  "hashtags_tema": ["#ArvoreGeradora", "#Kruskal", "#Grafos", "#CaixeiroViajante"]
}
```

`instagram/2026-09-20-kruskal-1956/legenda.txt` (exatamente o que `montarLegenda` produz — parágrafos separados por linha em branco):
```
Como ligar todos os pontos de uma rede gastando o mínimo? Um artigo de 1956, com menos de três páginas, respondeu.

Joseph Kruskal propôs um algoritmo de uma simplicidade desconcertante: ordene as arestas da mais barata para a mais cara e vá acrescentando uma a uma, pulando as que fecham ciclo. Quando todos os vértices estiverem conectados, você tem a árvore geradora mínima — e ele prova que nenhuma outra é mais barata.

De quebra, o artigo mostra o elo com o caixeiro viajante: toda rota do caixeiro contém uma árvore geradora, então o custo da árvore mínima é um limite inferior para a rota ótima.

No carrossel, as três ideias do artigo em três cards.

✍️ Autores: Joseph B. Kruskal

💾 Salve este post para ler depois · mais conteúdo no link da bio.

📚 PO para Todos — projeto de extensão da UNIRIO que leva Pesquisa Operacional a todo mundo.

#PesquisaOperacional #PO #ArvoreGeradora #Kruskal #Grafos #CaixeiroViajante #Otimização #UNIRIO
```
(sem linha em branco no fim do arquivo além da quebra final).

- [ ] **Step 3: Escrever os testes**

`tests/legenda.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarLegenda, montarLegenda, GANCHO_MAX } from "../scripts/legenda.mjs";

const pasta = new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url);
const legenda = JSON.parse(readFileSync(new URL("legenda.json", pasta), "utf8"));
const canal = JSON.parse(readFileSync(new URL("../../canal.json", pasta), "utf8"));
const esperada = readFileSync(new URL("legenda.txt", pasta), "utf8").trim();

test("legenda do exemplo é idêntica à gravada", () => {
  assert.deepEqual(validarLegenda(legenda, "artigo"), []);
  assert.equal(montarLegenda({ legenda, tipo: "artigo", canal }), esperada);
});

test("gancho cabe nos 125 caracteres e é uma linha", () => {
  assert.ok(legenda.gancho.length <= GANCHO_MAX);
  assert.ok(validarLegenda({ ...legenda, gancho: "a".repeat(126) }, "artigo").some((e) => e.includes("125")));
  assert.ok(validarLegenda({ ...legenda, gancho: "a\nb" }, "artigo").some((e) => e.includes("uma linha")));
});

test("regras: hashtags do tema, autores no artigo, sem pedir like", () => {
  assert.ok(validarLegenda({ ...legenda, hashtags_tema: ["#A", "#B"] }, "artigo").some((e) => e.includes("3 a 4")));
  assert.ok(validarLegenda({ ...legenda, hashtags_tema: ["#Árvore", "#B", "#C"] }, "artigo").some((e) => e.includes("sem acento")));
  assert.ok(validarLegenda({ ...legenda, autores: null }, "artigo").some((e) => e.includes("autores")));
  assert.deepEqual(validarLegenda({ ...legenda, autores: null }, "aviso"), []);
  assert.ok(validarLegenda({ ...legenda, corpo: "Deixe o like!" }, "artigo").some((e) => e.includes("like")));
});

test("aviso usa o CTA de link na bio e não leva autores", () => {
  const l = { gancho: "Prazo do SBPO chegando.", corpo: "Submissões até 15/03.", autores: null, hashtags_tema: ["#SBPO", "#Evento", "#Prazo"] };
  const t = montarLegenda({ legenda: l, tipo: "aviso", canal });
  assert.ok(t.includes("🔗 Inscrições e detalhes: link na bio."));
  assert.ok(!t.includes("✍️"));
  assert.ok(t.endsWith("#PesquisaOperacional #PO #SBPO #Evento #Prazo #Otimização #UNIRIO"));
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `node --test tests/legenda.test.mjs`
Expected: falha ao importar `scripts/legenda.mjs`.

- [ ] **Step 5: Escrever `scripts/legenda.mjs`**

```js
#!/usr/bin/env node
// Monta a legenda de um post do Instagram a partir de legenda.json + cards.json + canal.json.
//
//   node scripts/legenda.mjs instagram/2026-09-20-kruskal-1956     → grava legenda.txt e imprime
//
// Ordem: gancho (≤ 125 caracteres, o que aparece antes do "mais") · corpo · ✍️ autores (artigo) ·
// CTA do tipo · rodapé do projeto · hashtags (abertura + tema + fechamento), como na descrição do YouTube.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const GANCHO_MAX = 125;
export const LEGENDA_MAX = 2200;
export const HASHTAGS_MAX = 30;

export class ErroLegenda extends Error {}

export function validarLegenda(legenda, tipo) {
  const erros = [];
  const { gancho, corpo, autores, hashtags_tema } = legenda ?? {};
  if (!gancho?.trim()) erros.push('falta "gancho"');
  else {
    if (gancho.length > GANCHO_MAX) erros.push(`gancho com ${gancho.length} caracteres — máximo ${GANCHO_MAX} (é o que aparece antes do "mais")`);
    if (gancho.includes("\n")) erros.push("gancho é uma linha só");
  }
  if (!corpo?.trim()) erros.push('falta "corpo"');
  if (tipo === "artigo" && !autores?.trim()) erros.push('artigo precisa de "autores" (por extenso, com @ de quem tiver)');
  if (!Array.isArray(hashtags_tema) || hashtags_tema.length < 3 || hashtags_tema.length > 4) erros.push("hashtags_tema: de 3 a 4");
  else for (const h of hashtags_tema) if (!/^#[A-Za-z0-9]+$/.test(h)) erros.push(`hashtag "${h}" precisa ser #CamelCase sem acento`);
  if (/\b(like|curte|curta|curtir)\b/i.test(`${gancho ?? ""} ${corpo ?? ""}`)) erros.push("a legenda não pede like");
  return erros;
}

export function montarLegenda({ legenda, tipo, canal }) {
  const partes = [
    legenda.gancho.trim(),
    legenda.corpo.trim(),
    tipo === "artigo" && legenda.autores ? `✍️ Autores: ${legenda.autores.trim()}` : "",
    canal.instagramLegenda.cta[tipo],
    canal.instagramLegenda.rodape,
    [...canal.hashtags.abertura, ...legenda.hashtags_tema, ...canal.hashtags.fechamento].join(" "),
  ];
  return partes.filter((p) => p && p.trim()).join("\n\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  try {
    if (!arg) throw new ErroLegenda("uso: node scripts/legenda.mjs instagram/<pasta>");
    const pasta = resolve(arg);
    const cards = JSON.parse(readFileSync(join(pasta, "cards.json"), "utf8"));
    const legenda = JSON.parse(readFileSync(join(pasta, "legenda.json"), "utf8"));
    const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
    if (!canal.instagramLegenda.cta[cards.tipo]) throw new ErroLegenda(`canal.json não tem CTA para o tipo "${cards.tipo}"`);
    const erros = validarLegenda(legenda, cards.tipo);
    if (erros.length) throw new ErroLegenda(`legenda.json inválido:\n- ${erros.join("\n- ")}`);
    const texto = montarLegenda({ legenda, tipo: cards.tipo, canal });
    const hashtags = (texto.match(/#\w+/g) ?? []).length;
    if (texto.length > LEGENDA_MAX) throw new ErroLegenda(`legenda com ${texto.length} caracteres — máximo ${LEGENDA_MAX}`);
    if (hashtags > HASHTAGS_MAX) throw new ErroLegenda(`${hashtags} hashtags — máximo ${HASHTAGS_MAX}`);
    writeFileSync(join(pasta, "legenda.txt"), texto + "\n");
    console.log(texto);
  } catch (e) {
    if (e instanceof ErroLegenda || e.code === "ENOENT") { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

- [ ] **Step 6: Rodar; gerar a legenda do exemplo pelo CLI para confirmar que bate**

Run: `npm test && node scripts/legenda.mjs instagram/2026-09-20-kruskal-1956 > /dev/null && git diff --stat instagram/`
Expected: `# fail 0`; o `git diff` não mostra mudança em `legenda.txt` (o CLI reescreveu o arquivo idêntico).

- [ ] **Step 7: Scripts npm**

Em `package.json`, acrescente a `"scripts"`:
```json
    "cards": "node design-system/scripts/gerar-cards.mjs",
    "legenda": "node scripts/legenda.mjs",
```

- [ ] **Step 8: Commit**

```bash
git add scripts/legenda.mjs instagram/2026-09-20-kruskal-1956/legenda.json instagram/2026-09-20-kruskal-1956/legenda.txt canal.json package.json tests/legenda.test.mjs
git commit -m "Legenda do Instagram: gancho, corpo, autores, CTA por tipo, rodapé e hashtags

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `gerar-story.mjs` — story de vídeo novo

**Files:**
- Create: `design-system/scripts/gerar-story.mjs`
- Test: `tests/story.test.mjs`

**Interfaces:**
- Consumes: `resolver(spec)` de `gerar-miniatura.mjs` (devolve `headline`, `subhead`, `icone` do catálogo); `preencher`, `exportarPng`; layout `story-video.html`; `canal.instagramUsuario`.
- Produces: `specDoVideo(pasta, extras)` → spec para `resolver` (`{ buscar: metadados.titulo, ...extras }`); `gerarStory(pasta, extras, { soHtml })` → caminho de `story.png` (ou `.html`); classe `ErroStory`. CLI: `node design-system/scripts/gerar-story.mjs videos/<slug> [--topico id] [--headline X] [--subhead Y] [--icone id] [--so-html]`.

- [ ] **Step 1: Escrever os testes**

`tests/story.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { specDoVideo, gerarStory, ErroStory } from "../design-system/scripts/gerar-story.mjs";

function pastaComTitulo(titulo) {
  const pasta = mkdtempSync(join(tmpdir(), "story-"));
  writeFileSync(join(pasta, "metadados.json"), JSON.stringify({ titulo }));
  return pasta;
}

test("spec do story parte do título do vídeo e aceita sobrescritas", () => {
  const pasta = pastaComTitulo("TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra");
  assert.deepEqual(specDoVideo(pasta, {}), { buscar: "TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra" });
  assert.deepEqual(specDoVideo(pasta, { topico: "dualidade" }), { buscar: "TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra", topico: "dualidade" });
  assert.throws(() => specDoVideo(pastaComTitulo(""), {}), ErroStory);
});

test("gerarStory --so-html usa headline, subhead e ícone do catálogo", () => {
  const pasta = pastaComTitulo("TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra");
  const html = readFileSync(gerarStory(pasta, {}, { soHtml: true }), "utf8");
  assert.ok(html.includes("ig--story"));
  assert.ok(html.includes("VÍDEO NOVO NO CANAL") && html.includes("ASSISTA NO YOUTUBE"));
  assert.ok(html.includes("FOLGAS") && html.includes("icones/dualidade.svg"));
  assert.ok(html.includes("@pesquisaoperacionalparatodos"));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/story.test.mjs`
Expected: falha ao importar `gerar-story.mjs`.

- [ ] **Step 3: Escrever `gerar-story.mjs`**

`design-system/scripts/gerar-story.mjs`:
```js
#!/usr/bin/env node
// Gera videos/<slug>/story.png (1080×1920): o story de "vídeo novo" para o Instagram,
// com a mesma headline, subhead e ícone da miniatura (resolvidos pelo catálogo).
//
//   node design-system/scripts/gerar-story.mjs videos/folgas-complementares
//   node design-system/scripts/gerar-story.mjs videos/<slug> --topico dualidade      (se a busca pelo título errar)
//   node design-system/scripts/gerar-story.mjs videos/<slug> --headline X --subhead Y --icone id
//
// O story é publicado à mão pelo app (a API não coloca o sticker de link).

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolver } from "./gerar-miniatura.mjs";
import { preencher, exportarPng } from "./modelo-html.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));

export class ErroStory extends Error {}

export function specDoVideo(pasta, extras = {}) {
  const arquivo = join(pasta, "metadados.json");
  if (!existsSync(arquivo)) throw new ErroStory(`não achei ${arquivo} — rode a skill titulo-descricao antes`);
  const meta = JSON.parse(readFileSync(arquivo, "utf8"));
  if (!meta.titulo) throw new ErroStory("metadados.json sem \"titulo\" — rode a skill titulo-descricao antes");
  return { buscar: meta.titulo, ...extras };
}

export function gerarStory(pasta, extras = {}, { soHtml = false } = {}) {
  const r = resolver(specDoVideo(pasta, extras));
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  const modelo = readFileSync(join(DS, "instagram/layouts/story-video.html"), "utf8");
  const html = join(pasta, "story.html"), png = join(pasta, "story.png");
  writeFileSync(html, preencher(modelo, { ds, usuario: canal.instagramUsuario, kicker: "VÍDEO NOVO NO CANAL", headline: r.headline, subhead: r.subhead, icone: r.icone, faixa: "ASSISTA NO YOUTUBE" }));
  if (soHtml) return html;
  const { largura, altura } = formatos.formatos.story;
  exportarPng(html, png, { largura, altura });
  unlinkSync(html);
  for (const a of r.avisos) if (a.startsWith("busca")) console.error(`aviso: ${a}`);   // avisos de layout são da miniatura, não do story
  return png;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  const extras = {};
  for (let i = 0; i < args.length; i++) if (args[i].startsWith("--") && args[i] !== "--so-html") extras[args[i].slice(2)] = args[++i];
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story.mjs videos/<slug> [--topico id] [--headline X --subhead Y --icone id] [--so-html]"); process.exit(1); }
  try {
    console.log(relative(RAIZ, gerarStory(resolve(pasta), extras, { soHtml: args.includes("--so-html") })));
  } catch (e) {
    if (e instanceof ErroStory || e.constructor.name === "ErroSpec") { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

- [ ] **Step 4: Rodar os testes e gerar o story do exemplo de vídeo**

Run: `npm test && node design-system/scripts/gerar-story.mjs videos/folgas-complementares && open videos/folgas-complementares/story.png`
Expected: `# fail 0`; imprime `videos/folgas-complementares/story.png`; PNG 1080×1920 com lockup abaixo do topo, "VÍDEO NOVO NO CANAL", FOLGAS / COMPLEMENTARES, ícone de dualidade, faixa "ASSISTA NO YOUTUBE" e rodapé verde acima dos 250 px inferiores, com espaço vazio entre o ícone e a faixa. O arquivo está no `.gitignore` (Task 3) — `git status` não o lista.

- [ ] **Step 5: Commit**

```bash
git add design-system/scripts/gerar-story.mjs tests/story.test.mjs
git commit -m "Story de vídeo novo: gerar-story.mjs reaproveita headline, subhead e ícone da miniatura

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `scripts/instagram.mjs` (parte 1) — tokens, renovação e `--status`

**Files:**
- Create: `scripts/instagram.mjs`
- Test: `tests/instagram.test.mjs`

**Interfaces:**
- Produces: `ARQUIVO_TOKENS` (`~/.po-para-todos/instagram.json`), `GRAPH = "https://graph.instagram.com/v23.0"`, `lerTokens(arquivo)`, `gravarTokens(dados, arquivo)`, `diasRestantes(instagram, agora)`, `criarApiInstagram(token, fetchImpl)` → `{ get(caminho, campos), post(caminho, corpo) }`, `guardarTokenInstagram(token, { fetchImpl, agora, arquivo, canal })`, `renovarSeNecessario(tokens, { fetchImpl, agora, arquivo, avisar })`, `statusDaConta(tokens, { fetchImpl, agora })`, classe `ErroInstagram`. Formato do arquivo de tokens: `{ "instagram": { "access_token", "usuario", "ig_id", "expira_em" }, "github_token": "…" }`.
- A Task 7 e a Task 8 acrescentam funções ao mesmo arquivo.

- [ ] **Step 1: Escrever o `fetch` falso e os testes de token**

`tests/instagram.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lerTokens, gravarTokens, diasRestantes, guardarTokenInstagram, renovarSeNecessario, statusDaConta, ErroInstagram } from "../scripts/instagram.mjs";

// fetch falso: rotas por método + regex da URL; registra as chamadas
export function fetchFalso(rotas) {
  const chamadas = [];
  const f = async (url, init = {}) => {
    const metodo = init.method ?? "GET";
    const corpo = typeof init.body === "string" ? init.body : init.body?.toString() ?? "";
    chamadas.push({ metodo, url, corpo, headers: init.headers ?? {} });
    const rota = rotas.find((r) => r.metodo === metodo && r.url.test(url));
    if (!rota) return { ok: false, status: 404, text: async () => JSON.stringify({ error: { message: `sem rota: ${metodo} ${url}` } }) };
    const json = typeof rota.json === "function" ? rota.json({ url, corpo, n: chamadas.length }) : rota.json;
    const status = rota.status ?? 200;
    return { ok: status < 400, status, text: async () => JSON.stringify(json) };
  };
  f.chamadas = chamadas;
  return f;
}

const canal = { instagramUsuario: "pesquisaoperacionalparatodos", github: "dono/repo" };
const AGORA = Date.parse("2026-09-20T12:00:00Z");
const DIA = 86_400_000;
const arquivoTemp = () => join(mkdtempSync(join(tmpdir(), "tokens-")), "instagram.json");

test("lerTokens devolve {} quando o arquivo não existe; gravarTokens cria a pasta", () => {
  const arq = arquivoTemp();
  assert.deepEqual(lerTokens(arq), {});
  gravarTokens({ github_token: "ghp" }, arq);
  assert.deepEqual(lerTokens(arq), { github_token: "ghp" });
});

test("--token valida na API, confere o usuário e grava com 60 dias de validade", async () => {
  const arq = arquivoTemp();
  const f = fetchFalso([{ metodo: "GET", url: /\/me\?/, json: { user_id: "178", username: "pesquisaoperacionalparatodos" } }]);
  const ig = await guardarTokenInstagram("TOK", { fetchImpl: f, agora: AGORA, arquivo: arq, canal });
  assert.equal(ig.ig_id, "178");
  assert.equal(ig.expira_em, new Date(AGORA + 60 * DIA).toISOString());
  assert.ok(f.chamadas[0].url.includes("fields=user_id,username") && f.chamadas[0].url.includes("access_token=TOK"));
  assert.equal(lerTokens(arq).instagram.access_token, "TOK");
});

test("--token recusa token de outra conta e token inválido", async () => {
  const outra = fetchFalso([{ metodo: "GET", url: /\/me\?/, json: { user_id: "1", username: "fulano" } }]);
  await assert.rejects(guardarTokenInstagram("TOK", { fetchImpl: outra, agora: AGORA, arquivo: arquivoTemp(), canal }), /conta @fulano/);
  const invalido = fetchFalso([{ metodo: "GET", url: /\/me\?/, status: 400, json: { error: { message: "Invalid OAuth access token" } } }]);
  await assert.rejects(guardarTokenInstagram("TOK", { fetchImpl: invalido, agora: AGORA, arquivo: arquivoTemp(), canal }), /Invalid OAuth/);
});

test("renovação: só quando faltam menos de 30 dias; falha vira aviso; vencido vira erro", async () => {
  const arq = arquivoTemp();
  const base = { access_token: "VELHO", usuario: "po", ig_id: "1" };
  const avisos = [];
  const f = fetchFalso([{ metodo: "GET", url: /refresh_access_token/, json: { access_token: "NOVO", expires_in: 5_184_000 } }]);

  const longe = { instagram: { ...base, expira_em: new Date(AGORA + 45 * DIA).toISOString() } };
  assert.equal(await renovarSeNecessario(longe, { fetchImpl: f, agora: AGORA, arquivo: arq, avisar: (m) => avisos.push(m) }), longe);
  assert.equal(f.chamadas.length, 0);

  const perto = { instagram: { ...base, expira_em: new Date(AGORA + 10 * DIA).toISOString() } };
  const novo = await renovarSeNecessario(perto, { fetchImpl: f, agora: AGORA, arquivo: arq, avisar: (m) => avisos.push(m) });
  assert.equal(novo.instagram.access_token, "NOVO");
  assert.equal(novo.instagram.expira_em, new Date(AGORA + 60 * DIA).toISOString());
  assert.equal(lerTokens(arq).instagram.access_token, "NOVO");
  assert.ok(f.chamadas[0].url.includes("grant_type=ig_refresh_token&access_token=VELHO"));

  const falha = fetchFalso([{ metodo: "GET", url: /refresh_access_token/, status: 400, json: { error: { message: "token too new" } } }]);
  assert.equal(await renovarSeNecessario(perto, { fetchImpl: falha, agora: AGORA, arquivo: arq, avisar: (m) => avisos.push(m) }), perto);
  assert.ok(avisos.at(-1).includes("não consegui renovar") && avisos.at(-1).includes("10 dias"));

  const vencido = { instagram: { ...base, expira_em: new Date(AGORA - DIA).toISOString() } };
  await assert.rejects(renovarSeNecessario(vencido, { fetchImpl: f, agora: AGORA, arquivo: arq }), /venceu/);
  await assert.rejects(renovarSeNecessario({}, { fetchImpl: f, agora: AGORA, arquivo: arq }), ErroInstagram);
});

test("status: conta, dias restantes, cota e token do GitHub", async () => {
  const f = fetchFalso([{ metodo: "GET", url: /content_publishing_limit/, json: { data: [{ quota_usage: 3 }] } }]);
  const tokens = { instagram: { access_token: "T", usuario: "po", ig_id: "9", expira_em: new Date(AGORA + 40 * DIA).toISOString() } };
  const s = await statusDaConta(tokens, { fetchImpl: f, agora: AGORA });
  assert.deepEqual(s, { usuario: "po", diasRestantes: 40, cotaUsada: 3, cotaTotal: 100, github: false });
  assert.ok(f.chamadas[0].url.startsWith("https://graph.instagram.com/v23.0/9/content_publishing_limit?fields=quota_usage"));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/instagram.test.mjs`
Expected: falha ao importar `scripts/instagram.mjs`.

- [ ] **Step 3: Escrever a parte 1 de `scripts/instagram.mjs`**

```js
#!/usr/bin/env node
// Publica um post do Instagram (instagram/<pasta>) pela API oficial da Meta (Instagram Login).
//
//   node scripts/instagram.mjs --token "<token de longa duração>"   guarda o token do Instagram (valida e confere a conta)
//   node scripts/instagram.mjs --token-github "<token do GitHub>"   guarda o token que sobe as imagens
//   node scripts/instagram.mjs --status                             conta, validade do token, cota das 24 h
//   node scripts/instagram.mjs --publicar instagram/<pasta>         publica na hora (carrossel ou card único)
//
// Tokens ficam em ~/.po-para-todos/instagram.json (fora do repositório). O token do Instagram vale 60 dias;
// o script renova sozinho quando faltam menos de 30 e avisa quando a renovação falha.
// A API só baixa mídia de URL pública: os cards viram JPEG, vão num commit órfão para o branch `midia`
// do repositório (canal.json → github) pela API do GitHub, a Meta baixa, e o branch é esvaziado.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const GRAPH = "https://graph.instagram.com/v23.0";
export const GITHUB = "https://api.github.com";
export const ARQUIVO_TOKENS = join(homedir(), ".po-para-todos", "instagram.json");
const VALIDADE_DIAS = 60;         // token de longa duração
const RENOVAR_ABAIXO_DE = 30;     // dias
const COTA = 100;                 // publicações por 24 h
const DIA_MS = 86_400_000;

export class ErroInstagram extends Error {}

// ---------- tokens ----------
export function lerTokens(arquivo = ARQUIVO_TOKENS) {
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, "utf8")) : {};
}
export function gravarTokens(dados, arquivo = ARQUIVO_TOKENS) {
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, JSON.stringify(dados, null, 2) + "\n", { mode: 0o600 });
}
export function diasRestantes(instagram, agora = Date.now()) {
  return Math.floor((Date.parse(instagram.expira_em) - agora) / DIA_MS);
}

// ---------- HTTP ----------
async function chamar(url, { metodo = "GET", corpo, cabecalhos = {} } = {}, fetchImpl = fetch) {
  const r = await fetchImpl(url, { method: metodo, headers: cabecalhos, body: corpo });
  const texto = await r.text();
  let json;
  try { json = texto ? JSON.parse(texto) : {}; } catch { json = { bruto: texto }; }
  return { ok: r.ok, status: r.status, json };
}

// Graph API do Instagram: token vai na query (GET) ou no corpo form-urlencoded (POST).
export function criarApiInstagram(token, fetchImpl = fetch) {
  const erro = (json, o) => new ErroInstagram(`Instagram: ${json.error?.message ?? JSON.stringify(json)} (${o})`);
  return {
    async get(caminho, campos) {
      // query montada à mão: URLSearchParams codificaria a vírgula de "user_id,username"
      const q = `${campos ? `fields=${campos}&` : ""}access_token=${encodeURIComponent(token)}`;
      const { ok, json } = await chamar(`${GRAPH}/${caminho}?${q}`, {}, fetchImpl);
      if (!ok) throw erro(json, `GET ${caminho}`);
      return json;
    },
    async post(caminho, corpo) {
      const { ok, json } = await chamar(`${GRAPH}/${caminho}`, { metodo: "POST", corpo: new URLSearchParams({ ...corpo, access_token: token }).toString(), cabecalhos: { "content-type": "application/x-www-form-urlencoded" } }, fetchImpl);
      if (!ok) throw erro(json, `POST ${caminho}`);
      return json;
    },
  };
}

export async function guardarTokenInstagram(token, { fetchImpl = fetch, agora = Date.now(), arquivo = ARQUIVO_TOKENS, canal = lerCanal() } = {}) {
  const eu = await criarApiInstagram(token, fetchImpl).get("me", "user_id,username");
  if (eu.username !== canal.instagramUsuario) throw new ErroInstagram(`o token é da conta @${eu.username}, mas canal.json diz @${canal.instagramUsuario} — gere o token logado na conta do projeto`);
  const tokens = lerTokens(arquivo);
  tokens.instagram = { access_token: token, usuario: eu.username, ig_id: String(eu.user_id ?? eu.id), expira_em: new Date(agora + VALIDADE_DIAS * DIA_MS).toISOString() };
  gravarTokens(tokens, arquivo);
  return tokens.instagram;
}

export async function renovarSeNecessario(tokens, { fetchImpl = fetch, agora = Date.now(), arquivo = ARQUIVO_TOKENS, avisar = console.error } = {}) {
  const ig = tokens.instagram;
  if (!ig) throw new ErroInstagram(`sem token do Instagram — rode: node scripts/instagram.mjs --token "<token>" (README, seção Instagram)`);
  const dias = diasRestantes(ig, agora);
  if (dias < 0) throw new ErroInstagram("o token do Instagram venceu — gere outro no Meta for Developers e rode --token de novo (README, seção Instagram)");
  if (dias >= RENOVAR_ABAIXO_DE) return tokens;
  const q = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: ig.access_token });
  const { ok, json } = await chamar(`https://graph.instagram.com/refresh_access_token?${q}`, {}, fetchImpl);
  if (!ok) {
    avisar(`aviso: não consegui renovar o token do Instagram (faltam ${dias} dias): ${json.error?.message ?? JSON.stringify(json)}. Gere outro antes de vencer.`);
    return tokens;
  }
  const novo = { ...tokens, instagram: { ...ig, access_token: json.access_token, expira_em: new Date(agora + json.expires_in * 1000).toISOString() } };
  gravarTokens(novo, arquivo);
  avisar(`token do Instagram renovado; vale até ${novo.instagram.expira_em.slice(0, 10)}`);
  return novo;
}

export async function statusDaConta(tokens, { fetchImpl = fetch, agora = Date.now() } = {}) {
  const ig = tokens.instagram;
  if (!ig) throw new ErroInstagram(`sem token do Instagram — rode: node scripts/instagram.mjs --token "<token>"`);
  const cota = await criarApiInstagram(ig.access_token, fetchImpl).get(`${ig.ig_id}/content_publishing_limit`, "quota_usage");
  return { usuario: ig.usuario, diasRestantes: diasRestantes(ig, agora), cotaUsada: cota.data?.[0]?.quota_usage ?? 0, cotaTotal: COTA, github: Boolean(tokens.github_token) };
}

function lerCanal() { return JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8")); }

// ---------- CLI ----------
const USO = `uso:
  node scripts/instagram.mjs --token "<token do Instagram>"
  node scripts/instagram.mjs --token-github "<token do GitHub>"
  node scripts/instagram.mjs --status
  node scripts/instagram.mjs --publicar instagram/<pasta>`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [opcao, valor] = process.argv.slice(2);
  try {
    if (opcao === "--token" && valor) {
      const ig = await guardarTokenInstagram(valor);
      console.log(`token guardado em ${ARQUIVO_TOKENS}: conta @${ig.usuario}, vale até ${ig.expira_em.slice(0, 10)}`);
    } else if (opcao === "--token-github" && valor) {
      const tokens = lerTokens();
      tokens.github_token = valor;
      gravarTokens(tokens);
      console.log(`token do GitHub guardado em ${ARQUIVO_TOKENS}`);
    } else if (opcao === "--status") {
      const s = await statusDaConta(await renovarSeNecessario(lerTokens()));
      console.log(`conta: @${s.usuario}\ntoken do Instagram: vale por mais ${s.diasRestantes} dias\ncota: ${s.cotaUsada} de ${s.cotaTotal} publicações nas últimas 24 h\ntoken do GitHub: ${s.github ? "guardado" : "falta — rode --token-github"}`);
    } else if (opcao === "--publicar" && valor) {
      console.error("erro: --publicar ainda não implementado");   // Task 8 substitui
      process.exit(1);
    } else {
      console.error(USO);
      process.exit(1);
    }
  } catch (e) {
    if (e instanceof ErroInstagram) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`. Também: `node scripts/instagram.mjs` imprime o `uso:` e sai com código 1; `node scripts/instagram.mjs --status` sem token imprime `erro: sem token do Instagram — rode: …`.

- [ ] **Step 5: Commit**

```bash
git add scripts/instagram.mjs tests/instagram.test.mjs
git commit -m "instagram.mjs: tokens em ~/.po-para-todos, renovação automática e --status

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `scripts/instagram.mjs` (parte 2) — mídia pública no branch `midia`

**Files:**
- Modify: `scripts/instagram.mjs` (acrescentar funções antes do bloco CLI)
- Modify: `canal.json` (chave `github`)
- Test: `tests/instagram.test.mjs`

**Interfaces:**
- Produces: `criarApiGithub(token, repo, fetchImpl)` → `{ pedir(metodo, caminho, corpo), status(caminho) }` (caminhos relativos a `/repos/<repo>`); `subirMidia(gh, arquivos, { repo, branch = "midia" })` com `arquivos = [{ nome, conteudo: Buffer }]` → `{ sha, urls }`; `limparMidia(gh, { repo, branch })` → `{ sha }`; `paraJpeg(png)` → `Buffer`; `README_MIDIA` (texto do README do branch).

- [ ] **Step 1: `canal.json` ganha o repositório**

Logo após `"instagramLegenda": { … },` acrescente:
```json
  "github": "jotape-prog22/po-para-todos-publisher",
```

- [ ] **Step 2: Escrever os testes**

Acrescente a `tests/instagram.test.mjs` (o import da primeira linha ganha `criarApiGithub, subirMidia, limparMidia, paraJpeg, README_MIDIA`):
```js
// rotas da Git Data API do GitHub; `existeBranch` decide entre PATCH (branch existe) e POST refs
function rotasGithub({ existeBranch = true } = {}) {
  let blobs = 0;
  return [
    { metodo: "POST", url: /\/git\/blobs$/, json: () => ({ sha: `blob${++blobs}` }) },
    { metodo: "POST", url: /\/git\/trees$/, json: { sha: "tree1" } },
    { metodo: "POST", url: /\/git\/commits$/, json: { sha: "c0ffee" } },
    { metodo: "GET", url: /\/git\/ref\/heads\/midia$/, status: existeBranch ? 200 : 404, json: existeBranch ? { ref: "refs/heads/midia" } : { message: "Not Found" } },
    { metodo: "PATCH", url: /\/git\/refs\/heads\/midia$/, json: { ref: "refs/heads/midia" } },
    { metodo: "POST", url: /\/git\/refs$/, json: { ref: "refs/heads/midia" } },
  ];
}

test("subirMidia: blob por arquivo, tree com README, commit órfão, ref forçada, URLs pelo SHA", async () => {
  const f = fetchFalso(rotasGithub());
  const gh = criarApiGithub("ghp_x", "dono/repo", f);
  const r = await subirMidia(gh, [{ nome: "a.jpg", conteudo: Buffer.from("A") }, { nome: "b.jpg", conteudo: Buffer.from("B") }], { repo: "dono/repo" });
  assert.equal(r.sha, "c0ffee");
  assert.deepEqual(r.urls, ["https://raw.githubusercontent.com/dono/repo/c0ffee/a.jpg", "https://raw.githubusercontent.com/dono/repo/c0ffee/b.jpg"]);
  const seq = f.chamadas.map((c) => `${c.metodo} ${c.url.replace("https://api.github.com/repos/dono/repo", "")}`);
  assert.deepEqual(seq, ["POST /git/blobs", "POST /git/blobs", "POST /git/trees", "POST /git/commits", "GET /git/ref/heads/midia", "PATCH /git/refs/heads/midia"]);
  assert.equal(f.chamadas[0].headers.authorization, "Bearer ghp_x");
  assert.deepEqual(JSON.parse(f.chamadas[0].corpo), { content: Buffer.from("A").toString("base64"), encoding: "base64" });
  const tree = JSON.parse(f.chamadas[2].corpo).tree;
  assert.deepEqual(tree.map((t) => t.path), ["README.md", "a.jpg", "b.jpg"]);
  assert.equal(tree[0].content, README_MIDIA);
  assert.deepEqual(tree[1], { path: "a.jpg", mode: "100644", type: "blob", sha: "blob1" });
  assert.deepEqual(JSON.parse(f.chamadas[3].corpo).parents, []);
  assert.deepEqual(JSON.parse(f.chamadas[5].corpo), { sha: "c0ffee", force: true });
});

test("subirMidia cria o branch quando ele não existe; limparMidia deixa só o README", async () => {
  const f = fetchFalso(rotasGithub({ existeBranch: false }));
  const gh = criarApiGithub("ghp_x", "dono/repo", f);
  await limparMidia(gh, { repo: "dono/repo" });
  const seq = f.chamadas.map((c) => `${c.metodo} ${c.url.replace("https://api.github.com/repos/dono/repo", "")}`);
  assert.deepEqual(seq, ["POST /git/trees", "POST /git/commits", "GET /git/ref/heads/midia", "POST /git/refs"]);
  assert.deepEqual(JSON.parse(f.chamadas[0].corpo).tree.map((t) => t.path), ["README.md"]);
  assert.deepEqual(JSON.parse(f.chamadas[3].corpo), { ref: "refs/heads/midia", sha: "c0ffee" });
});

test("erro do GitHub vira ErroInstagram com a mensagem e o passo", async () => {
  const f = fetchFalso([{ metodo: "POST", url: /\/git\/blobs$/, status: 401, json: { message: "Bad credentials" } }]);
  const gh = criarApiGithub("ruim", "dono/repo", f);
  await assert.rejects(subirMidia(gh, [{ nome: "a.jpg", conteudo: Buffer.from("A") }], { repo: "dono/repo" }), (e) => e instanceof ErroInstagram && /Bad credentials/.test(e.message) && /POST \/git\/blobs/.test(e.message));
});

test("paraJpeg converte PNG em JPEG", async () => {
  const sharp = (await import("sharp")).default;
  const png = await sharp({ create: { width: 4, height: 5, channels: 3, background: "#2C2C2C" } }).png().toBuffer();
  const jpg = await paraJpeg(png);
  assert.equal(jpg[0], 0xff); assert.equal(jpg[1], 0xd8);
  assert.deepEqual((({ width, height, format }) => ({ width, height, format }))(await sharp(jpg).metadata()), { width: 4, height: 5, format: "jpeg" });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/instagram.test.mjs`
Expected: 4 falhas (`criarApiGithub is not a function` etc.).

- [ ] **Step 4: Acrescentar a parte 2 a `scripts/instagram.mjs`**

Antes do comentário `// ---------- CLI ----------`:
```js
// ---------- mídia pública (branch `midia` no GitHub) ----------
export const README_MIDIA = "Branch temporário: guarda as imagens de um post do Instagram só enquanto a Meta as baixa. Fica vazio entre publicações.\n";

export function criarApiGithub(token, repo, fetchImpl = fetch) {
  const cabecalhos = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json" };
  const base = `${GITHUB}/repos/${repo}`;
  return {
    async pedir(metodo, caminho, corpo) {
      const { ok, status, json } = await chamar(`${base}${caminho}`, { metodo, corpo: corpo && JSON.stringify(corpo), cabecalhos }, fetchImpl);
      if (!ok) throw new ErroInstagram(`GitHub: ${json.message ?? JSON.stringify(json)} (${metodo} ${caminho}, HTTP ${status})`);
      return json;
    },
    async status(caminho) {
      return (await chamar(`${base}${caminho}`, { cabecalhos }, fetchImpl)).status;
    },
  };
}

// Sobe os arquivos num commit órfão (sem pai) e aponta o branch para ele, com força:
// o branch nunca acumula histórico de imagens. Devolve o SHA e as URLs raw (imutáveis, pelo SHA).
export async function subirMidia(gh, arquivos, { repo, branch = "midia" }) {
  const tree = [{ path: "README.md", mode: "100644", type: "blob", content: README_MIDIA }];
  for (const { nome, conteudo } of arquivos) {
    const blob = await gh.pedir("POST", "/git/blobs", { content: conteudo.toString("base64"), encoding: "base64" });
    tree.push({ path: nome, mode: "100644", type: "blob", sha: blob.sha });
  }
  const arvore = await gh.pedir("POST", "/git/trees", { tree });
  const mensagem = arquivos.length ? `mídia temporária: ${arquivos.map((a) => a.nome).join(", ")}` : "branch de mídia vazio";
  const commit = await gh.pedir("POST", "/git/commits", { message: mensagem, tree: arvore.sha, parents: [] });
  if ((await gh.status(`/git/ref/heads/${branch}`)) === 404) await gh.pedir("POST", "/git/refs", { ref: `refs/heads/${branch}`, sha: commit.sha });
  else await gh.pedir("PATCH", `/git/refs/heads/${branch}`, { sha: commit.sha, force: true });
  return { sha: commit.sha, urls: arquivos.map((a) => `https://raw.githubusercontent.com/${repo}/${commit.sha}/${a.nome}`) };
}

export const limparMidia = (gh, opcoes) => subirMidia(gh, [], opcoes);

// A API da Meta só aceita JPEG; o PNG continua sendo o arquivo da pasta.
export async function paraJpeg(png) {
  return sharp(png).jpeg({ quality: 92 }).toBuffer();
}
```

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add scripts/instagram.mjs canal.json tests/instagram.test.mjs
git commit -m "instagram.mjs: sobe as imagens em JPEG para o branch midia pela API do GitHub

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: `scripts/instagram.mjs` (parte 3) — `--publicar`

**Files:**
- Modify: `scripts/instagram.mjs`
- Modify: `package.json` (script `instagram`)
- Test: `tests/instagram.test.mjs`

**Interfaces:**
- Consumes: tudo das Tasks 6 e 7; `cards.json`, `legenda.txt`, `card-NN.png` da pasta.
- Produces: `publicarPost(pasta, { tokens, canal, fetchImpl, agora, dormir, log })` → registro gravado em `publicacao.json`: `{ media_id, url, publicado_em, tipo, cards }`; `esperarContainer(ig, id, dormir, tentativas = 20)`.

- [ ] **Step 1: Escrever os testes**

Acrescente a `tests/instagram.test.mjs` (import ganha `publicarPost, esperarContainer`; também `import { writeFileSync } from "node:fs"`):
```js
async function pastaDePost(nCards) {
  const sharp = (await import("sharp")).default;
  const pasta = mkdtempSync(join(tmpdir(), "post-"));
  const tipo = nCards === 1 ? "aviso" : "artigo";
  const cards = nCards === 1 ? [{ tipo: "aviso", titulo: "X" }] : [{ tipo: "capa", titulo: "T", autores: "A" }, ...Array(nCards - 2).fill({ tipo: "ideia", titulo: "I", texto: "t" }), { tipo: "fim", texto: "ref" }];
  writeFileSync(join(pasta, "cards.json"), JSON.stringify({ tipo, cards }));
  writeFileSync(join(pasta, "legenda.txt"), "Gancho.\n\n#PO\n");
  for (let i = 1; i <= nCards; i++) writeFileSync(join(pasta, `card-0${i}.png`), await sharp({ create: { width: 4, height: 5, channels: 3, background: "#000" } }).png().toBuffer());
  return pasta;
}
const tokensOk = { instagram: { access_token: "T", usuario: "po", ig_id: "9", expira_em: "2099-01-01T00:00:00.000Z" }, github_token: "ghp" };
function rotasInstagram({ status = ["FINISHED"] } = {}) {
  let containers = 0, consultas = 0;
  return [
    { metodo: "GET", url: /\/9\/content_publishing_limit/, json: { data: [{ quota_usage: 1 }] } },
    { metodo: "POST", url: /\/9\/media$/, json: () => ({ id: `cont${++containers}` }) },
    { metodo: "GET", url: /\/cont\d+\?/, json: () => ({ status_code: status[Math.min(consultas++, status.length - 1)] }) },
    { metodo: "POST", url: /\/9\/media_publish$/, json: { id: "midia77" } },
    { metodo: "GET", url: /\/midia77\?/, json: { permalink: "https://www.instagram.com/p/abc/" } },
    { metodo: "GET", url: /api\.github\.com\/repos\/dono\/repo$/, json: { private: false } },
  ];
}
const semDormir = async () => {};

test("publicar carrossel: cota → mídia → itens → carrossel → publish → permalink → publicacao.json → limpeza", async () => {
  const pasta = await pastaDePost(3);
  const f = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  const r = await publicarPost(pasta, { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} });
  assert.deepEqual(r, { media_id: "midia77", url: "https://www.instagram.com/p/abc/", publicado_em: new Date(AGORA).toISOString(), tipo: "artigo", cards: 3 });
  assert.deepEqual(JSON.parse(readFileSync(join(pasta, "publicacao.json"), "utf8")), r);
  const posts = f.chamadas.filter((c) => c.metodo === "POST" && /graph\.instagram/.test(c.url)).map((c) => Object.fromEntries(new URLSearchParams(c.corpo)));
  assert.equal(posts.length, 5);                                          // 3 itens + carrossel + publish
  assert.match(posts[0].image_url, /^https:\/\/raw\.githubusercontent\.com\/dono\/repo\/c0ffee\/.*-card-01\.jpg$/);
  assert.equal(posts[0].is_carousel_item, "true");
  assert.deepEqual([posts[3].media_type, posts[3].children, posts[3].caption], ["CAROUSEL", "cont1,cont2,cont3", "Gancho.\n\n#PO"]);
  assert.deepEqual(posts[4], { creation_id: "cont4", access_token: "T" });
  const blobs = f.chamadas.filter((c) => /git\/blobs$/.test(c.url));
  assert.equal(blobs.length, 3);
  assert.equal(Buffer.from(JSON.parse(blobs[0].corpo).content, "base64")[0], 0xff);   // JPEG, não PNG
  const refs = f.chamadas.filter((c) => c.metodo === "PATCH");
  assert.equal(refs.length, 2);                                           // subir + limpar
  assert.ok(f.chamadas.indexOf(refs[1]) > f.chamadas.findIndex((c) => /midia77\?/.test(c.url)));
});

test("publicar card único não cria carrossel", async () => {
  const pasta = await pastaDePost(1);
  const f = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  const r = await publicarPost(pasta, { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} });
  assert.equal(r.cards, 1);
  const posts = f.chamadas.filter((c) => c.metodo === "POST" && /graph\.instagram/.test(c.url)).map((c) => Object.fromEntries(new URLSearchParams(c.corpo)));
  assert.equal(posts.length, 2);
  assert.equal(posts[0].caption, "Gancho.\n\n#PO");
  assert.equal(posts[0].is_carousel_item, undefined);
});

test("falha da Meta interrompe, reporta o passo e ainda esvazia o branch", async () => {
  const pasta = await pastaDePost(1);
  const f = fetchFalso([...rotasInstagram({ status: ["IN_PROGRESS", "ERROR"] }), ...rotasGithub()]);
  await assert.rejects(publicarPost(pasta, { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} }), /rejeitou a mídia \(ERROR\)/);
  assert.ok(!existsSync(join(pasta, "publicacao.json")));
  assert.equal(f.chamadas.filter((c) => c.metodo === "PATCH").length, 2);
});

test("pré-checagens: cards faltando, já publicado, sem token do GitHub, repositório privado, cota cheia", async () => {
  const opc = (extra) => ({ tokens: tokensOk, canal, fetchImpl: fetchFalso([...rotasInstagram(), ...rotasGithub()]), agora: AGORA, dormir: semDormir, log: () => {}, ...extra });
  const pasta = await pastaDePost(2);
  writeFileSync(join(pasta, "cards.json"), JSON.stringify({ tipo: "artigo", cards: [{ tipo: "capa" }, { tipo: "ideia" }, { tipo: "fim" }] }));
  await assert.rejects(publicarPost(pasta, opc()), /falta card-03\.png/);
  const pronta = await pastaDePost(1);
  writeFileSync(join(pronta, "publicacao.json"), "{}");
  await assert.rejects(publicarPost(pronta, opc()), /já foi publicado/);
  await assert.rejects(publicarPost(await pastaDePost(1), opc({ tokens: { instagram: tokensOk.instagram } })), /token do GitHub/);
  const privado = fetchFalso([...rotasInstagram().slice(0, 5), { metodo: "GET", url: /repos\/dono\/repo$/, json: { private: true } }, ...rotasGithub()]);
  await assert.rejects(publicarPost(await pastaDePost(1), opc({ fetchImpl: privado })), /público/);
  const cheia = fetchFalso([{ metodo: "GET", url: /content_publishing_limit/, json: { data: [{ quota_usage: 100 }] } }]);
  await assert.rejects(publicarPost(await pastaDePost(1), opc({ fetchImpl: cheia })), /100/);
});

test("esperarContainer desiste depois das tentativas", async () => {
  const f = fetchFalso([{ metodo: "GET", url: /\/c1\?/, json: { status_code: "IN_PROGRESS" } }]);
  const ig = (await import("../scripts/instagram.mjs")).criarApiInstagram("T", f);
  await assert.rejects(esperarContainer(ig, "c1", semDormir, 3), /não terminou/);
  assert.equal(f.chamadas.length, 3);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/instagram.test.mjs`
Expected: falhas `publicarPost is not a function`.

- [ ] **Step 3: Acrescentar a parte 3 a `scripts/instagram.mjs`**

Antes de `// ---------- CLI ----------`:
```js
// ---------- publicação ----------
export async function esperarContainer(ig, id, dormir, tentativas = 20) {
  for (let i = 0; i < tentativas; i++) {
    const { status_code, status } = await ig.get(id, "status_code,status");
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new ErroInstagram(`a Meta rejeitou a mídia (${status_code})${status ? `: ${status}` : ""}`);
    await dormir(3000);
  }
  throw new ErroInstagram("a Meta não terminou de processar a mídia em 60 s — tente de novo em alguns minutos");
}

const nn = (i) => String(i + 1).padStart(2, "0");

export async function publicarPost(pasta, { tokens, canal = lerCanal(), fetchImpl = fetch, agora = Date.now(), dormir = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  // 1. pré-checagem local
  const cards = JSON.parse(readFileSync(join(pasta, "cards.json"), "utf8"));
  const legenda = readFileSync(join(pasta, "legenda.txt"), "utf8").trim();
  const pngs = cards.cards.map((_, i) => join(pasta, `card-${nn(i)}.png`));
  for (const p of pngs) if (!existsSync(p)) throw new ErroInstagram(`falta ${basename(p)} — rode: node design-system/scripts/gerar-cards.mjs ${pasta}`);
  if (existsSync(join(pasta, "publicacao.json"))) throw new ErroInstagram("este post já foi publicado (publicacao.json existe) — apague o arquivo se quiser publicar de novo");
  if (!tokens.instagram) throw new ErroInstagram(`sem token do Instagram — rode: node scripts/instagram.mjs --token "<token>"`);
  if (!tokens.github_token) throw new ErroInstagram(`sem token do GitHub — rode: node scripts/instagram.mjs --token-github "<token>"`);

  // 2. cota e repositório
  const ig = criarApiInstagram(tokens.instagram.access_token, fetchImpl);
  const igId = tokens.instagram.ig_id;
  const cota = await ig.get(`${igId}/content_publishing_limit`, "quota_usage");
  const uso = cota.data?.[0]?.quota_usage ?? 0;
  if (uso >= COTA) throw new ErroInstagram(`a conta já fez ${COTA} publicações pela API nas últimas 24 h — espere`);
  const gh = criarApiGithub(tokens.github_token, canal.github, fetchImpl);
  const repo = await gh.pedir("GET", "");
  if (repo.private) throw new ErroInstagram(`o repositório ${canal.github} precisa ser público para a Meta baixar as imagens`);

  // 3. mídia pública
  const carimbo = new Date(agora).toISOString().replace(/\D/g, "").slice(0, 14);
  const arquivos = [];
  for (const [i, p] of pngs.entries()) arquivos.push({ nome: `${basename(pasta)}-${carimbo}-card-${nn(i)}.jpg`, conteudo: await paraJpeg(p) });
  log(`subindo ${arquivos.length} imagem(ns) para o branch midia de ${canal.github}…`);
  const midia = await subirMidia(gh, arquivos, { repo: canal.github });

  try {
    // 4. contêineres e publicação
    let criacaoId;
    if (arquivos.length === 1) {
      log("criando o post…");
      criacaoId = (await ig.post(`${igId}/media`, { image_url: midia.urls[0], caption: legenda })).id;
    } else {
      const filhos = [];
      for (const [i, url] of midia.urls.entries()) {
        log(`enviando card ${nn(i)}…`);
        filhos.push((await ig.post(`${igId}/media`, { image_url: url, is_carousel_item: "true" })).id);
      }
      for (const id of filhos) await esperarContainer(ig, id, dormir);
      log("montando o carrossel…");
      criacaoId = (await ig.post(`${igId}/media`, { media_type: "CAROUSEL", children: filhos.join(","), caption: legenda })).id;
    }
    await esperarContainer(ig, criacaoId, dormir);
    log("publicando…");
    const publicado = await ig.post(`${igId}/media_publish`, { creation_id: criacaoId });
    const { permalink } = await ig.get(publicado.id, "permalink");
    const registro = { media_id: publicado.id, url: permalink, publicado_em: new Date(agora).toISOString(), tipo: cards.tipo, cards: arquivos.length };
    writeFileSync(join(pasta, "publicacao.json"), JSON.stringify(registro, null, 2) + "\n");
    return registro;
  } finally {
    // 5. esvazia o branch mesmo quando a Meta falhou
    log("esvaziando o branch midia…");
    await limparMidia(gh, { repo: canal.github });
  }
}
```

No bloco CLI, substitua o ramo `--publicar`:
```js
    } else if (opcao === "--publicar" && valor) {
      const tokens = await renovarSeNecessario(lerTokens());
      const r = await publicarPost(resolve(valor), { tokens });
      console.log(`publicado: ${r.url}`);
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 5: Script npm e commit**

Em `package.json`, acrescente a `"scripts"`: `"instagram": "node scripts/instagram.mjs",`

```bash
git add scripts/instagram.mjs package.json tests/instagram.test.mjs
git commit -m "instagram.mjs --publicar: carrossel ou card único pela API oficial, com publicacao.json e limpeza do branch

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Vocabulário, ADRs, modelo de `post.md` e guia do agente

**Files:**
- Modify: `CONTEXT.md`
- Create: `docs/adr/0005-midia-do-instagram-no-branch-midia.md`, `docs/adr/0006-tokens-do-instagram-em-arquivo.md`
- Create: `instagram/_modelo/post.md`
- Create: `design-system/instagram/GUIA-AGENTE.md`

- [ ] **Step 1: Termos novos em `CONTEXT.md`**

Acrescente ao final de `CONTEXT.md`, depois de **Canal**:
```markdown

**Post**:
Uma publicação no Instagram, representada pela pasta `instagram/<AAAA-MM-DD>-<slug>/` (a data é a de publicação prevista: a pasta é um calendário). Tipos do primeiro corte: `artigo` (carrossel) e `aviso` (card único).
_Avoid_: publicação (é o registro do upload), postagem

**Card**:
Uma imagem 1080×1350 de um post (`card-NN.png`), gerada de `cards.json` por `gerar-cards.mjs`. Tipos: `capa`, `ideia`, `fim`, `aviso`.
_Avoid_: slide, arte, imagem

**Legenda**:
`legenda.json` (gancho ≤ 125 caracteres, corpo, autores, hashtags do tema) e `legenda.txt` (montado por `scripts/legenda.mjs` com CTA e rodapé de `canal.json`).
_Avoid_: descrição (é a do YouTube), caption

**Story**:
`videos/<slug>/story.png`, 1080×1920, gerado pela skill `publicar` ao final do vídeo; a pessoa posta à mão com o sticker de link quando o vídeo fica público. Um vídeo novo gera só um story, nunca post de feed.
_Avoid_: stories, destaque

**Mídia temporária**:
Branch `midia` do repositório no GitHub: recebe os cards em JPEG num commit órfão só enquanto a Meta os baixa e volta a ficar vazio ao final de cada publicação.
_Avoid_: CDN, hospedagem
```

- [ ] **Step 2: ADR 0005**

`docs/adr/0005-midia-do-instagram-no-branch-midia.md`:
```markdown
# As imagens do Instagram passam pelo branch `midia`, em JPEG, pela API do GitHub

A API de publicação da Meta só baixa mídia de uma URL pública e só aceita JPEG. Custo zero descarta qualquer hospedagem; o repositório já é público. `scripts/instagram.mjs` converte cada `card-NN.png` para JPEG na hora de publicar, cria um commit órfão com os arquivos pela Git Data API do GitHub (token pessoal, sem `git` local — funciona para quem baixou o ZIP), aponta `refs/heads/midia` para ele com força, usa a URL `raw.githubusercontent.com/<repo>/<sha>/<arquivo>` (imutável, sem cache velho) e, ao final — mesmo se a Meta falhar —, aponta o branch para um commit só com `README.md`. O branch nunca acumula histórico. O `card-NN.png` continua sendo o arquivo da pasta: é o que a pessoa confere e o que serve para publicar à mão.
```

- [ ] **Step 3: ADR 0006**

`docs/adr/0006-tokens-do-instagram-em-arquivo.md`:
```markdown
# Tokens do Instagram e do GitHub ficam em `~/.po-para-todos/instagram.json`

A spec previa variável de ambiente `INSTAGRAM_ACCESS_TOKEN`. Ficou arquivo, gravado por `node scripts/instagram.mjs --token …` e `--token-github …`: (1) o esquema real do YouTube também é um arquivo em pasta oculta (`~/.youtube-mcp/`), não variável; (2) a renovação automática do token de 60 dias precisa reescrever o token em algum lugar, e um arquivo do próprio script é o único lugar que ele controla; (3) variável de ambiente é difícil para quem não programa, sobretudo no Windows. O script renova quando faltam menos de 30 dias e avisa quando a renovação falha. O arquivo fica fora do repositório e com permissão só do dono.
```

- [ ] **Step 4: Modelo de `post.md`**

`instagram/_modelo/post.md`:
```markdown
---
tipo: artigo
---

<!-- Copie esta pasta para instagram/AAAA-MM-DD-slug/ (data prevista do post, ex.: instagram/2026-10-03-kruskal-1956/).
     Preencha só a parte do seu tipo (artigo OU aviso) e apague a outra. O que ficar em branco, o Claude pergunta. -->

<!-- ===== tipo: artigo (carrossel: capa, uma ideia por card, referência) ===== -->

## Título
[título original do artigo, sem traduzir]

## Autores
- [Nome Sobrenome @usuario-no-instagram-se-tiver]
- [Nome Sobrenome]

## Onde
[evento ou revista, ano — ex.: SBPO 2026]

## Link
[DOI ou URL do artigo]

## Resumo
[cole o resumo do artigo, ou escreva com suas palavras as ideias que o post deve destacar]

<!-- ===== tipo: aviso (card único: edital, evento, prazo, vaga, reconhecimento) ===== -->

## Nome
[o que está sendo avisado — ex.: Chamada de trabalhos do SBPO 2027]

## Data-limite
[dd/mm/aaaa, ou "não tem" para reconhecimento]

## Link
[onde a pessoa se inscreve ou lê mais]

## Detalhes
[uma ou duas frases: para quem é, o que precisa enviar]
```

- [ ] **Step 5: Guia do agente**

`design-system/instagram/GUIA-AGENTE.md`:
```markdown
# Guia do agente — do `post.md` aos cards e à legenda

Para quem recebe um `instagram/<data>-<slug>/post.md` e precisa entregar `cards.json`, `legenda.json` e os PNGs. Marca, grade e tipografia já estão decididas em `../fundamentos-instagram.md`, `instagram.css` e `formatos.json` — **não reinvente**.

## Os cinco passos

1. **Leia `post.md`** (frontmatter `tipo`, seções `## …`). Se faltar título, autores ou link no `artigo`, ou nome no `aviso`, pergunte antes de escrever.
2. **Escreva `cards.json`** (formato abaixo). `artigo`: `capa` + 1 a 8 `ideia` + `fim`, no máximo 10 cards; uma ideia por card, tirada do resumo, na ordem em que o artigo apresenta. `aviso`: um card `aviso`.
3. **Escreva `legenda.json`**: `gancho` (uma frase, ≤ 125 caracteres, o que aparece antes do "mais" — pergunta ou fato surpreendente), `corpo` (2 a 4 parágrafos curtos, sem repetir os cards palavra por palavra), `autores` (artigo: por extenso, `@` de quem tiver — ex.: `"Maria Silva (@mariasilva), João Souza"`; aviso: `null`), `hashtags_tema` (3 a 4, `#CamelCase` sem acento, pelo mesmo critério das tags do YouTube: nome do tema, área, apelidos de `../miniaturas/catalogo.json`).
4. **Gere e valide**: `node design-system/scripts/gerar-cards.mjs instagram/<pasta>` e `node scripts/legenda.mjs instagram/<pasta>`. Os dois recusam o que não cabe (`erro: …`); corrija o JSON, nunca o CSS.
5. **Olhe cada PNG** (`open instagram/<pasta>/card-0*.png`): texto inteiro, nada encostando no rodapé, contador certo. Reduza mentalmente a 400 px: o título lê? Só então mostre à pessoa.

## `cards.json`

```json
{ "tipo": "artigo",
  "cards": [
    { "tipo": "capa",  "titulo": "TÍTULO ORIGINAL", "autores": "Nome, Nome", "onde": "SBPO 2026" },
    { "tipo": "ideia", "titulo": "Ideia em 40 caracteres", "texto": "Até 280 caracteres. Pode ter\numa quebra de linha." },
    { "tipo": "fim",   "texto": "SOBRENOME, N. Título. Evento/Revista, ano.", "link": "doi.org/…" }
  ] }
```
Aviso: `{ "tipo": "aviso", "cards": [ { "tipo": "aviso", "kicker": "PRAZO", "titulo": "Chamada de trabalhos SBPO", "data": "ATÉ 15/03", "texto": "…", "link": "sbpo.org.br" } ] }`. `kicker` opcional (padrões: RESUMO DE ARTIGO, REFERÊNCIA, AVISO); use PRAZO, EVENTO, VAGA, EDITAL, RECONHECIMENTO conforme o caso. Limites por campo em `formatos.json`.

## Regras de copy

- Capa: título original em caixa alta (o gerador não converte — escreva como deve aparecer), sem traduzir. Autores por extenso, separados por vírgula, sem `@` (o `@` vai na legenda).
- Ideia: título curto nominal ("O problema", "O algoritmo", "Por que funciona"); texto que se sustenta sozinho, sem "como vimos no card anterior".
- Fim: referência no padrão ABNT curto; link sem `https://`.
- Aviso: data sempre com "ATÉ"; sem data para reconhecimento (`data` omitido).
- Nunca: emoji nos cards, ponto de exclamação, "arraste", "link na bio" dentro do card, frase de marketing.

## Comandos

```bash
node design-system/scripts/gerar-cards.mjs instagram/<pasta>            # card-NN.png
node design-system/scripts/gerar-cards.mjs instagram/<pasta> --so-html  # só HTML, para inspecionar
node scripts/legenda.mjs instagram/<pasta>                              # legenda.txt
node scripts/instagram.mjs --status                                     # conta, token, cota
node scripts/instagram.mjs --publicar instagram/<pasta>                 # publica (skill post decide quando)
node design-system/scripts/gerar-story.mjs videos/<slug>                # story.png de vídeo novo
```

## Nunca

- Mexer em `instagram.css` ou nos layouts para um post caber — corte o texto.
- Publicar sem a pessoa ter olhado os PNGs e a legenda.
- Gerar story pela API (não põe o sticker de link): o story é sempre manual.
```

- [ ] **Step 6: Commit**

```bash
git add CONTEXT.md docs/adr/0005-midia-do-instagram-no-branch-midia.md docs/adr/0006-tokens-do-instagram-em-arquivo.md instagram/_modelo/post.md design-system/instagram/GUIA-AGENTE.md
git commit -m "Instagram: vocabulário, ADRs 0005 e 0006, modelo de post.md e guia do agente

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Skill `post` e passo do story na skill `publicar`

**Files:**
- Create: `.claude/skills/post/SKILL.md`
- Modify: `.claude/skills/publicar/SKILL.md`

- [ ] **Step 1: Escrever a skill `post`**

`.claude/skills/post/SKILL.md`:
```markdown
---
name: post
description: Faz um post do Instagram do PO para Todos — artigo (carrossel) ou aviso (card único) — do post.md aos cards, legenda e publicação pela API oficial, parando para a pessoa aprovar. Use quando a pessoa disser "quero um post sobre X", "post do artigo Y" ou "aviso do evento Z".
---

# Post no Instagram

Diga antes: "Vou montar os cards e a legenda para você olhar; só publico depois do seu sim. Vídeo novo não entra aqui — isso é o story, que sai na skill `publicar`."

## 1. Pasta

- Defina a pasta `instagram/<AAAA-MM-DD>-<slug>/` (data prevista do post; slug do tema em minúsculas com hífens). Se já existir, veja o que tem: `publicacao.json` → já publicado, pare e diga o link; `cards.json` e `legenda.json` → pule para o passo 3.
- Se não há `post.md`, crie a partir de `instagram/_modelo/post.md` com o que a pessoa disse e pergunte, em uma rodada só, o que faltar (artigo: título, autores, onde, link, resumo; aviso: nome, data-limite, link).

## 2. Cards e legenda

Siga `design-system/instagram/GUIA-AGENTE.md` do início ao fim: escreva `cards.json` e `legenda.json`, gere com `node design-system/scripts/gerar-cards.mjs instagram/<pasta>` e `node scripts/legenda.mjs instagram/<pasta>`, olhe cada PNG.

## 3. **PARADA**: aprovação

Abra os PNGs (`open instagram/<pasta>/card-0*.png` no Mac, `start …` no Windows) e mostre a legenda inteira. Pergunte: "Aprova os cards e a legenda? Quer trocar alguma palavra?" **Não avance sem um sim explícito.** Ajustes: edite os JSON, gere de novo, mostre de novo.

## 4. Publicar

1. `node scripts/instagram.mjs --status`. Se sair `erro: sem token…`, siga o README (seção "Publicar no Instagram") com a pessoa e pare até ela colar o token. Se a cota estiver em 100, pare e diga quando libera.
2. `node scripts/instagram.mjs --publicar instagram/<pasta>`. Reporte cada linha que o script imprime. Se sair `erro: …`, mostre exatamente e não tente de novo por conta própria — o script já esvaziou o branch `midia`.
3. Entregue: "Post no ar: <url de publicacao.json>. Confira no app se o carrossel abriu na ordem certa."

## Fallback manual

Se a API falhou e a pessoa quer publicar mesmo assim: "Os arquivos estão prontos em `instagram/<pasta>/`: publique pelo app do Instagram (ou pelo Meta Business Suite) escolhendo `card-01.png` … na ordem, e cole o texto de `legenda.txt` na legenda." Depois, crie `publicacao.json` à mão com `{ "media_id": null, "url": "<link que a pessoa passar>", "publicado_em": "<ISO agora>", "tipo": "<tipo>", "cards": <n>, "manual": true }`.
```

- [ ] **Step 2: Passo do story na skill `publicar`**

Em `.claude/skills/publicar/SKILL.md`, substitua a seção `## 3. Registre` inteira por:
```markdown
## 3. Registre

Escreva `videos/<slug>/publicacao.json`:
```json
{ "video_id": "…", "url": "https://youtu.be/…", "publicado_em": "<ISO agora>", "privacidade": "private", "playlist_id": "…" }
```

## 4. Story para o Instagram

Run: `node design-system/scripts/gerar-story.mjs videos/<slug>`

Abra `videos/<slug>/story.png` e confira que headline, subhead e ícone são os mesmos da miniatura. Se a busca pelo título escolheu outro tópico, rode de novo com `--topico <id>` (o mesmo usado na miniatura). O story **não** vai pela API: o link é o motivo do story e a API não coloca sticker.

Entregue: "Vídeo no ar como privado: https://youtu.be/… . Para publicar: YouTube Studio → Conteúdo → o vídeo → Visibilidade → Público. Confira a miniatura e a descrição lá antes. Quando tornar o vídeo público, poste `videos/<slug>/story.png` no Instagram como story, com o sticker de link apontando para https://youtu.be/… — coloque o sticker no espaço vazio acima da faixa verde."
```
(a linha `Entregue:` antiga, ao final da seção 3, é removida — a nova fica no fim da seção 4.)

- [ ] **Step 3: Conferir que a skill `video` continua coerente**

Leia `.claude/skills/video/SKILL.md`, Etapa 4: "Invoque a skill `publicar`. Ela confirma os capítulos reais, sobe como privado e devolve o link." Acrescente ao fim dessa frase: " e gera o `story.png` para o Instagram."

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/post/SKILL.md .claude/skills/publicar/SKILL.md .claude/skills/video/SKILL.md
git commit -m "Skill post (Instagram) e story de vídeo novo ao final da skill publicar

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: README para o participante, `CLAUDE.md` e verificação final

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Seção do Instagram no README**

Em `README.md`, insira a seção abaixo **antes** de `## Quando algo dá errado`:
```markdown
## Publicar no Instagram

O mesmo projeto publica no Instagram `@pesquisaoperacionalparatodos`: você escreve os fatos num arquivo, o Claude monta os cards (as imagens do carrossel) e a legenda, você aprova, e o post entra pela API oficial da Meta. Não custa nada: só a conta do Instagram, uma conta no site de desenvolvedores da Meta e uma no GitHub.

### Conectar ao Instagram (uma vez a cada 60 dias)

A Meta dá um "token" (uma senha longa e temporária) que permite ao script publicar na conta do projeto. Ele vale 60 dias; o script renova sozinho enquanto estiver sendo usado e avisa se a renovação falhar. Se ficar dois meses sem publicar, repita os passos 4 e 5.

1. Entre em https://developers.facebook.com com a conta de quem coordena o projeto (o mesmo login do Facebook/Instagram). Se aparecer um pedido para "se registrar como desenvolvedor", aceite — é só confirmar o e-mail.
2. Clique em **Meus apps → Criar app**. Escolha o caso de uso **"Outro"**, depois o tipo **"Empresa"** (Business); nome do app: `PO para Todos`. Não precisa de Página do Facebook nem de portfólio comercial.
3. No painel do app, no menu da esquerda, procure **Instagram** (ou "Adicionar produto → Instagram") e escolha **"API do Instagram com login do Instagram"** (API setup with Instagram login). Em **"Gerar tokens de acesso"**, clique em **Adicionar conta** e faça login na conta `@pesquisaoperacionalparatodos`. A conta já é profissional (categoria Educação) — se a tela pedir para converter, é porque você entrou com outra conta.
4. Na mesma tela, ao lado da conta adicionada, clique em **Gerar token**. Marque as permissões `instagram_business_basic` e `instagram_business_content_publish`, confirme, e copie o token (um texto longo começando com `IG`). Guarde-o como uma senha — não cole em conversas nem em arquivos do projeto.
5. No Terminal, na pasta do projeto, cole (com o token entre as aspas):
   ```bash
   node scripts/instagram.mjs --token "COLE-O-TOKEN-AQUI"
   ```
   O que esperar: `token guardado em /Users/você/.po-para-todos/instagram.json: conta @pesquisaoperacionalparatodos, vale até 2026-11-19`. Se sair `erro: o token é da conta @outra`, gere o token de novo logado na conta do projeto.

O passo a passo oficial, com telas, está em https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/ (em inglês; a interface do painel está em português).

### Conectar ao GitHub (uma vez)

A Meta só consegue baixar as imagens de um endereço público na internet. O script usa o próprio repositório para isso (um "branch" separado chamado `midia`, que fica vazio entre um post e outro), e para escrever nele precisa de um token seu do GitHub.

1. Entre em https://github.com/settings/personal-access-tokens e clique em **Generate new token** (tipo *fine-grained*).
2. Nome: `PO para Todos - Instagram`; validade: 1 ano; em **Repository access** escolha **Only select repositories** e marque `po-para-todos-publisher`; em **Permissions → Repository permissions** dê **Contents: Read and write**. Nada mais. Gere e copie o token (começa com `github_pat_`).
3. No Terminal, na pasta do projeto:
   ```bash
   node scripts/instagram.mjs --token-github "COLE-O-TOKEN-AQUI"
   ```
   O que esperar: `token do GitHub guardado em …/instagram.json`.

Confira tudo com `node scripts/instagram.mjs --status` — mostra a conta, quantos dias o token ainda vale e quantos posts já foram feitos nas últimas 24 h (o limite da Meta é 100).

### Fazer um post

1. Copie `instagram/_modelo/post.md` para uma pasta nova `instagram/<data>-<assunto>/` (a data em que você pretende publicar, ex.: `instagram/2026-10-03-kruskal-1956/`) e preencha: para um **artigo**, título, autores, onde saiu, link e o resumo; para um **aviso** (edital, evento, prazo, vaga), nome, data-limite e link.
2. Abra o `claude` na pasta do projeto e peça: `/post instagram/2026-10-03-kruskal-1956`.
3. O Claude monta os cards e a legenda e abre as imagens para você conferir. Diga "sim" para publicar, ou peça ajustes.
4. O post entra na hora (a pipeline não agenda; quem quiser data marcada usa o Meta Business Suite depois). O link fica em `instagram/<pasta>/publicacao.json`.

**Vídeo novo no YouTube** não vira post de feed: ao final da publicação de um vídeo, o Claude gera `videos/<slug>/story.png`. Quando você tornar o vídeo público, poste essa imagem como *story* pelo app, com o sticker de link apontando para o vídeo (a API não coloca sticker, e o link é o motivo do story).

**Se a API não funcionar** (token vencido, sem ninguém para ajudar): os mesmos arquivos servem para publicar à mão — no app do Instagram ou no Meta Business Suite, escolha `card-01.png`, `card-02.png`… na ordem e cole o texto de `legenda.txt`.

Um exemplo completo está em `instagram/2026-09-20-kruskal-1956/`.

| Arquivo | O que é |
|---|---|
| `post.md` | O que você escreve: tipo e os fatos (título, autores, link, resumo; ou nome, data, link). |
| `cards.json` | O texto de cada card, escrito pelo Claude a partir do `post.md`. |
| `card-01.png`… | Os cards prontos (1080×1350), gerados de `cards.json`. |
| `legenda.json` / `legenda.txt` | A legenda: o que o Claude escreveu e o texto final montado com o rodapé do projeto e as hashtags. |
| `publicacao.json` | O registro da publicação: link e data. |
```

E na seção **Quando algo dá errado**, acrescente ao final da lista:
```markdown
- **"erro: sem token do Instagram"** ou **"o token do Instagram venceu"** — refaça os passos 4 e 5 de "Conectar ao Instagram".
- **"aviso: não consegui renovar o token"** — o post saiu, mas o token vai vencer na data que o `--status` mostra; gere outro antes disso.
- **"GitHub: Bad credentials"** — o token do GitHub venceu ou foi colado errado; gere outro em "Conectar ao GitHub".
- **"a Meta rejeitou a mídia"** — em geral é a imagem grande demais ou a URL inacessível; rode `node design-system/scripts/gerar-cards.mjs instagram/<pasta>` de novo e tente outra vez. Se persistir, publique à mão (acima).
- **"a conta já fez 100 publicações"** — limite diário da API; espere 24 h ou publique à mão.
```

Na lista **O que você vai instalar**, o item 5 (Chrome/Edge) ganha ao final: "Ele também desenha os cards do Instagram."

- [ ] **Step 2: `CLAUDE.md`**

Substitua o primeiro parágrafo e a seção `## Fluxo de um vídeo` do `CLAUDE.md` para incluir o Instagram:
```markdown
# PO para Todos — publisher

Pipeline de produção do canal Pesquisa Operacional para Todos (UNIRIO): vídeos, do tema ao link no YouTube, e posts do Instagram, do `post.md` ao link. Quem usa este repositório pode não saber programar — escreva para essa pessoa: passos numerados, comando exato, o que esperar na tela.

## Fluxo de um vídeo
`/video` encadeia as skills em `.claude/skills/`: `roteiro` → `titulo-descricao` → `slides` → `miniatura` → `publicar`, com paradas para aprovar o roteiro e gravar. Cada skill também funciona sozinha. Vocabulário em `CONTEXT.md`; exemplo completo em `videos/folgas-complementares/`.

Scripts (Node ≥ 22, `npm install` uma vez):
- `node scripts/roteiro.mjs videos/<slug>/roteiro.md` — valida o roteiro.
- `node design-system/scripts/gerar-slides.mjs videos/<slug>` — `slides.json` → `slides.pptx`.
- `node scripts/descricao.mjs videos/<slug>` — monta a descrição em `metadados.json`.
- `node design-system/scripts/gerar-miniatura.mjs …` — ver `design-system/miniaturas/GUIA-AGENTE.md`.
- `node design-system/scripts/gerar-story.mjs videos/<slug>` — `story.png` de vídeo novo (a skill `publicar` chama).
- `npm test` — testes; as pastas `videos/folgas-complementares/` e `instagram/2026-09-20-kruskal-1956/` são fixtures: não as altere sem atualizar os testes.

Upload é sempre privado (`docs/adr/0003`). `canal.json` guarda links, playlists, rodapés e o repositório.

## Fluxo de um post do Instagram
`/post instagram/<data>-<slug>` (skill `post`): `post.md` → `cards.json` + `legenda.json` → `gerar-cards.mjs` e `scripts/legenda.mjs` → parada para aprovar → `node scripts/instagram.mjs --publicar`. Guia em `design-system/instagram/GUIA-AGENTE.md`; tokens em `~/.po-para-todos/instagram.json` (`docs/adr/0006`); imagens passam pelo branch `midia` (`docs/adr/0005`). Story de vídeo novo é sempre manual (a API não põe sticker de link).
```
O restante do arquivo (design system, miniaturas, desenvolvimento) fica igual.

- [ ] **Step 3: Verificação final**

Run, nesta ordem:
```bash
npm test
node design-system/scripts/gerar-galeria.mjs
node design-system/scripts/gerar-cards.mjs instagram/2026-09-20-kruskal-1956
node scripts/legenda.mjs instagram/2026-09-20-kruskal-1956 > /dev/null
node design-system/scripts/gerar-story.mjs videos/folgas-complementares
node scripts/instagram.mjs; echo "código: $?"
git status --short
```
Expected: `# fail 0` com todos os arquivos de teste passando; galeria sem falhas; 5 cards e o story regenerados; `uso:` impresso e `código: 1`; `git status` mostra só `README.md` e `CLAUDE.md` modificados (os PNGs regenerados do exemplo podem aparecer se a renderização variar por versão do Chrome — nesse caso, confira visualmente e inclua no commit).

- [ ] **Step 4: Teste real de ponta a ponta (com a pessoa)**

Só quando a pessoa tiver os dois tokens guardados (README acima). Publique o exemplo real pela CLI e apague o post depois se ela não quiser mantê-lo:
```bash
node scripts/instagram.mjs --status
node scripts/instagram.mjs --publicar instagram/2026-09-20-kruskal-1956
```
Expected: linhas `subindo 5 imagem(ns)…`, `enviando card 01…` … `montando o carrossel…`, `publicando…`, `esvaziando o branch midia…`, `publicado: https://www.instagram.com/p/…`. No GitHub, o branch `midia` tem só `README.md`. Se a publicação falhar em `a Meta rejeitou a mídia`, abra uma das URLs `raw.githubusercontent.com/…` impressas antes da limpeza (rode com `--publicar` de novo e copie a URL do log) no navegador para confirmar que serve a imagem. **Não** versione o `publicacao.json` resultante se o post de teste for apagado.

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "README: publicar no Instagram (tokens, post, fallback manual); CLAUDE.md com o fluxo do post

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Auto-revisão do plano

**Cobertura da spec (MVP):**
- Papel do Instagram / vídeo novo = só story → Task 5 (`gerar-story.mjs`), Task 10 (passo 4 de `publicar`), README.
- Conta e credenciais: API com Instagram Login, token de 60 dias, renovação < 30 dias com aviso, README passo a passo → Task 6, Task 11. Desvio registrado: arquivo em vez de variável de ambiente (D3, ADR 0006); sem prints (D6).
- Mecanismo: script Node, API oficial, sem MCP/biblioteca não oficial, URL pública via branch `midia`, publica na hora, fallback manual, falha interrompe e reporta → Tasks 7, 8, 10, 11; ADR 0005. Desvio registrado: JPEG e Git Data API com token (D1, D2).
- Tipos `artigo`, `aviso` (reconhecimento = aviso sem data), `video-novo` → Tasks 2, 3, 5.
- Pasta do post (`post.md`, `card-NN.png`, `legenda.txt`, `publicacao.json`) e `instagram/_modelo/post.md` → Tasks 3, 4, 8, 9. Intermediários `cards.json`/`legenda.json` (D4).
- Design: design system, 4:5 e 9:16, HTML → Chrome → PNG, `design-system/instagram/` com `formatos.json`, layouts, `GUIA-AGENTE.md`, `fundamentos-instagram.md`, `@` no rodapé → Tasks 1, 2, 9.
- Legenda: gancho ≤ 125, rodapé + link na bio, hashtags fixas + 3–4, autores com `@`, CTA por tipo → Task 4.
- Fora de escopo mantido fora: agendamento, stickers, métricas, reels, voz, música.
- Fase 2 (`curiosidade`, `comemorativa`, reels/Hyperframes) não está neste plano, por decisão da spec.

**Placeholders:** nenhum "TBD"/"implementar depois"; todo passo de código traz o código. O único item que o executor não produz são os prints do painel da Meta (D6), declarado como limitação, não como pendência.

**Consistência de nomes:** `preencher`/`exportarPng`/`esc` (Task 1) usados nas Tasks 3 e 5; `formatos.formatos.feed|story`, `formatos.cards`, `formatos.tipos` (Task 2) usados nas Tasks 3 e 5; `canal.instagramUsuario` (Task 3), `canal.instagramLegenda` (Task 4), `canal.github` (Task 7) lidos por `gerar-cards`, `legenda`, `gerar-story`, `instagram`; `criarApiInstagram.get/post`, `subirMidia`, `limparMidia`, `paraJpeg`, `esperarContainer`, `publicarPost`, `ErroInstagram` coerentes entre Tasks 6–8 e seus testes; `fetchFalso`/`rotasGithub`/`rotasInstagram` definidos no próprio arquivo de teste antes de serem usados; `publicacao.json` do post tem `media_id, url, publicado_em, tipo, cards` nas Tasks 8 e 10.
