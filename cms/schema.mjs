import { createHash } from "node:crypto";

export const tabs = ["Site_Settings", "Pages", "Products", "Solutions", "Research", "Members", "Content_Blocks", "Taxonomies", "Entity_Taxonomies", "Relations", "Placements", "Navigation", "CTAs", "Media", "Redirects"];
export const entityTabs = { page: ["Pages", "page_id"], product: ["Products", "product_id"], solution: ["Solutions", "solution_id"], research: ["Research", "research_id"], member: ["Members", "member_id"] };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const blockTypes = new Set(["paragraph", "feature", "use_case", "step", "material", "specification", "metric", "simulation_line"]);
const researchTypes = new Set(["research-area", "project", "publication", "technical-article", "open-source"]);
const validSlots = new Set(["home_products", "home_capabilities", "home_research", "about_team", "home_ctas"]);
const inquiryTypes = new Set(["product-demo", "request-access", "product-inquiry", "product-support", "enterprise-workflow", "research-collaboration", "partnership", "general"]);

export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function hash(value) { return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex"); }
export function normalizeSource(input) {
  return Object.fromEntries(tabs.map(tab => [tab, Array.isArray(input[tab]) ? input[tab] : []]));
}

export function validateSource(input) {
  const source = normalizeSource(input), errors = [];
  const fail = (tab, row, field, message) => errors.push({ tab, record_id: row?.[Object.keys(row || {}).find(k => k.endsWith("_id"))] || "", field, message });
  const indexes = {};
  for (const [type, [tab, key]] of Object.entries(entityTabs)) {
    const byId = new Map(), slugs = new Set();
    for (const row of source[tab]) {
      if (!row[key] || byId.has(row[key])) fail(tab, row, key, "ID trống hoặc trùng");
      else byId.set(row[key], row);
      if (row.editorial_status !== "ready" || row.is_archived === true) continue;
      const name = type === "product" ? "name" : type === "research" ? "title" : type === "solution" ? "name" : type === "page" ? "title" : "role";
      if (type !== "member") for (const locale of ["vi", "en"]) {
        if (!String(row[`${name}_${locale}`] || "").trim()) fail(tab, row, `${name}_${locale}`, "Thiếu nội dung ngôn ngữ bắt buộc");
      }
      if (type === "member" && !row.display_name) fail(tab, row, "display_name", "Thiếu tên chung của thành viên");
      if (row.slug) {
        if (!slugPattern.test(row.slug)) fail(tab, row, "slug", "Slug chỉ gồm chữ thường, số và dấu gạch nối");
        if (slugs.has(row.slug)) fail(tab, row, "slug", "Slug trùng");
        slugs.add(row.slug);
      }
      if (type === "research" && !researchTypes.has(row.research_type)) fail(tab, row, "research_type", "Loại nghiên cứu không hợp lệ");
      if (type === "research" && row.research_type === "publication" && !row.doi_url && !row.paper_url && !row.public_pdf_media_id) fail(tab, row, "doi_url", "Công bố cần DOI, URL bài báo hoặc PDF");
      if (type === "research" && row.research_type === "open-source" && (!row.repository_url || !row.license_label)) fail(tab, row, "repository_url", "Mã nguồn mở cần repository và license");
    }
    indexes[type] = byId;
  }
  for (const tab of tabs) {
    const idField = { Content_Blocks: "block_id", Taxonomies: "taxonomy_id", Entity_Taxonomies: "mapping_id", Relations: "relation_id", Placements: "placement_id", Navigation: "navigation_id", CTAs: "cta_id", Media: "media_id", Redirects: "redirect_id", Site_Settings: "setting_key" }[tab];
    if (!idField) continue;
    const seen = new Set();
    for (const row of source[tab]) {
      if (!row[idField] || seen.has(row[idField])) fail(tab, row, idField, "ID trống hoặc trùng");
      seen.add(row[idField]);
    }
  }
  const active = (type, id) => { const row = indexes[type]?.get(id); return row && row.editorial_status === "ready" && row.is_archived !== true; };
  for (const b of source.Content_Blocks) {
    if (!blockTypes.has(b.block_type)) fail("Content_Blocks", b, "block_type", "Loại block không được hỗ trợ");
    if (!indexes[b.owner_type]?.has(b.owner_id)) fail("Content_Blocks", b, "owner_id", "Không tìm thấy hồ sơ cha");
    if (b.is_active !== false && active(b.owner_type, b.owner_id)) for (const locale of ["vi", "en"]) {
      if (!String(b[`title_${locale}`] || b[`text_${locale}`] || "").trim()) fail("Content_Blocks", b, `text_${locale}`, "Block thiếu bản dịch");
    }
  }
  const taxonomies = new Map(source.Taxonomies.map(x => [x.taxonomy_id, x]));
  for (const row of source.Entity_Taxonomies) {
    if (!indexes[row.entity_type]?.has(row.entity_id)) fail("Entity_Taxonomies", row, "entity_id", "Hồ sơ không tồn tại");
    if (!taxonomies.has(row.taxonomy_id)) fail("Entity_Taxonomies", row, "taxonomy_id", "Taxonomy không tồn tại");
  }
  const allowedRelations = { research_product: ["research", "product"], solution_product: ["solution", "product"], research_author: ["research", "member"] };
  for (const row of source.Relations) {
    const pair = allowedRelations[row.relation_type];
    if (!pair || pair[0] !== row.from_type || pair[1] !== row.to_type || !indexes[row.from_type]?.has(row.from_id) || !indexes[row.to_type]?.has(row.to_id)) fail("Relations", row, "relation_type", "Quan hệ hoặc hồ sơ liên kết không hợp lệ");
    else if (row.is_archived !== true && (indexes[row.from_type].get(row.from_id).is_archived || indexes[row.to_type].get(row.to_id).is_archived)) fail("Relations", row, "to_id", "Quan hệ trỏ tới hồ sơ đã lưu trữ");
  }
  for (const row of source.Placements) {
    if (!validSlots.has(row.slot_key)) fail("Placements", row, "slot_key", "Slot không được hỗ trợ");
    if (!indexes.page.has(row.page_id) || !indexes[row.entity_type]?.has(row.entity_id)) fail("Placements", row, "entity_id", "Page hoặc hồ sơ không tồn tại");
    else if (row.is_active !== false && indexes[row.entity_type].get(row.entity_id).is_archived) fail("Placements", row, "entity_id", "Placement trỏ tới hồ sơ đã lưu trữ");
  }
  const media = new Map(source.Media.map(x => [x.media_id, x]));
  for (const row of source.Products) if (row.video_media_id && media.get(row.video_media_id)?.mime_type !== "video/mp4") fail("Products", row, "video_media_id", "Video sản phẩm phải là tệp MP4 đã đăng ký trong Media");
  const ctas = new Map(source.CTAs.map(x => [x.cta_id, x]));
  for (const row of [...source.Products, ...source.Solutions, ...source.Research, ...source.Members, ...source.Pages, ...source.Content_Blocks]) {
    if (row.owner_type && (!active(row.owner_type, row.owner_id) || row.is_active === false)) continue;
    if ((!row.owner_type && row.editorial_status !== "ready") || row.is_archived) continue;
    for (const [field, id] of Object.entries(row).filter(([key, value]) => key.endsWith("media_id") && value)) {
      if (!media.has(id) || media.get(id).visibility !== "public_approved") fail("Media", row, field, "Media thiếu hoặc chưa được duyệt công khai");
    }
    if (row.primary_cta_id && !ctas.has(row.primary_cta_id)) fail("CTAs", row, "primary_cta_id", "CTA không tồn tại");
  }
  for (const cta of source.CTAs) {
    if (cta.action_type === "inquiry" && !inquiryTypes.has(cta.inquiry_type_id)) fail("CTAs", cta, "inquiry_type_id", "Loại yêu cầu không hợp lệ");
    if (cta.target_type && !indexes[cta.target_type]?.has(cta.target_id)) fail("CTAs", cta, "target_id", "Đích không tồn tại");
  }
  const navigation = new Map(source.Navigation.map(x => [x.navigation_id, x]));
  const allowedLocations = new Set(["header", "footer_products", "footer_solutions", "footer_research", "footer_lab"]);
  for (const row of source.Navigation) {
    if (!allowedLocations.has(row.location)) fail("Navigation", row, "location", "Vị trí menu không hợp lệ");
    if (row.parent_id && (!navigation.has(row.parent_id) || navigation.get(row.parent_id).location !== row.location)) fail("Navigation", row, "parent_id", "Menu cha không tồn tại hoặc khác vị trí");
    if (row.is_active === false) continue;
    for (const locale of ["vi", "en"]) if (!String(row[`label_${locale}`] || "").trim()) fail("Navigation", row, `label_${locale}`, "Thiếu nhãn menu");
    if (row.target_type) {
      const target = indexes[row.target_type]?.get(row.target_id);
      if (!target || target.is_archived === true) fail("Navigation", row, "target_id", "Đích menu không tồn tại hoặc đã lưu trữ");
      if (row.external_url) fail("Navigation", row, "external_url", "Menu chỉ chọn một loại đích");
    } else if (!/^\/(?!\/)|^https:\/\//.test(row.external_url || "")) fail("Navigation", row, "external_url", "Liên kết menu phải là đường dẫn nội bộ hoặc HTTPS");
    const visited = new Set([row.navigation_id]);
    let parent = row.parent_id;
    while (parent) {
      if (visited.has(parent)) { fail("Navigation", row, "parent_id", "Menu có vòng lặp"); break; }
      visited.add(parent);
      parent = navigation.get(parent)?.parent_id;
    }
  }
  const routes = new Set(source.Pages.filter(x => x.editorial_status === "ready" && !x.is_archived).map(x => x.route));
  for (const row of source.Products.filter(x => x.editorial_status === "ready" && !x.is_archived)) routes.add(`/products/${row.slug}`);
  for (const row of source.Research.filter(x => x.editorial_status === "ready" && !x.is_archived)) routes.add(`/research/${row.slug}`);
  const redirectPaths = new Set();
  for (const row of source.Redirects) {
    if (!/^\/(?!\/)[a-z0-9\/-]*$/.test(row.from_path || "") || redirectPaths.has(row.from_path) || routes.has(row.from_path)) fail("Redirects", row, "from_path", "Đường dẫn cũ sai, trùng hoặc đang là route live");
    redirectPaths.add(row.from_path);
    if (row.status_code !== 301 && row.status_code !== 410) fail("Redirects", row, "status_code", "Chỉ hỗ trợ 301 hoặc 410");
    if (row.status_code === 301 && (!routes.has(row.to_path) || row.to_path === row.from_path)) fail("Redirects", row, "to_path", "Đích 301 phải là route live, không qua redirect khác");
  }
  for (const page of ["/", "/products", "/solutions", "/research", "/about", "/contact", "/privacy-policy", "/terms-of-use"]) if (!routes.has(page)) errors.push({ tab: "Pages", record_id: "", field: "route", message: `Thiếu trang bắt buộc ${page}` });
  return errors;
}

export function mergeCandidate(source, previous) {
  const next = normalizeSource(source);
  if (!previous) return Object.fromEntries(tabs.map(tab => [tab, next[tab].filter(x => x.editorial_status !== "draft" && x.is_archived !== true)]));
  const result = {};
  const draftParents = new Set(Object.entries(entityTabs).flatMap(([type, [tab, id]]) => next[tab].filter(x => x.editorial_status === "draft").map(x => `${type}:${x[id]}`)));
  for (const tab of tabs) {
    const idField = { Pages: "page_id", Products: "product_id", Solutions: "solution_id", Research: "research_id", Members: "member_id", Content_Blocks: "block_id", Taxonomies: "taxonomy_id", Entity_Taxonomies: "mapping_id", Relations: "relation_id", Placements: "placement_id", Navigation: "navigation_id", CTAs: "cta_id", Media: "media_id", Redirects: "redirect_id", Site_Settings: "setting_key" }[tab];
    const old = new Map((previous[tab] || []).map(x => [x[idField], x]));
    const merged = new Map(old);
    for (const row of next[tab]) {
      if (tab === "Content_Blocks" && draftParents.has(`${row.owner_type}:${row.owner_id}`)) continue;
      if (tab === "Entity_Taxonomies" && draftParents.has(`${row.entity_type}:${row.entity_id}`)) continue;
      if (tab === "Relations" && (draftParents.has(`${row.from_type}:${row.from_id}`) || draftParents.has(`${row.to_type}:${row.to_id}`))) continue;
      if (tab === "Placements" && draftParents.has(`${row.entity_type}:${row.entity_id}`)) continue;
      if (row.is_archived === true) merged.delete(row[idField]);
      else if (row.editorial_status !== "draft") merged.set(row[idField], row);
    }
    result[tab] = [...merged.values()];
  }
  const liveParents = new Set(Object.entries(entityTabs).flatMap(([type, [tab, id]]) => result[tab].map(x => `${type}:${x[id]}`)));
  result.Content_Blocks = result.Content_Blocks.filter(x => liveParents.has(`${x.owner_type}:${x.owner_id}`));
  result.Entity_Taxonomies = result.Entity_Taxonomies.filter(x => liveParents.has(`${x.entity_type}:${x.entity_id}`));
  result.Relations = result.Relations.filter(x => liveParents.has(`${x.from_type}:${x.from_id}`) && liveParents.has(`${x.to_type}:${x.to_id}`));
  result.Placements = result.Placements.filter(x => liveParents.has(`page:${x.page_id}`) && liveParents.has(`${x.entity_type}:${x.entity_id}`));
  return result;
}
