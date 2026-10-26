import { readFile } from "node:fs/promises";
import path from "node:path";
import { googleFetch } from "./google.mjs";
import { readGoogleContentWorkbook } from "./google-content.mjs";
import { validateSource } from "./schema.mjs";

// Read-only preflight for the three ARL workbooks approved for production.
const official = {
  ARL_CONTENT_SHEET_ID: "1tYbCnkU7o3AQ9Qvkgs5BbF6Mxyz22U2MEE2-6ovkjU8",
  ARL_INQUIRIES_SHEET_ID: "1d6e5zIyp0DzxB4L9DW4ZNYz8z1c8NIhamRzVEBzNxzk",
  ARL_OPERATIONS_SHEET_ID: "1J5_U5x8eg1VXxMlmWs0yZ9Ce2b_JKiGn8bh1UBK5_AA",
};
const inquiryHeaders = ["inquiry_id", "created_at", "name", "email", "company", "inquiry_type", "product_id", "solution_id", "message", "source_path", "locale", "consent_at", "policy_release_id", "status", "owner", "updated_at", "consent_version", "consent_text"];
const expected = {
  Inquiries: inquiryHeaders,
  Inquiry_Activities: ["id", "inquiry_id", "action", "actor", "at", "details"],
  Jobs: ["id", "kind", "state", "actor", "error", "created_at", "updated_at"],
  Validation_Errors: ["id", "job_id", "tab", "record_id", "field", "message"],
  Releases: ["id", "candidate_id", "hash", "actor", "created_at"],
  Audit_Events: ["id", "actor", "action", "object_id", "result", "at"],
};

for (const [key, id] of Object.entries(official)) {
  if (process.env[key] !== id) throw new Error(`${key} chưa trỏ đúng Sheet chính thức của ARL`);
}
if (!process.env.ARL_GOOGLE_CREDENTIALS) throw new Error("Thiếu đường dẫn ARL_GOOGLE_CREDENTIALS");
if (!path.isAbsolute(process.env.ARL_GOOGLE_CREDENTIALS)) throw new Error("ARL_GOOGLE_CREDENTIALS phải là đường dẫn tuyệt đối");
const credentials = JSON.parse(await readFile(process.env.ARL_GOOGLE_CREDENTIALS, "utf8"));
if (credentials.client_email !== "arl-cms-sheets@aihoc-467710.iam.gserviceaccount.com") throw new Error("Sai service account CMS của ARL");

const { source } = await readGoogleContentWorkbook(official.ARL_CONTENT_SHEET_ID, googleFetch);
const errors = validateSource(source);
if (errors.length) throw new Error(`Content Sheet có ${errors.length} lỗi kiểm tra; chưa thay đổi dữ liệu`);
console.log("Content Sheet: đọc được 15 tab, schema hợp lệ.");

async function checkHeaders(sheetId, tab, headers) {
  const range = encodeURIComponent(`'${tab}'!A1:S1`);
  const response = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`);
  const actual = (await response.json()).values?.[0] || [];
  if (headers.some((field, index) => actual[index] !== field)) throw new Error(`${tab}: hàng tiêu đề không khớp; chưa thay đổi dữ liệu`);
  if (tab === "Inquiries" && actual[18] && actual[18] !== "phone") throw new Error("Inquiries!S1 đã có nội dung khác phone; chưa thay đổi dữ liệu");
  console.log(`${tab}: đọc được hàng tiêu đề.`);
  if (tab === "Inquiries" && !actual[18]) console.log("Inquiries!S1 còn trống; backend sẽ thêm tiêu đề phone khi đồng bộ tin nhắn đầu tiên.");
}

for (const tab of ["Inquiries", "Inquiry_Activities"]) await checkHeaders(official.ARL_INQUIRIES_SHEET_ID, tab, expected[tab]);
for (const tab of ["Jobs", "Validation_Errors", "Releases", "Audit_Events"]) await checkHeaders(official.ARL_OPERATIONS_SHEET_ID, tab, expected[tab]);
console.log("Preflight hoàn tất. Script chỉ đọc; chưa thử ghi vào Sheet chính thức.");
