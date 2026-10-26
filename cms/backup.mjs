import { backup, DatabaseSync } from "node:sqlite";
import { mkdir, writeFile, cp, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { db, dataRoot, activeRelease, now } from "./store.mjs";
import { sourceData, localMediaRoot } from "./pipeline.mjs";
import { hash } from "./schema.mjs";

const destinationRoot = path.resolve(process.env.ARL_BACKUP_DIR || path.join(dataRoot, "backups"));
if (process.env.ARL_MODE === "production" && !process.env.ARL_BACKUP_DIR) throw new Error("Production cần ARL_BACKUP_DIR trên volume backup riêng");
const folder = path.join(destinationRoot, new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-"));
await mkdir(folder, { recursive: true });
const source = await sourceData();
await writeFile(path.join(folder, "ARL_Content.json"), JSON.stringify(source));
const localImages = (source.Media || []).filter(row => row.local_path);
if (localImages.length) {
  if (!(await stat(localMediaRoot).catch(() => null))?.isDirectory()) throw new Error("Thiếu thư mục ảnh local; không thể sao lưu đầy đủ");
  if (folder.startsWith(localMediaRoot + path.sep)) throw new Error("Đích sao lưu không được nằm trong thư mục ảnh nguồn");
  await cp(localMediaRoot, path.join(folder, "media"), { recursive: true });
  for (const row of localImages) {
    const originalPath = path.resolve(localMediaRoot, row.local_path);
    if (!originalPath.startsWith(localMediaRoot + path.sep)) throw new Error(`Media ${row.media_id} ngoài thư mục sao lưu`);
    const original = await readFile(originalPath);
    const backedUp = await readFile(path.join(folder, "media", row.local_path));
    if (!original.equals(backedUp)) throw new Error(`Backup media ${row.media_id} failed`);
  }
}
await backup(db, path.join(folder, "arl.sqlite"));
const active = activeRelease();
const releases = db.prepare("SELECT id,path,hash FROM releases ORDER BY created_at").all();
for (const release of releases) await cp(release.path, path.join(folder, "releases", release.id), { recursive: true });
const manifest = { at: now(), source_hash: hash(source), active_release: active?.id || null, releases: releases.map(x => ({ id: x.id, hash: x.hash })), files: ["ARL_Content.json", "arl.sqlite", "releases", ...(localImages.length ? ["media"] : [])] };
await writeFile(path.join(folder, "backup-manifest.json"), JSON.stringify(manifest, null, 2));
const verifiedSource = JSON.parse(await readFile(path.join(folder, "ARL_Content.json"), "utf8"));
const check = new DatabaseSync(path.join(folder, "arl.sqlite"));
if (hash(verifiedSource) !== manifest.source_hash || check.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") throw new Error("Backup verification failed");
for (const release of releases) {
  const content = JSON.parse(await readFile(path.join(folder, "releases", release.id, "content.json"), "utf8"));
  if (hash(content) !== release.hash) throw new Error(`Release ${release.id} backup verification failed`);
}
check.close();
console.log(JSON.stringify({ folder, ...manifest }));
