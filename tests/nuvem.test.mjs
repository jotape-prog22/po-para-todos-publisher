import { test } from "node:test";
import assert from "node:assert/strict";
import { tokensDoAmbiente, ErroInstagram } from "../scripts/instagram.mjs";
import { renovarParaNuvem } from "../scripts/renovar-token.mjs";

const DIA = 86_400_000;
const AGORA = Date.parse("2026-10-05T12:00:00Z");
const envBase = (dias) => ({ IG_ACCESS_TOKEN: "TOK", IG_ID: "178", IG_USUARIO: "pesquisaoperacionalparatodos", IG_EXPIRA_EM: new Date(AGORA + dias * DIA).toISOString(), GITHUB_TOKEN: "ghs_x" });

function fetchRefresh(json, status = 200) {
  const chamadas = [];
  const f = async (url) => { chamadas.push(url); return { ok: status < 400, status, text: async () => JSON.stringify(json) }; };
  f.chamadas = chamadas;
  return f;
}

test("tokensDoAmbiente monta o mesmo formato do arquivo de tokens", () => {
  assert.deepEqual(tokensDoAmbiente(envBase(50)), {
    instagram: { access_token: "TOK", usuario: "pesquisaoperacionalparatodos", ig_id: "178", expira_em: envBase(50).IG_EXPIRA_EM },
    github_token: "ghs_x",
  });
});

test("tokensDoAmbiente lista o que falta, sem publicar nada", () => {
  assert.throws(() => tokensDoAmbiente({ IG_ID: "1" }), (e) => e instanceof ErroInstagram && /IG_ACCESS_TOKEN/.test(e.message) && /GITHUB_TOKEN/.test(e.message));
  const sem = envBase(50); delete sem.GITHUB_TOKEN;
  assert.doesNotThrow(() => tokensDoAmbiente(sem, { exigirGithub: false }));
});

test("renovarParaNuvem: com 45 dias de folga não faz nada nem chama a Meta", async () => {
  const f = fetchRefresh({});
  assert.equal(await renovarParaNuvem(envBase(45), { fetchImpl: f, agora: AGORA }), null);
  assert.equal(f.chamadas.length, 0);
});

test("renovarParaNuvem: com 10 dias renova e devolve o novo token com 60 dias", async () => {
  const f = fetchRefresh({ access_token: "NOVO", expires_in: 5_184_000 });
  const r = await renovarParaNuvem(envBase(10), { fetchImpl: f, agora: AGORA, avisar: () => {} });
  assert.equal(r.access_token, "NOVO");
  assert.equal(r.expira_em, new Date(AGORA + 60 * DIA).toISOString());
  assert.match(f.chamadas[0], /refresh_access_token/);
});

test("renovarParaNuvem: se a Meta recusar, falha em voz alta (o workflow vira vermelho)", async () => {
  const f = fetchRefresh({ error: { message: "token inválido" } }, 400);
  await assert.rejects(renovarParaNuvem(envBase(10), { fetchImpl: f, agora: AGORA, avisar: () => {} }), (e) => e instanceof ErroInstagram && /não consegui renovar/.test(e.message));
});

test("renovarParaNuvem: token já vencido dá o erro de token vencido", async () => {
  await assert.rejects(renovarParaNuvem(envBase(-1), { fetchImpl: fetchRefresh({}), agora: AGORA }), (e) => e instanceof ErroInstagram && /venceu/.test(e.message));
});
