import { compile, selectAll } from 'css-select'
import type { ChildNode } from 'domhandler'
import * as DomUtils from 'domutils'

import { parseHtmlDocument } from './html.ts'

export type SelectedNode = ChildNode
export type SelectedElement = Extract<SelectedNode, { attribs: Record<string, string> }>

export function isElement(node: SelectedNode): node is SelectedElement {
  return 'attribs' in node
}

type SelectorPredicate = ReturnType<typeof compile<SelectedNode, SelectedElement>>

const SELECTOR_CACHE_LIMIT = 1024
const SELECTORS = new Map<string, SelectorPredicate>()
const CONTEXT_SELECTOR = /(^|,)\s*[>+~]|:scope\b/i

/**
 * Cache selector compilation without caching matches, so DOM mutations remain visible.
 *
 * 缓存选择器编译结果；读取器修改 DOM 后仍重新判断节点，不缓存匹配结果。
 */
function compileSelector(selector: string): SelectorPredicate {
  const cached = SELECTORS.get(selector)
  if (cached !== undefined) return cached
  const query = compile<SelectedNode, SelectedElement>(selector, { cacheResults: false })
  if (SELECTORS.size >= SELECTOR_CACHE_LIMIT) SELECTORS.clear()
  SELECTORS.set(selector, query)
  return query
}

function unique<T extends SelectedNode>(nodes: readonly T[]): T[] {
  return [...new Set(nodes)]
}

/**
 * Ordered DOM nodes used by page readers.
 *
 * 供页面读取器使用的有序 DOM 节点集合。
 */
export class Selection<T extends SelectedNode = SelectedNode> {
  private readonly nodes: readonly T[]

  constructor(nodes: readonly T[]) {
    this.nodes = nodes
  }

  get length(): number {
    return this.nodes.length
  }

  node(index = 0): T | undefined {
    return this.nodes.at(index)
  }

  toArray(): T[] {
    return [...this.nodes]
  }

  eq(index: number): Selection<T> {
    const node = this.node(index)
    return new Selection(node === undefined ? [] : [node])
  }

  first(): Selection<T> {
    return this.eq(0)
  }

  last(): Selection<T> {
    return this.eq(-1)
  }

  slice(start: number, end?: number): Selection<T> {
    return new Selection(this.nodes.slice(start, end))
  }

  find(selector: string): Selection<SelectedElement> {
    const query = CONTEXT_SELECTOR.test(selector) ? selector : compileSelector(selector)
    return new Selection(
      unique(this.nodes.flatMap((node) => selectAll<SelectedNode, SelectedElement>(query, node))),
    )
  }

  filter(selector: string | ((index: number, node: T) => boolean)): Selection<T> {
    if (typeof selector === 'function')
      return new Selection(this.nodes.filter((node, index) => selector(index, node)))
    return new Selection(this.nodes.filter(compileSelector(selector)))
  }

  is(selector: string): boolean {
    return this.nodes.some(compileSelector(selector))
  }

  not(selector: string): Selection<T> {
    const matches = compileSelector(selector)
    return this.filter((_index, node) => !matches(node))
  }

  hasClass(name: string): boolean {
    return this.nodes.some(
      (node) => isElement(node) && node.attribs.class?.split(/\s+/).includes(name),
    )
  }

  each(callback: (index: number, node: T) => void): void {
    this.nodes.forEach((node, index) => callback(index, node))
  }

  attr(name: string): string | undefined {
    const node = this.node()
    return node !== undefined && isElement(node) ? node.attribs[name] : undefined
  }

  text(): string {
    return DomUtils.textContent(this.toArray())
  }

  html(): string | null {
    const node = this.node()
    return node !== undefined && 'children' in node ? DomUtils.getInnerHTML(node) : null
  }

  children(selector?: string): Selection<SelectedElement> {
    const children = unique(
      this.nodes.flatMap((node) => ('children' in node ? node.children.filter(isElement) : [])),
    )
    const result = new Selection(children)
    return selector === undefined ? result : result.filter(selector)
  }

  contents(): Selection {
    return new Selection(
      unique(this.nodes.flatMap((node) => ('children' in node ? node.children : []))),
    )
  }

  parent(selector?: string): Selection<SelectedElement> {
    const parents = unique(
      this.nodes.flatMap((node) =>
        node.parent !== null && isElement(node.parent) ? [node.parent] : [],
      ),
    )
    const result = new Selection(parents)
    return selector === undefined ? result : result.filter(selector)
  }

  parents(selector: string): Selection<SelectedElement> {
    const matches = compileSelector(selector)
    const parents: SelectedElement[] = []
    for (const node of this.nodes)
      for (let parent = node.parent; parent !== null; parent = parent.parent)
        if (isElement(parent) && matches(parent)) parents.push(parent)
    return new Selection(unique(parents))
  }

  closest(selector: string): Selection<SelectedElement> {
    const matches = compileSelector(selector)
    const found: SelectedElement[] = []
    for (const node of this.nodes) {
      let current: SelectedNode | null = node
      while (current !== null) {
        if (isElement(current) && matches(current)) {
          found.push(current)
          break
        }
        current = current.parent
      }
    }
    return new Selection(unique(found))
  }

  next(selector?: string): Selection<SelectedElement> {
    const nodes = unique(
      this.nodes.flatMap((node) => {
        const next = DomUtils.nextElementSibling(node)
        return next === null ? [] : [next]
      }),
    )
    const result = new Selection(nodes)
    return selector === undefined ? result : result.filter(selector)
  }

  siblings(selector: string): Selection<SelectedElement> {
    const nodes = unique(
      this.nodes.flatMap((node) =>
        DomUtils.getSiblings(node)
          .filter(isElement)
          .filter((sibling) => sibling !== node),
      ),
    )
    return new Selection(nodes).filter(selector)
  }

  clone(): Selection {
    return new Selection(this.nodes.map((node) => node.cloneNode(true)))
  }

  /**
   * Move nodes beneath the first selected node without cloning them.
   *
   * 将节点移动到集合首节点下，不复制节点。
   *
   * @param content - Nodes detached from their original parents; unchanged when the target cannot contain children.
   *
   * 从原父节点移出的节点；目标无法包含子节点时不作修改。
   */
  append(content: Selection): void {
    const parent = this.node()
    if (parent !== undefined && 'children' in parent)
      for (const node of content.toArray()) DomUtils.appendChild(parent, node)
  }

  /**
   * Detach selected nodes from their document while retaining references in this selection.
   *
   * 从原文档移除选中节点；集合仍保留这些节点的引用。
   */
  remove(): void {
    for (const node of this.nodes) DomUtils.removeElement(node)
  }
}

export type Select = {
  (input: string): Selection<SelectedElement>
  (input: SelectedNode): Selection
}

/**
 * Parse HTML, adding document containers to fragments without a body.
 *
 * 解析 HTML；无 body 的片段补充文档容器。
 */
export function parseHtml(html: string): Select {
  const document = parseHtmlDocument(html)
  const root = new Selection([document])
  function select(input: string): Selection<SelectedElement>
  function select(input: SelectedNode): Selection
  function select(input: string | SelectedNode): Selection {
    return typeof input === 'string' ? root.find(input) : new Selection([input])
  }
  return select
}
