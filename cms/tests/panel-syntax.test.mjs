import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

test("mã JavaScript trong giao diện CMS hợp lệ", async () => {
  const html = await readFile(new URL("../panel.html", import.meta.url), "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "CMS panel cần script nội bộ");
  assert.doesNotThrow(() => new Script(match[1]));
});
