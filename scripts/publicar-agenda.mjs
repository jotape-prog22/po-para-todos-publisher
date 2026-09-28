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
import { carregarChecagem, ErroChecagem } from "./checagem.mjs";

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

// Os publicadores reais (os mesmos da publicação manual). Sequência de stories exige checagem.json, como post e reel de cenas.
export function publicadoresDaNuvem(tokens, fns = { publicarPost, publicarStory, publicarStories, publicarReel }) {
  return {
    post: (p) => fns.publicarPost(p, { tokens }),
    "story-aviso": (p) => fns.publicarStory(p, "story-aviso.mp4", { tokens }),
    stories: async (p) => {
      try { carregarChecagem(p); } catch (e) { if (e instanceof ErroChecagem) throw new ErroInstagram(e.message); throw e; }
      return fns.publicarStories(p, { tokens });
    },
    reel: (p) => fns.publicarReel(p, { tokens }),
  };
}

// ---------- CLI ----------
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const simular = process.argv.includes("--simular");
  const agora = Date.now();
  const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
  try {
    const agenda = lerAgenda();
    // Sem nada vencido não há o que publicar — e ainda não precisa de token (antes da configuração da nuvem,
    // as rodadas de 30 min têm que passar em silêncio, sem e-mail de falha).
    const vencidos = devidos(agenda, agora);
    if (!vencidos.length) { console.log("nada vencido — nada a publicar"); process.exit(0); }
    console.log(`${vencidos.length} item(ns) vencido(s)${simular ? " (simulação)" : ""}`);
    let publicadores, tokens;
    if (simular) {
      publicadores = Object.fromEntries(["post", "story-aviso", "stories", "reel"].map((e) => [e, async (pasta) => { console.log(`  [simulado] ${e} de ${pasta}`); return { url: "(simulado)" }; }]));
    } else {
      // Só com algo vencido: os tokens e a validade do token são conferidos antes de publicar qualquer coisa.
      tokens = tokensDoAmbiente();
      if (diasRestantes(tokens.instagram, agora) < 0) throw new ErroInstagram("o token do Instagram venceu — gere outro e rode: node scripts/instagram.mjs --token \"<token>\" e depois node scripts/agenda.mjs --configurar-nuvem");
      publicadores = publicadoresDaNuvem(tokens);
    }
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
