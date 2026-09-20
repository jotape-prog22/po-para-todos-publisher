#!/usr/bin/env node
// Gera miniaturas/galeria/ (um HTML por tópico do catálogo, no formato padrão,
// mais o tópico "simplex" em todos os formatos) e miniaturas/galeria.html, que
// mostra tudo em escala 25%. Serve de revisão visual e de teste de regressão:
// qualquer tópico cujo texto não cabe mais na grade derruba o script.
//
//   node design-system/scripts/gerar-galeria.mjs          # só HTML
//   node design-system/scripts/gerar-galeria.mjs --png    # também exporta PNG (lento, ~1s cada)

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogo, formatos, gerar } from "./gerar-miniatura.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const PASTA = join(DS, "miniaturas/galeria");
const png = process.argv.includes("--png");

rmSync(PASTA, { recursive: true, force: true });
mkdirSync(PASTA, { recursive: true });

const secoes = [];
const falhas = [];
function item(spec, secao) {
  try {
    const r = gerar({ ...spec, soHtml: !png, escala: 1, saida: join(PASTA, `${spec.nome}.png`) });
    secao.itens.push(r);
    for (const a of r.avisos) if (!a.startsWith("busca")) console.error(`${spec.nome}: ${a}`);
  } catch (e) {
    falhas.push(`${spec.nome}: ${e.message}`);
  }
}

// 1) um exemplo por formato, sobre o mesmo tópico
const fmt = { titulo: "Os oito formatos (tópico: Simplex)", itens: [] };
for (const id of Object.keys(formatos)) {
  const extra = id === "comparativo" ? { subhead: "OU GRÁFICO?", icone2: "regiao-viavel" } : id === "serie" ? { numero: 3 } : {};
  item({ topico: "simplex", formato: id, nome: `formato-${id}`, ...extra }, fmt);
}
secoes.push(fmt);

// 2) um exemplo por tópico, no formato padrão
for (const a of catalogo.areas) {
  const s = { titulo: `${a.nome} (${a.id})`, itens: [] };
  for (const t of a.topicos) item({ topico: t.id, nome: t.id, numero: t.formato === "serie" ? 1 : undefined }, s);
  secoes.push(s);
}

// 3) galeria.html
const card = (r) => `
    <figure class="card">
      <div class="moldura"><iframe src="galeria/${r.nome}.html" title="${r.nome}" loading="lazy"></iframe></div>
      <figcaption><b>${r.nome}</b><span>${r.formato} · ${r.layout} · ${r.icone}${r.icone2 ? " + " + r.icone2 : ""}${r.selo ? " · selo " + r.selo : ""}</span><a href="galeria/${r.nome}.html">abrir</a></figcaption>
    </figure>`;
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Galeria de miniaturas — PO para Todos</title>
<link rel="stylesheet" href="../assets/fontes/fontes.css">
<style>
  body { margin: 0; padding: 40px; background: #E9EAEC; color: #1A1A1A; font: 14px/1.5 "Nunito", sans-serif; }
  h1 { font: 700 30px/1.2 "Baloo 2", sans-serif; margin: 0 0 4px; }
  h2 { font: 700 20px/1.2 "Baloo 2", sans-serif; margin: 40px 0 12px; }
  p.lead { margin: 0; color: #4A4A4A; max-width: 80ch; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
  .card { margin: 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
  .moldura { width: 320px; height: 180px; overflow: hidden; }
  iframe { width: 1280px; height: 720px; border: 0; transform: scale(.25); transform-origin: 0 0; pointer-events: none; }
  figcaption { padding: 8px 12px; font-size: 12px; display: grid; grid-template-columns: 1fr auto; gap: 0 8px; }
  figcaption b { font-family: ui-monospace, monospace; }
  figcaption span { grid-column: 1; color: #4A4A4A; }
  figcaption a { grid-row: 1 / 3; align-self: center; color: #156082; }
</style>
</head>
<body>
<h1>Galeria de miniaturas</h1>
<p class="lead">Gerada por <code>scripts/gerar-galeria.mjs</code> a partir de <code>catalogo.json</code> e <code>formatos.json</code>. ${secoes.reduce((n, s) => n + s.itens.length, 0)} miniaturas em escala 25%. Não edite os arquivos de <code>galeria/</code> à mão — rode o script.</p>
${secoes.map((s) => `
<h2>${s.titulo}</h2>
<div class="grid">${s.itens.map(card).join("")}
</div>`).join("\n")}
</body>
</html>
`;
writeFileSync(join(DS, "miniaturas/galeria.html"), html);

const total = secoes.reduce((n, s) => n + s.itens.length, 0);
console.log(`${total} miniaturas geradas em design-system/miniaturas/galeria/${png ? " (+PNG)" : ""}`);
if (falhas.length) { console.error(`\n${falhas.length} falha(s):\n  ${falhas.join("\n  ")}`); process.exit(1); }
