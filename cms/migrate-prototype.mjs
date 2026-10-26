import ts from "typescript";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./store.mjs";

const app = await readFile(path.join(projectRoot, "src", "App.tsx"), "utf8");
const source = ts.createSourceFile("App.tsx", app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function decode(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return decode(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(decode);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
    if (!ts.isPropertyAssignment(property)) throw new Error(`Unsupported property: ${property.getText(source).slice(0, 80)}`);
    const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : null;
    if (!key) throw new Error("Computed key unsupported");
    return [key, decode(property.initializer)];
  }));
  throw new Error(`Unsupported expression ${ts.SyntaxKind[node.kind]}: ${node.getText(source).slice(0, 80)}`);
}
function named(name) {
  for (const statement of source.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(source) === name) return decode(declaration.initializer);
  }
  throw new Error(`Missing ${name}`);
}
function functionConditionalArray(functionName, variableName) {
  const fn = source.statements.find(x => ts.isFunctionDeclaration(x) && x.name?.text === functionName);
  if (!fn) throw new Error(`Missing ${functionName}`);
  for (const statement of fn.body.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(source) === variableName && ts.isConditionalExpression(declaration.initializer)) {
      const expression = ts.isConditionalExpression(declaration.initializer.whenFalse) ? declaration.initializer.whenFalse : declaration.initializer;
      return { vi: decode(expression.whenTrue), en: decode(expression.whenFalse) };
    }
  }
  throw new Error(`Missing ${functionName}.${variableName}`);
}
function functionValue(functionName, variableName) {
  const fn = source.statements.find(x => ts.isFunctionDeclaration(x) && x.name?.text === functionName);
  for (const statement of fn.body.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(source) === variableName) return declaration.initializer;
  }
  throw new Error(`Missing ${functionName}.${variableName}`);
}
function choose(node, state) {
  if (ts.isConditionalExpression(node)) return choose(state[node.condition.getText(source)] ? node.whenTrue : node.whenFalse, state);
  return decode(node);
}
const products = named("products"), details = named("details"), researchItems = named("researchItems");
const solutions = functionConditionalArray("Solutions", "rows");
if (process.argv.includes("--inspect")) {
  for (const [slug, localizations] of Object.entries(details)) {
    console.log(slug);
    for (const [key, value] of Object.entries(localizations.vi)) console.log(key, JSON.stringify(value).slice(0, 250));
  }
  process.exit(0);
}
const contentFile = path.join(projectRoot, "cms", "local", "ARL_Content.json");
const content = JSON.parse(await readFile(contentFile, "utf8"));
function addTaxonomy(group, slug, vi, en, entityType, entityId) {
  const id = `T_${group.toUpperCase().replaceAll("-", "_")}_${slug.toUpperCase().replaceAll(/[^A-Z0-9]/g, "_")}`;
  if (!content.Taxonomies.some(x => x.taxonomy_id === id)) content.Taxonomies.push({ taxonomy_id: id, group, slug, label_vi: vi, label_en: en, is_active: true });
  const mappingId = `ET_${entityType.toUpperCase()}_${entityId}_${id}`;
  if (!content.Entity_Taxonomies.some(x => x.mapping_id === mappingId)) content.Entity_Taxonomies.push({ mapping_id: mappingId, entity_type: entityType, entity_id: entityId, taxonomy_id: id });
}
content.Content_Blocks = content.Content_Blocks.filter(x => !["B_WORKFLOW_1", "B_PRINTING_1", "B_ROBOT_1"].includes(x.block_id));
for (const product of content.Products) {
  const vi = products.vi.find(x => x.slug === product.slug), en = products.en.find(x => x.slug === product.slug);
  if (!vi || !en) continue;
  product.summary_vi = vi.desc;
  product.summary_en = en.desc;
  for (const category of vi.categories) {
    const index = vi.categories.indexOf(category);
    addTaxonomy("product-category", category, vi.labels[index] || category, en.labels[index] || category, "product", product.product_id);
  }
  for (const platform of vi.platforms) addTaxonomy("platform", platform.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"), platform, platform, "product", product.product_id);
  const translations = details[product.slug];
  if (!translations) continue;
  for (const [section, type] of [["features", "feature"], ["uses", "use_case"], ["process", "step"], ["materials", "material"], ["specs", "specification"]]) {
    const viValues = translations.vi[section] || [], enValues = translations.en[section] || [];
    for (let index = 0; index < Math.max(viValues.length, enValues.length); index++) {
      const left = viValues[index], right = enValues[index];
      if (!left || !right) continue;
      const pair = value => Array.isArray(value) ? [String(value[0] || ""), value.slice(1).map(String).join(" — ")] : [String(value), ""];
      const [titleVi, textVi] = pair(left), [titleEn, textEn] = pair(right);
      const id = `B_${product.product_id}_${section.toUpperCase()}_${index + 1}`;
      if (content.Content_Blocks.some(x => x.block_id === id)) continue;
      content.Content_Blocks.push({ block_id: id, owner_type: "product", owner_id: product.product_id, section_key: section, block_type: type, title_vi: titleVi, title_en: titleEn, text_vi: textVi, text_en: textEn, sort_order: index + 1, is_active: true });
    }
  }
  const viLines = translations.vi.spec || [], enLines = translations.en.spec || [];
  for (let index = 0; index < Math.max(viLines.length, enLines.length); index++) {
    if (!viLines[index] || !enLines[index]) continue;
    const id = `B_${product.product_id}_SIMULATION_${index + 1}`;
    if (!content.Content_Blocks.some(x => x.block_id === id)) content.Content_Blocks.push({ block_id: id, owner_type: "product", owner_id: product.product_id, section_key: "simulation", block_type: "simulation_line", text_vi: String(viLines[index]), text_en: String(enLines[index]), sort_order: index + 1, is_active: true });
  }
}
for (const research of content.Research) {
  const vi = researchItems.vi.find(x => x[4] === `/research/${research.slug}`), en = researchItems.en.find(x => x[4] === `/research/${research.slug}`);
  if (!vi || !en) continue;
  research.title_vi = vi[1]; research.title_en = en[1];
  research.summary_vi = vi[2]; research.summary_en = en[2];
  for (let index = 0; index < vi[3].length; index++) addTaxonomy("research-tag", vi[3][index].toLowerCase().normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "").replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, ""), vi[3][index], en[3][index] || vi[3][index], "research", research.research_id);
}
const aboutPage = content.Pages.find(x => x.page_key === "about");
const aboutValues = functionValue("About", "values");
for (const [locale, vi] of [["vi", true], ["en", false]]) {
  const values = choose(aboutValues, { vi });
  for (const [index, key] of ["mission", "vision", "philosophy"].entries()) {
    aboutPage[`${key}_title_${locale}`] = values[index][0];
    aboutPage[`${key}_text_${locale}`] = values[index][1];
  }
}
const focusesVi = choose(functionValue("About", "focuses"), { vi: true });
const focusesEn = choose(functionValue("About", "focuses"), { vi: false });
for (let index = 0; index < focusesVi.length; index++) {
  const id = `B_PAGE_ABOUT_FOCUS_${index + 1}`;
  if (!content.Content_Blocks.some(x => x.block_id === id)) content.Content_Blocks.push({ block_id: id, owner_type: "page", owner_id: "PAGE_ABOUT", section_key: "focuses", block_type: "feature", title_vi: focusesVi[index], title_en: focusesEn[index], sort_order: index + 1, is_active: true });
}
const capabilitiesVi = choose(functionValue("Home", "capabilities"), { 'lang === "vi"': true });
const capabilitiesEn = choose(functionValue("Home", "capabilities"), { 'lang === "vi"': false });
for (let index = 0; index < capabilitiesVi.length; index++) {
  const id = `B_PAGE_HOME_CAPABILITY_${index + 1}`;
  if (!content.Content_Blocks.some(x => x.block_id === id)) content.Content_Blocks.push({ block_id: id, owner_type: "page", owner_id: "PAGE_HOME", section_key: "capabilities", block_type: "feature", title_vi: capabilitiesVi[index][0], title_en: capabilitiesEn[index][0], text_vi: capabilitiesVi[index][1], text_en: capabilitiesEn[index][1], target_url: capabilitiesVi[index][2], sort_order: index + 1, is_active: true });
}
for (const [pageKey, privacy] of [["privacy-policy", true], ["terms-of-use", false]]) {
  const page = content.Pages.find(x => x.page_key === pageKey);
  for (const [locale, vi] of [["vi", true], ["en", false]]) page[`intro_${locale}`] = choose(functionValue("Legal", "intro"), { privacy, vi });
  const sectionsVi = choose(functionValue("Legal", "sections"), { privacy, vi: true });
  const sectionsEn = choose(functionValue("Legal", "sections"), { privacy, vi: false });
  for (let index = 0; index < Math.max(sectionsVi.length, sectionsEn.length); index++) {
    const left = sectionsVi[index], right = sectionsEn[index];
    if (!left || !right) continue;
    const id = `B_${page.page_id}_LEGAL_${index + 1}`;
    if (content.Content_Blocks.some(x => x.block_id === id)) continue;
    content.Content_Blocks.push({ block_id: id, owner_type: "page", owner_id: page.page_id, section_key: "legal", block_type: "paragraph", title_vi: left[0], title_en: right[0], text_vi: Array.isArray(left[1]) ? left[1].join("\n") : left[1], text_en: Array.isArray(right[1]) ? right[1].join("\n") : right[1], sort_order: index + 1, is_active: true });
  }
}
for (const solution of content.Solutions) {
  const vi = solutions.vi.find(x => x[0] === solution.slug), en = solutions.en.find(x => x[0] === solution.slug);
  if (!vi || !en) continue;
  for (const [index, field] of [[1, "name"], [2, "tagline"], [3, "problem"], [4, "solution"], [5, "audience"]]) {
    solution[`${field}_vi`] = vi[index];
    solution[`${field}_en`] = en[index];
  }
  for (let index = 0; index < Math.max(vi[6].length, en[6].length); index++) {
    const id = `B_${solution.solution_id}_USE_${index + 1}`;
    if (content.Content_Blocks.some(x => x.block_id === id)) continue;
    content.Content_Blocks.push({ block_id: id, owner_type: "solution", owner_id: solution.solution_id, section_key: "use_cases", block_type: "use_case", title_vi: vi[6][index], title_en: en[6][index], sort_order: index + 1, is_active: true });
  }
}
await writeFile(contentFile, JSON.stringify(content, null, 2) + "\n");
console.log(`Migrated ${content.Content_Blocks.length} product blocks into ${contentFile}`);
