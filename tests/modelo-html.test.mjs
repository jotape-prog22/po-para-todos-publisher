import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { preencher, esc } from "../design-system/scripts/modelo-html.mjs";

test("preencher substitui, escapa e respeita blocos condicionais", () => {
  const html = "<p>{{a}}</p>{{#b}}<b>{{b}}</b>{{/b}}<i>{{c}}</i>";
  assert.equal(preencher(html, { a: "x<y", b: "", c: "<br>" }, { brutos: ["c"] }), "<p>x&lt;y</p><i><br></i>");
  assert.equal(preencher(html, { a: "1", b: "2", c: "" }), "<p>1</p><b>2</b><i></i>");
  assert.equal(esc('a"b&c'), "a&quot;b&amp;c");
});

test("exportar.sh aceita largura e altura", () => {
  const sh = readFileSync(new URL("../design-system/scripts/exportar.sh", import.meta.url), "utf8");
  assert.match(sh, /largura="\$\{4:-1280\}"/);
  assert.match(sh, /altura="\$\{5:-720\}"/);
  assert.match(sh, /--window-size="\$largura,\$altura"/);
});

test("sharp instalado", async () => {
  const sharp = (await import("sharp")).default;
  const buf = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#51AA04" } }).jpeg().toBuffer();
  assert.equal(buf[0], 0xff); assert.equal(buf[1], 0xd8);   // magic bytes do JPEG
});
