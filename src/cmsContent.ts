import { createContext, useContext } from "react"

export type Lang = "vi" | "en"
export type RecordValue = Record<string, any>
export type CmsContent = Record<string, RecordValue[]>
export const CmsContext = createContext<CmsContent | null>(null)
export const useCms = () => useContext(CmsContext)
export const pageByKey = (content: CmsContent | null, key: string) => content?.Pages?.find(x => x.page_key === key)
export const siteSetting = (content: CmsContent | null, key: string, lang: Lang) => content?.Site_Settings?.find(x => x.setting_key === key)?.[`value_${lang}`]
export function navigationFor(content: CmsContent | null, lang: Lang, location: string) {
  if (!content?.Navigation?.length) return []
  const href = (row: RecordValue) => {
    if (row.target_type === "page") return content.Pages?.find(x => x.page_id === row.target_id)?.route
    if (row.target_type === "product") { const x = content.Products?.find(x => x.product_id === row.target_id); return x ? `/products/${x.slug}` : null }
    if (row.target_type === "research") { const x = content.Research?.find(x => x.research_id === row.target_id); return x ? `/research/${x.slug}` : null }
    if (row.target_type === "solution") { const x = content.Solutions?.find(x => x.solution_id === row.target_id); return x ? `/solutions#${x.slug}` : null }
    return row.external_url || null
  }
  return content.Navigation.filter(x => x.location === location && x.is_active !== false).map(x => ({ id: x.navigation_id as string, parent: x.parent_id as string | undefined, label: x[`label_${lang}`] as string, href: href(x) as string | null, order: Number(x.sort_order || 0) })).filter(x => x.href).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}
export function placedIds(content: CmsContent | null, slot: string) {
  return (content?.Placements || []).filter(x => x.slot_key === slot && x.is_active !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(x => x.entity_id)
}

export function cmsPath() {
  if (typeof window === "undefined") return (globalThis as any).__ARL_SSR_PATH || "/"
  const preview = window.location.pathname.match(/^\/preview\/[^/]+(\/.*)?$/)
  const path = preview ? preview[1] || "/" : window.location.pathname
  return path.startsWith("/en/") ? path.slice(3) : path === "/en" ? "/" : path
}
export function cmsLang(): Lang {
  if (typeof window === "undefined") return (globalThis as any).__ARL_SSR_LANG || "vi"
  return /^\/en(?:\/|$)/.test(cmsPathRaw()) ? "en" : "vi"
}
export function cmsSearch() {
  return typeof window === "undefined" ? (globalThis as any).__ARL_SSR_SEARCH || "" : window.location.search
}
function cmsPathRaw() {
  if (typeof window === "undefined") return "/"
  return window.location.pathname.replace(/^\/preview\/[^/]+/, "") || "/"
}
export function cmsHref(href: string, lang: Lang) {
  if (!href.startsWith("/") || href.startsWith("//")) return href
  const preview = typeof window !== "undefined" ? window.location.pathname.match(/^\/preview\/[^/]+/)?.[0] || "" : (globalThis as any).__ARL_SSR_PREVIEW_ID ? `/preview/${(globalThis as any).__ARL_SSR_PREVIEW_ID}` : ""
  return `${preview}${lang === "en" ? "/en" : ""}${href}`
}
export function assetUrl(content: CmsContent | null, mediaId: string | undefined, card = false) {
  if (!content || !mediaId) return null
  const media = content.Media?.find(x => x.media_id === mediaId)
  const filename = card ? media?.asset_card_file || media?.asset_file : media?.asset_file
  if (!filename) return null
  const preview = typeof window !== "undefined" ? window.location.pathname.match(/^\/preview\/([^/]+)/)?.[1] : (globalThis as any).__ARL_SSR_PREVIEW_ID
  return preview ? `/api/candidates/${preview}/assets/${filename}` : `/assets/${filename}`
}
export function productsFor(content: CmsContent | null, lang: Lang) {
  if (!content) return null
  const tax = new Map((content.Taxonomies || []).map(x => [x.taxonomy_id, x]))
  const ctas = new Map((content.CTAs || []).map(x => [x.cta_id, x]))
  return (content.Products || []).map(p => {
    const cta = ctas.get(p.primary_cta_id)
    const imageMedia = content.Media?.find(item => item.media_id === p.thumbnail_media_id)
    const allTaxonomies = (content.Entity_Taxonomies || []).filter(x => x.entity_type === "product" && x.entity_id === p.product_id).map(x => tax.get(x.taxonomy_id)).filter((x): x is RecordValue => Boolean(x))
    const categories = [...new Map(allTaxonomies.filter(x => x.group === "product-category").map(x => [x.slug, x])).values()]
    const blocks = (content.Content_Blocks || []).filter(x => x.owner_type === "product" && x.owner_id === p.product_id && x.block_type === "use_case" && x.is_active !== false)
    return {
      id: p.product_id,
      slug: p.slug,
      title: p[`name_${lang}`],
      status: p.product_stage === "beta" ? "Beta" : p.product_stage === "research" ? (lang === "vi" ? "Nghiên cứu" : "Research") : (lang === "vi" ? "Sẵn sàng" : "Available"),
      categories: categories.map(x => x.slug),
      labels: categories.map(x => x[`label_${lang}`]),
      desc: p[`summary_${lang}`],
      platforms: allTaxonomies.filter(x => x.group === "platform").map(x => x[`label_${lang}`]),
      uses: blocks.map(x => x[`title_${lang}`] || x[`text_${lang}`]),
      contact: `/contact?product=${encodeURIComponent(p.slug)}&type=${encodeURIComponent(cta?.inquiry_type_id || "general")}`,
      ctaLabel: cta?.[`label_${lang}`] || (lang === "vi" ? "Liên hệ" : "Contact"),
      image: assetUrl(content, p.thumbnail_media_id, true),
      imageAlt: imageMedia?.[`alt_${lang}`] || p[`name_${lang}`],
    }
  }).sort((a, b) => (content.Products.find(x => x.product_id === a.id)?.sort_order || 0) - (content.Products.find(x => x.product_id === b.id)?.sort_order || 0))
}
export function researchFor(content: CmsContent | null, lang: Lang) {
  if (!content) return null
  const tax = new Map((content.Taxonomies || []).map(x => [x.taxonomy_id, x]))
  return (content.Research || []).map(r => [r.research_type, r[`title_${lang}`], r[`summary_${lang}`], (content.Entity_Taxonomies || []).filter(x => x.entity_type === "research" && x.entity_id === r.research_id).map(x => tax.get(x.taxonomy_id)).filter((x): x is RecordValue => x !== undefined && x.group === "research-tag").map(x => x[`label_${lang}`]), `/research/${r.slug}`] as [string, string, string, string[], string])
}
