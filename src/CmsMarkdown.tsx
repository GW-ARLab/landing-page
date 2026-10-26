import { Fragment, ReactNode } from "react"
import { assetUrl, CmsContent } from "./cmsContent"

// Render only a small, explicit Markdown subset. Raw HTML is always text.
function inline(value: string, content: CmsContent | null): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(!?\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g
  let cursor = 0
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) parts.push(value.slice(cursor, match.index))
    if (match[3]) {
      const target = match[3].trim()
      if (match[1].startsWith("!")) {
        const mediaId = target.match(/^media:([A-Za-z0-9_-]+)$/)?.[1]
        const url = mediaId ? assetUrl(content, mediaId) : null
        parts.push(url ? <img key={match.index} src={url} alt={match[2]} loading="lazy" /> : match[0])
      } else if (/^https:\/\//.test(target) || /^\/(?!\/)/.test(target)) {
        parts.push(<a key={match.index} href={target} rel={target.startsWith("https:") ? "noopener noreferrer" : undefined}>{match[2]}</a>)
      } else parts.push(match[0])
    } else if (match[4]) parts.push(<strong key={match.index}>{match[4]}</strong>)
    else parts.push(<code key={match.index}>{match[5]}</code>)
    cursor = match.index + match[0].length
  }
  if (cursor < value.length) parts.push(value.slice(cursor))
  return parts
}

export default function CmsMarkdown({ body, content }: { body: string; content: CmsContent | null }) {
  const lines = body.replace(/\r\n?/g, "\n").split("\n")
  const nodes: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) { index++; continue }
    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      const H = `h${Math.min(heading[1].length + 1, 5)}` as "h2" | "h3" | "h4" | "h5"
      nodes.push(<H key={index}>{inline(heading[2], content)}</H>)
      index++
      continue
    }
    if (/^```/.test(line)) {
      const start = ++index, code: string[] = []
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++])
      nodes.push(<pre key={start}><code>{code.join("\n")}</code></pre>)
      index++
      continue
    }
    if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const start = index, ordered = /^\d+\./.test(line), items: ReactNode[] = []
      const listPattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/
      while (index < lines.length && listPattern.test(lines[index].trim())) {
        items.push(<li key={index}>{inline(lines[index].trim().match(listPattern)![1], content)}</li>)
        index++
      }
      nodes.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>)
      continue
    }
    if (line.startsWith("|") && index + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[index + 1].trim())) {
      const start = index, cells = (value: string) => value.trim().replace(/^\||\|$/g, "").split("|").map(x => x.trim())
      const header = cells(line); index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].trim().startsWith("|")) rows.push(cells(lines[index++]))
      nodes.push(<div className="cms-table-scroll" key={start}><table><thead><tr>{header.map((x, i) => <th key={i}>{inline(x, content)}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{header.map((_, j) => <td key={j}>{inline(row[j] || "", content)}</td>)}</tr>)}</tbody></table></div>)
      continue
    }
    const start = index, paragraph: string[] = []
    while (index < lines.length && lines[index].trim() && !/^(#{1,4}\s|```|[-*+]\s|\d+\.\s|\|)/.test(lines[index].trim())) paragraph.push(lines[index++].trim())
    if (!paragraph.length) { paragraph.push(lines[index++].trim()) }
    nodes.push(<p key={start}>{inline(paragraph.join(" "), content)}</p>)
  }
  return <Fragment>{nodes}</Fragment>
}
