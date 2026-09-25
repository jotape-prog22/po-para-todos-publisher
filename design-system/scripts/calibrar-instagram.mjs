#!/usr/bin/env node
// Página local para calibrar onde fica cada componente dos formatos do Instagram — posts do
// feed (1080×1350), stories e reels (1080×1920) — lado a lado, com a interface do app por cima.
// As amostras saem dos mesmos geradores de produção (gerar-cards, gerar-story-video, gerar-reel,
// gerar-story), então o que se vê aqui é o que sai nos PNG e MP4. "Gravar no CSS" escreve os
// valores no :root de instagram.css, story-video.css e reel.css.
//
//   npm run calibrar                       # abre http://localhost:4700
//   npm run calibrar -- --porta 4800 --sem-abrir

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { dirname, join, resolve, sep, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher } from "./modelo-html.mjs";
import { formatos, variaveisDoCard } from "./gerar-cards.mjs";
import { validar, htmlDaCena } from "./gerar-story-video.mjs";
import { cenaDoAviso } from "./gerar-story-aviso.mjs";
import { htmlDaMoldura } from "./gerar-reel.mjs";
import { htmlDoStory } from "./gerar-story.mjs";

export const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));

export class ErroCalibrar extends Error {}

export const ARQUIVOS_CSS = ["instagram/instagram.css", "instagram/story-video.css", "instagram/reel.css"];
const ALINHAMENTOS = ["flex-start", "center", "flex-end"];

// ---------- variáveis do :root ----------

function blocoRoot(css) {
  const m = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!m) return null;
  return { inicio: m.index + m[0].indexOf("{") + 1, texto: m[1] };
}

export function lerVariaveis(css) {
  const bloco = blocoRoot(css);
  if (!bloco) return [];
  const saida = [];
  for (const linha of bloco.texto.split("\n")) {
    const comentario = (linha.match(/\/\*\s*(.*?)\s*\*\//) ?? [, ""])[1];
    const decls = [...linha.replace(/\/\*.*?\*\//g, "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)];
    decls.forEach((d, i) => saida.push({ nome: d[1], valor: d[2].trim(), comentario: i === decls.length - 1 ? comentario : "" }));
  }
  return saida;
}

function valorValido(valor) {
  return /^\d+(\.\d+)?px$/.test(valor) || ALINHAMENTOS.includes(valor);
}

export function gravarVariaveis(css, mudancas) {
  const bloco = blocoRoot(css);
  if (!bloco) throw new ErroCalibrar("o arquivo não tem bloco :root");
  const existentes = new Set(lerVariaveis(css).map((v) => v.nome));
  let texto = bloco.texto;
  for (const [nome, valor] of Object.entries(mudancas)) {
    if (!existentes.has(nome)) throw new ErroCalibrar(`a variável ${nome} não está no :root deste arquivo`);
    if (!valorValido(String(valor))) throw new ErroCalibrar(`${nome}: "${valor}" não é um tamanho em px nem um alinhamento (${ALINHAMENTOS.join(", ")})`);
    const re = new RegExp(`(${nome.replace(/[-]/g, "\\-")}\\s*:\\s*)[^;]+;`);
    texto = texto.replace(re, `$1${valor};`);
  }
  return css.slice(0, bloco.inicio) + texto + css.slice(bloco.inicio + bloco.texto.length);
}

// Rótulos, grupos e faixas dos controles; o que não estiver aqui aparece em "Outros".
export const CONTROLES = {
  "--ig-story-seguro-topo": { grupo: "Stories", rotulo: "Zona do app em cima (logo desce)", max: 400 },
  "--ig-story-seguro-base": { grupo: "Stories", rotulo: "Zona do app embaixo (tarja sobe)", max: 400 },
  "--sv-alinhamento": { grupo: "Stories", rotulo: "Conteúdo sem sticker (a maioria)" },
  "--sv-zona-sem-sticker": { grupo: "Stories", rotulo: "Espaço acima da tarja, sem sticker", max: 600 },
  "--sv-dica-respiro": { grupo: "Stories", rotulo: "Do conteúdo à dica (\"a resposta vem a seguir\")", max: 300 },
  "--sv-itens-gap": { grupo: "Stories", rotulo: "Entre itens numerados", max: 120 },
  "--sv-alinhamento-sticker": { grupo: "Stories com sticker", rotulo: "Conteúdo com sticker (quiz, enquete)" },
  "--sv-zona-sticker": { grupo: "Stories com sticker", rotulo: "Espaço livre para o sticker (quiz, enquete)", max: 900 },
  "--ig-story-alinhamento": { grupo: "Stories com sticker", rotulo: "Conteúdo do story de vídeo novo" },
  "--ig-story-sticker": { grupo: "Stories com sticker", rotulo: "Espaço livre para o sticker de link (vídeo novo)", max: 900 },
  "--ig-reel-seguro-topo": { grupo: "Reels", rotulo: "Zona do app em cima (logo desce)", max: 400 },
  "--ig-reel-seguro-base": { grupo: "Reels", rotulo: "Zona do app embaixo (legenda, áudio)", max: 600 },
  "--ig-feed-alinhamento": { grupo: "Posts do feed", rotulo: "Conteúdo do post" },
  "--ig-margem": { grupo: "Todos os formatos", rotulo: "Margem lateral (e topo do feed)", max: 200 },
  "--ig-lockup": { grupo: "Todos os formatos", rotulo: "Tamanho da logo", max: 320 },
  "--ig-respiro-logo": { grupo: "Todos os formatos", rotulo: "Da logo ao conteúdo", max: 300 },
  "--ig-conteudo-gap": { grupo: "Todos os formatos", rotulo: "Entre blocos (kicker, título, linhas)", max: 100 },
  "--ig-rodape-altura": { grupo: "Todos os formatos", rotulo: "Altura da tarja verde", max: 200 },
  "--ig-kicker-size": { grupo: "Texto", rotulo: "Kicker e tarja — tamanho", max: 80 },
  "--ig-kicker-line": { grupo: "Texto", rotulo: "Kicker — entrelinha", max: 100 },
  "--ig-titulo-size": { grupo: "Texto", rotulo: "Título — tamanho", max: 160 },
  "--ig-titulo-line": { grupo: "Texto", rotulo: "Título — entrelinha", max: 180 },
  "--ig-titulo-medio-size": { grupo: "Texto", rotulo: "Título médio / subtítulo — tamanho", max: 140 },
  "--ig-titulo-medio-line": { grupo: "Texto", rotulo: "Título médio / subtítulo — entrelinha", max: 160 },
  "--ig-corpo-size": { grupo: "Texto", rotulo: "Texto corrido — tamanho", max: 90 },
  "--ig-corpo-line": { grupo: "Texto", rotulo: "Texto corrido — entrelinha", max: 120 },
  "--ig-apoio-size": { grupo: "Texto", rotulo: "Texto de apoio / dica — tamanho", max: 80 },
  "--ig-apoio-line": { grupo: "Texto", rotulo: "Texto de apoio / dica — entrelinha", max: 100 },
  "--ig-data-size": { grupo: "Texto", rotulo: "Data do aviso — tamanho", max: 200 },
  "--ig-data-line": { grupo: "Texto", rotulo: "Data do aviso — entrelinha", max: 220 },
  "--ig-numero-size": { grupo: "Texto", rotulo: "Número do card de ideia", max: 300 },
  "--sv-item-numero-size": { grupo: "Texto", rotulo: "Item numerado — número", max: 140 },
  "--sv-item-titulo-size": { grupo: "Texto", rotulo: "Item numerado — título", max: 120 },
  "--sv-item-titulo-line": { grupo: "Texto", rotulo: "Item numerado — entrelinha do título", max: 140 },
  "--sv-item-texto-size": { grupo: "Texto", rotulo: "Item numerado — texto", max: 90 },
  "--sv-item-texto-line": { grupo: "Texto", rotulo: "Item numerado — entrelinha do texto", max: 120 },
  "--sv-pergunta-size": { grupo: "Texto", rotulo: "Pergunta do story — tamanho", max: 120 },
  "--sv-pergunta-line": { grupo: "Texto", rotulo: "Pergunta do story — entrelinha", max: 140 },
};

export function variaveisDosArquivos() {
  return ARQUIVOS_CSS.flatMap((arquivo) => lerVariaveis(readFileSync(join(DS, arquivo), "utf8")).map((v) => ({
    ...v, arquivo, ...(CONTROLES[v.nome] ?? { grupo: "Outros", rotulo: v.nome }),
    tipo: ALINHAMENTOS.includes(v.valor) ? "alinhamento" : "px",
  })));
}

export function gravarNosArquivos(mudancas) {
  const porArquivo = {};
  const vars = variaveisDosArquivos();
  for (const [nome, valor] of Object.entries(mudancas)) {
    const v = vars.find((x) => x.nome === nome);
    if (!v) throw new ErroCalibrar(`a variável ${nome} não está em ${ARQUIVOS_CSS.join(", ")}`);
    (porArquivo[v.arquivo] ??= {})[nome] = valor;
  }
  const novos = Object.entries(porArquivo).map(([arquivo, m]) => [arquivo, gravarVariaveis(readFileSync(join(DS, arquivo), "utf8"), m)]);
  for (const [arquivo, css] of novos) writeFileSync(join(DS, arquivo), css);   // só escreve depois de validar tudo
  return Object.keys(porArquivo);
}

// ---------- amostras ----------

const CONGELAR = `<style>.sv__anim, .sv__dica.sv__anim { animation: none !important; opacity: 1 !important; transform: none !important; }</style>\n</head>`;

function htmlDoCard(card, i, total, ds) {
  const modelo = readFileSync(join(DS, "instagram/layouts", `${formatos.cards[card.tipo].layout}.html`), "utf8");
  return preencher(modelo, variaveisDoCard(card, i, total, { ds, usuario: canal.instagramUsuario }), { brutos: ["ds", "texto_html"] });
}

export function amostras(ds = "/design-system") {
  const dados = JSON.parse(readFileSync(join(DS, "instagram/amostras-calibracao.json"), "utf8"));
  const lista = [];
  const add = (id, formato, titulo, html) => {
    const { largura, altura } = formato === "feed" ? formatos.formatos.feed : formatos.formatos.story;
    lista.push({ id, formato, titulo, largura, altura, html: html.replace("</head>", CONGELAR) });
  };
  const cena = (s, opcoes) => htmlDaCena(validar({ tipo: "stories", stories: [s] })[0], ds, opcoes);

  const { artigo, aviso, curiosidade, citacao } = dados.feed;
  artigo.cards.forEach((c, i) => add(`feed-${c.tipo}`, "feed", `Artigo — ${c.tipo}`, htmlDoCard(c, i, artigo.cards.length, ds)));
  add("feed-aviso", "feed", "Aviso", htmlDoCard(aviso.cards[0], 0, 1, ds));
  add("feed-curiosidade", "feed", "Curiosidade", htmlDoCard(curiosidade.cards[0], 0, 1, ds));
  add("feed-citacao", "feed", "Citação", htmlDoCard(citacao.cards[0], 0, 1, ds));

  const st = dados.stories;
  add("story-quiz-pergunta", "story", "Quiz — pergunta", cena(st["quiz-pergunta"], { semSticker: true }));
  add("story-quiz-resposta", "story", "Quiz — resposta", cena(st["quiz-resposta"], { semSticker: true }));
  add("story-passos", "story", "Sequência didática", cena(st.passos, { semSticker: true }));
  add("story-aviso", "story", "Aviso de post novo", cena(cenaDoAviso(aviso), { semSticker: true }));
  add("story-com-sticker", "story", "Com sticker (enquete)", cena(st["com-sticker"], { semSticker: false }));
  add("story-video-novo", "story", "Vídeo novo (sticker de link)", htmlDoStory(ds));

  add("reel-cena", "reel", "Reel de cenas", cena(dados.reel.cena, { semSticker: true, reel: true }));
  add("reel-corte", "reel", "Reel de corte (moldura)", htmlDaMoldura({ ...dados.reel.corte, ds }));
  return lista;
}

// ---------- servidor ----------

export function arquivoEstatico(url) {
  let caminho;
  try { caminho = decodeURIComponent(url.split("?")[0]); } catch { return null; }
  if (!caminho.startsWith("/design-system/")) return null;
  const alvo = resolve(DS, "." + caminho.slice("/design-system".length));
  return alvo.startsWith(DS + sep) ? alvo : null;
}

const TIPOS = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };

// Muda quando qualquer CSS, layout ou amostra muda: a página recarrega sozinha.
function versao() {
  const pastas = [join(DS, "instagram"), join(DS, "instagram/layouts")];
  let max = statSync(join(DS, "tokens.css")).mtimeMs;
  for (const p of pastas) for (const f of readdirSync(p)) {
    const s = statSync(join(p, f));
    if (s.isFile()) max = Math.max(max, s.mtimeMs);
  }
  return String(max);
}

function responder(res, status, corpo, tipo = "application/json") {
  res.writeHead(status, { "content-type": `${tipo}; charset=utf-8`, "cache-control": "no-store" });
  res.end(typeof corpo === "string" || Buffer.isBuffer(corpo) ? corpo : JSON.stringify(corpo));
}

export function servir({ porta = 4700 } = {}) {
  const servidor = createServer((req, res) => {
    try {
      const url = req.url ?? "/";
      if (req.method === "GET" && (url === "/" || url.startsWith("/?"))) return responder(res, 200, readFileSync(join(DS, "instagram/calibrador.html")), "text/html");
      if (req.method === "GET" && url === "/api/amostras") return responder(res, 200, amostras().map(({ html, ...a }) => a));
      if (req.method === "GET" && url === "/api/variaveis") return responder(res, 200, variaveisDosArquivos());
      if (req.method === "GET" && url === "/api/versao") return responder(res, 200, { versao: versao() });
      if (req.method === "GET" && url.startsWith("/amostra/")) {
        const a = amostras().find((x) => x.id === url.slice("/amostra/".length).split("?")[0]);
        return a ? responder(res, 200, a.html, "text/html") : responder(res, 404, { erro: "amostra não existe" });
      }
      if (req.method === "POST" && url === "/api/gravar") {
        let corpo = "";
        req.on("data", (d) => { corpo += d; if (corpo.length > 1e5) req.destroy(); });
        req.on("end", () => {
          try {
            const arquivos = gravarNosArquivos(JSON.parse(corpo).mudancas ?? {});
            console.log(`gravado em ${arquivos.map((a) => `design-system/${a}`).join(", ")}`);
            responder(res, 200, { arquivos });
          } catch (e) { responder(res, 400, { erro: e.message }); }
        });
        return;
      }
      const arquivo = req.method === "GET" && arquivoEstatico(url);
      if (arquivo && existsSync(arquivo) && statSync(arquivo).isFile()) return responder(res, 200, readFileSync(arquivo), TIPOS[extname(arquivo)] ?? "application/octet-stream");
      responder(res, 404, { erro: "não encontrado" });
    } catch (e) {
      responder(res, 500, { erro: e.message });
    }
  });
  return new Promise((ok, falha) => {
    servidor.once("error", falha);
    servidor.listen(porta, "127.0.0.1", () => ok(servidor));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const porta = args.includes("--porta") ? Number(args[args.indexOf("--porta") + 1]) : 4700;
  try {
    await servir({ porta });
  } catch (e) {
    if (e.code === "EADDRINUSE") { console.error(`erro: a porta ${porta} já está em uso — a calibração já está aberta? Ou rode com --porta ${porta + 1}`); process.exit(1); }
    throw e;
  }
  const endereco = `http://localhost:${porta}`;
  console.log(`Calibração do Instagram aberta em ${endereco}\nAjuste, clique em "Gravar no CSS" e depois gere os PNG/MP4 normalmente. Ctrl+C para fechar.`);
  if (!args.includes("--sem-abrir")) {
    const abrir = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
    spawn(abrir, [endereco], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  }
}
