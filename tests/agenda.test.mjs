import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAIZ, ErroAgenda, lerAgenda, gravarAgenda, formatosDaPasta, verificarPasta, pastaRelativa, adicionar, lerModelo, validarModelo, distribuir, mover, devidos, passouDaJanela, pastasLiberadas, reabrir, remover, statusTexto, ARQUIVO_MODELO, enfileirar, enviarAgenda, atualizarAgenda, configurarNuvem } from "../scripts/agenda.mjs";
import { raizTemporaria, criarPastaPost, criarPastaReel, criarPastaStories, item } from "./ajudas-agenda.mjs";

const erro = (re) => (e) => e instanceof ErroAgenda && re.test(e.message);

test("lerAgenda: arquivo ausente vira agenda vazia; corrompido dá erro amigável; gravar e ler é ida e volta", () => {
  const arq = join(mkdtempSync(join(tmpdir(), "ag-")), "agenda.json");
  assert.deepEqual(lerAgenda(arq), { itens: [] });
  gravarAgenda({ itens: [{ id: "a" }] }, arq);
  assert.deepEqual(lerAgenda(arq), { itens: [{ id: "a" }] });
  writeFileSync(arq, "{");
  assert.throws(() => lerAgenda(arq), erro(/corrompid/));
});

test("formatosDaPasta reconhece post, stories e reel pelos JSONs", () => {
  const raiz = raizTemporaria();
  const p = criarPastaPost(raiz, "a");
  assert.deepEqual(formatosDaPasta(p), ["post"]);
  criarPastaReel(raiz, "a");
  assert.deepEqual(formatosDaPasta(p), ["post", "reel"]);
});

test("verificarPasta(post): aceita, avisa quando falta o story de aviso", () => {
  const raiz = raizTemporaria();
  assert.deepEqual(verificarPasta(criarPastaPost(raiz, "sem-aviso"), "post").length, 1);
  assert.deepEqual(verificarPasta(criarPastaPost(raiz, "com-aviso", { aviso: true }), "post"), []);
});

test("verificarPasta(post): curiosidade sem checagem.json é recusada (ADR 0009)", () => {
  const p = criarPastaPost(raizTemporaria(), "c", { tipo: "curiosidade" });
  assert.throws(() => verificarPasta(p, "post"), erro(/checagem\.json/));
});

test("verificarPasta(post): card faltando e post já publicado são recusados", () => {
  const raiz = raizTemporaria();
  const p = criarPastaPost(raiz, "dois", { cards: 2 });
  unlinkSync(join(p, "card-02.png"));
  assert.throws(() => verificarPasta(p, "post"), erro(/card-02\.png/));
  const q = criarPastaPost(raiz, "publicado");
  writeFileSync(join(q, "publicacao.json"), "{}");
  assert.throws(() => verificarPasta(q, "post"), erro(/já foi publicado/));
});

test("verificarPasta(reel): corte passa; cenas exige checagem; falta o mp4", () => {
  const raiz = raizTemporaria();
  assert.deepEqual(verificarPasta(criarPastaReel(raiz, "corte"), "reel"), []);
  assert.throws(() => verificarPasta(criarPastaReel(raiz, "cenas", { tipo: "cenas" }), "reel"), erro(/checagem\.json/));
  const p = criarPastaReel(raiz, "sem-mp4");
  unlinkSync(join(p, "reel.mp4"));
  assert.throws(() => verificarPasta(p, "reel"), erro(/reel\.mp4/));
});

test("verificarPasta(stories): sequência com sticker (manual) é recusada; sem checagem também", () => {
  const raiz = raizTemporaria();
  assert.throws(() => verificarPasta(criarPastaStories(raiz, "manual", { publicacao: "manual" }), "stories"), erro(/sticker/));
  assert.throws(() => verificarPasta(criarPastaStories(raiz, "api"), "stories"), erro(/checagem\.json/));
});

test("a fixture do Kruskal (artigo com checagem.json) passa como post", () => {
  assert.deepEqual(verificarPasta(join(RAIZ, "instagram", "2026-09-20-kruskal-1956"), "post").length, 1);
});

test("pastaRelativa: aceita instagram/<pasta>, recusa fora de instagram/ e o _modelo", () => {
  const raiz = raizTemporaria();
  assert.equal(pastaRelativa(join(raiz, "instagram", "a"), raiz), "instagram/a");
  assert.equal(pastaRelativa("instagram/a", raiz), "instagram/a");
  assert.throws(() => pastaRelativa("videos/a", raiz), erro(/dentro de instagram/));
  assert.throws(() => pastaRelativa("instagram/_modelo", raiz), erro(/dentro de instagram/));
});

test("adicionar: pasta com post e reel vira dois itens rascunho; repetir não duplica", () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "2026-10-05-a", { aviso: true });
  criarPastaReel(raiz, "2026-10-05-a");
  const agenda = { itens: [] };
  const r = adicionar(agenda, "instagram/2026-10-05-a", { raiz });
  assert.deepEqual(r.novos.map((i) => i.id), ["2026-10-05-a:post", "2026-10-05-a:reel"]);
  assert.deepEqual(agenda.itens[0], { id: "2026-10-05-a:post", pasta: "instagram/2026-10-05-a", formato: "post", quando: null, aprovado: false, estado: "rascunho", feitos: [], tentativas: 0, ajuste: null, resultado: null, erro: null });
  assert.deepEqual(adicionar(agenda, "instagram/2026-10-05-a", { raiz }).novos, []);
  assert.equal(agenda.itens.length, 2);
});

test("adicionar: o formato válido entra e o inválido vem em erros", () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "b");
  const p = criarPastaReel(raiz, "b");
  unlinkSync(join(p, "reel.mp4"));
  const agenda = { itens: [] };
  const r = adicionar(agenda, "instagram/b", { raiz });
  assert.deepEqual(r.novos.map((i) => i.formato), ["post"]);
  assert.equal(r.erros.length, 1);
  assert.match(r.erros[0], /reel/);
});

test("adicionar: pasta vazia ou inexistente dá erro", () => {
  const raiz = raizTemporaria();
  assert.throws(() => adicionar({ itens: [] }, "instagram/nao-existe", { raiz }), erro(/não achei/));
});

const MODELO = { fuso: "-03:00", semana: { seg: { reel: "12:00" }, ter: { post: "12:00" }, qua: { reel: "12:00" }, qui: { post: "12:00" }, sex: { reel: "12:00" }, sab: { stories: "18:00" }, dom: { post: "12:00" } } };
const rascunhos = (formato, n) => Array.from({ length: n }, (_, k) => item({ id: `${formato}${k}:${formato}`, formato }));

test("o modelo de semana que vai no repositório é válido", () => {
  validarModelo(lerModelo(ARQUIVO_MODELO));
});

test("validarModelo recusa fuso torto, dia inventado e formato inventado", () => {
  assert.throws(() => validarModelo({ fuso: "BRT", semana: {} }), erro(/fuso/));
  assert.throws(() => validarModelo({ fuso: "-03:00", semana: { xxx: { post: "12:00" } } }), erro(/dia/));
  assert.throws(() => validarModelo({ fuso: "-03:00", semana: { seg: { podcast: "12:00" } } }), erro(/formato/));
  assert.throws(() => validarModelo({ fuso: "-03:00", semana: { seg: { post: "meio-dia" } } }), erro(/hora/));
});

test("distribuir: reels seg/qua/sex, posts ter/qui/dom, stories sábado — a partir de segunda 2026-10-05", () => {
  const agenda = { itens: [...rascunhos("reel", 4), ...rascunhos("post", 2), ...rascunhos("stories", 1)] };
  distribuir(agenda, MODELO, "2026-10-05");
  const de = (f) => agenda.itens.filter((i) => i.formato === f).map((i) => i.quando);
  assert.deepEqual(de("reel"), ["2026-10-05T12:00:00-03:00", "2026-10-07T12:00:00-03:00", "2026-10-09T12:00:00-03:00", "2026-10-12T12:00:00-03:00"]);
  assert.deepEqual(de("post"), ["2026-10-06T12:00:00-03:00", "2026-10-08T12:00:00-03:00"]);
  assert.deepEqual(de("stories"), ["2026-10-10T18:00:00-03:00"]);
});

test("distribuir: não usa horário já ocupado e não mexe em quem já tem data", () => {
  const ocupado = item({ id: "o:reel", formato: "reel", quando: "2026-10-05T12:00:00-03:00" });
  const [novo] = rascunhos("reel", 1);
  const agenda = { itens: [ocupado, novo] };
  const dados = distribuir(agenda, MODELO, "2026-10-05");
  assert.equal(dados.length, 1);
  assert.equal(novo.quando, "2026-10-07T12:00:00-03:00");
  assert.equal(ocupado.quando, "2026-10-05T12:00:00-03:00");
});

test("distribuir: modelo sem dia para o formato é erro claro; data de início ruim também", () => {
  const semReel = { fuso: "-03:00", semana: { ter: { post: "12:00" } } };
  assert.throws(() => distribuir({ itens: rascunhos("reel", 1) }, semReel, "2026-10-05"), erro(/reel/));
  assert.throws(() => distribuir({ itens: [] }, MODELO, "05/10/2026"), erro(/AAAA-MM-DD/));
});

test("mover: rascunho ganha a data com o fuso; formato ruim e item publicado são recusados", () => {
  const a = item({ id: "a:post" });
  const agenda = { itens: [a, item({ id: "p:post", estado: "publicado" })] };
  mover(agenda, "a:post", "2026-10-06T09:30", { fuso: "-03:00" });
  assert.equal(a.quando, "2026-10-06T09:30:00-03:00");
  assert.throws(() => mover(agenda, "a:post", "amanhã", { fuso: "-03:00" }), erro(/AAAA-MM-DDTHH:MM/));
  assert.throws(() => mover(agenda, "p:post", "2026-10-06T09:30", { fuso: "-03:00" }), erro(/já foi publicado/));
  assert.throws(() => mover(agenda, "z:post", "2026-10-06T09:30", { fuso: "-03:00" }), erro(/não achei/));
});

test("mover: item que falhou ou perdeu a janela volta a agendado com a tentativa zerada — só para o futuro", () => {
  const agora = Date.parse("2026-10-05T20:00:00Z");
  const f = item({ id: "f:post", estado: "falhou", aprovado: true, tentativas: 3, erro: "x", quando: "2026-10-05T12:00:00-03:00" });
  const agenda = { itens: [f] };
  assert.throws(() => mover(agenda, "f:post", "2026-10-05T10:00", { fuso: "-03:00", agora }), erro(/no futuro/));
  mover(agenda, "f:post", "2026-10-06T12:00", { fuso: "-03:00", agora });
  assert.equal(f.estado, "agendado");
  assert.equal(f.tentativas, 0);
  assert.equal(f.erro, null);
});

test("devidos: só agendado + aprovado + já venceu, em ordem; passouDaJanela usa 6 h", () => {
  const agora = Date.parse("2026-10-05T18:00:00Z"); // 15:00 em Brasília
  const base = { estado: "agendado", aprovado: true };
  const a = item({ id: "a:post", ...base, quando: "2026-10-05T12:00:00-03:00" });
  const b = item({ id: "b:post", ...base, quando: "2026-10-05T09:00:00-03:00" });
  const semAprovacao = item({ id: "c:post", estado: "agendado", aprovado: false, quando: "2026-10-05T09:00:00-03:00" });
  const futuro = item({ id: "d:post", ...base, quando: "2026-10-05T16:00:00-03:00" });
  const falhou = item({ id: "e:post", estado: "falhou", aprovado: true, quando: "2026-10-05T09:00:00-03:00" });
  const agenda = { itens: [a, b, semAprovacao, futuro, falhou] };
  assert.deepEqual(devidos(agenda, agora).map((i) => i.id), ["b:post", "a:post"]);
  assert.equal(passouDaJanela(a, agora), false);
  assert.equal(passouDaJanela(b, agora), false); // 6 h exatas ainda cabem
  assert.equal(passouDaJanela(b, agora + 1), true);
});

test("pastasLiberadas: a pasta só sai da fila quando nenhum item dela está agendado, falhou ou perdido", () => {
  const agenda = { itens: [
    item({ id: "a:post", pasta: "instagram/a", estado: "publicado" }),
    item({ id: "a:reel", pasta: "instagram/a", formato: "reel", estado: "agendado" }),
    item({ id: "b:post", pasta: "instagram/b", estado: "publicado" }),
    item({ id: "c:post", pasta: "instagram/c", estado: "publicado" }),
    item({ id: "c:reel", pasta: "instagram/c", formato: "reel", estado: "falhou" }),
  ] };
  assert.deepEqual(pastasLiberadas(agenda, ["instagram/a", "instagram/b", "instagram/c"]), ["instagram/b"]);
});

test("reabrir: agendado volta a rascunho sem aprovação; publicado não reabre", () => {
  const a = item({ id: "a:post", estado: "agendado", aprovado: true, quando: "2026-10-06T12:00:00-03:00" });
  const agenda = { itens: [a, item({ id: "p:post", estado: "publicado" })] };
  reabrir(agenda, "a:post");
  assert.equal(a.estado, "rascunho");
  assert.equal(a.aprovado, false);
  assert.equal(a.quando, "2026-10-06T12:00:00-03:00");
  assert.throws(() => reabrir(agenda, "p:post"), erro(/já foi publicado/));
});

test("remover tira o item e devolve o removido", () => {
  const agenda = { itens: [item({ id: "a:post" }), item({ id: "b:post" })] };
  assert.equal(remover(agenda, "a:post").id, "a:post");
  assert.deepEqual(agenda.itens.map((i) => i.id), ["b:post"]);
  assert.throws(() => remover(agenda, "a:post"), erro(/não achei/));
});

test("statusTexto: ordena por data e destaca falta de aprovação, falha e ajuste pedido", () => {
  const agenda = { itens: [
    item({ id: "b:reel", formato: "reel", pasta: "instagram/b", quando: "2026-10-07T12:00:00-03:00", estado: "falhou", aprovado: true, erro: "Meta recusou" }),
    item({ id: "a:post", pasta: "instagram/a", quando: "2026-10-06T12:00:00-03:00", ajuste: "trocar o título do card 2" }),
    item({ id: "c:post", pasta: "instagram/c" }),
  ] };
  const t = statusTexto(agenda);
  assert.ok(t.indexOf("instagram/a") < t.indexOf("instagram/b"), "ordem por data");
  assert.match(t, /falta aprovar/);
  assert.match(t, /FALHOU/);
  assert.match(t, /Meta recusou/);
  assert.match(t, /ajuste: trocar o título do card 2/);
  assert.match(t, /sem data/);
  assert.match(statusTexto({ itens: [] }), /vazia/);
});

function ghFila() {
  const chamadas = [];
  let n = 0;
  return {
    chamadas,
    async status() { return 404; },
    async pedir(metodo, caminho, corpo) {
      chamadas.push({ metodo, caminho, corpo });
      if (caminho === "/git/blobs") return { sha: `b${++n}` };
      if (caminho === "/git/trees") return { sha: "t" };
      if (caminho === "/git/commits") return { sha: "c" };
      return {};
    },
  };
}

test("enfileirar: sobe a pasta dos aprovados com data e muda o estado para agendado; ignora quem falta aprovar", async () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "a");
  criarPastaPost(raiz, "b");
  const agenda = { itens: [
    item({ id: "a:post", pasta: "instagram/a", aprovado: true, quando: "2026-10-06T12:00:00-03:00" }),
    item({ id: "b:post", pasta: "instagram/b", aprovado: false, quando: "2026-10-08T12:00:00-03:00" }),
  ] };
  const gh = ghFila();
  const feitos = await enfileirar(agenda, gh, { raiz });
  assert.deepEqual(feitos.map((i) => i.id), ["a:post"]);
  assert.equal(agenda.itens[0].estado, "agendado");
  assert.equal(agenda.itens[1].estado, "rascunho");
  const arvore = gh.chamadas.find((c) => c.caminho === "/git/trees").corpo.tree.map((e) => e.path);
  assert.ok(arvore.includes("instagram/a/card-01.png") && !arvore.some((p) => p.startsWith("instagram/b/")));
});

test("enfileirar: aprovado sem data pede --distribuir; pasta quebrada depois da aprovação é recusada", async () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "a");
  const semData = { itens: [item({ id: "a:post", pasta: "instagram/a", aprovado: true })] };
  await assert.rejects(enfileirar(semData, ghFila(), { raiz }), erro(/--distribuir/));
  const quebrada = { itens: [item({ id: "z:post", pasta: "instagram/z", aprovado: true, quando: "2026-10-06T12:00:00-03:00" })] };
  await assert.rejects(enfileirar(quebrada, ghFila(), { raiz }), (e) => e instanceof Error);
  assert.equal(quebrada.itens[0].estado, "rascunho");
});

const ARQ = "instagram/agenda.json instagram/agenda-modelo.json";
const CONFLITOS = "git diff --name-only --diff-filter=U";
// Executor falso: registra os comandos; `falhas` decide quais lançam (por prefixo do comando) e `saidas` o que devolvem.
function executorFalso({ falhas = {}, saidas = {} } = {}) {
  const cmds = [];
  const executar = (cmd, args) => {
    const linha = [cmd, ...args].join(" ");
    cmds.push(linha);
    const chave = Object.keys(falhas).find((k) => linha.startsWith(k));
    if (chave) throw Object.assign(new Error(falhas[chave].message ?? "falhou"), falhas[chave]);
    const saida = Object.keys(saidas).find((k) => linha.startsWith(k));
    return saida ? saidas[saida] : "";
  };
  return { cmds, executar };
}
const agendaValida = () => {
  const arquivo = join(mkdtempSync(join(tmpdir(), "ag-")), "agenda.json");
  gravarAgenda({ itens: [] }, arquivo);
  return arquivo;
};

test("enviarAgenda: puxa, adiciona só os arquivos da agenda, commita e empurra (só esses arquivos)", () => {
  const { cmds, executar } = executorFalso({ falhas: { "git diff --cached": { status: 1 } } });
  assert.equal(enviarAgenda({ executar, arquivo: agendaValida() }), true);
  assert.deepEqual(cmds, [
    "git pull --rebase --autostash",
    CONFLITOS,
    `git add ${ARQ}`,
    `git diff --cached --quiet -- ${ARQ}`,
    `git commit -m agenda: atualiza a fila de publicações -m Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com> -- ${ARQ}`,
    "git push",
  ]);
});

test("enviarAgenda: sem mudanças não cria commit", () => {
  const { cmds, executar } = executorFalso();
  assert.equal(enviarAgenda({ executar, arquivo: agendaValida() }), false);
  assert.ok(!cmds.some((c) => c.startsWith("git commit")));
  assert.ok(!cmds.some((c) => c === "git push"));
});

test("enviarAgenda: erro do git que não é 'há mudanças' (status ≠ 1) vira ErroAgenda, sem commit", async () => {
  const { cmds, executar } = executorFalso({ falhas: { "git diff --cached": { status: 128, message: "fatal: quebrou" } } });
  assert.throws(() => enviarAgenda({ executar, arquivo: agendaValida() }), erro(/quebrou/));
  assert.ok(!cmds.some((c) => c.startsWith("git commit")));
});

test("enviarAgenda: push recusado vira ErroAgenda em português que manda rodar --atualizar", () => {
  const { executar } = executorFalso({ falhas: { "git diff --cached": { status: 1 }, "git push": { message: "rejected\nmais linhas" } } });
  assert.throws(() => enviarAgenda({ executar, arquivo: agendaValida() }), (e) => e instanceof ErroAgenda && /--atualizar/.test(e.message) && /rejected/.test(e.message) && !/mais linhas/.test(e.message));
});

test("atualizarAgenda: pull com arquivo em conflito é recusado e nada é commitado nem empurrado", () => {
  const { cmds, executar } = executorFalso({ saidas: { [CONFLITOS]: "instagram/agenda.json\n" } });
  assert.throws(() => enviarAgenda({ executar, arquivo: agendaValida() }), erro(/chocaram|conflito/));
  assert.ok(!cmds.some((c) => c.startsWith("git add") || c.startsWith("git commit") || c === "git push"));
});

test("atualizarAgenda: agenda corrompida depois do pull é recusada", () => {
  const arquivo = join(mkdtempSync(join(tmpdir(), "ag-")), "agenda.json");
  writeFileSync(arquivo, "<<<<<<< Updated upstream\n{}");
  const { cmds, executar } = executorFalso();
  assert.throws(() => enviarAgenda({ executar, arquivo }), erro(/corrompid/));
  assert.ok(!cmds.some((c) => c.startsWith("git add")));
});

test("atualizarAgenda: pull que falha vira ErroAgenda; sem conflito faz pull e confere conflitos", () => {
  assert.throws(() => atualizarAgenda({ executar: executorFalso({ falhas: { "git pull": { message: "sem rede" } } }).executar, arquivo: agendaValida() }), erro(/sem rede.*--atualizar/));
  const { cmds, executar } = executorFalso();
  atualizarAgenda({ executar, arquivo: agendaValida() });
  assert.deepEqual(cmds, ["git pull --rebase --autostash", CONFLITOS]);
});

test("configurarNuvem: o token vai pela entrada padrão (não aparece na linha de comando); o resto vira Variable", () => {
  const chamadas = [];
  const executar = (cmd, args, opcoes = {}) => { chamadas.push({ cmd, args, input: opcoes.input }); return ""; };
  const tokens = { instagram: { access_token: "SEGREDO", usuario: "po", ig_id: "178", expira_em: "2026-11-01T00:00:00.000Z" } };
  configurarNuvem(tokens, { repo: "dono/repo", executar });
  const segredo = chamadas.find((c) => c.args.includes("IG_ACCESS_TOKEN"));
  assert.deepEqual(segredo.args, ["secret", "set", "IG_ACCESS_TOKEN", "--repo", "dono/repo"]);
  assert.equal(segredo.input, "SEGREDO");
  assert.ok(!chamadas.some((c) => c.args.join(" ").includes("SEGREDO")));
  const vars = chamadas.filter((c) => c.args[0] === "variable").map((c) => c.args[2]);
  assert.deepEqual(vars, ["IG_ID", "IG_USUARIO", "IG_EXPIRA_EM"]);
  assert.throws(() => configurarNuvem({}, { repo: "dono/repo", executar }), erro(/--token/));
});

test("configurarNuvem: gh ausente (ENOENT) vira ErroAgenda com o próximo passo", () => {
  const executar = () => { throw Object.assign(new Error("spawn gh ENOENT"), { code: "ENOENT" }); };
  const tokens = { instagram: { access_token: "x", usuario: "po", ig_id: "1", expira_em: "2026-11-01" } };
  assert.throws(() => configurarNuvem(tokens, { repo: "dono/repo", executar }), erro(/gh auth login/));
});
