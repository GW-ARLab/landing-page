import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const dataRoot = path.resolve(process.env.ARL_DATA_DIR || path.join(projectRoot, "cms-data"));
mkdirSync(dataRoot, { recursive: true });
export const db = new DatabaseSync(path.join(dataRoot, "arl.sqlite"));
db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
db.exec(`
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, state TEXT NOT NULL, actor TEXT NOT NULL, input TEXT, result TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS candidates (id TEXT PRIMARY KEY, hash TEXT NOT NULL, source_hash TEXT NOT NULL, snapshot TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS releases (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, path TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, object_id TEXT, result TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, actor_sub TEXT NOT NULL, role TEXT NOT NULL, csrf TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cms_user_bindings (email TEXT PRIMARY KEY, sub TEXT NOT NULL UNIQUE, bound_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cms_role_overrides (email TEXT PRIMARY KEY, editor INTEGER NOT NULL, publisher INTEGER NOT NULL, inquiries INTEGER NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL, actor TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cms_role_invites (email TEXT PRIMARY KEY, created_at TEXT NOT NULL, actor TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, request_hash TEXT, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, synced_at TEXT, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS inquiry_activities (id INTEGER PRIMARY KEY AUTOINCREMENT, inquiry_id TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', synced_at TEXT);
CREATE TABLE IF NOT EXISTS rate_events (key TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_events_key_at ON rate_events(key, at);
`);
if (!db.prepare("PRAGMA table_info(inquiries)").all().some(x => x.name === "request_hash")) db.exec("ALTER TABLE inquiries ADD COLUMN request_hash TEXT");
if (!db.prepare("PRAGMA table_info(inquiry_activities)").all().some(x => x.name === "details")) db.exec("ALTER TABLE inquiry_activities ADD COLUMN details TEXT NOT NULL DEFAULT '{}'");
if (!db.prepare("PRAGMA table_info(inquiry_activities)").all().some(x => x.name === "synced_at")) db.exec("ALTER TABLE inquiry_activities ADD COLUMN synced_at TEXT");
if (!db.prepare("PRAGMA table_info(sessions)").all().some(x => x.name === "email")) db.exec("ALTER TABLE sessions ADD COLUMN email TEXT");
db.exec("INSERT INTO inquiry_activities(inquiry_id,action,actor,at,details) SELECT id,'imported','system',created_at,'{}' FROM inquiries WHERE deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM inquiry_activities WHERE inquiry_activities.inquiry_id=inquiries.id)");
db.exec("PRAGMA synchronous=FULL");

export const now = () => new Date().toISOString();
export function audit(actor, action, objectId, result) {
  db.prepare("INSERT INTO audit(actor,action,object_id,result,at) VALUES(?,?,?,?,?)").run(actor, action, objectId || null, result, now());
}
export function setting(key) { return db.prepare("SELECT value FROM settings WHERE key=?").get(key)?.value || null; }
export function setSetting(key, value) { db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value); }
export function activeRelease() {
  const id = setting("active_release");
  return id ? db.prepare("SELECT * FROM releases WHERE id=?").get(id) : null;
}
export function rowJson(row, keys = ["input", "result", "snapshot", "payload"]) {
  if (!row) return null;
  const out = { ...row };
  for (const key of keys) if (out[key]) out[key] = JSON.parse(out[key]);
  return out;
}
