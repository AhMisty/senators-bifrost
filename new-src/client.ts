// HTTP 薄层：仅负责 URL 拼接、超时与可选的重定向策略，其余全部透传给 fetch。
// 设计原则是不过度封装：不预读响应 body、不吞错误（网络/超时原样抛出）、
// 不自动序列化 body、不强制重定向模式，get/post 直接返回原始 Response 供调用方流式消费。
// 传输层可通过 options.fetch 注入自定义实现（默认 globalThis.fetch）。
export type Fetch = typeof globalThis.fetch

export type ClientOptions = {
  base: string
  // 请求超时（毫秒），默认 10000；0 表示立即中止。无「禁用超时」开关，可用 Number.MAX_SAFE_INTEGER 近似。
  timeout?: number
  // 自定义 fetch 实现，默认 globalThis.fetch，在构造时解析（便于测试时先替换全局再构造）
  fetch?: Fetch
}

export type ClientGetOptions = {
  url: string
  // 索引访问而非直接用 HeadersInit 等名字：@types/node 未把它们声明为全局类型（与旧 courier 的 RequestHeaders 一致）
  headers?: RequestInit['headers']
  // 不传则使用 fetch 原生默认 'follow'；需要读取 3xx 响应头（如登录的 Set-Cookie）时才显式传 'manual'
  redirect?: RequestInit['redirect']
  // 单请求超时覆盖，缺省用 ClientOptions.timeout
  timeout?: number
}

export type ClientPostOptions = ClientGetOptions & {
  body?: RequestInit['body']
}

export class Client {
  public readonly base: string
  public readonly timeout: number
  public readonly fetch: Fetch
  // 构造时解析并校验 base（非法值立即抛 TypeError，而非等到第一次请求）；请求时直接复用解析结果
  private readonly baseUrl: URL

  constructor(options: ClientOptions) {
    this.baseUrl = new URL(options.base)
    this.base = options.base
    this.timeout = options.timeout ?? 10000
    this.fetch = options.fetch ?? globalThis.fetch
  }

  private async request(
    options: ClientGetOptions & { body?: RequestInit['body']; method: 'GET' | 'POST' },
  ): Promise<Response> {
    const { url, headers, redirect, timeout, body, method } = options
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout ?? this.timeout)
    try {
      return await this.fetch(new URL(url, this.baseUrl), {
        method,
        headers,
        body,
        redirect,
        signal: controller.signal,
      })
    } finally {
      // 无论成功失败都清除定时器；定时器清掉后信号不会再触发，不会误伤已返回的响应 body 流。
      // 超时只覆盖到响应头到达为止（fetch 在收到响应头时 resolve）。
      clearTimeout(id)
    }
  }

  public get(options: ClientGetOptions): Promise<Response> {
    return this.request({ ...options, method: 'GET' })
  }

  public post(options: ClientPostOptions): Promise<Response> {
    return this.request({ ...options, method: 'POST' })
  }
}
