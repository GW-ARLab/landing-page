import { createHash } from "node:crypto";
import { driveAccessToken, driveOAuthConfigured } from "./drive-oauth.mjs";
import { setting, setSetting } from "./store.mjs";

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const base = "https://www.googleapis.com/drive/v3/files";

export function driveMediaWriteEnabled() {
  return process.env.ARL_DRIVE_MEDIA_WRITE_ENABLED === "true" && driveOAuthConfigured();
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${await driveAccessToken()}`, ...(options.headers || {}) } });
  if (!response.ok) fail(502, `Google Drive API trả về lỗi ${response.status}; ảnh chưa được ghi vào Sheet.`);
  return response;
}

async function mediaFolder() {
  const savedId = setting("drive_media_folder_id");
  if (savedId) {
    const folder = await (await request(`${base}/${encodeURIComponent(savedId)}?fields=id,mimeType,trashed`)).json();
    if (folder.trashed || folder.mimeType !== "application/vnd.google-apps.folder") fail(409, "Thư mục ảnh CMS đã bị thay đổi hoặc chuyển vào thùng rác.");
    return savedId;
  }
  const label = process.env.ARL_MODE === "production" ? "ARL CMS Media" : "ARL CMS Media - TEST";
  const folder = await (await request(`${base}?fields=id,name,mimeType`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: label, mimeType: "application/vnd.google-apps.folder" }) })).json();
  if (!folder.id || folder.mimeType !== "application/vnd.google-apps.folder") fail(502, "Google Drive không xác nhận thư mục ảnh vừa tạo.");
  setSetting("drive_media_folder_id", folder.id);
  return folder.id;
}

export async function ownerDriveFile(fileId) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId || "")) fail(400, "Drive file ID không hợp lệ.");
  const url = `${base}/${encodeURIComponent(fileId)}`;
  const fields = "id,name,mimeType,size,modifiedTime,trashed";
  const metadata = await (await request(`${url}?fields=${fields}`)).json();
  const maximum = metadata.mimeType === "video/mp4" ? 25_000_000 : 10_000_000;
  if (metadata.trashed || Number(metadata.size) > maximum) fail(409, "Media Drive đã bị xóa hoặc vượt dung lượng cho phép.");
  const bytes = Buffer.from(await (await request(`${url}?alt=media`)).arrayBuffer());
  const after = await (await request(`${url}?fields=${fields}`)).json();
  if (after.trashed || after.modifiedTime !== metadata.modifiedTime || String(after.size) !== String(metadata.size) || bytes.length !== Number(metadata.size)) fail(409, "Ảnh Drive thay đổi trong lúc đọc.");
  return { metadata, bytes };
}

export async function uploadDriveImage(bytes, filename) {
  if (!driveMediaWriteEnabled()) fail(501, "Tải ảnh lên Drive chưa được bật.");
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 10_000_000 || !/^[a-f0-9]{64}\.webp$/.test(filename || "")) fail(400, "Ảnh WebP không hợp lệ hoặc vượt 10 MB.");
  const parent = await mediaFolder();
  const metadata = { name: filename, mimeType: "image/webp", parents: [parent] };
  const start = await request("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,parents", { method: "POST", headers: { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "image/webp", "x-upload-content-length": String(bytes.length) }, body: JSON.stringify(metadata) });
  const location = start.headers.get("location");
  const session = location ? new URL(location) : null;
  if (!session || session.protocol !== "https:" || !["www.googleapis.com", "content.googleapis.com", "upload.googleapis.com"].includes(session.hostname)) fail(502, "Google Drive không trả về phiên tải ảnh hợp lệ.");
  const response = await fetch(session, { method: "PUT", headers: { "content-type": "image/webp", "content-length": String(bytes.length) }, body: bytes });
  if (!response.ok) fail(502, `Không hoàn tất tải ảnh lên Drive (${response.status}).`);
  const file = await response.json();
  if (!file.id || file.mimeType !== "image/webp" || Number(file.size) !== bytes.length || !file.parents?.includes(parent)) fail(502, "Không xác nhận được ảnh vừa tải lên Drive.");
  const saved = await ownerDriveFile(file.id);
  if (createHash("sha256").update(saved.bytes).digest("hex") !== createHash("sha256").update(bytes).digest("hex")) fail(502, "Ảnh đọc lại từ Drive không khớp ảnh đã gửi.");
  return { id: file.id, folder_id: parent };
}

export async function uploadDriveVideo(bytes, filename) {
  if (!driveMediaWriteEnabled()) fail(501, "Tải video lên Drive chưa được bật.");
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 25_000_000 || !/^[a-f0-9]{64}\.mp4$/.test(filename || "")) fail(400, "Video MP4 không hợp lệ hoặc vượt 25 MB.");
  const parent = await mediaFolder();
  const start = await request("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,parents", { method: "POST", headers: { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "video/mp4", "x-upload-content-length": String(bytes.length) }, body: JSON.stringify({ name: filename, mimeType: "video/mp4", parents: [parent] }) });
  const location = start.headers.get("location");
  const session = location ? new URL(location) : null;
  if (!session || session.protocol !== "https:" || !["www.googleapis.com", "content.googleapis.com", "upload.googleapis.com"].includes(session.hostname)) fail(502, "Google Drive không trả về phiên tải video hợp lệ.");
  const response = await fetch(session, { method: "PUT", headers: { "content-type": "video/mp4", "content-length": String(bytes.length) }, body: bytes });
  if (!response.ok) fail(502, `Không hoàn tất tải video lên Drive (${response.status}).`);
  const file = await response.json();
  if (!file.id || file.mimeType !== "video/mp4" || Number(file.size) !== bytes.length || !file.parents?.includes(parent)) fail(502, "Không xác nhận được video vừa tải lên Drive.");
  const saved = await ownerDriveFile(file.id);
  if (createHash("sha256").update(saved.bytes).digest("hex") !== createHash("sha256").update(bytes).digest("hex")) fail(502, "Video đọc lại từ Drive không khớp video đã gửi.");
  return { id: file.id, folder_id: parent };
}
