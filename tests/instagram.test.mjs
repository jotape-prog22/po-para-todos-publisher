import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lerTokens, gravarTokens, diasRestantes, guardarTokenInstagram, renovarSeNecessario, statusDaConta, ErroInstagram, criarApiGithub, subirMidia, limparMidia, paraJpeg, README_MIDIA, publicarPost, esperarContainer } from "../scripts/instagram.mjs";

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
    const status = typeof rota.status === "function" ? rota.status({ url, corpo, n: chamadas.length }) : (rota.status ?? 200);
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

// rotas do GitHub em que a primeira PATCH (subida da mídia) funciona e a segunda (limpeza no finally) falha
function rotasGithubFalhaNaLimpeza() {
  let blobs = 0, patches = 0;
  return [
    { metodo: "POST", url: /\/git\/blobs$/, json: () => ({ sha: `blob${++blobs}` }) },
    { metodo: "POST", url: /\/git\/trees$/, json: { sha: "tree1" } },
    { metodo: "POST", url: /\/git\/commits$/, json: { sha: "c0ffee" } },
    { metodo: "GET", url: /\/git\/ref\/heads\/midia$/, json: { ref: "refs/heads/midia" } },
    { metodo: "PATCH", url: /\/git\/refs\/heads\/midia$/, json: () => (++patches === 2 ? { message: "credenciais expiraram" } : { ref: "refs/heads/midia" }), status: () => (patches === 2 ? 500 : 200) },
  ];
}

test("limpeza do branch midia falha depois de publicar: o resultado não é mascarado, só um aviso", async () => {
  const pasta = await pastaDePost(1);
  const avisos = [];
  const f = fetchFalso([...rotasInstagram(), ...rotasGithubFalhaNaLimpeza()]);
  const r = await publicarPost(pasta, { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: (m) => avisos.push(m) });
  assert.equal(r.media_id, "midia77");
  assert.ok(existsSync(join(pasta, "publicacao.json")));
  assert.ok(avisos.some((m) => /não consegui esvaziar o branch midia/.test(m) && /credenciais expiraram/.test(m)));
});

test("Meta rejeita a mídia e a limpeza também falha: o erro reportado continua sendo o da Meta", async () => {
  const pasta = await pastaDePost(1);
  const f = fetchFalso([...rotasInstagram({ status: ["ERROR"] }), ...rotasGithubFalhaNaLimpeza()]);
  await assert.rejects(publicarPost(pasta, { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} }), /rejeitou a mídia \(ERROR\)/);
});

test("falta legenda.txt: erro amigável e nenhuma chamada de rede", async () => {
  const pasta = await pastaDePost(1);
  unlinkSync(join(pasta, "legenda.txt"));
  const f = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  await assert.rejects(publicarPost(pasta, { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} }), /legenda\.txt/);
  assert.equal(f.chamadas.length, 0);
});
