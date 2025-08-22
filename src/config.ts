export type ConfigOptions = {
  token?: string
}

export class Config {
  public token: string
  constructor(options?: ConfigOptions) {
    this.token = options?.token ?? '2Moons'
  }
}
