import { DomHandler, Element, ProcessingInstruction } from 'domhandler'
import type { Document } from 'domhandler'
import { appendChild, getElementsByTagName } from 'domutils'
import { decodeHTML, decodeHTMLAttribute } from 'entities'
import { createTokenizer } from 'tag-soup'
import type { ContextualTokenizerOptions, TokenizerOptions } from 'tag-soup'

const RAW_TEXT_TAGS = new Set([
  'script',
  'style',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'plaintext',
])

const FORM_TAGS = ['input', 'option', 'optgroup', 'select', 'button', 'datalist', 'textarea']
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']
const implicitClosures: Record<string, string[]> = {
  body: ['head', 'link', 'script'],
  a: ['a'],
  li: ['li'],
  p: ['p'],
  h1: HEADING_TAGS,
  h2: HEADING_TAGS,
  h3: HEADING_TAGS,
  h4: HEADING_TAGS,
  h5: HEADING_TAGS,
  h6: HEADING_TAGS,
  select: FORM_TAGS,
  input: FORM_TAGS,
  output: FORM_TAGS,
  button: FORM_TAGS,
  datalist: FORM_TAGS,
  textarea: FORM_TAGS,
  option: ['option'],
  optgroup: ['optgroup', 'option'],
  dd: ['dd', 'dt'],
  dt: ['dd', 'dt'],
  rt: ['rt', 'rp'],
  rp: ['rt', 'rp'],
}
for (const name of [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'header',
  'hr',
  'main',
  'nav',
  'ol',
  'pre',
  'section',
  'table',
  'ul',
])
  implicitClosures[name] = ['p']

/**
 * The DOM handler limits implicit table closures to the nearest table; tokenizer rules cannot express this scope.
 *
 * 表格隐式关闭以最近的表格为边界，须由 DOM 处理器完成；tokenizer 的全局规则无法表达此范围。
 */
const tokenizerOptions: TokenizerOptions = {
  voidTags: [
    'area',
    'base',
    'basefont',
    'br',
    'col',
    'command',
    'embed',
    'frame',
    'hr',
    'img',
    'input',
    'isindex',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ],
  rawTextTags: [...RAW_TEXT_TAGS, 'textarea', 'title'],
  implicitlyClosedTags: implicitClosures,
  implicitlyOpenedTags: ['p', 'br'],
  areTagNamesCaseInsensitive: true,
  areUnbalancedStartTagsImplicitlyClosed: true,
  areUnbalancedEndTagsIgnored: true,
}
/**
 * A separate foreignObject context keeps the tokenizer cache distinct from its enclosing SVG.
 *
 * foreignObject 使用独立 HTML 上下文，避免 tokenizer 缓存混淆外层 SVG 上下文。
 */
const htmlContext: ContextualTokenizerOptions = {}
tokenizerOptions.foreignTags = {
  svg: {
    areCDATASectionsRecognized: true,
    areProcessingInstructionsRecognized: true,
    areSelfClosingTagsRecognized: true,
    foreignTags: { foreignObject: htmlContext },
  },
  math: {
    areCDATASectionsRecognized: true,
    areProcessingInstructionsRecognized: true,
    areSelfClosingTagsRecognized: true,
  },
}
const tokenizer = createTokenizer(tokenizerOptions)

/**
 * Build a DOM from ordered tokens, decoding attributes and ordinary text once; retain script and style source for static readers.
 *
 * 从有序标记构建 DOM，属性与普通文本仅解码一次；脚本与样式保留原文供静态读取。
 */
function parseDocument(input: string): Document {
  const handler = new DomHandler()
  const names: string[] = []
  let manuallyClosed: Set<number> | undefined
  let attributes: Record<string, string> = {}
  let attributeName = ''
  let instructionTarget = ''

  /**
   * Close cells, rows and sections only within their table, retaining the tokenizer stack for later END tokens.
   * Track closed frames by stack index to avoid closing them twice; synthetic zero-width token positions cannot identify frames.
   *
   * 省略结束标记时，仅关闭同一表格内的单元格、行及分区；保留 tokenizer 栈以对应后续 END 标记。
   * 按栈索引记录已关闭帧，防止重复关闭；零宽补齐标记的位置不能识别对应帧。
   */
  function closeTableScope(name: string): void {
    const cell = name === 'td' || name === 'th'
    const row = name === 'tr'
    let target = -1
    for (let index = names.length - 1; index >= 0; index--) {
      if (manuallyClosed?.has(index)) continue
      const current = names[index]
      if (current === 'table') break
      const currentCell = current === 'td' || current === 'th'
      if (cell) {
        if (currentCell) {
          target = index
          break
        }
      } else if (row) {
        if (current === 'tr') {
          target = index
          break
        }
        if (currentCell) target = index
      } else if (
        currentCell ||
        current === 'tr' ||
        current === 'thead' ||
        current === 'tbody' ||
        current === 'tfoot'
      )
        target = index
    }
    if (target < 0) return
    const closed = (manuallyClosed ??= new Set<number>())
    for (let index = names.length - 1; index >= target; index--) {
      if (closed.has(index)) continue
      handler.onclosetag()
      closed.add(index)
    }
  }

  tokenizer.tokenizeDocument(input, (token, start, end) => {
    switch (token) {
      case 'START_TAG_NAME': {
        const name = input.slice(start, end).toLowerCase()
        if (
          name === 'td' ||
          name === 'th' ||
          name === 'tr' ||
          name === 'thead' ||
          name === 'tbody' ||
          name === 'tfoot'
        )
          closeTableScope(name)
        attributes = {}
        names.push(name)
        handler.onopentag(name, attributes)
        break
      }
      case 'START_TAG_CLOSING':
        break
      case 'ATTRIBUTE_NAME':
        attributeName = input.slice(start, end).toLowerCase()
        break
      case 'ATTRIBUTE_VALUE':
        if (!Object.hasOwn(attributes, attributeName)) {
          const value = decodeHTMLAttribute(input.slice(start, end))
          /**
           * Store the attribute as an own property to avoid invoking the prototype setter.
           *
           * 将属性保存为自有字段，避免触发原型 setter。
           */
          if (attributeName === '__proto__')
            Object.defineProperty(attributes, attributeName, {
              value,
              enumerable: true,
              configurable: true,
              writable: true,
            })
          else attributes[attributeName] = value
        }
        break
      case 'TEXT': {
        const value = input.slice(start, end)
        handler.ontext(RAW_TEXT_TAGS.has(names.at(-1) ?? '') ? value : decodeHTML(value))
        break
      }
      case 'START_TAG_SELF_CLOSING':
      case 'END_TAG_NAME':
        names.pop()
        if (!manuallyClosed?.delete(names.length)) handler.onclosetag()
        break
      case 'COMMENT':
        handler.oncomment(input.slice(start, end))
        handler.oncommentend()
        break
      case 'CDATA_SECTION':
        handler.oncdatastart()
        handler.ontext(input.slice(start, end))
        handler.oncdataend()
        break
      case 'DOCTYPE_NAME':
        handler.onprocessinginstruction('!doctype', `!DOCTYPE ${input.slice(start, end)}`)
        break
      case 'PROCESSING_INSTRUCTION_TARGET':
        instructionTarget = input.slice(start, end)
        break
      case 'PROCESSING_INSTRUCTION_DATA':
        handler.onprocessinginstruction(
          `?${instructionTarget}`,
          `${instructionTarget} ${input.slice(start, end)}`,
        )
        break
    }
  })
  handler.onend()
  return handler.root
}

/**
 * Parse HTML once, reusing parsed nodes to add document containers when a body is absent.
 *
 * HTML 仅解析一次；没有 body 的片段复用已解析节点补充文档容器。
 */
export function parseHtmlDocument(input: string): Document {
  const document = parseDocument(input)
  if (getElementsByTagName('body', document, true, 1).length > 0) return document
  const html = new Element('html', {})
  const head = new Element('head', {})
  const body = new Element('body', {})
  const contents = document.children.slice()
  appendChild(document, html)
  appendChild(html, head)
  appendChild(html, body)
  for (const node of contents) if (!(node instanceof ProcessingInstruction)) appendChild(body, node)
  return document
}
