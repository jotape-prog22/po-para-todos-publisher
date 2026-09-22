# Instagram — formatos automáticos e rigor de conteúdo: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A partir de um pedido da pessoa, gerar e publicar pela API do Instagram — depois de uma parada de aprovação que mostra o resultado de uma **Checagem** de fatos — story de aviso de post novo, sequência de stories "quiz respondido", `curiosidade`, `citação` e `reel` (corte de vídeo publicado ou cenas do zero), mais um comando "pacote" que encadeia tudo.

**Architecture:** Mesmo desenho do MVP: a skill escreve JSON (`cards.json`, `stories.json`, `reel.json`, `checagem.json`), scripts Node determinísticos validam e renderizam (`design-system/scripts/*.mjs`), e `scripts/instagram.mjs` publica. Três capacidades novas de base: (1) `instagram.mjs` publica `STORIES` e `REELS` (mídia MP4 pelo mesmo branch `midia`), com um livro-razão `publicacao-stories.json` que permite retomar uma sequência interrompida; (2) o gerador de stories em vídeo vira um motor reutilizável (`renderizarCenas`) com faixa de áudio muda e modo "sem sticker"; (3) `scripts/checagem.mjs` valida e resume a Checagem, e `--publicar` recusa `artigo`/`curiosidade` sem ela. O reel-Corte baixa o trecho com `yt-dlp` e monta a moldura com ffmpeg.

**Tech Stack:** Node ≥ 22 (`node --test`, ESM `.mjs`, `fetch` nativo), `sharp`, `puppeteer-core` + `ffmpeg-static` (já instalados), Graph API do Instagram v23.0 (`media_type=STORIES|REELS`), API REST do GitHub, `yt-dlp` (instalado pela pessoa, só para reel-Corte).

**Spec:** `docs/superpowers/specs/2026-09-21-instagram-formatos-e-rigor.md` (e, para o que já existe, `docs/superpowers/specs/2026-09-20-braco-instagram-design.md`). ADRs: `docs/adr/0007` (story sem sticker pela API), `0008` (`yt-dlp`), `0009` (Checagem). Vocabulário: `CONTEXT.md`.

## Global Constraints

- Todo texto voltado ao usuário (README, SKILL.md, mensagens de erro, modelos, `GUIA-AGENTE.md`) em português, para leitor que **não sabe programar**: passos numerados, comando exato, o que esperar na tela.
- **Custo zero**: nenhum serviço pago. `yt-dlp` é open-source; só é exigido para reel-Corte, e só de vídeo **já público**.
- Nunca editar `design-system/tokens.json`, `tokens.css`, `README.md` do design system, `fundamentos-slides.md`, `fundamentos-youtube.md`. Nunca alterar o conteúdo dos arquivos já existentes em `videos/folgas-complementares/` e `instagram/2026-09-20-kruskal-1956/` (fixtures); **acrescentar** `checagem.json` ao Kruskal é permitido (Task 5) e o teste correspondente é atualizado no mesmo commit.
- Scripts no estilo dos existentes: ESM, comentários em português, exporta funções + bloco CLI protegido por `import.meta.url === pathToFileURL(process.argv[1]).href`, erros de uso saem como `erro: …` com `process.exit(1)`, dependências externas injetáveis (`fetchImpl`, `executar`) para os testes.
- Formatos: feed **1080×1350**; story e reel **1080×1920**. Story: 5 a 60 s. Reel: 15 a 90 s. Cota: 100 publicações/24 h.
- Regra do story (ADR-0007): `stories.json` sem `"publicacao": "api"` é manual; a API nunca põe sticker.
- Checagem (ADR-0009): `artigo` e `curiosidade` não publicam sem `checagem.json` válido; o resumo da Checagem aparece na parada de aprovação; a Checagem nunca bloqueia sozinha uma afirmação — a pessoa decide.
- Nada publica sem pedido explícito da pessoa; `/video` não dispara nada do Instagram.
- Testes: `npm test` = `node --test`; sem Chrome, sem rede, sem `yt-dlp` (renderização verificada com `--so-html`; HTTP com `fetchFalso`; processos externos com `executar` injetado).
- Commits em português, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Decisões tomadas neste plano (a spec delegou a arquitetura)

| # | Decisão | Motivo |
|---|---|---|
| D1 | Uma pasta `instagram/<AAAA-MM-DD>-<slug>/` reúne tudo de uma ocasião: `post.md`/`cards.json` (post), `stories.json` (sequência), `reel.json` (reel), `checagem.json` (Checagem). Registros de publicação separados por formato: `publicacao.json` (post, já existe), `publicacao-stories.json` (livro-razão, um item por story publicado), `publicacao-reel.json`. | Sem migração do que existe; "já publicado" continua sendo "o arquivo existe"; o livro-razão dos stories permite retomar a sequência de onde parou. |
| D2 | `publicacao-stories.json` é append-only; `--publicar-stories` publica só os `story-NN.mp4` que não estão nele, em ordem, e para no primeiro erro dizendo o que saiu e o que ficou. | Implementa "para tudo, reporta, não desfaz" e ainda permite rodar de novo sem duplicar. |
| D3 | Story de aviso de post novo é um vídeo de uma cena (`story-aviso.mp4`), gerado de `cards.json` pelo motor de stories; não tem sticker, então sai pela API logo depois do post, dentro da mesma aprovação. | Reaproveita o gerador existente (spec, item 2); o link do post não cabe (sem sticker), o story diz "veja no feed". |
| D4 | Todo MP4 gerado recebe uma faixa de áudio AAC muda (`anullsrc`). | A API de publicação da Meta rejeita vídeo sem faixa de áudio; a faixa muda não muda nada para quem vê. |
| D5 | `stories.json` ganha `"publicacao": "api" \| "manual"` (padrão `manual`). Sem sticker a cena recebe a classe `ig--sem-sticker`, que encolhe a zona reservada ao sticker. | Opt-in explícito: a sequência `como-funciona-po` (com stickers) continua manual sem mudar nada. |
| D6 | `checagem.json` = lista de afirmações com `onde`, `texto`, `tipo` (`fonte` ou `conta`), `fonte` (URL, só `fonte`), `resultado` (`confirmada`, `nao-confirmada`, `sem-acesso`) e `como` (a evidência, ≥ 20 caracteres). Quem busca a fonte e recalcula a conta é a skill (WebFetch, `node -e`); o script só valida e imprime o resumo. | Buscar e comparar prosa é tarefa da IA, não de código determinístico; o que é testável (esquema, resumo, exigência na publicação) fica no script. |
| D7 | `reel.json` tem dois tipos: `cenas` (lista de cenas no mesmo formato de `stories.json`, concatenadas num MP4 só) e `corte` (`video`, `inicio`, `fim`, `titulo`, `faixa`). Legenda do reel em `reel.json.legenda`, montada por `scripts/legenda.mjs <pasta> --reel` em `reel-legenda.txt`. | Reel e story têm o mesmo 9:16: o motor de cenas serve aos dois. Legenda separada porque um pacote pode ter post e reel na mesma pasta. |
| D8 | Corte: `yt-dlp --download-sections "*mm:ss-mm:ss"` baixa só o trecho (usando o `ffmpeg-static` do projeto); a moldura vertical é um PNG (`reel-moldura.html` → `exportarPng`) com o vídeo 16:9 sobreposto ao centro por ffmpeg (`overlay`). Exige `videos/<slug>/publicacao.json` com `"privacidade": "public"`. | Não baixa 17 min para usar 50 s; a moldura reaproveita o CSS dos stories; vídeo privado exigiria cookies (ADR-0008). |
| D9 | Candidatos (corte e citação) são sugeridos por heurística em código a partir do roteiro/cards (gancho, blocos `exemplo`, capítulos reais, frases de 60–200 caracteres); a skill mostra 2 a 3 e a pessoa escolhe. | Determinístico e testável com as fixtures; o julgamento fino fica com a skill e com a pessoa. |
| D10 | Skills novas: `stories` (sequência/quiz), `reel`, `pacote`. A skill `post` ganha os tipos `curiosidade` e `citacao`, a Checagem e o story de aviso. Nenhuma skill nova é chamada por `/video`. | Comandos atômicos + orquestrador, como `/video` (spec, "Pacote"). |

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `scripts/instagram.mjs` | (modificar) `prepararPublicacao`, `publicarStory`, `publicarStories`, `publicarReel`, exigência de Checagem em `publicarPost`; CLI `--publicar-story`, `--publicar-stories`, `--publicar-reel` |
| `design-system/scripts/gerar-story-video.mjs` | (modificar) `publicacao`, `ig--sem-sticker`, `argsFfmpeg` com áudio mudo, `gravarCena`, `renderizarCenas` |
| `design-system/instagram/story-video.css`, `layouts/story-cena.html` | (modificar) classe `ig--sem-sticker` |
| `design-system/scripts/gerar-story-aviso.mjs` | `cards.json` → `story-aviso.mp4` |
| `scripts/checagem.mjs` | valida `checagem.json`, imprime o resumo |
| `instagram/2026-09-20-kruskal-1956/checagem.json` | exemplo real de Checagem (fixture) |
| `design-system/instagram/formatos.json`, `layouts/curiosidade.html`, `layouts/citacao.html`, `design-system/scripts/gerar-cards.mjs` | (modificar/criar) cards `curiosidade` e `citacao` |
| `canal.json` | (modificar) CTAs `curiosidade`, `citacao`, `reel` |
| `scripts/legenda.mjs` | (modificar) `gerarLegenda(pasta, { reel })`, `--reel` |
| `scripts/citacao.mjs` | candidatos de citação a partir de roteiro ou cards |
| `scripts/corte.mjs` | `segundos`, candidatos de corte a partir de roteiro + capítulos reais |
| `design-system/scripts/gerar-reel.mjs`, `design-system/instagram/layouts/reel-moldura.html`, `design-system/instagram/reel.css` | `reel.json` → `reel.mp4` (cenas ou corte) |
| `instagram/_modelo/post.md`, `instagram/_modelo/stories.json`, `instagram/_modelo/reel.json` | modelos em branco |
| `.claude/skills/{post,publicar}/SKILL.md` | (modificar) Checagem, story de aviso, tipos novos |
| `.claude/skills/{stories,reel,pacote}/SKILL.md` | skills novas |
| `design-system/instagram/GUIA-AGENTE.md`, `CLAUDE.md`, `README.md` | (modificar) passos, comandos, `yt-dlp`, regra do story |
| `tests/instagram.test.mjs`, `tests/story-video.test.mjs`, `tests/cards.test.mjs`, `tests/legenda.test.mjs` | (modificar) |
| `tests/story-aviso.test.mjs`, `tests/checagem.test.mjs`, `tests/citacao.test.mjs`, `tests/corte.test.mjs`, `tests/reel.test.mjs` | novos |

---

### Task 1: `instagram.mjs` publica stories pela API (um story e a sequência, com livro-razão)

**Files:**
- Modify: `scripts/instagram.mjs` (bloco "publicação", linhas 153–237, e CLI 239–272)
- Test: `tests/instagram.test.mjs`

**Interfaces:**
- Consumes: `criarApiInstagram`, `criarApiGithub`, `subirMidia`, `limparMidia`, `paraJpeg`, `esperarContainer` (já existem no arquivo).
- Produces: `prepararPublicacao({ tokens, canal, fetchImpl }) → Promise<{ ig, igId, gh }>`; `TENTATIVAS_VIDEO = 60`; `LEDGER_STORIES = "publicacao-stories.json"`; `lerPublicacoesDeStories(pasta) → { stories: [{ arquivo, media_id, publicado_em }] }`; `publicarStory(pasta, arquivo, opcoes) → Promise<{ arquivo, media_id, publicado_em }>`; `publicarStories(pasta, opcoes) → Promise<{ publicados: registro[] }>`. `opcoes` = `{ tokens, canal, fetchImpl, agora, dormir, log }` como em `publicarPost`. Erros são `ErroInstagram`.

- [ ] **Step 1: Escrever os testes**

Acrescente ao final de `tests/instagram.test.mjs` (o arquivo já tem `fetchFalso`, `rotasInstagram`, `rotasGithub`, `tokensOk`, `canal`, `AGORA`, `semDormir`):

```js
import { publicarStory, publicarStories, lerPublicacoesDeStories, LEDGER_STORIES, TENTATIVAS_VIDEO } from "../scripts/instagram.mjs";

async function pastaDeStories(n, { publicacao = "api", pngs = false } = {}) {
  const sharp = (await import("sharp")).default;
  const pasta = join(mkdtempSync(join(tmpdir(), "stories-")), "2026-10-01-quiz");
  mkdirSync(pasta);
  const stories = Array.from({ length: n }, (_, i) => ({ duracao: 8, kicker: `S${i + 1}`, titulo: "T" }));
  writeFileSync(join(pasta, "stories.json"), JSON.stringify(publicacao ? { tipo: "stories", publicacao, stories } : { tipo: "stories", stories }));
  for (let i = 1; i <= n; i++) writeFileSync(join(pasta, `story-0${i}.mp4`), Buffer.from("mp4"));
  if (pngs) writeFileSync(join(pasta, "story-aviso.png"), await sharp({ create: { width: 9, height: 16, channels: 3, background: "#000" } }).png().toBuffer());
  return pasta;
}
const corpos = (f) => f.chamadas.filter((c) => c.metodo === "POST" && /graph\.instagram/.test(c.url)).map((c) => Object.fromEntries(new URLSearchParams(c.corpo)));

test("publicarStory: MP4 vira contêiner STORIES com video_url, espera mais, publica e registra no livro-razão", async () => {
  const pasta = await pastaDeStories(1);
  const f = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  const r = await publicarStory(pasta, "story-01.mp4", { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} });
  assert.deepEqual(r, { arquivo: "story-01.mp4", media_id: "midia77", publicado_em: new Date(AGORA).toISOString() });
  assert.deepEqual(lerPublicacoesDeStories(pasta), { stories: [r] });
  const [container, publish] = corpos(f);
  assert.equal(container.media_type, "STORIES");
  assert.match(container.video_url, /raw\.githubusercontent\.com\/dono\/repo\/c0ffee\/2026-10-01-quiz-\d{14}-story-01\.mp4$/);
  assert.equal(publish.creation_id, "cont1");
  assert.equal(TENTATIVAS_VIDEO, 60);
  await assert.rejects(publicarStory(pasta, "story-01.mp4", { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} }), /já foi publicado/);
});

test("publicarStory: PNG vai como image_url em JPEG; arquivo inexistente ou de outro tipo é recusado", async () => {
  const pasta = await pastaDeStories(1, { pngs: true });
  const f = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  await publicarStory(pasta, "story-aviso.png", { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} });
  const [container] = corpos(f);
  assert.equal(container.media_type, "STORIES");
  assert.match(container.image_url, /story-aviso\.jpg$/);
  assert.equal(container.video_url, undefined);
  const opc = { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} };
  await assert.rejects(publicarStory(pasta, "nao-existe.mp4", opc), /não achei nao-existe\.mp4/);
  writeFileSync(join(pasta, "x.txt"), "x");
  await assert.rejects(publicarStory(pasta, "x.txt", opc), /\.mp4 ou \.png/);
});

test("publicarStories: em ordem, para no primeiro erro dizendo o que saiu, e retoma de onde parou", async () => {
  const pasta = await pastaDeStories(3);
  const opc = (f) => ({ tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} });
  const quebraNo2 = fetchFalso([
    ...rotasInstagram().filter((r) => !(r.metodo === "GET" && r.url.test("https://graph.instagram.com/v23.0/cont1?fields=status_code"))),
    { metodo: "GET", url: /\/cont\d+\?/, json: ({ url }) => ({ status_code: /cont2\?/.test(url) ? "ERROR" : "FINISHED", status: "" }) },
    ...rotasGithub(),
  ]);
  await assert.rejects(publicarStories(pasta, opc(quebraNo2)), (e) => e instanceof ErroInstagram
    && /falhou em story-02\.mp4/.test(e.message) && /publicados agora: story-01\.mp4/.test(e.message) && /pendentes: story-02\.mp4, story-03\.mp4/.test(e.message));
  assert.deepEqual(lerPublicacoesDeStories(pasta).stories.map((s) => s.arquivo), ["story-01.mp4"]);

  const ok = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  const r = await publicarStories(pasta, opc(ok));
  assert.deepEqual(r.publicados.map((s) => s.arquivo), ["story-02.mp4", "story-03.mp4"]);
  assert.equal(corpos(ok).filter((c) => c.media_type === "STORIES").length, 2);
  assert.deepEqual(lerPublicacoesDeStories(pasta).stories.map((s) => s.arquivo), ["story-01.mp4", "story-02.mp4", "story-03.mp4"]);
  await assert.rejects(publicarStories(pasta, opc(ok)), /todos os 3 stories já foram publicados/);
});

test("publicarStories recusa sequência manual (sem publicacao: api) e sequência com MP4 faltando", async () => {
  const f = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  const opc = { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} };
  await assert.rejects(publicarStories(await pastaDeStories(2, { publicacao: null }), opc), /manual/);
  const semMp4 = await pastaDeStories(2);
  unlinkSync(join(semMp4, "story-02.mp4"));
  await assert.rejects(publicarStories(semMp4, opc), /falta story-02\.mp4/);
  assert.equal(f.chamadas.length, 0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- tests/instagram.test.mjs`
Expected: falha na importação (`publicarStory` não é exportado) — os 4 testes novos não rodam; os antigos continuam passando quando a importação for resolvida.

- [ ] **Step 3: Refatorar a pré-checagem e escrever `publicarStory`/`publicarStories`**

Em `scripts/instagram.mjs`, troque `import { join, resolve, dirname, basename } from "node:path";` por `import { join, resolve, dirname, basename, extname } from "node:path";`. Depois de `const nn = …` e `const sanitizarNome = …` (linhas 164–167), acrescente:

```js
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
```

Em `publicarPost`, troque as linhas 180–191 (dos dois `if (!tokens…)` até `if (repo.private) …`) por:

```js
  const { ig, igId, gh } = await prepararPublicacao({ tokens, canal, fetchImpl });
```

e troque `const carimbo = new Date(agora).toISOString().replace(/\D/g, "").slice(0, 14);` por `const carimbo = carimboDe(agora);`. Troque o bloco `finally { … }` inteiro de `publicarPost` por `finally { await esvaziarMidia(gh, canal, log); }`.

- [ ] **Step 4: CLI**

No `USO` acrescente duas linhas e no `if/else` da CLI dois ramos:

```js
const USO = `uso:
  node scripts/instagram.mjs --token "<token do Instagram>"
  node scripts/instagram.mjs --token-github "<token do GitHub>"
  node scripts/instagram.mjs --status
  node scripts/instagram.mjs --publicar instagram/<pasta>
  node scripts/instagram.mjs --publicar-story instagram/<pasta> <arquivo.mp4|.png>
  node scripts/instagram.mjs --publicar-stories instagram/<pasta>`;
```

```js
    } else if (opcao === "--publicar-story" && valor && process.argv[4]) {
      const tokens = await renovarSeNecessario(lerTokens());
      const r = await publicarStory(resolve(valor), process.argv[4], { tokens });
      console.log(`story publicado: ${r.arquivo} (id ${r.media_id})`);
    } else if (opcao === "--publicar-stories" && valor) {
      const tokens = await renovarSeNecessario(lerTokens());
      const r = await publicarStories(resolve(valor), { tokens });
      console.log(`sequência publicada: ${r.publicados.map((p) => p.arquivo).join(", ")}`);
    } else {
```

Atualize também o comentário do cabeçalho do arquivo (linhas 4–7) com as duas linhas novas de uso.

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`; os testes antigos de `publicarPost` continuam passando (mensagens de erro de token e repositório iguais).

- [ ] **Step 6: Commit**

```bash
git add scripts/instagram.mjs tests/instagram.test.mjs
git commit -m "Instagram: publicar stories pela API (um story e a sequência, com livro-razão retomável)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `instagram.mjs` publica reels pela API

**Files:**
- Modify: `scripts/instagram.mjs`
- Test: `tests/instagram.test.mjs`

**Interfaces:**
- Consumes: `prepararPublicacao`, `subirMidia`, `esperarContainer`, `TENTATIVAS_VIDEO`, `esvaziarMidia`, `carimboDe` (Task 1).
- Produces: `publicarReel(pasta, opcoes) → Promise<{ media_id, url, publicado_em }>`; grava `publicacao-reel.json`. Exige `reel.mp4` e `reel-legenda.txt` na pasta (gerados nas Tasks 9/10).

- [ ] **Step 1: Escrever os testes**

Acrescente a `tests/instagram.test.mjs` (`publicarReel` entra na linha de import da Task 1):

```js
async function pastaDeReel({ legenda = true } = {}) {
  const pasta = join(mkdtempSync(join(tmpdir(), "reel-")), "2026-10-02-corte");
  mkdirSync(pasta);
  writeFileSync(join(pasta, "reel.mp4"), Buffer.from("mp4"));
  if (legenda) writeFileSync(join(pasta, "reel-legenda.txt"), "Gancho do reel.\n\n#PO\n");
  return pasta;
}

test("publicarReel: contêiner REELS com video_url, legenda, share_to_feed e thumb_offset; grava publicacao-reel.json", async () => {
  const pasta = await pastaDeReel();
  const f = fetchFalso([...rotasInstagram(), ...rotasGithub()]);
  const opc = { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} };
  const r = await publicarReel(pasta, opc);
  assert.deepEqual(r, { media_id: "midia77", url: "https://www.instagram.com/p/abc/", publicado_em: new Date(AGORA).toISOString() });
  assert.deepEqual(JSON.parse(readFileSync(join(pasta, "publicacao-reel.json"), "utf8")), r);
  const [container, publish] = corpos(f);
  assert.equal(container.media_type, "REELS");
  assert.match(container.video_url, /2026-10-02-corte-\d{14}-reel\.mp4$/);
  assert.equal(container.caption, "Gancho do reel.\n\n#PO");
  assert.equal(container.share_to_feed, "true");
  assert.equal(container.thumb_offset, "3000");
  assert.equal(publish.creation_id, "cont1");
  await assert.rejects(publicarReel(pasta, opc), /já foi publicado/);
});

test("publicarReel recusa pasta sem reel.mp4 ou sem reel-legenda.txt, sem chamar a rede", async () => {
  const f = fetchFalso([]);
  const opc = { tokens: tokensOk, canal, fetchImpl: f, agora: AGORA, dormir: semDormir, log: () => {} };
  await assert.rejects(publicarReel(await pastaDeReel({ legenda: false }), opc), /reel-legenda\.txt/);
  const vazia = mkdtempSync(join(tmpdir(), "reel-"));
  await assert.rejects(publicarReel(vazia, opc), /reel\.mp4/);
  assert.equal(f.chamadas.length, 0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- tests/instagram.test.mjs`
Expected: falha na importação de `publicarReel`.

- [ ] **Step 3: Implementar `publicarReel`**

Depois de `publicarStories` em `scripts/instagram.mjs`:

```js
// Publica instagram/<pasta>/reel.mp4 com reel-legenda.txt como reel (também vai para o feed).
export async function publicarReel(pasta, { tokens, canal = lerCanal(), fetchImpl = fetch, agora = Date.now(), dormir = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  const mp4 = join(pasta, "reel.mp4"), arquivoLegenda = join(pasta, "reel-legenda.txt");
  if (!existsSync(mp4)) throw new ErroInstagram(`falta reel.mp4 em ${pasta} — rode: node design-system/scripts/gerar-reel.mjs ${pasta}`);
  if (!existsSync(arquivoLegenda)) throw new ErroInstagram(`falta reel-legenda.txt — rode: node scripts/legenda.mjs ${pasta} --reel`);
  if (existsSync(join(pasta, "publicacao-reel.json"))) throw new ErroInstagram("este reel já foi publicado (publicacao-reel.json existe) — apague o arquivo se quiser publicar de novo");
  const legenda = readFileSync(arquivoLegenda, "utf8").trim();
  const { ig, igId, gh } = await prepararPublicacao({ tokens, canal, fetchImpl });
  const nome = `${sanitizarNome(basename(pasta))}-${carimboDe(agora)}-reel.mp4`;
  log(`subindo reel.mp4 para o branch midia de ${canal.github}…`);
  const midia = await subirMidia(gh, [{ nome, conteudo: readFileSync(mp4) }], { repo: canal.github });
  try {
    log("criando o reel…");
    // thumb_offset: capa aos 3 s — no primeiro quadro das cenas animadas ainda não há texto
    const { id } = await ig.post(`${igId}/media`, { media_type: "REELS", video_url: midia.urls[0], caption: legenda, share_to_feed: "true", thumb_offset: "3000" });
    await esperarContainer(ig, id, dormir, TENTATIVAS_VIDEO);
    log("publicando…");
    const publicado = await ig.post(`${igId}/media_publish`, { creation_id: id });
    const { permalink } = await ig.get(publicado.id, "permalink");
    const registro = { media_id: publicado.id, url: permalink, publicado_em: new Date(agora).toISOString() };
    writeFileSync(join(pasta, "publicacao-reel.json"), JSON.stringify(registro, null, 2) + "\n");
    return registro;
  } finally {
    await esvaziarMidia(gh, canal, log);
  }
}
```

CLI: acrescente ao `USO` a linha `  node scripts/instagram.mjs --publicar-reel instagram/<pasta>` e o ramo:

```js
    } else if (opcao === "--publicar-reel" && valor) {
      const tokens = await renovarSeNecessario(lerTokens());
      const r = await publicarReel(resolve(valor), { tokens });
      console.log(`reel publicado: ${r.url}`);
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/instagram.mjs tests/instagram.test.mjs
git commit -m "Instagram: publicar reels pela API (reel.mp4 + reel-legenda.txt → publicacao-reel.json)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Motor de cenas reutilizável — `publicacao`, modo sem sticker, áudio mudo, `renderizarCenas`

**Files:**
- Modify: `design-system/scripts/gerar-story-video.mjs`
- Modify: `design-system/instagram/story-video.css`, `design-system/instagram/layouts/story-cena.html`
- Test: `tests/story-video.test.mjs`

**Interfaces:**
- Produces: `PUBLICACOES = ["api", "manual"]`; `validar(spec)` (inalterado no retorno; agora também rejeita `publicacao` inválida); `htmlDaCena(s, ds, { semSticker = false })`; `argsFfmpeg(mp4, fps = LIMITES.fps) → string[]`; `gravarCena(html, mp4, pngFinal, { duracao, largura, altura })` (era `gravar`, agora exportada); `renderizarCenas(cenas, { pasta, prefixo = "story", numerar = true, soHtml = false, so = null, semSticker = false }) → Promise<string[]>` (recebe cenas já validadas; grava `${prefixo}-NN.mp4`/`.png` ou, com `numerar: false`, `${prefixo}.mp4`/`.png`); `gerarStoryVideo(pasta, { soHtml, so })` (inalterada por fora).

- [ ] **Step 1: Escrever os testes**

Acrescente a `tests/story-video.test.mjs` (`argsFfmpeg`, `renderizarCenas`, `PUBLICACOES` entram no import da linha 3; acrescente `import { mkdtempSync, readFileSync, existsSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";`):

```js
test("publicacao: aceita api ou manual, recusa outro valor; padrão é manual (sem o campo)", () => {
  assert.deepEqual(PUBLICACOES, ["api", "manual"]);
  assert.equal(validar({ ...spec(story()), publicacao: "api" }).length, 1);
  assert.equal(validar({ ...spec(story()), publicacao: "manual" }).length, 1);
  assert.throws(() => validar({ ...spec(story()), publicacao: "app" }), /"publicacao" deve ser "api"/);
});

test("htmlDaCena sem sticker marca a cena com ig--sem-sticker; com sticker, não", () => {
  const [s] = validar(spec(story()));
  assert.ok(htmlDaCena(s, ".", { semSticker: true }).includes('class="ig ig--story ig--story-video ig--sem-sticker"'));
  assert.ok(htmlDaCena(s, ".").includes('class="ig ig--story ig--story-video"'));
});

test("argsFfmpeg acrescenta uma faixa de áudio muda em AAC e mantém H.264 yuv420p", () => {
  const args = argsFfmpeg("/tmp/x.mp4", 30);
  const i = args.indexOf("anullsrc=channel_layout=stereo:sample_rate=44100");
  assert.ok(i > 0 && args[i - 1] === "-i" && args[i - 2] === "lavfi");
  for (const par of [["-map", "0:v"], ["-map", "1:a"], ["-c:a", "aac"], ["-c:v", "libx264"], ["-pix_fmt", "yuv420p"], ["-framerate", "30"]]) {
    assert.ok(args.some((a, j) => a === par[0] && args[j + 1] === par[1]), par.join(" "));
  }
  assert.ok(args.includes("-shortest") && args.at(-1) === "/tmp/x.mp4");
});

test("renderizarCenas --so-html: numera por padrão, ou usa o prefixo puro com numerar: false", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "cenas-"));
  const cenas = validar(spec(story(), story({ kicker: "DOIS" })));
  const numeradas = await renderizarCenas(cenas, { pasta, soHtml: true });
  assert.deepEqual(numeradas.map((s) => s.slice(pasta.length + 1)), ["story-01.html", "story-02.html"]);
  const [uma] = await renderizarCenas(cenas.slice(0, 1), { pasta, prefixo: "story-aviso", numerar: false, soHtml: true, semSticker: true });
  assert.equal(uma.slice(pasta.length + 1), "story-aviso.html");
  assert.ok(readFileSync(uma, "utf8").includes("ig--sem-sticker"));
  const [so2] = await renderizarCenas(cenas, { pasta, soHtml: true, so: 2 });
  assert.ok(so2.endsWith("story-02.html") && readFileSync(so2, "utf8").includes("DOIS"));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- tests/story-video.test.mjs`
Expected: falha na importação (`argsFfmpeg`, `renderizarCenas`, `PUBLICACOES` não existem).

- [ ] **Step 3: `validar`, `htmlDaCena` e o layout**

Em `design-system/scripts/gerar-story-video.mjs`:

1. Depois de `export const LIMITES = { … };` acrescente `export const PUBLICACOES = ["api", "manual"];   // api: sem sticker, sai pela API; manual: com sticker, pelo app (ADR-0007)`.
2. Em `validar`, logo depois do `if (spec?.tipo !== "stories" …)`, acrescente:
```js
  if (spec.publicacao != null && !PUBLICACOES.includes(spec.publicacao)) throw new ErroStoryVideo(`"publicacao" deve ser "api" (sem sticker, sai pela API) ou "manual" (com sticker, pelo app)`);
```
3. Troque a assinatura e o `preencher` de `htmlDaCena`:
```js
export function htmlDaCena(s, ds, { semSticker = false } = {}) {
  const modelo = readFileSync(join(DS, "instagram/layouts/story-cena.html"), "utf8");
  const conteudo = conteudoHtml(s).replace(/\{\{ds\}\}/g, ds);
  return preencher(modelo, {
    ds, conteudo, usuario: canal.instagramUsuario,
    classe_extra: semSticker ? " ig--sem-sticker" : "",
    titulo_pagina: `${s.kicker ?? ""} ${s.titulo ?? ""} — story`.trim(),
    dica: s.dica, dica_t: s.tempos.dica, faixa: s.faixa,
  }, { brutos: ["ds", "conteudo"] });
}
```
4. Em `design-system/instagram/layouts/story-cena.html`, troque `<main class="ig ig--story ig--story-video">` por `<main class="ig ig--story ig--story-video{{classe_extra}}">` e complete o comentário HTML: `… (quiz, enquete, link). Sem sticker (publicação pela API), a classe ig--sem-sticker encolhe essa zona.`
5. Em `design-system/instagram/story-video.css`, depois da regra `.ig--story-video .ig__faixa { … }`, acrescente:
```css
/* sem sticker (publicação pela API): a zona reservada encolhe e o conteúdo ocupa o espaço */
.ig--story-video.ig--sem-sticker { --sv-zona-sticker: 120px; }
```

- [ ] **Step 4: `argsFfmpeg`, `gravarCena` e `renderizarCenas`**

Troque a função `gravar` inteira (linhas 137–167) por:

```js
// A Meta rejeita MP4 sem faixa de áudio: entra uma faixa AAC muda (anullsrc), cortada no fim do vídeo (-shortest).
export function argsFfmpeg(mp4, fps = LIMITES.fps) {
  return [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
    mp4,
  ];
}

export async function gravarCena(html, mp4, pngFinal, { duracao, largura, altura }) {
  const [{ default: puppeteer }, { default: ffmpeg }] = await Promise.all([import("puppeteer-core"), import("ffmpeg-static")]);
  const fps = LIMITES.fps, quadros = Math.round(duracao * fps);
  const browser = await puppeteer.launch({ executablePath: acharNavegador(), headless: true, args: ["--hide-scrollbars", "--disable-gpu"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: largura, height: altura, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => { for (const a of document.getAnimations()) a.pause(); }));

    const ff = spawn(ffmpeg, argsFfmpeg(mp4, fps), { stdio: ["pipe", "inherit", "inherit"] });
    const terminou = new Promise((ok, falha) => { ff.on("error", falha); ff.on("close", (c) => (c === 0 ? ok() : falha(new ErroStoryVideo(`ffmpeg terminou com código ${c}`)))); });

    let ultimo;
    for (let i = 0; i < quadros; i++) {
      await page.evaluate((ms) => { for (const a of document.getAnimations()) a.currentTime = ms; }, (i * 1000) / fps);
      ultimo = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: largura, height: altura } });
      if (!ff.stdin.write(ultimo)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end();
    await terminou;
    writeFileSync(pngFinal, ultimo);
  } finally {
    await browser.close();
  }
}

// Grava cenas já validadas em <pasta>/<prefixo>-NN.mp4 (+ .png do último quadro); com numerar: false, <prefixo>.mp4.
export async function renderizarCenas(cenas, { pasta, prefixo = "story", numerar = true, soHtml = false, so = null, semSticker = false }) {
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  const { largura, altura } = formatos.formatos.story;
  const saidas = [];
  for (const [i, s] of cenas.entries()) {
    if (so && so !== i + 1) continue;
    const base = numerar ? `${prefixo}-${String(i + 1).padStart(2, "0")}` : prefixo;
    const html = join(pasta, `${base}.html`);
    writeFileSync(html, htmlDaCena(s, ds, { semSticker }));
    if (soHtml) { saidas.push(html); continue; }
    const mp4 = join(pasta, `${base}.mp4`), png = join(pasta, `${base}.png`);
    await gravarCena(html, mp4, png, { duracao: s.duracao, largura, altura });
    unlinkSync(html);
    saidas.push(mp4);
  }
  return saidas;
}

export async function gerarStoryVideo(pasta, { soHtml = false, so = null } = {}) {
  const arquivo = join(pasta, "stories.json");
  if (!existsSync(arquivo)) throw new ErroStoryVideo(`não achei ${arquivo}`);
  const spec = JSON.parse(readFileSync(arquivo, "utf8"));
  return renderizarCenas(validar(spec), { pasta, soHtml, so, semSticker: spec.publicacao === "api" });
}
```

(Isso substitui também a antiga `gerarStoryVideo`, linhas 169–188.) Atualize o comentário de cabeçalho: a linha "1080×1920, MP4 H.264, sem som" vira "1080×1920, MP4 H.264 com faixa de áudio muda", e acrescente: `// stories.json pode ter "publicacao": "api" (sem sticker: sai pela API, node scripts/instagram.mjs --publicar-stories) ou "manual" (padrão: com sticker, pelo app).`

- [ ] **Step 5: Rodar os testes e regerar o exemplo**

Run: `npm test && node design-system/scripts/gerar-story-video.mjs instagram/2026-09-22-como-funciona-po --so 1 && git status --short instagram/`
Expected: `# fail 0`; o MP4 regenerado aparece modificado (agora tem faixa de áudio) — confira com `node -e "import('ffmpeg-static').then(m=>console.log(m.default))"` → `<caminho>/ffmpeg -i instagram/2026-09-22-como-funciona-po/story-01.mp4 2>&1 | grep Audio` deve mostrar `Audio: aac`. Regenere a sequência inteira (`… --so` sem número) para os cinco MP4 ficarem iguais entre si.

- [ ] **Step 6: Commit**

```bash
git add design-system/scripts/gerar-story-video.mjs design-system/instagram/story-video.css design-system/instagram/layouts/story-cena.html tests/story-video.test.mjs instagram/2026-09-22-como-funciona-po/
git commit -m "Stories em vídeo: motor renderizarCenas reutilizável, publicacao api/manual, modo sem sticker e faixa de áudio muda

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Story de aviso de post novo (`gerar-story-aviso.mjs`) e o gancho na skill `post`

**Files:**
- Create: `design-system/scripts/gerar-story-aviso.mjs`
- Modify: `.claude/skills/post/SKILL.md`, `design-system/instagram/GUIA-AGENTE.md` (seção "Comandos"), `package.json` (script `story-aviso`)
- Test: `tests/story-aviso.test.mjs`

**Interfaces:**
- Consumes: `validar`, `renderizarCenas`, `LIMITES`, `ErroStoryVideo` (Task 3); `publicarStory` (Task 1, na skill).
- Produces: `ErroStoryAviso`; `DURACAO_AVISO = 8`; `encurtar(texto, max) → string`; `cenaDoAviso(cards) → cena` (objeto no formato de um item de `stories.json`); `gerarStoryAviso(pasta, { soHtml }) → Promise<string>` (`story-aviso.mp4`, ou `.html` com `soHtml`).

- [ ] **Step 1: Escrever os testes**

`tests/story-aviso.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { encurtar, cenaDoAviso, gerarStoryAviso, ErroStoryAviso, DURACAO_AVISO } from "../design-system/scripts/gerar-story-aviso.mjs";
import { validar, LIMITES } from "../design-system/scripts/gerar-story-video.mjs";

const exemplo = fileURLToPath(new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url));
const kruskal = JSON.parse(readFileSync(join(exemplo, "cards.json"), "utf8"));

test("encurtar corta na última palavra inteira e termina com reticências", () => {
  assert.equal(encurtar("curto", 10), "curto");
  assert.equal(encurtar("uma frase bem comprida mesmo", 15), "uma frase bem…");
  assert.equal(encurtar("semespacoalgumnestafrase", 10), "semespaco…");
  assert.ok(encurtar("a".repeat(100), 60).length <= 60);
});

test("cena do artigo: kicker fixo, título encurtado ao limite, autores e onde nas linhas, faixa VEJA NO FEED", () => {
  const cena = cenaDoAviso(kruskal);
  assert.equal(cena.kicker, "POST NOVO: RESUMO DE ARTIGO");
  assert.ok(cena.titulo.length <= LIMITES.campos.titulo && cena.titulo.endsWith("…"));
  assert.deepEqual(cena.linhas, ["Joseph B. Kruskal", "Proc. of the AMS, 1956"]);
  assert.equal(cena.faixa, "VEJA NO FEED");
  assert.equal(cena.duracao, DURACAO_AVISO);
  assert.equal(validar({ tipo: "stories", publicacao: "api", stories: [cena] }).length, 1);
});

test("cena do aviso: kicker do card, data e primeira frase do texto", () => {
  const cena = cenaDoAviso({ tipo: "aviso", cards: [{ tipo: "aviso", kicker: "PRAZO", titulo: "Chamada de trabalhos SBPO", data: "ATÉ 15/03", texto: "Artigos completos. Resumo estendido também vale." }] });
  assert.equal(cena.kicker, "POST NOVO: PRAZO");
  assert.deepEqual(cena.linhas, ["ATÉ 15/03", "Artigos completos."]);
  assert.throws(() => cenaDoAviso({ tipo: "reel", cards: [{}] }), ErroStoryAviso);
});

test("gerarStoryAviso --so-html escreve story-aviso.html sem sticker com o título do post", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "aviso-"));
  copyFileSync(join(exemplo, "cards.json"), join(pasta, "cards.json"));
  const saida = await gerarStoryAviso(pasta, { soHtml: true });
  assert.ok(saida.endsWith("story-aviso.html"));
  const html = readFileSync(saida, "utf8");
  assert.ok(html.includes("ig--sem-sticker") && html.includes("POST NOVO: RESUMO DE ARTIGO") && html.includes("VEJA NO FEED"));
  writeFileSync(join(pasta, "cards.json"), "{}");
  await assert.rejects(gerarStoryAviso(pasta, { soHtml: true }), ErroStoryAviso);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- tests/story-aviso.test.mjs`
Expected: falha — módulo não existe.

- [ ] **Step 3: Escrever o script**

`design-system/scripts/gerar-story-aviso.mjs`:

```js
#!/usr/bin/env node
// Gera instagram/<pasta>/story-aviso.mp4 (+ story-aviso.png, último quadro): o story que avisa
// de um post novo no feed, montado a partir de cards.json. Não tem sticker, então sai pela API:
//   node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta>            # story-aviso.mp4
//   node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta> --so-html  # só o HTML
//   node scripts/instagram.mjs --publicar-story instagram/<pasta> story-aviso.mp4   (a skill post chama, depois do post)

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validar, renderizarCenas, ErroStoryVideo, LIMITES } from "./gerar-story-video.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export class ErroStoryAviso extends Error {}
export const DURACAO_AVISO = 8;

// Corta na última palavra inteira que cabe em `max` (contando a reticência).
export function encurtar(texto, max) {
  const t = String(texto ?? "").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > max / 2 ? corte.slice(0, espaco) : corte).trim()}…`;
}

const primeiraFrase = (t) => (String(t ?? "").match(/^[^.!?\n]+[.!?]?/) ?? [""])[0].trim();

export function cenaDoAviso(cards) {
  const c = cards?.cards?.[0];
  if (!c) throw new ErroStoryAviso("cards.json sem cards — rode a skill post");
  const T = LIMITES.campos, linha = (s) => encurtar(s, T.linha);
  const base = { duracao: DURACAO_AVISO, faixa: "VEJA NO FEED" };
  switch (cards.tipo) {
    case "artigo": return { ...base, kicker: "POST NOVO: RESUMO DE ARTIGO", titulo: encurtar(c.titulo, T.titulo), linhas: [c.autores, c.onde].filter(Boolean).map(linha) };
    case "aviso": return { ...base, kicker: `POST NOVO: ${c.kicker ?? "AVISO"}`, titulo: encurtar(c.titulo, T.titulo), linhas: [c.data, primeiraFrase(c.texto)].filter(Boolean).map(linha) };
    default: throw new ErroStoryAviso(`não sei fazer story de aviso para o tipo "${cards.tipo}"`);
  }
}

export async function gerarStoryAviso(pasta, { soHtml = false } = {}) {
  const arquivo = join(pasta, "cards.json");
  if (!existsSync(arquivo)) throw new ErroStoryAviso(`não achei ${arquivo} — rode a skill post`);
  const cena = cenaDoAviso(JSON.parse(readFileSync(arquivo, "utf8")));
  const cenas = validar({ tipo: "stories", publicacao: "api", stories: [cena] });
  const [saida] = await renderizarCenas(cenas, { pasta, prefixo: "story-aviso", numerar: false, soHtml, semSticker: true });
  return saida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta> [--so-html]"); process.exit(1); }
  try {
    console.log(relative(RAIZ, await gerarStoryAviso(resolve(pasta), { soHtml: args.includes("--so-html") })));
  } catch (e) {
    if (e instanceof ErroStoryAviso || e instanceof ErroStoryVideo) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

Em `package.json`, em `"scripts"`, acrescente `"story-aviso": "node design-system/scripts/gerar-story-aviso.mjs"`.

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 5: Ligar na skill `post` e no guia**

Em `.claude/skills/post/SKILL.md`:

1. No passo **2. Cards e legenda**, depois de `… e \`node scripts/legenda.mjs instagram/<pasta>\`, olhe cada PNG.` acrescente: `Depois gere o story de aviso: \`node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta>\` → \`story-aviso.mp4\` e \`story-aviso.png\` (último quadro). Abra o PNG: o título do post precisa estar legível, mesmo encurtado.`
2. No passo **3. PARADA**, troque `Abra os PNGs (…) e mostre a legenda inteira.` por `Abra os PNGs (\`open instagram/<pasta>/card-*.png instagram/<pasta>/story-aviso.png\` no Mac, \`start …\` no Windows) e mostre a legenda inteira.` e a pergunta por `"Aprova os cards, a legenda e o story de aviso? Quer trocar alguma palavra?"`.
3. No passo **4. Publicar**, entre o item 2 (`--publicar`) e o item 3 (`Entregue: …`), insira:
   `3. Story de aviso: \`node scripts/instagram.mjs --publicar-story instagram/<pasta> story-aviso.mp4\`. Se sair \`erro: …\`, o post já está no ar — mostre o erro, diga que o post ficou publicado e o story não, e pare (não tente de novo por conta própria).`
   e renumere o "Entregue" para 4, trocando o texto por: `"Post no ar: <url de publicacao.json>; story de aviso publicado. Confira no app se o carrossel abriu na ordem certa."`

Em `design-system/instagram/GUIA-AGENTE.md`, seção **Comandos**, acrescente as linhas:
```bash
node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta>          # story-aviso.mp4 (aviso de post novo, sem sticker)
node scripts/instagram.mjs --publicar-story instagram/<pasta> story-aviso.mp4  # publica um story sem sticker
node scripts/instagram.mjs --publicar-stories instagram/<pasta>               # publica a sequência (stories.json com "publicacao": "api")
```

- [ ] **Step 6: Commit**

```bash
git add design-system/scripts/gerar-story-aviso.mjs tests/story-aviso.test.mjs package.json .claude/skills/post/SKILL.md design-system/instagram/GUIA-AGENTE.md
git commit -m "Story de aviso de post novo: gerar-story-aviso.mjs e publicação pela API ao fim da skill post

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Checagem — `scripts/checagem.mjs`, exemplo no Kruskal, exigência em `--publicar`, passo na skill e no guia

**Files:**
- Create: `scripts/checagem.mjs`, `instagram/2026-09-20-kruskal-1956/checagem.json`
- Modify: `scripts/instagram.mjs` (`publicarPost`), `.claude/skills/post/SKILL.md`, `design-system/instagram/GUIA-AGENTE.md`, `package.json`
- Test: `tests/checagem.test.mjs`, `tests/instagram.test.mjs` (`pastaDePost`)

**Interfaces:**
- Produces: `ErroChecagem`; `RESULTADOS = ["confirmada", "nao-confirmada", "sem-acesso"]`; `TIPOS = ["fonte", "conta"]`; `TIPOS_DE_POST_COM_CHECAGEM = ["artigo", "curiosidade"]`; `COMO_MIN = 20`; `precisaChecagem(tipoPost) → boolean`; `validarChecagem(dados) → string[]`; `resumoChecagem(dados) → string`; `carregarChecagem(pasta) → dados` (lança `ErroChecagem` se faltar ou for inválido).
- `publicarPost` passa a lançar `ErroInstagram` com a mensagem do `ErroChecagem` quando `precisaChecagem(cards.tipo)` e a Checagem falta/é inválida.

- [ ] **Step 1: Escrever os testes**

`tests/checagem.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validarChecagem, resumoChecagem, carregarChecagem, precisaChecagem, ErroChecagem, RESULTADOS, TIPOS } from "../scripts/checagem.mjs";

const exemplo = new URL("../instagram/2026-09-20-kruskal-1956/checagem.json", import.meta.url);
const kruskal = JSON.parse(readFileSync(exemplo, "utf8"));
const ok = { onde: "card 2", texto: "x = 4", tipo: "conta", resultado: "confirmada", como: "enumerei as combinações inteiras e o máximo é 220" };

test("o exemplo do Kruskal é uma Checagem válida com fonte por DOI", () => {
  assert.deepEqual(validarChecagem(kruskal), []);
  assert.ok(kruskal.afirmacoes.every((a) => a.tipo === "fonte" && a.fonte.startsWith("https://doi.org/")));
});

test("artigo e curiosidade exigem Checagem; aviso e citacao, não", () => {
  assert.ok(precisaChecagem("artigo") && precisaChecagem("curiosidade"));
  assert.ok(!precisaChecagem("aviso") && !precisaChecagem("citacao"));
});

test("validação: campos obrigatórios, valores permitidos, fonte com URL, conta não fica sem acesso, como diz o que conferiu", () => {
  assert.deepEqual(RESULTADOS, ["confirmada", "nao-confirmada", "sem-acesso"]);
  assert.deepEqual(TIPOS, ["fonte", "conta"]);
  assert.ok(validarChecagem({})[0].includes("afirmacoes"));
  assert.ok(validarChecagem({ afirmacoes: [] })[0].includes("pelo menos uma"));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, como: "" }] }).some((e) => e.includes('falta "como"')));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, tipo: "palpite" }] }).some((e) => e.includes("fonte ou conta")));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, resultado: "talvez" }] }).some((e) => e.includes("confirmada, nao-confirmada, sem-acesso")));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, tipo: "fonte" }] }).some((e) => e.includes('"fonte" com a URL')));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, tipo: "fonte", fonte: "doi.org/x" }] }).some((e) => e.includes('"fonte" com a URL')));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, resultado: "sem-acesso" }] }).some((e) => e.includes("recalcule")));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, como: "conferi" }] }).some((e) => e.includes("pelo menos 20")));
  assert.deepEqual(validarChecagem({ afirmacoes: [ok, { ...ok, tipo: "fonte", fonte: "https://doi.org/10.1/x", resultado: "sem-acesso", como: "o DOI leva a uma página paga; não li o artigo" }] }), []);
});

test("resumo: agrupa por resultado, na ordem confirmei / não confirmei / sem acesso, com onde, texto e como", () => {
  const r = resumoChecagem({ afirmacoes: [ok, { ...ok, onde: "card 3", texto: "y", resultado: "nao-confirmada", como: "não achei isso no artigo; o texto foi ajustado" }] });
  const linhas = r.split("\n");
  assert.equal(linhas[0], "CHECAGEM — 2 afirmação(ões)");
  assert.equal(linhas[1], "✔ Confirmei (1)");
  assert.equal(linhas[2], '  - card 2: "x = 4" — enumerei as combinações inteiras e o máximo é 220');
  assert.equal(linhas[3], "✖ Não confirmei (1)");
  assert.equal(linhas[4], '  - card 3: "y" — não achei isso no artigo; o texto foi ajustado');
  assert.equal(linhas[5], "⚠ Sem acesso à fonte (0)");
  assert.ok(resumoChecagem(kruskal).startsWith("CHECAGEM — "));
});

test("carregarChecagem: falta → erro apontando o guia; inválido → erro listando; válido → devolve", () => {
  const pasta = mkdtempSync(join(tmpdir(), "chec-"));
  assert.throws(() => carregarChecagem(pasta), (e) => e instanceof ErroChecagem && /falta checagem\.json/.test(e.message) && /GUIA-AGENTE/.test(e.message));
  writeFileSync(join(pasta, "checagem.json"), JSON.stringify({ afirmacoes: [{ ...ok, como: "" }] }));
  assert.throws(() => carregarChecagem(pasta), /checagem\.json inválido/);
  writeFileSync(join(pasta, "checagem.json"), JSON.stringify({ afirmacoes: [ok] }));
  assert.deepEqual(carregarChecagem(pasta), { afirmacoes: [ok] });
});
```

Em `tests/instagram.test.mjs`, na função `pastaDePost`, depois da linha que escreve `legenda.txt`, acrescente:

```js
  if (tipo === "artigo") writeFileSync(join(pasta, "checagem.json"), JSON.stringify({ afirmacoes: [{ onde: "card 2", texto: "t", tipo: "fonte", fonte: "https://doi.org/10.1/x", resultado: "confirmada", como: "conferido no resumo do artigo" }] }));
```

e, no teste `"erros: …"` (o que testa `falta card-03.png`, linha ~225), acrescente:

```js
  const semChecagem = await pastaDePost(3);
  unlinkSync(join(semChecagem, "checagem.json"));
  await assert.rejects(publicarPost(semChecagem, opc()), /falta checagem\.json/);
  const avisoSemChecagem = await pastaDePost(1);
  assert.ok(!existsSync(join(avisoSemChecagem, "checagem.json")));   // aviso não precisa
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `tests/checagem.test.mjs` falha na importação; em `instagram.test.mjs`, `falta checagem.json` não é lançado.

- [ ] **Step 3: Escrever `scripts/checagem.mjs`**

```js
#!/usr/bin/env node
// Valida instagram/<pasta>/checagem.json e imprime o resumo que a skill mostra na parada de aprovação.
//
//   node scripts/checagem.mjs instagram/<pasta>
//
// checagem.json — uma afirmação por fato ou número que o post faz:
//   { "afirmacoes": [
//       { "onde": "card 2", "texto": "…", "tipo": "fonte", "fonte": "https://doi.org/…", "resultado": "confirmada", "como": "trecho do artigo que sustenta" },
//       { "onde": "story 2", "texto": "4 pães e 2 bolos = R$ 220", "tipo": "conta", "resultado": "confirmada", "como": "enumerei as combinações: …" } ] }
// Quem busca a fonte e refaz a conta é a skill; aqui só se confere o esquema (ADR-0009).

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export class ErroChecagem extends Error {}
export const RESULTADOS = ["confirmada", "nao-confirmada", "sem-acesso"];
export const TIPOS = ["fonte", "conta"];
export const TIPOS_DE_POST_COM_CHECAGEM = ["artigo", "curiosidade"];
export const COMO_MIN = 20;

export const precisaChecagem = (tipoPost) => TIPOS_DE_POST_COM_CHECAGEM.includes(tipoPost);

export function validarChecagem(dados) {
  const lista = dados?.afirmacoes;
  if (!Array.isArray(lista)) return ['checagem.json precisa de uma lista "afirmacoes"'];
  if (!lista.length) return ['checagem.json precisa de pelo menos uma afirmação em "afirmacoes"'];
  const erros = [];
  lista.forEach((a, i) => {
    const n = `afirmação ${i + 1}`;
    for (const c of ["onde", "texto", "tipo", "resultado", "como"]) if (!a?.[c] || !String(a[c]).trim()) erros.push(`${n}: falta "${c}"`);
    if (a?.tipo && !TIPOS.includes(a.tipo)) erros.push(`${n}: "tipo" deve ser ${TIPOS.join(" ou ")}`);
    if (a?.resultado && !RESULTADOS.includes(a.resultado)) erros.push(`${n}: "resultado" deve ser ${RESULTADOS.join(", ")}`);
    if (a?.tipo === "fonte" && !/^https?:\/\//.test(a.fonte ?? "")) erros.push(`${n}: afirmação de fonte precisa de "fonte" com a URL consultada (https://…)`);
    if (a?.tipo === "conta" && a.resultado === "sem-acesso") erros.push(`${n}: uma conta não fica "sem-acesso" — recalcule por outro caminho`);
    if (a?.como && String(a.como).trim().length < COMO_MIN) erros.push(`${n}: "como" precisa dizer o que foi conferido (pelo menos ${COMO_MIN} caracteres)`);
  });
  return erros;
}

export function resumoChecagem(dados) {
  const grupos = [["confirmada", "✔ Confirmei"], ["nao-confirmada", "✖ Não confirmei"], ["sem-acesso", "⚠ Sem acesso à fonte"]];
  const linhas = [`CHECAGEM — ${dados.afirmacoes.length} afirmação(ões)`];
  for (const [r, titulo] of grupos) {
    const itens = dados.afirmacoes.filter((a) => a.resultado === r);
    linhas.push(`${titulo} (${itens.length})`);
    for (const a of itens) linhas.push(`  - ${a.onde}: "${a.texto}" — ${a.como}`);
  }
  return linhas.join("\n");
}

export function carregarChecagem(pasta) {
  const arquivo = join(pasta, "checagem.json");
  if (!existsSync(arquivo)) throw new ErroChecagem(`falta checagem.json em ${pasta} — faça a Checagem (design-system/instagram/GUIA-AGENTE.md, passo 3)`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarChecagem(dados);
  if (erros.length) throw new ErroChecagem(`checagem.json inválido:\n- ${erros.join("\n- ")}`);
  return dados;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  if (!arg) { console.error("uso: node scripts/checagem.mjs instagram/<pasta>"); process.exit(1); }
  try {
    console.log(resumoChecagem(carregarChecagem(resolve(arg))));
  } catch (e) {
    if (e instanceof ErroChecagem) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

Em `package.json`, `"scripts"`: `"checagem": "node scripts/checagem.mjs"`.

- [ ] **Step 4: Exigir a Checagem em `publicarPost`**

Em `scripts/instagram.mjs`, acrescente `import { precisaChecagem, carregarChecagem, ErroChecagem } from "./checagem.mjs";` e, em `publicarPost`, logo depois de `const cards = JSON.parse(…)`:

```js
  if (precisaChecagem(cards.tipo)) {
    try { carregarChecagem(pasta); } catch (e) { if (e instanceof ErroChecagem) throw new ErroInstagram(e.message); throw e; }
  }
```

- [ ] **Step 5: Escrever a Checagem real do exemplo Kruskal**

Antes de escrever, **faça a Checagem de verdade**: busque `https://doi.org/10.1090/S0002-9939-1956-0078686-7` (WebFetch; a AMS serve os artigos antigos do Proc. AMS abertos) e confira cada afirmação abaixo contra o texto. Se o que você ler discordar de algum `resultado`/`como`, corrija o JSON para o que encontrou — o arquivo deve refletir o artigo, não este plano. Se não conseguir acessar, troque os `resultado` para `"sem-acesso"` e diga isso em `como`.

`instagram/2026-09-20-kruskal-1956/checagem.json`:

```json
{
  "afirmacoes": [
    { "onde": "card 2", "texto": "Conectar todos os vértices de um grafo gastando o mínimo: é a árvore geradora mínima.",
      "tipo": "fonte", "fonte": "https://doi.org/10.1090/S0002-9939-1956-0078686-7", "resultado": "confirmada",
      "como": "É o problema que o artigo enuncia na abertura: o 'shortest spanning subtree' de um grafo conexo com comprimentos nas arestas." },
    { "onde": "card 2", "texto": "Em 1956, com redes elétricas e de telefone crescendo, era um problema muito prático.",
      "tipo": "fonte", "fonte": "https://doi.org/10.1090/S0002-9939-1956-0078686-7", "resultado": "nao-confirmada",
      "como": "O artigo não fala de redes elétricas nem de telefone; só cita Borůvka como origem do problema. A frase é contexto histórico externo, não do artigo — a pessoa decide se mantém." },
    { "onde": "card 3", "texto": "Ordene as arestas da mais barata para a mais cara. Acrescente uma por vez, pulando toda aresta que fecharia um ciclo.",
      "tipo": "fonte", "fonte": "https://doi.org/10.1090/S0002-9939-1956-0078686-7", "resultado": "confirmada",
      "como": "É a Construction A do artigo: escolher sucessivamente a aresta mais curta ainda não escolhida que não forma ciclo com as já escolhidas." },
    { "onde": "card 4", "texto": "Kruskal prova que escolher sempre a aresta mais barata que não fecha ciclo nunca leva a uma árvore pior.",
      "tipo": "fonte", "fonte": "https://doi.org/10.1090/S0002-9939-1956-0078686-7", "resultado": "confirmada",
      "como": "Teorema do artigo: o subgrafo produzido pela Construction A é uma árvore geradora de comprimento mínimo; a prova ocupa a seção seguinte." },
    { "onde": "card 4", "texto": "Toda rota do caixeiro viajante contém uma árvore geradora.",
      "tipo": "fonte", "fonte": "https://doi.org/10.1090/S0002-9939-1956-0078686-7", "resultado": "confirmada",
      "como": "Na introdução o artigo liga os dois problemas: tirando uma aresta de uma rota do caixeiro fica uma árvore geradora, logo a árvore mínima é um limite inferior para a rota." }
  ]
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test && node scripts/checagem.mjs instagram/2026-09-20-kruskal-1956`
Expected: `# fail 0`; o resumo impresso começa com `CHECAGEM — 5 afirmação(ões)` e lista o card 2 em "Não confirmei" (ou o que você encontrou no artigo).

- [ ] **Step 7: Passo de Checagem no guia e na skill**

Em `design-system/instagram/GUIA-AGENTE.md`, troque o título `## Os cinco passos` por `## Os seis passos`, e insira entre o passo 2 (`Escreva cards.json`) e o antigo passo 3 (`Escreva legenda.json`) — renumerando os seguintes — este passo:

```markdown
3. **Faça a Checagem** (ADR-0009) e escreva `checagem.json`. Para cada afirmação factual ou numérica dos cards (o que o artigo diz, um número, uma data, "prova que", "é o primeiro a"), uma entrada `{ "onde": "card N", "texto": "…", "tipo": "fonte" | "conta", "fonte": "<URL>", "resultado": "confirmada" | "nao-confirmada" | "sem-acesso", "como": "…" }`:
   - `fonte`: busque a fonte pelo link do `post.md` (WebFetch do DOI/URL; se cair em página paga, tente o resumo/abstract ou a versão do autor). Compare o que o card afirma com o que o texto diz. `como` traz o trecho ou a seção que sustenta — ou, se não sustenta, o que o texto diz de diferente. Sem acesso: `"sem-acesso"` e diga em `como` onde tentou.
   - `conta`: refaça a conta por um caminho **diferente** do texto (enumere as combinações num `node -e "…"`, resolva de outro jeito) e cole a conta em `como`. Divergiu? Corrija o card ou o `resultado`.
   - Uma afirmação `nao-confirmada` não some sozinha: reescreva o card para o que a fonte sustenta **ou** deixe como está e mostre à pessoa — é ela quem decide. Nunca "confirme" o que não leu.
   Valide e veja o resumo: `node scripts/checagem.mjs instagram/<pasta>`. `artigo` e `curiosidade` não publicam sem este arquivo; `aviso` e `citacao` não precisam dele.
```

Na seção **Comandos**, acrescente `node scripts/checagem.mjs instagram/<pasta>   # valida checagem.json e imprime o resumo da Checagem`. Na seção **Nunca**, acrescente `- Publicar \`artigo\` ou \`curiosidade\` sem \`checagem.json\` — e nunca marcar "confirmada" o que você não leu na fonte.`

Em `.claude/skills/post/SKILL.md`:
1. No passo **2. Cards e legenda**, troque `Siga \`design-system/instagram/GUIA-AGENTE.md\` do início ao fim: escreva \`cards.json\` e \`legenda.json\`, gere com …` por `Siga \`design-system/instagram/GUIA-AGENTE.md\` do início ao fim: escreva \`cards.json\`, faça a **Checagem** (\`checagem.json\`, passo 3 do guia — busque a fonte pelo link, refaça as contas) e escreva \`legenda.json\`; gere com …`.
2. No passo **3. PARADA**, antes da pergunta "Aprova…", insira: `Cole o resumo de \`node scripts/checagem.mjs instagram/<pasta>\` inteiro, e destaque o que ficou em "Não confirmei" e "Sem acesso": "Estas afirmações eu não consegui confirmar na fonte — quer manter, reescrever ou tirar?"`. Troque a pergunta por `"Aprova os cards, a legenda, o story de aviso e o resultado da Checagem? Quer trocar alguma palavra?"`.

- [ ] **Step 8: Commit**

```bash
git add scripts/checagem.mjs tests/checagem.test.mjs tests/instagram.test.mjs scripts/instagram.mjs instagram/2026-09-20-kruskal-1956/checagem.json package.json design-system/instagram/GUIA-AGENTE.md .claude/skills/post/SKILL.md
git commit -m "Checagem: checagem.json validado e resumido por scripts/checagem.mjs; artigo não publica sem ela (ADR-0009)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Post `curiosidade` (card "você sabia?")

**Files:**
- Modify: `design-system/instagram/formatos.json`, `design-system/scripts/gerar-cards.mjs`, `design-system/scripts/gerar-story-aviso.mjs`, `canal.json`, `instagram/_modelo/post.md`, `design-system/instagram/GUIA-AGENTE.md`, `.claude/skills/post/SKILL.md`
- Create: `design-system/instagram/layouts/curiosidade.html`
- Test: `tests/cards.test.mjs`, `tests/legenda.test.mjs`, `tests/story-aviso.test.mjs`

**Interfaces:**
- Produces: card `curiosidade` (`kicker ≤ 24`, `titulo ≤ 80`, `texto ≤ 320`, `fonte ≤ 80`; obrigatórios `titulo`, `texto`); tipo de post `curiosidade` (1 card); `variaveisDoCard` ganha `fonte`; `canal.json.instagramLegenda.cta.curiosidade`; `cenaDoAviso` trata `curiosidade`.

- [ ] **Step 1: Atualizar os testes**

Em `tests/cards.test.mjs`:
- Troque `assert.deepEqual(Object.keys(formatos.cards), ["capa", "ideia", "fim", "aviso"]);` por `assert.deepEqual(Object.keys(formatos.cards), ["capa", "ideia", "fim", "aviso", "curiosidade"]);`
- Troque `assert.deepEqual(formatos.tipos, { artigo: { min: 3, max: 10 }, aviso: { min: 1, max: 1 } });` por `assert.deepEqual(formatos.tipos, { artigo: { min: 3, max: 10 }, aviso: { min: 1, max: 1 }, curiosidade: { min: 1, max: 1 } });`
- Acrescente:
```js
test("curiosidade: um card do tipo curiosidade, kicker padrão VOCÊ SABIA?, fonte opcional", () => {
  const c = { tipo: "curiosidade", titulo: "O Simplex tem mais de 75 anos", texto: "Dantzig publicou o método em 1947.", fonte: "Dantzig, 1947" };
  assert.deepEqual(validarCards({ tipo: "curiosidade", cards: [c] }), []);
  assert.ok(validarCards({ tipo: "curiosidade", cards: [{ tipo: "aviso", titulo: "X" }] }).some((e) => e.includes("card único é do tipo curiosidade")));
  assert.ok(validarCards({ tipo: "curiosidade", cards: [{ ...c, texto: "x".repeat(321) }] }).some((e) => e.includes("máximo 320")));
  const v = variaveisDoCard(c, 0, 1, { ds: ".", usuario: "po" });
  assert.equal(v.kicker, "VOCÊ SABIA?");
  assert.equal(v.fonte, "Dantzig, 1947");
  const pasta = mkdtempSync(join(tmpdir(), "cards-"));
  writeFileSync(join(pasta, "cards.json"), JSON.stringify({ tipo: "curiosidade", cards: [c] }));
  const [html] = gerarCards(pasta, { soHtml: true });
  const h = readFileSync(html, "utf8");
  assert.ok(h.includes("VOCÊ SABIA?") && h.includes("Dantzig, 1947") && h.includes("ig--feed"));
});
```

Em `tests/legenda.test.mjs`, acrescente (o arquivo já importa `montarLegenda` e lê `canal.json`; se não ler, acrescente `const canal = JSON.parse(readFileSync(new URL("../canal.json", import.meta.url), "utf8"));`):
```js
test("curiosidade usa o CTA de salvar e não leva autores", () => {
  const texto = montarLegenda({ legenda: { gancho: "G", corpo: "C", autores: null, hashtags_tema: ["#A", "#B", "#C"] }, tipo: "curiosidade", canal });
  assert.ok(texto.includes(canal.instagramLegenda.cta.curiosidade) && !texto.includes("Autores"));
  assert.match(canal.instagramLegenda.cta.curiosidade, /Salve/);
});
```

Em `tests/story-aviso.test.mjs`, acrescente:
```js
test("cena da curiosidade: kicker VOCÊ SABIA? e primeira frase do texto", () => {
  const cena = cenaDoAviso({ tipo: "curiosidade", cards: [{ tipo: "curiosidade", titulo: "O Simplex tem mais de 75 anos", texto: "Dantzig publicou o método em 1947. Ainda é o mais usado." }] });
  assert.equal(cena.kicker, "POST NOVO: VOCÊ SABIA?");
  assert.deepEqual(cena.linhas, ["Dantzig publicou o método em 1947."]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: falhas em `cards`, `legenda` e `story-aviso`.

- [ ] **Step 3: Formatos, layout, gerador, CTA**

`design-system/instagram/formatos.json` — em `"cards"`, depois de `"aviso"`, acrescente:
```json
    "curiosidade": { "layout": "curiosidade", "campos": { "kicker": 24, "titulo": 80, "texto": 320, "fonte": 80 }, "obrigatorios": ["titulo", "texto"],
               "quando": "Card único \"você sabia?\": um fato de PO que se sustenta sozinho, com a fonte em uma linha." }
```
e em `"tipos"`: `"curiosidade": { "min": 1, "max": 1 }`.

`design-system/instagram/layouts/curiosidade.html`:
```html
<!doctype html>
<html lang="pt-BR" data-theme="youtube">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080">
<title>{{titulo_pagina}}</title>
<link rel="stylesheet" href="{{ds}}/tokens.css">
<link rel="stylesheet" href="{{ds}}/assets/fontes/fontes.css">
<link rel="stylesheet" href="{{ds}}/instagram/instagram.css">
</head>
<body>
<!-- Card único de curiosidade: kicker "VOCÊ SABIA?", o fato como título, a explicação, a fonte em uma linha. -->
<main class="ig ig--feed">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__kicker">{{kicker}}</p>
    <h1 class="ig__titulo {{titulo_classe}}">{{titulo}}</h1>
    <p class="ig__corpo">{{texto_html}}</p>
    {{#fonte}}<p class="ig__apoio">Fonte: {{fonte}}</p>{{/fonte}}
  </div>
  <p class="ig__rodape"><span>@{{usuario}}</span><span>{{contador}}</span></p>
</main>
</body>
</html>
```

`design-system/scripts/gerar-cards.mjs`:
- `const KICKER_PADRAO = { capa: "RESUMO DE ARTIGO", fim: "REFERÊNCIA", aviso: "AVISO", curiosidade: "VOCÊ SABIA?" };`
- Em `validarCards`, depois da regra do `aviso`: `if (dados.tipo === "curiosidade" && cards.length && cards[0].tipo !== "curiosidade") erros.push("curiosidade: o card único é do tipo curiosidade");`
- Em `variaveisDoCard`, depois de `link: card.link ?? "",`: `fonte: card.fonte ?? "",`
- No comentário de cabeçalho: `"tipo": "artigo" | "aviso" | "curiosidade"` e `"capa" | "ideia" | "fim" | "aviso" | "curiosidade"`.

`canal.json`, em `instagramLegenda.cta`, acrescente `"curiosidade": "💾 Salve este post para lembrar depois · mais curiosidades de PO no link da bio."`.

`design-system/scripts/gerar-story-aviso.mjs`, no `switch` de `cenaDoAviso`, antes do `default`:
```js
    case "curiosidade": return { ...base, kicker: "POST NOVO: VOCÊ SABIA?", titulo: encurtar(c.titulo, T.titulo), linhas: [primeiraFrase(c.texto)].filter(Boolean).map(linha) };
```

- [ ] **Step 4: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 5: Modelo, guia e skill**

`instagram/_modelo/post.md` — troque o comentário inicial `Preencha só a parte do seu tipo (artigo OU aviso) e apague a outra.` por `Preencha só a parte do seu tipo (artigo, aviso ou curiosidade) e apague as outras.` e acrescente ao final:
```markdown
<!-- ===== tipo: curiosidade (card único "você sabia?") ===== -->

## Tema
[o fato ou a ideia de PO, em uma frase — ex.: o Simplex foi criado em 1947 para planejamento da Força Aérea]

## Fonte
[link ou referência de onde você tirou isso — o Claude vai conferir antes de escrever]

## Detalhes
[opcional: o que você quer que apareça na explicação]
```

`design-system/instagram/GUIA-AGENTE.md`:
- No passo 1, troque `ou nome no \`aviso\`` por `nome no \`aviso\`, ou tema e fonte na \`curiosidade\``.
- No passo 2, acrescente ao final: `\`curiosidade\`: um card \`curiosidade\` — \`titulo\` é o fato em até 80 caracteres (afirmativo, sem "você sabia" no texto: o kicker já diz), \`texto\` a explicação em até 320, \`fonte\` a referência em uma linha (autor, ano ou nome do site). A Checagem (passo 3) confere o fato na fonte do \`post.md\`; sem fonte acessível, o card não sai.`
- No bloco de exemplo `Aviso: { … }`, acrescente logo abaixo: `Curiosidade: \`{ "tipo": "curiosidade", "cards": [ { "tipo": "curiosidade", "titulo": "O SIMPLEX TEM MAIS DE 75 ANOS", "texto": "…", "fonte": "Dantzig, 1947" } ] }\`.`
- Em **Regras de copy**, acrescente `- Curiosidade: título em caixa alta como a capa; explicação que ensina, não só anuncia; fonte curta, sem link (o link vai na legenda se couber, senão "link na bio").`
- No passo 3 (Checagem), na lista, acrescente `- \`curiosidade\`: a afirmação principal é o título; se o \`post.md\` traz link, é \`fonte\`; se traz só "li em tal lugar", procure a fonte primária (WebSearch) e registre a URL que usou.`

`.claude/skills/post/SKILL.md`:
- Na `description` do frontmatter, troque `artigo (carrossel) ou aviso (card único)` por `artigo (carrossel), aviso (card único) ou curiosidade (card "você sabia?")` e acrescente `"curiosidade sobre X"` aos gatilhos.
- No passo 1, troque `(artigo: título, autores, onde, link, resumo; aviso: nome, data-limite, link)` por `(artigo: título, autores, onde, link, resumo; aviso: nome, data-limite, link; curiosidade: tema e fonte)`.

- [ ] **Step 6: Commit**

```bash
git add design-system/instagram/formatos.json design-system/instagram/layouts/curiosidade.html design-system/scripts/gerar-cards.mjs design-system/scripts/gerar-story-aviso.mjs canal.json instagram/_modelo/post.md design-system/instagram/GUIA-AGENTE.md .claude/skills/post/SKILL.md tests/cards.test.mjs tests/legenda.test.mjs tests/story-aviso.test.mjs
git commit -m "Post curiosidade: card \"você sabia?\" com fonte, CTA de salvar e Checagem obrigatória

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Skill `stories` — sequência didática e quiz "respondido" pela API

**Files:**
- Create: `.claude/skills/stories/SKILL.md`, `instagram/_modelo/stories.json`
- Modify: `CLAUDE.md` (lista de scripts/skills), `design-system/instagram/GUIA-AGENTE.md` (regra "Nunca")
- Test: `tests/story-video.test.mjs`

**Interfaces:**
- Consumes: `--publicar-stories` (Task 1), `publicacao: "api"` e `ig--sem-sticker` (Task 3), `checagem.json` (Task 5).
- Produces: a skill e o modelo. Nenhum código novo.

- [ ] **Step 1: Teste do modelo e do exemplo existente**

Acrescente a `tests/story-video.test.mjs`:
```js
test("modelo de quiz: dois stories, publicacao api, pergunta com gancho e resposta com 'Entendeu?'", () => {
  const modelo = JSON.parse(readFileSync(new URL("../instagram/_modelo/stories.json", import.meta.url), "utf8"));
  assert.equal(modelo.publicacao, "api");
  const [pergunta, resposta] = validar(modelo);
  assert.ok(pergunta.pergunta && /resposta\?$/i.test(pergunta.dica));
  assert.ok(/^A RESPOSTA/.test(resposta.kicker) && /Entendeu\?$/.test(resposta.dica));
});

test("o exemplo como-funciona-po continua manual (sem publicacao) e válido", () => {
  const spec = JSON.parse(readFileSync(new URL("../instagram/2026-09-22-como-funciona-po/stories.json", import.meta.url), "utf8"));
  assert.equal(spec.publicacao, undefined);
  assert.equal(validar(spec).length, 5);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- tests/story-video.test.mjs`
Expected: o primeiro teste falha (modelo não existe).

- [ ] **Step 3: Modelo `instagram/_modelo/stories.json`**

```json
{
  "tipo": "stories",
  "publicacao": "api",
  "stories": [
    { "duracao": 12, "kicker": "UM DESAFIO", "titulo": "[A SITUAÇÃO EM ATÉ 60 CARACTERES]",
      "linhas": ["[dado 1, até 90 caracteres]", "[dado 2]", "[dado 3]"],
      "pergunta": "[a pergunta, até 60 caracteres]", "dica": "Sabe a resposta?" },
    { "duracao": 12, "kicker": "A RESPOSTA", "titulo": "[A RESPOSTA CURTA]",
      "linhas": ["[a conta em uma linha]", "[por que não é óbvio]", "[o que isso tem a ver com PO]"],
      "dica": "Entendeu?" }
  ]
}
```

- [ ] **Step 4: Skill `.claude/skills/stories/SKILL.md`**

```markdown
---
name: stories
description: Faz uma sequência de stories do PO para Todos em vídeo — um quiz "respondido" (pergunta num story, resposta no seguinte) ou uma sequência didática — do pedido ao stories.json, à Checagem e à publicação pela API quando não há sticker, parando para a pessoa aprovar. Use quando a pessoa disser "faz um quiz sobre X", "stories explicando Y" ou "sequência de stories".
---

# Sequência de stories

Diga antes: "Vou escrever a sequência, gerar os vídeos e conferir as contas; só publico depois do seu sim. Sem sticker ela sai pela API; com sticker (quiz nativo, enquete, link) você posta pelo app."

## 1. Pasta e forma

- Pasta `instagram/<AAAA-MM-DD>-<slug>/` (data prevista; pode ser a pasta de um post da mesma ocasião). Se já tem `stories.json`, veja `publicacao-stories.json`: o que está lá já saiu.
- Pergunte, numa rodada só, o que faltar: o tema; se é **quiz** (pergunta → resposta) ou **didática** (passos, ideia, onde aparece); se quer sticker (aí é manual) — o padrão é **sem sticker, pela API**.

## 2. Escrever `stories.json`

Comece de `instagram/_modelo/stories.json`. Limites e campos: `design-system/scripts/gerar-story-video.mjs` (`LIMITES`: até 10 stories, 5 a 60 s cada, kicker 40, título 60, linha 90, pergunta 60, dica 30, faixa 40). Exemplo manual com stickers: `instagram/2026-09-22-como-funciona-po/`.

**Quiz "respondido"** — o pique é engajar, não entregar:
- Story 1: kicker de situação (`UM DESAFIO`, `UMA DECISÃO`), título com a cena, `linhas` com os dados, `pergunta` e `dica` terminando em "Sabe a resposta?" (ou "Chuta?", "Qual você escolhe?"). Nunca a resposta aqui.
- Story 2: kicker `A RESPOSTA`, título com a resposta curta, `linhas` com a conta em uma linha, por que não era óbvio, e o que isso tem a ver com PO; `dica` "Entendeu?" ou "Acertou?".
- Opcional, story 3: `COMO A PO FUNCIONA` com `itens` (modelar, resolver, decidir) e `faixa` apontando para o canal ("AULA COMPLETA NO CANAL" — sem link, é "link na bio").
- Tom: pergunta direta, dado concreto, zero "incrível"/"surpreendente"; a graça é a conta bater.

**Sem sticker**: `"publicacao": "api"`, sem `stories.md`. **Com sticker**: sem `publicacao` (ou `"manual"`) e escreva `stories.md` como o do exemplo (qual sticker em cada story, como postar).

## 3. Checagem (ADR-0009)

Toda conta e todo fato viram uma entrada em `checagem.json` (formato em `design-system/instagram/GUIA-AGENTE.md`, passo 3). A conta do quiz é `tipo: "conta"`: refaça por um caminho **diferente** do texto — enumere as combinações num `node -e "…"` e cole o resultado em `como`. Se a resposta do story 2 não bater com a conta, corrija o story, não a conta. Valide: `node scripts/checagem.mjs instagram/<pasta>`.

## 4. Gerar

`node design-system/scripts/gerar-story-video.mjs instagram/<pasta>` → `story-NN.mp4` + `story-NN.png` (último quadro). Abra os PNGs: texto inteiro, nada cortado, ordem certa.

## 5. **PARADA**: aprovação

Mostre os PNGs na ordem, o resumo de `node scripts/checagem.mjs instagram/<pasta>` inteiro (destaque "Não confirmei"), e pergunte: "Aprova a sequência e a conta? Quer trocar alguma palavra?" **Não avance sem um sim explícito.**

## 6. Publicar

- Pela API (`"publicacao": "api"`): `node scripts/instagram.mjs --status` (token e cota; se faltar token, README "Publicar no Instagram", token fora do chat), depois `node scripts/instagram.mjs --publicar-stories instagram/<pasta>`. Reporte cada linha. Se sair `erro: falhou em story-NN…`, mostre exatamente: o script diz o que já saiu e o que ficou — corrija e rode **o mesmo comando** de novo, ele continua de onde parou. Não pule stories.
- Manual (com sticker): entregue `stories.md` e diga: "Poste pelo app na ordem, com os stickers indicados; salve no destaque."

Entregue: "Sequência no ar (N stories). Em 24 h ela some; salve no destaque se quiser guardar."
```

- [ ] **Step 5: Regra do story no guia e lista em `CLAUDE.md`**

Em `design-system/instagram/GUIA-AGENTE.md`, seção **Nunca**, troque `- Gerar story pela API (não põe o sticker de link): o story é sempre manual.` por `- Publicar pela API um story que precisa de sticker (link, quiz nativo, enquete): a API não põe sticker. O story de vídeo novo é sempre manual; sequências sem sticker (\`"publicacao": "api"\`) e o story de aviso saem pela API (ADR-0007).`

Em `CLAUDE.md`, na seção **Fluxo de um post do Instagram**, acrescente depois do primeiro parágrafo: `\`/stories instagram/<data>-<slug>\` (skill \`stories\`): quiz "respondido" ou sequência didática → \`stories.json\` + \`checagem.json\` → \`gerar-story-video.mjs\` → parada para aprovar → \`node scripts/instagram.mjs --publicar-stories\` (sem sticker; com sticker é manual, \`docs/adr/0007\`).` e troque `Story de vídeo novo é sempre manual (a API não põe sticker de link).` por `Story de vídeo novo é sempre manual (a API não põe sticker de link); story de aviso de post e sequências sem sticker saem pela API.`

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/stories/SKILL.md instagram/_modelo/stories.json tests/story-video.test.mjs design-system/instagram/GUIA-AGENTE.md CLAUDE.md
git commit -m "Skill stories: quiz respondido e sequência didática pela API, com Checagem da conta (ADR-0007)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Post `citacao` (card único com trecho de vídeo/post) e `scripts/citacao.mjs --candidatos`

**Files:**
- Create: `scripts/citacao.mjs`, `design-system/instagram/layouts/citacao.html`
- Modify: `design-system/instagram/formatos.json`, `design-system/scripts/gerar-cards.mjs`, `design-system/scripts/gerar-story-aviso.mjs`, `canal.json`, `instagram/_modelo/post.md`, `design-system/instagram/GUIA-AGENTE.md`, `.claude/skills/post/SKILL.md`, `package.json`
- Test: `tests/citacao.test.mjs`, `tests/cards.test.mjs`, `tests/story-aviso.test.mjs`

**Interfaces:**
- Consumes: `lerRoteiro` (`scripts/roteiro.mjs`).
- Produces: card `citacao` (`kicker ≤ 24`, `texto ≤ 240`, `origem ≤ 80`; obrigatórios `texto`, `origem`); tipo `citacao` (1 card); `variaveisDoCard` ganha `origem`; `frases(texto) → string[]`; `candidatosDoRoteiro(roteiro) → { texto, origem }[]`; `candidatosDosCards(cards) → { texto, origem }[]`; `candidatos(caminho) → { texto, origem }[]` (decide pelo caminho: `videos/<slug>` → roteiro, `instagram/<pasta>` → cards); CLI `node scripts/citacao.mjs --candidatos <caminho>`.

- [ ] **Step 1: Escrever os testes**

`tests/citacao.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { frases, candidatosDoRoteiro, candidatosDosCards, candidatos, TAMANHO } from "../scripts/citacao.mjs";
import { carregarRoteiro } from "../scripts/roteiro.mjs";

const folgas = fileURLToPath(new URL("../videos/folgas-complementares/", import.meta.url));
const kruskal = fileURLToPath(new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url));

test("frases separa por ponto/interrogação e tira marcações de negrito e emoji", () => {
  assert.deepEqual(frases("Pense num **recurso** que sobrou. Sobrou? Então é zero 🤔 mesmo."), ["Pense num recurso que sobrou.", "Sobrou?", "Então é zero mesmo."]);
});

test("candidatos do roteiro: frases do gancho e das falas entre 60 e 200 caracteres, sem referências ao vídeo, no máximo 5", () => {
  const lista = candidatosDoRoteiro(carregarRoteiro(`${folgas}roteiro.md`));
  assert.ok(lista.length >= 3 && lista.length <= 5);
  for (const c of lista) {
    assert.ok(c.texto.length >= TAMANHO.min && c.texto.length <= TAMANHO.max, c.texto);
    assert.ok(!/nesta aula|vamos |como vimos|no slide/i.test(c.texto), c.texto);
    assert.ok(/^(Gancho|Bloco \d+: )/.test(c.origem), c.origem);
  }
});

test("candidatos dos cards: frases das ideias, com a origem no título do card", () => {
  const lista = candidatosDosCards(JSON.parse(readFileSync(`${kruskal}cards.json`, "utf8")));
  assert.ok(lista.length >= 2);
  assert.ok(lista.every((c) => /^Card \d+ \(.+\)$/.test(c.origem)));
});

test("candidatos(caminho) escolhe roteiro ou cards pelo tipo de pasta", async () => {
  assert.ok((await candidatos(folgas)).every((c) => /^(Gancho|Bloco)/.test(c.origem)));
  assert.ok((await candidatos(kruskal)).every((c) => /^Card/.test(c.origem)));
  await assert.rejects(candidatos("/nao/existe"), /não achei/);
});
```

(No topo do arquivo, junto dos outros imports: `import { readFileSync } from "node:fs";`.)

Em `tests/cards.test.mjs`: as duas listas passam a `["capa", "ideia", "fim", "aviso", "curiosidade", "citacao"]` e `{ …, curiosidade: { min: 1, max: 1 }, citacao: { min: 1, max: 1 } }`; acrescente:
```js
test("citacao: um card com texto e origem; kicker padrão DA AULA", () => {
  const c = { tipo: "citacao", texto: "Se sobrou, comprar mais dele não adianta nada.", origem: "Teorema das Folgas Complementares" };
  assert.deepEqual(validarCards({ tipo: "citacao", cards: [c] }), []);
  assert.ok(validarCards({ tipo: "citacao", cards: [{ tipo: "citacao", texto: "x" }] }).some((e) => e.includes('falta "origem"')));
  assert.ok(validarCards({ tipo: "citacao", cards: [{ tipo: "ideia", titulo: "I", texto: "t" }] }).some((e) => e.includes("card único é do tipo citacao")));
  const v = variaveisDoCard(c, 0, 1, { ds: ".", usuario: "po" });
  assert.equal(v.kicker, "DA AULA");
  assert.equal(v.origem, "Teorema das Folgas Complementares");
});
```
Em `tests/story-aviso.test.mjs`:
```js
test("cena da citação: kicker CITAÇÃO, origem como título, o trecho na linha", () => {
  const cena = cenaDoAviso({ tipo: "citacao", cards: [{ tipo: "citacao", texto: "Se sobrou, comprar mais não adianta.", origem: "Folgas Complementares" }] });
  assert.equal(cena.kicker, "POST NOVO: CITAÇÃO");
  assert.equal(cena.titulo, "Folgas Complementares");
  assert.deepEqual(cena.linhas, ["Se sobrou, comprar mais não adianta."]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `citacao.test.mjs` falha na importação; `cards` e `story-aviso` falham nas asserções novas.

- [ ] **Step 3: `scripts/citacao.mjs`**

```js
#!/usr/bin/env node
// Sugere trechos para um post de citação a partir de um vídeo (roteiro.md) ou de um post (cards.json).
//
//   node scripts/citacao.mjs --candidatos videos/<slug>          # frases do gancho e das falas
//   node scripts/citacao.mjs --candidatos instagram/<pasta>      # frases dos cards de ideia
//
// Heurística: frases inteiras de 60 a 200 caracteres que se sustentam fora do vídeo (sem "nesta aula",
// "vamos", "como vimos"). A skill mostra 2 a 3 e a pessoa escolhe (spec, D9).

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { lerRoteiro } from "./roteiro.mjs";

export const TAMANHO = { min: 60, max: 200 };
export const MAXIMO = 5;
const DEPENDE_DO_VIDEO = /nesta aula|vamos |como vimos|no slide|a seguir|agora o|antes do teorema/i;

export function frases(texto) {
  const limpo = String(texto ?? "").replace(/\*\*/g, "").replace(/\\\*/g, "*").replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").replace(/\s+/g, " ").trim();
  return (limpo.match(/[^.!?]+[.!?]+/g) ?? []).map((f) => f.trim()).filter(Boolean);
}

const cabem = (lista) => lista.filter((c) => c.texto.length >= TAMANHO.min && c.texto.length <= TAMANHO.max && !DEPENDE_DO_VIDEO.test(c.texto));

export function candidatosDoRoteiro(roteiro) {
  const lista = [];
  for (const f of frases(roteiro.gancho?.texto)) lista.push({ texto: f, origem: "Gancho" });
  for (const b of roteiro.blocos) for (const f of frases(b.fala)) lista.push({ texto: f, origem: `Bloco ${b.numero}: ${b.titulo}` });
  return cabem(lista).slice(0, MAXIMO);
}

export function candidatosDosCards(cards) {
  const lista = [];
  cards.cards.forEach((c, i) => {
    if (c.tipo !== "ideia" && c.tipo !== "curiosidade") return;
    for (const f of frases(c.texto)) lista.push({ texto: f, origem: `Card ${i + 1} (${c.titulo})` });
  });
  return cabem(lista).slice(0, MAXIMO);
}

export async function candidatos(caminho) {
  const pasta = resolve(caminho);
  if (existsSync(join(pasta, "roteiro.md"))) return candidatosDoRoteiro(lerRoteiro(readFileSync(join(pasta, "roteiro.md"), "utf8")));
  if (existsSync(join(pasta, "cards.json"))) return candidatosDosCards(JSON.parse(readFileSync(join(pasta, "cards.json"), "utf8")));
  throw new Error(`não achei roteiro.md nem cards.json em ${caminho}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [opcao, caminho] = process.argv.slice(2);
  if (opcao !== "--candidatos" || !caminho) { console.error("uso: node scripts/citacao.mjs --candidatos videos/<slug> | instagram/<pasta>"); process.exit(1); }
  try {
    const lista = await candidatos(caminho);
    if (!lista.length) console.log(`nenhuma frase de ${TAMANHO.min} a ${TAMANHO.max} caracteres se sustenta sozinha em ${basename(caminho)} — escolha à mão`);
    lista.forEach((c, i) => console.log(`${i + 1}. "${c.texto}"\n   — ${c.origem}`));
  } catch (e) {
    console.error(`erro: ${e.message}`); process.exit(1);
  }
}
```

`package.json`: `"citacao": "node scripts/citacao.mjs"`.

- [ ] **Step 4: Card `citacao`**

`formatos.json`, em `"cards"` depois de `"curiosidade"`:
```json
    "citacao": { "layout": "citacao", "campos": { "kicker": 24, "texto": 240, "origem": 80 }, "obrigatorios": ["texto", "origem"],
               "quando": "Card único com um trecho marcante de um vídeo ou post já publicado; a origem em uma linha." }
```
e em `"tipos"`: `"citacao": { "min": 1, "max": 1 }`.

`design-system/instagram/layouts/citacao.html` (mesmo cabeçalho dos outros layouts; o corpo):
```html
<!-- Card único de citação: kicker "DA AULA"/"DO POST", o trecho grande entre aspas, a origem embaixo. -->
<main class="ig ig--feed">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__kicker">{{kicker}}</p>
    <h1 class="ig__titulo ig__titulo--medio">“{{texto}}”</h1>
    <p class="ig__apoio">{{origem}}</p>
  </div>
  <p class="ig__rodape"><span>@{{usuario}}</span><span>{{contador}}</span></p>
</main>
```
(O `ig__titulo` é caixa alta por CSS; a citação sai em caixa alta como as capas — é a linguagem do design system. `{{texto}}` aqui é o campo cru escapado, não `texto_html`, porque o título não aceita quebra.)

`gerar-cards.mjs`: `KICKER_PADRAO.citacao = "DA AULA"`; em `validarCards`: `if (dados.tipo === "citacao" && cards.length && cards[0].tipo !== "citacao") erros.push("citacao: o card único é do tipo citacao");`; em `variaveisDoCard`: `origem: card.origem ?? "", texto: card.texto ?? "",` (acrescente `texto` cru — é escapado pelo `preencher`). Cabeçalho: inclua `citacao` nas listas.

`canal.json` → `cta.citacao`: `"▶️ A aula completa está no canal · link na bio."`.

`gerar-story-aviso.mjs`, no `switch`: `case "citacao": return { ...base, kicker: "POST NOVO: CITAÇÃO", titulo: encurtar(c.origem, T.titulo), linhas: [c.texto].map(linha) };`

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 6: Modelo, guia e skill**

`instagram/_modelo/post.md`: no comentário, `(artigo, aviso, curiosidade ou citacao)`; acrescente:
```markdown
<!-- ===== tipo: citacao (card único com um trecho de vídeo ou post) ===== -->

## Origem
[videos/<slug> ou instagram/<pasta> — de onde o trecho sai; o Claude sugere candidatos]

## Trecho
[opcional: se você já sabe a frase, cole aqui]
```

`GUIA-AGENTE.md`: passo 1, acrescente `ou origem na \`citacao\``; passo 2, acrescente `\`citacao\`: rode \`node scripts/citacao.mjs --candidatos <origem>\`, mostre 2 a 3 à pessoa com a origem de cada um, e só depois escreva o card (\`texto\` ≤ 240, exatamente como está na origem — sem "melhorar" a frase; \`origem\` = título do vídeo ou do post). Kicker \`DA AULA\` para vídeo, \`DO POST\` para post. Sem Checagem: a origem já passou por ela.`; em **Regras de copy**: `- Citação: a frase é copiada, não reescrita; a origem tem o título como foi publicado.`

`.claude/skills/post/SKILL.md`: description ganha `ou citacao (trecho de vídeo/post)` e gatilho `"cita o vídeo Y"`; passo 1 ganha `citacao: origem`; no passo 2, acrescente: `Para \`citacao\`, antes de escrever: \`node scripts/citacao.mjs --candidatos <origem>\`, mostre os candidatos numerados e pergunte qual vai (ou se a pessoa quer outro trecho). Sem \`checagem.json\` neste tipo.`

- [ ] **Step 7: Commit**

```bash
git add scripts/citacao.mjs tests/citacao.test.mjs design-system/instagram/formatos.json design-system/instagram/layouts/citacao.html design-system/scripts/gerar-cards.mjs design-system/scripts/gerar-story-aviso.mjs canal.json instagram/_modelo/post.md design-system/instagram/GUIA-AGENTE.md .claude/skills/post/SKILL.md package.json tests/cards.test.mjs tests/story-aviso.test.mjs
git commit -m "Post citacao: card com trecho de vídeo ou post, candidatos sugeridos por scripts/citacao.mjs

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Reel do zero — `reel.json` de cenas → `reel.mp4`, `legenda.mjs --reel`, skill `reel`

**Files:**
- Create: `design-system/scripts/gerar-reel.mjs`, `instagram/_modelo/reel.json`, `.claude/skills/reel/SKILL.md`
- Modify: `scripts/legenda.mjs`, `canal.json`, `package.json`, `CLAUDE.md`
- Test: `tests/reel.test.mjs`, `tests/legenda.test.mjs`

**Interfaces:**
- Consumes: `validar`, `renderizarCenas`, `ErroStoryVideo` (Task 3); `validarLegenda`, `montarLegenda` (legenda.mjs); `--publicar-reel` (Task 2).
- Produces: `ErroReel`; `DURACAO_REEL = { min: 15, max: 90 }`; `TIPOS_DE_REEL = ["cenas", "corte"]`; `validarReel(dados) → string[]` (nesta task só `cenas`; `corte` entra na Task 10); `argsConcat(lista, saida) → string[]`; `gerarReel(pasta, { soHtml = false, executar = rodar }) → Promise<string>` (`reel.mp4`; com `soHtml`, os HTML das cenas); `executar(binario, args) → Promise<void>` injetável. `scripts/legenda.mjs`: `gerarLegenda(pasta, { reel = false }) → string` (escreve `legenda.txt` ou `reel-legenda.txt`).

- [ ] **Step 1: Escrever os testes**

`tests/reel.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validarReel, argsConcat, gerarReel, ErroReel, DURACAO_REEL, TIPOS_DE_REEL } from "../design-system/scripts/gerar-reel.mjs";

const cena = (extra = {}) => ({ duracao: 10, kicker: "UM DESAFIO", titulo: "PADARIA", linhas: ["Pão: 1 h"], ...extra });
const legenda = { gancho: "G", corpo: "C", hashtags_tema: ["#A", "#B", "#C"] };

test("validarReel: cenas somam de 15 a 90 s; legenda obrigatória; tipo conhecido", () => {
  assert.deepEqual(TIPOS_DE_REEL, ["cenas", "corte"]);
  assert.deepEqual(DURACAO_REEL, { min: 15, max: 90 });
  assert.deepEqual(validarReel({ tipo: "cenas", cenas: [cena(), cena()], legenda }), []);
  assert.ok(validarReel({ tipo: "cenas", cenas: [cena()], legenda }).some((e) => e.includes("de 15 a 90 s")));
  assert.ok(validarReel({ tipo: "cenas", cenas: Array(10).fill(cena()), legenda }).some((e) => e.includes("de 15 a 90 s")));
  assert.ok(validarReel({ tipo: "cenas", cenas: [cena(), cena()] }).some((e) => e.includes('"legenda"')));
  assert.ok(validarReel({ tipo: "cenas", cenas: [cena({ duracao: 2 }), cena()], legenda }).some((e) => e.includes("cena 1")));
  assert.ok(validarReel({ tipo: "shorts" })[0].includes('tipo "shorts"'));
});

test("argsConcat usa o demuxer concat sem recodificar", () => {
  const a = argsConcat("/p/lista.txt", "/p/reel.mp4");
  assert.deepEqual(a.slice(0, 8), ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i"]);
  assert.ok(a.includes("/p/lista.txt") && a.includes("copy") && a.at(-1) === "/p/reel.mp4");
});

test("gerarReel (cenas): renderiza cada cena com prefixo reel-cena sem sticker, concatena e limpa", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", cenas: [cena(), cena({ kicker: "DOIS" })], legenda }));
  const htmls = await gerarReel(pasta, { soHtml: true });
  assert.deepEqual(htmls.map((h) => h.slice(pasta.length + 1)), ["reel-cena-01.html", "reel-cena-02.html"]);
  assert.ok(readFileSync(htmls[0], "utf8").includes("ig--sem-sticker"));
  const chamadas = [];
  const executar = async (bin, args) => { chamadas.push({ bin, args }); writeFileSync(args.at(-1), "mp4"); };
  writeFileSync(join(pasta, "reel-cena-01.mp4"), "a"); writeFileSync(join(pasta, "reel-cena-02.mp4"), "b");
  writeFileSync(join(pasta, "reel-cena-01.png"), "p");
  const saida = await gerarReel(pasta, { executar, renderizar: async () => [join(pasta, "reel-cena-01.mp4"), join(pasta, "reel-cena-02.mp4")] });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.equal(chamadas.length, 1);
  assert.ok(chamadas[0].bin.includes("ffmpeg") && chamadas[0].args.includes("-f") && chamadas[0].args.at(-1) === saida);
  assert.ok(!existsSync(join(pasta, "reel-cena-01.mp4")) && !existsSync(join(pasta, "lista-cenas.txt")));
  assert.ok(existsSync(join(pasta, "reel.png")) && !existsSync(join(pasta, "reel-cena-01.png")));
  writeFileSync(join(pasta, "reel.json"), "{}");
  await assert.rejects(gerarReel(pasta, { soHtml: true }), ErroReel);
});
```

Em `tests/legenda.test.mjs`, acrescente (importe `gerarLegenda` de `../scripts/legenda.mjs` e `mkdtempSync, writeFileSync` de `node:fs`, `tmpdir`, `join`):
```js
test("gerarLegenda --reel lê reel.json.legenda, usa o CTA do reel e grava reel-legenda.txt", () => {
  const pasta = mkdtempSync(join(tmpdir(), "leg-"));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", cenas: [], legenda: { gancho: "G", corpo: "C", hashtags_tema: ["#A", "#B", "#C"] } }));
  const texto = gerarLegenda(pasta, { reel: true });
  assert.ok(texto.startsWith("G\n\nC\n\n") && texto.includes(canal.instagramLegenda.cta.reel));
  assert.equal(readFileSync(join(pasta, "reel-legenda.txt"), "utf8"), texto + "\n");
  assert.throws(() => gerarLegenda(pasta), /cards\.json/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `reel.test.mjs` falha na importação; `legenda.test.mjs` falha em `gerarLegenda`.

- [ ] **Step 3: `scripts/legenda.mjs` — `gerarLegenda` e `--reel`**

Troque o bloco CLI inteiro (do `if (process.argv[1] …` até o fim) por:

```js
// Monta e grava a legenda: legenda.txt (post, de legenda.json + cards.json) ou reel-legenda.txt (de reel.json.legenda).
export function gerarLegenda(pasta, { reel = false } = {}) {
  const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
  let legenda, tipo, saida;
  if (reel) {
    const arquivo = join(pasta, "reel.json");
    if (!existsSync(arquivo)) throw new ErroLegenda(`não achei reel.json em ${pasta}`);
    legenda = JSON.parse(readFileSync(arquivo, "utf8")).legenda;
    tipo = "reel"; saida = "reel-legenda.txt";
  } else {
    const arquivo = join(pasta, "cards.json");
    if (!existsSync(arquivo)) throw new ErroLegenda(`não achei cards.json em ${pasta}`);
    tipo = JSON.parse(readFileSync(arquivo, "utf8")).tipo;
    legenda = JSON.parse(readFileSync(join(pasta, "legenda.json"), "utf8"));
    saida = "legenda.txt";
  }
  if (!canal.instagramLegenda.cta[tipo]) throw new ErroLegenda(`canal.json não tem CTA para o tipo "${tipo}"`);
  const erros = validarLegenda(legenda, tipo);
  if (erros.length) throw new ErroLegenda(`${reel ? "reel.json → legenda" : "legenda.json"} inválido:\n- ${erros.join("\n- ")}`);
  const texto = montarLegenda({ legenda, tipo, canal });
  const hashtags = contarHashtags(texto);
  if (texto.length > LEGENDA_MAX) throw new ErroLegenda(`legenda com ${texto.length} caracteres — máximo ${LEGENDA_MAX}`);
  if (hashtags > HASHTAGS_MAX) throw new ErroLegenda(`${hashtags} hashtags — máximo ${HASHTAGS_MAX}`);
  writeFileSync(join(pasta, saida), texto + "\n");
  return texto;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const arg = args.find((a) => !a.startsWith("--"));
  try {
    if (!arg) throw new ErroLegenda("uso: node scripts/legenda.mjs instagram/<pasta> [--reel]");
    console.log(gerarLegenda(resolve(arg), { reel: args.includes("--reel") }));
  } catch (e) {
    if (e instanceof ErroLegenda || e.code === "ENOENT") { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

Acrescente `existsSync` ao import de `node:fs`. No cabeçalho, acrescente a linha de uso `node scripts/legenda.mjs instagram/<pasta> --reel   → grava reel-legenda.txt de reel.json`. Em `canal.json`, `cta.reel`: `"▶️ A explicação completa está no canal · link na bio."`.

- [ ] **Step 4: `design-system/scripts/gerar-reel.mjs` (tipo `cenas`)**

```js
#!/usr/bin/env node
// Gera instagram/<pasta>/reel.mp4 (1080×1920) a partir de reel.json.
//   tipo "cenas": cenas no formato de stories.json, gravadas uma a uma e emendadas num vídeo só.
//   tipo "corte": trecho de um vídeo já publicado no YouTube, baixado com yt-dlp e posto numa moldura de marca (Task 10).
//
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta>            # reel.mp4 + reel.png (capa)
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta> --so-html  # só os HTML das cenas (tipo cenas)
// Legenda: node scripts/legenda.mjs instagram/<pasta> --reel  → reel-legenda.txt. Publicar: node scripts/instagram.mjs --publicar-reel instagram/<pasta>.

import { readFileSync, writeFileSync, unlinkSync, existsSync, renameSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validar, renderizarCenas, ErroStoryVideo } from "./gerar-story-video.mjs";
import { validarLegenda } from "../../scripts/legenda.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");

export class ErroReel extends Error {}
export const TIPOS_DE_REEL = ["cenas", "corte"];
export const DURACAO_REEL = { min: 15, max: 90 };   // segundos

export function validarReel(dados) {
  if (!TIPOS_DE_REEL.includes(dados?.tipo)) return [`tipo "${dados?.tipo}" não existe (${TIPOS_DE_REEL.join(", ")})`];
  const erros = [];
  if (!dados.legenda) erros.push('falta "legenda" (gancho, corpo, hashtags_tema)');
  else erros.push(...validarLegenda(dados.legenda, "reel").map((e) => `legenda: ${e}`));
  if (dados.tipo === "cenas") {
    if (!Array.isArray(dados.cenas) || !dados.cenas.length) erros.push('tipo cenas precisa de uma lista "cenas"');
    else {
      try {
        validar({ tipo: "stories", publicacao: "api", stories: dados.cenas });
      } catch (e) {
        if (e instanceof ErroStoryVideo) erros.push(e.message.replace(/^story (\d+)/, "cena $1")); else throw e;
      }
      const total = dados.cenas.reduce((s, c) => s + Number(c.duracao || 0), 0);
      if (total < DURACAO_REEL.min || total > DURACAO_REEL.max) erros.push(`as cenas somam ${total} s; um reel tem de ${DURACAO_REEL.min} a ${DURACAO_REEL.max} s`);
    }
  }
  return erros;
}

export function argsConcat(lista, saida) {
  return ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", "-movflags", "+faststart", saida];
}

// Roda um programa externo e falha com a saída de erro dele (injetável nos testes).
export function rodar(binario, args) {
  return new Promise((ok, falha) => {
    const p = spawn(binario, args, { stdio: ["ignore", "inherit", "pipe"] });
    let erro = "";
    p.stderr.on("data", (d) => { erro += d; });
    p.on("error", falha);
    p.on("close", (c) => (c === 0 ? ok() : falha(new ErroReel(`${binario.split("/").pop()} terminou com código ${c}${erro ? `: ${erro.trim()}` : ""}`))));
  });
}

async function ffmpeg() { return (await import("ffmpeg-static")).default; }

async function gerarDeCenas(dados, pasta, { soHtml, executar, renderizar }) {
  const cenas = validar({ tipo: "stories", publicacao: "api", stories: dados.cenas });
  const saidas = await renderizar(cenas, { pasta, prefixo: "reel-cena", soHtml, semSticker: true });
  if (soHtml) return saidas;
  const lista = join(pasta, "lista-cenas.txt");
  writeFileSync(lista, saidas.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  const reel = join(pasta, "reel.mp4");
  try {
    await executar(await ffmpeg(), argsConcat(lista, reel));
  } finally {
    unlinkSync(lista);
    for (const s of saidas) if (existsSync(s)) unlinkSync(s);
  }
  // capa: último quadro da primeira cena
  const png1 = join(pasta, "reel-cena-01.png");
  if (existsSync(png1)) renameSync(png1, join(pasta, "reel.png"));
  for (let i = 2; i <= cenas.length; i++) { const p = join(pasta, `reel-cena-${String(i).padStart(2, "0")}.png`); if (existsSync(p)) unlinkSync(p); }
  return reel;
}

export async function gerarReel(pasta, { soHtml = false, executar = rodar, renderizar = renderizarCenas } = {}) {
  const arquivo = join(pasta, "reel.json");
  if (!existsSync(arquivo)) throw new ErroReel(`não achei ${arquivo} — rode a skill reel`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarReel(dados);
  if (erros.length) throw new ErroReel(`reel.json inválido:\n- ${erros.join("\n- ")}`);
  if (dados.tipo === "cenas") return gerarDeCenas(dados, pasta, { soHtml, executar, renderizar });
  throw new ErroReel('tipo "corte" ainda não implementado');   // Task 10 substitui esta linha
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-reel.mjs instagram/<pasta> [--so-html]"); process.exit(1); }
  try {
    const r = await gerarReel(resolve(pasta), { soHtml: args.includes("--so-html") });
    for (const s of [].concat(r)) console.log(relative(RAIZ, s));
  } catch (e) {
    if (e instanceof ErroReel || e instanceof ErroStoryVideo) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
```

`package.json`: `"reel": "node design-system/scripts/gerar-reel.mjs"`.

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 6: Modelo e skill `reel`**

`instagram/_modelo/reel.json`:
```json
{
  "tipo": "cenas",
  "cenas": [
    { "duracao": 8, "kicker": "[KICKER]", "titulo": "[PERGUNTA OU AFIRMAÇÃO EM ATÉ 60]", "linhas": ["[um dado concreto]"] },
    { "duracao": 12, "kicker": "[A IDEIA]", "titulo": "[TÍTULO]", "linhas": ["[linha 1]", "[linha 2]", "[linha 3]"] },
    { "duracao": 8, "kicker": "[FECHO]", "titulo": "[O QUE FICA]", "linhas": ["[uma frase]"], "faixa": "AULA COMPLETA NO CANAL" }
  ],
  "legenda": { "gancho": "[uma frase, até 125 caracteres]", "corpo": "[2 a 3 parágrafos curtos]", "hashtags_tema": ["#Tema", "#Area", "#Apelido"] }
}
```

`.claude/skills/reel/SKILL.md`:
```markdown
---
name: reel
description: Faz um reel do PO para Todos — corte de um vídeo já publicado no YouTube ("vê um trecho legal do vídeo Y") ou cenas do zero sobre um tema ("reel sobre X") — do reel.json ao reel.mp4, legenda, Checagem e publicação pela API, parando para a pessoa aprovar. Use quando a pessoa pedir um reel, um corte ou um vídeo curto para o Instagram.
---

# Reel

Diga antes: "Vou montar o reel e a legenda para você olhar; só publico depois do seu sim."

## 1. Pasta e origem

- Pasta `instagram/<AAAA-MM-DD>-<slug>/` (pode ser a de um post da mesma ocasião). `publicacao-reel.json` existe → já saiu, pare e diga.
- **Corte** (a pessoa citou um vídeo): siga a seção "Corte" abaixo. **Do zero** (um tema): siga "Cenas".

## 2a. Cenas (do zero)

1. Comece de `instagram/_modelo/reel.json` (`tipo: "cenas"`). Regras das cenas = as dos stories (`stories` skill, `LIMITES` de `gerar-story-video.mjs`); total de 15 a 90 s; 3 a 6 cenas; a primeira é um gancho (pergunta ou fato), a última tem `faixa` apontando para o canal. `legenda`: gancho ≤ 125, corpo, 3 a 4 `hashtags_tema` (`#CamelCase`).
2. **Checagem** (ADR-0009): todo fato e toda conta viram entrada em `checagem.json` (GUIA-AGENTE.md, passo 3) — busque a fonte, refaça a conta por outro caminho. `node scripts/checagem.mjs instagram/<pasta>`.

## 2b. Corte (vídeo já publicado)

1. O vídeo precisa estar **público**: `videos/<slug>/publicacao.json` com `"privacidade": "public"` (se a pessoa já tornou público e o arquivo diz `private`, peça para confirmar e atualize o arquivo).
2. `node scripts/corte.mjs --candidatos videos/<slug>` → lista de trechos (gancho e exemplos autocontidos, com início, fim e duração pelos capítulos reais). Mostre 2 a 3 com o motivo de cada um e pergunte qual vai — ou se a pessoa quer outro intervalo (`mm:ss` a `mm:ss`, 15 a 90 s).
3. Escreva `reel.json` com `tipo: "corte"`, `video` (slug), `inicio`, `fim`, `titulo` (≤ 60, caixa alta, o que o trecho ensina), `faixa` (`"AULA COMPLETA NO CANAL"`) e `legenda`. Sem `checagem.json`: o vídeo já disse isso.

## 3. Gerar

`node design-system/scripts/gerar-reel.mjs instagram/<pasta>` → `reel.mp4` + `reel.png` (capa). Corte: exige `yt-dlp` instalado (README, "O que você vai instalar", item opcional); se sair `erro: yt-dlp não encontrado`, mostre o passo do README e espere.
`node scripts/legenda.mjs instagram/<pasta> --reel` → `reel-legenda.txt`.
Abra `reel.mp4` (`open …` no Mac, `start …` no Windows) e veja inteiro: texto legível, áudio presente no corte, nada cortado na moldura.

## 4. **PARADA**: aprovação

Mostre o caminho do `reel.mp4`, o `reel.png`, a legenda inteira e — nas cenas do zero — o resumo de `node scripts/checagem.mjs instagram/<pasta>` (destaque "Não confirmei"). Pergunte: "Aprova o reel e a legenda?" **Não avance sem um sim explícito.**

## 5. Publicar

`node scripts/instagram.mjs --status` (token/cota; token fora do chat, README "Publicar no Instagram"). Depois `node scripts/instagram.mjs --publicar-reel instagram/<pasta>`. Reporte cada linha; `erro: …` → mostre exatamente e pare. Entregue: "Reel no ar: <url de publicacao-reel.json>."
```

`CLAUDE.md`, seção **Fluxo de um post do Instagram**, acrescente: `\`/reel instagram/<data>-<slug>\` (skill \`reel\`): corte de vídeo publicado (\`scripts/corte.mjs --candidatos\`, \`yt-dlp\`, \`docs/adr/0008\`) ou cenas do zero → \`reel.json\` → \`gerar-reel.mjs\` + \`legenda.mjs --reel\` → parada → \`--publicar-reel\`.` e, na lista de scripts, `- \`node design-system/scripts/gerar-reel.mjs instagram/<pasta>\` — \`reel.json\` → \`reel.mp4\`.`

- [ ] **Step 7: Commit**

```bash
git add design-system/scripts/gerar-reel.mjs tests/reel.test.mjs scripts/legenda.mjs tests/legenda.test.mjs canal.json package.json instagram/_modelo/reel.json .claude/skills/reel/SKILL.md CLAUDE.md
git commit -m "Reel do zero: reel.json de cenas → reel.mp4 (motor de stories emendado), legenda --reel e skill reel

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Reel-Corte — `scripts/corte.mjs --candidatos`, `yt-dlp`, moldura de marca, README

**Files:**
- Create: `scripts/corte.mjs`, `design-system/instagram/layouts/reel-moldura.html`, `design-system/instagram/reel.css`
- Modify: `design-system/scripts/gerar-reel.mjs`, `README.md`, `package.json`
- Test: `tests/corte.test.mjs`, `tests/reel.test.mjs`

**Interfaces:**
- Consumes: `lerRoteiro` (`scripts/roteiro.mjs`), `metadados.json.capitulos` (`[{ tempo: "mm:ss", titulo }]`), `videos/<slug>/publicacao.json` (`url`, `privacidade`), `preencher`/`exportarPng` (`modelo-html.mjs`), `rodar`/`ErroReel` (Task 9).
- Produces (`scripts/corte.mjs`): `segundos("mm:ss" | "h:mm:ss") → number`; `mmss(n) → "mm:ss"`; `DURACAO_CORTE = { min: 15, max: 90 }`; `DEPENDE_DO_RESTO = /…/`; `candidatosDeCorte({ roteiro, capitulos }) → { titulo, inicio, fim, duracao_s, motivo }[]`; `candidatos(pastaDoVideo) → { url, candidatos }`; CLI `--candidatos videos/<slug>`.
- Produces (`gerar-reel.mjs`): `validarReel` aceita `corte` (`video`, `inicio`, `fim`, `titulo ≤ 60`, `faixa ≤ 40`); `argsYtDlp({ url, inicio, fim, saida, ffmpegDir }) → string[]`; `argsMoldura({ moldura, bruto, saida }) → string[]`; `acharYtDlp(executarSync) → string`; `htmlDaMoldura({ titulo, faixa, ds }) → string`.

- [ ] **Step 1: Escrever os testes**

`tests/corte.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { segundos, mmss, candidatosDeCorte, candidatos, DURACAO_CORTE } from "../scripts/corte.mjs";
import { carregarRoteiro } from "../scripts/roteiro.mjs";

const folgas = fileURLToPath(new URL("../videos/folgas-complementares/", import.meta.url));
const roteiro = carregarRoteiro(`${folgas}roteiro.md`);
const { capitulos } = JSON.parse(readFileSync(`${folgas}metadados.json`, "utf8"));

test("segundos e mmss", () => {
  assert.equal(segundos("06:30"), 390);
  assert.equal(segundos("1:02:03"), 3723);
  assert.equal(mmss(390), "06:30");
  assert.throws(() => segundos("6.5"), /mm:ss/);
});

test("candidatos: o gancho (Abertura → Objetivos) e os blocos exemplo autocontidos de 15 a 90 s, com os tempos reais", () => {
  const lista = candidatosDeCorte({ roteiro, capitulos });
  assert.deepEqual(lista[0], { titulo: "Abertura", inicio: "00:00", fim: "00:36", duracao_s: 36, motivo: "é o gancho: abre com a pergunta e já foi escrito para prender em 30 s" });
  const primal = lista.find((c) => c.titulo === "Exemplo — O Primal");
  assert.deepEqual([primal.inicio, primal.fim, primal.duracao_s], ["06:30", "07:20", 50]);
  assert.ok(primal.motivo.includes("exemplo"));
  assert.ok(!lista.some((c) => c.titulo === "Exemplo — Montando o Dual"), "286 s não cabe");
  assert.ok(!lista.some((c) => c.titulo === "Relembrando: Primal e Dual"), "bloco conteudo não entra");
  for (const c of lista) assert.ok(c.duracao_s >= DURACAO_CORTE.min && c.duracao_s <= DURACAO_CORTE.max && segundos(c.inicio) < segundos(c.fim));
});

test("candidatos: bloco exemplo que depende do anterior fica de fora; capítulo sem par no roteiro é ignorado", () => {
  const r = { gancho: { texto: "x" }, blocos: [{ numero: 1, titulo: "Exemplo A", tipo: "exemplo", fala: "Como vimos no bloco anterior, agora …" }, { numero: 2, titulo: "Exemplo B", tipo: "exemplo", fala: "Vamos direto." }] };
  const caps = [{ tempo: "00:00", titulo: "Abertura" }, { tempo: "00:20", titulo: "Exemplo A" }, { tempo: "00:50", titulo: "Exemplo B" }, { tempo: "01:30", titulo: "Encerramento" }];
  const lista = candidatosDeCorte({ roteiro: r, capitulos: caps });
  assert.deepEqual(lista.map((c) => c.titulo), ["Abertura", "Exemplo B"]);
  assert.deepEqual(candidatosDeCorte({ roteiro: r, capitulos: [{ tempo: "00:00", titulo: "Abertura" }] }), []);
});

test("candidatos(pasta) exige publicacao.json público", async () => {
  const r = await candidatos(folgas);
  assert.equal(r.url, "https://youtu.be/6n6oPR70LSA");
  assert.ok(r.candidatos.length >= 3);
  await assert.rejects(candidatos("/nao/existe"), /publicacao\.json/);
});
```

Em `tests/reel.test.mjs`, acrescente (importe `argsYtDlp`, `argsMoldura`, `htmlDaMoldura`, `acharYtDlp` de `gerar-reel.mjs`):
```js
const corte = { tipo: "corte", video: "folgas-complementares", inicio: "06:30", fim: "07:20", titulo: "EXEMPLO: O PRIMAL", faixa: "AULA COMPLETA NO CANAL", legenda };

test("validarReel (corte): campos, ordem dos tempos, duração e limites de texto", () => {
  assert.deepEqual(validarReel(corte), []);
  assert.ok(validarReel({ ...corte, fim: "06:40" }).some((e) => e.includes("de 15 a 90 s")));
  assert.ok(validarReel({ ...corte, fim: "06:00" }).some((e) => e.includes("depois do início")));
  assert.ok(validarReel({ ...corte, inicio: "6:30" }).some((e) => e.includes("mm:ss")));
  assert.ok(validarReel({ ...corte, titulo: "x".repeat(61) }).some((e) => e.includes('"titulo"')));
  assert.ok(validarReel({ ...corte, video: undefined }).some((e) => e.includes('"video"')));
});

test("argsYtDlp baixa só o trecho, em MP4 até 1080p, com o ffmpeg do projeto", () => {
  const a = argsYtDlp({ url: "https://youtu.be/x", inicio: "06:30", fim: "07:20", saida: "/p/corte-bruto.mp4", ffmpegDir: "/ff" });
  assert.ok(a.includes("--download-sections") && a[a.indexOf("--download-sections") + 1] === "*06:30-07:20");
  assert.ok(a.includes("--force-keyframes-at-cuts") && a[a.indexOf("--ffmpeg-location") + 1] === "/ff");
  assert.ok(a[a.indexOf("-f") + 1].includes("height<=1080") && a[a.indexOf("-o") + 1] === "/p/corte-bruto.mp4");
  assert.equal(a.at(-1), "https://youtu.be/x");
});

test("argsMoldura sobrepõe o vídeo 16:9 centrado na moldura 9:16, mantém o áudio e termina com o vídeo", () => {
  const a = argsMoldura({ moldura: "/p/m.png", bruto: "/p/b.mp4", saida: "/p/reel.mp4" });
  const fc = a[a.indexOf("-filter_complex") + 1];
  assert.ok(fc.includes("scale=1080:-2") && fc.includes("overlay=0:(H-h)/2") && fc.includes("shortest=1") && fc.includes("yuv420p"));
  assert.ok(a.includes("-loop") && a.includes("1:a?") && a.includes("aac") && a.at(-1) === "/p/reel.mp4");
});

test("htmlDaMoldura traz título, faixa e o lockup; acharYtDlp falha com mensagem útil", () => {
  const h = htmlDaMoldura({ titulo: "EXEMPLO: O PRIMAL", faixa: "AULA COMPLETA NO CANAL", ds: "../../design-system" });
  assert.ok(h.includes("EXEMPLO: O PRIMAL") && h.includes("AULA COMPLETA NO CANAL") && h.includes("reel.css") && h.includes("logo-po-fundo-escuro"));
  assert.throws(() => acharYtDlp(() => { throw new Error("not found"); }), /yt-dlp não encontrado/);
  assert.equal(acharYtDlp(() => "/usr/local/bin/yt-dlp\n"), "/usr/local/bin/yt-dlp");
});

test("gerarReel (corte): baixa o trecho, exporta a moldura, sobrepõe e limpa o bruto", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  const videos = join(pasta, "videos"); mkdirSync(join(videos, "folgas-complementares"), { recursive: true });
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "public" }));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify(corte));
  const chamadas = [];
  const executar = async (bin, args) => { chamadas.push({ bin, args }); const o = args.indexOf("-o"); writeFileSync(o >= 0 ? args[o + 1] : args.at(-1), "x"); };
  const saida = await gerarReel(pasta, { executar, raizVideos: videos, ytDlp: "/bin/yt-dlp", exportar: (html, png) => writeFileSync(png, "png") });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.deepEqual(chamadas.map((c) => c.bin), ["/bin/yt-dlp", (await import("ffmpeg-static")).default]);
  assert.ok(!existsSync(join(pasta, "corte-bruto.mp4")) && !existsSync(join(pasta, "reel-moldura.html")));
  assert.ok(existsSync(join(pasta, "reel.png")));
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "private" }));
  await assert.rejects(gerarReel(pasta, { executar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /público/);
});
```
(Acrescente `mkdirSync` ao import de `node:fs` desse teste.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `corte.test.mjs` falha na importação; `reel.test.mjs` falha nas funções novas.

- [ ] **Step 3: `scripts/corte.mjs`**

```js
#!/usr/bin/env node
// Sugere trechos de um vídeo já publicado para virar reel (Corte), a partir do roteiro e dos
// capítulos reais de metadados.json: o Gancho (capítulo "Abertura") e os blocos "exemplo" que
// se sustentam sozinhos, entre 15 e 90 s. A pessoa escolhe (spec, D9; ADR-0008).
//
//   node scripts/corte.mjs --candidatos videos/<slug>

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { lerRoteiro } from "./roteiro.mjs";

export const DURACAO_CORTE = { min: 15, max: 90 };   // segundos
export const DEPENDE_DO_RESTO = /como vimos|bloco anterior|slide anterior|antes disso|lembra que|voltando ao/i;
const FORMATO = /^(\d+:)?\d{2}:\d{2}$/;

export function segundos(tempo) {
  if (!FORMATO.test(String(tempo ?? ""))) throw new Error(`tempo "${tempo}" precisa estar no formato mm:ss (ou h:mm:ss)`);
  return String(tempo).split(":").reduce((s, p) => s * 60 + Number(p), 0);
}
export const mmss = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export function candidatosDeCorte({ roteiro, capitulos }) {
  const lista = [];
  const intervalo = (i) => {
    const inicio = segundos(capitulos[i].tempo);
    const fim = capitulos[i + 1] ? segundos(capitulos[i + 1].tempo) : null;
    return fim == null ? null : { inicio: mmss(inicio), fim: mmss(fim), duracao_s: fim - inicio };
  };
  const cabe = (iv) => iv && iv.duracao_s >= DURACAO_CORTE.min && iv.duracao_s <= DURACAO_CORTE.max;
  if (roteiro.gancho && capitulos[0]?.titulo === "Abertura") {
    const iv = intervalo(0);
    if (cabe(iv)) lista.push({ titulo: "Abertura", ...iv, motivo: "é o gancho: abre com a pergunta e já foi escrito para prender em 30 s" });
  }
  for (const b of roteiro.blocos) {
    if (b.tipo !== "exemplo" || DEPENDE_DO_RESTO.test(b.fala ?? "")) continue;
    const i = capitulos.findIndex((c) => c.titulo === b.titulo);
    if (i < 0) continue;
    const iv = intervalo(i);
    if (cabe(iv)) lista.push({ titulo: b.titulo, ...iv, motivo: `é um exemplo que se sustenta sozinho (bloco ${b.numero}, ${iv.duracao_s} s)` });
  }
  return lista;
}

export async function candidatos(pastaDoVideo) {
  const pasta = resolve(pastaDoVideo);
  const pub = join(pasta, "publicacao.json");
  if (!existsSync(pub)) throw new Error(`não achei ${pub} — o vídeo precisa estar publicado (skill publicar) e público`);
  const publicacao = JSON.parse(readFileSync(pub, "utf8"));
  if (publicacao.privacidade !== "public") throw new Error(`publicacao.json diz "${publicacao.privacidade}" — um corte só sai de vídeo público; se você já tornou público no YouTube Studio, troque para "public" no arquivo`);
  const roteiro = lerRoteiro(readFileSync(join(pasta, "roteiro.md"), "utf8"));
  const { capitulos } = JSON.parse(readFileSync(join(pasta, "metadados.json"), "utf8"));
  return { url: publicacao.url, candidatos: candidatosDeCorte({ roteiro, capitulos }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [opcao, caminho] = process.argv.slice(2);
  if (opcao !== "--candidatos" || !caminho) { console.error("uso: node scripts/corte.mjs --candidatos videos/<slug>"); process.exit(1); }
  try {
    const { url, candidatos: lista } = await candidatos(caminho);
    console.log(`vídeo: ${url}`);
    if (!lista.length) console.log(`nenhum trecho de ${DURACAO_CORTE.min} a ${DURACAO_CORTE.max} s se sustenta sozinho — escolha um intervalo à mão (mm:ss a mm:ss)`);
    lista.forEach((c, i) => console.log(`${i + 1}. ${c.titulo} — ${c.inicio} a ${c.fim} (${c.duracao_s} s)\n   ${c.motivo}`));
  } catch (e) {
    console.error(`erro: ${e.message}`); process.exit(1);
  }
}
```

`package.json`: `"corte": "node scripts/corte.mjs"`.

- [ ] **Step 4: Moldura — layout e CSS**

`design-system/instagram/reel.css`:
```css
/* PO para Todos — moldura do reel de Corte (1080×1920). O vídeo 16:9 (1080×608) é sobreposto
 * pelo ffmpeg no centro vertical; aqui só se desenha o que fica em volta: lockup, título em cima,
 * faixa embaixo. Mesma marca e grade de instagram.css. */
:root { --rm-video-altura: 608px; }
.ig--reel .ig__conteudo {
  top: calc(var(--ig-story-seguro) + var(--ig-lockup) + var(--space-xl));
  bottom: calc(50% + var(--rm-video-altura) / 2 + var(--space-lg));
  justify-content: flex-end; gap: var(--space-sm);
}
.ig--reel .ig__faixa { bottom: calc(var(--ig-story-seguro) + var(--ig-rodape-altura)); }
```

`design-system/instagram/layouts/reel-moldura.html`:
```html
<!doctype html>
<html lang="pt-BR" data-theme="youtube">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080">
<title>{{titulo_pagina}}</title>
<link rel="stylesheet" href="{{ds}}/tokens.css">
<link rel="stylesheet" href="{{ds}}/assets/fontes/fontes.css">
<link rel="stylesheet" href="{{ds}}/instagram/instagram.css">
<link rel="stylesheet" href="{{ds}}/instagram/reel.css">
</head>
<body>
<!-- Moldura do reel de Corte: o vídeo entra por cima, no meio; kicker e título em cima, faixa embaixo. -->
<main class="ig ig--story ig--reel">
  <img class="ig__lockup" src="{{ds}}/assets/Marca/logo-po-fundo-escuro.png" alt="Pesquisa Operacional para todos.">
  <div class="ig__conteudo">
    <p class="ig__kicker">CORTE DA AULA</p>
    <h1 class="ig__titulo {{titulo_classe}}">{{titulo}}</h1>
  </div>
{{#faixa}}  <p class="ig__faixa">{{faixa}}</p>
{{/faixa}}  <p class="ig__rodape"><span>@{{usuario}}</span></p>
</main>
</body>
</html>
```

- [ ] **Step 5: `gerar-reel.mjs` — tipo `corte`**

Acrescente aos imports: `import { execSync } from "node:child_process";`, `import { preencher, exportarPng } from "./modelo-html.mjs";`, `import { segundos, DURACAO_CORTE } from "../../scripts/corte.mjs";` e `const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8")); const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));`. Em `validarReel`, depois do bloco `if (dados.tipo === "cenas") { … }`:

```js
  if (dados.tipo === "corte") {
    for (const c of ["video", "inicio", "fim", "titulo"]) if (!dados[c] || !String(dados[c]).trim()) erros.push(`corte: falta "${c}"`);
    let ini, fim;
    try { ini = segundos(dados.inicio); fim = segundos(dados.fim); } catch (e) { erros.push(`corte: ${e.message}`); }
    if (ini != null && fim != null) {
      if (fim <= ini) erros.push('corte: "fim" precisa vir depois do início');
      else if (fim - ini < DURACAO_CORTE.min || fim - ini > DURACAO_CORTE.max) erros.push(`corte: ${fim - ini} s; um reel tem de ${DURACAO_CORTE.min} a ${DURACAO_CORTE.max} s`);
    }
    if (dados.titulo && dados.titulo.length > 60) erros.push(`corte: "titulo" tem ${dados.titulo.length} caracteres — máximo 60`);
    if (dados.faixa && dados.faixa.length > 40) erros.push(`corte: "faixa" tem ${dados.faixa.length} caracteres — máximo 40`);
  }
```

Depois de `argsConcat`, acrescente:

```js
export function acharYtDlp(executarSync = (cmd) => execSync(cmd, { stdio: "pipe" }).toString()) {
  try {
    return executarSync(process.platform === "win32" ? "where yt-dlp" : "command -v yt-dlp").split(/\r?\n/)[0].trim();
  } catch {
    throw new ErroReel('yt-dlp não encontrado — instale (README, "O que você vai instalar", item opcional "yt-dlp") e tente de novo');
  }
}

// Baixa só o trecho, em MP4 até 1080p; o corte durante o download usa o ffmpeg do projeto.
export function argsYtDlp({ url, inicio, fim, saida, ffmpegDir }) {
  return [
    "--quiet", "--no-warnings", "--no-playlist",
    "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4",
    "--download-sections", `*${inicio}-${fim}`, "--force-keyframes-at-cuts",
    "--ffmpeg-location", ffmpegDir,
    "-o", saida, url,
  ];
}

// Moldura (PNG 9:16) por baixo, vídeo 16:9 redimensionado à largura e centrado; áudio original se houver.
export function argsMoldura({ moldura, bruto, saida }) {
  return [
    "-y", "-loglevel", "error", "-loop", "1", "-i", moldura, "-i", bruto,
    "-filter_complex", "[1:v]scale=1080:-2:flags=lanczos[v];[0:v][v]overlay=0:(H-h)/2:shortest=1,format=yuv420p[out]",
    "-map", "[out]", "-map", "1:a?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    saida,
  ];
}

export function htmlDaMoldura({ titulo, faixa, ds }) {
  const modelo = readFileSync(join(DS, "instagram/layouts/reel-moldura.html"), "utf8");
  return preencher(modelo, { ds, usuario: canal.instagramUsuario, titulo, titulo_classe: titulo.length > 24 ? "ig__titulo--medio" : "", faixa: faixa ?? "", titulo_pagina: `${titulo} — reel` });
}

async function gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, exportar }) {
  const pub = join(raizVideos, dados.video, "publicacao.json");
  if (!existsSync(pub)) throw new ErroReel(`não achei ${pub} — o vídeo "${dados.video}" precisa estar publicado`);
  const publicacao = JSON.parse(readFileSync(pub, "utf8"));
  if (publicacao.privacidade !== "public") throw new ErroReel(`o vídeo "${dados.video}" precisa estar público (publicacao.json diz "${publicacao.privacidade}") — se já tornou público, troque para "public" no arquivo`);
  const ff = await ffmpeg();
  const bruto = join(pasta, "corte-bruto.mp4"), html = join(pasta, "reel-moldura.html"), moldura = join(pasta, "reel-moldura.png"), reel = join(pasta, "reel.mp4");
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  try {
    await executar(ytDlp ?? acharYtDlp(), argsYtDlp({ url: publicacao.url, inicio: dados.inicio, fim: dados.fim, saida: bruto, ffmpegDir: dirname(ff) }));
    if (!existsSync(bruto)) throw new ErroReel("yt-dlp terminou sem gerar corte-bruto.mp4 — o vídeo está público? a URL em publicacao.json está certa?");
    writeFileSync(html, htmlDaMoldura({ titulo: dados.titulo, faixa: dados.faixa, ds }));
    const { largura, altura } = formatos.formatos.story;
    exportar(html, moldura, { largura, altura });
    await executar(ff, argsMoldura({ moldura, bruto, saida: reel }));
    renameSync(moldura, join(pasta, "reel.png"));   // capa: a moldura com o título
  } finally {
    for (const a of [bruto, html]) if (existsSync(a)) unlinkSync(a);
    if (existsSync(moldura)) unlinkSync(moldura);
  }
  return reel;
}
```

Troque a assinatura de `gerarReel` e a última linha:

```js
export async function gerarReel(pasta, { soHtml = false, executar = rodar, renderizar = renderizarCenas, raizVideos = join(RAIZ, "videos"), ytDlp = null, exportar = exportarPng } = {}) {
  …
  if (dados.tipo === "cenas") return gerarDeCenas(dados, pasta, { soHtml, executar, renderizar });
  return gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, exportar });
}
```

Acrescente ao cabeçalho do arquivo: `// Corte exige yt-dlp instalado (README) e vídeo público (ADR-0008); reel.json: { "tipo": "corte", "video": "<slug>", "inicio": "mm:ss", "fim": "mm:ss", "titulo": "…", "faixa": "…", "legenda": { … } }`.

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 7: Teste de fumaça real (opcional, fora do `npm test`)**

Se `yt-dlp` estiver instalado na máquina: crie `instagram/2026-10-01-teste-corte/reel.json` com `{ "tipo": "corte", "video": "folgas-complementares", "inicio": "06:30", "fim": "07:20", "titulo": "EXEMPLO: O PRIMAL", "faixa": "AULA COMPLETA NO CANAL", "legenda": { "gancho": "Um exemplo de Primal em 50 segundos.", "corpo": "Teste.", "hashtags_tema": ["#Dualidade", "#ProgramacaoLinear", "#Simplex"] } }`, rode `node design-system/scripts/gerar-reel.mjs instagram/2026-10-01-teste-corte`, abra `reel.mp4` (vídeo centrado, áudio presente, título em cima, faixa embaixo) e **apague a pasta** antes de commitar.

- [ ] **Step 8: README — instalar `yt-dlp` (opcional)**

Em `README.md`, na seção **O que você vai instalar (uma vez só)**, depois do item 6 (PowerPoint), acrescente:

```markdown
7. **yt-dlp** (opcional — só para reels feitos de um trecho de vídeo já publicado). É o programa que baixa o trecho do YouTube.
   - Mac: no Terminal, `brew install yt-dlp` (se não tiver o Homebrew, instale antes em https://brew.sh).
   - Windows (no PowerShell): `winget install yt-dlp.yt-dlp`, depois feche e abra o PowerShell de novo.
   Confira digitando `yt-dlp --version` → deve aparecer uma data (a versão). Se você não for fazer reels de corte, pule este item; o Claude avisa quando precisar.
```

Na seção **Publicar no Instagram**, subseção **Fazer um post**, acrescente ao final:

```markdown
### Stories, reels e o "pacote"

Além do post, o Claude faz:
- **Story de aviso** do post novo — sai sozinho, pela API, logo depois do post (você aprova junto com os cards).
- **Sequência de stories** (quiz "respondido", explicação em passos): diga `quero um quiz sobre X`. Sem sticker ela sai pela API; com sticker (enquete, link) o Claude entrega os vídeos e um roteiro para você postar pelo app.
- **Reel**: `vê um trecho legal do vídeo Y para postar` (o Claude sugere trechos, você escolhe; precisa do `yt-dlp` do item 7 e do vídeo já público) ou `faz um reel sobre X` (cenas do zero).
- **Pacote**: `faz o pacote do vídeo Y` — post + story de aviso + reel, nessa ordem, com uma parada de aprovação em cada um.

Antes de publicar, o Claude confere os fatos (a "Checagem") e mostra o que confirmou e o que não conseguiu confirmar — é você quem decide o que fica.
```

- [ ] **Step 9: Commit**

```bash
git add scripts/corte.mjs tests/corte.test.mjs design-system/scripts/gerar-reel.mjs tests/reel.test.mjs design-system/instagram/layouts/reel-moldura.html design-system/instagram/reel.css README.md package.json
git commit -m "Reel de Corte: candidatos pelos capítulos reais, trecho baixado com yt-dlp e moldura de marca (ADR-0008)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Skill `pacote`, ajustes finais de documentação

**Files:**
- Create: `.claude/skills/pacote/SKILL.md`
- Modify: `CLAUDE.md`, `.claude/skills/publicar/SKILL.md`, `design-system/instagram/GUIA-AGENTE.md`
- Test: `tests/base.test.mjs` (só se ele já verificar a lista de skills — leia-o antes; se não verificar, não há teste nesta task)

**Interfaces:**
- Consumes: skills `post`, `reel` (Tasks 4–10). Nenhum código novo.

- [ ] **Step 1: Skill `.claude/skills/pacote/SKILL.md`**

```markdown
---
name: pacote
description: Faz o pacote do Instagram de uma ocasião — post (com story de aviso) e depois reel — encadeando as skills post e reel, sempre por pedido explícito da pessoa e com uma parada de aprovação em cada formato. Use quando a pessoa disser "faz o pacote do vídeo Y", "faz tudo que dá a partir do vídeo Y" ou "post e reel do artigo X".
---

# Pacote

Diga antes: "Vou fazer, nesta ordem: post (com o story de aviso) e depois o reel. Cada um para para você aprovar; se um falhar ao publicar, eu paro ali e digo o que já saiu."

Regras (spec `docs/superpowers/specs/2026-09-21-instagram-formatos-e-rigor.md`, "Pacote"):
- **Ordem fixa**: conteúdo original → story de aviso → reel. Nunca o reel antes do post.
- **Nunca sozinho**: este pacote só começa quando a pessoa pede. `/video` não chama isto.
- **Falha no meio para tudo**: não pule, não desfaça, não tente de novo por conta própria.

## 1. O que entra

Pergunte, numa rodada só, o que faltar:
- A origem: um vídeo (`videos/<slug>`, já **público** — o reel de corte exige) ou um artigo/tema (aí não há corte; o reel é do zero, ou a pessoa dispensa o reel).
- Uma pasta só: `instagram/<AAAA-MM-DD>-<slug>/` para o post, o story de aviso e o reel.
- O tipo do post: de um vídeo, normalmente `curiosidade` ou `citacao` (o vídeo já tem a Checagem da origem); de um artigo, `artigo`.

## 2. Post + story de aviso

Rode a skill `post` até o fim (inclui a Checagem quando o tipo exige, a parada de aprovação e o story de aviso). Se a publicação falhar, **pare aqui** e reporte: "Parei no post: <erro>. Nada foi publicado." Se o post saiu e o story de aviso falhou, reporte os dois estados e pare.

## 3. Reel

Só depois do post no ar: rode a skill `reel` na mesma pasta (corte se a origem é um vídeo público; cenas se não). Se falhar ao publicar, reporte: "Post e story no ar; o reel não saiu: <erro>." e pare.

## 4. Entrega

"Pacote publicado: post <url>, story de aviso, reel <url>." Liste também o que a pessoa ainda pode fazer à mão (destaque dos stories, story de vídeo novo com o sticker de link, se ainda não fez).
```

- [ ] **Step 2: `CLAUDE.md`**

Na seção **Fluxo de um post do Instagram**, reescreva o bloco para ficar assim (mantendo o que já foi acrescentado nas Tasks 7 e 9, em ordem):

```markdown
## Fluxo de um post do Instagram
`/post instagram/<data>-<slug>` (skill `post`): `post.md` → `cards.json` + `checagem.json` + `legenda.json` → `gerar-cards.mjs`, `scripts/checagem.mjs` e `scripts/legenda.mjs` → parada para aprovar (cards, legenda, story de aviso e o resumo da Checagem) → `node scripts/instagram.mjs --publicar` e `--publicar-story … story-aviso.mp4`. Tipos: `artigo`, `aviso`, `curiosidade`, `citacao`. Guia em `design-system/instagram/GUIA-AGENTE.md`; tokens em `~/.po-para-todos/instagram.json` (`docs/adr/0006`); mídia passa pelo branch `midia` (`docs/adr/0005`). `artigo` e `curiosidade` não publicam sem `checagem.json` (`docs/adr/0009`).

`/stories instagram/<data>-<slug>` (skill `stories`): quiz "respondido" ou sequência didática → `stories.json` + `checagem.json` → `gerar-story-video.mjs` → parada → `--publicar-stories` (sem sticker; com sticker é manual, `docs/adr/0007`).

`/reel instagram/<data>-<slug>` (skill `reel`): corte de vídeo publicado (`scripts/corte.mjs --candidatos`, `yt-dlp`, `docs/adr/0008`) ou cenas do zero → `reel.json` → `gerar-reel.mjs` + `legenda.mjs --reel` → parada → `--publicar-reel`.

`/pacote` (skill `pacote`): post + story de aviso + reel, nessa ordem, cada um com sua parada; só por pedido — `/video` nunca dispara nada do Instagram. Story de vídeo novo é sempre manual (sticker de link); story de aviso e sequências sem sticker saem pela API.
```

Na lista de scripts da seção **Fluxo de um vídeo**, acrescente (mantendo as já existentes):
```markdown
- `node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta>` — `story-aviso.mp4` de post novo.
- `node scripts/checagem.mjs instagram/<pasta>` — valida `checagem.json` e imprime o resumo da Checagem.
- `node scripts/citacao.mjs --candidatos <videos/<slug> | instagram/<pasta>>` — trechos para um post `citacao`.
- `node scripts/corte.mjs --candidatos videos/<slug>` — trechos de vídeo público para um reel.
- `node design-system/scripts/gerar-reel.mjs instagram/<pasta>` — `reel.json` → `reel.mp4`.
```
e na linha do `npm test`, acrescente `instagram/2026-09-20-kruskal-1956/checagem.json` à menção das fixtures (a pasta inteira já é fixture).

- [ ] **Step 3: Skill `publicar` e guia**

Em `.claude/skills/publicar/SKILL.md`, seção **4. Story para o Instagram**, troque `O story **não** vai pela API: o link é o motivo do story e a API não coloca sticker.` por `Este story **não** vai pela API: o link é o motivo dele e a API não coloca sticker (\`docs/adr/0007\`). Post, quiz e reel do vídeo só saem se a pessoa pedir — sugira, no fim, "quando o vídeo estiver público, posso fazer o pacote do Instagram (post + story + reel) se você quiser".`

Em `design-system/instagram/GUIA-AGENTE.md`, atualize o título e a primeira linha para: `# Guia do agente — do \`post.md\` aos cards, à Checagem e à legenda` / `Para quem recebe um \`instagram/<data>-<slug>/post.md\` e precisa entregar \`cards.json\`, \`checagem.json\`, \`legenda.json\` e os PNGs (e, para stories e reels, \`stories.json\`/\`reel.json\` — ver as skills \`stories\` e \`reel\`).` Confira que a seção **Comandos** lista, além dos antigos: `gerar-story-aviso.mjs`, `checagem.mjs`, `citacao.mjs --candidatos`, `corte.mjs --candidatos`, `gerar-reel.mjs`, `legenda.mjs --reel`, `--publicar-story`, `--publicar-stories`, `--publicar-reel` — acrescente as que faltarem, uma por linha, com o comentário curto.

- [ ] **Step 4: Rodar tudo e conferir o repositório**

Run: `npm test && git status --short`
Expected: `# fail 0`; nada modificado além dos arquivos desta task.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/pacote/SKILL.md CLAUDE.md .claude/skills/publicar/SKILL.md design-system/instagram/GUIA-AGENTE.md
git commit -m "Skill pacote (post → story de aviso → reel) e documentação dos fluxos novos do Instagram

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review (feito ao escrever o plano)

**Cobertura da spec**

| Item da spec | Task |
|---|---|
| Publicar `STORIES`/`REELS` pela API, sem sticker (ADR-0007) | 1, 2 |
| Story de aviso de post novo, automático, na mesma aprovação | 4 |
| Regra do story revisada no guia | 7 (Step 5) |
| Checagem: fonte externa e conta; visível na aprovação; obrigatória em `artigo`/`curiosidade`; nunca bloqueia sozinha (ADR-0009) | 5 (script, fixture, exigência, guia, skill), 6, 7, 9 (nos formatos) |
| Quiz "respondido" (pergunta → resposta, tom de engajamento, sem sticker) | 3 (modo sem sticker), 7 |
| `curiosidade` | 6 |
| `citacao` (candidatos sugeridos, sem Checagem) | 8 |
| `reel` do zero (cenas, mesmo rigor de `curiosidade`) | 9 |
| `reel` Corte: `yt-dlp` só de vídeo público, candidatos pelo gancho/exemplos/capítulos reais, áudio original, moldura de marca (ADR-0008) | 10 |
| Pacote: ordem fixa, falha para tudo, nunca por `/video` | 11 (skill), 1 (livro-razão dos stories) |
| `yt-dlp` no README como dependência opcional | 10 (Step 8) |
| Fora de escopo (agendamento, autonomia, métricas, `comemorativa`, resumo periódico, TTS) | não há tasks — correto |

**Placeholders**: nenhum "TBD"/"similar à Task N"; cada script, layout, JSON e SKILL.md está escrito por inteiro. Exceção deliberada e explícita: o conteúdo de `checagem.json` do Kruskal (Task 5, Step 5) deve ser **conferido contra o artigo** pelo executor — o plano dá o texto completo, mas o arquivo tem de refletir o que o artigo diz.

**Consistência de nomes**: `prepararPublicacao`, `carimboDe`, `esvaziarMidia`, `TENTATIVAS_VIDEO`, `LEDGER_STORIES`, `lerPublicacoesDeStories`, `publicarStory`, `publicarStories`, `publicarReel` (Tasks 1–2) ↔ CLI e skills; `PUBLICACOES`, `validar`, `htmlDaCena(s, ds, { semSticker })`, `argsFfmpeg`, `gravarCena`, `renderizarCenas(cenas, { pasta, prefixo, numerar, soHtml, so, semSticker })` (Task 3) ↔ Tasks 4 e 9; `cenaDoAviso`/`encurtar` (Task 4) ↔ casos acrescentados nas Tasks 6 e 8; `validarChecagem`/`resumoChecagem`/`carregarChecagem`/`precisaChecagem` (Task 5) ↔ `publicarPost` e skills; `gerarLegenda(pasta, { reel })` (Task 9) ↔ `--publicar-reel` exige `reel-legenda.txt` (Task 2); `segundos`/`DURACAO_CORTE` (Task 10, `scripts/corte.mjs`) ↔ `validarReel` em `gerar-reel.mjs`; `gerarReel(pasta, { soHtml, executar, renderizar, raizVideos, ytDlp, exportar })` (Tasks 9–10) ↔ testes.

**Ordem**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. As Tasks 6, 7 e 8 dependem só de 3–5 e podem ser executadas em qualquer ordem entre si; 9 depende de 3; 10 depende de 9; 11 depende de todas.

