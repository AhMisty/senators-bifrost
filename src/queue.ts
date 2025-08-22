export class QueueElement {
  constructor(
    public readonly element: number,
    public readonly count: number,
  ) {}
}

export class Queue {
  public readonly array: number[][] = []
  public clear(): void {
    this.array.length = 0
  }
  public push(element: number, count: number): void {
    this.array.push([element, count])
  }
  public getLastCount(element: number): number {
    let count = 0
    for (const item of this.array) {
      if (item[0] === element) {
        count = item[1]
      }
    }
    return count
  }
  public getTotalCount(element: number): number {
    let count = 0
    for (const item of this.array) {
      if (item[0] === element) {
        count += item[1]
      }
    }
    return count
  }
}
