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
