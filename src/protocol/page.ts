import { ErrorCode } from '../types.ts'
import type { Observation, PlanetObservation } from '../types.ts'
import type { HttpResponse } from './client.ts'
import type { Selection } from './dom.ts'
import { contentText, isOwnAddress, requiredAttribute, responseUrl, textContent } from './dom.ts'
import { fieldValue } from './forms.ts'
import { handlerBody } from './handlers.ts'
import { readInteger } from './numbers.ts'
import { scalarParameters } from './parameters.ts'
import { OperationError } from './result.ts'
import { ScriptData } from './script-data.ts'
import type { StaticValue } from './script-data.ts'
import { parseHtml } from './selection.ts'
import type { Select } from './selection.ts'

const MESSAGE_SELECTOR = '#content #ally_content > .ally_contents'

const PLANET_MARKER = '.active_urlpalnet[url]'

const TAG_START = /[!a-z/?]/i

/**
 * Extract text from an HTML fragment and decode entities.
 *
 * 提取 HTML 片段文本并解码实体。
 */
export function parseHtmlText(html: string): string {
  return textContent(parseHtml(html)('body'))
}

export function hasTag(text: string): boolean {
  const lastGt = text.lastIndexOf('>')
  for (let lt = text.indexOf('<'); lt >= 0 && lt + 1 < lastGt; lt = text.indexOf('<', lt + 1))
    if (TAG_START.test(text.charAt(lt + 1))) return true
  return false
}

function isJsonResponse(response: HttpResponse, body: string): boolean {
  return (
    (response.headers.get('Content-Type') ?? '').toLowerCase().includes('json') ||
    /^(?:[[{"]|true$|false$|null$)/.test(body)
  )
}

export type ResponseShape = 'empty' | 'json' | 'html' | 'text'

/**
 * Classify response bodies, including JSON served as text/html.
 *
 * 按正文形态识别响应，支持服务端以 text/html 发送 JSON。
 */
export function responseShape(response: HttpResponse): ResponseShape {
  const body = response.body.trim()
  if (!body) return 'empty'
  if (isJsonResponse(response, body)) return 'json'
  return hasTag(response.body) ? 'html' : 'text'
}

/**
 * Return the document's observed planet and observation time.
 *
 * 返回文档实际对应的星球与观测时间。
 */
export function planetObservation(page: Page): PlanetObservation {
  return { planetId: page.planetId(), observedAtMs: page.observedAtMs }
}

export function observation(page: Page): Observation {
  return { observedAtMs: page.observedAtMs }
}

/**
 * Parse the body without classifying the business response.
 *
 * 解析正文，不判断响应是否为业务页面。
 */
export function parsePage(response: HttpResponse): Page {
  return new Page(response.body, response.url, response.observedAtMs)
}

const TOOLTIPS = new WeakMap<Page, Map<string, Page>>()

/**
 * Read and cache data-tooltip-content fragments per document.
 *
 * 读取并按文档缓存 data-tooltip-content 片段。
 */
export function tooltipPage(page: Page, selection: Selection): Page {
  const html = selection.attr('data-tooltip-content') ?? ''
  let parsed = TOOLTIPS.get(page)
  if (parsed === undefined) {
    parsed = new Map<string, Page>()
    TOOLTIPS.set(page, parsed)
  }
  const cached = parsed.get(html)
  if (cached !== undefined) return cached
  const tooltip = new Page(html, page.url, page.observedAtMs)
  parsed.set(html, tooltip)
  return tooltip
}

function markerPlanetId(marker: Selection): number {
  return readInteger(new URLSearchParams(requiredAttribute(marker, 'url')).get('cp'), 1)
}

/**
 * Parsed HTML document; scripts are read statically and never executed.
 *
 * 解析后的 HTML 文档；脚本仅作静态读取，不执行。
 */
export class Page {
  readonly $: Select
  readonly parameters: Map<string, string>
  readonly url: URL
  readonly observedAtMs: number

  private cachedPlanetId?: number | null
  private cachedScripts?: ScriptData
  constructor(html: string, url: URL, observedAtMs: number) {
    this.url = url
    this.observedAtMs = observedAtMs
    this.parameters = scalarParameters(url.searchParams)
    this.$ = parseHtml(html)
  }

  /**
   * Extract inline scripts lazily and reuse their parse cache.
   *
   * 按需提取内联脚本，并复用解析缓存。
   */
  get scripts(): ScriptData {
    return (this.cachedScripts ??= new ScriptData(
      this.$('script:not([src])')
        .toArray()
        .map((node) => this.$(node).text()),
    ))
  }
  /**
   * Require exactly one node matching the selector.
   *
   * 要求选择器匹配唯一节点。
   */
  one(selector: string): Selection {
    return this.only(this.$(selector), selector)
  }

  private only(found: Selection, selector: string): Selection {
    if (found.length !== 1)
      throw new OperationError(
        ErrorCode.ParseError,
        `Expected one ${selector}, found ${found.length}`,
      )
    return found
  }

  /**
   * Read the document's unique named control value.
   *
   * 读取文档中唯一的同名控件值。
   */
  fieldValue(name: string): string {
    return fieldValue(this.$('body'), name)
  }
  attribute(selector: string, name: string): string {
    const value = this.one(selector).attr(name)
    if (value === undefined)
      throw new OperationError(ErrorCode.ParseError, `Missing ${name} on ${selector}`)
    return value
  }

  hasPlanet(): boolean {
    return this.$(PLANET_MARKER).length > 0
  }
  /**
   * Read the current-planet marker; absence raises a parse error.
   *
   * 读取当前星球标记；无标记时抛出解析错误。
   */
  planetId(): number {
    this.cachedPlanetId ??= markerPlanetId(this.one(PLANET_MARKER))
    return this.cachedPlanetId
  }

  /**
   * Read the current-planet marker.
   *
   * 读取当前星球标记。
   *
   * @returns The planet ID, or null when no marker exists.
   *
   * 星球 ID；没有标记时为 null。
   *
   * @throws {OperationError} The marker is ambiguous or its ID is invalid, with code ParseError.
   *
   * 标记不唯一或 ID 无效，错误码为 ParseError。
   */
  optionalPlanetId(): number | null {
    if (this.cachedPlanetId !== undefined) return this.cachedPlanetId
    const marker = this.$(PLANET_MARKER)
    this.cachedPlanetId =
      marker.length === 0 ? null : markerPlanetId(this.only(marker, PLANET_MARKER))
    return this.cachedPlanetId
  }

  /**
   * Read a required scalar parameter from the response URL.
   *
   * 读取响应地址中必需的标量参数。
   */
  parameter(name: string): string {
    const value = this.parameters.get(name)
    if (value === undefined)
      throw new OperationError(ErrorCode.ParseError, `Missing ${name} parameter`)
    return value
  }
  /**
   * Read the numeric ID of one matching member call; absent or ambiguous matches return null.
   *
   * 读取唯一匹配成员调用的数值 ID；缺失或不唯一时返回 null。
   */
  handlerId(source: string | undefined, member: string): number | null {
    const found = this.scripts
      .memberNumbers(source, member)
      .map((argument) => readInteger(argument))
    const [only] = found
    return found.length === 1 ? only! : null
  }

  /**
   * Read the first string argument of one matching member call.
   *
   * 读取唯一匹配成员调用的首个字符串参数。
   *
   * @returns The argument, or null for invalid source syntax, absent matches or ambiguous matches.
   *
   * 字符串参数；源码语法无效、缺少匹配或匹配不唯一时为 null。
   */
  handlerText(source: string | undefined, member: string): string | null {
    return this.scripts.memberText(source, member)
  }

  handlerCalls(source: string, name: string): StaticValue[][] {
    return this.scripts.handlerCalls(handlerBody(source), name)
  }

  /**
   * Require one named handler call with static arguments.
   *
   * 要求处理器包含一次具备静态参数的指定调用。
   */
  staticCall(source: string, name: string): StaticValue[] {
    const calls = this.handlerCalls(source, name)
    if (calls.length !== 1)
      throw new OperationError(ErrorCode.ParseError, 'Ambiguous inline handler')
    return calls[0]!
  }
  /**
   * Normalize mode using server rules; the default is show.
   *
   * 按服务端规则规范化 mode；缺省为 show。
   */
  mode(): string {
    return inputText(this.parameters.get('mode') ?? 'show').toLowerCase()
  }

  /**
   * Read message text with visible breaks and collapsed inline whitespace; public and admin cards require receipt mode.
   *
   * 读取消息正文，保留可见换行并压缩行内空白；公开与管理消息卡片仅在回执模式识别。
   */
  message(receipt = false): string | null {
    let block = this.$(MESSAGE_SELECTOR)

    if (receipt && /\/(?:index|admin)\.php$/.test(this.url.pathname)) {
      const main = this.$('main[role="main"]')
      const card = main.children('.card.mb-3')
      const body = card.children('.card-body')
      if (
        main.length === 1 &&
        main.children().length === 1 &&
        card.length === 1 &&
        card.children('h5.card-header').length === 1 &&
        body.children().length === 1 &&
        body.find('form,input,select,textarea').length === 0
      )
        block = body.children('p.card-text')
    }
    if (block.length > 1) throw new OperationError(ErrorCode.ParseError, 'Ambiguous message page')
    return block.length ? contentText(block) : null
  }
  /**
   * Read the unique form targeting this installation's requested page.
   *
   * 读取指向本安装目标页面的唯一表单。
   */
  form(nextPage: string): Selection {
    const forms = this.$('#content form[action]').filter((_index, node) => {
      const target = responseUrl(this.$(node).attr('action'), this.url)
      return isOwnAddress(this, target) && target.searchParams.get('page') === nextPage
    })
    if (forms.length !== 1)
      throw new OperationError(ErrorCode.ParseError, `Missing or ambiguous ${nextPage} form`)
    return forms
  }
}

/**
 * Match server parameter normalization for line endings, NULs and surrounding whitespace.
 *
 * 匹配服务端参数读取规则：换行、NUL 与首尾空白规范化。
 */
function inputText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replaceAll('\0', '')
    .replace(/^[ \t\n\v]+|[ \t\n\v]+$/g, '')
}
