#!/usr/bin/env node
// Agenda de publicações do Instagram (ADR 0010): instagram/agenda.json é a fila; o workflow
// .github/workflows/publicar-agenda.yml publica o que venceu.
//
//   node scripts/agenda.mjs --atualizar                      traz do GitHub o estado mais novo da agenda
//   node scripts/agenda.mjs --adicionar instagram/<pasta>    põe os conteúdos da pasta na agenda (rascunho)
//   node scripts/agenda.mjs --distribuir AAAA-MM-DD          dá data aos rascunhos, pela semana-modelo, a partir desse dia
//   node scripts/agenda.mjs --status                         mostra a agenda
//   node scripts/agenda.mjs --mover <id> AAAA-MM-DDTHH:MM    troca a data (ou reagenda um item que falhou)
//   node scripts/agenda.mjs --reabrir <id>                   volta um item agendado a rascunho (para ajustar e reaprovar)
//   node scripts/agenda.mjs --remover <id>                   tira da agenda
//   node scripts/agenda.mjs --enfileirar                     sobe a mídia dos aprovados para o branch fila e agenda
//   node scripts/agenda.mjs --enviar                         git commit + push da agenda
//   node scripts/agenda.mjs --configurar-nuvem               grava os tokens nos Secrets do GitHub (uma vez)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { precisaChecagem, carregarChecagem, ErroChecagem } from "./checagem.mjs";
import { atualizarFila, lerPastaParaFila } from "./fila.mjs";
import { lerTokens, criarApiGithub, ErroInstagram } from "./instagram.mjs";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ARQUIVO_AGENDA = join(RAIZ, "instagram", "agenda.json");
export const ARQUIVO_MODELO = join(RAIZ, "instagram", "agenda-modelo.json");
export const FORMATOS = ["post", "stories", "reel"];
export const JANELA_HORAS = 6;

export class ErroAgenda extends Error {}

const nn = (i) => String(i + 1).padStart(2, "0");

// ---------- arquivo da agenda ----------
export function lerAgenda(arquivo = ARQUIVO_AGENDA) {
  if (!existsSync(arquivo)) return { itens: [] };
  let dados;
  try { dados = JSON.parse(readFileSync(arquivo, "utf8")); } catch { throw new ErroAgenda(`${arquivo} está corrompido — restaure com: git checkout instagram/agenda.json`); }
  if (!Array.isArray(dados.itens)) throw new ErroAgenda(`${arquivo} não tem a lista "itens" — restaure com: git checkout instagram/agenda.json`);
  return dados;
}

// Uma linha por campo: dois itens editados em lugares diferentes se juntam sem conflito no git.
export function gravarAgenda(agenda, arquivo = ARQUIVO_AGENDA) {
  writeFileSync(arquivo, JSON.stringify(agenda, null, 2) + "\n");
}

// ---------- o que há numa pasta ----------
export function formatosDaPasta(pasta) {
  const formatos = [];
  if (existsSync(join(pasta, "cards.json"))) formatos.push("post");
  if (existsSync(join(pasta, "stories.json"))) formatos.push("stories");
  if (existsSync(join(pasta, "reel.json"))) formatos.push("reel");
  return formatos;
}

const comoErroAgenda = (fn) => {
  try { return fn(); } catch (e) { if (e instanceof ErroChecagem) throw new ErroAgenda(e.message); throw e; }
};

// Confere se a pasta está pronta para o formato (mesmas regras dos publicadores, mais cedo).
// Devolve avisos (o que não impede); lança ErroAgenda no que impede.
export function verificarPasta(pasta, formato) {
  const avisos = [];
  const exige = (nome, dica) => {
    if (!existsSync(join(pasta, nome))) throw new ErroAgenda(`falta ${nome} em ${pasta}${dica ? ` — ${dica}` : ""}`);
  };
  if (formato === "post") {
    exige("cards.json", "rode a skill post");
    const cards = JSON.parse(readFileSync(join(pasta, "cards.json"), "utf8"));
    cards.cards.forEach((_, i) => exige(`card-${nn(i)}.png`, `rode: node design-system/scripts/gerar-cards.mjs ${pasta}`));
    exige("legenda.txt", `rode: node scripts/legenda.mjs ${pasta}`);
    if (existsSync(join(pasta, "publicacao.json"))) throw new ErroAgenda(`${pasta}: este post já foi publicado (publicacao.json existe)`);
    if (precisaChecagem(cards.tipo)) comoErroAgenda(() => carregarChecagem(pasta));
    if (!existsSync(join(pasta, "story-aviso.mp4"))) avisos.push("sem story-aviso.mp4: o post sai sem story de aviso");
  } else if (formato === "stories") {
    exige("stories.json", "rode a skill stories");
    const spec = JSON.parse(readFileSync(join(pasta, "stories.json"), "utf8"));
    if (spec.publicacao !== "api") throw new ErroAgenda(`${pasta}: esta sequência leva sticker e é manual (stories.json sem "publicacao": "api") — a agenda só publica o que a API publica`);
    spec.stories.forEach((_, i) => exige(`story-${nn(i)}.mp4`, `rode: node design-system/scripts/gerar-story-video.mjs ${pasta}`));
    comoErroAgenda(() => carregarChecagem(pasta));
  } else if (formato === "reel") {
    exige("reel.json", "rode a skill reel");
    exige("reel.mp4", `rode: node design-system/scripts/gerar-reel.mjs ${pasta}`);
    exige("reel-legenda.txt", `rode: node scripts/legenda.mjs ${pasta} --reel`);
    if (existsSync(join(pasta, "publicacao-reel.json"))) throw new ErroAgenda(`${pasta}: este reel já foi publicado (publicacao-reel.json existe)`);
    if (JSON.parse(readFileSync(join(pasta, "reel.json"), "utf8")).tipo === "cenas") comoErroAgenda(() => carregarChecagem(pasta));
  } else {
    throw new ErroAgenda(`formato desconhecido: ${formato}`);
  }
  return avisos;
}

export function pastaRelativa(pasta, raiz = RAIZ) {
  const rel = relative(raiz, resolve(raiz, pasta)).split("\\").join("/");
  if (!/^instagram\/[^/]+$/.test(rel) || rel === "instagram/_modelo") throw new ErroAgenda(`${pasta}: esperava uma pasta dentro de instagram/ (ex.: instagram/2026-10-05-kruskal)`);
  return rel;
}

// ---------- adicionar ----------
export function adicionar(agenda, pasta, { raiz = RAIZ } = {}) {
  const rel = pastaRelativa(pasta, raiz);
  const abs = resolve(raiz, rel);
  if (!existsSync(abs)) throw new ErroAgenda(`não achei a pasta ${rel}`);
  const presentes = formatosDaPasta(abs);
  if (!presentes.length) throw new ErroAgenda(`${rel} não tem cards.json, stories.json nem reel.json — faça o conteúdo antes`);
  const novos = [], avisos = [], erros = [];
  for (const formato of presentes) {
    const id = `${basename(rel)}:${formato}`;
    if (agenda.itens.some((i) => i.id === id)) continue;
    try {
      avisos.push(...verificarPasta(abs, formato).map((a) => `${id}: ${a}`));
    } catch (e) {
      if (!(e instanceof ErroAgenda)) throw e;
      erros.push(`${id}: ${e.message}`);
      continue;
    }
    const item = { id, pasta: rel, formato, quando: null, aprovado: false, estado: "rascunho", feitos: [], tentativas: 0, ajuste: null, resultado: null, erro: null };
    agenda.itens.push(item);
    novos.push(item);
  }
  return { novos, avisos, erros };
}

// ---------- semana-modelo ----------
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export function lerModelo(arquivo = ARQUIVO_MODELO) {
  if (!existsSync(arquivo)) throw new ErroAgenda(`falta ${arquivo} (a semana-modelo)`);
  try { return JSON.parse(readFileSync(arquivo, "utf8")); } catch { throw new ErroAgenda(`${arquivo} está corrompido — restaure com: git checkout instagram/agenda-modelo.json`); }
}

export function validarModelo(modelo) {
  if (!/^[+-]\d\d:\d\d$/.test(modelo?.fuso ?? "")) throw new ErroAgenda(`agenda-modelo.json: "fuso" precisa ser como -03:00`);
  for (const [dia, formatos] of Object.entries(modelo.semana ?? {})) {
    if (!DIAS.includes(dia)) throw new ErroAgenda(`agenda-modelo.json: dia "${dia}" não existe (use ${DIAS.join(", ")})`);
    for (const [formato, hora] of Object.entries(formatos)) {
      if (!FORMATOS.includes(formato)) throw new ErroAgenda(`agenda-modelo.json: formato "${formato}" não existe (use ${FORMATOS.join(", ")})`);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new ErroAgenda(`agenda-modelo.json: hora "${hora}" ruim em ${dia}/${formato} (use HH:MM)`);
    }
  }
}

const somarDias = (dia, n) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Dá data aos rascunhos sem data: para cada um, o primeiro horário livre da semana-modelo do seu formato
// a partir de `inicio` (AAAA-MM-DD). Não mexe em quem já tem data.
export function distribuir(agenda, modelo, inicio) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || Number.isNaN(Date.parse(`${inicio}T12:00:00Z`))) throw new ErroAgenda(`data de início ruim: "${inicio}" (use AAAA-MM-DD)`);
  validarModelo(modelo);
  const ocupados = new Set(agenda.itens.filter((i) => i.quando).map((i) => i.quando));
  const dados = [];
  for (const it of agenda.itens.filter((i) => i.estado === "rascunho" && !i.quando)) {
    let achou = false;
    for (let n = 0; n < 730 && !achou; n++) {
      const dia = somarDias(inicio, n);
      const hora = modelo.semana[DIAS[new Date(`${dia}T12:00:00Z`).getUTCDay()]]?.[it.formato];
      if (!hora) continue;
      const quando = `${dia}T${hora}:00${modelo.fuso}`;
      if (ocupados.has(quando)) continue;
      it.quando = quando;
      ocupados.add(quando);
      dados.push(it);
      achou = true;
    }
    if (!achou) throw new ErroAgenda(`a semana-modelo não tem dia para "${it.formato}" — veja instagram/agenda-modelo.json`);
  }
  return dados;
}

// ---------- mexer num item ----------
function achar(agenda, id) {
  const it = agenda.itens.find((i) => i.id === id);
  if (!it) throw new ErroAgenda(`não achei o item ${id} — rode --status para ver os ids`);
  return it;
}

export function mover(agenda, id, quandoLocal, { agora = Date.now(), fuso } = {}) {
  const it = achar(agenda, id);
  if (it.estado === "publicado") throw new ErroAgenda(`${id} já foi publicado`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(quandoLocal) || Number.isNaN(Date.parse(`${quandoLocal}:00${fuso}`))) throw new ErroAgenda(`data ruim: "${quandoLocal}" (use AAAA-MM-DDTHH:MM, ex.: 2026-10-06T12:00)`);
  const quando = `${quandoLocal}:00${fuso}`;
  const reagendando = it.estado === "falhou" || it.estado === "perdido";
  if (reagendando && Date.parse(quando) <= agora) throw new ErroAgenda(`para reagendar ${id}, escolha uma data no futuro`);
  it.quando = quando;
  if (reagendando) Object.assign(it, { estado: "agendado", tentativas: 0, erro: null });
  return it;
}

export function reabrir(agenda, id) {
  const it = achar(agenda, id);
  if (it.estado === "publicado") throw new ErroAgenda(`${id} já foi publicado`);
  Object.assign(it, { estado: "rascunho", aprovado: false, tentativas: 0, erro: null });
  return it;
}

export function remover(agenda, id) {
  const it = achar(agenda, id);
  agenda.itens.splice(agenda.itens.indexOf(it), 1);
  return it;
}

// ---------- o que o workflow precisa saber ----------
export const devidos = (agenda, agora) =>
  agenda.itens
    .filter((i) => i.estado === "agendado" && i.aprovado && i.quando && Date.parse(i.quando) <= agora)
    .sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando));

export const passouDaJanela = (it, agora) => agora - Date.parse(it.quando) > JANELA_HORAS * 3_600_000;

// Pastas cuja mídia pode sair do branch fila: nenhum item da pasta ainda vai (ou pode ser reagendado para) sair.
export const pastasLiberadas = (agenda, pastas) =>
  pastas.filter((p) => !agenda.itens.some((i) => i.pasta === p && ["agendado", "falhou", "perdido"].includes(i.estado)));

// ---------- status ----------
const ROTULO = { rascunho: "rascunho", agendado: "agendado", publicado: "publicado ✔", falhou: "FALHOU ✖", perdido: "PERDIDO ✖" };

export function statusTexto(agenda) {
  if (!agenda.itens.length) return "a agenda está vazia — comece com: node scripts/agenda.mjs --adicionar instagram/<pasta>";
  const ordem = (i) => (i.quando ? Date.parse(i.quando) : Infinity);
  const linhas = [...agenda.itens].sort((a, b) => ordem(a) - ordem(b)).map((i) => {
    const quando = i.quando ? i.quando.slice(0, 16).replace("T", " ") : "sem data     ";
    const extra = [!i.aprovado && i.estado === "rascunho" ? "falta aprovar" : "", i.ajuste ? `ajuste: ${i.ajuste}` : "", i.erro ? `erro: ${i.erro}` : ""].filter(Boolean).join(" · ");
    return `${quando}  ${i.formato.padEnd(7)} ${ROTULO[i.estado].padEnd(12)} ${i.pasta}${extra ? `  (${extra})` : ""}`;
  });
  const conta = (e) => agenda.itens.filter((i) => i.estado === e).length;
  linhas.push("", `${agenda.itens.length} itens: ${conta("rascunho")} rascunho, ${conta("agendado")} agendado, ${conta("publicado")} publicado, ${conta("falhou")} falhou, ${conta("perdido")} perdido`);
  return linhas.join("\n");
}

// ---------- fila e GitHub ----------
const COAUTOR = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";
const primeiraLinha = (e) => String(e?.stderr || e?.message || e).trim().split("\n")[0];

// Roda um comando git. Falha vira ErroAgenda em português (nunca o rastro cru do Node).
// `rede`: o comando fala com o GitHub (pull/push), então o próximo passo é atualizar e tentar de novo.
function git(executar, args, { rede = false } = {}) {
  try {
    return executar("git", args, { cwd: RAIZ, encoding: "utf8" });
  } catch (e) {
    if (e instanceof ErroAgenda) throw e;
    throw new ErroAgenda(rede
      ? `não consegui falar com o GitHub (${primeiraLinha(e)}) — rode node scripts/agenda.mjs --atualizar e tente de novo`
      : `o git falhou em "git ${args[0]}" (${primeiraLinha(e)}) — nada foi enviado; tente de novo`);
  }
}

// Sobe para o branch fila a pasta de cada item aprovado com data e o marca como agendado.
export async function enfileirar(agenda, gh, { raiz = RAIZ } = {}) {
  const prontos = agenda.itens.filter((i) => i.estado === "rascunho" && i.aprovado);
  const semData = prontos.filter((i) => !i.quando);
  if (semData.length) throw new ErroAgenda(`aprovados sem data: ${semData.map((i) => i.id).join(", ")} — rode: node scripts/agenda.mjs --distribuir AAAA-MM-DD`);
  if (!prontos.length) return [];
  for (const i of prontos) verificarPasta(resolve(raiz, i.pasta), i.formato); // a pasta pode ter mudado depois da aprovação
  const pastas = [...new Set(prontos.map((i) => i.pasta))];
  await atualizarFila(gh, {}, { subir: pastas.map((p) => ({ pasta: p, arquivos: lerPastaParaFila(resolve(raiz, p)) })) });
  for (const i of prontos) i.estado = "agendado";
  return prontos;
}

// Traz do GitHub o estado mais novo da agenda. Recusa se as duas versões se chocaram ou se o arquivo ficou quebrado.
export function atualizarAgenda({ executar = execFileSync, arquivo = ARQUIVO_AGENDA } = {}) {
  git(executar, ["pull", "--rebase", "--autostash"], { rede: true });
  const conflitos = String(git(executar, ["diff", "--name-only", "--diff-filter=U"]) ?? "").trim();
  if (conflitos) throw new ErroAgenda(`a agenda mudou no GitHub e no seu computador ao mesmo tempo e as duas versões se chocaram em ${conflitos.split("\n").join(", ")} — não envie assim: peça ao Claude "resolve o conflito da agenda"`);
  lerAgenda(arquivo); // lança ErroAgenda amigável se o arquivo não for mais um JSON válido
}

// Manda a agenda para o GitHub, onde o workflow a lê. Não mexe em nada além dos dois arquivos da agenda.
const ARQUIVOS_AGENDA = ["instagram/agenda.json", "instagram/agenda-modelo.json"];
export function enviarAgenda({ executar = execFileSync, arquivo = ARQUIVO_AGENDA } = {}) {
  atualizarAgenda({ executar, arquivo });
  git(executar, ["add", ...ARQUIVOS_AGENDA]);
  let mudou = false;
  try {
    executar("git", ["diff", "--cached", "--quiet", "--", ...ARQUIVOS_AGENDA], { cwd: RAIZ, encoding: "utf8" });
  } catch (e) {
    if (e?.status !== 1) throw new ErroAgenda(`o git falhou ao conferir o que mudou (${primeiraLinha(e)}) — nada foi enviado; tente de novo`);
    mudou = true;
  }
  if (!mudou) return false;
  git(executar, ["commit", "-m", "agenda: atualiza a fila de publicações", "-m", COAUTOR, "--", ...ARQUIVOS_AGENDA]);
  git(executar, ["push"], { rede: true });
  return true;
}

// Copia os tokens do Mac para os Secrets/Variables do repositório, pelo CLI `gh`. O token vai pela entrada padrão.
export function configurarNuvem(tokens, { repo, executar = execFileSync } = {}) {
  const ig = tokens.instagram;
  if (!ig) throw new ErroAgenda(`sem token do Instagram guardado — rode antes: node scripts/instagram.mjs --token "<token>"`);
  const gh = (args, opcoes) => {
    try {
      executar("gh", args, { encoding: "utf8", ...opcoes });
    } catch (e) {
      if (e?.code === "ENOENT") throw new ErroAgenda("falta o programa gh — instale (README, \"Publicar na nuvem\") e rode: gh auth login");
      throw new ErroAgenda(`o gh não conseguiu gravar no GitHub (${primeiraLinha(e)}) — confira com: gh auth login e rode de novo`);
    }
  };
  gh(["secret", "set", "IG_ACCESS_TOKEN", "--repo", repo], { input: ig.access_token });
  for (const [nome, valor] of [["IG_ID", ig.ig_id], ["IG_USUARIO", ig.usuario], ["IG_EXPIRA_EM", ig.expira_em]]) {
    gh(["variable", "set", nome, "--body", String(valor), "--repo", repo]);
  }
}

// ---------- CLI ----------
const USO = `uso:
  node scripts/agenda.mjs --atualizar
  node scripts/agenda.mjs --adicionar instagram/<pasta>
  node scripts/agenda.mjs --distribuir AAAA-MM-DD
  node scripts/agenda.mjs --status
  node scripts/agenda.mjs --mover <id> AAAA-MM-DDTHH:MM
  node scripts/agenda.mjs --reabrir <id>
  node scripts/agenda.mjs --remover <id>
  node scripts/agenda.mjs --enfileirar
  node scripts/agenda.mjs --enviar
  node scripts/agenda.mjs --configurar-nuvem`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [opcao, a, b] = process.argv.slice(2);
  const canal = () => JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
  const ghLocal = () => {
    const tokens = lerTokens();
    if (!tokens.github_token) throw new ErroAgenda(`sem token do GitHub — rode: node scripts/instagram.mjs --token-github "<token>"`);
    return criarApiGithub(tokens.github_token, canal().github);
  };
  try {
    if (opcao === "--atualizar") {
      atualizarAgenda();
      console.log("agenda atualizada a partir do GitHub");
    } else if (opcao === "--adicionar" && a) {
      const agenda = lerAgenda();
      const r = adicionar(agenda, resolve(a));
      gravarAgenda(agenda);
      for (const i of r.novos) console.log(`adicionado: ${i.id}`);
      for (const av of r.avisos) console.log(`aviso: ${av}`);
      if (!r.novos.length && !r.erros.length) console.log("nada novo: tudo o que há nessa pasta já está na agenda");
      if (r.erros.length) { for (const e of r.erros) console.error(`não adicionei — ${e}`); process.exit(1); }
    } else if (opcao === "--distribuir" && a) {
      const agenda = lerAgenda();
      const dados = distribuir(agenda, lerModelo(), a);
      gravarAgenda(agenda);
      console.log(`${dados.length} item(ns) ganharam data. Veja: node scripts/agenda.mjs --status`);
    } else if (opcao === "--status") {
      console.log(statusTexto(lerAgenda()));
    } else if (opcao === "--mover" && a && b) {
      const agenda = lerAgenda();
      const i = mover(agenda, a, b, { fuso: lerModelo().fuso });
      gravarAgenda(agenda);
      console.log(`${i.id}: ${i.quando} (${i.estado})`);
    } else if (opcao === "--reabrir" && a) {
      const agenda = lerAgenda();
      const i = reabrir(agenda, a);
      gravarAgenda(agenda);
      console.log(`${i.id} voltou a rascunho — ajuste a pasta, rode a revisão e --enfileirar de novo`);
    } else if (opcao === "--remover" && a) {
      const agenda = lerAgenda();
      const i = remover(agenda, a);
      gravarAgenda(agenda);
      const liberadas = i.estado === "agendado" || i.estado === "falhou" || i.estado === "perdido" ? pastasLiberadas(agenda, [i.pasta]) : [];
      if (liberadas.length) await atualizarFila(ghLocal(), {}, { tirar: liberadas });
      console.log(`${i.id} saiu da agenda`);
    } else if (opcao === "--enfileirar") {
      const agenda = lerAgenda();
      const feitos = await enfileirar(agenda, ghLocal());
      gravarAgenda(agenda);
      console.log(feitos.length ? `${feitos.length} item(ns) agendado(s) e com a mídia no branch fila. Agora envie: node scripts/agenda.mjs --enviar` : "nada para enfileirar: precisa estar aprovado (revisão) e ter data (--distribuir)");
    } else if (opcao === "--enviar") {
      console.log(enviarAgenda() ? "agenda enviada ao GitHub" : "nada mudou desde o último envio");
    } else if (opcao === "--configurar-nuvem") {
      configurarNuvem(lerTokens(), { repo: canal().github });
      console.log("tokens gravados nos Secrets/Variables do GitHub. Falta só o SEGREDOS_PAT (README, \"Publicar na nuvem\", passo 3).");
    } else {
      console.error(USO);
      process.exit(1);
    }
  } catch (e) {
    if (e instanceof ErroAgenda || e instanceof ErroInstagram) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
