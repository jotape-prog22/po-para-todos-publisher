// Registro dos tipos de Cena e a validação comum. Cada tipo é um módulo com
// usaGrade, validar, linhaDoTempo e desenhar (ver o contrato no plano/GUIA.md).

import { LIMITES_CENA, checarTamanho } from "./comum.mjs";
import MOVIMENTO from "../movimento.mjs";
import * as texto from "./texto.mjs";
import * as impacto from "./impacto.mjs";
import * as odometro from "./odometro.mjs";
import * as grafo from "./grafo.mjs";
import * as conta from "./conta.mjs";
import * as grafico from "./grafico.mjs";
import * as tabela from "./tabela.mjs";
import * as pergunta from "./pergunta.mjs";
import * as riscado from "./riscado.mjs";
import * as digitado from "./digitado.mjs";
import * as moldura from "./moldura.mjs";

export const CENAS = { texto, impacto, odometro, grafo, conta, grafico, tabela, pergunta, riscado, digitado };
export const INTERNAS = { moldura };
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
  // A tela fica parada a folga depois do último bloco entrar, e a última escrita termina com tempo de ler.
  const piso = Math.max(linha.fim + LIMITES_CENA.folga[formato], (linha.fimEscrita ?? linha.fim) + MOVIMENTO.duracoes.leitura_final);
  const minimo = Math.ceil(Math.round(piso * 10000) / 1000) / 10;   // arredonda antes do teto: 1,9 não pode virar 2,0 por ponto flutuante
  if (duracao < minimo) return { erros: [`${onde}: o último bloco entra aos ${linha.fim.toFixed(1)} s; "duracao" precisa ser de pelo menos ${minimo} s`] };
  return { erros: [], cena: { ...cena, tipo, duracao, minimo, linha } };
}

// Regras de reel inteiro sobre as Chamadas (Cenas já validadas, com "tipo"). Devolve os erros.
export function validarChamadas(cenas) {
  const erros = [];
  const primeira = cenas[0], ultima = cenas.at(-1), n = cenas.length;
  if (primeira?.tipo === "pergunta") {
    if (primeira.resposta != null) erros.push(`cena 1: a pergunta de abertura não leva "resposta" — a última cena é que revela`);
    else if (n < 2 || ultima.tipo !== "pergunta" || ultima.resposta == null) erros.push(`cena 1 é uma pergunta: a última cena precisa revelá-la (tipo "pergunta" com as mesmas "opcoes" e a "resposta")`);
    else if (JSON.stringify(ultima.opcoes) !== JSON.stringify(primeira.opcoes)) erros.push(`cena ${n}: as "opcoes" precisam ser as mesmas da cena 1, na mesma ordem`);
  }
  if (ultima?.tipo === "desafio") erros.push(`cena ${n}: um desafio não fecha o reel — a resposta vem na cena seguinte`);
  return erros;
}
