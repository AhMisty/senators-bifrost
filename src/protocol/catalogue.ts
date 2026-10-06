import { ErrorCode } from '../types.ts'
import type { SelectedNode, Selection } from './dom.ts'
import { blockLines, imageId, requiredAttribute, requiredText, textContent } from './dom.ts'
import { hasSubmitControl } from './forms.ts'
import {
  displayed,
  levelPair,
  readAmount,
  readDecimal,
  readInteger,
  readOptionalDecimal,
} from './numbers.ts'
import { tooltipPage } from './page.ts'
import type { Page } from './page.ts'
import { OperationError } from './result.ts'
import type { GROWTH_MODULES } from './routes.ts'
import { parseHtml } from './selection.ts'

export type GrowthModule = keyof typeof GROWTH_MODULES

/**
 * Module-defined purchase behavior: level, timed, consumable, cooldown or choice.
 *
 * 购买行为：升级、延时、消耗、冷却或选择，由模块定义。
 */
export type GrowthKind = (typeof GROWTH_MODULES)[GrowthModule]['kind']

/**
 * Catalogue price; resourceId is null when the currency is unreported.
 *
 * 目录价格；未显示货币类型时 resourceId 为 null。
 */
export type GrowthCost = {
  resourceId: number | null
  amount: number
}

/**
 * Displayed effect; undecodable amounts are null, and unmatched effect formats retain the full line as name.
 *
 * 显示效果；不可解码的数值为 null，未匹配效果格式时 name 保留整行文本。
 */
export type GrowthEffect = {
  name: string

  amount: number | null

  unit: 'percent' | 'amount' | null
}

/**
 * Prerequisite; unreported element IDs and progress are null.
 *
 * 前置条件；未报告元素或进度时对应字段为 null。
 */
export type GrowthRequirement = {
  elementId: number | null
  name: string

  progress: string | null
}

/**
 * Levels, quantities, limits, countdowns, prices and prerequisites reported by the page.
 *
 * 页面实际报告的等级、数量、上限、倒计时、价格及前置条件。
 */
export type GrowthEntry = {
  elementId: number
  name: string

  owned: number | null

  maximumLevel: number | null

  maximumPurchase: number | null

  remainingSeconds: number | null

  hasSubmitControl: boolean

  /**
   * Null for non-choice catalogues or when the selected entry is unidentified.
   *
   * 不是选择型目录或选中项无法识别时为 null。
   */
  isSelected: boolean | null
  costs: GrowthCost[]

  costText: string
  effects: GrowthEffect[]
  requirements: GrowthRequirement[]
}

function lines(page: Page, selection: Selection): string[] {
  return selection.toArray().flatMap((node) => blockLines(page.$(node)))
}

function requirementBlock(page: Page, block: SelectedNode): GrowthRequirement {
  const row = page.$(block)
  const icon = row.find('img')
  return {
    elementId: imageId(icon.attr('src')),
    name: requiredAttribute(icon, 'alt'),
    progress: requiredText(row.find('.text'), 'requirement progress'),
  }
}

function requirementLine(text: string): GrowthRequirement {
  return { elementId: null, name: text, progress: null }
}

/**
 * Merge catalogue and shop cards of one element without duplicate prerequisites.
 *
 * 合并同一元素的目录卡与商店卡，避免重复前置条件。
 */
function mergeRequirements(
  left: readonly GrowthRequirement[],
  right: readonly GrowthRequirement[],
): GrowthRequirement[] {
  const merged = new Map<string, GrowthRequirement>()
  for (const requirement of [...left, ...right])
    merged.set(
      `${requirement.elementId ?? ''}|${requirement.name}|${requirement.progress ?? ''}`,
      requirement,
    )
  return [...merged.values()]
}

const BONUS_LINE = /^([+-]?[^\s%]*[^\s%+-][^\s%]*)(%)?\s+(.+)$/

/**
 * The template can prepend a second minus to negative values; restore the numeric sign.
 *
 * 模板给负值再加负号时会出现双负号，读取时恢复数值符号。
 */
function effect(text: string): GrowthEffect {
  const match = text.replace(/^--(?=\d)/, '-').match(BONUS_LINE)
  return match
    ? {
        name: match[3]!,
        amount: readOptionalDecimal(match[1]!),
        unit: match[2] ? 'percent' : 'amount',
      }
    : { name: text, amount: null, unit: null }
}

const GROWTH_BOX_ID: RegExp = /^(?:ofic|ars)_(\d+)$/

/**
 * These modules print numeric levels without display grouping.
 *
 * 这些模块直接输出数值等级，不使用显示分组格式。
 */
export const LITERAL_LEVEL_MODULES: ReadonlySet<GrowthModule> = new Set([
  'officer',
  'band',
  'ideologies',
])

/**
 * A timed entry without a countdown node means zero; a node without its timer is a parse error.
 *
 * 计时项无倒计时节点表示零；有节点却无计时器视为解析错误。
 */
function remainingSeconds(
  kind: GrowthKind | 'readonly',
  element: number,
  box: Selection,
  timers: ReadonlyMap<number, number>,
): number | null {
  if (kind !== 'timed' && kind !== 'cooldown') return null
  const timer = timers.get(element)
  if (timer !== undefined) return timer
  if (box.find(`#time_${element}`).length)
    throw new OperationError(ErrorCode.ParseError, 'Growth countdown without a timer')
  return 0
}

/**
 * Read growth entries; readonly denotes a display-only catalogue.
 *
 * 读取成长条目；readonly 用于仅展示的目录。
 */
export function catalogue(
  page: Page,
  kind: GrowthKind | 'readonly',
  literalLevel: boolean,
  signedLevel = false,
): GrowthEntry[] {
  page.one('#page > #content')
  const timers = new Map(
    page.scripts
      .calls('GetOfficerTime')
      .map((call) => [readInteger(call[0], 1), readAmount(call[1])]),
  )
  const items = new Map<number, GrowthEntry>()
  page.$('#content .build_box[id]').each((_index, node) => {
    const box = page.$(node)
    const identifier = box.attr('id')?.match(GROWTH_BOX_ID)
    if (!identifier) return
    const element = readInteger(identifier[1], 1)
    const title = box.children('.head').clone()
    title.find('.gov6, [style*="float:right"]').remove()
    const name = box.find('.image_mini img').attr('alt') || title.text().trim()
    const levelNode = box.find('.gov6').first()
    const level = levelNode.length
      ? levelPair(
          levelNode.text(),
          literalLevel ? (signedLevel ? readDecimal : readAmount) : displayed,
        )
      : null
    const maxInput = box.find('input[name="amount"][max]').first().attr('max')
    const maximumPurchase = maxInput ? readDecimal(maxInput) : null
    const costs: GrowthCost[] = []
    box.find('input[name="amount"][onchange]').each((_i, input) => {
      const handler = requiredAttribute(page.$(input), 'onchange')
      const method = handler.match(/^\s*(Price\d+)\s*\(/)?.[1]
      if (!method) return
      const call = page.staticCall(handler, method)
      if (readInteger(call[0], 1) !== element)
        throw new OperationError(ErrorCode.ParseError, 'Invalid growth price handler')
      const resource = readInteger(method.slice(5), 1)
      if (costs.some((cost) => cost.resourceId === resource))
        throw new OperationError(ErrorCode.ParseError, 'Duplicate growth cost resource')
      costs.push({ resourceId: resource, amount: readDecimal(call[1]) })
    })
    const costContainer = box.find('.time_build, .time_build_mini').first()
    if (!costs.length)
      costContainer.find('[id^="price"]').each((_i, price) => {
        costs.push({ resourceId: null, amount: displayed(page.$(price).text()) })
      })
    if (!costs.length && kind === 'choice')
      box.find('.btn_build span[style]').each((_i, price) => {
        const value = page.$(price).text().trim()
        if (/^[\d.,]+$/.test(value)) costs.push({ resourceId: null, amount: displayed(value) })
      })
    const activeField = box
      .find('input[name="id"]')
      .filter((_i, input) => page.$(input).attr('value') === String(element))
    const achievement = box.find('.achievement4[data-tooltip-content]')
    const requirements: GrowthRequirement[] = box
      .find('.required_block')
      .toArray()
      .map((block) => requirementBlock(page, block))
    let effects: GrowthEffect[] = []

    box.find('.prices_mini > font').each((_i, fontNode) => {
      const font = page.$(fontNode)
      if (font.children('br').length === 0) return
      for (const text of blockLines(font)) {
        if (/^[+-]/.test(text)) effects.push(effect(text))
        else requirements.push(requirementLine(text))
      }
    })
    if (achievement.length) {
      const tooltip = tooltipPage(page, achievement)
      const heading = tooltip.$('body > span').last()

      if (!heading.length)
        throw new OperationError(ErrorCode.ParseError, 'Missing growth bonus heading')
      const nodes = tooltip.$('body').contents().toArray()
      const bonus = parseHtml('<div></div>')('div')
      const headingAt = nodes.indexOf(heading.node()!)
      for (const child of nodes.slice(headingAt + 1)) bonus.append(tooltip.$(child).clone())
      effects = lines(tooltip, bonus).map(effect)
    }
    const entry: GrowthEntry = {
      elementId: element,
      name,
      owned: level?.level ?? null,
      maximumLevel: level?.maximum ?? null,
      maximumPurchase,
      hasSubmitControl: hasSubmitControl(page, activeField),
      isSelected: null,
      remainingSeconds: remainingSeconds(kind, element, box, timers),
      costs,

      costText: textContent(
        costContainer.length ? costContainer : box.find('.btn_build_border').first(),
      ),
      effects,
      requirements,
    }

    /**
     * The details overview and shop can render separate cards for the same element.
     *
     * details 的概览与商店可为同一元素分别渲染卡片。
     */
    const previous = items.get(element)
    items.set(
      element,
      previous
        ? {
            ...previous,
            ...entry,
            effects: [...previous.effects, ...entry.effects],
            requirements: mergeRequirements(previous.requirements, entry.requirements),
            costs: entry.costs.length ? entry.costs : previous.costs,
          }
        : entry,
    )
  })
  return [...items.values()]
}
