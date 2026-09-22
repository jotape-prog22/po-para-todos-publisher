#!/usr/bin/env node
// Valida instagram/<pasta>/checagem.json e imprime o resumo que a skill mostra na parada de aprovação.
//
//   node scripts/checagem.mjs instagram/<pasta>
//
// checagem.json — uma afirmação por fato ou número que o post faz:
//   { "afirmacoes": [
//       { "onde": "card 2", "texto": "…", "tipo": "fonte", "fonte": "https://doi.org/…", "resultado": "confirmada", "como": "trecho do artigo que sustenta" },
//       { "onde": "story 2", "texto": "4 pães e 2 bolos = R$ 220", "tipo": "conta", "resultado": "confirmada", "como": "enumerei as combinações: …" } ] }
// Quem busca a fonte e refaz a conta é a skill; aqui só se confere o esquema (ADR-0009).

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export class ErroChecagem extends Error {}
export const RESULTADOS = ["confirmada", "nao-confirmada", "sem-acesso"];
export const TIPOS = ["fonte", "conta"];
export const TIPOS_DE_POST_COM_CHECAGEM = ["artigo", "curiosidade"];
export const COMO_MIN = 20;

export const precisaChecagem = (tipoPost) => TIPOS_DE_POST_COM_CHECAGEM.includes(tipoPost);

export function validarChecagem(dados) {
  const lista = dados?.afirmacoes;
  if (!Array.isArray(lista)) return ['checagem.json precisa de uma lista "afirmacoes"'];
  if (!lista.length) return ['checagem.json precisa de pelo menos uma afirmação em "afirmacoes"'];
  const erros = [];
  lista.forEach((a, i) => {
    const n = `afirmação ${i + 1}`;
    for (const c of ["onde", "texto", "tipo", "resultado", "como"]) if (!a?.[c] || !String(a[c]).trim()) erros.push(`${n}: falta "${c}"`);
    if (a?.tipo && !TIPOS.includes(a.tipo)) erros.push(`${n}: "tipo" deve ser ${TIPOS.join(" ou ")}`);
    if (a?.resultado && !RESULTADOS.includes(a.resultado)) erros.push(`${n}: "resultado" deve ser ${RESULTADOS.join(", ")}`);
    if (a?.tipo === "fonte" && !/^https?:\/\//.test(a.fonte ?? "")) erros.push(`${n}: afirmação de fonte precisa de "fonte" com a URL consultada (https://…)`);
    if (a?.tipo === "conta" && a.resultado === "sem-acesso") erros.push(`${n}: uma conta não fica "sem-acesso" — recalcule por outro caminho`);
    if (a?.como && String(a.como).trim().length < COMO_MIN) erros.push(`${n}: "como" precisa dizer o que foi conferido (pelo menos ${COMO_MIN} caracteres)`);
  });
  return erros;
}

export function resumoChecagem(dados) {
  const grupos = [["confirmada", "✔ Confirmei"], ["nao-confirmada", "✖ Não confirmei"], ["sem-acesso", "⚠ Sem acesso à fonte"]];
  const linhas = [`CHECAGEM — ${dados.afirmacoes.length} afirmação(ões)`];
  for (const [r, titulo] of grupos) {
    const itens = dados.afirmacoes.filter((a) => a.resultado === r);
    linhas.push(`${titulo} (${itens.length})`);
    for (const a of itens) linhas.push(`  - ${a.onde}: "${a.texto}" — ${a.como}`);
  }
  return linhas.join("\n");
}

export function carregarChecagem(pasta) {
  const arquivo = join(pasta, "checagem.json");
  if (!existsSync(arquivo)) throw new ErroChecagem(`falta checagem.json em ${pasta} — faça a Checagem (design-system/instagram/GUIA-AGENTE.md, passo 3)`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarChecagem(dados);
  if (erros.length) throw new ErroChecagem(`checagem.json inválido:\n- ${erros.join("\n- ")}`);
  return dados;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  if (!arg) { console.error("uso: node scripts/checagem.mjs instagram/<pasta>"); process.exit(1); }
  try {
    console.log(resumoChecagem(carregarChecagem(resolve(arg))));
  } catch (e) {
    if (e instanceof ErroChecagem) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
