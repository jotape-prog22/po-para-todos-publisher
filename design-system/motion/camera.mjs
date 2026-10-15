// Câmera 2D com chaves (portada do Cam2D do pdoom-video, MIT — ver LICENSE-pdoom.txt).
// Uma chave diz: no instante t, o ponto do mundo (cx, cy) fica no centro da tela, com zoom z e giro.

import { clamp, lerp, ease } from "./util.mjs";

export class Camera {
  constructor(largura, altura) { this.largura = largura; this.altura = altura; this.chaves = []; }

  chave(t, cx, cy, z = 1, giro = 0, curva = ease.inOutCubic) {
    this.chaves.push({ t, cx, cy, z, giro, curva });
    this.chaves.sort((a, b) => a.t - b.t);
    return this;
  }

  em(t) {
    const ks = this.chaves;
    const so = (k) => ({ cx: k.cx, cy: k.cy, z: k.z, giro: k.giro });
    if (!ks.length) return { cx: this.largura / 2, cy: this.altura / 2, z: 1, giro: 0 };
    if (t <= ks[0].t) return so(ks[0]);
    for (let i = 1; i < ks.length; i++) {
      const b = ks[i];
      if (t > b.t) continue;
      const a = ks[i - 1];
      const k = b.curva(clamp((t - a.t) / Math.max(1e-4, b.t - a.t)));
      const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), k));
      const giro = lerp(a.giro, b.giro, k);
      // zoom em torno do ponto fixo do movimento: aproximar e afastar parecem um gesto só
      if (Math.abs(b.z - a.z) > a.z * 0.04) {
        const fx = (b.z * b.cx - a.z * a.cx) / (b.z - a.z), fy = (b.z * b.cy - a.z * a.cy) / (b.z - a.z);
        return { cx: fx - (a.z / z) * (fx - a.cx), cy: fy - (a.z / z) * (fy - a.cy), z, giro };
      }
      return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z, giro };
    }
    return so(ks[ks.length - 1]);
  }

  // Multiplica a transformação atual do contexto (não substitui: respeita transições por fora).
  aplicar(ctx, t) {
    const { cx, cy, z, giro } = this.em(t);
    const co = Math.cos(giro), si = Math.sin(giro);
    ctx.transform(z * co, z * si, -z * si, z * co, this.largura / 2 - z * (co * cx - si * cy), this.altura / 2 - z * (si * cx + co * cy));
  }
}
