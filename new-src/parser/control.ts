// control 页（全局面板）解析：玩家 id、特殊资源、161 项元素总量、行星列（含每星球元素值）
import { parse } from 'node-html-parser'
import type { ControlData, ElementMap, PlanetInfo } from '../types'
import { extractFromScripts, parseNumber } from '../utils'

export const parseControl = (html: string): ControlData => {
  const root = parse(html)

  // 玩家 id：Playercard(773, ...) 出现在任意元素的 onclick 属性（真实页面在 span/div 上）或 script 文本中
  const playerIdText =
    extractFromScripts(root, /Playercard\(\s*(\d+)/) ??
    root
      .querySelector('[onclick*="Playercard"]')
      ?.getAttribute('onclick')
      ?.match(/Playercard\(\s*(\d+)/)?.[1]
  if (!playerIdText) throw new Error('页面缺少玩家 id（Playercard 标记缺失）')
  const playerId = Number(playerIdText)

  // 特殊资源（921-924）：值在 #current_xxx 元素的 name 属性
  const resource = (name: string) =>
    parseNumber(root.querySelector(`#current_${name}`)?.getAttribute('name') ?? '')
  const resources = {
    darkmatter: resource('darkmatter'),
    antimatter: resource('antimatter'),
    stardust: resource('stardust'),
    container: resource('container'),
  }

  // 元素 id 序列：前 161 个 gebaeude 图标。
  // 槽位 9/10/11 是「每小时产量」图标，其图片复用资源图标（本主题为 901/902/903），
  // 必须重映射为 931/932/933，否则总量会覆盖 901/902/903 的资源数值。
  const icons = root
    .querySelectorAll('img[src*="gebaeude/"]')
    .slice(0, 161)
    .map((img) => Number(img.getAttribute('src')?.match(/gebaeude\/(\d+)\./)?.[1] ?? NaN))
  if (icons.length < 161 || icons.some(Number.isNaN))
    throw new Error(`元素图标数量异常（${icons.length}/161）`)
  icons[9] = 931
  icons[10] = 932
  icons[11] = 933

  // 总量列：#sigma 列内的 imper_block_td 单元格，与图标序列一一对应
  const totals = root.querySelector('#sigma')?.querySelectorAll('.imper_block_td').slice(0, 161)
  if (!totals || totals.length < 161) throw new Error('sigma 总量单元格数量异常')
  const elements: ElementMap = new Map()
  icons.forEach((id, index) => elements.set(id, parseNumber(totals[index].textContent)))

  // 行星列：#sigma 之外每个 .imper_block_vertical 是一颗星球
  const planets: PlanetInfo[] = root
    .querySelectorAll('.imper_block_vertical')
    .filter((column) => column.getAttribute('id') !== 'sigma')
    .map((column) => {
      const nameLink = column.querySelector('.imper_block_info_text a[href*="overview"]')
      const href = nameLink?.getAttribute('href') ?? ''
      const id = Number(href.match(/cp=(\d+)/)?.[1] ?? NaN)
      const name = nameLink?.textContent.trim() ?? ''
      const galaxyLink = column.querySelector('.imper_block_info_text a[href*="galaxy"]')
      const [galaxy, system, position] =
        galaxyLink?.textContent
          .match(/\[(\d+):(\d+):(\d+)\]/)
          ?.slice(1)
          .map(Number) ?? []
      // 行星/月球由类型图标链接的 class 区分（ico_rows_planet / ico_rows_moon）
      const typeClass = column.querySelector('a[class*="ico_rows"]')?.getAttribute('class') ?? ''
      const type: PlanetInfo['type'] = typeClass.includes('ico_rows_moon') ? 'moon' : 'planet'
      // 已用/总面积：某个信息文本形如 "5 / 163"
      const usedSize = column
        .querySelectorAll('.imper_block_info_text')
        .map((el) => el.textContent)
        .map((text) => text.match(/(\d+)\s*\/\s*(\d+)/))
        .find(Boolean)
      const cells = column.querySelectorAll('.imper_block_td').slice(0, 161)
      const planetElements: ElementMap = new Map()
      icons.forEach((elementId, index) =>
        planetElements.set(elementId, parseNumber(cells[index]?.textContent ?? '')),
      )
      return {
        id,
        type,
        name,
        coordinate: { galaxy: galaxy ?? 0, system: system ?? 0, position: position ?? 0 },
        used: usedSize ? Number(usedSize[1]) : 0,
        size: usedSize ? Number(usedSize[2]) : 0,
        elements: planetElements,
      }
    })

  return { playerId, resources, elements, planets }
}
