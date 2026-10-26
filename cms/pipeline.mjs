import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, dataRoot, projectRoot, activeRelease, audit, now, setSetting } from "./store.mjs";
import { hash, mergeCandidate, validateSource } from "./schema.mjs";
import { loadGoogleSource, driveFile } from "./google.mjs";
import { ownerDriveFile } from "./drive-media.mjs";

export const sourcePath = path.resolve(process.env.ARL_LOCAL_CONTENT_PATH || path.join(projectRoot, "cms", "local", "ARL_Content.json"));
export const localMediaRoot = path.resolve(process.env.ARL_LOCAL_MEDIA_DIR || path.join(dataRoot, "media"));
const allowedMime = { "image/jpeg": ["jpg", 10_000_000], "image/png": ["png", 10_000_000], "image/webp": ["webp", 10_000_000], "application/pdf": ["pdf", 20_000_000], "video/mp4": ["mp4", 25_000_000] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function sourceData() {
  if (process.env.ARL_CONTENT_SHEET_ID) return loadGoogleSource();
  if (process.env.ARL_MODE === "production") throw new Error("Production cần ARL_CONTENT_SHEET_ID");
  return JSON.parse(await readFile(sourcePath, "utf8"));
}
async function retryGoogle(action) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await action(); }
    catch (error) {
      if (!/Google API (429|5\d\d)/.test(error.message) || attempt === 4) throw error;
      await sleep(Math.min(8000, 250 * 2 ** attempt + Math.random() * 250));
    }
  }
}
function mimeOf(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  return null;
}
async function loadMedia(row) {
  let bytes, metadata;
  if (row.drive_file_id) ({ bytes, metadata } = await retryGoogle(() => /^M_UPLOAD_[a-f0-9]{32}$/.test(row.media_id || "") ? ownerDriveFile(row.drive_file_id) : driveFile(row.drive_file_id)));
  else if (row.local_path && process.env.ARL_MODE !== "production") {
    const root = localMediaRoot;
    const target = path.resolve(root, row.local_path);
    if (!target.startsWith(root + path.sep)) throw new Error("Media local_path ngoài thư mục cho phép");
    bytes = await readFile(target);
    metadata = { name: path.basename(target), size: bytes.length, modifiedTime: (await stat(target)).mtime.toISOString() };
  } else throw new Error(`Media ${row.media_id} thiếu Drive file ID`);
  const mime = mimeOf(bytes), spec = allowedMime[mime];
  if (!spec || bytes.length > spec[1] || (row.mime_type && row.mime_type !== mime)) throw new Error(`Media ${row.media_id} sai loại hoặc vượt dung lượng`);
  if (!row.alt_vi?.trim() || !row.alt_en?.trim()) throw new Error(`Media ${row.media_id} thiếu alt Việt/Anh`);
  return { bytes, metadata, mime, filename: `${createHash("sha256").update(bytes).digest("hex")}.${spec[0]}` };
}
async function loadBody(fileId, locale) {
  if (!fileId) return null;
  let bytes;
  if (fileId.startsWith("local:") && process.env.ARL_MODE !== "production") {
    const root = path.resolve(projectRoot, "cms", "local", "bodies");
    const target = path.resolve(root, fileId.slice(6));
    if (!target.startsWith(root + path.sep)) throw new Error("Body path ngoài thư mục cho phép");
    bytes = await readFile(target);
  } else ({ bytes } = await retryGoogle(() => driveFile(fileId)));
  if (bytes.length > 1_000_000) throw new Error(`Body ${locale} vượt 1 MB`);
  const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (/<\/?(?:script|iframe|object|embed|style)|on\w+\s*=|javascript:/i.test(value)) throw new Error(`Body ${locale} chứa HTML hoặc script nguy hiểm`);
  return value.replace(/<[^>]*>/g, "");
}
export async function createCandidate(actor) {
  const source = await retryGoogle(sourceData);
  const sourceHash = hash(source);
  if (process.env.ARL_MODE === "production") {
    const pending = Object.entries(source).flatMap(([tab, rows]) => Array.isArray(rows) ? rows.filter(x => x.needs_confirmation === true).map(x => ({ tab, record_id: x.page_id || x.setting_key || x.product_id || x.research_id || "", field: "needs_confirmation", message: "ARL cần xác nhận nội dung trước production" })) : []);
    if (pending.length) return { errors: pending };
  }
  const errors = validateSource(source);
  if (errors.length) return { errors };
  const active = activeRelease();
  const previous = active ? JSON.parse(await readFile(path.join(active.path, "content.json"), "utf8")) : null;
  const snapshot = mergeCandidate(structuredClone(source), previous);
  const candidateErrors = validateSource(snapshot);
  if (candidateErrors.length) return { errors: candidateErrors };
  const second = await retryGoogle(sourceData);
  if (sourceHash !== hash(second)) throw new Error("Nguồn thay đổi trong lúc kiểm tra; tạo candidate mới");
  const id = randomUUID(), folder = path.join(dataRoot, "candidates", id), assetFolder = path.join(folder, "assets");
  await mkdir(assetFolder, { recursive: true });
  for (const tab of ["Pages", "Research"]) for (const row of snapshot[tab]) {
    for (const locale of ["vi", "en"]) {
      const fileId = row[`body_${locale}_file_id`];
      if (fileId) row[`body_${locale}`] = await loadBody(fileId, locale);
    }
  }
  const mediaIds = new Set();
  for (const tab of ["Pages", "Products", "Solutions", "Research", "Members", "Content_Blocks"]) for (const row of snapshot[tab]) {
    for (const [key, value] of Object.entries(row)) if (key.endsWith("media_id") && value) mediaIds.add(value);
    for (const locale of ["vi", "en"]) for (const match of String(row[`body_${locale}`] || "").matchAll(/media:([A-Za-z0-9_-]+)/g)) mediaIds.add(match[1]);
  }
  snapshot.Media = snapshot.Media.filter(row => mediaIds.has(row.media_id));
  for (const id of mediaIds) if (!snapshot.Media.some(row => row.media_id === id)) throw new Error(`Media ${id} được tham chiếu nhưng không đăng ký trong Media`);
  for (const media of snapshot.Media) {
    if (media.visibility !== "public_approved") throw new Error(`Media ${media.media_id} đang được tham chiếu nhưng chưa được duyệt công khai`);
    const loaded = await loadMedia(media);
    media.checksum = loaded.filename.split(".")[0];
    media.source_modified_at = loaded.metadata.modifiedTime;
    if (loaded.mime.startsWith("image/")) {
      for (const [field, width] of [["asset_file", 1200], ["asset_card_file", 640]]) {
        const bytes = await sharp(loaded.bytes).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        const filename = `${createHash("sha256").update(bytes).digest("hex")}.webp`;
        media[field] = filename;
        await writeFile(path.join(assetFolder, filename), bytes);
      }
    } else {
      media.asset_file = loaded.filename;
      await writeFile(path.join(assetFolder, loaded.filename), loaded.bytes);
    }
  }
  for (const media of snapshot.Media) {
    delete media.drive_file_id;
    delete media.local_path;
    delete media.rights_note;
    delete media.source_url;
  }
  for (const tab of ["Pages", "Research"]) for (const row of snapshot[tab]) for (const locale of ["vi", "en"]) delete row[`body_${locale}_file_id`];
  const candidateHash = hash(snapshot), created = now();
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  await writeFile(path.join(folder, "content.json"), JSON.stringify(snapshot));
  db.prepare("INSERT INTO candidates(id,hash,source_hash,snapshot,actor,created_at,expires_at) VALUES(?,?,?,?,?,?,?)").run(id, candidateHash, sourceHash, JSON.stringify(snapshot), actor, created, expires);
  audit(actor, "candidate.create", id, "ok");
  return { id, hash: candidateHash, source_hash: sourceHash, created_at: created, expires_at: expires, changes: diff(previous, snapshot) };
}
function diff(before, after) {
  const result = {};
  for (const tab of ["Pages", "Products", "Solutions", "Research", "Members", "Content_Blocks", "CTAs", "Media", "Redirects"]) {
    const prior = new Map((before?.[tab] || []).map(row => [Object.values(row)[0], hash(row)]));
    const next = new Map((after[tab] || []).map(row => [Object.values(row)[0], hash(row)]));
    result[tab] = { added: [...next.keys()].filter(id => !prior.has(id)), changed: [...next.keys()].filter(id => prior.has(id) && prior.get(id) !== next.get(id)), removed: [...prior.keys()].filter(id => !next.has(id)) };
  }
  return result;
}
export async function publishCandidate(id, expectedHash, actor) {
  const candidate = db.prepare("SELECT * FROM candidates WHERE id=?").get(id);
  if (!candidate || candidate.hash !== expectedHash || candidate.expires_at <= now()) throw new Error("Candidate không tồn tại, hết hạn hoặc hash không khớp");
  if (hash(await retryGoogle(sourceData)) !== candidate.source_hash) throw new Error("Nguồn đã thay đổi sau preview; cần tạo candidate mới");
  const existing = db.prepare("SELECT * FROM releases WHERE candidate_id=?").get(id);
  if (existing) return existing;
  const snapshot = JSON.parse(candidate.snapshot), releaseId = randomUUID();
  if (snapshot.Pages.some(page => page.legal_draft_status === "pending_facts")) throw new Error("Chính sách/điều khoản còn là bản nháp; chưa thể đăng website");
  const finalFolder = path.join(dataRoot, "releases", releaseId), temporary = `${finalFolder}.building`;
  await mkdir(path.join(temporary, "assets"), { recursive: true });
  const candidateAssets = path.join(dataRoot, "candidates", id, "assets");
  for (const file of await readdir(candidateAssets)) await copyFile(path.join(candidateAssets, file), path.join(temporary, "assets", file));
  await writeFile(path.join(temporary, "content.json"), JSON.stringify(snapshot));
  await writeFile(path.join(temporary, "manifest.json"), JSON.stringify({ release_id: releaseId, candidate_id: id, hash: candidate.hash, created_at: now(), assets: snapshot.Media.flatMap(x => [x.asset_file, x.asset_card_file]).filter(Boolean) }));
  const routeSlugs = new Set();
  for (const page of snapshot.Pages) if (page.route) routeSlugs.add(page.route);
  for (const product of snapshot.Products) routeSlugs.add(`/products/${product.slug}`);
  for (const research of snapshot.Research) routeSlugs.add(`/research/${research.slug}`);
  if (!routeSlugs.has("/") || !routeSlugs.has("/contact")) throw new Error("Release thiếu route bắt buộc");
  await import("node:fs/promises").then(fs => fs.rename(temporary, finalFolder));
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO releases(id,candidate_id,hash,path,actor,created_at) VALUES(?,?,?,?,?,?)").run(releaseId, id, candidate.hash, finalFolder, actor, now());
    setSetting("active_release", releaseId);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  audit(actor, "release.publish", releaseId, "ok");
  return db.prepare("SELECT * FROM releases WHERE id=?").get(releaseId);
}
export function rollback(releaseId, actor) {
  const release = db.prepare("SELECT * FROM releases WHERE id=?").get(releaseId);
  if (!release) throw new Error("Release không tồn tại");
  setSetting("active_release", releaseId);
  audit(actor, "release.rollback", releaseId, "ok");
  return release;
}
