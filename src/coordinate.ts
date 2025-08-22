import { numericalString } from './utils/numericalString'

export class Coordinate {
  public array: number[] = []
  public set(str: string): void {
    this.array = str.split(':').map(numericalString)
  }
  public toString(): string {
    return this.array.join(':')
  }
  constructor(coordinateString: string) {
    this.set(coordinateString)
  }
}
