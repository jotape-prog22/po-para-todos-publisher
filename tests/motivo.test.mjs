import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("motivo-nos-600.png existe e mede 600×600", () => {
  const buf = readFileSync(new URL("../design-system/assets/Marca/motivo-nos-600.png", import.meta.url));
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  assert.equal(buf.readUInt32BE(16), 600);
  assert.equal(buf.readUInt32BE(20), 600);
});
