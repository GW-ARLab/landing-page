import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createSign, generateKeyPairSync } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("Drive OAuth riêng chỉ lưu token của chủ sở hữu và tải ảnh vào folder của app", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "arl-drive-oauth-test-"));
  const previous = Object.fromEntries(["ARL_DATA_DIR", "ARL_DRIVE_OAUTH_CLIENT_FILE", "ARL_DRIVE_TOKEN_FILE", "ARL_DRIVE_OWNER_EMAIL", "ARL_SITE_URL", "ARL_GOOGLE_CLIENT_ID", "ARL_DRIVE_MEDIA_WRITE_ENABLED", "ARL_MODE"].map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  let database;
  try {
    process.env.ARL_DATA_DIR = path.join(directory, "state");
    process.env.ARL_DRIVE_OAUTH_CLIENT_FILE = path.join(directory, "client.json");
    process.env.ARL_DRIVE_TOKEN_FILE = path.join(directory, "drive-token.json");
    process.env.ARL_DRIVE_OWNER_EMAIL = "zally.aihoc@gmail.com";
    process.env.ARL_SITE_URL = "http://localhost:8791";
    process.env.ARL_GOOGLE_CLIENT_ID = "cms-signin.apps.googleusercontent.com";
    process.env.ARL_DRIVE_MEDIA_WRITE_ENABLED = "true";
    process.env.ARL_MODE = "local";
    await writeFile(process.env.ARL_DRIVE_OAUTH_CLIENT_FILE, JSON.stringify({ web: { client_id: "drive-test.apps.googleusercontent.com", client_secret: "fake-test-secret" } }));
    const oauth = await import("../drive-oauth.mjs");
    const media = await import("../drive-media.mjs");
    database = (await import("../store.mjs")).db;
    assert.equal(oauth.driveRedirectUri(), "http://localhost:8791/api/drive-oauth/callback");
    assert.deepEqual(await oauth.driveConnectionStatus(), { configured: true, connected: false });
    const start = new URL(await oauth.beginDriveAuthorization());
    assert.equal(start.searchParams.get("client_id"), "drive-test.apps.googleusercontent.com");
    assert.equal(start.searchParams.get("redirect_uri"), oauth.driveRedirectUri());
    assert.equal(start.searchParams.get("scope"), "openid email https://www.googleapis.com/auth/drive.file");
    assert.equal(start.searchParams.get("access_type"), "offline");
    await assert.rejects(oauth.completeDriveAuthorization({ code: "no", state: "wrong" }), /hết hạn/);
    const cancelledStart = new URL(await oauth.beginDriveAuthorization());
    assert.deepEqual(await oauth.completeDriveAuthorization({ state: cancelledStart.searchParams.get("state"), error: "access_denied" }), { cancelled: true });
    assert.deepEqual(await oauth.driveConnectionStatus(), { configured: true, connected: false });

    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
    const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
    const jwtBody = `${encode({ alg: "RS256", kid: "test-key" })}.${encode({ iss: "https://accounts.google.com", aud: "drive-test.apps.googleusercontent.com", exp: Math.floor(Date.now() / 1000) + 3600, sub: "zally-sub", email: "zally.aihoc@gmail.com", email_verified: true, nonce: start.searchParams.get("nonce") })}`;
    const signer = createSign("RSA-SHA256"); signer.update(jwtBody); signer.end();
    const idToken = `${jwtBody}.${signer.sign(privateKey).toString("base64url")}`;
    const bytes = Buffer.from("test-image-bytes");
    const filename = `${createHash("sha256").update(bytes).digest("hex")}.webp`;
    const videoBytes = Buffer.from("0000ftypisom0000moov");
    const videoFilename = `${createHash("sha256").update(videoBytes).digest("hex")}.mp4`;
    const requests = [];
    global.fetch = async (input, options = {}) => {
      const url = String(input), method = options.method || "GET";
      requests.push([method, url]);
      if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "fake-access", refresh_token: "fake-refresh", id_token: idToken, scope: "openid email https://www.googleapis.com/auth/drive.file", expires_in: 3600 });
      if (url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [jwk] });
      if (url === "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType" && method === "POST") return Response.json({ id: "test-folder-id", name: "ARL CMS Media - TEST", mimeType: "application/vnd.google-apps.folder" });
      if (url.includes("/test-folder-id?fields=")) return Response.json({ id: "test-folder-id", mimeType: "application/vnd.google-apps.folder", trashed: false });
      if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable") && method === "POST") return new Response("", { status: 200, headers: { location: "https://www.googleapis.com/upload/session/123" } });
      if (url === "https://www.googleapis.com/upload/session/123" && method === "PUT") return options.headers["content-type"] === "video/mp4" ? Response.json({ id: "test-video-file-id", mimeType: "video/mp4", size: String(videoBytes.length), parents: ["test-folder-id"] }) : Response.json({ id: "test-image-file-id", mimeType: "image/webp", size: String(bytes.length), parents: ["test-folder-id"] });
      if (url.includes("/test-image-file-id?alt=media")) return new Response(bytes);
      if (url.includes("/test-image-file-id?fields=")) return Response.json({ id: "test-image-file-id", name: filename, mimeType: "image/webp", size: String(bytes.length), modifiedTime: "2026-10-26T00:00:00Z", trashed: false });
      if (url.includes("/test-video-file-id?alt=media")) return new Response(videoBytes);
      if (url.includes("/test-video-file-id?fields=")) return Response.json({ id: "test-video-file-id", name: videoFilename, mimeType: "video/mp4", size: String(videoBytes.length), modifiedTime: "2026-10-26T00:00:00Z", trashed: false });
      throw new Error(`Unexpected mock request: ${method} ${url}`);
    };
    assert.deepEqual(await oauth.completeDriveAuthorization({ code: "fake-code", state: start.searchParams.get("state") }), { email: "zally.aihoc@gmail.com" });
    const stored = JSON.parse(await readFile(process.env.ARL_DRIVE_TOKEN_FILE, "utf8"));
    assert.equal(stored.refresh_token, "fake-refresh");
    assert.equal(stored.email, "zally.aihoc@gmail.com");
    assert.equal((await oauth.driveConnectionStatus()).connected, true);
    assert.equal(media.driveMediaWriteEnabled(), true);
    assert.equal((await media.uploadDriveImage(bytes, filename)).id, "test-image-file-id");
    assert.equal((await media.uploadDriveVideo(videoBytes, videoFilename)).id, "test-video-file-id");
    assert.ok(requests.some(([method, url]) => method === "POST" && url.includes("uploadType=resumable")));
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    database?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
