import { Courier } from './courier'
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

export class Operator {
  public id: number = NaN
  public token: string = ''
  public readonly elements: Elements = new Elements()
  public readonly planets: Planets = new Planets()
  public readonly queues: {
    research: Queue
  } = {
    research: new Queue(),
  }
  constructor(
    public universe: number,
    public username: string,
    public password: string,
    public courier: Courier,
    public config: Config,
  ) {}

  public onLogin?: (operator: Operator) => Promise<void>
  public onLogined?: (operator: Operator) => Promise<void>
  public async login(): Promise<boolean> {
    await this.onLogin?.(this)
    const response = await this.courier.post(
      '/index.php?page=login',
      {
        uni: this.universe,
        username: this.username,
        password: this.password,
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        Connection: 'Keep-Alive',
      },
    )
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
    if (flag) await this.onLogined?.(this)
    return flag
  }

  public onLogout?: (operator: Operator) => Promise<void>
  public async logout(): Promise<boolean> {
    await this.get('/game.php?page=logout')
    await this.onLogout?.(this)
    return true
  }

  public onGet?: (operator: Operator, url: string) => Promise<void>
  public async get(url: string): Promise<false | string> {
    await this.onGet?.(this, url)
    const response = await this.courier.get(url, {
      Cookie: this.token ? `${this.config.token}=${this.token};` : '',
      Connection: 'Keep-Alive',
    })
    if (!response) return false
    try {
      const location = response.headers.get('Location')
      if (location && new globalThis.URL(location).pathname.startsWith('/index.php')) {
        if (!(await this.login())) return false
        return await this.get(url)
      }
      return await response.text()
    } catch {
      return false
    }
  }

  public onPost?: (operator: Operator, url: string, body: any) => Promise<void>
  public async post(url: string, body: any): Promise<false | string> {
    await this.onPost?.(this, url, body)
    const response = await this.courier.post(url, body, {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: this.token ? `${this.config.token}=${this.token};` : '',
      Connection: 'Keep-Alive',
    })
    if (!response) return false
    try {
      const location = response.headers.get('Location')
      if (location && new globalThis.URL(location).pathname.startsWith('/index.php')) {
        if (!(await this.login())) return false
        return await this.post(url, body)
      }
      return await response.text()
    } catch {
      return false
    }
  }

  public onUpdateControl?: (operator: Operator) => Promise<void>
  public onUpdatedControl?: (operator: Operator, body: string) => Promise<void>
  public async updateControl(): Promise<boolean> {
    await this.onUpdateControl?.(this)
    const response = await this.get('/game.php?page=control')
    if (!response) return false
    const result = {
      failed: false,
      data: '',
    }
    let position = parseId(this, response, 0, result)
    position = parseResource(this, response, position, result)
    position = parseControl(this, response, position, result)
    await this.onUpdatedControl?.(this, response)
    return !result.failed
  }

  public onUpdateResearch?: (operator: Operator) => Promise<void>
  public onUpdatedResearch?: (operator: Operator, body: string) => Promise<void>
  public async updateResearch(): Promise<boolean> {
    await this.onUpdateResearch?.(this)
    const response = await this.get(`/game.php?page=research`)
    if (!response) return false
    const result = {
      failed: false,
      data: '',
    }
    let position = parseQueueResearch(this, response, 0, result)
    position = parseBuildResearch(this, response, position, result)
    await this.onUpdatedResearch?.(this, response)
    return !result.failed
  }

  public onUpdatePlanets?: (operator: Operator) => Promise<void>
  public onUpdatedPlanets?: (operator: Operator, body: string) => Promise<void>
  public onUpdatePlanetBuilding?: (operator: Operator, planet: Planet) => Promise<void>
  public onUpdatedPlanetBuilding?: (
    operator: Operator,
    planet: Planet,
    body: string,
  ) => Promise<void>
  public onUpdatePlanetShipyard?: (operator: Operator, planet: Planet) => Promise<void>
  public onUpdatedPlanetShipyard?: (
    operator: Operator,
    planet: Planet,
    body: string,
  ) => Promise<void>
  public async updatePlanets(): Promise<boolean> {
    await this.onUpdatePlanets?.(this)
    const result = {
      failed: false,
      data: '',
    }
    for (const planet of this.planets.map.values()) {
      await this.onUpdatePlanetBuilding?.(this, planet)
      let response = await this.get(`/game.php?page=buildings&cp=${planet.id}`)
      if (response) {
        let position = parseQueueBuilding(this, planet, response, 0, result)
        position = parseBuildBuilding(this, planet, response, position, result)
        await this.onUpdatedPlanetBuilding?.(this, planet, response)
      }
      await this.onUpdatePlanetShipyard?.(this, planet)
      response = await this.get(`/game.php?page=shipyard&cp=${planet.id}`)
      if (response) {
        let position = parseEnergy(this, planet, response, 0, result)
        position = parseLimit(this, planet, response, position, result)
        position = parseQueueShipyard(this, planet, response, position, result)
        position = parseBuildShipyard(this, planet, response, position, result)
        await this.onUpdatedPlanetShipyard?.(this, planet, response)
      }
    }
    await this.onUpdatedPlanets?.(this, result.data)
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

  public async buildBuilding(cp: number, element: number, count: number): Promise<boolean> {
    const response = await this.post(`/game.php?page=buildings&cp=${cp}`, {
      cmd: 'insert',
      building: element,
      lvlup: count,
    })
    if (!response) return false
    const planet = this.planets.map.get(cp)
    if (!planet) return false
    const result = { failed: false, data: '' }
    let position = parseQueueBuilding(this, planet, response, 0, result)
    position = parseBuildBuilding(this, planet, response, position, result)
    return !result.failed
  }

  public async buildResearch(cp: number, element: number, count: number): Promise<boolean> {
    const response = await this.post(`/game.php?page=research&cp=${cp}`, {
      cmd: 'insert',
      tech: element,
      lvlup: count,
    })
    if (!response) return false
    const result = { failed: false, data: '' }
    let position = parseQueueResearch(this, response, 0, result)
    position = parseBuildResearch(this, response, position, result)
    return !result.failed
  }

  public async cancelResearch(cp: number): Promise<boolean> {
    const response = await this.post(`/game.php?page=research&cp=${cp}`, {
      cmd: 'cancel',
    })
    if (!response) return false
    const result = { failed: false, data: '' }
    let position = parseQueueResearch(this, response, 0, result)
    position = parseBuildResearch(this, response, position, result)
    return !result.failed
  }

  public async buildShipyard(cp: number, elements: Elements): Promise<boolean> {
    const response = await this.post(
      `/game.php?page=shipyard&cp=${cp}`,
      elements.toString('fmenge[', ']'),
    )
    if (!response) return false
    const planet = this.planets.map.get(cp)
    if (!planet) return false
    const result = { failed: false, data: '' }
    let position = parseEnergy(this, planet, response, 0, result)
    position = parseLimit(this, planet, response, position, result)
    position = parseQueueShipyard(this, planet, response, position, result)
    position = parseBuildShipyard(this, planet, response, position, result)
    return !result.failed
  }

  public async sendMissle(
    cp: number,
    galaxy: number,
    system: number,
    planet: number,
    type: number,
    missle: number,
    target: number,
  ): Promise<boolean> {
    let response = await this.post(`/game.php?page=fleetMissile&cp=${cp}`, {
      galaxy,
      system,
      planet,
      type,
      SendMI: missle,
      Target: target,
    })
    if (!response) return false
    return true
  }

  public onSendFleet?: (operator: Operator, fleet: Fleet) => Promise<void>
  public onSentFleet?: (operator: Operator, fleet: Fleet) => Promise<void>
  public onSendFleetStep1?: (operator: Operator, fleet: Fleet) => Promise<void>
  public onSendFleetStep1Invalid?: (
    operator: Operator,
    fleet: Fleet,
    allyContent: string,
  ) => Promise<void>
  public onSendFleetStep2?: (operator: Operator, fleet: Fleet) => Promise<void>
  public onSendFleetStep2Invalid?: (
    operator: Operator,
    fleet: Fleet,
    allyContent: string,
  ) => Promise<void>
  public onSendFleetStep3?: (operator: Operator, fleet: Fleet) => Promise<void>
  public onSendFleetStep3Invalid?: (
    operator: Operator,
    fleet: Fleet,
    allyContent: string,
  ) => Promise<void>
  public async sendFleet(fleet: Fleet): Promise<boolean> {
    await this.onSendFleet?.(this, fleet)
    await this.onSendFleetStep1?.(this, fleet)
    let response = await this.post(
      `/game.php?page=fleetStep1&cp=${fleet.cp}`,
      fleet.ships.toString('ship'),
    )
    if (!response) return false
    const result = {
      failed: false,
      data: '',
    }
    parseFleetToken(fleet, response, 0, result)
    if (result.failed) {
      parseFleetAllyContent(fleet, response, 0, result)
      await this.onSendFleetStep1Invalid?.(this, fleet, result.data)
      return false
    }
    await this.onSendFleetStep2?.(this, fleet)
    response = await this.post(`/game.php?page=fleetStep2&cp=${fleet.cp}`, fleet)
    if (!response) return false
    parseFleetAllyContent(fleet, response, 0, result)
    if (!result.failed) {
      await this.onSendFleetStep2Invalid?.(this, fleet, result.data)
      return false
    }
    await this.onSendFleetStep3?.(this, fleet)
    response = await this.post(`/game.php?page=fleetStep3&cp=${fleet.cp}`, fleet)
    if (!response) return false
    parseFleetAllyContent(fleet, response, 0, result)
    if (!result.failed) {
      await this.onSendFleetStep3Invalid?.(this, fleet, result.data)
      return false
    }
    await this.onSentFleet?.(this, fleet)
    return true
  }
}
