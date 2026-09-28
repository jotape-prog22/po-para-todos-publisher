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
