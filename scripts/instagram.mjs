#!/usr/bin/env node
// Publica um post do Instagram (instagram/<pasta>) pela API oficial da Meta (Instagram Login).
//
//   node scripts/instagram.mjs --token "<token de longa duração>"   guarda o token do Instagram (valida e confere a conta)
//   node scripts/instagram.mjs --token-github "<token do GitHub>"   guarda o token que sobe as imagens
//   node scripts/instagram.mjs --status                             conta, validade do token, cota das 24 h
//   node scripts/instagram.mjs --publicar instagram/<pasta>         publica na hora (carrossel ou card único)
//   node scripts/instagram.mjs --publicar-story instagram/<pasta> <arquivo.mp4|.png>   publica um story avulso, sem sticker
//   node scripts/instagram.mjs --publicar-stories instagram/<pasta>                    publica a sequência de stories.json, retomável
//
// Tokens ficam em ~/.po-para-todos/instagram.json (fora do repositório). O token do Instagram vale 60 dias;
// o script renova sozinho quando faltam menos de 30 e avisa quando a renovação falha.
// A API só baixa mídia de URL pública: os cards viram JPEG, vão num commit órfão para o branch `midia`
// do repositório (canal.json → github) pela API do GitHub, a Meta baixa, e o branch é esvaziado.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename, extname } from "node:path";
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
  if (!existsSync(arquivo)) return {};
  try {
    return JSON.parse(readFileSync(arquivo, "utf8"));
  } catch {
    throw new ErroInstagram(`o arquivo ${arquivo} está corrompido — apague-o e rode --token e --token-github de novo`);
  }
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
  if (!ig) throw new ErroInstagram(`sem token do Instagram — rode: node scripts/instagram.mjs --token "<token>" (README, seção "Publicar no Instagram")`);
  const dias = diasRestantes(ig, agora);
  if (dias < 0) throw new ErroInstagram(`o token do Instagram venceu — gere outro no Meta for Developers e rode --token de novo (README, seção "Publicar no Instagram")`);
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

// ---------- publicação ----------
export async function esperarContainer(ig, id, dormir, tentativas = 20) {
  for (let i = 0; i < tentativas; i++) {
    const { status_code, status } = await ig.get(id, "status_code,status");
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new ErroInstagram(`a Meta rejeitou a mídia (${status_code})${status ? `: ${status}` : ""}`);
    if (i < tentativas - 1) await dormir(3000);
  }
  throw new ErroInstagram(`a Meta não terminou de processar a mídia em ${tentativas * 3} s — tente de novo em alguns minutos`);
}

const nn = (i) => String(i + 1).padStart(2, "0");

// nome do arquivo de mídia não pode ter espaço/acento (vira URL pública) — tira acentos e troca o resto por hífen
const sanitizarNome = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-");

export const TENTATIVAS_VIDEO = 60;   // vídeo demora mais para a Meta processar: 60 × 3 s = 3 min
export const LEDGER_STORIES = "publicacao-stories.json";

// Pré-checagem comum a toda publicação: tokens, cota das 24 h, repositório público.
export async function prepararPublicacao({ tokens, canal, fetchImpl }) {
  if (!tokens.instagram) throw new ErroInstagram(`sem token do Instagram — rode: node scripts/instagram.mjs --token "<token>"`);
  if (!tokens.github_token) throw new ErroInstagram(`sem token do GitHub — rode: node scripts/instagram.mjs --token-github "<token>"`);
  const ig = criarApiInstagram(tokens.instagram.access_token, fetchImpl);
  const igId = tokens.instagram.ig_id;
  const cota = await ig.get(`${igId}/content_publishing_limit`, "quota_usage");
  const uso = cota.data?.[0]?.quota_usage ?? 0;
  if (uso >= COTA) throw new ErroInstagram(`a conta já fez ${COTA} publicações pela API nas últimas 24 h — espere`);
  const gh = criarApiGithub(tokens.github_token, canal.github, fetchImpl);
  const repo = await gh.pedir("GET", "");
  if (repo.private) throw new ErroInstagram(`o repositório ${canal.github} precisa ser público para a Meta baixar as imagens`);
  return { ig, igId, gh };
}

const carimboDe = (agora) => new Date(agora).toISOString().replace(/\D/g, "").slice(0, 14);

// Esvazia o branch mesmo quando a Meta falhou; uma falha aqui não pode mascarar o resultado da publicação.
async function esvaziarMidia(gh, canal, log) {
  log("esvaziando o branch midia…");
  try {
    await limparMidia(gh, { repo: canal.github });
  } catch (e) {
    log(`aviso: não consegui esvaziar o branch midia (${e.message}) — o próximo comando sobrescreve`);
  }
}

export function lerPublicacoesDeStories(pasta) {
  const arquivo = join(pasta, LEDGER_STORIES);
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, "utf8")) : { stories: [] };
}

// Publica um story (MP4 ou PNG) sem sticker e registra no livro-razão da pasta.
export async function publicarStory(pasta, arquivo, { tokens, canal = lerCanal(), fetchImpl = fetch, agora = Date.now(), dormir = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  const caminho = join(pasta, arquivo);
  if (!existsSync(caminho)) throw new ErroInstagram(`não achei ${arquivo} em ${pasta}`);
  const ext = extname(arquivo).toLowerCase();
  if (ext !== ".mp4" && ext !== ".png") throw new ErroInstagram(`${arquivo}: um story é .mp4 ou .png`);
  const ledger = lerPublicacoesDeStories(pasta);
  if (ledger.stories.some((s) => s.arquivo === arquivo)) throw new ErroInstagram(`${arquivo} já foi publicado (está em ${LEDGER_STORIES}) — apague a linha dele se quiser publicar de novo`);
  const { ig, igId, gh } = await prepararPublicacao({ tokens, canal, fetchImpl });
  const video = ext === ".mp4";
  const nome = `${sanitizarNome(basename(pasta))}-${carimboDe(agora)}-${sanitizarNome(basename(arquivo, ext))}${video ? ".mp4" : ".jpg"}`;
  const conteudo = video ? readFileSync(caminho) : await paraJpeg(caminho);
  log(`subindo ${arquivo} para o branch midia de ${canal.github}…`);
  const midia = await subirMidia(gh, [{ nome, conteudo }], { repo: canal.github });
  try {
    log(`criando o story ${arquivo}…`);
    const { id } = await ig.post(`${igId}/media`, { media_type: "STORIES", [video ? "video_url" : "image_url"]: midia.urls[0] });
    await esperarContainer(ig, id, dormir, video ? TENTATIVAS_VIDEO : 20);
    log("publicando…");
    const publicado = await ig.post(`${igId}/media_publish`, { creation_id: id });
    const registro = { arquivo, media_id: publicado.id, publicado_em: new Date(agora).toISOString() };
    ledger.stories.push(registro);
    writeFileSync(join(pasta, LEDGER_STORIES), JSON.stringify(ledger, null, 2) + "\n");
    return registro;
  } finally {
    await esvaziarMidia(gh, canal, log);
  }
}

// Publica a sequência story-01.mp4 … story-NN.mp4 de stories.json, pulando o que já está no livro-razão.
// Para no primeiro erro e diz o que saiu e o que ficou: rodar de novo continua de onde parou.
export async function publicarStories(pasta, opcoes = {}) {
  const arquivo = join(pasta, "stories.json");
  if (!existsSync(arquivo)) throw new ErroInstagram(`falta stories.json em ${pasta} — rode a skill stories`);
  const spec = JSON.parse(readFileSync(arquivo, "utf8"));
  if (spec.publicacao !== "api") throw new ErroInstagram(`esta sequência é manual: stories.json não tem "publicacao": "api" (tem sticker — veja stories.md). A API não põe sticker.`);
  const todos = spec.stories.map((_, i) => `story-${nn(i)}.mp4`);
  for (const a of todos) if (!existsSync(join(pasta, a))) throw new ErroInstagram(`falta ${a} — rode: node design-system/scripts/gerar-story-video.mjs ${pasta}`);
  const feitos = new Set(lerPublicacoesDeStories(pasta).stories.map((s) => s.arquivo));
  const pendentes = todos.filter((a) => !feitos.has(a));
  if (!pendentes.length) throw new ErroInstagram(`todos os ${todos.length} stories já foram publicados (${LEDGER_STORIES}) — apague o arquivo se quiser publicar de novo`);
  const log = opcoes.log ?? console.log;
  const publicados = [];
  for (const [i, a] of pendentes.entries()) {
    try {
      publicados.push(await publicarStory(pasta, a, opcoes));
      log(`story ${a} publicado`);
    } catch (e) {
      throw new ErroInstagram(`falhou em ${a}: ${e.message}\npublicados agora: ${publicados.map((p) => p.arquivo).join(", ") || "nenhum"}\npendentes: ${pendentes.slice(i).join(", ")}\nCorrija e rode o mesmo comando de novo — ele continua de onde parou.`);
    }
  }
  return { publicados };
}

export async function publicarPost(pasta, { tokens, canal = lerCanal(), fetchImpl = fetch, agora = Date.now(), dormir = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  // 1. pré-checagem local
  const arquivoCards = join(pasta, "cards.json");
  if (!existsSync(arquivoCards)) throw new ErroInstagram(`falta cards.json em ${pasta} — rode a skill post`);
  const arquivoLegenda = join(pasta, "legenda.txt");
  if (!existsSync(arquivoLegenda)) throw new ErroInstagram(`falta legenda.txt — rode: node scripts/legenda.mjs ${pasta}`);
  const cards = JSON.parse(readFileSync(arquivoCards, "utf8"));
  const legenda = readFileSync(arquivoLegenda, "utf8").trim();
  const pngs = cards.cards.map((_, i) => join(pasta, `card-${nn(i)}.png`));
  for (const p of pngs) if (!existsSync(p)) throw new ErroInstagram(`falta ${basename(p)} — rode: node design-system/scripts/gerar-cards.mjs ${pasta}`);
  if (existsSync(join(pasta, "publicacao.json"))) throw new ErroInstagram("este post já foi publicado (publicacao.json existe) — apague o arquivo se quiser publicar de novo");

  // 2. cota e repositório
  const { ig, igId, gh } = await prepararPublicacao({ tokens, canal, fetchImpl });

  // 3. mídia pública
  const carimbo = carimboDe(agora);
  const arquivos = [];
  const nomePasta = sanitizarNome(basename(pasta));
  for (const [i, p] of pngs.entries()) arquivos.push({ nome: `${nomePasta}-${carimbo}-card-${nn(i)}.jpg`, conteudo: await paraJpeg(p) });
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
      for (const [i, id] of filhos.entries()) {
        log(`aguardando card ${nn(i)}…`);
        await esperarContainer(ig, id, dormir);
      }
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
    await esvaziarMidia(gh, canal, log);
  }
}

// ---------- CLI ----------
const USO = `uso:
  node scripts/instagram.mjs --token "<token do Instagram>"
  node scripts/instagram.mjs --token-github "<token do GitHub>"
  node scripts/instagram.mjs --status
  node scripts/instagram.mjs --publicar instagram/<pasta>
  node scripts/instagram.mjs --publicar-story instagram/<pasta> <arquivo.mp4|.png>
  node scripts/instagram.mjs --publicar-stories instagram/<pasta>`;

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
      const tokens = await renovarSeNecessario(lerTokens());
      const r = await publicarPost(resolve(valor), { tokens });
      console.log(`publicado: ${r.url}`);
    } else if (opcao === "--publicar-story" && valor && process.argv[4]) {
      const tokens = await renovarSeNecessario(lerTokens());
      const r = await publicarStory(resolve(valor), process.argv[4], { tokens });
      console.log(`story publicado: ${r.arquivo} (id ${r.media_id})`);
    } else if (opcao === "--publicar-stories" && valor) {
      const tokens = await renovarSeNecessario(lerTokens());
      const r = await publicarStories(resolve(valor), { tokens });
      console.log(`sequência publicada: ${r.publicados.map((p) => p.arquivo).join(", ")}`);
    } else {
      console.error(USO);
      process.exit(1);
    }
  } catch (e) {
    if (e instanceof ErroInstagram) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
