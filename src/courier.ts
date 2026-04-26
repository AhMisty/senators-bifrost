export type RequestBody = string | URLSearchParams | object
export type RequestHeaders = RequestInit['headers']

export type CourierOptions = {
  base: string
  timeout?: number
}

export type CourierGetOptions = {
  url: string
  headers?: RequestHeaders
}

export type CourierPostOptions = {
  url: string
  body: RequestBody
  headers?: RequestHeaders
}

export class Courier {
  public base: string
  public timeout: number
  constructor(options: CourierOptions) {
    this.base = options.base
    this.timeout = options.timeout ?? 10000
  }
  private async request(url: string, init: RequestInit): Promise<false | Response> {
    const abort_controller = new AbortController()
    const id = setTimeout(() => abort_controller.abort(), this.timeout)
    try {
      return await fetch(new URL(url, this.base), {
        ...init,
        redirect: 'manual',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: abort_controller.signal,
      })
    } catch {
      return false
    } finally {
      clearTimeout(id)
    }
  }

  private serializeBody(body: RequestBody): string {
    if (typeof body === 'string') return body
    if (body instanceof URLSearchParams) return body.toString()
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(body)) {
      params.append(key, String(value))
    }
    return params.toString()
  }

  public async get(options: CourierGetOptions): Promise<false | Response> {
    return await this.request(options.url, {
      method: 'GET',
      headers: options.headers,
    })
  }

  public async post(options: CourierPostOptions): Promise<false | Response> {
    return await this.request(options.url, {
      method: 'POST',
      headers: options.headers,
      body: this.serializeBody(options.body),
    })
  }
}
