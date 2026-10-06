const HANDLER_SCHEME = /^javascript:/i

/**
 * Remove a case-insensitive javascript: prefix without executing code.
 *
 * 移除大小写不敏感的 javascript: 前缀，不执行代码。
 */
export function handlerBody(value: string): string {
  return value.replace(HANDLER_SCHEME, '')
}

/**
 * Read source from a JavaScript address; ordinary links return null.
 *
 * 读取 JavaScript 地址中的源码；普通链接返回 null。
 */
export function handlerAddress(address: string | undefined): string | null {
  if (typeof address !== 'string' || !HANDLER_SCHEME.test(address)) return null
  return handlerBody(address)
}
