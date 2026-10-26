import { normalizeSource, tabs } from "./schema.mjs";

const base = sheetId => `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`;
const quoteTab = tab => `'${tab.replaceAll("'", "''")}'`;

function parseCell(value) {
  if (value === "TRUE" || value === "true") return true;
  if (value === "FALSE" || value === "false") return false;
  if (value !== "" && value != null && /^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value ?? "";
}

export async function readGoogleContentWorkbook(sheetId, request) {
  if (!sheetId) throw new Error("ARL_CONTENT_SHEET_ID chưa được cấu hình");
  const params = new URLSearchParams();
  for (const tab of tabs) params.append("ranges", `${quoteTab(tab)}!A1:AZ10000`);
  const response = await request(`${base(sheetId)}/values:batchGet?${params}`);
  const data = await response.json();
  const tables = {};
  for (let index = 0; index < tabs.length; index++) {
    if (!data.valueRanges?.[index]) throw new Error(`Không đọc được tab ${tabs[index]} từ Google Sheets`);
    const values = data.valueRanges?.[index]?.values || [];
    const headers = values[0] || [];
    const named = headers.filter(Boolean);
    if (!named.length) throw new Error(`Tab ${tabs[index]} thiếu hàng tiêu đề`);
    if (named.length !== new Set(named).size) throw new Error(`Tab ${tabs[index]} có tên cột trùng nhau`);
    if (values.length >= 10000) throw new Error(`Tab ${tabs[index]} chạm giới hạn 10.000 dòng; dừng để tránh bỏ sót dữ liệu`);
    const rows = values.slice(1).flatMap((cells, offset) => {
      if (!cells.some(cell => String(cell ?? "").trim())) return [];
      const record = Object.fromEntries(headers.flatMap((field, cellIndex) => field ? [[field, parseCell(cells[cellIndex])]] : []));
      return [{ number: offset + 2, record }];
    });
    tables[tabs[index]] = { headers, rows };
  }
  return { source: normalizeSource(Object.fromEntries(tabs.map(tab => [tab, tables[tab].rows.map(item => item.record)]))), tables };
}

export async function writeGoogleRecordCells(sheetId, table, tab, rowNumber, values, request) {
  const metadata = await (await request(`${base(sheetId)}?fields=sheets(properties(sheetId,title))`)).json();
  const sheetIdNumber = metadata.sheets?.find(sheet => sheet.properties.title === tab)?.properties.sheetId;
  if (sheetIdNumber === undefined) throw new Error(`Thiếu tab ${tab}; chưa ghi thay đổi`);
  const requests = Object.entries(values).map(([field, value]) => {
    const index = table.headers.indexOf(field);
    if (index < 0 || index >= 52) throw new Error(`Tab ${tab} thiếu cột ${field}; chưa ghi thay đổi`);
    return { updateCells: { start: { sheetId: sheetIdNumber, rowIndex: rowNumber - 1, columnIndex: index }, rows: [{ values: [cell(value)] }], fields: "userEnteredValue" } };
  });
  if (!requests.length) throw new Error("Chưa có trường nào để lưu");
  await request(`${base(sheetId)}:batchUpdate`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ requests }),
  });
}

function cell(value) {
  if (value === undefined || value === null || value === "") return {};
  if (typeof value === "boolean") return { userEnteredValue: { boolValue: value } };
  if (typeof value === "number" && Number.isFinite(value)) return { userEnteredValue: { numberValue: value } };
  if (typeof value === "string") return { userEnteredValue: { stringValue: value } };
  throw new Error("Giá trị Sheet không hợp lệ");
}

export async function appendGoogleContentRows(sheetId, tables, rowsByTab, request) {
  const metadata = await (await request(`${base(sheetId)}?fields=sheets(properties(sheetId,title))`)).json();
  const ids = new Map((metadata.sheets || []).map(sheet => [sheet.properties.title, sheet.properties.sheetId]));
  const requests = [];
  for (const [tab, rows] of Object.entries(rowsByTab)) {
    if (!rows.length) continue;
    const table = tables[tab], sheetIdNumber = ids.get(tab);
    if (!table || sheetIdNumber === undefined) throw new Error(`Thiếu tab ${tab}; chưa ghi thay đổi`);
    for (const row of rows) for (const key of Object.keys(row)) if (!table.headers.includes(key)) throw new Error(`Tab ${tab} thiếu cột ${key}; chưa ghi thay đổi`);
    requests.push({ appendCells: {
      sheetId: sheetIdNumber,
      rows: rows.map(row => ({ values: table.headers.map(key => cell(row[key])) })),
      fields: "userEnteredValue",
    } });
  }
  if (!requests.length) throw new Error("Không có dòng nào để thêm");
  await request(`${base(sheetId)}:batchUpdate`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ requests }),
  });
}

export async function writeGoogleProductMedia(sheetId, tables, productRowNumber, media, request, field = "thumbnail_media_id") {
  const products = tables.Products, images = tables.Media;
  const existingColumn = products?.headers.indexOf(field) ?? -1;
  const addVideoColumn = field === "video_media_id" && existingColumn < 0;
  const mediaColumn = addVideoColumn ? products?.headers.length : existingColumn;
  if (!products || !images || !["thumbnail_media_id", "video_media_id"].includes(field) || mediaColumn < 0 || mediaColumn >= 52 || !Number.isInteger(productRowNumber) || productRowNumber < 2) throw new Error("Sheet sản phẩm thiếu cột media hoặc số dòng không hợp lệ.");
  for (const key of Object.keys(media)) if (!images.headers.includes(key)) throw new Error(`Tab Media thiếu cột ${key}; chưa ghi thay đổi`);
  const metadata = await (await request(`${base(sheetId)}?fields=sheets(properties(sheetId,title))`)).json();
  const ids = new Map((metadata.sheets || []).map(sheet => [sheet.properties.title, sheet.properties.sheetId]));
  if (ids.get("Products") === undefined || ids.get("Media") === undefined) throw new Error("Thiếu tab Products hoặc Media; chưa ghi thay đổi.");
  await request(`${base(sheetId)}:batchUpdate`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ requests: [
      ...(addVideoColumn ? [{ updateCells: { start: { sheetId: ids.get("Products"), rowIndex: 0, columnIndex: mediaColumn }, rows: [{ values: [cell("video_media_id")] }], fields: "userEnteredValue" } }] : []),
      { appendCells: { sheetId: ids.get("Media"), rows: [{ values: images.headers.map(key => cell(media[key])) }], fields: "userEnteredValue" } },
      { updateCells: { start: { sheetId: ids.get("Products"), rowIndex: productRowNumber - 1, columnIndex: mediaColumn }, rows: [{ values: [cell(media.media_id)] }], fields: "userEnteredValue" } },
    ] }),
  });
}
