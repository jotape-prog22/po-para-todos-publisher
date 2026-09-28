import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { RAIZ } from "../scripts/agenda.mjs";

const ler = (nome) => YAML.parse(readFileSync(join(RAIZ, ".github", "workflows", nome), "utf8"));

test("publicar-agenda: cron de 30 min, manual com simulação, uma execução por vez, pode gravar no repositório", () => {
  const w = ler("publicar-agenda.yml");
  assert.deepEqual(w.on.schedule, [{ cron: "*/30 * * * *" }]);
  assert.ok(w.on.workflow_dispatch.inputs.simular);
  assert.equal(w.concurrency.group, "publicar-agenda");
  assert.equal(w.concurrency["cancel-in-progress"], false);
  assert.equal(w.permissions.contents, "write");
  const passos = w.jobs.publicar.steps;
  const publicar = passos.find((s) => /publicar-agenda\.mjs/.test(s.run ?? ""));
  for (const v of ["IG_ACCESS_TOKEN", "IG_ID", "IG_USUARIO", "IG_EXPIRA_EM", "GITHUB_TOKEN"]) assert.ok(publicar.env[v], `falta ${v}`);
  assert.ok(!/secrets\./.test(JSON.stringify(publicar.env.IG_ID)), "IG_ID é Variable, não Secret");
  const estado = passos.find((s) => /git push/.test(s.run ?? ""));
  assert.equal(estado.if, "always()", "o estado é gravado mesmo se o publicador falhar");
  assert.match(estado.run, /instagram\/agenda\.json/);
  assert.match(estado.run, /publicacao\*\.json/);
});

test("publicar-agenda: baixa a mídia do branch fila sem apagar arquivos da agenda", () => {
  const passos = ler("publicar-agenda.yml").jobs.publicar.steps;
  const baixar = passos.find((s) => /fila/.test(s.run ?? "") && /archive/.test(s.run ?? ""));
  assert.ok(baixar, "passo que baixa a fila");
  assert.doesNotMatch(baixar.run, /git restore|git checkout/, "restore apagaria o que não está na fila");
});

test("publicar-agenda: guardar o estado sobe mesmo com arquivo modificado e sem publicacao*.json", () => {
  const passos = ler("publicar-agenda.yml").jobs.publicar.steps;
  const estado = passos.find((s) => /git push/.test(s.run ?? ""));
  assert.match(estado.run, /--autostash/, "a mídia extraída da fila pode sujar a árvore; sem autostash o pull recusa");
  assert.match(estado.run, /publicacao\*\.json'.*\|\| true/, "se o glob não casar nada, o git add não pode derrubar o passo");
});

test("publicar-agenda: o estado do robô vence conflito e é validado antes do push", () => {
  const passos = ler("publicar-agenda.yml").jobs.publicar.steps;
  const estado = passos.find((s) => /git push/.test(s.run ?? ""));
  assert.match(estado.run, /git pull --rebase --autostash -X theirs origin master/);
  const validar = estado.run.indexOf("JSON.parse");
  assert.ok(validar > estado.run.indexOf("git pull"), "valida depois do pull");
  assert.ok(validar > -1 && validar < estado.run.indexOf("git push"), "valida antes do push");
  assert.match(estado.run, /itens/);
});

test("renovar-token: semanal, usa SEGREDOS_PAT para gravar Secret e Variable", () => {
  const w = ler("renovar-token.yml");
  assert.equal(w.on.schedule.length, 1);
  const gravar = w.jobs.renovar.steps.find((s) => /gh secret set IG_ACCESS_TOKEN/.test(s.run ?? ""));
  assert.match(gravar.env.GH_TOKEN, /SEGREDOS_PAT/);
  assert.match(gravar.run, /gh variable set IG_EXPIRA_EM/);
  assert.match(gravar.run, /add-mask/);
  assert.doesNotMatch(gravar.run, /jq -r /, "jq estrito: nunca gravar o texto null no Secret");
  assert.equal((gravar.run.match(/jq -er /g) ?? []).length, 2);
});
