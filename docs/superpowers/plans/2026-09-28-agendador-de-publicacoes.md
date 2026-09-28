# Agendador de publicações do Instagram (nuvem) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar 40 a 50 conteúdos do Instagram (posts, sequências de stories sem sticker, reels) aprovados de uma vez e publicados sozinhos, um por dia, no horário certo, por um workflow do GitHub Actions — sem depender do Mac ligado.

**Architecture:** Um arquivo `instagram/agenda.json` (na branch `master`) é a fila: um item por (pasta, formato) com data, estado e aprovação. Os arquivos aprovados (cards, MP4, legendas, Checagem) esperam num branch `fila` (commit órfão pela API do GitHub, mesmo desenho do branch `midia`). Um workflow roda a cada 30 min, baixa o branch `fila`, publica o que venceu com as funções que já existem em `scripts/instagram.mjs`, grava o estado de volta em `agenda.json` e esvazia a fila do que saiu. Renderizar continua no Mac; só publicar vai para a nuvem. Uma página local (`--revisar`) faz a aprovação de todos os itens de uma vez.

**Tech Stack:** Node ≥ 22 (`node --test`, ESM `.mjs`, `fetch` nativo), GitHub Actions (`schedule` + `workflow_dispatch`), API REST do GitHub (Git Data), Graph API do Instagram (já usada), CLI `gh` (só na configuração inicial, no Mac).

**Spec:** não há arquivo de spec; o desenho foi fechado em conversa (sessão de 2026-09-28, skill `grilling`) e está resumido em `docs/adr/0010-agendador-na-nuvem.md` (criado na Task 1). Vocabulário novo: `CONTEXT.md` (Agenda, Fila, Semana-modelo, Revisão).

## Global Constraints

- Todo texto voltado ao usuário (README, SKILL.md, mensagens de erro, página de revisão) em português, para leitor que **não sabe programar**: passos numerados, comando exato, o que esperar na tela.
- **Custo zero**: só GitHub Actions (grátis em repositório público) e a API da Meta. Nenhum serviço pago.
- Scripts no estilo dos existentes: ESM, comentários em português, exportam funções + bloco CLI protegido por `import.meta.url === pathToFileURL(process.argv[1]).href`, erros de uso saem como `erro: …` com `process.exit(1)`, dependências externas injetáveis (`fetchImpl`, `executar`, `gh`) para os testes.
- Não alterar as fixtures `videos/folgas-complementares/` e `instagram/2026-09-20-kruskal-1956/` (só leitura nos testes). Não editar `design-system/tokens.json`/`tokens.css`.
- Upload de vídeo do YouTube continua sempre privado (ADR 0003); esta feature só toca o Instagram.
- ADR 0009: `artigo` e `curiosidade` não publicam sem `checagem.json`. Aqui a regra é **mais forte**: a agenda recusa **adicionar** o item e o publicador recusa **rodar** sem ela. Sequência de stories e reel de cenas também exigem `checagem.json`.
- Story de vídeo novo e sequência com sticker continuam manuais (ADR 0007): a agenda recusa `stories.json` sem `"publicacao": "api"`.
- Fuso: Brasília fixo, `-03:00` (sem horário de verão desde 2019). `quando` é sempre ISO com deslocamento: `2026-10-05T12:00:00-03:00`.
- Janela de atraso: publica o que venceu há **até 6 h**; depois marca `perdido` e avisa. Tentativas por item: **3** (1 + 2 novas), 60 s entre elas.
- Semana-modelo padrão (arquivo `instagram/agenda-modelo.json`): seg/qua/sex reel 12:00; ter/qui/dom post 12:00; sáb stories 18:00.
- Branch principal é `master`. Commits terminam com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

Modos de falha que a spec implica mas nenhuma tarefa "óbvia" cobriria; cada linha tem o teste na tarefa dona:

1. **Publicou no Instagram mas o processo morreu antes de gravar o estado** → publicaria em dobro na rodada seguinte. Teste (Task 6): `salvar` roda logo após **cada** etapa; o workflow tem `concurrency` (Task 9).
2. **Post e reel na mesma pasta** (pacote): publicar o post não pode apagar do branch `fila` a mídia do reel que ainda vai sair. Teste (Task 3): `pastasLiberadas`.
3. **Item vencido há mais de 6 h** (ex.: workflow desligado por dias) não publica o "post de segunda" na quarta. Teste (Task 6).
4. **Post saiu mas o story de aviso falhou**: a nova tentativa não pode republicar o post. Teste (Task 6): `feitos`.
5. **Item marcado `agendado` à mão sem `aprovado: true`**, ou `aprovado` mas ainda no futuro: não publica. Teste (Task 3): `devidos`.
6. **Token vencido / variável de ambiente faltando** no workflow: erro claro antes de tentar publicar qualquer coisa. Teste (Task 5).
7. **Pasta editada depois de enfileirada**: o que sai é o snapshot aprovado do branch `fila`; para mudar, `--reabrir` volta o item a rascunho e a aprovação é refeita. Teste (Task 3): `reabrir`.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `scripts/agenda.mjs` (novo) | Modelo de dados da agenda (ler/gravar, adicionar, distribuir, mover, devidos, status, reabrir, remover, `pastasLiberadas`), `enfileirar`, `configurarNuvem`, `enviarAgenda` e a CLI. Sem rede exceto via `gh` injetado. |
| `scripts/fila.mjs` (novo) | Branch `fila` pela API do GitHub: `arquivosDaFila`, `lerPastaParaFila`, `atualizarFila`. |
| `scripts/publicar-agenda.mjs` (novo) | O que o workflow roda: `executarAgenda` (puro, com publicadores injetados) + CLI (`--simular`). |
| `scripts/renovar-token.mjs` (novo) | `renovarParaNuvem`: renova o token do Instagram a partir de variáveis de ambiente e escreve o novo valor num arquivo. |
| `scripts/revisar.mjs` (novo) | Página local de revisão em bloco: `decidir`, `htmlDaRevisao`, servidor HTTP e CLI. |
| `scripts/instagram.mjs` (editar) | Exporta `RENOVAR_ABAIXO_DE`; novo `tokensDoAmbiente`. |
| `instagram/agenda-modelo.json` (novo) | Semana-modelo. |
| `instagram/agenda.json` (novo, `{ "itens": [] }`) | A fila. |
| `.github/workflows/publicar-agenda.yml` (novo) | Cron de 30 min. |
| `.github/workflows/renovar-token.yml` (novo) | Cron semanal de renovação. |
| `tests/ajudas-agenda.mjs` (novo, não é teste) | Fábricas de pastas/itens temporários. |
| `tests/agenda.test.mjs`, `tests/fila.test.mjs`, `tests/nuvem.test.mjs`, `tests/publicar-agenda.test.mjs`, `tests/revisar.test.mjs`, `tests/workflows.test.mjs` (novos) | Testes. |
| `docs/adr/0010-agendador-na-nuvem.md`, `CONTEXT.md`, `CLAUDE.md`, `README.md`, `.claude/skills/agendar/SKILL.md` | Documentação e skill. |

Convenção de teste: `node --test` só roda `*.test.mjs`, então `tests/ajudas-agenda.mjs` não roda sozinho.

---

### Task 1: ADR 0010 e vocabulário

**Files:**
- Create: `docs/adr/0010-agendador-na-nuvem.md`
- Modify: `CONTEXT.md` (novos termos depois de **Mídia temporária**; ajustar **Post**)
- Modify: `docs/adr/0005-midia-do-instagram-no-branch-midia.md`, `docs/adr/0006-tokens-do-instagram-em-arquivo.md` (uma linha de "ver também")

- [ ] **Step 1: Escrever o ADR**

Criar `docs/adr/0010-agendador-na-nuvem.md`:

```md
# Publicações agendadas rodam no GitHub Actions, com a fila num branch `fila` e os tokens em Secrets

A API do Instagram não agenda: publica na hora. Para deixar dezenas de conteúdos prontos e saírem um por dia sem o Mac ligado, um workflow do GitHub Actions (cron de 30 min) lê `instagram/agenda.json`, baixa a mídia aprovada do branch `fila` e chama as mesmas funções de `scripts/instagram.mjs` que a publicação manual usa. Alternativas descartadas: agendador local (launchd/cron) — depende do Mac ligado; ferramenta de terceiros (Meta Business Suite, Buffer) — tira a Checagem e o controle do pipeline; regerar a mídia na nuvem — fontes e render mudam entre Mac e Linux (o que a pessoa aprovou não seria o que sai) e o `yt-dlp` costuma ser bloqueado em servidores.

Consequências que surpreendem quem só lê o código:
- O repositório é público, então o conteúdo aprovado fica visível no branch `fila` antes da hora. Aceito: é conteúdo educativo que vai ser público de qualquer jeito. O branch é um commit órfão reescrito com força (sem histórico) e perde a pasta de cada item quando ele sai.
- Os tokens do ADR 0006 continuam em `~/.po-para-todos/instagram.json` no Mac, mas na nuvem vêm de Secrets/Variables do repositório (`IG_ACCESS_TOKEN`, `IG_ID`, `IG_USUARIO`, `IG_EXPIRA_EM`; o token do GitHub é o `GITHUB_TOKEN` do próprio workflow). Um workflow semanal renova o token de 60 dias e regrava o Secret, usando um token pessoal do GitHub (`SEGREDOS_PAT`) com permissão de escrever Secrets e Variables.
- O cron do GitHub pode atrasar minutos; a janela de tolerância é de 6 h, depois disso o item vira `perdido` e o workflow falha (e-mail do GitHub) em vez de publicar fora de hora.
- A aprovação é em bloco (`scripts/revisar.mjs`), item a item registrada em `agenda.json`; o agendador recusa item sem `aprovado: true`. A regra do ADR 0009 vale na hora de adicionar à agenda e na hora de publicar.
```

- [ ] **Step 2: Vocabulário em `CONTEXT.md`**

Depois do bloco **Mídia temporária**, acrescentar:

```md
**Agenda**:
`instagram/agenda.json`: a lista de conteúdos do Instagram que esperam a hora de sair. Um item por pasta e formato (`post`, `stories` ou `reel`), com data e hora (`quando`), aprovação e estado (`rascunho`, `agendado`, `publicado`, `falhou`, `perdido`). A data da agenda manda; o nome da pasta não é mais o calendário.
_Avoid_: calendário, cronograma

**Fila**:
Branch `fila` do repositório: guarda os arquivos aprovados dos itens `agendado` (cards, MP4, legendas, Checagem) até o workflow publicar. Cada pasta sai dela quando nenhum item da pasta está mais `agendado`, `falhou` ou `perdido`.
_Avoid_: staging, buffer

**Semana-modelo**:
`instagram/agenda-modelo.json`: que formato sai em cada dia da semana e a que horas (padrão: reels seg/qua/sex, posts ter/qui/dom, quiz de stories no sábado). `--distribuir` preenche a agenda a partir dela.
_Avoid_: grade, template

**Revisão**:
Página local (`npm run revisar`) que mostra todos os itens em rascunho, com mídia, legenda e resumo da Checagem, para a pessoa aprovar, pedir ajuste ou tirar da agenda de uma vez.
_Avoid_: lote (já é o pacote)
```

Na entrada **Post**, trocar "(a data é a de publicação prevista: a pasta é um calendário)" por "(a data no nome é a de criação; quando sai é decidido pela Agenda)".

- [ ] **Step 3: "Ver também" nos ADRs 0005 e 0006**

Acrescentar ao fim de cada um a linha:
`Ver também: ADR 0010 — na publicação agendada a mídia aprovada espera no branch `fila` e os tokens vêm de Secrets do GitHub.`

- [ ] **Step 4: Commit**

```bash
git add docs/adr CONTEXT.md
git commit -m "Agendador na nuvem: ADR 0010 e vocabulário (Agenda, Fila, Semana-modelo, Revisão)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Agenda — dados, verificação e `adicionar`

**Files:**
- Create: `scripts/agenda.mjs` (parte 1)
- Create: `tests/ajudas-agenda.mjs`
- Test: `tests/agenda.test.mjs`

**Interfaces:**
- Consumes: `precisaChecagem`, `carregarChecagem`, `ErroChecagem` de `scripts/checagem.mjs`.
- Produces (exports de `scripts/agenda.mjs`): `RAIZ`, `ARQUIVO_AGENDA`, `ARQUIVO_MODELO`, `FORMATOS`, `JANELA_HORAS`, `ErroAgenda`, `lerAgenda(arquivo?) → {itens}`, `gravarAgenda(agenda, arquivo?)`, `formatosDaPasta(pastaAbs) → string[]`, `verificarPasta(pastaAbs, formato) → string[] (avisos)`, `pastaRelativa(pasta, raiz?) → "instagram/<nome>"`, `adicionar(agenda, pasta, {raiz?}) → {novos, avisos, erros}`.
- Formato do item: `{ id: "<nome-da-pasta>:<formato>", pasta: "instagram/<nome>", formato, quando: null|string, aprovado: false, estado: "rascunho", feitos: [], tentativas: 0, ajuste: null, resultado: null, erro: null }`.

- [ ] **Step 1: Ajudas de teste**

Criar `tests/ajudas-agenda.mjs`:

```js
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
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `tests/agenda.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAIZ, ErroAgenda, lerAgenda, gravarAgenda, formatosDaPasta, verificarPasta, pastaRelativa, adicionar } from "../scripts/agenda.mjs";
import { raizTemporaria, criarPastaPost, criarPastaReel, criarPastaStories } from "./ajudas-agenda.mjs";

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
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/agenda.test.mjs`
Expected: FAIL (`Cannot find module '../scripts/agenda.mjs'`).

- [ ] **Step 4: Implementar a parte 1 de `scripts/agenda.mjs`**

```js
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
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test tests/agenda.test.mjs`
Expected: PASS (todos). Se o teste do Kruskal falhar por causa de o número de avisos, confira que a fixture não tem `story-aviso.mp4` (não tem: gerado só na hora de publicar).

- [ ] **Step 6: Commit**

```bash
git add scripts/agenda.mjs tests/agenda.test.mjs tests/ajudas-agenda.mjs
git commit -m "Agenda: modelo de dados, verificação de pasta e adicionar" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Agenda — distribuir, mover, devidos, status, reabrir, remover

**Files:**
- Modify: `scripts/agenda.mjs` (acrescentar)
- Create: `instagram/agenda-modelo.json`, `instagram/agenda.json`
- Test: `tests/agenda.test.mjs` (acrescentar)

**Interfaces:**
- Consumes: itens do formato definido na Task 2.
- Produces: `lerModelo(arquivo?)`, `validarModelo(modelo)`, `distribuir(agenda, modelo, inicio) → item[]`, `mover(agenda, id, quandoLocal, {agora?, fuso}) → item`, `devidos(agenda, agora) → item[]`, `passouDaJanela(item, agora) → boolean`, `pastasLiberadas(agenda, pastas) → string[]`, `reabrir(agenda, id) → item`, `remover(agenda, id) → item`, `statusTexto(agenda) → string`.

- [ ] **Step 1: Criar os arquivos de dados**

`instagram/agenda-modelo.json`:

```json
{
  "fuso": "-03:00",
  "semana": {
    "seg": { "reel": "12:00" },
    "ter": { "post": "12:00" },
    "qua": { "reel": "12:00" },
    "qui": { "post": "12:00" },
    "sex": { "reel": "12:00" },
    "sab": { "stories": "18:00" },
    "dom": { "post": "12:00" }
  }
}
```

`instagram/agenda.json`:

```json
{
  "itens": []
}
```

- [ ] **Step 2: Testes que falham** (acrescentar ao fim de `tests/agenda.test.mjs`; acrescentar também ao import do topo `lerModelo, validarModelo, distribuir, mover, devidos, passouDaJanela, pastasLiberadas, reabrir, remover, statusTexto, ARQUIVO_MODELO` de `../scripts/agenda.mjs` e `item` de `./ajudas-agenda.mjs`)

```js
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
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/agenda.test.mjs`
Expected: FAIL (`validarModelo`/… não exportados).

- [ ] **Step 4: Implementar** (acrescentar a `scripts/agenda.mjs`, antes de qualquer bloco de CLI)

```js
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
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test tests/agenda.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/agenda.mjs tests/agenda.test.mjs instagram/agenda-modelo.json instagram/agenda.json
git commit -m "Agenda: distribuir pela semana-modelo, mover, reabrir, remover, devidos e status" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Branch `fila` (`scripts/fila.mjs`)

**Files:**
- Create: `scripts/fila.mjs`
- Test: `tests/fila.test.mjs`

**Interfaces:**
- Consumes: um objeto `gh` com `pedir(metodo, caminho, corpo)` e `status(caminho)` — o mesmo que devolve `criarApiGithub` de `scripts/instagram.mjs`.
- Produces: `BRANCH_FILA = "fila"`, `arquivosDaFila(pastaAbs) → {nome, caminho}[]`, `lerPastaParaFila(pastaAbs) → {nome, conteudo: Buffer}[]`, `atualizarFila(gh, {branch?}, {subir, tirar}) → sha|null`, onde `subir` é `[{ pasta: "instagram/x", arquivos: [{nome, conteudo}] }]` e `tirar` é `["instagram/y"]`.

- [ ] **Step 1: Testes que falham**

Criar `tests/fila.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { arquivosDaFila, lerPastaParaFila, atualizarFila, BRANCH_FILA } from "../scripts/fila.mjs";

// gh falso: `existe` diz se o branch já existe; `arvore` é a lista de arquivos que ele já tem
function ghFalso({ existe = false, arvore = [] } = {}) {
  const chamadas = [];
  let n = 0;
  return {
    chamadas,
    async status(caminho) { chamadas.push({ metodo: "STATUS", caminho }); return existe ? 200 : 404; },
    async pedir(metodo, caminho, corpo) {
      chamadas.push({ metodo, caminho, corpo });
      if (metodo === "GET" && caminho.startsWith("/git/ref/")) return { object: { sha: "c1" } };
      if (metodo === "GET" && caminho.startsWith("/git/commits/")) return { tree: { sha: "t1" } };
      if (metodo === "GET" && caminho.startsWith("/git/trees/")) return { tree: arvore.map((path) => ({ path, type: "blob" })) };
      if (metodo === "POST" && caminho === "/git/blobs") return { sha: `blob${++n}` };
      if (metodo === "POST" && caminho === "/git/trees") return { sha: "t2" };
      if (metodo === "POST" && caminho === "/git/commits") return { sha: "c2" };
      return {};
    },
  };
}
const achar = (gh, metodo, caminho) => gh.chamadas.find((c) => c.metodo === metodo && c.caminho === caminho);

test("arquivosDaFila leva cards, MP4, legendas e JSONs — e deixa de fora os intermediários", () => {
  const p = mkdtempSync(join(tmpdir(), "fila-"));
  for (const n of ["card-01.png", "story-01.mp4", "story-aviso.mp4", "reel.mp4", "cards.json", "legenda.txt", "checagem.json", "post.md", "reel-cena-01.mp4", "corte-bruto.mp4", "card-01.html", "story-01.png", "lista-cenas.txt.bak"]) writeFileSync(join(p, n), "x");
  assert.deepEqual(arquivosDaFila(p).map((a) => a.nome), ["card-01.png", "cards.json", "checagem.json", "legenda.txt", "post.md", "reel.mp4", "story-01.mp4", "story-aviso.mp4"]);
});

test("lerPastaParaFila devolve o conteúdo em Buffer", () => {
  const p = mkdtempSync(join(tmpdir(), "fila-"));
  writeFileSync(join(p, "legenda.txt"), "oi");
  const [a] = lerPastaParaFila(p);
  assert.equal(a.nome, "legenda.txt");
  assert.equal(a.conteudo.toString(), "oi");
});

test("atualizarFila: branch novo nasce órfão, com README e os arquivos nos caminhos instagram/<pasta>/<nome>", async () => {
  const gh = ghFalso({ existe: false });
  const sha = await atualizarFila(gh, {}, { subir: [{ pasta: "instagram/x", arquivos: [{ nome: "card-01.png", conteudo: Buffer.from("a") }] }], tirar: [] });
  assert.equal(sha, "c2");
  const arvore = achar(gh, "POST", "/git/trees").corpo;
  assert.equal(arvore.base_tree, undefined);
  assert.deepEqual(arvore.tree.map((e) => e.path), ["README.md", "instagram/x/card-01.png"]);
  assert.deepEqual(achar(gh, "POST", "/git/commits").corpo.parents, []);
  assert.ok(achar(gh, "POST", "/git/refs"), "cria o branch");
  assert.equal(achar(gh, "POST", "/git/refs").corpo.ref, `refs/heads/${BRANCH_FILA}`);
});

test("atualizarFila: branch existente usa base_tree, apaga o que saiu e o que sobrou da pasta atualizada, e reescreve o ref com força", async () => {
  const gh = ghFalso({ existe: true, arvore: ["README.md", "instagram/velha/card-01.png", "instagram/velha/legenda.txt", "instagram/x/card-01.png", "instagram/x/card-02.png", "instagram/y/reel.mp4"] });
  await atualizarFila(gh, {}, { subir: [{ pasta: "instagram/x", arquivos: [{ nome: "card-01.png", conteudo: Buffer.from("novo") }] }], tirar: ["instagram/velha"] });
  const { corpo } = achar(gh, "POST", "/git/trees");
  assert.equal(corpo.base_tree, "t1");
  const porCaminho = Object.fromEntries(corpo.tree.map((e) => [e.path, e.sha]));
  assert.equal(porCaminho["instagram/x/card-01.png"], "blob1");
  assert.equal(porCaminho["instagram/x/card-02.png"], null, "sobrou da versão antiga da pasta");
  assert.equal(porCaminho["instagram/velha/card-01.png"], null);
  assert.equal(porCaminho["instagram/velha/legenda.txt"], null);
  assert.ok(!("instagram/y/reel.mp4" in porCaminho), "pasta não citada fica quieta");
  assert.ok(!("README.md" in porCaminho));
  assert.deepEqual(achar(gh, "POST", "/git/commits").corpo.parents, []);
  const patch = achar(gh, "PATCH", `/git/refs/heads/${BRANCH_FILA}`);
  assert.equal(patch.corpo.force, true);
});

test("atualizarFila: pasta 'instagram/a' não apaga 'instagram/ab'; sem nada a fazer não cria commit", async () => {
  const gh = ghFalso({ existe: true, arvore: ["instagram/ab/card-01.png"] });
  assert.equal(await atualizarFila(gh, {}, { subir: [], tirar: ["instagram/a"] }), null);
  assert.equal(achar(gh, "POST", "/git/commits"), undefined);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/fila.test.mjs`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `scripts/fila.mjs`**

```js
// O branch `fila` (ADR 0010): guarda a mídia aprovada dos itens agendados até o workflow publicar.
// Mesmo desenho do branch `midia` (ADR 0005): commit órfão pela Git Data API, ref reescrito com força,
// sem histórico. Diferença: aqui ficam várias pastas ao mesmo tempo, em instagram/<pasta>/<arquivo>.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const BRANCH_FILA = "fila";
const README_FILA = "Branch temporário: guarda a mídia dos conteúdos do Instagram já aprovados que esperam a hora de sair (ver docs/adr/0010). Cada pasta some daqui quando o conteúdo é publicado.\n";

// O que compõe o "snapshot aprovado" de uma pasta. Ficam de fora HTML, PNG de story, cenas e cortes brutos.
const PADROES = [/^card-\d+\.png$/, /^story-\d+\.mp4$/, /^story-aviso\.mp4$/, /^reel\.mp4$/, /\.(json|txt|md)$/];

export function arquivosDaFila(pasta) {
  return readdirSync(pasta)
    .filter((nome) => PADROES.some((p) => p.test(nome)))
    .sort()
    .map((nome) => ({ nome, caminho: join(pasta, nome) }));
}

export const lerPastaParaFila = (pasta) => arquivosDaFila(pasta).map(({ nome, caminho }) => ({ nome, conteudo: readFileSync(caminho) }));

// subir: [{ pasta: "instagram/x", arquivos: [{ nome, conteudo }] }] — substitui tudo o que a fila tinha dessas pastas.
// tirar: ["instagram/y"] — apaga essas pastas. Devolve o SHA do novo commit, ou null se não havia nada a fazer.
export async function atualizarFila(gh, { branch = BRANCH_FILA } = {}, { subir = [], tirar = [] } = {}) {
  let arvoreBase = null;
  if ((await gh.status(`/git/ref/heads/${branch}`)) === 200) {
    const ref = await gh.pedir("GET", `/git/ref/heads/${branch}`);
    arvoreBase = (await gh.pedir("GET", `/git/commits/${ref.object.sha}`)).tree.sha;
  }
  const existentes = arvoreBase ? (await gh.pedir("GET", `/git/trees/${arvoreBase}?recursive=1`)).tree.filter((e) => e.type === "blob").map((e) => e.path) : [];
  const tree = [];
  if (!arvoreBase && subir.length) tree.push({ path: "README.md", mode: "100644", type: "blob", content: README_FILA });
  const novos = new Set();
  for (const { pasta, arquivos } of subir) {
    for (const { nome, conteudo } of arquivos) {
      const path = `${pasta}/${nome}`;
      novos.add(path);
      const blob = await gh.pedir("POST", "/git/blobs", { content: conteudo.toString("base64"), encoding: "base64" });
      tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
    }
  }
  const afetadas = [...subir.map((s) => s.pasta), ...tirar];
  for (const path of existentes) {
    if (!novos.has(path) && afetadas.some((p) => path.startsWith(`${p}/`))) tree.push({ path, mode: "100644", type: "blob", sha: null });
  }
  if (!tree.length) return null;
  const arvore = await gh.pedir("POST", "/git/trees", arvoreBase ? { base_tree: arvoreBase, tree } : { tree });
  const commit = await gh.pedir("POST", "/git/commits", { message: `fila: ${subir.length} pasta(s) subiu, ${tirar.length} saiu`, tree: arvore.sha, parents: [] });
  if (arvoreBase) await gh.pedir("PATCH", `/git/refs/heads/${branch}`, { sha: commit.sha, force: true });
  else await gh.pedir("POST", "/git/refs", { ref: `refs/heads/${branch}`, sha: commit.sha });
  return commit.sha;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/fila.test.mjs`
Expected: PASS. (O teste do último caso: `tree` ficaria vazio porque `instagram/ab/...` não começa com `instagram/a/` — retorna `null`.)

- [ ] **Step 5: Commit**

```bash
git add scripts/fila.mjs tests/fila.test.mjs
git commit -m "Fila: branch fila pela API do GitHub (subir, substituir e tirar pastas)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Tokens na nuvem (`tokensDoAmbiente`) e renovação

**Files:**
- Modify: `scripts/instagram.mjs` (exportar `RENOVAR_ABAIXO_DE`; novo `tokensDoAmbiente`)
- Create: `scripts/renovar-token.mjs`
- Test: `tests/nuvem.test.mjs`

**Interfaces:**
- Consumes: `renovarSeNecessario`, `diasRestantes`, `ErroInstagram` de `scripts/instagram.mjs`.
- Produces: `tokensDoAmbiente(env?, {exigirGithub?}) → { instagram: {access_token, usuario, ig_id, expira_em}, github_token? }`; `renovarParaNuvem(env, {fetchImpl?, agora?, avisar?}) → {access_token, expira_em} | null`.

- [ ] **Step 1: Testes que falham**

Criar `tests/nuvem.test.mjs`:

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/nuvem.test.mjs`
Expected: FAIL (`tokensDoAmbiente` não exportado).

- [ ] **Step 3: Editar `scripts/instagram.mjs`**

Trocar a linha `const RENOVAR_ABAIXO_DE = 30;     // dias` por `export const RENOVAR_ABAIXO_DE = 30;     // dias`.

Depois de `gravarTokens` (próximo à linha 47), acrescentar:

```js
// Na nuvem (GitHub Actions) não há ~/.po-para-todos: os tokens vêm de Secrets/Variables (ADR 0010).
export function tokensDoAmbiente(env = process.env, { exigirGithub = true } = {}) {
  const obrigatorias = ["IG_ACCESS_TOKEN", "IG_ID", "IG_USUARIO", "IG_EXPIRA_EM", ...(exigirGithub ? ["GITHUB_TOKEN"] : [])];
  const falta = obrigatorias.filter((n) => !env[n]);
  if (falta.length) throw new ErroInstagram(`faltam variáveis do GitHub: ${falta.join(", ")} — rode: node scripts/agenda.mjs --configurar-nuvem (README, "Publicar na nuvem")`);
  const tokens = { instagram: { access_token: env.IG_ACCESS_TOKEN, usuario: env.IG_USUARIO, ig_id: String(env.IG_ID), expira_em: env.IG_EXPIRA_EM } };
  if (env.GITHUB_TOKEN) tokens.github_token = env.GITHUB_TOKEN;
  return tokens;
}
```

- [ ] **Step 4: Criar `scripts/renovar-token.mjs`**

```js
#!/usr/bin/env node
// Renova o token do Instagram (60 dias) na nuvem. Roda toda semana pelo workflow renovar-token.yml:
// se faltam menos de 30 dias, pede um novo à Meta e escreve {access_token, expira_em} no arquivo dado;
// o workflow então grava o valor nos Secrets. Se a Meta recusar, sai com erro (o workflow fica vermelho e o GitHub avisa por e-mail).
//
//   node scripts/renovar-token.mjs <arquivo-de-saida.json>

import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tokensDoAmbiente, renovarSeNecessario, diasRestantes, RENOVAR_ABAIXO_DE, ErroInstagram } from "./instagram.mjs";

export async function renovarParaNuvem(env, { fetchImpl = fetch, agora = Date.now(), avisar = console.error } = {}) {
  const tokens = tokensDoAmbiente(env, { exigirGithub: false });
  if (diasRestantes(tokens.instagram, agora) >= RENOVAR_ABAIXO_DE) return null;
  // renovarSeNecessario grava o resultado num arquivo; aqui é um arquivo descartável, o valor sai pelo retorno.
  const arquivo = join(mkdtempSync(join(tmpdir(), "renovar-")), "instagram.json");
  const novos = await renovarSeNecessario(tokens, { fetchImpl, agora, arquivo, avisar });
  if (novos.instagram.access_token === tokens.instagram.access_token) {
    throw new ErroInstagram("não consegui renovar o token do Instagram (a Meta recusou) — gere outro e rode: node scripts/instagram.mjs --token \"<token>\" e depois node scripts/agenda.mjs --configurar-nuvem");
  }
  return { access_token: novos.instagram.access_token, expira_em: novos.instagram.expira_em };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const saida = process.argv[2];
  if (!saida) { console.error("uso: node scripts/renovar-token.mjs <arquivo-de-saida.json>"); process.exit(1); }
  try {
    const r = await renovarParaNuvem(process.env);
    if (!r) console.log("o token do Instagram ainda vale mais de 30 dias — nada a renovar");
    else { writeFileSync(saida, JSON.stringify(r)); console.log(`token renovado; vale até ${r.expira_em.slice(0, 10)}`); }
  } catch (e) {
    if (e instanceof ErroInstagram) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

- [ ] **Step 5: Rodar e ver passar; rodar a suíte de Instagram para garantir que nada quebrou**

Run: `node --test tests/nuvem.test.mjs tests/instagram.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/instagram.mjs scripts/renovar-token.mjs tests/nuvem.test.mjs
git commit -m "Tokens na nuvem: tokensDoAmbiente e renovação semanal do token do Instagram" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: O publicador (`scripts/publicar-agenda.mjs`)

**Files:**
- Create: `scripts/publicar-agenda.mjs`
- Test: `tests/publicar-agenda.test.mjs`

**Interfaces:**
- Consumes: `devidos`, `passouDaJanela`, `pastasLiberadas`, `lerAgenda`, `gravarAgenda`, `RAIZ`, `JANELA_HORAS` (Task 3); `tokensDoAmbiente`, `diasRestantes`, `criarApiGithub`, `publicarPost`, `publicarStory`, `publicarStories`, `publicarReel`, `ErroInstagram` (instagram.mjs); `atualizarFila` (Task 4).
- Produces: `TENTATIVAS = 3`, `ESPERA_MS = 60000`, `etapasDe(item, temAviso) → string[]`, `executarAgenda(agenda, { agora, publicadores, temAviso, dormir, log, salvar }) → { publicados: string[], falhas: string[], perdidos: string[] }`. `publicadores` é `{ post, "story-aviso", stories, reel }`, cada um `async (pastaAbs) → registro`.

- [ ] **Step 1: Testes que falham**

Criar `tests/publicar-agenda.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { executarAgenda, etapasDe, TENTATIVAS } from "../scripts/publicar-agenda.mjs";
import { item } from "./ajudas-agenda.mjs";

const AGORA = Date.parse("2026-10-05T15:00:00Z"); // 12:00 em Brasília
const devido = (sobre = {}) => item({ id: "a:post", pasta: "instagram/a", estado: "agendado", aprovado: true, quando: "2026-10-05T12:00:00-03:00", ...sobre });

// publicadores falsos que registram a ordem das chamadas; `falhas[etapa]` = quantas vezes falhar antes de funcionar
function montar({ falhas = {} } = {}) {
  const chamadas = [];
  const restantes = { ...falhas };
  const fazer = (etapa, registro) => async (pasta) => {
    chamadas.push(etapa);
    if ((restantes[etapa] ?? 0) > 0) { restantes[etapa]--; throw new Error(`${etapa} recusado pela Meta`); }
    return registro;
  };
  return {
    chamadas,
    publicadores: {
      post: fazer("post", { url: "https://instagram.com/p/x", media_id: "1" }),
      "story-aviso": fazer("story-aviso", { arquivo: "story-aviso.mp4", media_id: "2" }),
      stories: fazer("stories", { publicados: [{ media_id: "3" }, { media_id: "4" }] }),
      reel: fazer("reel", { url: "https://instagram.com/reel/y", media_id: "5" }),
    },
  };
}
const rodar = async (agenda, publicadores, extra = {}) => {
  const salvos = [];
  const r = await executarAgenda(agenda, { agora: AGORA, publicadores, temAviso: () => true, dormir: async () => {}, log: () => {}, salvar: async (a) => salvos.push(JSON.stringify(a)), ...extra });
  return { r, salvos };
};

test("etapasDe: post com aviso tem duas etapas; os outros formatos, uma", () => {
  assert.deepEqual(etapasDe(item({ formato: "post" }), () => true), ["post", "story-aviso"]);
  assert.deepEqual(etapasDe(item({ formato: "post" }), () => false), ["post"]);
  assert.deepEqual(etapasDe(item({ formato: "reel" }), () => true), ["reel"]);
  assert.deepEqual(etapasDe(item({ formato: "stories" }), () => true), ["stories"]);
});

test("publica o post e depois o story de aviso, marca publicado e guarda o link", async () => {
  const a = devido();
  const { chamadas, publicadores } = montar();
  const { r } = await rodar({ itens: [a] }, publicadores);
  assert.deepEqual(chamadas, ["post", "story-aviso"]);
  assert.equal(a.estado, "publicado");
  assert.deepEqual(a.feitos, ["post", "story-aviso"]);
  assert.equal(a.resultado.url, "https://instagram.com/p/x");
  assert.equal(a.erro, null);
  assert.deepEqual(r, { publicados: ["a:post"], falhas: [], perdidos: [] });
});

test("grava o estado logo depois de CADA etapa (para não publicar em dobro se o processo morrer)", async () => {
  const a = devido();
  const { publicadores } = montar();
  const { salvos } = await rodar({ itens: [a] }, publicadores);
  const feitosEmCadaSalvamento = salvos.map((s) => JSON.parse(s).itens[0].feitos.length);
  assert.deepEqual(feitosEmCadaSalvamento.slice(0, 2), [1, 2], "um salvamento depois do post, outro depois do aviso");
  assert.equal(JSON.parse(salvos.at(-1)).itens[0].estado, "publicado");
});

test("reel e sequência de stories publicam com uma etapa só", async () => {
  const reel = devido({ id: "r:reel", formato: "reel", pasta: "instagram/r" });
  const seq = devido({ id: "s:stories", formato: "stories", pasta: "instagram/s", quando: "2026-10-05T11:00:00-03:00" });
  const { chamadas, publicadores } = montar();
  await rodar({ itens: [reel, seq] }, publicadores);
  assert.deepEqual(chamadas, ["stories", "reel"], "o mais antigo primeiro");
  assert.deepEqual(seq.resultado.media_ids, ["3", "4"]);
});

test("falha passageira: tenta de novo, espera entre as tentativas e acaba publicando", async () => {
  const a = devido({ formato: "reel", id: "a:reel" });
  const { chamadas, publicadores } = montar({ falhas: { reel: 1 } });
  const esperas = [];
  const { r } = await rodar({ itens: [a] }, publicadores, { dormir: async (ms) => esperas.push(ms) });
  assert.deepEqual(chamadas, ["reel", "reel"]);
  assert.equal(a.estado, "publicado");
  assert.equal(a.tentativas, 2);
  assert.deepEqual(esperas, [60_000]);
  assert.deepEqual(r.publicados, ["a:reel"]);
});

test("falha em todas as tentativas: vira falhou, guarda o erro e entra em falhas", async () => {
  const a = devido({ formato: "reel", id: "a:reel" });
  const { chamadas, publicadores } = montar({ falhas: { reel: 99 } });
  const { r } = await rodar({ itens: [a] }, publicadores);
  assert.equal(chamadas.length, TENTATIVAS);
  assert.equal(a.estado, "falhou");
  assert.match(a.erro, /reel recusado pela Meta/);
  assert.deepEqual(r, { publicados: [], falhas: ["a:reel"], perdidos: [] });
});

test("post saiu e o story de aviso falhou: a nova tentativa NÃO republica o post", async () => {
  const a = devido();
  const { chamadas, publicadores } = montar({ falhas: { "story-aviso": 1 } });
  await rodar({ itens: [a] }, publicadores);
  assert.deepEqual(chamadas, ["post", "story-aviso", "story-aviso"]);
  assert.equal(a.estado, "publicado");
});

test("post saiu e o aviso falha sempre: fica falhou, mas registra que o post já está no ar", async () => {
  const a = devido();
  const { chamadas, publicadores } = montar({ falhas: { "story-aviso": 99 } });
  await rodar({ itens: [a] }, publicadores);
  assert.equal(chamadas.filter((c) => c === "post").length, 1);
  assert.equal(a.estado, "falhou");
  assert.deepEqual(a.feitos, ["post"]);
});

test("vencido há mais de 6 h: não publica, vira perdido e avisa", async () => {
  const a = devido({ quando: "2026-10-05T04:00:00-03:00" }); // 11 h antes de AGORA
  const { chamadas, publicadores } = montar();
  const { r } = await rodar({ itens: [a] }, publicadores);
  assert.deepEqual(chamadas, []);
  assert.equal(a.estado, "perdido");
  assert.match(a.erro, /6 h/);
  assert.deepEqual(r.perdidos, ["a:post"]);
});

test("rascunho, sem aprovação, futuro ou já publicado: ninguém é publicado", async () => {
  const itens = [
    devido({ id: "1:post", estado: "rascunho" }),
    devido({ id: "2:post", aprovado: false }),
    devido({ id: "3:post", quando: "2026-10-05T13:00:00-03:00" }),
    devido({ id: "4:post", estado: "publicado" }),
  ];
  const { chamadas, publicadores } = montar();
  const { r } = await rodar({ itens }, publicadores);
  assert.deepEqual(chamadas, []);
  assert.deepEqual(r, { publicados: [], falhas: [], perdidos: [] });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/publicar-agenda.test.mjs`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `scripts/publicar-agenda.mjs`**

```js
#!/usr/bin/env node
// O que o workflow publicar-agenda.yml roda a cada 30 min (ADR 0010): publica os itens da agenda que
// venceram e estão aprovados, com as mesmas funções da publicação manual. Sai com erro se algum item
// falhou ou perdeu a janela de 6 h — é assim que o GitHub avisa por e-mail.
//
//   node scripts/publicar-agenda.mjs             publica de verdade (precisa das variáveis IG_* e GITHUB_TOKEN)
//   node scripts/publicar-agenda.mjs --simular   só mostra o que seria publicado; não chama a Meta nem grava nada

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RAIZ, JANELA_HORAS, lerAgenda, gravarAgenda, devidos, passouDaJanela, pastasLiberadas } from "./agenda.mjs";
import { tokensDoAmbiente, diasRestantes, criarApiGithub, publicarPost, publicarStory, publicarStories, publicarReel, ErroInstagram } from "./instagram.mjs";
import { atualizarFila } from "./fila.mjs";

export const TENTATIVAS = 3;
export const ESPERA_MS = 60_000;

export const etapasDe = (item, temAviso) => (item.formato === "post" ? ["post", ...(temAviso(item) ? ["story-aviso"] : [])] : [item.formato]);

function guardarResultado(item, etapa, registro) {
  if (etapa === "post" || etapa === "reel") item.resultado = { url: registro?.url ?? null, media_id: registro?.media_id ?? null };
  else if (etapa === "stories") item.resultado = { media_ids: (registro?.publicados ?? []).map((p) => p.media_id) };
}

// Percorre os itens vencidos, do mais antigo ao mais novo. Grava (salvar) depois de cada etapa publicada.
export async function executarAgenda(agenda, { agora, publicadores, temAviso, dormir, log, salvar }) {
  const resultado = { publicados: [], falhas: [], perdidos: [] };
  for (const item of devidos(agenda, agora)) {
    if (passouDaJanela(item, agora)) {
      Object.assign(item, { estado: "perdido", erro: `venceu em ${item.quando} e passou de ${JANELA_HORAS} h de atraso — não publiquei fora de hora; reagende com: node scripts/agenda.mjs --mover ${item.id} AAAA-MM-DDTHH:MM` });
      resultado.perdidos.push(item.id);
      log(`PERDIDO ${item.id}: passou de ${JANELA_HORAS} h de atraso`);
      await salvar(agenda);
      continue;
    }
    const pasta = resolve(RAIZ, item.pasta);
    const etapas = etapasDe(item, temAviso);
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      item.tentativas++;
      try {
        for (const etapa of etapas) {
          if (item.feitos.includes(etapa)) continue;
          log(`${item.id}: publicando (${etapa}), tentativa ${tentativa}…`);
          const registro = await publicadores[etapa](pasta);
          item.feitos.push(etapa);
          guardarResultado(item, etapa, registro);
          await salvar(agenda);
        }
        Object.assign(item, { estado: "publicado", erro: null });
        resultado.publicados.push(item.id);
        log(`${item.id}: publicado`);
        break;
      } catch (e) {
        item.erro = e.message;
        log(`${item.id}: falhou na tentativa ${tentativa}: ${e.message}`);
        if (tentativa < TENTATIVAS) await dormir(ESPERA_MS);
        else { item.estado = "falhou"; resultado.falhas.push(item.id); }
      }
    }
    await salvar(agenda);
  }
  return resultado;
}

// ---------- CLI ----------
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const simular = process.argv.includes("--simular");
  const agora = Date.now();
  const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
  try {
    const agenda = lerAgenda();
    let publicadores, tokens;
    if (simular) {
      publicadores = Object.fromEntries(["post", "story-aviso", "stories", "reel"].map((e) => [e, async (pasta) => { console.log(`  [simulado] ${e} de ${pasta}`); return { url: "(simulado)" }; }]));
    } else {
      tokens = tokensDoAmbiente();
      if (diasRestantes(tokens.instagram, agora) < 0) throw new ErroInstagram("o token do Instagram venceu — gere outro e rode: node scripts/instagram.mjs --token \"<token>\" e depois node scripts/agenda.mjs --configurar-nuvem");
      publicadores = {
        post: (p) => publicarPost(p, { tokens }),
        "story-aviso": (p) => publicarStory(p, "story-aviso.mp4", { tokens }),
        stories: (p) => publicarStories(p, { tokens }),
        reel: (p) => publicarReel(p, { tokens }),
      };
    }
    const vencidos = devidos(agenda, agora);
    console.log(vencidos.length ? `${vencidos.length} item(ns) vencido(s)${simular ? " (simulação)" : ""}` : "nada vencido — nada a publicar");
    const r = await executarAgenda(agenda, {
      agora, publicadores, dormir, log: console.log,
      temAviso: (i) => existsSync(join(RAIZ, i.pasta, "story-aviso.mp4")),
      salvar: async (a) => { if (!simular) gravarAgenda(a); },
    });
    if (!simular && r.publicados.length) {
      const pastas = [...new Set(agenda.itens.filter((i) => r.publicados.includes(i.id)).map((i) => i.pasta))];
      const liberadas = pastasLiberadas(agenda, pastas);
      if (liberadas.length) {
        try { await atualizarFila(criarApiGithub(tokens.github_token, canal.github), {}, { tirar: liberadas }); console.log(`fila: ${liberadas.join(", ")} saiu(saíram) do branch fila`); }
        catch (e) { console.error(`aviso: não consegui limpar o branch fila (${e.message}) — o próximo --enfileirar sobrescreve`); }
      }
    }
    if (r.falhas.length || r.perdidos.length) {
      console.error(`\natenção: falharam ${r.falhas.join(", ") || "nenhum"}; perdidos ${r.perdidos.join(", ") || "nenhum"}. Veja: node scripts/agenda.mjs --status`);
      process.exit(1);
    }
  } catch (e) {
    if (e instanceof ErroInstagram || e?.name === "ErroAgenda" || e?.constructor?.name === "ErroAgenda") { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/publicar-agenda.test.mjs`
Expected: PASS.

- [ ] **Step 5: Teste de fumaça da CLI em modo simulação (não toca na rede)**

Run: `node scripts/publicar-agenda.mjs --simular`
Expected: `nada vencido — nada a publicar` e código de saída 0 (a agenda de verdade está vazia).

- [ ] **Step 6: Commit**

```bash
git add scripts/publicar-agenda.mjs tests/publicar-agenda.test.mjs
git commit -m "Publicador da agenda: tentativas, janela de 6 h, estado gravado a cada etapa" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: CLI da agenda — enfileirar, enviar, atualizar, configurar-nuvem

**Files:**
- Modify: `scripts/agenda.mjs` (acrescentar `enfileirar`, `enviarAgenda`, `atualizarAgenda`, `configurarNuvem` e o bloco CLI)
- Modify: `package.json` (scripts `agenda` e `revisar`)
- Test: `tests/agenda.test.mjs` (acrescentar)

**Interfaces:**
- Consumes: `atualizarFila`, `lerPastaParaFila` (fila.mjs); `lerTokens`, `criarApiGithub` (instagram.mjs); tudo da Task 2 e 3.
- Produces: `enfileirar(agenda, gh, {raiz?}) → item[]` (muda rascunho aprovado com data para `agendado`), `enviarAgenda({executar, mensagem?})`, `atualizarAgenda({executar})`, `configurarNuvem(tokens, {repo, executar})`. `executar(comando, args, opcoes?)` é injetável (padrão `execFileSync`).

- [ ] **Step 1: Testes que falham** (acrescentar ao fim de `tests/agenda.test.mjs`; acrescentar `enfileirar, enviarAgenda, atualizarAgenda, configurarNuvem` ao import do topo)

```js
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

test("enviarAgenda: puxa, adiciona só os arquivos da agenda, commita e empurra", () => {
  const cmds = [];
  const executar = (cmd, args) => { cmds.push([cmd, ...args].join(" ")); return cmd === "git" && args[0] === "diff" ? (() => { throw new Error("mudou"); })() : ""; };
  enviarAgenda({ executar });
  assert.deepEqual(cmds, [
    "git pull --rebase --autostash",
    "git add instagram/agenda.json instagram/agenda-modelo.json",
    "git diff --cached --quiet",
    "git commit -m agenda: atualiza a fila de publicações -m Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>",
    "git push",
  ]);
});

test("enviarAgenda: sem mudanças não cria commit", () => {
  const cmds = [];
  enviarAgenda({ executar: (cmd, args) => { cmds.push([cmd, ...args].join(" ")); return ""; } });
  assert.ok(!cmds.some((c) => c.startsWith("git commit")));
  assert.ok(!cmds.some((c) => c === "git push"));
});

test("atualizarAgenda faz git pull --rebase --autostash", () => {
  const cmds = [];
  atualizarAgenda({ executar: (cmd, args) => { cmds.push([cmd, ...args].join(" ")); return ""; } });
  assert.deepEqual(cmds, ["git pull --rebase --autostash"]);
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/agenda.test.mjs`
Expected: FAIL (`enfileirar` etc. não exportados).

- [ ] **Step 3: Implementar** (acrescentar a `scripts/agenda.mjs`; ajustar os imports do topo)

No topo, acrescentar:

```js
import { execFileSync } from "node:child_process";
import { atualizarFila, lerPastaParaFila } from "./fila.mjs";
import { lerTokens, criarApiGithub, ErroInstagram } from "./instagram.mjs";
```

Depois do `statusTexto`:

```js
// ---------- fila e GitHub ----------
const COAUTOR = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";
const git = (executar, ...args) => executar("git", args, { cwd: RAIZ, encoding: "utf8" });

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

export function atualizarAgenda({ executar = execFileSync } = {}) {
  git(executar, "pull", "--rebase", "--autostash");
}

// Manda a agenda para o GitHub, onde o workflow a lê. Não mexe em nada além dos dois arquivos da agenda.
export function enviarAgenda({ executar = execFileSync } = {}) {
  atualizarAgenda({ executar });
  git(executar, "add", "instagram/agenda.json", "instagram/agenda-modelo.json");
  let mudou = false;
  try { git(executar, "diff", "--cached", "--quiet"); } catch { mudou = true; }
  if (!mudou) return false;
  git(executar, "commit", "-m", "agenda: atualiza a fila de publicações", "-m", COAUTOR);
  git(executar, "push");
  return true;
}

// Copia os tokens do Mac para os Secrets/Variables do repositório, pelo CLI `gh`. O token vai pela entrada padrão.
export function configurarNuvem(tokens, { repo, executar = execFileSync } = {}) {
  const ig = tokens.instagram;
  if (!ig) throw new ErroAgenda(`sem token do Instagram guardado — rode antes: node scripts/instagram.mjs --token "<token>"`);
  executar("gh", ["secret", "set", "IG_ACCESS_TOKEN", "--repo", repo], { input: ig.access_token, encoding: "utf8" });
  for (const [nome, valor] of [["IG_ID", ig.ig_id], ["IG_USUARIO", ig.usuario], ["IG_EXPIRA_EM", ig.expira_em]]) {
    executar("gh", ["variable", "set", nome, "--body", String(valor), "--repo", repo], { encoding: "utf8" });
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
      console.log("tokens gravados nos Secrets/Variables do GitHub. Falta só o SEGREDOS_PAT (README, \"Publicar na nuvem\", passo 2).");
    } else {
      console.error(USO);
      process.exit(1);
    }
  } catch (e) {
    if (e instanceof ErroAgenda || e instanceof ErroInstagram) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

Observação: `scripts/agenda.mjs` agora importa `instagram.mjs`, e `publicar-agenda.mjs` importa `agenda.mjs`; não há ciclo (instagram.mjs não importa agenda.mjs).

- [ ] **Step 4: `package.json`**

Em `"scripts"`, acrescentar (mantendo vírgulas):

```json
    "agenda": "node scripts/agenda.mjs",
    "revisar": "node scripts/revisar.mjs",
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test tests/agenda.test.mjs && node scripts/agenda.mjs --status`
Expected: testes PASS; o `--status` imprime `a agenda está vazia — comece com: node scripts/agenda.mjs --adicionar instagram/<pasta>`.

- [ ] **Step 6: Commit**

```bash
git add scripts/agenda.mjs tests/agenda.test.mjs package.json
git commit -m "CLI da agenda: enfileirar, enviar, atualizar e configurar a nuvem" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Página de revisão em bloco (`scripts/revisar.mjs`)

**Files:**
- Create: `scripts/revisar.mjs`
- Test: `tests/revisar.test.mjs`

**Interfaces:**
- Consumes: `lerAgenda`, `gravarAgenda`, `ErroAgenda`, `ARQUIVO_AGENDA`, `RAIZ` (agenda.mjs); `carregarChecagem`, `resumoChecagem` (checagem.mjs).
- Produces: `escapar(s)`, `decidir(agenda, id, decisao, nota?) → item|removido`, `midiaDoItem(item, raiz?) → {nome, tipo: "imagem"|"video"}[]`, `fichasDaAgenda(agenda, raiz?) → ficha[]`, `htmlDaRevisao(fichas) → string`, `criarServidorRevisao({arquivoAgenda?, raiz?}) → http.Server`.

- [ ] **Step 1: Testes que falham**

Criar `tests/revisar.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ErroAgenda, lerAgenda, gravarAgenda } from "../scripts/agenda.mjs";
import { escapar, decidir, midiaDoItem, fichasDaAgenda, htmlDaRevisao, criarServidorRevisao } from "../scripts/revisar.mjs";
import { raizTemporaria, criarPastaPost, criarPastaReel, criarPastaStories, item } from "./ajudas-agenda.mjs";

test("escapar neutraliza HTML", () => {
  assert.equal(escapar(`<b onclick="x">&'`), "&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;");
});

test("decidir(aprovar) marca aprovado e apaga pedido de ajuste anterior", () => {
  const a = item({ id: "a:post", ajuste: "corrigir" });
  decidir({ itens: [a] }, "a:post", "aprovar");
  assert.equal(a.aprovado, true);
  assert.equal(a.ajuste, null);
});

test("decidir(ajuste) exige texto, desfaz a aprovação e guarda a nota", () => {
  const a = item({ id: "a:post", aprovado: true });
  assert.throws(() => decidir({ itens: [a] }, "a:post", "ajuste", "  "), (e) => e instanceof ErroAgenda && /o que ajustar/.test(e.message));
  decidir({ itens: [a] }, "a:post", "ajuste", "  trocar o título do card 2 ");
  assert.equal(a.aprovado, false);
  assert.equal(a.ajuste, "trocar o título do card 2");
});

test("decidir(remover) tira da agenda; só se revisa rascunho; decisão e id inválidos dão erro", () => {
  const agenda = { itens: [item({ id: "a:post" }), item({ id: "p:post", estado: "agendado" })] };
  decidir(agenda, "a:post", "remover");
  assert.deepEqual(agenda.itens.map((i) => i.id), ["p:post"]);
  assert.throws(() => decidir(agenda, "p:post", "aprovar"), (e) => e instanceof ErroAgenda && /rascunho/.test(e.message));
  assert.throws(() => decidir(agenda, "z:post", "aprovar"), ErroAgenda);
  assert.throws(() => decidir({ itens: [item()] }, "x:post", "talvez"), (e) => e instanceof ErroAgenda && /decisão/.test(e.message));
});

test("midiaDoItem: cards do post, vídeos da sequência e o reel", () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "p", { cards: 2 });
  criarPastaStories(raiz, "s", { n: 2 });
  criarPastaReel(raiz, "r");
  assert.deepEqual(midiaDoItem(item({ pasta: "instagram/p", formato: "post" }), raiz), [{ nome: "card-01.png", tipo: "imagem" }, { nome: "card-02.png", tipo: "imagem" }]);
  assert.deepEqual(midiaDoItem(item({ pasta: "instagram/s", formato: "stories" }), raiz).map((m) => m.nome), ["story-01.mp4", "story-02.mp4"]);
  assert.deepEqual(midiaDoItem(item({ pasta: "instagram/r", formato: "reel" }), raiz), [{ nome: "reel.mp4", tipo: "video" }]);
});

test("htmlDaRevisao mostra data, legenda escapada, Checagem e botões; página vazia diz que não há o que revisar", () => {
  const raiz = raizTemporaria();
  const p = criarPastaPost(raiz, "p");
  writeFileSync(join(p, "legenda.txt"), "legenda <script>alert(1)</script>");
  const agenda = { itens: [item({ id: "p:post", pasta: "instagram/p", quando: "2026-10-06T12:00:00-03:00" })] };
  const html = htmlDaRevisao(fichasDaAgenda(agenda, raiz));
  assert.match(html, /06\/10\/2026/);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes("<script>alert(1)"));
  assert.match(html, /\/midia\/p%3Apost\/card-01\.png/);
  assert.match(html, /Aprovar/);
  assert.match(html, /Pedir ajuste/);
  assert.match(html, /Tirar da agenda/);
  assert.match(htmlDaRevisao([]), /nada para revisar/i);
});

test("o servidor serve a página, a mídia da pasta e grava a decisão na agenda", async () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "p");
  const arquivoAgenda = join(mkdtempSync(join(tmpdir(), "rev-")), "agenda.json");
  gravarAgenda({ itens: [item({ id: "p:post", pasta: "instagram/p" })] }, arquivoAgenda);
  const servidor = criarServidorRevisao({ arquivoAgenda, raiz });
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal(await (await fetch(`${base}/midia/${encodeURIComponent("p:post")}/card-01.png`)).text(), "png");
    assert.equal((await fetch(`${base}/midia/${encodeURIComponent("p:post")}/..%2Fagenda.json`)).status, 404);
    assert.equal((await fetch(`${base}/midia/${encodeURIComponent("p:post")}/..`)).status, 404);
    const r = await fetch(`${base}/api/decidir`, { method: "POST", body: JSON.stringify({ id: "p:post", decisao: "aprovar" }) });
    assert.equal(r.status, 200);
    assert.equal(lerAgenda(arquivoAgenda).itens[0].aprovado, true);
    const ruim = await fetch(`${base}/api/decidir`, { method: "POST", body: JSON.stringify({ id: "p:post", decisao: "ajuste", nota: "" }) });
    assert.equal(ruim.status, 400);
  } finally {
    servidor.close();
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/revisar.test.mjs`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `scripts/revisar.mjs`**

```js
#!/usr/bin/env node
// Página local para revisar TODOS os itens em rascunho da agenda de uma vez: mídia, legenda e resumo da
// Checagem lado a lado, com "Aprovar", "Pedir ajuste" (com texto) e "Tirar da agenda". Cada clique grava em
// instagram/agenda.json. Depois: node scripts/agenda.mjs --enfileirar.
//
//   npm run revisar                          # abre http://localhost:4710
//   npm run revisar -- --porta 4800 --sem-abrir

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { ErroAgenda, lerAgenda, gravarAgenda, ARQUIVO_AGENDA, RAIZ } from "./agenda.mjs";
import { carregarChecagem, resumoChecagem } from "./checagem.mjs";

export const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- decisões ----------
export function decidir(agenda, id, decisao, nota = "") {
  const indice = agenda.itens.findIndex((i) => i.id === id);
  if (indice < 0) throw new ErroAgenda(`não achei o item ${id}`);
  const item = agenda.itens[indice];
  if (item.estado !== "rascunho") throw new ErroAgenda(`${id} já está ${item.estado} — só se revisa o que está em rascunho (para reabrir: node scripts/agenda.mjs --reabrir ${id})`);
  if (decisao === "aprovar") Object.assign(item, { aprovado: true, ajuste: null });
  else if (decisao === "ajuste") {
    if (!String(nota).trim()) throw new ErroAgenda("diga o que ajustar");
    Object.assign(item, { aprovado: false, ajuste: String(nota).trim() });
  } else if (decisao === "remover") agenda.itens.splice(indice, 1);
  else throw new ErroAgenda(`decisão desconhecida: ${decisao}`);
  return item;
}

// ---------- o que mostrar ----------
export function midiaDoItem(item, raiz = RAIZ) {
  const pasta = join(raiz, item.pasta);
  if (!existsSync(pasta)) return [];
  const nomes = readdirSync(pasta).sort();
  if (item.formato === "post") return nomes.filter((n) => /^card-\d+\.png$/.test(n)).map((nome) => ({ nome, tipo: "imagem" }));
  if (item.formato === "stories") return nomes.filter((n) => /^story-\d+\.mp4$/.test(n)).map((nome) => ({ nome, tipo: "video" }));
  return nomes.filter((n) => n === "reel.mp4").map((nome) => ({ nome, tipo: "video" }));
}

const lerTexto = (arquivo) => (existsSync(arquivo) ? readFileSync(arquivo, "utf8").trim() : "");

export function fichasDaAgenda(agenda, raiz = RAIZ) {
  const ordem = (i) => (i.quando ? Date.parse(i.quando) : Infinity);
  return agenda.itens
    .filter((i) => i.estado === "rascunho")
    .sort((a, b) => ordem(a) - ordem(b))
    .map((i) => {
      const pasta = join(raiz, i.pasta);
      let checagem;
      try { checagem = resumoChecagem(carregarChecagem(pasta)); } catch { checagem = "Sem checagem.json — este tipo não exige Checagem, ou ela ainda não foi feita."; }
      const legenda = i.formato === "reel" ? lerTexto(join(pasta, "reel-legenda.txt")) : i.formato === "post" ? lerTexto(join(pasta, "legenda.txt")) : lerTexto(join(pasta, "stories.md"));
      return { id: i.id, pasta: i.pasta, formato: i.formato, quando: i.quando, aprovado: i.aprovado, ajuste: i.ajuste, midia: midiaDoItem(i, raiz), legenda, checagem };
    });
}

const quandoBonito = (q) => {
  if (!q) return "sem data";
  const [dia, hora] = q.slice(0, 16).split("T");
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a} às ${hora}`;
};

// ---------- página ----------
export function htmlDaRevisao(fichas) {
  const cartoes = fichas.map((f) => {
    const url = (nome) => `/midia/${encodeURIComponent(f.id)}/${nome}`;
    const midia = f.midia.map((m) => (m.tipo === "imagem" ? `<img src="${url(m.nome)}" alt="${escapar(m.nome)}">` : `<video src="${url(m.nome)}" controls preload="metadata"></video>`)).join("");
    return `<article data-id="${escapar(f.id)}" class="${f.aprovado ? "aprovado" : ""}">
  <header><strong>${escapar(f.formato)}</strong> · ${escapar(quandoBonito(f.quando))} · <code>${escapar(f.pasta)}</code> <span class="selo">${f.aprovado ? "✔ aprovado" : "falta aprovar"}</span></header>
  ${f.ajuste ? `<p class="ajuste">Ajuste pedido: ${escapar(f.ajuste)}</p>` : ""}
  <div class="midia">${midia || "<em>sem mídia gerada</em>"}</div>
  <h3>Legenda</h3><pre>${escapar(f.legenda) || "—"}</pre>
  <h3>Checagem</h3><pre>${escapar(f.checagem)}</pre>
  <div class="botoes">
    <button data-decisao="aprovar">Aprovar</button>
    <input type="text" placeholder="o que ajustar?" class="nota">
    <button data-decisao="ajuste">Pedir ajuste</button>
    <button data-decisao="remover" class="perigo">Tirar da agenda</button>
  </div>
</article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisão da agenda</title>
<style>
  body { font: 15px/1.45 system-ui, sans-serif; margin: 0; background: #f4f5f7; color: #1b2430; }
  h1 { margin: 0; padding: 16px 24px; background: #12284c; color: #fff; font-size: 18px; }
  main { max-width: 980px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
  article { background: #fff; border-radius: 10px; padding: 16px; border: 2px solid transparent; }
  article.aprovado { border-color: #2e9e5b; }
  header { margin-bottom: 8px; } .selo { float: right; font-size: 13px; }
  .midia { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0; }
  .midia img { height: 340px; border-radius: 6px; } .midia video { height: 340px; border-radius: 6px; }
  pre { white-space: pre-wrap; background: #f0f2f5; padding: 10px; border-radius: 6px; margin: 4px 0 12px; }
  h3 { margin: 8px 0 0; font-size: 13px; text-transform: uppercase; color: #5a6675; }
  .botoes { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  button { padding: 8px 14px; border: 0; border-radius: 6px; background: #12284c; color: #fff; cursor: pointer; }
  button.perigo { background: #b3261e; } .nota { flex: 1; min-width: 180px; padding: 8px; }
  .ajuste { background: #fff3cd; padding: 8px; border-radius: 6px; }
  .vazio { text-align: center; padding: 48px; color: #5a6675; }
</style></head><body>
<h1>Revisão da agenda — ${fichas.length} item(ns) em rascunho</h1>
<main>
${cartoes || `<p class="vazio">Nada para revisar. Adicione conteúdos com: node scripts/agenda.mjs --adicionar instagram/&lt;pasta&gt;</p>`}
</main>
<script>
  document.querySelectorAll("article").forEach((art) => {
    art.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", async () => {
      const decisao = btn.dataset.decisao;
      const nota = art.querySelector(".nota").value;
      const r = await fetch("/api/decidir", { method: "POST", body: JSON.stringify({ id: art.dataset.id, decisao, nota }) });
      const j = await r.json();
      if (!r.ok) { alert(j.erro); return; }
      if (decisao === "remover") art.remove();
      else if (decisao === "aprovar") { art.classList.add("aprovado"); art.querySelector(".selo").textContent = "✔ aprovado"; }
      else { art.classList.remove("aprovado"); art.querySelector(".selo").textContent = "ajuste pedido"; }
    }));
  });
</script>
</body></html>`;
}

// ---------- servidor ----------
const TIPOS = { ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4" };

export function criarServidorRevisao({ arquivoAgenda = ARQUIVO_AGENDA, raiz = RAIZ } = {}) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(htmlDaRevisao(fichasDaAgenda(lerAgenda(arquivoAgenda), raiz)));
      }
      const m = url.pathname.match(/^\/midia\/([^/]+)\/([^/]+)$/);
      if (req.method === "GET" && m) {
        const id = decodeURIComponent(m[1]), nome = decodeURIComponent(m[2]);
        const item = lerAgenda(arquivoAgenda).itens.find((i) => i.id === id);
        const permitido = item && /^[\w][\w.-]*$/.test(nome) && midiaDoItem(item, raiz).some((x) => x.nome === nome);
        if (!permitido) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "content-type": TIPOS[extname(nome)] ?? "application/octet-stream" });
        return res.end(readFileSync(join(raiz, item.pasta, nome)));
      }
      if (req.method === "POST" && url.pathname === "/api/decidir") {
        let corpo = "";
        for await (const parte of req) corpo += parte;
        try {
          const { id, decisao, nota } = JSON.parse(corpo);
          const agenda = lerAgenda(arquivoAgenda);
          decidir(agenda, id, decisao, nota);
          gravarAgenda(agenda, arquivoAgenda);
          res.writeHead(200, { "content-type": "application/json" });
          return res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          if (!(e instanceof ErroAgenda)) throw e;
          res.writeHead(400, { "content-type": "application/json" });
          return res.end(JSON.stringify({ erro: e.message }));
        }
      }
      res.writeHead(404);
      res.end();
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(`erro: ${e.message}`);
    }
  });
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const porta = Number(args[args.indexOf("--porta") + 1]) || 4710;
  const servidor = criarServidorRevisao();
  servidor.listen(porta, "127.0.0.1", () => {
    const endereco = `http://localhost:${porta}`;
    console.log(`Revisão aberta em ${endereco} — quando terminar, feche com Ctrl+C e rode: node scripts/agenda.mjs --enfileirar`);
    if (!args.includes("--sem-abrir")) {
      const abrir = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
      spawn(abrir, [endereco], { stdio: "ignore", detached: true }).unref();
    }
  });
}
```

Observação sobre o teste do `..`: `/midia/p%3Apost/..` — o `URL` do Node normaliza `..` e o caminho deixa de casar com a regra `/midia/<id>/<nome>`; o servidor devolve 404 do mesmo jeito. E `..%2Fagenda.json` decodifica para `../agenda.json`, que não passa em `/^[\w][\w.-]*$/`.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/revisar.test.mjs`
Expected: PASS.

- [ ] **Step 5: Ver a página com os olhos**

Criar uma agenda temporária de demonstração e abrir a revisão (sem publicar nada). Run:

```bash
node -e "const {adicionar,gravarAgenda}=await import('./scripts/agenda.mjs');const a={itens:[]};console.log(adicionar(a,'instagram/2026-09-20-kruskal-1956'));gravarAgenda(a,'/tmp/agenda-demo.json')" --input-type=module
```

O servidor da CLI usa o `agenda.json` real; para a inspeção visual, copie `/tmp/agenda-demo.json` sobre `instagram/agenda.json`, rode `npm run revisar`, confira no navegador que o Kruskal aparece com 5 cards, legenda e o resumo da Checagem, clique em **Aprovar** (o cartão fica com borda verde), e depois desfaça com `git checkout instagram/agenda.json`.
Expected: página legível, botões funcionam, `instagram/agenda.json` muda só por esse item.

- [ ] **Step 6: Commit**

```bash
git add scripts/revisar.mjs tests/revisar.test.mjs
git commit -m "Revisão em bloco: página local para aprovar, pedir ajuste ou tirar itens da agenda" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Os workflows do GitHub Actions

**Files:**
- Create: `.github/workflows/publicar-agenda.yml`, `.github/workflows/renovar-token.yml`
- Test: `tests/workflows.test.mjs`

**Interfaces:**
- Consumes: `scripts/publicar-agenda.mjs`, `scripts/renovar-token.mjs`, o branch `fila`; Secrets `IG_ACCESS_TOKEN`, `SEGREDOS_PAT`; Variables `IG_ID`, `IG_USUARIO`, `IG_EXPIRA_EM`.
- Produces: os dois workflows.

- [ ] **Step 1: Teste que falha** — `tests/workflows.test.mjs`

```js
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

test("renovar-token: semanal, usa SEGREDOS_PAT para gravar Secret e Variable", () => {
  const w = ler("renovar-token.yml");
  assert.equal(w.on.schedule.length, 1);
  const gravar = w.jobs.renovar.steps.find((s) => /gh secret set IG_ACCESS_TOKEN/.test(s.run ?? ""));
  assert.match(gravar.env.GH_TOKEN, /SEGREDOS_PAT/);
  assert.match(gravar.run, /gh variable set IG_EXPIRA_EM/);
  assert.match(gravar.run, /add-mask/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/workflows.test.mjs`
Expected: FAIL (`ENOENT … publicar-agenda.yml`).

- [ ] **Step 3: `.github/workflows/publicar-agenda.yml`**

```yaml
name: Publicar agenda do Instagram

# Roda a cada 30 min (o GitHub pode atrasar alguns minutos) e publica o que venceu em instagram/agenda.json.
# Manualmente (aba Actions → Run workflow) começa em modo simulação: mostra o que seria publicado, sem publicar.
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch:
    inputs:
      simular:
        description: "Só mostrar o que seria publicado (desmarque para publicar de verdade)"
        type: boolean
        default: true

permissions:
  contents: write

concurrency:
  group: publicar-agenda
  cancel-in-progress: false

jobs:
  publicar:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Instalar dependências
        run: npm ci

      - name: Baixar a mídia aprovada (branch fila)
        run: |
          git fetch origin fila || { echo "branch fila ainda não existe — nada aprovado na fila"; exit 0; }
          git archive origin/fila instagram | tar -x || echo "fila vazia"

      - name: Publicar o que venceu
        env:
          IG_ACCESS_TOKEN: ${{ secrets.IG_ACCESS_TOKEN }}
          IG_ID: ${{ vars.IG_ID }}
          IG_USUARIO: ${{ vars.IG_USUARIO }}
          IG_EXPIRA_EM: ${{ vars.IG_EXPIRA_EM }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/publicar-agenda.mjs ${{ (github.event_name == 'workflow_dispatch' && inputs.simular) && '--simular' || '' }}

      - name: Guardar o estado da agenda
        if: always()
        run: |
          git config user.name "publicador-po-para-todos"
          git config user.email "actions@users.noreply.github.com"
          git add instagram/agenda.json 'instagram/*/publicacao*.json'
          if git diff --cached --quiet; then
            echo "sem mudanças de estado"
          else
            git commit -m "agenda: estado das publicações [skip ci]"
            git pull --rebase
            git push
          fi
```

- [ ] **Step 4: `.github/workflows/renovar-token.yml`**

```yaml
name: Renovar token do Instagram

# Toda segunda de manhã: se o token do Instagram (60 dias) tem menos de 30 dias de folga, renova e grava o novo valor nos Secrets.
# Se a Meta recusar, o workflow fica vermelho e o GitHub manda e-mail — gere um token novo (README, "Publicar na nuvem").
on:
  schedule:
    - cron: "17 9 * * 1"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  renovar:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Instalar dependências
        run: npm ci

      - name: Renovar se faltar menos de 30 dias
        env:
          IG_ACCESS_TOKEN: ${{ secrets.IG_ACCESS_TOKEN }}
          IG_ID: ${{ vars.IG_ID }}
          IG_USUARIO: ${{ vars.IG_USUARIO }}
          IG_EXPIRA_EM: ${{ vars.IG_EXPIRA_EM }}
        run: node scripts/renovar-token.mjs "$RUNNER_TEMP/novo-token.json"

      - name: Guardar o novo token nos Secrets
        env:
          GH_TOKEN: ${{ secrets.SEGREDOS_PAT }}
        run: |
          if [ -f "$RUNNER_TEMP/novo-token.json" ]; then
            TOKEN=$(jq -r .access_token "$RUNNER_TEMP/novo-token.json")
            echo "::add-mask::$TOKEN"
            gh secret set IG_ACCESS_TOKEN --body "$TOKEN" --repo "$GITHUB_REPOSITORY"
            gh variable set IG_EXPIRA_EM --body "$(jq -r .expira_em "$RUNNER_TEMP/novo-token.json")" --repo "$GITHUB_REPOSITORY"
            echo "Secret e Variable atualizados"
          else
            echo "nada a atualizar"
          fi
```

- [ ] **Step 5: Rodar e ver passar; rodar a suíte inteira**

Run: `node --test tests/workflows.test.mjs && npm test`
Expected: PASS em tudo (a suíte completa inclui as fixtures antigas; nenhuma deve mudar).

- [ ] **Step 6: Commit**

```bash
git add .github tests/workflows.test.mjs
git commit -m "Workflows: publicar a agenda a cada 30 min e renovar o token toda semana" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Documentação, skill `agendar` e verificação ponta a ponta

**Files:**
- Modify: `README.md` (nova seção "Publicar na nuvem" depois de "Publicar no Instagram"; entrada em "Se algo deu errado"), `CLAUDE.md`
- Create: `.claude/skills/agendar/SKILL.md`

- [ ] **Step 1: `CLAUDE.md`**

Na lista de Scripts, acrescentar:

```md
- `node scripts/agenda.mjs …` — a agenda de publicações (`--adicionar`, `--distribuir`, `--status`, `--mover`, `--reabrir`, `--remover`, `--enfileirar`, `--enviar`, `--atualizar`, `--configurar-nuvem`); `npm run revisar` abre a revisão em bloco.
- `node scripts/publicar-agenda.mjs [--simular]` — o que o workflow `publicar-agenda.yml` roda a cada 30 min; `--simular` não toca na Meta.
```

Depois do parágrafo `/pacote`, acrescentar:

```md
`/agendar` (skill `agendar`): junta vários conteúdos de `instagram/` numa fila, dá datas pela semana-modelo (`instagram/agenda-modelo.json`), abre a revisão em bloco, sobe a mídia aprovada para o branch `fila` e envia a agenda ao GitHub; o workflow `publicar-agenda.yml` publica sozinho (`docs/adr/0010`). Tokens na nuvem vêm de Secrets/Variables, não de `~/.po-para-todos`. Story de vídeo novo e sequência com sticker continuam manuais e nunca entram na agenda.
```

E, na lista de fixtures de `npm test`, nada muda.

- [ ] **Step 2: `.claude/skills/agendar/SKILL.md`**

```md
---
name: agendar
description: Agenda vários conteúdos prontos do Instagram do PO para Todos (posts, sequências de stories sem sticker, reels) para saírem sozinhos, um por dia, pelo GitHub Actions — junta as pastas, dá datas pela semana-modelo, abre a revisão em bloco para a pessoa aprovar, sobe a mídia aprovada e envia a agenda. Use quando a pessoa disser "agenda esses posts", "deixa a semana programada", "quero programar os conteúdos", "o que está na agenda" ou pedir para reagendar/ajustar um item.
---

# Agendar

Diga antes: "Vou pôr esses conteúdos na agenda, dar datas pela semana-modelo, abrir uma página para você aprovar tudo de uma vez e só então mandar para o GitHub publicar."

Regras (`docs/adr/0010`):
- **Nada sai sem aprovação.** Só o que você marcou "Aprovar" na revisão entra na fila; o publicador recusa o resto.
- **A regra da Checagem vale** (ADR 0009): `artigo`, `curiosidade`, sequência de stories e reel de cenas precisam de `checagem.json`; o `--adicionar` recusa sem ela e diz o que falta.
- **Story de vídeo novo e sequência com sticker são manuais** — não entram na agenda.
- **Nunca publique por aqui.** Publicar é do workflow. Para testar: `gh workflow run publicar-agenda.yml -f simular=true`.

## 1. Trazer o estado mais novo

```
node scripts/agenda.mjs --atualizar
node scripts/agenda.mjs --status
```
O workflow grava o estado no GitHub a cada publicação; sem `--atualizar` você edita uma agenda velha. Mostre o `--status` e diga o que há (rascunhos, agendados, falhas).

## 2. Juntar os conteúdos

Para cada pasta pronta (`instagram/<data>-<slug>/`, com mídia já gerada):
```
node scripts/agenda.mjs --adicionar instagram/<pasta>
```
Uma pasta com post e reel vira dois itens. Se aparecer "não adicionei — …", leia o motivo à pessoa e faça o que falta (rodar a Checagem, gerar o reel…) antes de seguir. Avisos ("sem story-aviso.mp4") só informam.

## 3. Dar datas

Pergunte só a data de início ("a partir de que segunda?") e rode:
```
node scripts/agenda.mjs --distribuir AAAA-MM-DD
node scripts/agenda.mjs --status
```
Semana-modelo padrão: reels seg/qua/sex às 12h, posts ter/qui/dom às 12h, quiz de stories no sábado às 18h. Para mudar um item: `--mover <id> AAAA-MM-DDTHH:MM`. Para mudar a regra da semana: edite `instagram/agenda-modelo.json`.

## 4. Revisão em bloco (parada obrigatória)

```
npm run revisar
```
Diga: "Abri uma página no navegador com todos os itens. Para cada um: **Aprovar**, **Pedir ajuste** (escreva o que mudar) ou **Tirar da agenda**. Quando terminar, volte aqui e me diga."

Quando a pessoa voltar, rode `--status`. Para cada item com `ajuste:` — leia a nota, corrija a pasta (cards.json, legenda.json, roteiro do reel…), regenere a mídia com o script do formato, refaça a Checagem se o conteúdo mudou, e diga que está pronto para nova revisão (a nota some quando a pessoa aprova). Itens que continuam "falta aprovar" ficam de fora da fila.

## 5. Enfileirar e enviar

```
node scripts/agenda.mjs --enfileirar
node scripts/agenda.mjs --enviar
```
`--enfileirar` sobe a mídia dos aprovados para o branch `fila` e os marca `agendado`. `--enviar` faz commit e push do `agenda.json`; o workflow só enxerga o que está no GitHub. Confirme com `--status` e diga a primeira e a última data.

## Depois: mexer no que já está agendado

- Mudar a data: `--mover <id> AAAA-MM-DDTHH:MM`, depois `--enviar`.
- Mudar o conteúdo: `--reabrir <id>`, ajuste a pasta, `npm run revisar`, `--enfileirar`, `--enviar`. (O que sai é o que foi aprovado e enfileirado; mudar a pasta sem reabrir não muda nada na nuvem.)
- Tirar: `--remover <id>`, depois `--enviar`.
- Item `FALHOU` ou `PERDIDO`: leia o `erro:` do `--status`, corrija a causa e reagende com `--mover <id> <nova data>` (isso volta o item a `agendado`), depois `--enviar`.
```

- [ ] **Step 3: `README.md` — seção "Publicar na nuvem"**

Depois da seção "Publicar no Instagram" (antes de "Se algo deu errado"), inserir:

```md
## Publicar na nuvem (agenda)

Com a agenda você deixa dezenas de conteúdos aprovados de uma vez e eles saem sozinhos, um por dia, mesmo com o computador desligado: o GitHub confere a agenda a cada 30 minutos e publica o que venceu. O cronômetro do GitHub pode atrasar alguns minutos; se um item atrasar mais de 6 horas, ele não é publicado (para não sair o "post de segunda" na quarta) e você recebe um e-mail.

**Atenção:** o conteúdo aprovado espera num branch público do repositório (`fila`) até a hora de sair; quem souber procurar consegue vê-lo antes.

### Configurar (uma vez)

Pré-requisitos: já ter feito "Conectar ao Instagram" (o token do Instagram e o do GitHub guardados no computador) e ter o programa `gh` instalado e logado (`gh auth status` deve dizer "Logged in").

1. Envie tudo para o GitHub: `git push`.
2. Crie o token que renova o token do Instagram sozinho: abra https://github.com/settings/personal-access-tokens/new, nome `PO para Todos - Segredos`, validade 1 ano, em **Repository access** escolha **Only select repositories** → `po-para-todos-publisher`; em **Permissions → Repository permissions** dê **Secrets: Read and write** e **Variables: Read and write** (mais nada). Gere, copie o token (começa com `github_pat_`) e rode `gh secret set SEGREDOS_PAT --repo jotape-prog22/po-para-todos-publisher`; quando o terminal pedir, cole o token e aperte Enter.
3. Copie os tokens do Instagram para o GitHub: `node scripts/agenda.mjs --configurar-nuvem`. Esperado: `tokens gravados nos Secrets/Variables do GitHub`.
4. Ligue os avisos por e-mail: https://github.com/settings/notifications → **Actions** → marque **Send notifications for failed workflows only**.
5. Teste sem publicar nada: na página do repositório, aba **Actions** → **Publicar agenda do Instagram** → **Run workflow** (deixe **simular** marcado). Esperado: a execução termina verde e o log diz `nada vencido — nada a publicar`.

### Usar

Peça ao Claude: `/agendar`. Ele junta as pastas, dá as datas, abre a página de revisão (você aprova, pede ajuste ou tira cada item) e envia a agenda. Ver a agenda a qualquer momento: `node scripts/agenda.mjs --status`.

O token do Instagram (60 dias) é renovado sozinho toda segunda-feira. Se a renovação falhar você recebe um e-mail; nesse caso gere um token novo (passos 4 e 5 de "Conectar ao Instagram") e rode de novo o passo 3.
```

Na seção "Se algo deu errado", acrescentar:

```md
- **Recebi e-mail "Publicar agenda do Instagram falhou"** — rode `node scripts/agenda.mjs --atualizar` e depois `--status`: o item com `FALHOU` ou `PERDIDO` mostra o motivo. Corrija e reagende com `node scripts/agenda.mjs --mover <id> AAAA-MM-DDTHH:MM`, depois `node scripts/agenda.mjs --enviar`.
- **Quero cancelar um post agendado** — `node scripts/agenda.mjs --remover <id>` e `node scripts/agenda.mjs --enviar`.
```

- [ ] **Step 4: Verificação completa**

Run: `npm test`
Expected: PASS em toda a suíte (incluindo `agenda`, `fila`, `nuvem`, `publicar-agenda`, `revisar`, `workflows`).

Run: `node scripts/agenda.mjs --status && node scripts/publicar-agenda.mjs --simular`
Expected: `a agenda está vazia…` e `nada vencido — nada a publicar`, ambos com saída 0.

- [ ] **Step 5: Commit e envio**

```bash
git add README.md CLAUDE.md .claude/skills/agendar
git commit -m "Documentação da agenda: README, CLAUDE.md e skill /agendar" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

`git push` só depois de a pessoa pedir (os workflows só passam a existir no GitHub depois do push).

- [ ] **Step 6: Ensaio real (com a pessoa acompanhando; não automatizar)**

1. Passos 2 a 5 da configuração do README.
2. Escolher **um** `aviso` simples (nunca `artigo`/`curiosidade` no primeiro teste). `--adicionar`, `--distribuir <hoje>`, `--mover <id> <daqui a ~1 h>`, `npm run revisar` (aprovar), `--enfileirar`, `--enviar`.
3. Conferir na aba Actions que o `git archive` baixou a pasta e, quando chegar a hora, que a execução das :00/:30 publica o post (e o story de aviso, se houver), grava `estado: publicado` com o link em `agenda.json` e que o branch `fila` ficou só com o `README.md`.
4. Só então rodar a produção em lote.

---

## Fora deste plano (próximo plano)

**Produção em lote dos 40 a 50 conteúdos**: lista de ~12 temas de PO sugerida por semana, escolha da pessoa, geração em lote de `post.md → cards/legenda/Checagem`, reels de explicação (cenas do zero; cortes do YouTube em poucos) e quizzes, todos passando por `/agendar`. É trabalho de conteúdo, depende deste agendador estar de pé e será planejado quando o Ensaio real (Task 10, Step 6) passar.

## Self-Review

**Cobertura do desenho fechado na conversa:**
- Nuvem (GitHub Actions), sem depender do Mac → Tasks 6, 9.
- Todos os formatos (post + story de aviso, sequência de stories sem sticker/quiz, reel) → `etapasDe`, `verificarPasta` (Tasks 2, 6).
- Um conteúdo por dia, semana-modelo com reels de explicação e cortes só onde houver → `agenda-modelo.json` (Task 3); reels de corte e de cenas usam o mesmo formato `reel`.
- Aprovação em bloco + Checagem (ADR 0009) → Task 8 e `verificarPasta`/`enfileirar`.
- Falhas: 3 tentativas, e-mail do GitHub pelo `exit 1`, janela de 6 h, `perdido` → Task 6.
- Fila `fila` visível (público) → Task 4, ADR (Task 1), aviso no README (Task 10).
- Token de 60 dias renovado na nuvem com `SEGREDOS_PAT` → Task 5, 9, 10.
- Renderização continua no Mac; só publicar na nuvem → arquitetura; `--enfileirar` sobe do Mac.
- Ordem "agendador primeiro, depois produção em lote" → seção "Fora deste plano".

**Consistência de nomes:** `executarAgenda`/`etapasDe`/`TENTATIVAS` (Task 6) usados só na Task 6; `pastasLiberadas` (Task 3) usado nas Tasks 6 e 7; `atualizarFila`/`lerPastaParaFila` (Task 4) nas Tasks 6 e 7; `tokensDoAmbiente` (Task 5) na Task 6; ids `"<pasta>:<formato>"` iguais em todos os testes.

**Pontos de atenção para quem executa:**
- Task 2, teste da fixture do Kruskal: espera exatamente 1 aviso (falta `story-aviso.mp4`); se a fixture ganhar esse arquivo, ajuste o número.
- Task 7 importa `instagram.mjs` (que importa `sharp`) dentro de `agenda.mjs`; `npm install` deve estar feito.
- O `git archive origin/fila instagram | tar -x` do workflow só extrai o que existe no branch e nunca apaga arquivos da `master` — por isso não se usa `git restore`.
- `agenda.json` é escrito com um campo por linha para que edições de itens diferentes (você no Mac, o workflow na nuvem) se juntem no `git pull --rebase` sem conflito.
