import test from "node:test";
import assert from "node:assert/strict";
import { tabs } from "../schema.mjs";
import { appendGoogleContentRows, readGoogleContentWorkbook, writeGoogleProductMedia, writeGoogleRecordCells } from "../google-content.mjs";

test("đọc workbook giữ đúng số dòng và kiểu dữ liệu", async () => {
  const values = Object.fromEntries(tabs.map(tab => [tab, [["id"]]]));
  values.Site_Settings = [["setting_key", "value_vi", "value_en"], ["brand_name", "ARL", "ARL"], [], ["response_time", "1-2 ngày", "1-2 days"]];
  values.Products = [["product_id", "slug", "sort_order", "show_on_home"], ["P_1", "robot-1", "4", "TRUE"]];
  const request = async url => {
    assert.match(url, /values:batchGet/);
    return { json: async () => ({ valueRanges: tabs.map(tab => ({ values: values[tab] })) }) };
  };
  const result = await readGoogleContentWorkbook("sheet-1", request);
  assert.equal(result.source.Site_Settings.length, 2);
  assert.equal(result.tables.Site_Settings.rows[1].number, 4);
  assert.equal(result.source.Products[0].sort_order, 4);
  assert.equal(result.source.Products[0].show_on_home, true);
});

test("không nhận workbook thiếu tab hoặc hàng tiêu đề", async () => {
  const missing = async () => ({ json: async () => ({ valueRanges: [] }) });
  await assert.rejects(readGoogleContentWorkbook("sheet-1", missing), /Không đọc được tab Site_Settings/);
  const emptyHeader = async () => ({ json: async () => ({ valueRanges: tabs.map(() => ({ values: [] })) }) });
  await assert.rejects(readGoogleContentWorkbook("sheet-1", emptyHeader), /thiếu hàng tiêu đề/);
});

test("sửa nội dung chỉ ghi các ô yêu cầu, không ghi đè cả workbook", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return options ? { ok: true } : { json: async () => ({ sheets: [{ properties: { title: "Products", sheetId: 11 } }] }) };
  };
  await writeGoogleRecordCells("sheet-1", { headers: ["product_id", "name_vi", "name_en"] }, "Products", 7, { name_vi: "Robot mới", name_en: "New robot" }, request);
  assert.match(calls[1].url, /:batchUpdate$/);
  const body = JSON.parse(calls[1].options.body);
  assert.deepEqual(body.requests, [
    { updateCells: { start: { sheetId: 11, rowIndex: 6, columnIndex: 1 }, rows: [{ values: [{ userEnteredValue: { stringValue: "Robot mới" } }] }], fields: "userEnteredValue" } },
    { updateCells: { start: { sheetId: 11, rowIndex: 6, columnIndex: 2 }, rows: [{ values: [{ userEnteredValue: { stringValue: "New robot" } }] }], fields: "userEnteredValue" } },
  ]);
  await assert.rejects(writeGoogleRecordCells("sheet-1", { headers: ["product_id"] }, "Products", 7, { name_vi: "Sai" }, request), /thiếu cột/);
});

test("tạo sản phẩm nhiều tab trong một batch nguyên tử", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (!options) return { json: async () => ({ sheets: [{ properties: { title: "Products", sheetId: 11 } }, { properties: { title: "Entity_Taxonomies", sheetId: 12 } }] }) };
    return { ok: true };
  };
  await appendGoogleContentRows("sheet-1", {
    Products: { headers: ["product_id", "name_vi", "sort_order"] },
    Entity_Taxonomies: { headers: ["mapping_id", "entity_id"] },
  }, {
    Products: [{ product_id: "P_new", name_vi: "Robot", sort_order: 5 }],
    Entity_Taxonomies: [{ mapping_id: "ET_new", entity_id: "P_new" }],
  }, request);
  assert.equal(calls.length, 2);
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.requests.length, 2);
  assert.equal(body.requests[0].appendCells.sheetId, 11);
  assert.deepEqual(body.requests[0].appendCells.rows[0].values[2], { userEnteredValue: { numberValue: 5 } });
  assert.equal(body.requests[1].appendCells.rows[0].values[1].userEnteredValue.stringValue, "P_new");
});

test("gắn ảnh Drive vào sản phẩm và thêm Media trong cùng một batch", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (!options) return { json: async () => ({ sheets: [{ properties: { title: "Products", sheetId: 11 } }, { properties: { title: "Media", sheetId: 14 } }] }) };
    return { ok: true };
  };
  const media = { media_id: "M_UPLOAD_test", drive_file_id: "drive-file", mime_type: "image/webp", alt_vi: "Ảnh robot" };
  await writeGoogleProductMedia("sheet-1", { Products: { headers: ["product_id", "thumbnail_media_id"] }, Media: { headers: ["media_id", "drive_file_id", "mime_type", "alt_vi"] } }, 7, media, request);
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.requests.length, 2);
  assert.equal(body.requests[0].appendCells.sheetId, 14);
  assert.equal(body.requests[0].appendCells.rows[0].values[1].userEnteredValue.stringValue, "drive-file");
  assert.deepEqual(body.requests[1].updateCells.start, { sheetId: 11, rowIndex: 6, columnIndex: 1 });
  assert.equal(body.requests[1].updateCells.rows[0].values[0].userEnteredValue.stringValue, media.media_id);
});

test("video thêm cột tùy chọn vào Products và Media trong cùng một batch", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (!options) return { json: async () => ({ sheets: [{ properties: { title: "Products", sheetId: 11 } }, { properties: { title: "Media", sheetId: 14 } }] }) };
    return { ok: true };
  };
  const media = { media_id: "M_UPLOAD_video", drive_file_id: "drive-video", mime_type: "video/mp4" };
  await writeGoogleProductMedia("sheet-1", { Products: { headers: ["product_id", "thumbnail_media_id"] }, Media: { headers: ["media_id", "drive_file_id", "mime_type"] } }, 7, media, request, "video_media_id");
  const changes = JSON.parse(calls[1].options.body).requests;
  assert.equal(changes.length, 3);
  assert.equal(changes[0].updateCells.rows[0].values[0].userEnteredValue.stringValue, "video_media_id");
  assert.deepEqual(changes[2].updateCells.start, { sheetId: 11, rowIndex: 6, columnIndex: 2 });
});
