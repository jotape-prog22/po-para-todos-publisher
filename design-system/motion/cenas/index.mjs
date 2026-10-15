// Registro dos tipos de Cena e a validação comum. Cada tipo é um módulo com
// usaGrade, validar, linhaDoTempo e desenhar (ver o contrato no plano/GUIA.md).

import { LIMITES_CENA, checarTamanho } from "./comum.mjs";
import * as texto from "./texto.mjs";

export const CENAS = { texto };
export const INTERNAS = {};
export const TIPOS_DE_CENA = Object.keys(CENAS);
export const moduloDe = (tipo) => CENAS[tipo] ?? INTERNAS[tipo];

export function validarCena(cena, onde, { formato = "story", existeIcone = () => true } = {}) {
  const tipo = cena?.tipo ?? "texto";
  const mod = CENAS[tipo];
  if (!mod) return { erros: [`${onde}: tipo de cena "${tipo}" não existe (${Object.keys(CENAS).join(", ")})`] };
  const erros = [];
  const duracao = Number(cena.duracao);
  const { min, max } = LIMITES_CENA.duracao[formato];
  if (!(duracao >= min && duracao <= max)) erros.push(`${onde}: "duracao" deve ser um número de ${min} a ${max} segundos`);
  for (const c of ["kicker", "titulo", "faixa"]) if (cena[c] != null) { const e = checarTamanho(c, cena[c], LIMITES_CENA.campos[c], onde); if (e) erros.push(e); }
  erros.push(...mod.validar(cena, onde, { existeIcone }));
  if (erros.length) return { erros };
  const linha = mod.linhaDoTempo(cena);
  const minimo = Math.ceil(Math.round((linha.fim + LIMITES_CENA.folga[formato]) * 10000) / 1000) / 10;   // arredonda antes do teto: 1,9 não pode virar 2,0 por ponto flutuante
  if (duracao < minimo) return { erros: [`${onde}: o último bloco entra aos ${linha.fim.toFixed(1)} s; "duracao" precisa ser de pelo menos ${minimo} s`] };
  return { erros: [], cena: { ...cena, tipo, duracao, minimo, linha } };
}
