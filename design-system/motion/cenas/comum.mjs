// Limites que valem para toda Cena, qualquer que seja o tipo.

export const LIMITES_CENA = {
  duracao: { story: { min: 5, max: 60 }, reel: { min: 3, max: 60 } },   // segundos; o Instagram corta story em 60
  folga: { story: 2, reel: 1.2 },                                        // tela parada depois do último bloco entrar
  campos: { kicker: 40, titulo: 60, faixa: 40 },
};

export const tamanho = (s) => String(s ?? "").replace(/\n/g, "").length;

export function checarTamanho(campo, valor, limite, onde) {
  return tamanho(valor) > limite ? `${onde}: "${campo}" tem ${tamanho(valor)} caracteres; o máximo é ${limite}` : null;
}
