// Galeria das Chamadas: abre no navegador, com som, um vídeo curto para cada exemplo de
// design-system/motion/chamadas-exemplos.json (Cena de abertura e, quando precisa, a revelação).
//   npm run chamadas                 # todas
//   npm run chamadas -- riscado      # só os exemplos cujo nome contém "riscado"
// Fica no ar até Ctrl+C. Não grava nada.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validarCenas, USUARIO } from "./gerar-story-video.mjs";
import { validarChamadas } from "../motion/cenas/index.mjs";
import { montarComposicao } from "../motion/composicao.mjs";
import { verComposicoes } from "./motion/ver.mjs";
import { carregarBiblioteca } from "../../scripts/audio.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function composicoesDaGaleria(exemplos, biblioteca) {
  return exemplos.map((ex) => {
    const cenas = validarCenas(ex.cenas, { formato: "reel", rotulo: `${ex.nome} — cena` });
    const [regra] = validarChamadas(cenas);
    if (regra) throw new Error(`${ex.nome}: ${regra}`);
    const trilha = ex.trilha ? biblioteca.trilhas.find((t) => t.id === ex.trilha) ?? null : null;
    return { nome: ex.nome, comp: montarComposicao(cenas, { formato: "reel", trilha, usuario: USUARIO }), trilhaId: trilha ? ex.trilha : null };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const filtro = process.argv[2]?.toLowerCase();
  const exemplos = JSON.parse(readFileSync(join(DS, "motion/chamadas-exemplos.json"), "utf8")).filter((e) => !filtro || e.nome.toLowerCase().includes(filtro));
  if (!exemplos.length) { console.error(`nenhum exemplo com "${filtro}" no nome`); process.exit(1); }
  const biblioteca = carregarBiblioteca();
  const { url } = await verComposicoes(composicoesDaGaleria(exemplos, biblioteca), { biblioteca });
  console.log(`galeria das Chamadas em ${url} — Ctrl+C para fechar`);
}
