type RequestBody = string | URLSearchParams | Readonly<Record<string, unknown>>
type RequestHeaders = RequestInit['headers']

export class Courier {
  public base: string
  public timeout: number
  constructor(base: string, timeout: number) {
    this.base = base
    this.timeout = timeout
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

  public async get(url: string, headers?: RequestHeaders): Promise<false | Response> {
    return await this.request(url, {
      method: 'GET',
      headers,
    })
  }

  public async post(
    url: string,
    body: RequestBody,
    headers?: RequestHeaders,
  ): Promise<false | Response> {
    return await this.request(url, {
      method: 'POST',
      headers,
      body: this.serializeBody(body),
    })
  }
}
