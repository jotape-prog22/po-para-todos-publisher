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
