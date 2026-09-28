#!/usr/bin/env node
// Página local para revisar TODOS os itens em rascunho da agenda de uma vez: mídia, legenda e resumo da
// Checagem lado a lado, com "Aprovar", "Pedir ajuste" (com texto) e "Tirar da agenda". Cada clique grava em
// instagram/agenda.json. Depois: node scripts/agenda.mjs --enfileirar.
//
//   npm run revisar                          # abre http://localhost:4710
//   npm run revisar -- --porta 4800 --sem-abrir

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { ErroAgenda, lerAgenda, gravarAgenda, ARQUIVO_AGENDA, RAIZ } from "./agenda.mjs";
import { carregarChecagem, resumoChecagem } from "./checagem.mjs";

export const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- decisões ----------
export function decidir(agenda, id, decisao, nota = "") {
  const indice = agenda.itens.findIndex((i) => i.id === id);
  if (indice < 0) throw new ErroAgenda(`não achei o item ${id}`);
  const item = agenda.itens[indice];
  if (item.estado !== "rascunho") throw new ErroAgenda(`${id} já está ${item.estado} — só se revisa o que está em rascunho (para reabrir: node scripts/agenda.mjs --reabrir ${id})`);
  if (decisao === "aprovar") Object.assign(item, { aprovado: true, ajuste: null });
  else if (decisao === "ajuste") {
    if (!String(nota).trim()) throw new ErroAgenda("diga o que ajustar");
    Object.assign(item, { aprovado: false, ajuste: String(nota).trim() });
  } else if (decisao === "remover") agenda.itens.splice(indice, 1);
  else throw new ErroAgenda(`decisão desconhecida: ${decisao}`);
  return item;
}

// ---------- o que mostrar ----------
export function midiaDoItem(item, raiz = RAIZ) {
  const pasta = join(raiz, item.pasta);
  if (!existsSync(pasta)) return [];
  const nomes = readdirSync(pasta).sort();
  if (item.formato === "post") return nomes.filter((n) => /^card-\d+\.png$/.test(n)).map((nome) => ({ nome, tipo: "imagem" }));
  if (item.formato === "stories") return nomes.filter((n) => /^story-\d+\.mp4$/.test(n)).map((nome) => ({ nome, tipo: "video" }));
  return nomes.filter((n) => n === "reel.mp4").map((nome) => ({ nome, tipo: "video" }));
}

const lerTexto = (arquivo) => (existsSync(arquivo) ? readFileSync(arquivo, "utf8").trim() : "");

export function fichasDaAgenda(agenda, raiz = RAIZ) {
  const ordem = (i) => (i.quando ? Date.parse(i.quando) : Infinity);
  return agenda.itens
    .filter((i) => i.estado === "rascunho")
    .sort((a, b) => ordem(a) - ordem(b))
    .map((i) => {
      const pasta = join(raiz, i.pasta);
      let checagem;
      try { checagem = resumoChecagem(carregarChecagem(pasta)); } catch { checagem = "Sem checagem.json — este tipo não exige Checagem, ou ela ainda não foi feita."; }
      const legenda = i.formato === "reel" ? lerTexto(join(pasta, "reel-legenda.txt")) : i.formato === "post" ? lerTexto(join(pasta, "legenda.txt")) : lerTexto(join(pasta, "stories.md"));
      return { id: i.id, pasta: i.pasta, formato: i.formato, quando: i.quando, aprovado: i.aprovado, ajuste: i.ajuste, midia: midiaDoItem(i, raiz), legenda, checagem };
    });
}

const quandoBonito = (q) => {
  if (!q) return "sem data";
  const [dia, hora] = q.slice(0, 16).split("T");
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a} às ${hora}`;
};

// ---------- página ----------
export function htmlDaRevisao(fichas) {
  const cartoes = fichas.map((f) => {
    const url = (nome) => `/midia/${encodeURIComponent(f.id)}/${nome}`;
    const midia = f.midia.map((m) => (m.tipo === "imagem" ? `<img src="${url(m.nome)}" alt="${escapar(m.nome)}">` : `<video src="${url(m.nome)}" controls preload="metadata"></video>`)).join("");
    return `<article data-id="${escapar(f.id)}" class="${f.aprovado ? "aprovado" : ""}">
  <header><strong>${escapar(f.formato)}</strong> · ${escapar(quandoBonito(f.quando))} · <code>${escapar(f.pasta)}</code> <span class="selo">${f.aprovado ? "✔ aprovado" : "falta aprovar"}</span></header>
  ${f.ajuste ? `<p class="ajuste">Ajuste pedido: ${escapar(f.ajuste)}</p>` : ""}
  <div class="midia">${midia || "<em>sem mídia gerada</em>"}</div>
  <h3>Legenda</h3><pre>${escapar(f.legenda) || "—"}</pre>
  <h3>Checagem</h3><pre>${escapar(f.checagem)}</pre>
  <div class="botoes">
    <button data-decisao="aprovar">Aprovar</button>
    <input type="text" placeholder="o que ajustar?" class="nota">
    <button data-decisao="ajuste">Pedir ajuste</button>
    <button data-decisao="remover" class="perigo">Tirar da agenda</button>
  </div>
</article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisão da agenda</title>
<style>
  body { font: 15px/1.45 system-ui, sans-serif; margin: 0; background: #f4f5f7; color: #1b2430; }
  h1 { margin: 0; padding: 16px 24px; background: #12284c; color: #fff; font-size: 18px; }
  main { max-width: 980px; margin: 0 auto; padding: 16px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
  article { background: #fff; border-radius: 10px; padding: 16px; border: 2px solid transparent; }
  article.aprovado { border-color: #2e9e5b; }
  header { margin-bottom: 8px; } .selo { float: right; font-size: 13px; }
  .midia { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; }
  .midia img { height: 340px; border-radius: 6px; } .midia video { height: 340px; border-radius: 6px; }
  pre { white-space: pre-wrap; background: #f0f2f5; padding: 10px; border-radius: 6px; margin: 4px 0 12px; }
  h3 { margin: 8px 0 0; font-size: 13px; text-transform: uppercase; color: #5a6675; }
  .botoes { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  button { padding: 8px 14px; border: 0; border-radius: 6px; background: #12284c; color: #fff; cursor: pointer; }
  button.perigo { background: #b3261e; } .nota { flex: 1; min-width: 180px; padding: 8px; }
  .ajuste { background: #fff3cd; padding: 8px; border-radius: 6px; }
  .vazio { text-align: center; padding: 48px; color: #5a6675; }
</style></head><body>
<h1>Revisão da agenda — ${fichas.length} item(ns) em rascunho</h1>
<main>
${cartoes || `<p class="vazio">Nada para revisar. Adicione conteúdos com: node scripts/agenda.mjs --adicionar instagram/&lt;pasta&gt;</p>`}
</main>
<script>
  document.querySelectorAll("article").forEach((art) => {
    art.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", async () => {
      const decisao = btn.dataset.decisao;
      const nota = art.querySelector(".nota").value;
      const r = await fetch("/api/decidir", { method: "POST", body: JSON.stringify({ id: art.dataset.id, decisao, nota }) });
      const j = await r.json();
      if (!r.ok) { alert(j.erro); return; }
      if (decisao === "remover") art.remove();
      else if (decisao === "aprovar") { art.classList.add("aprovado"); art.querySelector(".selo").textContent = "✔ aprovado"; }
      else { art.classList.remove("aprovado"); art.querySelector(".selo").textContent = "ajuste pedido"; }
    }));
  });
</script>
</body></html>`;
}

// ---------- servidor ----------
const TIPOS = { ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4" };

export function criarServidorRevisao({ arquivoAgenda = ARQUIVO_AGENDA, raiz = RAIZ } = {}) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(htmlDaRevisao(fichasDaAgenda(lerAgenda(arquivoAgenda), raiz)));
      }
      const m = url.pathname.match(/^\/midia\/([^/]+)\/([^/]+)$/);
      if (req.method === "GET" && m) {
        const id = decodeURIComponent(m[1]), nome = decodeURIComponent(m[2]);
        const item = lerAgenda(arquivoAgenda).itens.find((i) => i.id === id);
        const permitido = item && /^[\w][\w.-]*$/.test(nome) && midiaDoItem(item, raiz).some((x) => x.nome === nome);
        if (!permitido) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "content-type": TIPOS[extname(nome)] ?? "application/octet-stream" });
        return res.end(readFileSync(join(raiz, item.pasta, nome)));
      }
      if (req.method === "POST" && url.pathname === "/api/decidir") {
        let corpo = "";
        for await (const parte of req) corpo += parte;
        try {
          const { id, decisao, nota } = JSON.parse(corpo);
          const agenda = lerAgenda(arquivoAgenda);
          decidir(agenda, id, decisao, nota);
          gravarAgenda(agenda, arquivoAgenda);
          res.writeHead(200, { "content-type": "application/json" });
          return res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          if (!(e instanceof ErroAgenda)) throw e;
          res.writeHead(400, { "content-type": "application/json" });
          return res.end(JSON.stringify({ erro: e.message }));
        }
      }
      res.writeHead(404);
      res.end();
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(`erro: ${e.message}`);
    }
  });
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const porta = Number(args[args.indexOf("--porta") + 1]) || 4710;
  const servidor = criarServidorRevisao();
  servidor.listen(porta, "127.0.0.1", () => {
    const endereco = `http://localhost:${porta}`;
    console.log(`Revisão aberta em ${endereco} — quando terminar, feche com Ctrl+C e rode: node scripts/agenda.mjs --enfileirar`);
    if (!args.includes("--sem-abrir")) {
      const abrir = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
      spawn(abrir, [endereco], { stdio: "ignore", detached: true }).unref();
    }
  });
}
