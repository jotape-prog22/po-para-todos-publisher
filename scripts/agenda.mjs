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
import { precisaChecagem, carregarChecagem, ErroChecagem } from "./checagem.mjs";

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
