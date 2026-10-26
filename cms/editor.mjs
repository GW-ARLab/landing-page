import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, rename, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sourcePath, localMediaRoot } from "./pipeline.mjs";
import { hash, validateSource } from "./schema.mjs";
import { googleFetch } from "./google.mjs";
import { driveMediaWriteEnabled, ownerDriveFile, uploadDriveImage, uploadDriveVideo } from "./drive-media.mjs";
import { appendGoogleContentRows, readGoogleContentWorkbook, writeGoogleProductMedia, writeGoogleRecordCells } from "./google-content.mjs";

const bilingual = names => names.flatMap(name => [`${name}_vi`, `${name}_en`]);
export const collections = {
  Site_Settings: { label: "Thông tin chung", id: "setting_key", fields: bilingual(["value"]) },
  Pages: { label: "Trang website", id: "page_id", fields: bilingual(["title", "summary", "hero_title", "hero_text", "intro"]) },
  Products: { label: "Sản phẩm", id: "product_id", fields: bilingual(["name", "summary"]) },
  Solutions: { label: "Giải pháp", id: "solution_id", fields: bilingual(["name", "tagline", "problem", "solution", "audience"]) },
  Research: { label: "Nghiên cứu", id: "research_id", fields: bilingual(["title", "summary"]) },
  Members: { label: "Thành viên", id: "member_id", fields: ["display_name"] },
  Content_Blocks: { label: "Đoạn nội dung", id: "block_id", fields: bilingual(["title", "text"]) },
  Navigation: { label: "Menu", id: "navigation_id", fields: bilingual(["label"]) },
  CTAs: { label: "Nút kêu gọi", id: "cta_id", fields: bilingual(["label"]) },
};

let writeQueue = Promise.resolve();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
export function canEditLocalSource() { return process.env.ARL_MODE !== "production" && !process.env.ARL_CONTENT_SHEET_ID; }
export function canEditGoogleSource() { return Boolean(process.env.ARL_CONTENT_SHEET_ID && process.env.ARL_GOOGLE_CREDENTIALS && process.env.ARL_GOOGLE_CONTENT_WRITE_ENABLED === "true"); }
export function canEditSource() { return canEditLocalSource() || canEditGoogleSource(); }
export function canEditGoogleMedia() { return canEditGoogleSource() && (process.env.ARL_MODE === "production" || process.env.ARL_AUTH_MODE === "google") && driveMediaWriteEnabled(); }
async function editableSource() {
  if (canEditGoogleSource()) return readGoogleContentWorkbook(process.env.ARL_CONTENT_SHEET_ID, googleFetch);
  return { source: JSON.parse(await readFile(sourcePath, "utf8")), tables: null };
}
function queueWrite(work) {
  const next = writeQueue.then(work, work);
  writeQueue = next.catch(() => {});
  return next;
}
async function commitSource(source) {
  const temporary = `${sourcePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(source, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, sourcePath);
  } catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export async function readEditorSource() {
  if (!canEditSource()) fail(501, "Chưa bật ghi nội dung từ CMS vào nguồn dữ liệu.");
  const { source } = await editableSource();
  return { source, source_hash: hash(source), collections };
}

export function updateEditorRecord(input) {
  const work = async () => {
    if (!canEditSource()) fail(501, "Chưa bật ghi nội dung từ CMS vào nguồn dữ liệu.");
    const { collection, id, expected_hash: expectedHash, values } = input || {};
    const config = collections[collection];
    if (!config || typeof id !== "string" || !id || typeof expectedHash !== "string" || !values || typeof values !== "object" || Array.isArray(values)) fail(400, "Yêu cầu lưu không hợp lệ.");
    const workbook = await editableSource(), source = workbook.source;
    if (hash(source) !== expectedHash) fail(409, "Nội dung đã thay đổi ở nơi khác. Hãy tải lại trước khi lưu.");
    const row = source[collection]?.find(item => item[config.id] === id);
    if (!row) fail(404, "Không tìm thấy nội dung cần sửa.");
    const legalPage = collection === "Pages" ? row : collection === "Content_Blocks" && row.owner_type === "page" ? source.Pages.find(page => page.page_id === row.owner_id) : null;
    if (legalPage?.template_key === "legal") fail(403, "Nội dung pháp lý đang được xác nhận riêng; không sửa qua biểu mẫu này.");
    const entries = Object.entries(values);
    if (!entries.length) fail(400, "Chưa có trường nào để lưu.");
    for (const [field, value] of entries) {
      if (!config.fields.includes(field) || !Object.hasOwn(row, field) || typeof row[field] !== "string" || typeof value !== "string" || value.length > 20000) fail(400, `Trường ${field} không được phép sửa.`);
      row[field] = value.trim();
    }
    const errors = validateSource(source);
    if (errors.length) throw Object.assign(new Error("Nội dung chưa hợp lệ; chưa lưu."), { status: 422, details: errors.slice(0, 30) });
    if (canEditGoogleSource()) {
      const table = workbook.tables[collection];
      const sheetRow = table.rows.find(item => item.record[config.id] === id);
      if (!sheetRow) fail(409, "Dòng Google Sheets đã thay đổi; hãy tải lại trước khi lưu.");
      await writeGoogleRecordCells(process.env.ARL_CONTENT_SHEET_ID, table, collection, sheetRow.number, Object.fromEntries(entries.map(([field, value]) => [field, value.trim()])), googleFetch);
      const latest = (await editableSource()).source;
      const saved = latest[collection].find(item => item[config.id] === id);
      if (!saved || entries.some(([field, value]) => saved[field] !== value.trim())) fail(409, "Không xác nhận được nội dung vừa ghi vào Google Sheets; hãy tải lại.");
      return { saved: true, source_hash: hash(latest), record: saved };
    }
    await commitSource(source);
    return { saved: true, source_hash: hash(source), record: row };
  };
  return queueWrite(work);
}

export async function createProduct(input) {
  if (!canEditSource()) fail(501, "Chưa bật tạo sản phẩm từ CMS vào nguồn dữ liệu.");
  if (canEditGoogleSource() && input?.image !== undefined && !canEditGoogleMedia()) fail(501, "Tải ảnh lên My Drive chưa được kết nối; hãy tạo sản phẩm không có ảnh trước.");
  const preparedImage = input?.image === undefined ? null : await prepareProductImage(input.image);
  return queueWrite(async () => {
    if (!canEditSource()) fail(501, "Chưa bật tạo sản phẩm từ CMS vào nguồn dữ liệu.");
    const { expected_hash: expectedHash, slug, name_vi: nameVi, name_en: nameEn, summary_vi: summaryVi, summary_en: summaryEn, product_stage: stage, primary_cta_id: ctaId, category_ids: categoryIds = [], show_on_home: showOnHome = false } = input || {};
    if (typeof expectedHash !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "") || slug.length > 80) fail(400, "Đường dẫn chỉ gồm chữ thường, số và dấu gạch nối (tối đa 80 ký tự).");
    for (const value of [nameVi, nameEn, summaryVi, summaryEn]) if (typeof value !== "string" || !value.trim() || value.trim().length > 2000) fail(400, "Cần tên và mô tả bằng cả hai ngôn ngữ (mỗi trường tối đa 2.000 ký tự).");
    if (!["beta", "available", "research"].includes(stage) || typeof ctaId !== "string" || !Array.isArray(categoryIds) || categoryIds.length > 10 || categoryIds.some(id => typeof id !== "string") || typeof showOnHome !== "boolean") fail(400, "Thông tin sản phẩm không hợp lệ.");
    const workbook = await editableSource(), source = workbook.source;
    if (hash(source) !== expectedHash) fail(409, "Nội dung đã thay đổi ở nơi khác. Hãy tải lại trước khi tạo sản phẩm.");
    const route = `/products/${slug}`;
    if (source.Products.some(row => row.slug === slug) || source.Pages.some(row => row.route === route) || source.Redirects.some(row => row.from_path === route)) fail(409, "Đường dẫn sản phẩm đã được sử dụng.");
    const cta = source.CTAs.find(row => row.cta_id === ctaId && row.action_type === "inquiry");
    if (!cta) fail(400, "Hãy chọn một nút liên hệ hợp lệ.");
    const uniqueCategoryIds = [...new Set(categoryIds)];
    if (uniqueCategoryIds.length !== categoryIds.length || uniqueCategoryIds.some(id => !source.Taxonomies.some(row => row.taxonomy_id === id && row.group === "product-category" && row.is_active !== false))) fail(400, "Danh mục sản phẩm không hợp lệ.");
    const home = source.Pages.find(row => row.route === "/" && row.editorial_status === "ready");
    if (showOnHome && !home) fail(422, "Không tìm thấy trang chủ để hiển thị sản phẩm.");
    const product = {
      product_id: `P_${randomUUID().replaceAll("-", "")}`,
      slug,
      name_vi: nameVi.trim(), name_en: nameEn.trim(),
      summary_vi: summaryVi.trim(), summary_en: summaryEn.trim(),
      product_stage: stage, editorial_status: "ready", primary_cta_id: cta.cta_id,
      sort_order: Math.max(0, ...source.Products.map(row => Number(row.sort_order) || 0)) + 1,
    };
    source.Products.push(product);
    if (preparedImage) {
      source.Media.push(preparedImage.media);
      product.thumbnail_media_id = preparedImage.media.media_id;
    }
    const mappings = uniqueCategoryIds.map(taxonomyId => ({ mapping_id: `ET_${randomUUID().replaceAll("-", "")}`, entity_type: "product", entity_id: product.product_id, taxonomy_id: taxonomyId }));
    source.Entity_Taxonomies.push(...mappings);
    const placement = showOnHome ? { placement_id: `PL_${randomUUID().replaceAll("-", "")}`, page_id: home.page_id, slot_key: "home_products", entity_type: "product", entity_id: product.product_id, sort_order: Math.max(0, ...source.Placements.filter(row => row.slot_key === "home_products").map(row => Number(row.sort_order) || 0)) + 1, is_active: true } : null;
    if (placement) source.Placements.push(placement);
    const errors = validateSource(source);
    if (errors.length) throw Object.assign(new Error("Sản phẩm chưa hợp lệ; chưa lưu."), { status: 422, details: errors.slice(0, 30) });
    if (canEditGoogleSource()) {
      if (preparedImage) {
        const uploaded = await uploadDriveImage(preparedImage.processed, preparedImage.media.local_path);
        delete preparedImage.media.local_path;
        preparedImage.media.drive_file_id = uploaded.id;
      }
      await appendGoogleContentRows(process.env.ARL_CONTENT_SHEET_ID, workbook.tables, { Products: [product], Media: preparedImage ? [preparedImage.media] : [], Entity_Taxonomies: mappings, Placements: placement ? [placement] : [] }, googleFetch);
      const latest = (await editableSource()).source;
      const saved = latest.Products.find(item => item.product_id === product.product_id);
      if (!saved || (preparedImage && !latest.Media.some(item => item.media_id === preparedImage.media.media_id && item.drive_file_id === preparedImage.media.drive_file_id))) fail(409, "Không xác nhận được sản phẩm hoặc ảnh vừa ghi vào Google Sheets; hãy tải lại.");
      return { saved: true, source_hash: hash(latest), product: saved };
    }
    if (preparedImage) await savePreparedImage(preparedImage);
    await commitSource(source);
    return { saved: true, source_hash: hash(source), product };
  });
}

async function prepareProductImage(input) {
  const { base64, alt_vi: altVi, alt_en: altEn, rights_note: rightsNote, rights_confirmed: rightsConfirmed } = input || {};
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 13_400_000) fail(400, "Tệp ảnh không hợp lệ hoặc vượt giới hạn 10 MB.");
  if (typeof altVi !== "string" || !altVi.trim() || altVi.length > 200 || typeof altEn !== "string" || !altEn.trim() || altEn.length > 200) fail(400, "Cần mô tả ảnh bằng tiếng Việt và tiếng Anh (tối đa 200 ký tự). ");
  if (rightsConfirmed !== true || typeof rightsNote !== "string" || !rightsNote.trim() || rightsNote.length > 500) fail(400, "Cần xác nhận quyền công bố và ghi nguồn/quyền sử dụng ảnh.");
  const original = Buffer.from(base64, "base64");
  if (!original.length || original.length > 10_000_000 || original.toString("base64") !== base64) fail(400, "Ảnh phải nhỏ hơn hoặc bằng 10 MB.");
  let processed;
  try {
    const metadata = await sharp(original, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) !== 1 || !metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000) fail(400, "Chỉ nhận ảnh JPEG, PNG hoặc WebP tĩnh, tối đa 40 megapixel.");
    processed = await sharp(original, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  } catch (error) { if (error.status) throw error; fail(400, "Không đọc được ảnh. Hãy thử tệp JPEG, PNG hoặc WebP khác."); }
  const filename = `${createHash("sha256").update(processed).digest("hex")}.webp`;
  const mediaId = `M_UPLOAD_${randomUUID().replaceAll("-", "")}`;
  return { processed, media: { media_id: mediaId, local_path: filename, mime_type: "image/webp", visibility: "public_approved", alt_vi: altVi.trim(), alt_en: altEn.trim(), rights_note: rightsNote.trim() } };
}

async function savePreparedImage({ processed, media }) {
  await mkdir(localMediaRoot, { recursive: true });
  try { await writeFile(path.join(localMediaRoot, media.local_path), processed, { flag: "wx" }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}

export async function uploadProductImage(input) {
  if (!canEditLocalSource() && !canEditGoogleMedia()) fail(501, "Tải ảnh trực tiếp chưa được bật cho nguồn này.");
  const { product_id: productId, expected_hash: expectedHash } = input || {};
  if (typeof productId !== "string" || !productId || typeof expectedHash !== "string") fail(400, "Yêu cầu tải ảnh không hợp lệ.");
  const preparedImage = await prepareProductImage(input);
  return queueWrite(async () => {
    const workbook = await editableSource(), source = workbook.source;
    if (hash(source) !== expectedHash) fail(409, "Nội dung đã thay đổi ở nơi khác. Hãy tải lại trước khi tải ảnh.");
    const product = source.Products?.find(item => item.product_id === productId);
    if (!product) fail(404, "Không tìm thấy sản phẩm.");
    const media = preparedImage.media;
    source.Media.push(media);
    product.thumbnail_media_id = media.media_id;
    const errors = validateSource(source);
    if (errors.length) throw Object.assign(new Error("Ảnh chưa hợp lệ; chưa lưu."), { status: 422, details: errors.slice(0, 30) });
    if (canEditGoogleMedia()) {
      const table = workbook.tables.Products;
      const sheetRow = table.rows.find(item => item.record.product_id === productId);
      if (!sheetRow) fail(409, "Dòng sản phẩm trong Google Sheets đã thay đổi; hãy tải lại.");
      const uploaded = await uploadDriveImage(preparedImage.processed, media.local_path);
      delete media.local_path;
      media.drive_file_id = uploaded.id;
      await writeGoogleProductMedia(process.env.ARL_CONTENT_SHEET_ID, workbook.tables, sheetRow.number, media, googleFetch);
      const latest = (await editableSource()).source;
      const saved = latest.Products.find(item => item.product_id === productId);
      if (saved?.thumbnail_media_id !== media.media_id || !latest.Media.some(item => item.media_id === media.media_id && item.drive_file_id === media.drive_file_id)) fail(409, "Không xác nhận được ảnh vừa ghi vào Google Sheets; hãy tải lại.");
      return { saved: true, source_hash: hash(latest), product: saved, media: { media_id: media.media_id, alt_vi: media.alt_vi, alt_en: media.alt_en } };
    }
    await savePreparedImage(preparedImage);
    await commitSource(source);
    return { saved: true, source_hash: hash(source), product, media: { media_id: media.media_id, alt_vi: media.alt_vi, alt_en: media.alt_en } };
  });
}

export async function uploadProductVideo(input) {
  if (!canEditLocalSource() && !canEditGoogleMedia()) fail(501, "Tải video trực tiếp chưa được bật cho nguồn này.");
  const { product_id: productId, expected_hash: expectedHash, base64, alt_vi: altVi, alt_en: altEn, rights_note: rightsNote, rights_confirmed: rightsConfirmed } = input || {};
  if (typeof productId !== "string" || !productId || typeof expectedHash !== "string") fail(400, "Yêu cầu tải video không hợp lệ.");
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 33_400_000) fail(400, "Video MP4 không hợp lệ hoặc vượt 25 MB.");
  if (typeof altVi !== "string" || !altVi.trim() || altVi.length > 200 || typeof altEn !== "string" || !altEn.trim() || altEn.length > 200) fail(400, "Cần tiêu đề video bằng tiếng Việt và tiếng Anh.");
  if (rightsConfirmed !== true || typeof rightsNote !== "string" || !rightsNote.trim() || rightsNote.length > 500) fail(400, "Cần xác nhận quyền công bố và ghi nguồn video.");
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > 25_000_000 || bytes.toString("base64") !== base64 || bytes.toString("ascii", 4, 8) !== "ftyp") fail(400, "Chỉ nhận tệp MP4 tối đa 25 MB.");
  const media = { media_id: `M_UPLOAD_${randomUUID().replaceAll("-", "")}`, local_path: `${createHash("sha256").update(bytes).digest("hex")}.mp4`, mime_type: "video/mp4", visibility: "public_approved", alt_vi: altVi.trim(), alt_en: altEn.trim(), rights_note: rightsNote.trim() };
  return queueWrite(async () => {
    const workbook = await editableSource(), source = workbook.source;
    if (hash(source) !== expectedHash) fail(409, "Nội dung đã thay đổi ở nơi khác. Hãy tải lại trước khi tải video.");
    const product = source.Products?.find(item => item.product_id === productId);
    if (!product) fail(404, "Không tìm thấy sản phẩm.");
    if (canEditGoogleMedia()) {
      const table = workbook.tables.Products;
      if (!table.headers.includes("video_media_id") && table.headers.length >= 52) fail(409, "Tab Products không còn cột trống để thêm video_media_id.");
      const sheetRow = table.rows.find(item => item.record.product_id === productId);
      if (!sheetRow) fail(409, "Dòng sản phẩm trong Google Sheets đã thay đổi; hãy tải lại.");
      for (const key of ["media_id", "drive_file_id", "mime_type", "visibility", "alt_vi", "alt_en", "rights_note"]) if (!workbook.tables.Media.headers.includes(key)) fail(409, `Tab Media thiếu cột ${key}; chưa tải video.`);
      const uploaded = await uploadDriveVideo(bytes, media.local_path);
      delete media.local_path;
      media.drive_file_id = uploaded.id;
      await writeGoogleProductMedia(process.env.ARL_CONTENT_SHEET_ID, workbook.tables, sheetRow.number, media, googleFetch, "video_media_id");
      const latest = (await editableSource()).source;
      const saved = latest.Products.find(item => item.product_id === productId);
      if (saved?.video_media_id !== media.media_id || !latest.Media.some(item => item.media_id === media.media_id && item.drive_file_id === media.drive_file_id)) fail(409, "Không xác nhận được video vừa ghi vào Google Sheets; hãy tải lại.");
      return { saved: true, source_hash: hash(latest), product: saved, media: { media_id: media.media_id, alt_vi: media.alt_vi, alt_en: media.alt_en, mime_type: media.mime_type } };
    }
    source.Media.push(media);
    product.video_media_id = media.media_id;
    const errors = validateSource(source);
    if (errors.length) throw Object.assign(new Error("Video chưa hợp lệ; chưa lưu."), { status: 422, details: errors.slice(0, 30) });
    await savePreparedImage({ processed: bytes, media });
    await commitSource(source);
    return { saved: true, source_hash: hash(source), product, media: { media_id: media.media_id, alt_vi: media.alt_vi, alt_en: media.alt_en, mime_type: media.mime_type } };
  });
}

export async function readEditorImage(mediaId) {
  if (!canEditLocalSource() && !canEditGoogleMedia()) fail(501, "Chưa bật xem ảnh nguồn cho bản này.");
  const source = (await editableSource()).source;
  const media = source.Media?.find(item => item.media_id === mediaId);
  if (canEditGoogleMedia() && media?.drive_file_id && /^M_UPLOAD_[a-f0-9]{32}$/.test(mediaId)) return (await ownerDriveFile(media.drive_file_id)).bytes;
  if (!media || !/^[a-f0-9]{64}\.webp$/.test(media.local_path || "")) fail(404, "Không tìm thấy ảnh.");
  return readFile(path.join(localMediaRoot, media.local_path));
}
