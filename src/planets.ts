import { Coordinate } from './coordinate'
import { Elements } from './elements'
import { Queue } from './queue'

export const enum PlanetType {
  Planet = 1,
  Debris = 2,
  Moon = 3,
}

export class Planet {
  public readonly coordinate: Coordinate
  public readonly elements: Elements
  public readonly queues: {
    building: Queue
    shipyard: Queue
  } = {
    building: new Queue(),
    shipyard: new Queue(),
  }
  public set(name: string, size: number, used: number, coordinateString: string): void {
    this.name = name
    this.size = size
    this.used = used
    this.coordinate.set(coordinateString)
  }
  constructor(
    public readonly id: number,
    public readonly type: PlanetType,
    public name: string,
    public size: number,
    public used: number,
    coordinateString: string,
  ) {
    this.coordinate = new Coordinate(coordinateString)
    this.elements = new Elements()
  }
}

export class Planets {
  public readonly map: Map<number, Planet> = new Map<number, Planet>()
  public set(
    id: number,
    type: PlanetType,
    name: string,
    size: number,
    used: number,
    coordinateString: string,
  ): Planet {
    let planet = this.map.get(id)
    if (planet) {
      planet.set(name, size, used, coordinateString)
    } else {
      planet = new Planet(id, type, name, size, used, coordinateString)
      this.map.set(id, planet)
    }
    return planet
  }
}
