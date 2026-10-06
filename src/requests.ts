import type { HttpResponse } from './protocol/client.ts'
import { encodeParameters } from './protocol/parameters.ts'
import type { Session } from './session.ts'
import type { RequestParameters } from './types.ts'

export type GetOptions = {
  /**
   * Resolved against the installation directory.
   *
   * 相对于安装目录解析。
   */
  url: string
}

export type PostOptions = GetOptions & { body: RequestParameters }

/**
 * Send a GET request using the session policies.
 *
 * 使用会话策略发送 GET 请求。
 *
 * @returns The undecoded text response; redirects are not followed.
 *
 * 未解码的文本响应；重定向不跟随。
 */
export function get(session: Session, options: GetOptions): Promise<HttpResponse> {
  return session.request({ url: new URL(options.url, session.baseUrl) })
}

/**
 * Submit a URL-encoded form using the session policies.
 *
 * 使用会话策略提交 URL 编码表单。
 *
 * @returns The undecoded text response; redirects are not followed.
 *
 * 未解码的文本响应；重定向不跟随。
 */
export function post(session: Session, options: PostOptions): Promise<HttpResponse> {
  return session.request({
    url: new URL(options.url, session.baseUrl),
    method: 'POST',
    body: encodeParameters(options.body),
  })
}
