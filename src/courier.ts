export class Courier {
  public base: string
  public timeout: number
  constructor(base: string, timeout: number) {
    this.base = base
    this.timeout = timeout
  }
  public async get(url: string, headers?: HeadersInit): Promise<false | Response> {
    const abort_controller = new AbortController()
    const id = setTimeout(() => abort_controller.abort(), this.timeout)
    try {
      const response = await fetch(new URL(url, this.base), {
        method: 'GET',
        headers: {
          ...headers,
        },
        redirect: 'manual',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: abort_controller.signal,
      })
      clearTimeout(id)
      return response
    } catch {
      clearTimeout(id)
      return false
    }
  }
  public async post(url: string, body: any, headers?: HeadersInit): Promise<false | Response> {
    const abort_controller = new AbortController()
    const id = setTimeout(() => abort_controller.abort(), this.timeout)
    try {
      const response = await fetch(new URL(url, this.base), {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: new URLSearchParams(body).toString(),
        redirect: 'manual',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: abort_controller.signal,
      })
      clearTimeout(id)
      return response
    } catch {
      clearTimeout(id)
      return false
    }
  }
}
