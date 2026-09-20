import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("dependências instaladas", () => {
  assert.ok(existsSync(new URL("../node_modules/pptxgenjs", import.meta.url)));
  assert.ok(existsSync(new URL("../node_modules/yaml", import.meta.url)));
});
