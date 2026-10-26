import { randomBytes } from "node:crypto";
import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./store.mjs";
import { verifyGoogleIdToken } from "./google.mjs";
import { oauthSiteOrigin } from "./oauth-config.mjs";

const driveScope = "https://www.googleapis.com/auth/drive.file";
const pending = new Map();
let tokenCache = null;

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const withinProject = filename => filename === projectRoot || filename.startsWith(`${projectRoot}${path.sep}`);

export function driveOAuthConfigured() {
  return Boolean(process.env.ARL_DRIVE_OAUTH_CLIENT_FILE && process.env.ARL_DRIVE_TOKEN_FILE && process.env.ARL_DRIVE_OWNER_EMAIL && process.env.ARL_SITE_URL);
}

function paths() {
  if (!driveOAuthConfigured()) fail(501, "OAuth Drive chưa được cấu hình trên máy chủ.");
  const clientFile = path.resolve(process.env.ARL_DRIVE_OAUTH_CLIENT_FILE);
  const tokenFile = path.resolve(process.env.ARL_DRIVE_TOKEN_FILE);
  if (!path.isAbsolute(process.env.ARL_DRIVE_OAUTH_CLIENT_FILE) || !path.isAbsolute(process.env.ARL_DRIVE_TOKEN_FILE) || withinProject(clientFile) || withinProject(tokenFile) || clientFile === tokenFile) fail(500, "File OAuth và token phải là hai đường dẫn tuyệt đối khác nhau, nằm ngoài dự án.");
  return { clientFile, tokenFile };
}

export function driveRedirectUri() {
  let origin;
  try { origin = oauthSiteOrigin(process.env.ARL_SITE_URL, process.env.ARL_MODE === "production"); }
  catch (error) { fail(500, error.message); }
  return `${origin}/api/drive-oauth/callback`;
}

async function client() {
  const { clientFile } = paths();
  let parsed;
  try { parsed = JSON.parse(await readFile(clientFile, "utf8")); }
  catch { fail(500, "Không đọc được file OAuth Drive; kiểm tra đường dẫn và định dạng JSON."); }
  const web = parsed?.web;
  if (!web?.client_id || !web?.client_secret) fail(500, "File OAuth Drive phải là Web application và có Client ID/secret.");
  if (web.client_id === process.env.ARL_GOOGLE_CLIENT_ID) fail(500, "OAuth Drive phải dùng client khác Google Sign-In CMS.");
  return web;
}

export async function beginDriveAuthorization() {
  const web = await client();
  const redirect = driveRedirectUri();
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const expires = Date.now() + 10 * 60_000;
  for (const [key, value] of pending) if (value.expires < Date.now()) pending.delete(key);
  pending.set(state, { nonce, expires });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: web.client_id, redirect_uri: redirect, response_type: "code", scope: `openid email ${driveScope}`, access_type: "offline", prompt: "consent", state, nonce, login_hint: process.env.ARL_DRIVE_OWNER_EMAIL }).toString();
  return url.toString();
}

async function saveToken(token) {
  const { tokenFile } = paths();
  const temporary = `${tokenFile}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(token), { mode: 0o600, flag: "wx" });
    await rename(temporary, tokenFile);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

export async function completeDriveAuthorization({ code, state, error }) {
  const attempt = pending.get(state);
  pending.delete(state);
  if (!attempt || attempt.expires < Date.now()) fail(400, "Phiên cấp quyền Drive đã hết hạn. Hãy bắt đầu lại trong CMS.");
  if (error === "access_denied") return { cancelled: true };
  if (error) fail(400, "Google chưa cấp quyền Drive. Hãy thử lại nếu bạn muốn kết nối.");
  if (!code || typeof code !== "string") fail(400, "Google không trả về mã cấp quyền hợp lệ.");
  const web = await client();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: web.client_id, client_secret: web.client_secret, redirect_uri: driveRedirectUri(), grant_type: "authorization_code" }) });
  if (!response.ok) fail(502, `Google không xác nhận được cấp quyền Drive (${response.status}).`);
  const token = await response.json();
  const scopes = new Set(String(token.scope || "").split(" "));
  if (!scopes.has(driveScope) || !token.refresh_token || !token.id_token) fail(403, "Chưa nhận đủ quyền Drive, danh tính Google hoặc refresh token.");
  const claims = await verifyGoogleIdToken(token.id_token, web.client_id);
  const email = String(claims.email || "").toLowerCase();
  if (!claims.email_verified || email !== process.env.ARL_DRIVE_OWNER_EMAIL.toLowerCase() || claims.nonce !== attempt.nonce) fail(403, "Chỉ tài khoản Google chủ sở hữu đã chỉ định mới được kết nối Drive.");
  await saveToken({ email, client_id: web.client_id, refresh_token: token.refresh_token, scope: driveScope, connected_at: new Date().toISOString() });
  tokenCache = { value: token.access_token, expires: Date.now() + Number(token.expires_in || 3600) * 1000 };
  return { email };
}

export async function driveConnectionStatus() {
  if (!driveOAuthConfigured()) return { configured: false, connected: false };
  try {
    const { tokenFile } = paths();
    const token = JSON.parse(await readFile(tokenFile, "utf8"));
    const web = await client();
    return { configured: true, connected: Boolean(token.refresh_token && token.client_id === web.client_id && token.email === process.env.ARL_DRIVE_OWNER_EMAIL.toLowerCase()), email: token.email || null, connected_at: token.connected_at || null };
  } catch (error) {
    if (error.code === "ENOENT") return { configured: true, connected: false };
    fail(500, "Không đọc được trạng thái kết nối Drive.");
  }
}

export async function driveAccessToken() {
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) return tokenCache.value;
  const web = await client();
  const { tokenFile } = paths();
  let saved;
  try { saved = JSON.parse(await readFile(tokenFile, "utf8")); }
  catch { fail(501, "Drive chưa được Zally cấp quyền trong CMS."); }
  if (!saved.refresh_token || saved.client_id !== web.client_id || saved.email !== process.env.ARL_DRIVE_OWNER_EMAIL.toLowerCase() || saved.scope !== driveScope) fail(403, "Token Drive không khớp client, tài khoản hoặc phạm vi đã cấu hình.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: web.client_id, client_secret: web.client_secret, refresh_token: saved.refresh_token, grant_type: "refresh_token" }) });
  if (!response.ok) fail(503, `Không thể làm mới quyền Drive (${response.status}); Zally có thể cần kết nối lại.`);
  const token = await response.json();
  if (!token.access_token) fail(503, "Google không cấp access token Drive.");
  tokenCache = { value: token.access_token, expires: Date.now() + Number(token.expires_in || 3600) * 1000 };
  return tokenCache.value;
}
