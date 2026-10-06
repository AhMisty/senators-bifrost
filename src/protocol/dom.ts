import { isText } from 'domhandler'

import { ErrorCode } from '../types.ts'
import type { FormOption } from '../types.ts'
import { readInteger } from './numbers.ts'
import type { Page } from './page.ts'
import { OperationError } from './result.ts'
import { isElement } from './selection.ts'
import type { Selection, SelectedNode } from './selection.ts'

export type { Selection } from './selection.ts'
export type { SelectedNode } from './selection.ts'

export const ELEMENT_ICON_SELECTOR = 'img[src*="gebaeude/"]'

export const RESOURCE_ICON_SELECTOR = 'img[src*="resources/"]'

/**
 * Read an element or resource icon ID, or null when the address does not match.
 *
 * 从元素或资源图标地址读取 ID；未匹配时返回 null。
 */
export function imageId(path: string | null | undefined): number | null {
  if (typeof path !== 'string') return null
  const match = path.match(/(?:gebaeude|resources)\/(\d+)(?:f)?\.[a-z]+/i)
  return match ? readInteger(match[1], 1) : null
}

/**
 * Read a required element icon ID; absence raises a parse error.
 *
 * 读取必须存在的元素图标 ID；缺失时抛出解析错误。
 */
export function elementId(path: string | null | undefined): number {
  const id = imageId(path)
  if (id === null) throw new OperationError(ErrorCode.ParseError, 'Missing element image')
  return id
}

/**
 * Decode the numeric ID following a known prefix.
 *
 * 解码已知前缀之后的数值 ID。
 */
export function prefixedId(value: string, prefix: string, minimum = 0): number {
  return readInteger(value.slice(prefix.length), minimum)
}

export function recordEntry(row: Selection): { elementId: number; name: string } {
  return {
    elementId: elementId(row.find('.record_img_utits img').attr('src')),
    name: textContent(row.find('.record_name_utits')),
  }
}

/**
 * Collapse whitespace and trim surrounding space.
 *
 * 压缩连续空白并去除首尾空白。
 */
export function textContent(content: Selection | string): string {
  const text = typeof content === 'string' ? content : content.text()
  return text.replace(/\s+/g, ' ').trim()
}

const CONTENT_BLOCKS = new Set([
  'blockquote',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'table',
  'td',
  'th',
  'tr',
  'ul',
])

/**
 * Extract body text with nested br and paragraph breaks, collapsing inline whitespace and excluding scripts/styles.
 *
 * 提取正文，保留嵌套 br 与段落分行，压缩行内空白；不读取脚本或样式。
 */
export function contentText(content: Selection): string {
  const lines: string[] = ['']
  let boundary = false
  const breakLine = (): void => {
    if (lines.at(-1)!.trim()) lines.push('')
  }
  const visit = (node: SelectedNode): void => {
    if (isText(node)) {
      const text = node.data
      if (boundary && text.trim()) {
        breakLine()
        boundary = false
      }
      lines[lines.length - 1] += text
      return
    }
    if (!isElement(node) || node.name === 'script' || node.name === 'style') return
    if (node.name === 'br') {
      if (boundary) breakLine()
      lines.push('')
      boundary = false
      return
    }
    const block = CONTENT_BLOCKS.has(node.name)
    if (block) breakLine()
    for (const child of node.children) visit(child)
    if (block) boundary = true
  }
  for (const node of content.toArray()) visit(node)
  return lines.map(textContent).join('\n').trim()
}

/**
 * Clone nodes and remove child elements, retaining direct text.
 *
 * 复制节点并移除子元素，保留直接文本。
 */
export function withoutChildren(selection: Selection): Selection {
  const copy = selection.clone()
  copy.children().remove()
  return copy
}

/**
 * Split text at template br elements, omitting empty lines.
 *
 * 以模板中的 br 分割文本，省略空行。
 */
export function blockLines(block: Selection): string[] {
  const contents = block.contents()
  const lines: string[] = ['']
  for (let at = 0; at < contents.length; at++) {
    const child = contents.eq(at)
    if (child.is('br')) lines.push('')
    else lines[lines.length - 1] += child.text()
  }
  return lines.map((line) => textContent(line)).filter((line) => line !== '')
}

/**
 * Separate a trailing parenthesized label, such as activity status.
 *
 * 分离文本末尾括号中的标签，如活动状态。
 */
export function splitTrailingParenthetical(text: string): {
  text: string
  trailing: string | null
} {
  const labelled = text.match(/^(.*\S)\s+(\([^()]*\))$/)
  return labelled ? { text: labelled[1]!, trailing: labelled[2]! } : { text, trailing: null }
}

/**
 * Read required nonempty text; field identifies parse failures.
 *
 * 读取必需的非空文本，field 用于说明解析错误。
 */
export function requiredText(selection: Selection, field: string): string {
  const value = textContent(selection)
  if (!value) throw new OperationError(ErrorCode.ParseError, `Missing ${field}`)
  return value
}

/**
 * Resolve links against the response URL; missing or invalid addresses raise parse errors.
 *
 * 相对于响应地址解析链接；缺失或无效地址抛出解析错误。
 */
export function responseUrl(address: string | undefined, base: URL): URL {
  if (address === undefined) throw new OperationError(ErrorCode.ParseError, 'Missing response URL')
  try {
    return new URL(address, base)
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
    throw new OperationError(ErrorCode.ParseError, 'Invalid response URL')
  }
}

/**
 * Read a required attribute, raising a parse error when absent.
 *
 * 读取必需属性；不存在时抛出解析错误。
 */
export function requiredAttribute(selection: Selection, name: string): string {
  const value = selection.attr(name)
  if (value === undefined)
    throw new OperationError(ErrorCode.ParseError, `Missing ${name} on the selected element`)
  return value
}

/**
 * Read inner HTML without sanitizing it.
 *
 * 读取节点内部 HTML，不进行内容净化。
 */
export function requiredHtml(selection: Selection, what: string): string {
  const value = selection.html()
  if (value === null) throw new OperationError(ErrorCode.ParseError, `Missing ${what} markup`)
  return value
}

export function requiredTagName(selection: Selection): string {
  const node = selection.node()
  if (node === undefined || !isElement(node))
    throw new OperationError(ErrorCode.ParseError, 'Missing tagName on the selected element')
  return node.name.toUpperCase()
}

export function linkUrl(page: Page, selection: Selection): URL {
  return responseUrl(selection.attr('href'), page.url)
}

/**
 * Check whether a link has the document's origin and path.
 *
 * 判断链接与文档是否同源且路径一致。
 */
export function isOwnAddress(page: Page, url: URL): boolean {
  return url.origin === page.url.origin && url.pathname === page.url.pathname
}

function ownLinkUrl(page: Page, link: Selection): URL {
  const url = linkUrl(page, link)
  if (!isOwnAddress(page, url))
    throw new OperationError(ErrorCode.ParseError, 'Link outside the document')
  return url
}

/**
 * Read an optional ID from a same-page link; missing links or parameters return null.
 *
 * 读取本页面链接的可选 ID；无链接或参数时返回 null。
 */
export function linkId(page: Page, selector: string, parameter = 'id'): number | null {
  const link = page.$(selector)
  if (!link.length) return null
  const stated = ownLinkUrl(page, link).searchParams.get(parameter)
  return stated === null || stated === '' ? null : readInteger(stated, 1)
}

/**
 * Read a required integer ID from a same-page link.
 *
 * 读取同页面链接中必需的整数 ID。
 */
export function requiredLinkId(page: Page, link: Selection, parameter = 'id'): number {
  const stated = ownLinkUrl(page, link).searchParams.get(parameter)
  if (stated === null || stated === '')
    throw new OperationError(ErrorCode.ParseError, `Missing ${parameter} on the link`)
  return readInteger(stated, 1)
}

export function renderedOptions(control: Selection): { node: SelectedNode; option: Selection }[] {
  const options: Selection = control.find('option')
  return options.toArray().map((node, index) => ({ node, option: options.eq(index) }))
}

/**
 * Use option text when the value attribute is absent.
 *
 * option 无 value 属性时使用文本值。
 */
export function optionValue(option: Selection): string {
  return option.attr('value') ?? textContent(option)
}

/**
 * Read all select options, including disabled ones.
 *
 * 读取全部 select 选项，包含禁用项。
 */
export function controlOptions(control: Selection): FormOption[] {
  return renderedOptions(control).map(({ option }) => ({
    value: optionValue(option),
    label: textContent(option),
  }))
}

export function selectOptions(page: Page, selector: string): FormOption[] {
  return controlOptions(page.$(selector))
}

export function integerOptions(control: Selection, minimum = 0): FormOption<number>[] {
  return renderedOptions(control).map(({ option }) => ({
    value: readInteger(optionValue(option), minimum),
    label: textContent(option),
  }))
}

/**
 * Require exactly one matching descendant.
 *
 * 要求根节点内仅匹配一个目标。
 */
export function oneIn(root: Selection, selector: string, what: string = selector): Selection {
  const found = root.find(selector)
  if (found.length !== 1)
    throw new OperationError(ErrorCode.ParseError, `Expected one ${what}, found ${found.length}`)
  return found
}

export function selections(root: Selection): Selection[] {
  return root.toArray().map((_node, index) => root.eq(index))
}

/**
 * Read data rows, excluding empty rows and spanning message rows.
 *
 * 读取数据行，忽略无单元格行与跨列消息行。
 */
export function tableRows(page: Page, selector: string): Selection[] {
  return page
    .$(selector)
    .toArray()
    .map((node) => page.$(node))
    .filter((row) => {
      const cells = row.children('td')
      return cells.length > 0 && !(cells.length === 1 && Number(cells.attr('colspan')) > 1)
    })
}

/**
 * Ship or resource row; icon is null when absent and count is empty when no quantity control exists.
 *
 * 舰船或资源表格行；无图标时 icon 为 null，无数量控件时 count 为空集合。
 */
export type ShipTableRow = {
  row: Selection

  icon: string | null

  count: Selection
}

/**
 * Read each row's first icon and reducefleet_count_ship quantity control.
 *
 * 读取每行首个图标及 reducefleet_count_ship 数量控件。
 */
export function shipTableRows(content: Selection): ShipTableRow[] {
  const rows = content.find('tr')
  return rows.toArray().map((_node, index) => {
    const row = rows.eq(index)
    return {
      row,
      icon: row.find('img').attr('src') ?? null,
      count: row.find('.reducefleet_count_ship'),
    }
  })
}
