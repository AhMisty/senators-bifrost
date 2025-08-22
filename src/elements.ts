export class Elements {
  private readonly map: Map<number, number>
  constructor(elements?: Elements) {
    this.map = new Map(elements?.map)
  }
  public toString(prefix: string = '', suffix: string = ''): string {
    const arr: string[] = []
    for (const item of this.map) {
      arr.push(`${encodeURIComponent(prefix)}${item[0]}${encodeURIComponent(suffix)}=${item[1]}`)
    }
    return arr.join('&')
  }
  public clear(): void {
    this.map.clear()
  }
  public get(id: number): number {
    return this.map.get(id) || 0
  }
  public set(id: number, count: number): void {
    if (count) {
      this.map.set(id, count)
    } else {
      this.map.delete(id)
    }
  }
  public add(id: number, count: number): void {
    this.set(id, this.get(id) + count)
  }
}
