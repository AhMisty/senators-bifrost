import { parseScript } from 'meriyah'
import type { ESTree } from 'meriyah'

import { ErrorCode } from '../types.ts'
import { refusalText } from './numbers.ts'
import { OperationError } from './result.ts'

type Node = ESTree.Node
type Expression = ESTree.Expression
type Program = ESTree.Program
type CallExpression = ESTree.CallExpression

/**
 * Static script data; numbers retain source text and expressions are never executed.
 *
 * 静态脚本数据；数字保留为源文本，不执行表达式。
 */
export type StaticValue = string | boolean | null | StaticValue[] | { [key: string]: StaticValue }

export type StaticObject = { [key: string]: StaticValue }

/**
 * Inline script observations with static values, expression source, skipped calls and syntax errors.
 *
 * 内联脚本观测结果，分别保留静态值、表达式源码、跳过调用与语法错误。
 */
export type ScriptSnapshot = {
  bindings: { name: string; data: StaticValue }[]

  calls: { name: string; arguments: StaticValue[] }[]

  expressions: { name: string; source: string }[]

  skippedCalls: { scriptIndex: number; name: string }[]

  unparsed: { scriptIndex: number; message: string }[]
}

/**
 * Require a static object; arrays, scalars and nullish values raise a parse error.
 *
 * 要求静态值为普通对象；数组、标量及空值抛出解析错误。
 */
export function object(value: StaticValue | undefined): StaticObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new OperationError(ErrorCode.ParseError, 'Expected static object')
  return value
}

/**
 * Bound remote script depth; AST traversal includes wrapper nodes beyond decoded data.
 *
 * 限制远端脚本深度；AST 遍历还会经过数据解码之外的包装节点。
 */
const MAX_VALUE_DEPTH = 64
const MAX_WALK_DEPTH = 128

/**
 * Object properties share expression and destructuring types; the decoder rejects non-static nodes.
 *
 * 对象属性共享表达式与解构模式类型；解码器统一拒绝非静态节点。
 */
function decode(node: Node, source: string, depth = 0): StaticValue {
  if (depth > MAX_VALUE_DEPTH)
    throw new OperationError(ErrorCode.ParseError, 'Static data is too deeply nested')
  switch (node.type) {
    case 'Literal': {
      const value = node.value

      if (typeof value === 'string' || typeof value === 'boolean' || value === null) return value
      if (typeof value === 'number') return source.slice(node.start, node.end)
      break
    }
    case 'UnaryExpression':
      if (
        ['-', '+'].includes(node.operator) &&
        node.argument.type === 'Literal' &&
        typeof node.argument.value === 'number'
      )
        return node.operator + source.slice(node.argument.start, node.argument.end)
      break
    case 'ArrayExpression':
      return node.elements.map((item) => {
        if (!item || item.type === 'SpreadElement')
          throw new OperationError(ErrorCode.ParseError, 'Non-static array entry')
        return decode(item, source, depth + 1)
      })
    case 'ObjectExpression': {
      const result: StaticObject = {}
      for (const property of node.properties) {
        if (
          property.type !== 'Property' ||
          property.kind !== 'init' ||
          property.computed ||
          property.method ||
          property.shorthand
        )
          throw new OperationError(ErrorCode.ParseError, 'Non-static object property')

        const key =
          property.key.type === 'Literal'
            ? String(property.key.value)
            : source.slice(property.key.start, property.key.end)
        if (Object.hasOwn(result, key))
          throw new OperationError(ErrorCode.ParseError, 'Duplicate data key')

        /**
         * Keep __proto__ as a writable own data property without changing the prototype.
         *
         * 将 __proto__ 保留为可写的自有数据字段，避免改变原型。
         */
        Object.defineProperty(result, key, {
          value: decode(property.value, source, depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        })
      }
      return result
    }
  }
  throw new OperationError(ErrorCode.ParseError, `Executable data is not supported: ${node.type}`)
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
  )
}

function isCall(node: Node): node is CallExpression {
  return node.type === 'CallExpression'
}

function visit(node: Node, callback: (node: Node) => void, depth = 0): void {
  if (depth > MAX_WALK_DEPTH)
    throw new OperationError(ErrorCode.ParseError, 'Script is too deeply nested')
  callback(node)
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((child: unknown) => {
        if (isNode(child)) visit(child, callback, depth + 1)
      })
    } else if (isNode(value)) visit(value, callback, depth + 1)
  }
}

function mentions(source: string, name: string): boolean {
  let at = source.indexOf(name)
  while (at >= 0) {
    const before = at === 0 ? '' : source.charAt(at - 1)
    const after = source[at + name.length] ?? ''
    if (!/[\w$]/.test(before) && !/[\w$]/.test(after)) return true
    at = source.indexOf(name, at + 1)
  }
  return false
}

function* topLevelBindings(
  tree: Program,
): Generator<{ name: string; expression: Expression }, void, void> {
  for (const statement of tree.body) {
    if (statement.type === 'VariableDeclaration') {
      for (const entry of statement.declarations)
        if (entry.id.type === 'Identifier' && entry.init)
          yield { name: entry.id.name, expression: entry.init }
    } else if (statement.type === 'ExpressionStatement') {
      const expression = statement.expression
      if (
        expression.type === 'AssignmentExpression' &&
        expression.operator === '=' &&
        expression.left.type === 'Identifier'
      )
        yield { name: expression.left.name, expression: expression.right }
    }
  }
}

/**
 * Wrap inline event source as a function body to support return statements.
 *
 * 将内联事件源码包装为函数体，以支持 return 调用。
 */
export function handlerProgram(source: string): string {
  return `function handler(){\n${source}\n}`
}

function callArguments(tree: Program, name: string, source: string): StaticValue[][] {
  const matches: StaticValue[][] = []
  visit(tree, (node) => {
    if (!isCall(node)) return
    if (node.callee.type !== 'Identifier' || node.callee.name !== name) return
    matches.push(
      node.arguments.map((argument) => {
        if (argument.type === 'SpreadElement')
          throw new OperationError(ErrorCode.ParseError, 'Non-static call argument')
        return decode(argument, source)
      }),
    )
  })
  return matches
}

/**
 * Extract static script data without executing remote code.
 *
 * 提取脚本中的静态数据，不执行远端代码。
 */
export class ScriptData {
  private snapshotData?: ScriptSnapshot
  private readonly trees = new Map<string, Program>()
  private readonly sources: string[]
  constructor(sources: string[]) {
    this.sources = sources
  }
  private tree(source: string): Program {
    const cached = this.trees.get(source)
    if (cached) return cached
    /**
     * Use browser script syntax with source offsets and lexical checks; parentheses leave static data unchanged.
     *
     * 页面脚本采用浏览器语法，保留源码偏移并检查词法绑定；括号不改变静态数据形状。
     */
    const tree = parseScript(source, {
      ranges: { start: true, end: true },
      webcompat: true,
      lexical: true,
      preserveParens: false,
      validateRegex: true,
    })
    this.trees.set(source, tree)
    return tree
  }

  private parsed(source: string): Program {
    try {
      return this.tree(source)
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      throw new OperationError(ErrorCode.ParseError, 'Invalid script', undefined, { cause: error })
    }
  }
  private candidates(name: string): Array<{ source: string; tree: Program }> {
    return this.sources
      .filter((source) => mentions(source, name))
      .map((source) => ({ source, tree: this.parsed(source) }))
  }

  private handler(source: string): { wrapped: string; tree: Program } | null {
    const wrapped = handlerProgram(source)
    try {
      return { wrapped, tree: this.tree(wrapped) }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      return null
    }
  }

  /**
   * Read first numeric arguments of named member calls, preserving their source text.
   *
   * 读取指定成员调用的首个数字参数，保留数字源文本。
   */
  memberNumbers(source: string | undefined, member: string): string[] {
    return this.memberArguments(source, member, 'number')
  }
  /**
   * Read one named member call's string argument, or null when ambiguous.
   *
   * 读取唯一指定成员调用的字符串参数；不唯一时返回 null。
   */
  memberText(source: string | undefined, member: string): string | null {
    const matches = this.memberArguments(source, member, 'string')
    const [only = null] = matches
    return matches.length === 1 ? only : null
  }

  /**
   * Parse inline handlers through the shared cache and return named calls' static arguments.
   *
   * 通过共享缓存解析内联处理器，返回指定调用的静态参数。
   */
  handlerCalls(source: string, name: string): StaticValue[][] {
    const wrapped = handlerProgram(source)
    if (!mentions(wrapped, name)) return []
    return callArguments(this.parsed(wrapped), name, wrapped)
  }
  private memberArguments(
    source: string | undefined,
    member: string,
    kind: 'number' | 'string',
  ): string[] {
    const parsed = source === undefined ? null : this.handler(source)
    if (!parsed) return []
    const { wrapped, tree } = parsed
    const matches: string[] = []
    visit(tree, (node) => {
      if (!isCall(node)) return
      const callee = node.callee
      if (
        callee.type !== 'MemberExpression' ||
        callee.computed ||
        callee.property.type !== 'Identifier' ||
        callee.property.name !== member
      )
        return
      const argument = node.arguments[0]
      if (argument?.type !== 'Literal') return

      if (kind === 'number' && typeof argument.value === 'number')
        matches.push(wrapped.slice(argument.start, argument.end))
      else if (kind === 'string' && typeof argument.value === 'string') matches.push(argument.value)
    })
    return matches
  }

  /**
   * Read top-level bindings; only requires uniqueness and last selects the final assignment.
   *
   * 读取顶层变量或赋值；only 要求唯一，last 选择最后一次赋值。
   */
  binding(name: string, occurrence: 'only' | 'last' = 'only'): StaticValue {
    let match: { expression: Expression; source: string } | undefined
    let count = 0
    for (const { source, tree } of this.candidates(name))
      for (const entry of topLevelBindings(tree))
        if (entry.name === name) {
          match = { expression: entry.expression, source }
          count++
        }
    if (!match || (occurrence === 'only' && count !== 1))
      throw new OperationError(
        ErrorCode.ParseError,
        `Expected ${occurrence === 'only' ? 'one' : 'at least one'} ${name} binding, found ${count}`,
      )
    return decode(match.expression, match.source)
  }
  /**
   * Read static arguments of named function calls in script order.
   *
   * 按脚本顺序读取指定函数调用的静态参数。
   */
  calls(name: string): StaticValue[][] {
    return this.candidates(name).flatMap(({ source, tree }) => callArguments(tree, name, source))
  }

  /**
   * Cache script observations, recording nonstatic expressions and calls separately.
   *
   * 缓存脚本观测；不可静态解码的表达式与调用单独记录。
   */
  snapshot(): ScriptSnapshot {
    if (this.snapshotData) return this.snapshotData
    const result: ScriptSnapshot = {
      bindings: [],
      calls: [],
      expressions: [],
      skippedCalls: [],
      unparsed: [],
    }
    this.sources.forEach((source, scriptIndex) => {
      let tree: Program
      try {
        tree = this.tree(source)
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error
        result.unparsed.push({ scriptIndex, message: refusalText(error) })
        return
      }
      const binding = (name: string, expression: Expression) => {
        try {
          result.bindings.push({ name, data: decode(expression, source) })
        } catch (error) {
          if (!(error instanceof OperationError) || error.code !== ErrorCode.ParseError) throw error
          result.expressions.push({ name, source: source.slice(expression.start, expression.end) })
        }
      }
      for (const { name, expression } of topLevelBindings(tree)) binding(name, expression)
      visit(tree, (node) => {
        if (!isCall(node) || node.callee.type !== 'Identifier') return
        const name = node.callee.name
        try {
          const args = node.arguments.map((argument) => {
            if (argument.type === 'SpreadElement')
              throw new OperationError(ErrorCode.ParseError, 'Dynamic call argument')
            return decode(argument, source)
          })
          result.calls.push({ name, arguments: args })
        } catch (error) {
          if (!(error instanceof OperationError) || error.code !== ErrorCode.ParseError) throw error

          result.skippedCalls.push({ scriptIndex, name })
        }
      })
    })
    this.snapshotData = result
    return result
  }
}
