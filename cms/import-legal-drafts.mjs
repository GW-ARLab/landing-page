import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Generates a separate local preview source. It never overwrites the live source.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.resolve(process.env.ARL_LEGAL_DOCS_DIR || path.join(projectRoot, "..", "..", "11_Chinh_sach_va_Hinh_anh", "11_Chinh_sach_va_Hinh_anh"));
const seedPath = path.join(projectRoot, "cms", "local", "ARL_Content.json");
const outputPath = path.join(projectRoot, "cms", "local", "ARL_Legal_Draft.json");
const source = JSON.parse(await readFile(seedPath, "utf8"));
const email = source.Site_Settings.find(row => row.setting_key === "contact_email")?.value_vi;
if (!email) throw new Error("Thiếu email liên hệ đã xác nhận");

function parseMarkdown(markdown, filename) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const title = normalized.match(/^# (.+)$/m)?.[1];
  const firstSection = normalized.search(/^## /m);
  if (!title || firstSection < 0) throw new Error(`${filename}: thiếu tiêu đề hoặc các mục`);
  const intro = normalized.slice(normalized.indexOf("\n") + 1, firstSection).trim();
  const sections = normalized.slice(firstSection).split(/^## /m).filter(Boolean).map(part => {
    const [headingLine, ...bodyLines] = part.split("\n");
    const match = headingLine.match(/^(\d+) (.+)$/);
    if (!match) throw new Error(`${filename}: mục không hợp lệ: ${headingLine}`);
    return { number: Number(match[1]), heading: `${match[1]} ${match[2].trim()}`, body: bodyLines.join("\n").trim() };
  });
  if (sections.length !== 8 || sections.some((section, index) => section.number !== index + 1 || !section.body)) throw new Error(`${filename}: cần đủ 8 mục theo đúng thứ tự`);
  return { title, intro, sections, hash: createHash("sha256").update(normalized).digest("hex") };
}

// ARL approved adding the mandatory contact phone on 27/10/2026. Keep the
// original ZIP untouched and apply the amendment only to the generated draft.
function approvedPhoneAmendment(body, locale) {
  const before = locale === "vi"
    ? "| Họ tên, email, công ty hoặc tổ chức nếu cung cấp | Xác định người liên hệ và phản hồi yêu cầu |"
    : "| Name, email and optional company or organization | Identify the contact and respond |";
  const after = locale === "vi"
    ? "| Họ tên, email và số điện thoại (bắt buộc); công ty hoặc tổ chức (nếu cung cấp) | Xác định, liên lạc và phản hồi người gửi yêu cầu |"
    : "| Name, email and phone number (required); company or organization (if provided) | Identify and contact the sender and respond to the inquiry |";
  if (!body.includes(before)) throw new Error(`Bản chính sách ${locale} đã thay đổi; cần kiểm tra lại phần số điện thoại`);
  return body.replace(before, after);
}

const definitions = [
  { pageId: "PAGE_PRIVACY", vi: "01_Privacy_Policy_VI.md", en: "03_Privacy_Policy_EN.md", version: "ARL PP 1.3" },
  { pageId: "PAGE_TERMS", vi: "02_Terms_of_Use_VI.md", en: "04_Terms_of_Use_EN.md", version: "ARL TOU 1.2" },
];
source.Content_Blocks = source.Content_Blocks.filter(row => !(definitions.some(definition => definition.pageId === row.owner_id) && row.section_key === "legal"));
for (const definition of definitions) {
  const vi = parseMarkdown(await readFile(path.join(docsDir, definition.vi), "utf8"), definition.vi);
  const en = parseMarkdown(await readFile(path.join(docsDir, definition.en), "utf8"), definition.en);
  const page = source.Pages.find(row => row.page_id === definition.pageId);
  if (!page) throw new Error(`Thiếu trang ${definition.pageId}`);
  page.title_vi = vi.title;
  page.title_en = en.title;
  page.intro_vi = vi.intro.replaceAll("{{PRIVACY_EMAIL}}", email).replaceAll("ARL PP 1.2", definition.version);
  page.intro_en = en.intro.replaceAll("{{PRIVACY_EMAIL}}", email).replaceAll("ARL PP 1.2", definition.version);
  page.legal_version = definition.version;
  page.legal_draft_status = "pending_facts";
  page.legal_source_hash_vi = vi.hash;
  page.legal_source_hash_en = en.hash;
  page.needs_confirmation = true;
  for (let index = 0; index < vi.sections.length; index++) {
    const v = vi.sections[index], e = en.sections[index];
    source.Content_Blocks.push({
      block_id: `B_${definition.pageId}_LEGAL_${index + 1}`,
      owner_type: "page",
      owner_id: definition.pageId,
      section_key: "legal",
      block_type: "paragraph",
      title_vi: v.heading,
      title_en: e.heading,
      text_vi: (definition.pageId === "PAGE_PRIVACY" && index === 1 ? approvedPhoneAmendment(v.body, "vi") : v.body).replaceAll("{{PRIVACY_EMAIL}}", email),
      text_en: (definition.pageId === "PAGE_PRIVACY" && index === 1 ? approvedPhoneAmendment(e.body, "en") : e.body).replaceAll("{{PRIVACY_EMAIL}}", email),
      sort_order: index + 1,
      is_active: true,
    });
  }
}
await writeFile(outputPath, `${JSON.stringify(source, null, 2)}\n`);
console.log(`Đã tạo bản nháp pháp lý: ${outputPath}`);
