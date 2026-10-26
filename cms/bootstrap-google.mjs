import { readFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./store.mjs";
import { googleFetch } from "./google.mjs";
import { tabs } from "./schema.mjs";

// One-time initialization only. Never overwrite a workbook that already has data.
const source = JSON.parse(await readFile(path.join(projectRoot, "cms", "local", "ARL_Content.json"), "utf8"));
const inquiryHeaders = ["inquiry_id", "created_at", "name", "email", "company", "inquiry_type", "product_id", "solution_id", "message", "source_path", "locale", "consent_at", "policy_release_id", "status", "owner", "updated_at", "consent_version", "consent_text", "phone"];
const activityHeaders = ["id", "inquiry_id", "action", "actor", "at", "details"];
const operations = { Jobs: ["id", "kind", "state", "actor", "error", "created_at", "updated_at"], Validation_Errors: ["id", "job_id", "tab", "record_id", "field", "message"], Releases: ["id", "candidate_id", "hash", "actor", "created_at"], Audit_Events: ["id", "actor", "action", "object_id", "result", "at"] };
const emptyTabHeaders = {
  Members: ["member_id", "display_name", "name_latin", "role_vi", "role_en", "bio_vi", "bio_en", "expertise_vi", "expertise_en", "photo_media_id", "profile_url", "sort_order", "editorial_status", "is_archived"],
  Media: ["media_id", "drive_file_id", "mime_type", "alt_vi", "alt_en", "visibility", "rights_note", "source_url"],
  Redirects: ["redirect_id", "from_path", "to_path", "status_code"],
};
async function initialize(sheetId, definitions) {
  if (!sheetId) throw new Error("Thiếu Google Sheet ID");
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`;
  const metadata = await (await googleFetch(`${base}?fields=sheets(properties(sheetId,title))`)).json();
  const existing = new Set((metadata.sheets || []).map(x => x.properties.title));
  for (const [tab, { headers, rows }] of Object.entries(definitions)) {
    if (!existing.has(tab)) {
      await googleFetch(`${base}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }) });
    } else {
      const check = await (await googleFetch(`${base}/values/${encodeURIComponent(`'${tab}'!A1:A2`)}`)).json();
      if (check.values?.length) throw new Error(`${tab} đã có dữ liệu; dừng để tránh ghi đè`);
    }
    const values = [headers, ...rows.map(row => headers.map(key => row[key] ?? ""))];
    await googleFetch(`${base}/values/${encodeURIComponent(`'${tab}'!A1`)}?valueInputOption=RAW`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values }) });
    console.log(`${tab}: ${rows.length} rows`);
  }
}
const contentDefinitions = Object.fromEntries(tabs.map(tab => {
  const rows = source[tab] || [];
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  return [tab, { headers: headers.length ? headers : emptyTabHeaders[tab] || ["id"], rows }];
}));
await initialize(process.env.ARL_CONTENT_SHEET_ID, contentDefinitions);
await initialize(process.env.ARL_INQUIRIES_SHEET_ID, { Inquiries: { headers: inquiryHeaders, rows: [] }, Inquiry_Activities: { headers: activityHeaders, rows: [] } });
await initialize(process.env.ARL_OPERATIONS_SHEET_ID, Object.fromEntries(Object.entries(operations).map(([tab, headers]) => [tab, { headers, rows: [] }])));
