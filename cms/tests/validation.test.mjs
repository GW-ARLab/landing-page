import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateSource } from "../schema.mjs";

const source = JSON.parse(await readFile(path.resolve(import.meta.dirname, "..", "local", "ARL_Content.json"), "utf8"));
test("seed hợp lệ, redirect đứt đích và menu vòng lặp bị chặn", () => {
  assert.deepEqual(validateSource(source), []);
  const badRedirect = structuredClone(source);
  badRedirect.Redirects.push({ redirect_id: "RD_BAD", from_path: "/old", to_path: "/missing", status_code: 301 });
  assert.ok(validateSource(badRedirect).some(x => x.tab === "Redirects" && x.field === "to_path"));
  const cycle = structuredClone(source);
  cycle.Navigation.find(x => x.navigation_id === "NAV_PRODUCTS").parent_id = "NAV_WORKFLOW";
  assert.ok(validateSource(cycle).some(x => x.tab === "Navigation" && x.field === "parent_id"));
  const privateMedia = structuredClone(source);
  privateMedia.Media.push({ media_id: "M_PRIVATE", visibility: "internal", alt_vi: "Nội bộ", alt_en: "Internal" });
  privateMedia.Content_Blocks[0].media_id = "M_PRIVATE";
  assert.ok(validateSource(privateMedia).some(x => x.tab === "Media"));
});
