// Os tokens de movimento.json como módulo, para quem não recebe o kit (a linha do tempo das Cenas,
// a composição). Import de JSON nativo: roda no Node e no navegador (a página é servida por HTTP,
// com o .json em application/json). No desenho, as Cenas usam kit.movimento — o mesmo arquivo.

import MOVIMENTO from "./movimento.json" with { type: "json" };

export default MOVIMENTO;

// O ritmo de entrada dos blocos de um tipo de Cena (movimento.json → ritmo.<tipo>).
export function ritmoDe(tipo, movimento = MOVIMENTO) {
  const r = movimento.ritmo?.[tipo];
  if (!r) throw new Error(`movimento.json não tem "ritmo.${tipo}"`);
  return r;
}
