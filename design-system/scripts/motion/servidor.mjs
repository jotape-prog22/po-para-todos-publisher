// Servidor HTTP local, só leitura e só em 127.0.0.1, para a página do motor carregar módulos ES,
// fontes e imagens (o Chrome não carrega módulos de file://). Porta livre escolhida pelo sistema.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname, sep } from "node:path";

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
};

export function servir({ raiz, extras = {} }) {
  const base = normalize(raiz);
  const srv = createServer(async (req, res) => {
    try {
      if (req.method !== "GET") { res.writeHead(405).end(); return; }
      const caminho = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const extra = extras[caminho];
      if (extra) {
        const corpo = extra.arquivo ? await readFile(extra.arquivo) : extra.corpo;
        res.writeHead(200, { "content-type": extra.tipo, "cache-control": "no-store" }).end(corpo);
        return;
      }
      const arquivo = normalize(join(base, caminho));
      if (arquivo !== base && !arquivo.startsWith(base + sep)) { res.writeHead(403).end(); return; }
      const corpo = await readFile(arquivo);
      res.writeHead(200, { "content-type": TIPOS[extname(arquivo)] ?? "application/octet-stream", "cache-control": "no-store" }).end(corpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({
    url: `http://127.0.0.1:${srv.address().port}`,
    fechar: () => new Promise((f) => { srv.closeAllConnections?.(); srv.close(() => f()); }),
  })));
}
