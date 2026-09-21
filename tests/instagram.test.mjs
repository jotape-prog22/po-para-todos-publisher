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
