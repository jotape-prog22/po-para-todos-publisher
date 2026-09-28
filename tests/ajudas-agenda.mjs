// Fábricas para os testes da agenda (não é um teste: o nome não termina em .test.mjs).
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function raizTemporaria() {
  const raiz = mkdtempSync(join(tmpdir(), "agenda-"));
  mkdirSync(join(raiz, "instagram"), { recursive: true });
  return raiz;
}

export function criarPastaPost(raiz, nome, { tipo = "aviso", cards = 1, aviso = false } = {}) {
  const p = join(raiz, "instagram", nome);
  mkdirSync(p, { recursive: true });
  writeFileSync(join(p, "cards.json"), JSON.stringify({ tipo, cards: Array.from({ length: cards }, () => ({})) }));
  for (let i = 1; i <= cards; i++) writeFileSync(join(p, `card-${String(i).padStart(2, "0")}.png`), "png");
  writeFileSync(join(p, "legenda.txt"), "legenda de teste");
  if (aviso) writeFileSync(join(p, "story-aviso.mp4"), "mp4");
  return p;
}

export function criarPastaReel(raiz, nome, { tipo = "corte" } = {}) {
  const p = join(raiz, "instagram", nome);
  mkdirSync(p, { recursive: true });
  writeFileSync(join(p, "reel.json"), JSON.stringify({ tipo }));
  writeFileSync(join(p, "reel.mp4"), "mp4");
  writeFileSync(join(p, "reel-legenda.txt"), "legenda do reel");
  return p;
}

export function criarPastaStories(raiz, nome, { publicacao = "api", n = 2 } = {}) {
  const p = join(raiz, "instagram", nome);
  mkdirSync(p, { recursive: true });
  writeFileSync(join(p, "stories.json"), JSON.stringify({ publicacao, stories: Array.from({ length: n }, () => ({})) }));
  for (let i = 1; i <= n; i++) writeFileSync(join(p, `story-${String(i).padStart(2, "0")}.mp4`), "mp4");
  return p;
}

export const item = (sobre = {}) => ({ id: "x:post", pasta: "instagram/x", formato: "post", quando: null, aprovado: false, estado: "rascunho", feitos: [], tentativas: 0, ajuste: null, resultado: null, erro: null, ...sobre });
