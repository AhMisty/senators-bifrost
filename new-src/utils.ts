// 通用工具函数：纯函数、无内部状态，供 new-src 各模块复用
import type { HTMLElement } from 'node-html-parser'

// 从 Set-Cookie 列表中解析 cookieName 对应的值；找不到返回 null
// 注意：getSetCookie() 需要 Node >= 18.14，此处不做运行时兜底
export const extractToken = (headers: Headers, cookieName: string): string | null => {
  const prefix = `${cookieName}=`
  for (const cookie of headers.getSetCookie()) {
    // lastIndexOf 定位到串尾最后一次出现，防御 cookie 名出现在其他属性值中的情况
    const start = cookie.lastIndexOf(prefix) + prefix.length
    if (start < prefix.length) continue
    // 裸 cookie（无 ';' 属性）也截到串尾
    const end = cookie.indexOf(';', start)
    const value = end === -1 ? cookie.slice(start) : cookie.slice(start, end)
    if (value.length > 0) return value
  }
  return null
}

// 解析数字：去掉德语式千分位点（1.234 → 1234）后 parseInt；无法解析返回 0
export const parseNumber = (value: string): number => parseInt(value.replaceAll('.', '')) || 0

// 解析页面 shortly_number 缩写格式（"1,2 K" → 1200、"219 M"、"−24"）；逗号是小数点，K/M/B 为千/百万/十亿倍率。
// 用于读取 #current_xxx 元素的可见文本（游戏 JS 同源格式）；name 属性则是点千分位格式，用 parseNumber 处理。
const SHORT_FACTORS: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 }

export const parseShortNumber = (value: string): number => {
  const match = value.trim().match(/^(-?[\d.,]+)\s*([KMB])?$/i)
  if (!match) return parseNumber(value)
  const factor = match[2] ? SHORT_FACTORS[match[2].toUpperCase()] : 1
  const num = match[1].includes(',') ? parseFloat(match[1].replaceAll(',', '.')) : parseNumber(match[1])
  return factor === 1 ? num : Math.round(num * factor)
}

// 从页面 script 文本中提取第一个匹配 pattern 的内容；有捕获组时返回第 1 组，否则返回整段匹配；无匹配返回 null
export const extractFromScripts = (root: HTMLElement, pattern: RegExp): string | null => {
  for (const script of root.querySelectorAll('script')) {
    const match = script.textContent.match(pattern)
    if (match) return match[1] ?? match[0]
  }
  return null
}

// 从 script 中提取 `varName = {...};` 形式的 JS 对象字面量并 JSON.parse。
// 按花括号配对截取（对象可能跨行、含嵌套对象与尾随逗号），清洗尾随逗号后解析；解析失败返回 null。
// 页面数值均为 JSON 可解析的键值对，因此无需求助于 JS 引擎。
export const extractJsObjectFromScripts = <T>(root: HTMLElement, varName: string): T | null => {
  const pattern = new RegExp(`\\b${varName}\\s*=`).source
  for (const script of root.querySelectorAll('script')) {
    const text = script.textContent
    const eq = text.search(new RegExp(pattern))
    if (eq === -1) continue
    const open = text.indexOf('{', eq)
    if (open === -1) continue
    let depth = 0
    for (let i = open; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') depth--
      if (depth === 0) {
        try {
          // 清洗尾随逗号（如 "costResources":{...40000000,} 的最后一个逗号），否则 JSON.parse 失败
          return JSON.parse(text.slice(open, i + 1).replace(/,\s*([}\]])/g, '$1')) as T
        } catch {
          break
        }
      }
    }
  }
  return null
}

// 元素映射序列化为表单体：encodeElementMap(map, 'fmenge[', ']') → fmenge%5B210%5D=3&fmenge%5B215%5D=1。
// 前缀/后缀按表单编码转义（中括号必须转义），数字值无需编码。
export const encodeElementMap = (
  map: Map<number, number>,
  prefix: string,
  suffix: string,
): string =>
  [...map.entries()]
    .map(
      ([id, count]) => `${encodeURIComponent(prefix)}${id}${encodeURIComponent(suffix)}=${count}`,
    )
    .join('&')
