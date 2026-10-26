import { renderToString } from "react-dom/server"
import App from "./App"
import type { CmsContent, Lang } from "./cmsContent"

export function render(path: string, search: string, lang: Lang, content: CmsContent, previewId?: string) {
  ;(globalThis as any).__ARL_SSR_PATH = path
  ;(globalThis as any).__ARL_SSR_SEARCH = search
  ;(globalThis as any).__ARL_SSR_LANG = lang
  ;(globalThis as any).__ARL_SSR_PREVIEW_ID = previewId
  try { return renderToString(<App initialContent={content} />) }
  finally {
    delete (globalThis as any).__ARL_SSR_PATH
    delete (globalThis as any).__ARL_SSR_SEARCH
    delete (globalThis as any).__ARL_SSR_LANG
    delete (globalThis as any).__ARL_SSR_PREVIEW_ID
  }
}
