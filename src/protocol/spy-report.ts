import type { Location } from '../types.ts'
import { ErrorCode } from '../types.ts'
import type { HttpResponse } from './client.ts'
import { readLocationType } from './coordinates.ts'
import type { Selection } from './dom.ts'
import { linkUrl, oneIn, textContent } from './dom.ts'
import { displayed, readDecimal, readInteger } from './numbers.ts'
import type { Page } from './page.ts'
import { parsePage } from './page.ts'
import { OperationError, withResponse } from './result.ts'

/**
 * Embedded espionage report; prefer simulator-link quantities over rounded display values.
 *
 * 嵌入式侦察报告；显示数值可能舍入，优先读取模拟器链接中的原始数量。
 */
export type SpyReport = {
  title: string

  target: Location

  systemUrl: string

  groups: {
    classId: number
    name: string

    entries: {
      name: string

      amount: number
    }[]
  }[]

  /**
   * Only simulator links expose element IDs; undisclosed groups remain unknown.
   *
   * 仅模拟器链接提供元素 ID；未公开的分组保持未知。
   */
  elements: Map<number, number>

  footer: string
}

/**
 * Decode reports in the selected content without executing scripts.
 *
 * 解码指定内容中的报告，不执行脚本。
 */
export function readSpyReports(page: Page, content: Selection): SpyReport[] {
  return content
    .find('.spyRaport')
    .toArray()
    .map((node) => {
      const report = page.$(node)
      const targetLink = oneIn(report, '.spyRaportFooter a[href*="target_mission"]')
      const target = linkUrl(page, targetLink).searchParams
      const elements = new Map<number, number>()
      const simulator = report.find('a[href*="page=battleSimulator"]')
      if (simulator.length > 1)
        throw new OperationError(ErrorCode.ParseError, 'Ambiguous spy simulator link')
      if (simulator.length === 1)
        for (const [key, count] of linkUrl(page, simulator).searchParams) {
          const match = key.match(/^im\[(\d+)\]$/)
          if (!match) continue
          const id = readInteger(match[1], 1)
          if (elements.has(id))
            throw new OperationError(ErrorCode.ParseError, 'Duplicate spy element')
          elements.set(id, readDecimal(count))
        }
      const groups = report
        .find('.spyRaportContainer')
        .toArray()
        .map((groupNode) => {
          const group = page.$(groupNode)
          const head = group.children('.spyRaportContainerHead')
          const classId = head.attr('class')?.match(/spyRaportContainerHeadClass(\d+)/)?.[1]
          const cells = group
            .find('.spyRaportContainerCell')
            .filter(
              (_index, cell) => page.$(cell).closest('.spyRaportContainer').node() === groupNode,
            )
            .toArray()
          if (cells.length % 2)
            throw new OperationError(ErrorCode.ParseError, 'Incomplete spy report entries')
          return {
            classId: readInteger(classId),
            name: textContent(head),
            entries: cells
              .filter((_cell, index) => index % 2 === 0)
              .map((cell, index) => ({
                name: textContent(page.$(cell)),
                amountText: textContent(page.$(cells[index * 2 + 1]!)),
              })),
          }
        })
      /**
       * Displayed cells and simulator parameters follow the same nested rendering order.
       *
       * 显示单元格与模拟器参数由同一嵌套循环生成，按相同顺序对应。
       */
      const entryCount = groups.reduce((total, group) => total + group.entries.length, 0)

      if (simulator.length && entryCount !== elements.size)
        throw new OperationError(ErrorCode.ParseError, 'Inconsistent spy quantities')
      const values = simulator.length ? [...elements.values()] : null
      const systemLink = oneIn(report, '.spyRaportHead a[href]')
      let entryIndex = 0
      return {
        title: textContent(report.find('.spyRaportHead')),
        systemUrl: linkUrl(page, systemLink).href,
        target: {
          galaxy: readInteger(target.get('galaxy'), 1),
          system: readInteger(target.get('system'), 1),
          planet: readInteger(target.get('planet'), 1),
          type: readLocationType(target.get('planettype')),
        },
        groups: groups.map((group) => ({
          classId: group.classId,
          name: group.name,
          entries: group.entries.map((entry) => ({
            name: entry.name,
            amount: values === null ? displayed(entry.amountText) : values[entryIndex++]!,
          })),
        })),
        elements,
        footer: textContent(report.find('.spyRaportFooter')),
      }
    })
}

/**
 * Decode espionage reports and attach the response to parse errors.
 *
 * 解码响应中的侦察报告，并将响应附于解析错误。
 */
export function parseSpyReport(response: HttpResponse): SpyReport[] {
  return withResponse(response, () => {
    const page = parsePage(response)
    return readSpyReports(page, page.$('body'))
  })
}
