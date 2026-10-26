import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";
import net from "node:net";

const root = path.resolve(import.meta.dirname, "..", "..");

async function freePort() {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

test("Google login local không cho header vai trò giả lập vượt quyền", { timeout: 30000 }, async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "arl-google-local-test-"));
  const sourcePath = path.join(temp, "content.json");
  await writeFile(sourcePath, await readFile(path.join(root, "cms", "local", "ARL_Content.json")));
  const port = await freePort();
  const server = spawn(process.execPath, [path.join(root, "cms", "server.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      ARL_MODE: "local",
      ARL_AUTH_MODE: "google",
      ARL_HOST: "127.0.0.1",
      ARL_PORT: String(port),
      ARL_SITE_URL: `http://localhost:${port}`,
      ARL_GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
      ARL_ROLE_MAP: "{}",
      ARL_ROLE_EMAIL_MAP: JSON.stringify({ editor: ["editor@gmail.com", "dual@gmail.com"], publisher: ["publisher@gmail.com", "dual@gmail.com"], admin: ["danh@gmail.com"], inquiries: ["danh@gmail.com"] }),
      ARL_ROLE_EMAIL_MAP_FILE: "",
      ARL_DATA_DIR: temp,
      ARL_LOCAL_CONTENT_PATH: sourcePath,
    },
    stdio: "pipe",
  });
  let serverOutput = "";
  server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
  server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { ready = (await fetch(`${base}/api/health`)).ok; if (ready) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(ready, true, `Server Google-local không khởi động (exit=${server.exitCode})\n${serverOutput}`);
    const config = await (await fetch(`${base}/api/auth-config`)).json();
    assert.equal(config.mode, "google-local");
    assert.equal(config.client_id, "test-client.apps.googleusercontent.com");
    assert.equal((await fetch(`${base}/api/session`)).status, 401);
    const fakeRole = { "x-arl-user": "admin" };
    assert.equal((await fetch(`${base}/api/status`, { headers: fakeRole })).status, 401);
    assert.equal((await fetch(`${base}/api/inquiries`, { headers: fakeRole })).status, 401);
    assert.equal((await fetch(`${base}/api/candidates`, { method: "POST", headers: fakeRole })).status, 401);

    const database = new DatabaseSync(path.join(temp, "arl.sqlite"));
    const expires = new Date(Date.now() + 60_000).toISOString();
    for (const [email, sub, cookie] of [["dual@gmail.com", "dual-sub", "dual-session"], ["publisher@gmail.com", "publisher-sub", "publisher-session"], ["editor@gmail.com", "editor-sub", "editor-session"], ["danh@gmail.com", "admin-sub", "admin-session"]]) {
      database.prepare("INSERT INTO cms_user_bindings(email,sub,bound_at) VALUES(?,?,?)").run(email, sub, new Date().toISOString());
      database.prepare("INSERT INTO sessions(id,actor_sub,role,csrf,expires_at,email) VALUES(?,?,?,?,?,?)").run(cookie, sub, email === "danh@gmail.com" ? "admin" : "publisher", "test-csrf", expires, email);
    }
    database.close();
    const dualHeaders = { cookie: "arl_session=dual-session", "x-arl-csrf": "test-csrf", origin: `http://localhost:${port}`, "content-type": "application/json" };
    const publisherHeaders = { ...dualHeaders, cookie: "arl_session=publisher-session" };
    const dualSession = await (await fetch(`${base}/api/session`, { headers: dualHeaders })).json();
    assert.equal(dualSession.role, "publisher");
    assert.equal(dualSession.can_edit, true);
    assert.equal(dualSession.can_publish, true);
    const publisherSession = await (await fetch(`${base}/api/session`, { headers: publisherHeaders })).json();
    assert.equal(publisherSession.can_edit, false);
    const source = await (await fetch(`${base}/api/editor/source`, { headers: dualHeaders })).json();
    const product = source.source.Products[0];
    const edit = { collection: "Products", id: product.product_id, expected_hash: source.source_hash, values: { summary_en: `${product.summary_en} Dual-role test.` } };
    assert.equal((await fetch(`${base}/api/editor/record`, { method: "PATCH", headers: publisherHeaders, body: JSON.stringify(edit) })).status, 403);
    assert.equal((await fetch(`${base}/api/editor/record`, { method: "PATCH", headers: dualHeaders, body: JSON.stringify(edit) })).status, 200);

    const adminHeaders = { ...dualHeaders, cookie: "arl_session=admin-session" };
    const editorHeaders = { ...dualHeaders, cookie: "arl_session=editor-session" };
    assert.equal((await fetch(`${base}/api/drive-oauth/status`, { headers: editorHeaders })).status, 403);
    assert.equal((await fetch(`${base}/api/drive-oauth/status`, { headers: adminHeaders })).status, 200);
    assert.equal((await fetch(`${base}/api/drive-oauth/start`, { method: "POST", headers: editorHeaders })).status, 403);
    assert.equal((await fetch(`${base}/api/drive-oauth/start`, { method: "POST", headers: adminHeaders })).status, 501);
    assert.equal((await fetch(`${base}/api/roles`, { headers: publisherHeaders })).status, 403);
    assert.equal((await fetch(`${base}/api/roles`, { headers: fakeRole })).status, 401);
    const adminSession = await (await fetch(`${base}/api/session`, { headers: adminHeaders })).json();
    assert.equal(adminSession.can_manage_roles, true);
    assert.equal(adminSession.can_publish, true, "quản trị viên được duyệt đăng dù không nằm riêng trong nhóm publisher");
    const roster = await (await fetch(`${base}/api/roles`, { headers: adminHeaders })).json();
    const editorMember = roster.members.find(member => member.email === "editor@gmail.com");
    assert.equal(editorMember.editor, true);
    assert.equal(editorMember.version, 0);
    const addEndpoint = `${base}/api/roles`;
    const addMember = { email: "  New.Member@gmail.com  ", editor: true, publisher: false, inquiries: false };
    assert.equal((await fetch(addEndpoint, { method: "POST", headers: publisherHeaders, body: JSON.stringify(addMember) })).status, 403);
    assert.equal((await fetch(addEndpoint, { method: "POST", headers: { ...adminHeaders, "x-arl-csrf": "wrong" }, body: JSON.stringify(addMember) })).status, 403);
    assert.equal((await fetch(addEndpoint, { method: "POST", headers: { ...adminHeaders, origin: "http://evil.test" }, body: JSON.stringify(addMember) })).status, 403);
    assert.equal((await fetch(addEndpoint, { method: "POST", headers: adminHeaders, body: JSON.stringify({ ...addMember, admin: true }) })).status, 400);
    assert.equal((await fetch(addEndpoint, { method: "POST", headers: adminHeaders, body: JSON.stringify({ ...addMember, editor: false }) })).status, 400);
    assert.equal((await fetch(addEndpoint, { method: "POST", headers: adminHeaders, body: JSON.stringify({ ...addMember, email: "bad-email" }) })).status, 400);
    const addedResponse = await fetch(addEndpoint, { method: "POST", headers: adminHeaders, body: JSON.stringify(addMember) });
    assert.equal(addedResponse.status, 201);
    const added = (await addedResponse.json()).member;
    assert.equal(added.email, "new.member@gmail.com");
    assert.equal(added.editor, true);
    assert.equal(added.admin, false);
    assert.equal((await fetch(addEndpoint, { method: "POST", headers: adminHeaders, body: JSON.stringify(addMember) })).status, 409);
    const newEmail = "new.member@gmail.com", newSub = "new-member-sub";
    const newDatabase = new DatabaseSync(path.join(temp, "arl.sqlite"));
    newDatabase.prepare("INSERT INTO cms_user_bindings(email,sub,bound_at) VALUES(?,?,?)").run(newEmail, newSub, new Date().toISOString());
    newDatabase.prepare("INSERT INTO sessions(id,actor_sub,role,csrf,expires_at,email) VALUES(?,?,?,?,?,?)").run("new-member-session", newSub, "editor", "test-csrf", expires, newEmail);
    newDatabase.close();
    const newHeaders = { ...adminHeaders, cookie: "arl_session=new-member-session" };
    assert.equal((await (await fetch(`${base}/api/session`, { headers: newHeaders })).json()).can_edit, true);
    assert.equal((await fetch(`${base}/api/roles`, { headers: newHeaders })).status, 403);
    const newChange = { editor: false, publisher: true, inquiries: false, expected_version: 1 };
    assert.equal((await fetch(`${base}/api/roles/${encodeURIComponent(newEmail)}`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify(newChange) })).status, 200);
    const newSessionAfter = await (await fetch(`${base}/api/session`, { headers: newHeaders })).json();
    assert.equal(newSessionAfter.can_edit, false);
    assert.equal(newSessionAfter.can_publish, true);
    assert.equal((await fetch(`${base}/api/roles/${encodeURIComponent(newEmail)}`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ editor: false, publisher: false, inquiries: false, expected_version: 2 }) })).status, 200);
    assert.equal((await fetch(`${base}/api/session`, { headers: newHeaders })).status, 401, "bỏ cả ba quyền phải thu hồi truy cập ngay");
    const update = { editor: false, publisher: true, inquiries: false, expected_version: 0 };
    const endpoint = `${base}/api/roles/editor%40gmail.com`;
    assert.equal((await fetch(endpoint, { method: "PATCH", headers: { ...adminHeaders, "x-arl-csrf": "wrong" }, body: JSON.stringify(update) })).status, 403);
    assert.equal((await fetch(endpoint, { method: "PATCH", headers: { ...adminHeaders, origin: "http://evil.test" }, body: JSON.stringify(update) })).status, 403);
    assert.equal((await fetch(endpoint, { method: "PATCH", headers: editorHeaders, body: JSON.stringify(update) })).status, 403);
    assert.equal((await fetch(`${base}/api/roles/danh%40gmail.com`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify(update) })).status, 403);
    assert.equal((await fetch(endpoint, { method: "PATCH", headers: adminHeaders, body: JSON.stringify(update) })).status, 200);
    assert.equal((await fetch(endpoint, { method: "PATCH", headers: adminHeaders, body: JSON.stringify(update) })).status, 409);
    const changedSession = await (await fetch(`${base}/api/session`, { headers: editorHeaders })).json();
    assert.equal(changedSession.role, "publisher");
    assert.equal(changedSession.can_edit, false);
    assert.equal((await fetch(`${base}/api/editor/record`, { method: "PATCH", headers: editorHeaders, body: JSON.stringify(edit) })).status, 403);
    const saved = new DatabaseSync(path.join(temp, "arl.sqlite"));
    assert.equal(saved.prepare("SELECT version,publisher FROM cms_role_overrides WHERE email=?").get("editor@gmail.com").version, 1);
    assert.equal(saved.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='roles.update'").get().n, 3);
    assert.equal(saved.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='roles.add'").get().n, 1);
    saved.close();
  } finally {
    server.kill();
    await new Promise(resolve => server.once("exit", resolve));
    await rm(temp, { recursive: true, force: true });
  }
});
