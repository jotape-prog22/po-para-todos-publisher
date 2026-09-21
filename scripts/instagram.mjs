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
