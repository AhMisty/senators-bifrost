import { checkResponseStatus } from './result.ts'

export type Fetch = typeof globalThis.fetch

/**
 * Transport settings; baseUrl must name an installation directory ending in /.
 *
 * 传输设置；baseUrl 必须为以 / 结尾的安装目录。
 */
export type ClientOptions = {
  baseUrl: string

  /**
   * Custom transport is called without a receiver.
   *
   * 自定义传输以普通函数调用，不绑定 this。
   */
  fetch?: Fetch
}

/**
 * Complete response; redirects are not followed and observedAtMs is the local Unix millisecond timestamp at body completion.
 *
 * 完整响应；重定向不跟随，observedAtMs 为正文读取完成时的本地 Unix 毫秒时间戳。
 */
export type HttpResponse<Body = string> = {
  url: URL
  status: number
  headers: Headers
  body: Body

  observedAtMs: number
}

export type BinaryResponse = HttpResponse<Uint8Array>
export type ResponseHead = Pick<HttpResponse, 'url' | 'status' | 'headers'>

export function isRedirect(response: Pick<HttpResponse, 'status'>): boolean {
  return response.status >= 300 && response.status < 400
}

export class Client {
  private readonly installationUrl: URL
  private readonly fetch: Fetch

  constructor(options: ClientOptions) {
    this.installationUrl = new URL(options.baseUrl)
    this.fetch = options.fetch ?? globalThis.fetch
  }

  get baseUrl(): URL {
    return new URL(this.installationUrl)
  }

  private async receive<Body extends string | Uint8Array>(
    method: 'GET' | 'POST',
    url: URL,
    headers: NonNullable<RequestInit['headers']>,
    body: URLSearchParams | undefined,
    readBody: (response: Response) => Promise<Body>,
  ): Promise<HttpResponse<Body>> {
    const { fetch } = this

    /**
     * Copy the address so later caller mutations cannot change response identity.
     *
     * 复制地址以隔离调用方后续对 URL 的修改。
     */
    const address = new URL(url)
    const response = await fetch(address, {
      method,
      headers,
      redirect: 'manual',
      ...(body === undefined ? {} : { body }),
    })
    const result = {
      url: address,
      status: response.status,
      headers: response.headers,
      body: await readBody(response),
      observedAtMs: Date.now(),
    }
    checkResponseStatus(result)
    return result
  }

  async request(
    method: 'GET' | 'POST',
    url: URL,
    headers: NonNullable<RequestInit['headers']>,
    body?: URLSearchParams,
  ): Promise<HttpResponse> {
    return this.receive(method, url, headers, body, (response) => response.text())
  }

  async requestBytes(
    method: 'GET' | 'POST',
    url: URL,
    headers: NonNullable<RequestInit['headers']>,
    body?: URLSearchParams,
  ): Promise<BinaryResponse> {
    return this.receive(
      method,
      url,
      headers,
      body,
      async (response) => new Uint8Array(await response.arrayBuffer()),
    )
  }
}
