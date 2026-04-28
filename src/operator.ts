import { Courier, type RequestBody } from './courier'
import { Elements } from './elements'
import { Planet, Planets } from './planets'
import { Queue } from './queue'
import { Fleet } from './fleet'
import { Config } from './config'
import { parseId } from './parsers/id'
import { parseResource } from './parsers/resource'
import { parseControl } from './parsers/control'
import { parseQueueResearch } from './parsers/queue/research'
import { parseBuildResearch } from './parsers/build/research'
import { parseQueueBuilding } from './parsers/queue/building'
import { parseBuildBuilding } from './parsers/build/building'
import { parseQueueShipyard } from './parsers/queue/shipyard'
import { parseBuildShipyard } from './parsers/build/shipyard'
import { parseEnergy } from './parsers/energy'
import { parseLimit } from './parsers/limit'
import { parseFleetAllyContent, parseFleetToken } from './parsers/fleet'

export type OperatorOptions = {
  universe: number
  username: string
  password: string
  courier: Courier
  config: Config
}

export type OperatorGetOptions = {
  url: string
}

export type OperatorPostOptions = {
  url: string
  body: RequestBody
}

export type UpdatePlanetOptions =
  | {
      planetId: number
    }
  | {
      planet: Planet
    }

export type OperatorEvent = {
  operator: Operator
}

export type OperatorBodyEvent = OperatorEvent & {
  body: string
}

export type OperatorGetEvent = OperatorEvent & OperatorGetOptions

export type OperatorPostEvent = OperatorEvent & OperatorPostOptions

export type OperatorPlanetEvent = OperatorEvent & {
  planet: Planet
}

export type OperatorPlanetBodyEvent = OperatorPlanetEvent & {
  body: string
}

export type OperatorFleetEvent = OperatorEvent & {
  fleet: Fleet
}

export type OperatorFleetInvalidEvent = OperatorFleetEvent & {
  allyContent: string
}

export type BuildBuildingOptions = {
  planetId: number
  element: number
  count: number
}

export type BuildResearchOptions = {
  planetId: number
  element: number
  count: number
}

export type CancelResearchOptions = {
  planetId: number
}

export type BuildShipyardOptions = {
  planetId: number
  elements: Elements
}

export type SendMissleOptions = {
  origin: number
  galaxy: number
  system: number
  planet: number
  type: number
  missle: number
  target: number
}

export class Operator {
  public id: number = NaN
  public token: string = ''
  public ip: string = ''
  public universe: number
  public username: string
  public password: string
  public courier: Courier
  public config: Config
  public readonly elements: Elements = new Elements()
  public readonly planets: Planets = new Planets()
  public readonly queues: {
    research: Queue
  } = {
    research: new Queue(),
  }
  constructor(options: OperatorOptions) {
    this.universe = options.universe
    this.username = options.username
    this.password = options.password
    this.courier = options.courier
    this.config = options.config
  }

  public onLogin?: (event: OperatorEvent) => Promise<void>
  public onLogined?: (event: OperatorEvent) => Promise<void>
  public async login(): Promise<boolean> {
    await this.onLogin?.({ operator: this })
    const response = await this.courier.post({
      url: '/index.php?page=login',
      body: {
        uni: this.universe,
        username: this.username,
        password: this.password,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Connection: 'Keep-Alive',
        Forwarded: this.ip,
      },
    })
    if (!response) return false
    let start = 0
    let end = 0
    let flag = false
    for (const cookie of response.headers.getSetCookie()) {
      start = cookie.lastIndexOf(`${this.config.token}=`) + this.config.token.length + 1
      if (start === this.config.token.length) continue
      end = cookie.indexOf(';', start)
      if (end === -1) continue
      this.token = cookie.slice(start, end)
      flag = true
      break
    }
    if (flag) await this.onLogined?.({ operator: this })
    return flag
  }

  public onLogout?: (event: OperatorEvent) => Promise<void>
  public async logout(): Promise<boolean> {
    await this.get({ url: '/game.php?page=logout' })
    await this.onLogout?.({ operator: this })
    return true
  }

  public onGet?: (event: OperatorGetEvent) => Promise<void>
  public async get(options: OperatorGetOptions): Promise<false | string> {
    const { url } = options
    await this.onGet?.({ operator: this, ...options })
    const response = await this.courier.get({
      url,
      headers: {
        Cookie: this.token ? `${this.config.token}=${this.token};` : '',
        Connection: 'Keep-Alive',
        Forwarded: this.ip,
      },
    })
    if (!response) return false
    try {
      const location = response.headers.get('Location')
      if (location && new globalThis.URL(location).pathname.startsWith('/index.php')) {
        if (!(await this.login())) return false
        return await this.get(options)
      }
      return await response.text()
    } catch {
      return false
    }
  }

  public onPost?: (event: OperatorPostEvent) => Promise<void>
  public async post(options: OperatorPostOptions): Promise<false | string> {
    const { url, body } = options
    await this.onPost?.({ operator: this, ...options })
    const response = await this.courier.post({
      url,
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.token ? `${this.config.token}=${this.token};` : '',
        Connection: 'Keep-Alive',
        Forwarded: this.ip,
      },
    })
    if (!response) return false
    try {
      const location = response.headers.get('Location')
      if (location && new globalThis.URL(location).pathname.startsWith('/index.php')) {
        if (!(await this.login())) return false
        return await this.post(options)
      }
      return await response.text()
    } catch {
      return false
    }
  }

  public onUpdateControl?: (event: OperatorEvent) => Promise<void>
  public onUpdatedControl?: (event: OperatorBodyEvent) => Promise<void>
  public async updateControl(): Promise<boolean> {
    await this.onUpdateControl?.({ operator: this })
    const response = await this.get({ url: '/game.php?page=control' })
    if (!response) return false
    const result = {
      failed: false,
      data: '',
    }
    let position = parseId(this, response, 0, result)
    position = parseResource(this, response, position, result)
    position = parseControl(this, response, position, result)
    await this.onUpdatedControl?.({ operator: this, body: response })
    return !result.failed
  }

  public onUpdateResearch?: (event: OperatorEvent) => Promise<void>
  public onUpdatedResearch?: (event: OperatorBodyEvent) => Promise<void>
  public async updateResearch(): Promise<boolean> {
    await this.onUpdateResearch?.({ operator: this })
    const response = await this.get({ url: `/game.php?page=research` })
    if (!response) return false
    const result = {
      failed: false,
      data: '',
    }
    let position = parseQueueResearch(this, response, 0, result)
    position = parseBuildResearch(this, response, position, result)
    await this.onUpdatedResearch?.({ operator: this, body: response })
    return !result.failed
  }

  public onUpdatePlanets?: (event: OperatorEvent) => Promise<void>
  public onUpdatedPlanets?: (event: OperatorEvent) => Promise<void>
  public onUpdatePlanetBuilding?: (event: OperatorPlanetEvent) => Promise<void>
  public onUpdatedPlanetBuilding?: (event: OperatorPlanetBodyEvent) => Promise<void>
  public onUpdatePlanetShipyard?: (event: OperatorPlanetEvent) => Promise<void>
  public onUpdatedPlanetShipyard?: (event: OperatorPlanetBodyEvent) => Promise<void>

  public async updatePlanetBuilding(options: UpdatePlanetOptions): Promise<boolean> {
    const planet = 'planet' in options ? options.planet : this.planets.map.get(options.planetId)
    if (!planet) return false
    await this.onUpdatePlanetBuilding?.({ operator: this, planet })
    const response = await this.get({ url: `/game.php?page=buildings&cp=${planet.id}` })
    if (!response) return false
    const result = { failed: false, data: '' }
    let position = parseQueueBuilding(this, planet, response, 0, result)
    position = parseBuildBuilding(this, planet, response, position, result)
    await this.onUpdatedPlanetBuilding?.({ operator: this, planet, body: response })
    return !result.failed
  }

  public async updatePlanetShipyard(options: UpdatePlanetOptions): Promise<boolean> {
    const planet = 'planet' in options ? options.planet : this.planets.map.get(options.planetId)
    if (!planet) return false
    await this.onUpdatePlanetShipyard?.({ operator: this, planet })
    const response = await this.get({ url: `/game.php?page=shipyard&cp=${planet.id}` })
    if (!response) return false
    const result = { failed: false, data: '' }
    let position = parseEnergy(this, planet, response, 0, result)
    position = parseLimit(this, planet, response, position, result)
    position = parseQueueShipyard(this, planet, response, position, result)
    position = parseBuildShipyard(this, planet, response, position, result)
    await this.onUpdatedPlanetShipyard?.({ operator: this, planet, body: response })
    return !result.failed
  }

  public async updatePlanet(options: UpdatePlanetOptions): Promise<boolean> {
    let flag = await this.updatePlanetBuilding(options)
    if (!flag) return false
    flag = await this.updatePlanetShipyard(options)
    return flag
  }

  public async updatePlanets(): Promise<boolean> {
    await this.onUpdatePlanets?.({ operator: this })
    for (const planet of this.planets.map.values()) {
      const flag = await this.updatePlanet({ planet })
      if (!flag) return false
    }
    await this.onUpdatedPlanets?.({ operator: this })
    return true
  }

  public async update(): Promise<boolean> {
    let flag = await this.updateControl()
    if (!flag) return false
    flag = await this.updateResearch()
    if (!flag) return false
    flag = await this.updatePlanets()
    return flag
  }

  public async buildBuilding(options: BuildBuildingOptions): Promise<boolean> {
    const { planetId, element, count } = options
    const response = await this.post({
      url: `/game.php?page=buildings&cp=${planetId}`,
      body: {
        cmd: 'insert',
        building: element,
        lvlup: count,
      },
    })
    if (!response) return false
    const planet = this.planets.map.get(planetId)
    if (!planet) return false
    const result = { failed: false, data: '' }
    let position = parseQueueBuilding(this, planet, response, 0, result)
    position = parseBuildBuilding(this, planet, response, position, result)
    return !result.failed
  }

  public async buildResearch(options: BuildResearchOptions): Promise<boolean> {
    const { planetId, element, count } = options
    const response = await this.post({
      url: `/game.php?page=research&cp=${planetId}`,
      body: {
        cmd: 'insert',
        tech: element,
        lvlup: count,
      },
    })
    if (!response) return false
    const result = { failed: false, data: '' }
    let position = parseQueueResearch(this, response, 0, result)
    position = parseBuildResearch(this, response, position, result)
    return !result.failed
  }

  public async cancelResearch(options: CancelResearchOptions): Promise<boolean> {
    const { planetId } = options
    const response = await this.post({
      url: `/game.php?page=research&cp=${planetId}`,
      body: {
        cmd: 'cancel',
      },
    })
    if (!response) return false
    const result = { failed: false, data: '' }
    let position = parseQueueResearch(this, response, 0, result)
    position = parseBuildResearch(this, response, position, result)
    return !result.failed
  }

  public async buildShipyard(options: BuildShipyardOptions): Promise<boolean> {
    const { planetId, elements } = options
    const response = await this.post({
      url: `/game.php?page=shipyard&cp=${planetId}`,
      body: elements.toString('fmenge[', ']'),
    })
    if (!response) return false
    const planet = this.planets.map.get(planetId)
    if (!planet) return false
    const result = { failed: false, data: '' }
    let position = parseEnergy(this, planet, response, 0, result)
    position = parseLimit(this, planet, response, position, result)
    position = parseQueueShipyard(this, planet, response, position, result)
    position = parseBuildShipyard(this, planet, response, position, result)
    return !result.failed
  }

  public async sendMissle(options: SendMissleOptions): Promise<boolean> {
    const { origin, galaxy, system, planet, type, missle, target } = options
    const response = await this.post({
      url: `/game.php?page=fleetMissile&cp=${origin}`,
      body: {
        galaxy,
        system,
        planet,
        type,
        SendMI: missle,
        Target: target,
      },
    })
    if (!response) return false
    return true
  }

  public onSendFleet?: (event: OperatorFleetEvent) => Promise<void>
  public onSentFleet?: (event: OperatorFleetEvent) => Promise<void>
  public onSendFleetStep1?: (event: OperatorFleetEvent) => Promise<void>
  public onSendFleetStep1Invalid?: (event: OperatorFleetInvalidEvent) => Promise<void>
  public onSendFleetStep2?: (event: OperatorFleetEvent) => Promise<void>
  public onSendFleetStep2Invalid?: (event: OperatorFleetInvalidEvent) => Promise<void>
  public onSendFleetStep3?: (event: OperatorFleetEvent) => Promise<void>
  public onSendFleetStep3Invalid?: (event: OperatorFleetInvalidEvent) => Promise<void>
  public async sendFleet(fleet: Fleet): Promise<boolean> {
    await this.onSendFleet?.({ operator: this, fleet })
    await this.onSendFleetStep1?.({ operator: this, fleet })
    let response = await this.post({
      url: `/game.php?page=fleetStep1&cp=${fleet.origin}`,
      body: fleet.ships.toString('ship'),
    })
    if (!response) return false
    const result = {
      failed: false,
      data: '',
    }
    parseFleetToken(fleet, response, 0, result)
    if (result.failed) {
      parseFleetAllyContent(fleet, response, 0, result)
      await this.onSendFleetStep1Invalid?.({
        operator: this,
        fleet,
        allyContent: result.data,
      })
      return false
    }
    await this.onSendFleetStep2?.({ operator: this, fleet })
    const body = {
      ...fleet.target,
      mission: fleet.mission,
      speed: fleet.speed,
      staytime: fleet.staytime,
      metal: fleet.metal,
      crystal: fleet.crystal,
      deuterium: fleet.deuterium,
      token: fleet.token,
    }
    response = await this.post({
      url: `/game.php?page=fleetStep2&cp=${fleet.origin}`,
      body,
    })
    if (!response) return false
    parseFleetAllyContent(fleet, response, 0, result)
    if (!result.failed) {
      await this.onSendFleetStep2Invalid?.({
        operator: this,
        fleet,
        allyContent: result.data,
      })
      return false
    }
    await this.onSendFleetStep3?.({ operator: this, fleet })
    response = await this.post({
      url: `/game.php?page=fleetStep3&cp=${fleet.origin}`,
      body,
    })
    if (!response) return false
    parseFleetAllyContent(fleet, response, 0, result)
    if (!result.failed) {
      await this.onSendFleetStep3Invalid?.({
        operator: this,
        fleet,
        allyContent: result.data,
      })
      return false
    }
    await this.onSentFleet?.({ operator: this, fleet })
    return true
  }
}
