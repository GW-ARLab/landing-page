import http from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, createReadStream } from "node:fs";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { db, projectRoot, dataRoot, now, activeRelease, rowJson, audit, setting, setSetting } from "./store.mjs";
import { createCandidate, publishCandidate, rollback, sourceData } from "./pipeline.mjs";
import { hash, validateSource } from "./schema.mjs";
import { verifyGoogleIdToken, upsertInquiryToGoogle, upsertInquiryActivityToGoogle, deleteInquiryFromGoogle, deleteInquiryActivitiesFromGoogle, syncOperationsToGoogle } from "./google.mjs";
import { assignmentFor, verifiedGoogleEmail } from "./access.mjs";
import { addRoleMember, roleForEmail, roleRoster, rosterEmails, updateRoleAssignment } from "./roles.mjs";
import { canEditLocalSource, canEditGoogleMedia, canEditSource, readEditorSource, updateEditorRecord, createProduct, uploadProductImage, uploadProductVideo, readEditorImage } from "./editor.mjs";
import { driveOAuthConfigured, driveRedirectUri, beginDriveAuthorization, completeDriveAuthorization, driveConnectionStatus } from "./drive-oauth.mjs";
import { oauthSiteOrigin } from "./oauth-config.mjs";

const local = process.env.ARL_MODE !== "production";
const googleAuth = !local || process.env.ARL_AUTH_MODE === "google";
const port = Number(process.env.ARL_PORT || 8787);
const sessionCookieName = process.env.ARL_SESSION_COOKIE_NAME || "arl_session";
if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(sessionCookieName)) throw new Error("ARL_SESSION_COOKIE_NAME không hợp lệ");
const roles = JSON.parse(process.env.ARL_ROLE_MAP || "{}");
const emailRoles = JSON.parse(process.env.ARL_ROLE_EMAIL_MAP_FILE ? readFileSync(process.env.ARL_ROLE_EMAIL_MAP_FILE, "utf8") : process.env.ARL_ROLE_EMAIL_MAP || "{}");
const roleManagementEnabled = googleAuth && !Object.values(roles).some(Array.isArray) && rosterEmails(emailRoles).length > 0;
if (!local) for (const key of ["ARL_GOOGLE_CREDENTIALS", "ARL_CONTENT_SHEET_ID", "ARL_INQUIRIES_SHEET_ID", "ARL_OPERATIONS_SHEET_ID", "ARL_GOOGLE_CLIENT_ID", "ARL_SITE_URL", "ARL_BACKUP_DIR"]) if (!process.env[key]) throw new Error(`Production cần ${key}`);
if (googleAuth) for (const key of ["ARL_GOOGLE_CLIENT_ID", "ARL_SITE_URL"]) if (!process.env[key]) throw new Error(`Đăng nhập Google cần ${key}`);
if (googleAuth) oauthSiteOrigin(process.env.ARL_SITE_URL, !local);
if (googleAuth && !Object.values(roles).some(Array.isArray) && !Object.values(emailRoles).some(Array.isArray)) throw new Error("Đăng nhập Google cần danh sách ARL_ROLE_MAP hoặc ARL_ROLE_EMAIL_MAP_FILE/ARL_ROLE_EMAIL_MAP");
if (local && googleAuth && !["localhost", "127.0.0.1"].includes(new URL(process.env.ARL_SITE_URL).hostname)) throw new Error("Google login local chỉ dùng localhost hoặc 127.0.0.1");
const hierarchy = { editor: 1, publisher: 2, admin: 3 };
let running = false;
let inquirySyncLock = Promise.resolve();
const jobs = ["validate", "candidate", "publish", "sync_inquiries"];
const inquiryStatuses = new Set(["new", "in_progress", "waiting", "closed", "spam"]);
const contactConsentVersion = "contact-consent-1.3";
const contactConsentText = {
  vi: "Tôi đồng ý để ARL xử lý thông tin tôi cung cấp, gồm số điện thoại, nhằm tiếp nhận và phản hồi yêu cầu này theo Chính sách bảo vệ dữ liệu cá nhân.",
  en: "I agree to ARL processing the information I provide, including my phone number, to receive and respond to this inquiry under the Personal Data Protection Policy.",
};
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".pdf": "application/pdf", ".txt": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8" };

function json(res, status, value, headers = {}) { send(res, status, JSON.stringify(value), { "content-type": "application/json; charset=utf-8", ...headers }); }
function send(res, status, value, headers = {}) { res.writeHead(status, { "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers }); res.end(value); }
async function body(req, limit = 1_000_000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw Object.assign(new Error("Dữ liệu tải lên quá lớn"), { status: 413 }); chunks.push(chunk); }
  try { return size ? JSON.parse(Buffer.concat(chunks, size).toString("utf8")) : {}; } catch { throw Object.assign(new Error("JSON không hợp lệ"), { status: 400 }); }
}
function accessForSub(sub) {
  const direct = assignmentFor(roles, sub);
  if (direct) return direct;
  const binding = db.prepare("SELECT email FROM cms_user_bindings WHERE sub=?").get(sub);
  return roleForEmail(emailRoles, db, binding?.email);
}
function accessForGoogleClaims(claims) {
  const direct = assignmentFor(roles, claims.sub);
  if (direct) return direct;
  const email = verifiedGoogleEmail(claims);
  const planned = roleForEmail(emailRoles, db, email);
  if (!planned) return null;
  db.prepare("INSERT OR IGNORE INTO cms_user_bindings(email,sub,bound_at) VALUES(?,?,?)").run(email, claims.sub, now());
  const bound = db.prepare("SELECT sub FROM cms_user_bindings WHERE email=?").get(email);
  if (bound?.sub !== claims.sub) throw Object.assign(new Error("Email này đã gắn với một tài khoản Google khác; cần quản trị viên kiểm tra"), { status: 403 });
  return planned;
}
function sessionIdFromRequest(req) {
  return req.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(`${sessionCookieName}=`))?.slice(sessionCookieName.length + 1);
}
async function actor(req) {
  if (!googleAuth) {
    const name = req.headers["x-arl-user"];
    const role = { editor: "editor", publisher: "publisher", admin: "admin", inquiries: "inquiries" }[name];
    return role ? { sub: `local:${name}`, role, editor: name === "editor" || name === "admin", publisher: name === "publisher" || name === "admin", inquiries: name === "admin" || name === "inquiries", csrf: true } : null;
  }
  const cookie = sessionIdFromRequest(req);
  if (!cookie) return null;
  const session = db.prepare("SELECT * FROM sessions WHERE id=? AND expires_at>?").get(cookie, now());
  if (!session) return null;
  const access = accessForSub(session.actor_sub);
  return access ? { sub: session.actor_sub, email: session.email?.toLowerCase() || null, role: access.role, editor: access.can_edit, publisher: access.can_publish, inquiries: access.can_read_inquiries, csrf: req.headers["x-arl-csrf"] === session.csrf } : null;
}
function requireRole(identity, role, mutation = false) {
  if (!identity) throw Object.assign(new Error("Cần đăng nhập"), { status: 401 });
  if (role === "publisher" && !identity.publisher) throw Object.assign(new Error("Chưa được cấp quyền xuất bản"), { status: 403 });
  if (role === "inquiries" ? !identity.inquiries : (hierarchy[identity.role] || 0) < hierarchy[role]) throw Object.assign(new Error("Không đủ quyền"), { status: 403 });
  if (mutation && !identity.csrf) throw Object.assign(new Error("CSRF token không hợp lệ"), { status: 403 });
}
function requireRoleManager(identity, mutation = false) {
  requireRole(identity, "admin", mutation);
  if (!roleManagementEnabled || !identity.email || !emailRoles.admin?.includes(identity.email)) throw Object.assign(new Error("Chỉ quản trị viên trong danh sách email đã duyệt được sửa quyền"), { status: 403 });
}
function withInquirySyncLock(task) {
  const next = inquirySyncLock.then(task, task);
  inquirySyncLock = next.catch(() => {});
  return next;
}
function enqueue(kind, input, identity) {
  if (!jobs.includes(kind)) throw Object.assign(new Error("Job không hợp lệ"), { status: 400 });
  const id = randomUUID(), at = now();
  db.prepare("INSERT INTO jobs(id,kind,state,actor,input,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(id, kind, "queued", identity.sub, JSON.stringify(input || {}), at, at);
  audit(identity.sub, `job.${kind}`, id, "queued");
  queueMicrotask(processJobs);
  return { job_id: id, state: "queued" };
}
async function processJobs() {
  if (running) return;
  running = true;
  try {
    let job;
    while ((job = db.prepare("SELECT * FROM jobs WHERE state='queued' ORDER BY created_at LIMIT 1").get())) {
      db.prepare("UPDATE jobs SET state=?,updated_at=? WHERE id=?").run(job.kind === "candidate" ? "validating" : "building", now(), job.id);
      try {
        let result;
        const input = JSON.parse(job.input || "{}");
        if (job.kind === "validate") result = { errors: validateSource(await sourceData()) };
        if (job.kind === "candidate") result = await createCandidate(job.actor);
        if (job.kind === "publish") result = await publishCandidate(input.candidate_id, input.hash, job.actor);
        if (job.kind === "sync_inquiries") result = await syncInquiries();
        const failed = result?.errors?.length > 0;
        db.prepare("UPDATE jobs SET state=?,result=?,updated_at=? WHERE id=?").run(failed ? "failed" : job.kind === "candidate" ? "preview_ready" : job.kind === "publish" ? "published" : "completed", JSON.stringify(result), now(), job.id);
        audit(job.actor, `job.${job.kind}`, job.id, failed ? "validation_failed" : "ok");
        queueMicrotask(syncOperations);
      } catch (error) {
        db.prepare("UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=?").run(error.message, now(), job.id);
        audit(job.actor, `job.${job.kind}`, job.id, "failed");
        queueMicrotask(syncOperations);
      }
    }
  } finally { running = false; }
}
async function publicInquiry(input, req) {
  const allowed = new Set(["product-demo", "request-access", "product-inquiry", "product-support", "enterprise-workflow", "research-collaboration", "partnership", "general"]);
  const type = input.inquiry_type === "request-demo" ? "product-demo" : input.inquiry_type;
  const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (input.website) invalid("Yêu cầu không hợp lệ");
  if (!String(input.name || "").trim() || String(input.name).length > 200) invalid("Tên không hợp lệ");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email || "")) || String(input.email).length > 320) invalid("Email không hợp lệ");
  const phone = String(input.phone || "").trim();
  if (!phone) invalid("Cần nhập số điện thoại");
  if (!/^\+?[0-9][0-9()\s.-]{5,24}$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) invalid("Số điện thoại không hợp lệ");
  if (!allowed.has(type)) invalid("Loại yêu cầu không hợp lệ");
  if (String(input.message || "").trim().length < 10 || String(input.message).length > 10000) invalid("Lời nhắn cần 10–10000 ký tự");
  if (input.consent !== true) invalid("Cần đồng ý chính sách bảo mật");
  if (!/^[a-z0-9-]{1,80}$/.test(String(input.product_id || "")) && input.product_id) invalid("Sản phẩm không hợp lệ");
  if (!/^[a-z0-9-]{1,80}$/.test(String(input.solution_id || "")) && input.solution_id) invalid("Giải pháp không hợp lệ");
  const release = activeRelease();
  if (!release) throw Object.assign(new Error("Form chưa sẵn sàng"), { status: 503 });
  const content = JSON.parse(await readFile(path.join(release.path, "content.json"), "utf8"));
  const product = input.product_id ? content.Products?.find(x => x.product_id === input.product_id || x.slug === input.product_id) : null;
  const solution = input.solution_id ? content.Solutions?.find(x => x.solution_id === input.solution_id || x.slug === input.solution_id) : null;
  if (input.product_id && !product) invalid("Sản phẩm không tồn tại trong bản đã xuất bản");
  if (input.solution_id && !solution) invalid("Giải pháp không tồn tại trong bản đã xuất bản");
  const rateKey = createHash("sha256").update(`${req.socket.remoteAddress}|${String(input.email).toLowerCase()}`).digest("hex");
  const cutoff = Date.now() - 60000;
  db.prepare("DELETE FROM rate_events WHERE at<?").run(cutoff);
  if (db.prepare("SELECT COUNT(*) AS n FROM rate_events WHERE key=? AND at>?").get(rateKey, cutoff).n >= 5) throw Object.assign(new Error("Vui lòng thử lại sau"), { status: 429 });
  db.prepare("INSERT INTO rate_events(key,at) VALUES(?,?)").run(rateKey, Date.now());
  const locale = input.locale === "en" ? "en" : "vi";
  return { inquiry_id: randomUUID(), created_at: now(), name: String(input.name).trim(), email: String(input.email).trim(), phone, company: String(input.company || "").slice(0, 200), inquiry_type: type, product_id: product?.product_id || "", solution_id: solution?.solution_id || "", message: String(input.message).trim(), source_path: String(input.source_path || "/contact").slice(0, 300), locale, consent_at: now(), consent_version: contactConsentVersion, consent_text: contactConsentText[locale], policy_release_id: release.id, status: "new", owner: "", updated_at: now() };
}
async function syncInquiries() { return withInquirySyncLock(syncInquiriesUnlocked); }
async function syncInquiriesUnlocked() {
  const rows = db.prepare("SELECT * FROM inquiries WHERE status='pending' AND deleted_at IS NULL ORDER BY created_at LIMIT 100").all();
  const localSheet = path.join(dataRoot, "ARL_Inquiries.local.json");
  const localActivities = path.join(dataRoot, "ARL_Inquiry_Activities.local.json");
  let mock = [];
  if (local) { try { mock = JSON.parse(await readFile(localSheet, "utf8")); } catch {} }
  let synced = 0;
  for (const row of rows) {
    const inquiry = JSON.parse(row.payload);
    if (local) {
      const index = mock.findIndex(x => x.inquiry_id === row.id);
      if (index < 0) mock.push(inquiry);
      else mock[index] = inquiry;
      await writeFile(localSheet, JSON.stringify(mock, null, 2));
    } else await upsertInquiryToGoogle(inquiry);
    db.prepare("UPDATE inquiries SET status='synced',synced_at=? WHERE id=? AND payload=? AND deleted_at IS NULL").run(now(), row.id, row.payload);
    synced++;
  }
  let activities = 0;
  const pendingActivities = db.prepare("SELECT id,inquiry_id,action,actor,at,details FROM inquiry_activities WHERE synced_at IS NULL ORDER BY id LIMIT 100").all();
  let activityMock = [];
  if (local) { try { activityMock = JSON.parse(await readFile(localActivities, "utf8")); } catch {} }
  for (const activity of pendingActivities) {
    if (local) {
      if (!activityMock.some(x => x.id === activity.id)) activityMock.push(activity);
      await writeFile(localActivities, JSON.stringify(activityMock, null, 2));
    } else await upsertInquiryActivityToGoogle(activity);
    db.prepare("UPDATE inquiry_activities SET synced_at=? WHERE id=?").run(now(), activity.id);
    activities++;
  }
  return { synced, activities };
}
async function staticFile(res, file, privacy = false, req = null) {
  try {
    if (path.extname(file) === ".mp4" && req) {
      const size = (await stat(file)).size;
      const baseHeaders = { "content-type": "video/mp4", "accept-ranges": "bytes", "cache-control": privacy ? "private, no-store" : "public, max-age=300", "x-content-type-options": "nosniff" };
      const match = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
      if (req.headers.range && !match) return send(res, 416, "", { ...baseHeaders, "content-range": `bytes */${size}` });
      let start = 0, end = size - 1;
      if (match) {
        if (!match[1] && !match[2]) return send(res, 416, "", { ...baseHeaders, "content-range": `bytes */${size}` });
        start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
        end = match[2] && match[1] ? Math.min(size - 1, Number(match[2])) : size - 1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return send(res, 416, "", { ...baseHeaders, "content-range": `bytes */${size}` });
      }
      res.writeHead(match ? 206 : 200, { ...baseHeaders, "content-length": end - start + 1, ...(match ? { "content-range": `bytes ${start}-${end}/${size}` } : {}) });
      createReadStream(file, { start, end }).on("error", () => res.destroy()).pipe(res);
      return;
    }
    const bytes = await readFile(file);
    send(res, 200, bytes, { "content-type": contentTypes[path.extname(file)] || "application/octet-stream", "cache-control": privacy ? "private, no-store" : "public, max-age=300" });
  } catch { send(res, 404, "Not found"); }
}
const escapeHtml = value => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
async function renderWebsite(req, res, url, content, privacy = false) {
  const raw = url.pathname.replace(/^\/preview\/[^/]+/, "") || "/";
  const lang = /^\/en(?:\/|$)/.test(raw) ? "en" : "vi";
  const routePath = lang === "en" ? raw.slice(3) || "/" : raw;
  const redirect = (content.Redirects || []).find(x => x.from_path === routePath);
  if (redirect && !privacy) {
    if (redirect.status_code === 410) return send(res, 410, "Gone");
    if (redirect.status_code === 301) return send(res, 301, "", { location: `${lang === "en" ? "/en" : ""}${redirect.to_path}` });
  }
  const page = content.Pages?.find(x => x.route === routePath)
    || content.Products?.find(x => `/products/${x.slug}` === routePath)
    || content.Research?.find(x => `/research/${x.slug}` === routePath);
  const title = page?.[`title_${lang}`] || page?.[`name_${lang}`] || "Applied Robotics Lab";
  const description = page?.[`summary_${lang}`] || "Applied Robotics Lab";
  const base = (process.env.ARL_SITE_URL || `http://${req.headers.host}`).replace(/\/$/, "");
  const canonicalPath = `${lang === "en" ? "/en" : ""}${routePath}`;
  const canonical = `${base}${canonicalPath}`;
  const client = await readFile(path.join(projectRoot, "dist", "index.html"), "utf8");
  const { render } = await import(pathToFileURL(path.join(projectRoot, "cms-ssr", "entry-server.js")).href);
  const markup = render(routePath, url.search, lang, content, privacy ? url.pathname.split("/")[2] : undefined);
  const boot = JSON.stringify(content).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028");
  const metadata = `<meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${privacy ? "noindex,nofollow" : "index,follow"}"><link rel="canonical" href="${escapeHtml(canonical)}"><link rel="alternate" hreflang="vi" href="${escapeHtml(`${base}${routePath}`)}"><link rel="alternate" hreflang="en" href="${escapeHtml(`${base}/en${routePath}`)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">`;
  let html = client.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`).replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} | Applied Robotics Lab</title>`)
    .replace(/<meta name="description"[^>]*>/, "").replace(/<meta name="robots"[^>]*>/, "").replace(/<meta property="og:title"[^>]*>/, "").replace(/<meta property="og:description"[^>]*>/, "")
    .replace("</head>", `${metadata}<script>window.__ARL_CONTENT=${boot}</script></head>`).replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
  send(res, page ? 200 : 404, html, { "content-type": "text/html; charset=utf-8", "cache-control": privacy ? "private, no-store" : "public, max-age=60" });
}
async function sitemap(req, res) {
  const active = activeRelease();
  if (!active) return send(res, 404, "Not found");
  const content = JSON.parse(await readFile(path.join(active.path, "content.json"), "utf8"));
  const base = (process.env.ARL_SITE_URL || `http://${req.headers.host}`).replace(/\/$/, "");
  const routes = [...(content.Pages || []).map(x => x.route), ...(content.Products || []).map(x => `/products/${x.slug}`), ...(content.Research || []).map(x => `/research/${x.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.flatMap(route => [route, `/en${route}`]).map(route => `<url><loc>${escapeHtml(`${base}${route}`)}</loc></url>`).join("")}</urlset>`;
  send(res, 200, xml, { "content-type": "application/xml; charset=utf-8" });
}
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`), pathname = decodeURIComponent(url.pathname);
  if (req.method === "GET" && pathname === "/api/health") return json(res, 200, { ok: true, mode: googleAuth ? (local ? "google-local" : "production") : "local", active_release: activeRelease()?.id || null });
  if (req.method === "GET" && pathname === "/api/auth-config") {
    let driveReady = false;
    if (canEditGoogleMedia()) try { driveReady = (await driveConnectionStatus()).connected; } catch {}
    return json(res, 200, { mode: googleAuth ? (local ? "google-local" : "production") : "local", client_id: googleAuth ? process.env.ARL_GOOGLE_CLIENT_ID : null, can_edit_source: canEditSource(), can_upload_media: canEditLocalSource() || driveReady, can_edit_local_source: canEditLocalSource(), drive_oauth_configured: googleAuth && driveOAuthConfigured() });
  }
  if (req.method === "GET" && pathname === "/api/drive-oauth/callback") {
    const result = await completeDriveAuthorization({ code: url.searchParams.get("code"), state: url.searchParams.get("state"), error: url.searchParams.get("error") });
    return send(res, 303, "", { location: result.cancelled ? "/cms?drive=cancelled" : "/cms?drive=connected" });
  }
  if (req.method === "GET" && pathname === "/api/session") {
    if (!googleAuth) return json(res, 200, { mode: "local" });
    const identity = await actor(req);
    if (!identity) throw Object.assign(new Error("Cần đăng nhập"), { status: 401 });
    const cookie = sessionIdFromRequest(req);
    const session = db.prepare("SELECT csrf FROM sessions WHERE id=?").get(cookie);
    return json(res, 200, { role: identity.role, email: identity.email, csrf: session.csrf, can_edit: identity.editor, can_publish: identity.publisher, can_read_inquiries: identity.inquiries, can_manage_roles: roleManagementEnabled && identity.role === "admin" && emailRoles.admin?.includes(identity.email) });
  }
  if (req.method === "POST" && pathname === "/api/session") {
    if (!googleAuth) throw Object.assign(new Error("Chế độ thử nghiệm dùng X-ARL-User"), { status: 400 });
    if (req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    const claims = await verifyGoogleIdToken((await body(req)).id_token || "");
    const access = accessForGoogleClaims(claims);
    if (!access) throw Object.assign(new Error("Tài khoản chưa được cấp quyền"), { status: 403 });
    const email = verifiedGoogleEmail(claims);
    const id = randomUUID(), csrf = randomUUID(), expires = new Date(Date.now() + 3600000).toISOString();
    db.prepare("INSERT INTO sessions(id,actor_sub,role,csrf,expires_at,email) VALUES(?,?,?,?,?,?)").run(id, claims.sub, access.role, csrf, expires, email);
    return json(res, 200, { role: access.role, email, csrf, can_edit: access.can_edit, can_publish: access.can_publish, can_read_inquiries: access.can_read_inquiries, can_manage_roles: roleManagementEnabled && access.role === "admin" && emailRoles.admin?.includes(email) }, { "set-cookie": `${sessionCookieName}=${id}; HttpOnly; ${local ? "" : "Secure; "}SameSite=Strict; Path=/; Max-Age=3600` });
  }
  if (req.method === "POST" && pathname === "/api/logout") {
    if (!googleAuth) throw Object.assign(new Error("Chế độ thử nghiệm không dùng phiên đăng nhập"), { status: 400 });
    const identity = await actor(req);
    if (!identity || !identity.csrf || req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Phiên đăng nhập không hợp lệ"), { status: 403 });
    const cookie = sessionIdFromRequest(req);
    db.prepare("DELETE FROM sessions WHERE id=?").run(cookie);
    return json(res, 200, { ok: true }, { "set-cookie": `${sessionCookieName}=; HttpOnly; ${local ? "" : "Secure; "}SameSite=Strict; Path=/; Max-Age=0` });
  }
  if (req.method === "POST" && pathname === "/api/inquiries") {
    const input = await body(req), key = String(req.headers["idempotency-key"] || input.idempotency_key || "");
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(key)) throw Object.assign(new Error("Idempotency-Key không hợp lệ"), { status: 400 });
    const requestHash = hash(input);
    const existing = db.prepare("SELECT id,request_hash FROM inquiries WHERE idempotency_key=?").get(key);
    if (existing) return existing.request_hash === requestHash ? json(res, 200, { inquiry_id: existing.id, received: true }) : json(res, 409, { error: "Idempotency-Key đã dùng cho nội dung khác" });
    const inquiry = await publicInquiry(input, req);
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("INSERT INTO inquiries(id,idempotency_key,request_hash,payload,created_at) VALUES(?,?,?,?,?)").run(inquiry.inquiry_id, key, requestHash, JSON.stringify(inquiry), inquiry.created_at);
      db.prepare("INSERT INTO inquiry_activities(inquiry_id,action,actor,at,details) VALUES(?,?,?,?,?)").run(inquiry.inquiry_id, "created", "visitor", inquiry.created_at, "{}");
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
    queueMicrotask(() => enqueue("sync_inquiries", {}, { sub: "system" }));
    return json(res, 201, { inquiry_id: inquiry.inquiry_id, received: true });
  }
  const identity = await actor(req);
  if (req.method === "GET" && pathname === "/api/drive-oauth/status") {
    if (!googleAuth) throw Object.assign(new Error("Kết nối Drive cần đăng nhập Google thật; vai trò thử nghiệm không được phép."), { status: 403 });
    requireRole(identity, "admin");
    return json(res, 200, { ...await driveConnectionStatus(), redirect_uri: driveOAuthConfigured() ? driveRedirectUri() : null });
  }
  if (req.method === "POST" && pathname === "/api/drive-oauth/start") {
    if (!googleAuth) throw Object.assign(new Error("Kết nối Drive cần đăng nhập Google thật; vai trò thử nghiệm không được phép."), { status: 403 });
    requireRole(identity, "admin", true);
    if (req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    return json(res, 200, { authorization_url: await beginDriveAuthorization() });
  }
  if (req.method === "GET" && pathname === "/api/roles") {
    requireRoleManager(identity);
    return json(res, 200, { members: roleRoster(emailRoles, db) });
  }
  if (req.method === "POST" && pathname === "/api/roles") {
    requireRoleManager(identity, true);
    if (req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    const member = addRoleMember(emailRoles, db, await body(req), identity.sub);
    queueMicrotask(syncOperations);
    return json(res, 201, { member });
  }
  if (req.method === "PATCH" && /^\/api\/roles\/[^/]+$/.test(pathname)) {
    requireRoleManager(identity, true);
    if (req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    const email = pathname.slice("/api/roles/".length).toLowerCase(), input = await body(req);
    const member = updateRoleAssignment(emailRoles, db, email, { editor: input.editor, publisher: input.publisher, inquiries: input.inquiries }, input.expected_version, identity.sub);
    queueMicrotask(syncOperations);
    return json(res, 200, { member });
  }
  if (req.method === "GET" && pathname === "/api/content") {
    const active = activeRelease();
    if (!active) return json(res, 503, { error: "Chưa có release" });
    return staticFile(res, path.join(active.path, "content.json"));
  }
  if (req.method === "GET" && pathname === "/sitemap.xml") return sitemap(req, res);
  if (req.method === "GET" && /^\/assets\/[a-f0-9]{64}\.(jpg|png|webp|mp4|pdf)$/.test(pathname)) {
    const active = activeRelease();
    if (!active) return send(res, 404, "Not found");
    return staticFile(res, path.join(active.path, pathname.slice(1)), false, req);
  }
  if (req.method === "GET" && pathname === "/api/status") {
    requireRole(identity, "editor");
    const active = activeRelease();
    const candidate = active ? db.prepare("SELECT source_hash FROM candidates WHERE id=?").get(active.candidate_id) : null;
    let currentSourceHash = setting("last_scan_hash"), sourceError = setting("source_error");
    if (canEditLocalSource()) try { currentSourceHash = hash(await sourceData()); sourceError = ""; } catch (error) { sourceError = error.message; }
    return json(res, 200, { active_release: active?.id || null, source_hash: currentSourceHash, source_changed: Boolean(candidate && currentSourceHash && candidate.source_hash !== currentSourceHash), last_scan_at: setting("last_scan_at"), source_error: sourceError, operations_error: setting("operations_error"), jobs: db.prepare("SELECT id,kind,state,actor,error,created_at,updated_at FROM jobs ORDER BY created_at DESC LIMIT 30").all(), releases: db.prepare("SELECT id,candidate_id,hash,actor,created_at FROM releases ORDER BY created_at DESC LIMIT 30").all(), pending_inquiries: db.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status='pending' AND deleted_at IS NULL").get().n });
  }
  if (req.method === "GET" && pathname === "/api/editor/source") {
    requireRole(identity, "editor");
    return json(res, 200, await readEditorSource());
  }
  if (req.method === "GET" && pathname.startsWith("/api/editor/media/")) {
    requireRole(identity, "editor");
    const bytes = await readEditorImage(pathname.slice("/api/editor/media/".length));
    return send(res, 200, bytes, { "content-type": "image/webp", "cache-control": "private, no-store" });
  }
  if (req.method === "PATCH" && pathname === "/api/editor/record") {
    requireRole(identity, "editor", true);
    if (!identity.editor) throw Object.assign(new Error("Chỉ người biên tập hoặc quản trị được sửa nội dung"), { status: 403 });
    if (googleAuth && req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    const input = await body(req);
    const result = await updateEditorRecord(input);
    audit(identity.sub, "content.edit", `${input.collection}:${input.id}`, "saved");
    setSetting("last_scan_hash", result.source_hash);
    setSetting("last_scan_at", now());
    setSetting("source_error", "");
    queueMicrotask(syncOperations);
    return json(res, 200, result);
  }
  if (req.method === "POST" && pathname === "/api/editor/products") {
    requireRole(identity, "editor", true);
    if (!identity.editor) throw Object.assign(new Error("Chỉ người biên tập hoặc quản trị được tạo sản phẩm"), { status: 403 });
    if (googleAuth && req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    const input = await body(req, 15_000_000);
    const result = await createProduct(input);
    audit(identity.sub, "product.create", result.product.product_id, "saved");
    setSetting("last_scan_hash", result.source_hash);
    setSetting("last_scan_at", now());
    setSetting("source_error", "");
    queueMicrotask(syncOperations);
    return json(res, 201, result);
  }
  if (req.method === "POST" && pathname === "/api/editor/product-image") {
    requireRole(identity, "editor", true);
    if (!identity.editor) throw Object.assign(new Error("Chỉ người biên tập hoặc quản trị được tải ảnh"), { status: 403 });
    if (googleAuth && req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    const input = await body(req, 15_000_000);
    const result = await uploadProductImage(input);
    audit(identity.sub, "product.image", input.product_id, "saved");
    setSetting("last_scan_hash", result.source_hash);
    setSetting("last_scan_at", now());
    setSetting("source_error", "");
    queueMicrotask(syncOperations);
    return json(res, 200, result);
  }
  if (req.method === "POST" && pathname === "/api/editor/product-video") {
    requireRole(identity, "editor", true);
    if (!identity.editor) throw Object.assign(new Error("Chỉ người biên tập hoặc quản trị được tải video"), { status: 403 });
    if (googleAuth && req.headers.origin !== new URL(process.env.ARL_SITE_URL).origin) throw Object.assign(new Error("Origin không hợp lệ"), { status: 403 });
    const input = await body(req, 35_000_000);
    const result = await uploadProductVideo(input);
    audit(identity.sub, "product.video", input.product_id, "saved");
    setSetting("last_scan_hash", result.source_hash);
    setSetting("last_scan_at", now());
    setSetting("source_error", "");
    queueMicrotask(syncOperations);
    return json(res, 200, result);
  }
  if (req.method === "GET" && pathname.startsWith("/api/jobs/")) {
    requireRole(identity, "editor");
    const job = rowJson(db.prepare("SELECT * FROM jobs WHERE id=?").get(pathname.split("/").pop()));
    return job ? json(res, 200, job) : json(res, 404, { error: "Job không tồn tại" });
  }
  if (req.method === "GET" && pathname.startsWith("/api/candidates/")) {
    if (googleAuth) requireRole(identity, "editor");
    const parts = pathname.split("/"), candidate = db.prepare("SELECT * FROM candidates WHERE id=?").get(parts[3]);
    if (!candidate || candidate.expires_at <= now()) return json(res, 404, { error: "Candidate không tồn tại" });
    if (parts[4] === "assets" && /^[a-f0-9]{64}\.(jpg|png|webp|mp4|pdf)$/.test(parts[5] || "")) return staticFile(res, path.join(dataRoot, "candidates", candidate.id, "assets", parts[5]), true, req);
    return json(res, 200, { id: candidate.id, hash: candidate.hash, source_hash: candidate.source_hash, created_at: candidate.created_at, expires_at: candidate.expires_at, content: JSON.parse(candidate.snapshot) });
  }
  if (req.method === "POST" && pathname === "/api/validate") { requireRole(identity, "editor", true); return json(res, 202, enqueue("validate", {}, identity)); }
  if (req.method === "POST" && pathname === "/api/candidates") { requireRole(identity, "editor", true); return json(res, 202, enqueue("candidate", {}, identity)); }
  if (req.method === "POST" && pathname === "/api/publish") { requireRole(identity, "publisher", true); const input = await body(req); return json(res, 202, enqueue("publish", input, identity)); }
  if (req.method === "POST" && pathname === "/api/rollback") { requireRole(identity, "publisher", true); const input = await body(req); return json(res, 200, rollback(input.release_id, identity.sub)); }
  if (req.method === "POST" && pathname === "/api/sync-inquiries") { requireRole(identity, "admin", true); return json(res, 202, enqueue("sync_inquiries", {}, identity)); }
  if (req.method === "GET" && pathname === "/api/inquiries") {
    requireRole(identity, "inquiries");
    const filter = url.searchParams.get("status") || "all";
    if (filter !== "all" && !inquiryStatuses.has(filter)) throw Object.assign(new Error("Bộ lọc trạng thái không hợp lệ"), { status: 400 });
    const rows = db.prepare("SELECT id,status,payload,created_at,synced_at FROM inquiries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 500").all();
    const items = rows.map(row => {
      const inquiry = JSON.parse(row.payload);
      return { inquiry_id: row.id, created_at: row.created_at, name: inquiry.name, email: inquiry.email, phone: inquiry.phone || "", company: inquiry.company, inquiry_type: inquiry.inquiry_type, status: inquiry.status || "new", owner: inquiry.owner || "", delivery_status: row.status, synced_at: row.synced_at };
    }).filter(item => filter === "all" || item.status === filter).slice(0, 100);
    return json(res, 200, { items, total: items.length });
  }
  if (req.method === "GET" && /^\/api\/inquiries\/[^/]+$/.test(pathname)) {
    requireRole(identity, "inquiries");
    const id = pathname.split("/").pop();
    const row = db.prepare("SELECT id,status,payload,created_at,synced_at FROM inquiries WHERE id=? AND deleted_at IS NULL").get(id);
    if (!row) return json(res, 404, { error: "Yêu cầu không tồn tại" });
    const activities = db.prepare("SELECT id,action,actor,at,details FROM inquiry_activities WHERE inquiry_id=? ORDER BY id").all(id).map(item => ({ ...item, details: JSON.parse(item.details || "{}") }));
    return json(res, 200, { ...JSON.parse(row.payload), delivery_status: row.status, synced_at: row.synced_at, activities });
  }
  if (req.method === "PATCH" && /^\/api\/inquiries\/[^/]+$/.test(pathname)) {
    requireRole(identity, "inquiries", true);
    const id = pathname.split("/").pop(), changes = await body(req);
    const has = key => Object.prototype.hasOwnProperty.call(changes, key);
    if (!has("status") && !has("owner") && !has("note")) throw Object.assign(new Error("Chưa có thay đổi"), { status: 400 });
    if (has("status") && !inquiryStatuses.has(changes.status)) throw Object.assign(new Error("Trạng thái không hợp lệ"), { status: 400 });
    if (has("owner") && (typeof changes.owner !== "string" || changes.owner.length > 120)) throw Object.assign(new Error("Người phụ trách không hợp lệ"), { status: 400 });
    if (has("note") && (typeof changes.note !== "string" || !changes.note.trim() || changes.note.length > 2000)) throw Object.assign(new Error("Ghi chú cần từ 1–2000 ký tự"), { status: 400 });
    const row = db.prepare("SELECT payload FROM inquiries WHERE id=? AND deleted_at IS NULL").get(id);
    if (!row) return json(res, 404, { error: "Yêu cầu không tồn tại" });
    const inquiry = JSON.parse(row.payload), details = {};
    if (has("status") && changes.status !== inquiry.status) { details.status = { from: inquiry.status || "new", to: changes.status }; inquiry.status = changes.status; }
    if (has("owner") && changes.owner.trim() !== (inquiry.owner || "")) { details.owner = { from: inquiry.owner || "", to: changes.owner.trim() }; inquiry.owner = changes.owner.trim(); }
    if (has("note")) details.note = changes.note.trim();
    if (!Object.keys(details).length) return json(res, 200, { updated: false, inquiry_id: id });
    inquiry.updated_at = now();
    db.exec("BEGIN IMMEDIATE");
    try {
      if (details.status || details.owner) db.prepare("UPDATE inquiries SET payload=?,status='pending' WHERE id=?").run(JSON.stringify(inquiry), id);
      db.prepare("INSERT INTO inquiry_activities(inquiry_id,action,actor,at,details) VALUES(?,?,?,?,?)").run(id, "updated", identity.sub, inquiry.updated_at, JSON.stringify(details));
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
    audit(identity.sub, "inquiry.update", id, "ok");
    queueMicrotask(() => enqueue("sync_inquiries", {}, { sub: "system" }));
    return json(res, 200, { updated: true, inquiry_id: id, status: inquiry.status, owner: inquiry.owner, updated_at: inquiry.updated_at });
  }
  if (req.method === "DELETE" && pathname.startsWith("/api/inquiries/")) {
    requireRole(identity, "admin", true);
    const id = pathname.split("/").pop();
    return withInquirySyncLock(async () => {
      const row = db.prepare("SELECT id FROM inquiries WHERE id=? AND deleted_at IS NULL").get(id);
      if (!row) return json(res, 404, { error: "Yêu cầu không tồn tại" });
      if (local) {
        const file = path.join(dataRoot, "ARL_Inquiries.local.json");
        try { const rows = JSON.parse(await readFile(file, "utf8")); await writeFile(file, JSON.stringify(rows.filter(x => x.inquiry_id !== id), null, 2)); } catch (error) { if (error.code !== "ENOENT") throw error; }
        const activitiesFile = path.join(dataRoot, "ARL_Inquiry_Activities.local.json");
        try { const rows = JSON.parse(await readFile(activitiesFile, "utf8")); await writeFile(activitiesFile, JSON.stringify(rows.filter(x => x.inquiry_id !== id), null, 2)); } catch (error) { if (error.code !== "ENOENT") throw error; }
      } else { await deleteInquiryActivitiesFromGoogle(id); await deleteInquiryFromGoogle(id); }
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("DELETE FROM inquiry_activities WHERE inquiry_id=?").run(id);
        db.prepare("UPDATE inquiries SET payload='{}',status='deleted',deleted_at=? WHERE id=?").run(now(), id);
        audit(identity.sub, "inquiry.delete", id, "ok");
        db.exec("COMMIT");
      } catch (error) { db.exec("ROLLBACK"); throw error; }
      return json(res, 200, { deleted: true });
    });
  }
  if (req.method === "GET" && pathname === "/cms") return staticFile(res, path.join(projectRoot, "cms", "panel.html"), true);
  if (req.method === "GET" && pathname.startsWith("/preview/")) {
    if (googleAuth) requireRole(identity, "editor");
    const candidateId = pathname.split("/")[2];
    const candidate = db.prepare("SELECT * FROM candidates WHERE id=? AND expires_at>?").get(candidateId, now());
    if (!candidate) return send(res, 404, "Candidate not found");
    return renderWebsite(req, res, url, JSON.parse(candidate.snapshot), true);
  }
  if (req.method === "GET") {
    const dist = path.join(projectRoot, "dist"), file = path.resolve(dist, `.${pathname}`);
    if (file.startsWith(dist + path.sep) && path.extname(file)) return staticFile(res, file);
    const active = activeRelease();
    if (!active) return staticFile(res, path.join(dist, "index.html"));
    const content = JSON.parse(await readFile(path.join(active.path, "content.json"), "utf8"));
    return renderWebsite(req, res, url, content);
  }
  send(res, 404, "Not found");
}

db.prepare("UPDATE jobs SET state='queued',updated_at=? WHERE state IN ('validating','building')").run(now());
const server = http.createServer((req, res) => route(req, res).catch(error => {
  json(res, error.status || 500, { error: error.message, ...(error.details ? { details: error.details } : {}) });
}));
const host = process.env.ARL_HOST || "127.0.0.1";
if (local && !googleAuth && !["localhost", "127.0.0.1"].includes(host)) throw new Error("Vai trò giả lập chỉ được chạy trên localhost hoặc 127.0.0.1");
server.listen(port, host, () => { console.log(`ARL CMS (${googleAuth ? (local ? "google-local" : "production") : "local"}) http://${host}:${port}`); processJobs(); });
async function scanSource() {
  try { setSetting("last_scan_hash", hash(await sourceData())); setSetting("source_error", ""); }
  catch (error) { setSetting("source_error", error.message); }
  setSetting("last_scan_at", now());
}
function retryPendingInquiries() {
  const pending = db.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status='pending' AND deleted_at IS NULL").get().n;
  const pendingActivities = db.prepare("SELECT COUNT(*) AS n FROM inquiry_activities WHERE synced_at IS NULL").get().n;
  const queued = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE kind='sync_inquiries' AND state IN ('queued','building')").get().n;
  if ((pending || pendingActivities) && !queued) enqueue("sync_inquiries", {}, { sub: "system" });
}
async function syncOperations() {
  const allJobs = db.prepare("SELECT id,kind,state,actor,error,created_at,updated_at,result FROM jobs ORDER BY created_at").all();
  const tables = {
    Jobs: allJobs.map(({ result, ...row }) => row),
    Validation_Errors: allJobs.flatMap(job => {
      try { return (JSON.parse(job.result || "{}").errors || []).map((error, index) => ({ id: `${job.id}:${index}`, job_id: job.id, ...error })); } catch { return []; }
    }),
    Releases: db.prepare("SELECT id,candidate_id,hash,actor,created_at FROM releases ORDER BY created_at").all(),
    Audit_Events: db.prepare("SELECT id,actor,action,object_id,result,at FROM audit ORDER BY id").all(),
  };
  try {
    if (local) await writeFile(path.join(dataRoot, "ARL_Operations.local.json"), JSON.stringify(tables, null, 2));
    else await syncOperationsToGoogle(tables);
    setSetting("operations_error", "");
  } catch (error) { setSetting("operations_error", error.message); }
}
scanSource();
retryPendingInquiries();
syncOperations();
setInterval(scanSource, 5 * 60_000);
setInterval(retryPendingInquiries, 60_000);
setInterval(syncOperations, 5 * 60_000);
