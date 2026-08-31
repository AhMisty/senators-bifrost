// 建筑/科研/船坞页面共用的解析片段：能源、存储上限、队列块、DatatList 元素映射
import type { HTMLElement } from 'node-html-parser'
import type { ElementMap, Limits, QueueData } from '../types'
import { extractJsObjectFromScripts, parseNumber } from '../utils'

// 当前能源（941）：值在 #current_energy 的 name 属性（New-Star 主题惯例：数值放 name）
export const parseEnergy = (root: HTMLElement): number => {
  const el = root.querySelector('#current_energy')
  if (!el) throw new Error('页面缺少 #current_energy 元素（结构异常）')
  return parseNumber(el.getAttribute('name') ?? '')
}

// 存储上限（951/952/953）：resourceTicker JS 中按 金属/晶体/重氢 顺序出现 3 次 limit: [0, "n"]
export const parseLimits = (root: HTMLElement): Limits => {
  for (const script of root.querySelectorAll('script')) {
    const matches = [...script.textContent.matchAll(/limit:\s*\[\s*0\s*,\s*"(\d+)"\s*\]/g)]
    if (matches.length >= 3) {
      return {
        metal: Number(matches[0][1]),
        crystal: Number(matches[1][1]),
        deuterium: Number(matches[2][1]),
      }
    }
  }
  throw new Error('页面缺少 resourceTicker 的 limit 数据（结构异常）')
}

// 队列块：
// - progress 来自 New-Star 主题的 #fildes_band_proc 进度条（width: N%），无施工时缺失
// - items 来自 2Moons 系主题的 #build_process（图标取元素 id、onlistremov 锚文本取等级）；本主题无该结构时为空列表
export const parseQueue = (root: HTMLElement): QueueData => {
  const proc = root.querySelector('#fildes_band_proc')
  let progress = 0
  if (proc) {
    const width = proc.getAttribute('style')?.match(/width:\s*([\d.]+)%/)
    if (width) progress = parseFloat(width[1])
  }
  const items: QueueData['items'] = []
  const process = root.querySelector('#build_process')
  if (process) {
    const icons = process.querySelectorAll('img[src*="gebaeude/"]')
    const removes = process.querySelectorAll('a[class*="onlistremov"]')
    const length = Math.min(icons.length, removes.length)
    for (let i = 0; i < length; i++) {
      const element = Number(icons[i].getAttribute('src')?.match(/gebaeude\/(\d+)\./)?.[1] ?? NaN)
      if (Number.isFinite(element))
        items.push({ element, count: parseNumber(removes[i].textContent) })
    }
  }
  return { items, progress }
}

// 提取 DatatList 对象为元素映射：字段值取 item[field]（'level' | 'available'），id 优先 item.id、缺省用对象键
// DatatList 是 script 里的对象字面量，形如 { "106":{ "id":"106","level":"6",... } } 或 { "1":{ "level":"2",... } }
export const parseDatatList = (root: HTMLElement, field: 'level' | 'available'): ElementMap => {
  const data = extractJsObjectFromScripts<Record<string, Record<string, string>>>(root, 'DatatList')
  if (!data) throw new Error('页面缺少 DatatList 数据（结构异常）')
  const map: ElementMap = new Map()
  for (const [key, item] of Object.entries(data)) {
    const id = Number(item.id ?? key)
    if (Number.isFinite(id)) map.set(id, parseNumber(item[field] ?? ''))
  }
  return map
}
