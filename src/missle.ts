import { type FleetTarget } from './fleet'

export type MissileOptions = {
  origin: number
  target: FleetTarget
  count: number
  firstTarget: number
}

export class Missle {
  origin: number
  target: FleetTarget
  count: number
  firstTarget: number
  constructor(options: MissileOptions) {
    this.origin = options.origin
    this.target = options.target
    this.count = options.count
    this.firstTarget = options.firstTarget
  }
}
