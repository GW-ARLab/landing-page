import { createSign, createPrivateKey, createPublicKey, verify as verifySignature, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readGoogleContentWorkbook } from "./google-content.mjs";

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
let tokenCache = null;
async function serviceAccount() {
  if (!process.env.ARL_GOOGLE_CREDENTIALS) throw new Error("ARL_GOOGLE_CREDENTIALS chưa được cấu hình");
  return JSON.parse(await readFile(process.env.ARL_GOOGLE_CREDENTIALS, "utf8"));
}
async function accessToken() {
  if (tokenCache && tokenCache.expires > Date.now() + 60000) return tokenCache.value;
  const account = await serviceAccount(), seconds = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: account.client_email, scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: seconds, exp: seconds + 3600 })}`;
  const signer = createSign("RSA-SHA256"); signer.update(body); signer.end();
  const assertion = `${body}.${signer.sign(createPrivateKey(account.private_key)).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new Error(`Google OAuth ${response.status}`);
  const data = await response.json();
  tokenCache = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}
export async function googleFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${await accessToken()}`, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Google API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response;
}
export async function loadGoogleSource() {
  const sheetId = process.env.ARL_CONTENT_SHEET_ID;
  return (await readGoogleContentWorkbook(sheetId, googleFetch)).source;
}
export async function driveFile(fileId) {
  const metadata = await (await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,modifiedTime,trashed`)).json();
  if (metadata.trashed) throw new Error(`Drive file ${fileId} đã bị xóa`);
  const bytes = Buffer.from(await (await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`)).arrayBuffer());
  const after = await (await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,size,modifiedTime,trashed`)).json();
  if (after.trashed || after.modifiedTime !== metadata.modifiedTime || String(after.size) !== String(metadata.size)) throw new Error(`Drive file ${fileId} thay đổi trong lúc tải`);
  return { metadata, bytes };
}

let jwks = { keys: [], expires: 0 };
export async function verifyGoogleIdToken(token, expectedAudience = process.env.ARL_GOOGLE_CLIENT_ID) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("ID token không hợp lệ");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (header.alg !== "RS256") throw new Error("Thuật toán token không hợp lệ");
  if (Date.now() >= jwks.expires) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) throw new Error("Không tải được Google public keys");
    jwks = { keys: (await response.json()).keys, expires: Date.now() + 30 * 60000 };
  }
  const key = jwks.keys.find(x => x.kid === header.kid);
  if (!key || !verifySignature("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key, format: "jwk" }), Buffer.from(parts[2], "base64url"))) throw new Error("Chữ ký token không hợp lệ");
  if (!expectedAudience || payload.aud !== expectedAudience || !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss) || payload.exp * 1000 < Date.now() || !payload.sub) throw new Error("Issuer, audience hoặc hạn dùng token không hợp lệ");
  return payload;
}
export async function upsertInquiryToGoogle(inquiry) {
  const sheetId = process.env.ARL_INQUIRIES_SHEET_ID;
  if (!sheetId) throw new Error("ARL_INQUIRIES_SHEET_ID chưa được cấu hình");
  const range = encodeURIComponent("Inquiries!A:A");
  const existing = await (await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`)).json();
  const index = existing.values?.findIndex(row => row[0] === inquiry.inquiry_id) ?? -1;
  if (index >= 0) {
    const target = encodeURIComponent(`Inquiries!N${index + 1}:P${index + 1}`);
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${target}?valueInputOption=RAW`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: [[inquiry.status || "new", inquiry.owner || "", inquiry.updated_at || inquiry.created_at]] }) });
    return;
  }
  const columns = ["inquiry_id", "created_at", "name", "email", "company", "inquiry_type", "product_id", "solution_id", "message", "source_path", "locale", "consent_at", "policy_release_id", "status", "owner", "updated_at", "consent_version", "consent_text", "phone"];
  const phoneHeader = await (await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Inquiries!S1")}`)).json();
  const header = phoneHeader.values?.[0]?.[0] || "";
  if (header && header !== "phone") throw new Error("Cột S của Sheet tin nhắn đã có dữ liệu khác; không thể ghi số điện thoại an toàn");
  if (!header) await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Inquiries!S1")}?valueInputOption=RAW`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: [["phone"]] }) });
  const values = columns.map(key => inquiry[key] ?? "");
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Inquiries!A:S")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: [values] }) });
}
export async function upsertInquiryActivityToGoogle(activity) {
  const sheetId = process.env.ARL_INQUIRIES_SHEET_ID;
  if (!sheetId) throw new Error("ARL_INQUIRIES_SHEET_ID chưa được cấu hình");
  const range = encodeURIComponent("Inquiry_Activities!A:A");
  const existing = await (await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`)).json();
  if (existing.values?.some(row => String(row[0]) === String(activity.id))) return;
  const values = [activity.id, activity.inquiry_id, activity.action, activity.actor, activity.at, activity.details];
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Inquiry_Activities!A:F")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: [values] }) });
}
export async function deleteInquiryFromGoogle(inquiryId) {
  const sheetId = process.env.ARL_INQUIRIES_SHEET_ID;
  if (!sheetId) throw new Error("ARL_INQUIRIES_SHEET_ID chưa được cấu hình");
  const metadata = await (await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets(properties(sheetId,title))`)).json();
  const tab = metadata.sheets?.find(x => x.properties.title === "Inquiries")?.properties;
  if (!tab) throw new Error("Thiếu tab Inquiries");
  const ids = await (await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Inquiries!A:A")}`)).json();
  const index = ids.values?.findIndex(row => row[0] === inquiryId) ?? -1;
  if (index < 0) return;
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: tab.sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 } } }] }) });
}
export async function deleteInquiryActivitiesFromGoogle(inquiryId) {
  const sheetId = process.env.ARL_INQUIRIES_SHEET_ID;
  if (!sheetId) throw new Error("ARL_INQUIRIES_SHEET_ID chưa được cấu hình");
  const metadata = await (await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets(properties(sheetId,title))`)).json();
  const tab = metadata.sheets?.find(x => x.properties.title === "Inquiry_Activities")?.properties;
  if (!tab) return;
  const rows = await (await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Inquiry_Activities!A:B")}`)).json();
  const indexes = (rows.values || []).flatMap((row, index) => row[1] === inquiryId ? [index] : []).sort((a, b) => b - a);
  if (!indexes.length) return;
  const requests = indexes.map(index => ({ deleteDimension: { range: { sheetId: tab.sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 } } }));
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
}
const operationHeaders = {
  Jobs: ["id", "kind", "state", "actor", "error", "created_at", "updated_at"],
  Validation_Errors: ["id", "job_id", "tab", "record_id", "field", "message"],
  Releases: ["id", "candidate_id", "hash", "actor", "created_at"],
  Audit_Events: ["id", "actor", "action", "object_id", "result", "at"],
};

export async function syncOperationsToGoogle(tables, request = googleFetch) {
  const sheetId = process.env.ARL_OPERATIONS_SHEET_ID;
  if (!sheetId) throw new Error("ARL_OPERATIONS_SHEET_ID chưa được cấu hình");
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`;
  const updates = [], clearRanges = [];
  for (const [tab, rows] of Object.entries(tables)) {
    const columns = operationHeaders[tab];
    if (!columns || !Array.isArray(rows)) throw new Error(`Bảng nhật ký ${tab} không hợp lệ`);
    const existing = await (await request(`${base}/values/${encodeURIComponent(`${tab}!A:A`)}`)).json();
    const values = [columns, ...rows.map(row => columns.map(key => row[key] ?? ""))];
    const lastColumn = String.fromCharCode(64 + columns.length);
    updates.push({ range: `${tab}!A1:${lastColumn}${values.length}`, values });
    const oldRowCount = existing.values?.length || 0;
    if (oldRowCount > values.length) clearRanges.push(`${tab}!A${values.length + 1}:${lastColumn}${oldRowCount}`);
  }
  if (!updates.length) return;
  await request(`${base}/values:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ valueInputOption: "RAW", data: updates }) });
  if (clearRanges.length) await request(`${base}/values:batchClear`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ranges: clearRanges }) });
}
